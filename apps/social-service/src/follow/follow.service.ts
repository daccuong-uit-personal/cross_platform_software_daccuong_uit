import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createLogger } from '@platform/logger';

const logger = createLogger({ service: 'social-service:follow' });

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

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

  private mapUser(u: any) {
    return {
      id: u.userId,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      isVerified: u.isVerified,
      isPrivate: u.isPrivate,
      followerCount: u.followerCount,
      followingCount: u.followingCount,
      postCount: u.postCount,
    };
  }

  // ── Follow ───────────────────────────────────────────────
  async follow(followerId: string, followingId: string) {
    logger.info('Follow request', { followerId, followingId });

    if (followerId === followingId) {
      throw new ConflictException('Không thể tự follow chính mình');
    }

    const target = await this.prisma.userProfile.findUnique({
      where: { userId: followingId },
    });

    if (!target) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Check if already blocked
    const blocked = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: followingId, blockedId: followerId } },
    });
    if (blocked) {
      throw new ForbiddenException('Không thể follow người dùng này');
    }

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      return {
        followerCount: target.followerCount,
        isFollowedByCurrentUser: existing.status === 'ACCEPTED',
        isPending: existing.status === 'PENDING',
      };
    }

    // Private account → PENDING, public → ACCEPTED
    const status = target.isPrivate ? 'PENDING' : 'ACCEPTED';

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.create({ data: { followerId, followingId, status } });

      if (status === 'ACCEPTED') {
        await tx.userProfile.update({
          where: { userId: followingId },
          data: { followerCount: { increment: 1 } },
        });
        await tx.userProfile.update({
          where: { userId: followerId },
          data: { followingCount: { increment: 1 } },
        });
      }
    });

    const updated = await this.prisma.userProfile.findUnique({
      where: { userId: followingId },
    });

    return {
      followerCount: updated!.followerCount,
      isFollowedByCurrentUser: status === 'ACCEPTED',
      isPending: status === 'PENDING',
    };
  }

  // ── Unfollow ─────────────────────────────────────────────
  async unfollow(followerId: string, followingId: string) {
    logger.info('Unfollow request', { followerId, followingId });

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (!existing) {
      return { message: 'Đã unfollow thành công' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });

      if (existing.status === 'ACCEPTED') {
        await tx.userProfile.update({
          where: { userId: followingId },
          data: { followerCount: { decrement: 1 } },
        });
        await tx.userProfile.update({
          where: { userId: followerId },
          data: { followingCount: { decrement: 1 } },
        });
      }
    });

    return { message: 'Đã unfollow thành công' };
  }

  // ── Followers ────────────────────────────────────────────
  async getFollowers(userId: string, page: number, pageSize: number) {
    logger.info('Getting followers', { userId, page, pageSize });

    const [total, follows] = await Promise.all([
      this.prisma.follow.count({
        where: { followingId: userId, status: 'ACCEPTED' },
      }),
      this.prisma.follow.findMany({
        where: { followingId: userId, status: 'ACCEPTED' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { follower: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: follows.map((f) => this.mapUser(f.follower)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Following ────────────────────────────────────────────
  async getFollowing(userId: string, page: number, pageSize: number) {
    logger.info('Getting following', { userId, page, pageSize });

    const [total, follows] = await Promise.all([
      this.prisma.follow.count({
        where: { followerId: userId, status: 'ACCEPTED' },
      }),
      this.prisma.follow.findMany({
        where: { followerId: userId, status: 'ACCEPTED' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { following: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: follows.map((f) => this.mapUser(f.following)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Follow Requests (for private accounts) ───────────────
  async getFollowRequests(userId: string, page: number, pageSize: number) {
    logger.info('Getting follow requests', { userId, page, pageSize });

    const [total, requests] = await Promise.all([
      this.prisma.follow.count({
        where: { followingId: userId, status: 'PENDING' },
      }),
      this.prisma.follow.findMany({
        where: { followingId: userId, status: 'PENDING' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { follower: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: requests.map((r) => this.mapUser(r.follower)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Approve Follow Request ───────────────────────────────
  async approveFollowRequest(ownerId: string, requesterId: string) {
    logger.info('Approving follow request', { ownerId, requesterId });

    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId: requesterId, followingId: ownerId },
      },
    });

    if (!follow || follow.status !== 'PENDING') {
      throw new NotFoundException('Không tìm thấy yêu cầu follow');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.update({
        where: { followerId_followingId: { followerId: requesterId, followingId: ownerId } },
        data: { status: 'ACCEPTED' },
      });
      await tx.userProfile.update({
        where: { userId: ownerId },
        data: { followerCount: { increment: 1 } },
      });
      await tx.userProfile.update({
        where: { userId: requesterId },
        data: { followingCount: { increment: 1 } },
      });
    });

    return { message: 'Đã chấp nhận yêu cầu follow' };
  }

  // ── Reject Follow Request ────────────────────────────────
  async rejectFollowRequest(ownerId: string, requesterId: string) {
    logger.info('Rejecting follow request', { ownerId, requesterId });

    await this.prisma.follow.deleteMany({
      where: { followerId: requesterId, followingId: ownerId, status: 'PENDING' },
    });

    return { message: 'Đã từ chối yêu cầu follow' };
  }
}
