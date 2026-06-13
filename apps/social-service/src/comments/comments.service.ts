import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createLogger } from '@platform/logger';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

const logger = createLogger({ service: 'social-service:comments' });

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildPagination(page: number, pageSize: number, totalItems: number) {
    const totalPages = Math.ceil(totalItems / pageSize);
    return { currentPage: page, totalPages, totalItems, itemsPerPage: pageSize, hasNext: page < totalPages };
  }

  private mapComment(c: any) {
    return {
      id: c.id,
      postId: c.postId,
      parentId: c.parentId ?? null,
      author: c.author
        ? { id: c.author.userId, username: c.author.username, displayName: c.author.displayName, avatarUrl: c.author.avatarUrl, isVerified: c.author.isVerified }
        : null,
      content: c.content,
      isPinned: c.isPinned,
      likeCount: c.likeCount,
      replyCount: c.replyCount,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  // ── List comments of a post ───────────────────────────────
  async listByPost(postId: string, page: number, pageSize: number) {
    logger.info('Listing comments', { postId, page });

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) throw new NotFoundException('Bài đăng không tồn tại');

    const [total, comments] = await Promise.all([
      this.prisma.comment.count({ where: { postId, parentId: null, isDeleted: false } }),
      this.prisma.comment.findMany({
        where: { postId, parentId: null, isDeleted: false },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
        include: { author: true },
      }),
    ]);

    return {
      data: comments.map((c) => this.mapComment(c)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Create comment ────────────────────────────────────────
  async create(postId: string, authorId: string, dto: CreateCommentDto) {
    logger.info('Creating comment', { postId, authorId });

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) throw new NotFoundException('Bài đăng không tồn tại');

    // Validate parentId belongs to same post
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.postId !== postId) throw new NotFoundException('Comment cha không tồn tại');
    }

    const comment = await this.prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { postId, authorId, content: dto.content, parentId: dto.parentId ?? null },
        include: { author: true },
      });
      await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
      if (dto.parentId) {
        await tx.comment.update({ where: { id: dto.parentId }, data: { replyCount: { increment: 1 } } });
      }
      return c;
    });

    return this.mapComment(comment);
  }

  // ── Update comment ────────────────────────────────────────
  async update(commentId: string, authorId: string, dto: UpdateCommentDto) {
    logger.info('Updating comment', { commentId, authorId });

    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment không tồn tại');
    if (comment.authorId !== authorId) throw new ForbiddenException('Bạn không có quyền chỉnh sửa comment này');

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: { author: true },
    });

    return this.mapComment(updated);
  }

  // ── Delete comment ────────────────────────────────────────
  async delete(commentId: string, authorId: string) {
    logger.info('Deleting comment', { commentId, authorId });

    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment không tồn tại');
    if (comment.authorId !== authorId) throw new ForbiddenException('Bạn không có quyền xóa comment này');

    await this.prisma.$transaction(async (tx) => {
      await tx.comment.update({ where: { id: commentId }, data: { isDeleted: true } });
      await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } });
      if (comment.parentId) {
        await tx.comment.update({ where: { id: comment.parentId }, data: { replyCount: { decrement: 1 } } });
      }
    });

    return null;
  }

  // ── Replies ───────────────────────────────────────────────
  async getReplies(commentId: string, page: number, pageSize: number) {
    logger.info('Getting replies', { commentId, page });

    const parent = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!parent || parent.isDeleted) throw new NotFoundException('Comment không tồn tại');

    const [total, replies] = await Promise.all([
      this.prisma.comment.count({ where: { parentId: commentId, isDeleted: false } }),
      this.prisma.comment.findMany({
        where: { parentId: commentId, isDeleted: false },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'asc' },
        include: { author: true },
      }),
    ]);

    return {
      data: replies.map((c) => this.mapComment(c)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Pin / Unpin ───────────────────────────────────────────
  async pin(commentId: string, userId: string) {
    logger.info('Pinning comment', { commentId, userId });

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment không tồn tại');
    if (comment.post.authorId !== userId) throw new ForbiddenException('Chỉ tác giả bài đăng mới có thể ghim comment');

    // Unpin any existing pinned comment on this post first
    await this.prisma.comment.updateMany({
      where: { postId: comment.postId, isPinned: true },
      data: { isPinned: false },
    });

    await this.prisma.comment.update({ where: { id: commentId }, data: { isPinned: true } });
    return { message: 'Đã ghim comment' };
  }

  async unpin(commentId: string, userId: string) {
    logger.info('Unpinning comment', { commentId, userId });

    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { post: true },
    });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment không tồn tại');
    if (comment.post.authorId !== userId) throw new ForbiddenException('Chỉ tác giả bài đăng mới có thể bỏ ghim');

    await this.prisma.comment.update({ where: { id: commentId }, data: { isPinned: false } });
    return { message: 'Đã bỏ ghim comment' };
  }

  // ── Report ────────────────────────────────────────────────
  async report(commentId: string, userId: string, reason: string, description?: string) {
    logger.info('Reporting comment', { commentId, userId, reason });
    // TODO: persist to moderation queue
    return { message: 'Đã gửi báo cáo thành công' };
  }
}
