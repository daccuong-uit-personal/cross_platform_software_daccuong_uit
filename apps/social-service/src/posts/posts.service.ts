import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createLogger } from '@platform/logger';
import {
  CreatePostDto,
  UpdatePostDto,
  SharePostDto,
  PostsQueryDto,
  FeedQueryDto,
  DiscoverQueryDto,
} from './dto/post.dto';

const logger = createLogger({ service: 'social-service:posts' });

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ───────────────────────────────────────────────
  private buildPagination(page: number, pageSize: number, totalItems: number) {
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: pageSize,
      hasNext: page < totalPages,
    };
  }

  private mapAuthor(u: any) {
    return {
      id: u.userId,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      isVerified: u.isVerified,
      isPrivate: u.isPrivate,
    };
  }

  private mapPost(post: any, currentUserId?: string) {
    const reactions = post.reactions ?? [];
    const reactionCounts = reactions.reduce(
      (acc: Record<string, number>, r: any) => {
        const key = r.type.toLowerCase();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const isLiked = currentUserId
      ? reactions.some(
          (r: any) => r.userId === currentUserId && r.type === 'LIKE',
        )
      : false;

    const isBookmarked = currentUserId
      ? (post.bookmarks ?? []).some((b: any) => b.userId === currentUserId)
      : false;

    return {
      id: post.id,
      author: post.author ? this.mapAuthor(post.author) : null,
      type: post.type.toLowerCase(),
      content: post.content,
      mediaUrls: post.mediaUrls,
      hashtags: post.hashtags,
      poll: post.poll
        ? {
            id: post.poll.id,
            question: post.poll.question,
            options: post.poll.options.map((o: any) => ({
              id: o.id,
              text: o.text,
              voteCount: o.voteCount,
            })),
            totalVotes: post.poll.totalVotes,
            endsAt: post.poll.endsAt,
          }
        : null,
      groupId: post.groupId,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      repostCount: post.repostCount,
      reactions: reactionCounts,
      isLikedByCurrentUser: isLiked,
      isBookmarkedByCurrentUser: isBookmarked,
      isRepostedByCurrentUser: false, // extend later
      visibility: post.visibility.toLowerCase(),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  private readonly postInclude = {
    author: true,
    poll: { include: { options: true } },
    reactions: { select: { userId: true, type: true } },
    bookmarks: { select: { userId: true } },
  };

  // ── Personal Feed ─────────────────────────────────────────
  async getPersonalFeed(userId: string, page: number, pageSize: number) {
    logger.info('Getting personal feed', { userId, page, pageSize });

    // Get IDs of people the user follows
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      select: { followingId: true },
    });
    const followingIds = follows.map((f) => f.followingId);

    const authorIds = [userId, ...followingIds];

    const [total, posts] = await Promise.all([
      this.prisma.post.count({
        where: {
          authorId: { in: authorIds },
          isDeleted: false,
          visibility: { not: 'PRIVATE' },
        },
      }),
      this.prisma.post.findMany({
        where: {
          authorId: { in: authorIds },
          isDeleted: false,
          visibility: { not: 'PRIVATE' },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: this.postInclude,
      }),
    ]);

    return {
      data: posts.map((p) => this.mapPost(p, userId)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Discover Feed ─────────────────────────────────────────
  async getDiscoverFeed(query: DiscoverQueryDto, currentUserId?: string) {
    const { page = 1, pageSize = 20, filter = 'latest' } = query;
    logger.info('Getting discover feed', { filter, page, pageSize });

    const orderBy =
      filter === 'trending'
        ? [{ likeCount: 'desc' as const }, { createdAt: 'desc' as const }]
        : { createdAt: 'desc' as const };

    const [total, posts] = await Promise.all([
      this.prisma.post.count({
        where: { isDeleted: false, visibility: 'PUBLIC' },
      }),
      this.prisma.post.findMany({
        where: { isDeleted: false, visibility: 'PUBLIC' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: Array.isArray(orderBy) ? orderBy : [orderBy],
        include: this.postInclude,
      }),
    ]);

    return {
      data: posts.map((p) => this.mapPost(p, currentUserId)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── List Posts (filtered) ─────────────────────────────────
  async listPosts(query: PostsQueryDto, currentUserId?: string) {
    const { page = 1, pageSize = 20, authorId, hashtag, type, groupId } = query;
    logger.info('Listing posts', { query });

    const where: any = { isDeleted: false, visibility: 'PUBLIC' };
    if (authorId) where.authorId = authorId;
    if (hashtag) where.hashtags = { has: hashtag };
    if (type) where.type = type.toUpperCase();
    if (groupId) where.groupId = groupId;

    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: this.postInclude,
      }),
    ]);

    return {
      data: posts.map((p) => this.mapPost(p, currentUserId)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Create Post ───────────────────────────────────────────
  async createPost(authorId: string, dto: CreatePostDto) {
    logger.info('Creating post', { authorId, type: dto.type });

    const post = await this.prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          authorId,
          type: (dto.type ?? 'text').toUpperCase() as any,
          content: dto.content,
          mediaUrls: dto.mediaUrls ?? [],
          hashtags: this.extractHashtags(dto.content),
          visibility: (dto.visibility ?? 'public').toUpperCase() as any,
          groupId: dto.groupId ?? null,
          linkUrl: dto.linkUrl ?? null,
        },
        include: this.postInclude,
      });

      // Create poll if provided
      if (dto.poll) {
        await tx.poll.create({
          data: {
            postId: newPost.id,
            question: dto.poll.question,
            endsAt: dto.poll.endsAt ? new Date(dto.poll.endsAt) : null,
            options: {
              createMany: {
                data: dto.poll.options.map((text) => ({ text })),
              },
            },
          },
        });
      }

      // Increment user post count
      await tx.userProfile.update({
        where: { userId: authorId },
        data: { postCount: { increment: 1 } },
      });

      return newPost;
    });

    // Reload with full includes
    const fullPost = await this.prisma.post.findUnique({
      where: { id: post.id },
      include: this.postInclude,
    });

    return this.mapPost(fullPost!, authorId);
  }

  // ── Get Post By ID ────────────────────────────────────────
  async getById(postId: string, currentUserId?: string) {
    logger.info('Getting post by id', { postId });

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: this.postInclude,
    });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }

    return this.mapPost(post, currentUserId);
  }

  // ── Update Post ───────────────────────────────────────────
  async updatePost(postId: string, authorId: string, dto: UpdatePostDto) {
    logger.info('Updating post', { postId, authorId });

    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }
    if (post.authorId !== authorId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa bài đăng này');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.content !== undefined && {
          content: dto.content,
          hashtags: this.extractHashtags(dto.content),
        }),
        ...(dto.visibility !== undefined && {
          visibility: dto.visibility.toUpperCase() as any,
        }),
      },
      include: this.postInclude,
    });

    return this.mapPost(updated, authorId);
  }

  // ── Delete Post ───────────────────────────────────────────
  async deletePost(postId: string, authorId: string) {
    logger.info('Deleting post', { postId, authorId });

    const post = await this.prisma.post.findUnique({ where: { id: postId } });

    if (!post || post.isDeleted) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }
    if (post.authorId !== authorId) {
      throw new ForbiddenException('Bạn không có quyền xóa bài đăng này');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.post.update({ where: { id: postId }, data: { isDeleted: true } });
      await tx.userProfile.update({
        where: { userId: authorId },
        data: { postCount: { decrement: 1 } },
      });
    });

    return null;
  }

  // ── Like / Unlike ─────────────────────────────────────────
  async likePost(postId: string, userId: string) {
    logger.info('Liking post', { postId, userId });

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }

    const existing = await this.prisma.reaction.findUnique({
      where: {
        userId_targetId_targetType: { userId, targetId: postId, targetType: 'POST' },
      },
    });

    if (!existing) {
      await this.prisma.$transaction(async (tx) => {
        await tx.reaction.create({
          data: { userId, targetId: postId, targetType: 'POST', type: 'LIKE' },
        });
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });
      });
    }

    const updated = await this.prisma.post.findUnique({ where: { id: postId } });
    return {
      likeCount: updated!.likeCount,
      isLikedByCurrentUser: true,
    };
  }

  async unlikePost(postId: string, userId: string) {
    logger.info('Unliking post', { postId, userId });

    const existing = await this.prisma.reaction.findUnique({
      where: {
        userId_targetId_targetType: { userId, targetId: postId, targetType: 'POST' },
      },
    });

    if (existing) {
      await this.prisma.$transaction(async (tx) => {
        await tx.reaction.delete({
          where: {
            userId_targetId_targetType: { userId, targetId: postId, targetType: 'POST' },
          },
        });
        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });
      });
    }

    const updated = await this.prisma.post.findUnique({ where: { id: postId } });
    return {
      likeCount: updated!.likeCount,
      isLikedByCurrentUser: false,
    };
  }

  // ── Hide Post ─────────────────────────────────────────────
  async hidePost(postId: string, userId: string) {
    logger.info('Hiding post', { postId, userId });

    await this.prisma.postHidden.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    });

    return { message: 'Đã ẩn bài đăng khỏi feed' };
  }

  // ── Report Post ───────────────────────────────────────────
  async reportPost(postId: string, userId: string, reason: string, description?: string) {
    logger.info('Reporting post', { postId, userId, reason });
    // TODO: persist to moderation queue
    return { message: 'Đã gửi báo cáo thành công' };
  }

  // ── Share Post ────────────────────────────────────────────
  async sharePost(postId: string, userId: string, dto: SharePostDto) {
    logger.info('Sharing post', { postId, userId, dto });

    await this.prisma.post.update({
      where: { id: postId },
      data: { shareCount: { increment: 1 } },
    });

    return { message: 'Đã chia sẻ bài đăng' };
  }

  // ── Analytics ─────────────────────────────────────────────
  async getPostAnalytics(postId: string, userId: string) {
    logger.info('Getting post analytics', { postId, userId });

    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) {
      throw new NotFoundException('Bài đăng không tồn tại');
    }
    if (post.authorId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem analytics của bài đăng này');
    }

    return {
      views: post.viewCount,
      impressions: post.viewCount,
      reaches: Math.floor(post.viewCount * 0.8),
      engagementRate:
        post.viewCount > 0
          ? ((post.likeCount + post.commentCount + post.shareCount) / post.viewCount) * 100
          : 0,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      repostCount: post.repostCount,
    };
  }

  // ── Util: extract hashtags from content ───────────────────
  private extractHashtags(content: string): string[] {
    const matches = content.match(/#[\w\u00C0-\u024F]+/g) ?? [];
    return [...new Set(matches.map((h) => h.slice(1).toLowerCase()))];
  }
}
