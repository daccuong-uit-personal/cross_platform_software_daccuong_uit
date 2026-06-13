import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createLogger } from '@platform/logger';

const logger = createLogger({ service: 'social-service:friendship' });

@Injectable()
export class FriendshipService {
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

  // ── Friend List ──────────────────────────────────────────
  async getFriends(userId: string, page: number, pageSize: number) {
    logger.info('Getting friends list', { userId, page, pageSize });

    const [total, friendships] = await Promise.all([
      this.prisma.friendship.count({
        where: {
          OR: [{ initiatorId: userId }, { receiverId: userId }],
          status: 'ACCEPTED',
        },
      }),
      this.prisma.friendship.findMany({
        where: {
          OR: [{ initiatorId: userId }, { receiverId: userId }],
          status: 'ACCEPTED',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { initiator: true, receiver: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const friends = friendships.map((f) => {
      const friend = f.initiatorId === userId ? f.receiver : f.initiator;
      return this.mapUser(friend);
    });

    return {
      data: friends,
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Suggestions ──────────────────────────────────────────
  async getSuggestions(userId: string, limit: number) {
    logger.info('Getting friend suggestions', { userId, limit });

    // Get current friend IDs
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
        status: 'ACCEPTED',
      },
      select: { initiatorId: true, receiverId: true },
    });

    const friendIds = friendships.flatMap((f) =>
      [f.initiatorId, f.receiverId].filter((id) => id !== userId),
    );

    // Suggest people who follow the same users (friends-of-friends heuristic)
    const suggestions = await this.prisma.userProfile.findMany({
      where: {
        userId: { notIn: [userId, ...friendIds] },
      },
      take: limit,
      orderBy: { followerCount: 'desc' },
    });

    return suggestions.map((u) => this.mapUser(u));
  }

  // ── Incoming Requests ────────────────────────────────────
  async getIncomingRequests(userId: string, page: number, pageSize: number) {
    logger.info('Getting incoming friend requests', { userId, page, pageSize });

    const [total, requests] = await Promise.all([
      this.prisma.friendship.count({
        where: { receiverId: userId, status: 'PENDING' },
      }),
      this.prisma.friendship.findMany({
        where: { receiverId: userId, status: 'PENDING' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { initiator: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: requests.map((r) => this.mapUser(r.initiator)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Sent Requests ────────────────────────────────────────
  async getSentRequests(userId: string, page: number, pageSize: number) {
    logger.info('Getting sent friend requests', { userId, page, pageSize });

    const [total, requests] = await Promise.all([
      this.prisma.friendship.count({
        where: { initiatorId: userId, status: 'PENDING' },
      }),
      this.prisma.friendship.findMany({
        where: { initiatorId: userId, status: 'PENDING' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { receiver: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: requests.map((r) => this.mapUser(r.receiver)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  // ── Send Request ─────────────────────────────────────────
  async sendRequest(initiatorId: string, receiverId: string) {
    logger.info('Sending friend request', { initiatorId, receiverId });

    if (initiatorId === receiverId) {
      throw new ConflictException('Không thể tự kết bạn với chính mình');
    }

    // Check if blocked
    const blocked = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: initiatorId, blockedId: receiverId },
          { blockerId: receiverId, blockedId: initiatorId },
        ],
      },
    });
    if (blocked) {
      throw new ForbiddenException('Không thể gửi lời mời kết bạn');
    }

    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId, receiverId },
          { initiatorId: receiverId, receiverId: initiatorId },
        ],
      },
    });

    if (existing?.status === 'ACCEPTED') {
      throw new ConflictException('Hai người đã là bạn bè');
    }
    if (existing?.status === 'PENDING') {
      throw new ConflictException('Lời mời kết bạn đã được gửi');
    }

    await this.prisma.friendship.create({
      data: { initiatorId, receiverId, status: 'PENDING' },
    });

    return { message: 'Đã gửi lời mời kết bạn' };
  }

  // ── Cancel Sent Request ──────────────────────────────────
  async cancelRequest(initiatorId: string, receiverId: string) {
    logger.info('Cancelling friend request', { initiatorId, receiverId });

    await this.prisma.friendship.deleteMany({
      where: { initiatorId, receiverId, status: 'PENDING' },
    });

    return { message: 'Đã hủy lời mời kết bạn' };
  }

  // ── Accept Request ───────────────────────────────────────
  async acceptRequest(receiverId: string, initiatorId: string) {
    logger.info('Accepting friend request', { receiverId, initiatorId });

    const friendship = await this.prisma.friendship.findFirst({
      where: { initiatorId, receiverId, status: 'PENDING' },
    });

    if (!friendship) {
      throw new NotFoundException('Không tìm thấy lời mời kết bạn');
    }

    await this.prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' },
    });

    return { message: 'Đã chấp nhận lời mời kết bạn' };
  }

  // ── Reject Request ───────────────────────────────────────
  async rejectRequest(receiverId: string, initiatorId: string) {
    logger.info('Rejecting friend request', { receiverId, initiatorId });

    await this.prisma.friendship.deleteMany({
      where: { initiatorId, receiverId, status: 'PENDING' },
    });

    return { message: 'Đã từ chối lời mời kết bạn' };
  }

  // ── Unfriend ─────────────────────────────────────────────
  async unfriend(userId: string, friendId: string) {
    logger.info('Unfriending', { userId, friendId });

    await this.prisma.friendship.deleteMany({
      where: {
        OR: [
          { initiatorId: userId, receiverId: friendId },
          { initiatorId: friendId, receiverId: userId },
        ],
        status: 'ACCEPTED',
      },
    });

    return { message: 'Đã hủy kết bạn' };
  }

  // ── Mutual Friends ───────────────────────────────────────
  async getMutualFriends(userId: string, targetId: string, page: number, pageSize: number) {
    logger.info('Getting mutual friends', { userId, targetId, page, pageSize });

    // Friends of userId
    const userFriendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
        status: 'ACCEPTED',
      },
      select: { initiatorId: true, receiverId: true },
    });
    const userFriendIds = new Set(
      userFriendships.flatMap((f) =>
        [f.initiatorId, f.receiverId].filter((id) => id !== userId),
      ),
    );

    // Friends of targetId
    const targetFriendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ initiatorId: targetId }, { receiverId: targetId }],
        status: 'ACCEPTED',
      },
      select: { initiatorId: true, receiverId: true },
    });
    const targetFriendIds = [...targetFriendships
      .flatMap((f) => [f.initiatorId, f.receiverId].filter((id) => id !== targetId))
      .filter((id) => userFriendIds.has(id))];

    const total = targetFriendIds.length;
    const pageIds = targetFriendIds.slice((page - 1) * pageSize, page * pageSize);

    const mutuals = await this.prisma.userProfile.findMany({
      where: { userId: { in: pageIds } },
    });

    return {
      data: mutuals.map((u) => this.mapUser(u)),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }
}
