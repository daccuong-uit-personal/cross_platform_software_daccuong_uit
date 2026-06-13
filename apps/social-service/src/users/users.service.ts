import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createLogger } from '@platform/logger';
import {
  UpdateProfileDto,
  UpdatePrivacySettingsDto,
  UpdateAccountSettingsDto,
} from './dto/user.dto';

const logger = createLogger({ service: 'social-service:users' });

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────
  private buildPagination(
    page: number,
    pageSize: number,
    totalItems: number,
  ) {
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: pageSize,
      hasNext: page < totalPages,
    };
  }

  private mapProfile(u: any) {
    return {
      id: u.userId,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      coverUrl: u.coverUrl,
      bio: u.bio,
      website: u.website,
      location: u.location,
      isVerified: u.isVerified,
      isPrivate: u.isPrivate,
      followerCount: u.followerCount,
      followingCount: u.followingCount,
      postCount: u.postCount,
      createdAt: u.createdAt,
    };
  }

  // ── Suggestions ──────────────────────────────────────────
  async getSuggestions(currentUserId: string, limit: number) {
    logger.info('Getting user suggestions', { currentUserId, limit });

    // Get users the current user isn't following yet (excluding self)
    const alreadyFollowing = await this.prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });

    const excludeIds = [
      currentUserId,
      ...alreadyFollowing.map((f) => f.followingId),
    ];

    const users = await this.prisma.userProfile.findMany({
      where: { userId: { notIn: excludeIds } },
      take: limit,
      orderBy: { followerCount: 'desc' },
    });

    return users.map((u) => this.mapProfile(u));
  }

  // ── Get Profile ──────────────────────────────────────────
  async getProfile(userId: string, currentUserId?: string) {
    logger.info('Getting user profile', { userId });

    const user = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const profile: any = this.mapProfile(user);

    // Enrich with relationship data if viewer is authenticated
    if (currentUserId && currentUserId !== userId) {
      const [follow, friendship, block, mute] = await Promise.all([
        this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: userId,
            },
          },
        }),
        this.prisma.friendship.findFirst({
          where: {
            OR: [
              { initiatorId: currentUserId, receiverId: userId },
              { initiatorId: userId, receiverId: currentUserId },
            ],
            status: 'ACCEPTED',
          },
        }),
        this.prisma.userBlock.findUnique({
          where: {
            blockerId_blockedId: {
              blockerId: currentUserId,
              blockedId: userId,
            },
          },
        }),
        this.prisma.userMute.findUnique({
          where: {
            muterId_mutedId: {
              muterId: currentUserId,
              mutedId: userId,
            },
          },
        }),
      ]);

      profile.isFollowedByCurrentUser = !!follow && follow.status === 'ACCEPTED';
      profile.isFollowPending = follow?.status === 'PENDING';
      profile.isFriend = !!friendship;
      profile.isBlocked = !!block;
      profile.isMuted = !!mute;
    }

    return profile;
  }

  // ── Update Profile ───────────────────────────────────────
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    logger.info('Updating user profile', { userId });

    const user = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const updated = await this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.isPrivate !== undefined && { isPrivate: dto.isPrivate }),
      },
    });

    return this.mapProfile(updated);
  }

  // ── Profile Tabs ─────────────────────────────────────────
  async getProfileTabs(userId: string) {
    logger.info('Getting profile tabs', { userId });
    // Returns the available content tabs for a user profile page
    return [
      { key: 'posts', label: 'Bài đăng', count: 0 },
      { key: 'reels', label: 'Reels', count: 0 },
      { key: 'videos', label: 'Videos', count: 0 },
      { key: 'stories', label: 'Stories', count: 0 },
      { key: 'novels', label: 'Truyện', count: 0 },
    ];
  }

  // ── Block ────────────────────────────────────────────────
  async blockUser(blockerId: string, blockedId: string) {
    logger.info('Blocking user', { blockerId, blockedId });

    if (blockerId === blockedId) {
      throw new ConflictException('Không thể chặn chính mình');
    }

    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });

    return { message: 'Đã chặn người dùng' };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    logger.info('Unblocking user', { blockerId, blockedId });

    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });

    return { message: 'Đã bỏ chặn người dùng' };
  }

  async getBlockedUsers(userId: string, page: number, pageSize: number) {
    logger.info('Getting blocked users', { userId, page, pageSize });

    const [total, blocked] = await Promise.all([
      this.prisma.userBlock.count({ where: { blockerId: userId } }),
      this.prisma.userBlock.findMany({
        where: { blockerId: userId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { blocked: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: blocked.map((b) => this.mapProfile(b.blocked)),
      meta: {
        pagination: this.buildPagination(page, pageSize, total),
      },
    };
  }

  // ── Mute ─────────────────────────────────────────────────
  async muteUser(muterId: string, mutedId: string) {
    logger.info('Muting user', { muterId, mutedId });

    if (muterId === mutedId) {
      throw new ConflictException('Không thể tắt thông báo từ chính mình');
    }

    await this.prisma.userMute.upsert({
      where: { muterId_mutedId: { muterId, mutedId } },
      create: { muterId, mutedId },
      update: {},
    });

    return { message: 'Đã tắt thông báo từ người dùng này' };
  }

  async unmuteUser(muterId: string, mutedId: string) {
    logger.info('Unmuting user', { muterId, mutedId });

    await this.prisma.userMute.deleteMany({
      where: { muterId, mutedId },
    });

    return { message: 'Đã bật lại thông báo' };
  }

  // ── Report ───────────────────────────────────────────────
  async reportUser(
    reporterId: string,
    reportedId: string,
    reason: string,
    description?: string,
  ) {
    logger.info('Reporting user', { reporterId, reportedId, reason });
    // TODO: persist to moderation queue
    return { message: 'Đã gửi báo cáo, chúng tôi sẽ xem xét trong thời gian sớm nhất' };
  }

  // ── Privacy Settings ─────────────────────────────────────
  async getPrivacySettings(userId: string) {
    logger.info('Getting privacy settings', { userId });

    const settings = await this.prisma.privacySettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Return defaults
      return {
        isPrivateAccount: false,
        whoCanSeeMyPosts: 'everyone',
        whoCanSendFriendRequest: 'everyone',
        whoCanSeeMyFriendList: 'everyone',
        whoCanTagMe: 'everyone',
      };
    }

    return {
      isPrivateAccount: settings.isPrivateAccount,
      whoCanSeeMyPosts: settings.whoCanSeeMyPosts,
      whoCanSendFriendRequest: settings.whoCanSendFriendRequest,
      whoCanSeeMyFriendList: settings.whoCanSeeMyFriendList,
      whoCanTagMe: settings.whoCanTagMe,
    };
  }

  async updatePrivacySettings(userId: string, dto: UpdatePrivacySettingsDto) {
    logger.info('Updating privacy settings', { userId });

    const settings = await this.prisma.privacySettings.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: {
        ...(dto.isPrivateAccount !== undefined && {
          isPrivateAccount: dto.isPrivateAccount,
        }),
        ...(dto.whoCanSeeMyPosts && { whoCanSeeMyPosts: dto.whoCanSeeMyPosts }),
        ...(dto.whoCanSendFriendRequest && {
          whoCanSendFriendRequest: dto.whoCanSendFriendRequest,
        }),
        ...(dto.whoCanSeeMyFriendList && {
          whoCanSeeMyFriendList: dto.whoCanSeeMyFriendList,
        }),
        ...(dto.whoCanTagMe && { whoCanTagMe: dto.whoCanTagMe }),
      },
    });

    // Sync isPrivate to profile
    if (dto.isPrivateAccount !== undefined) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: { isPrivate: dto.isPrivateAccount },
      });
    }

    return { message: 'Đã cập nhật cài đặt quyền riêng tư' };
  }

  // ── Account Settings ─────────────────────────────────────
  async getAccountSettings(userId: string) {
    logger.info('Getting account settings', { userId });

    const settings = await this.prisma.accountSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return {
        language: 'vi',
        emailNotifications: true,
        pushNotifications: true,
        twoFactorEnabled: false,
      };
    }

    return {
      language: settings.language,
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      twoFactorEnabled: settings.twoFactorEnabled,
    };
  }

  async updateAccountSettings(userId: string, dto: UpdateAccountSettingsDto) {
    logger.info('Updating account settings', { userId });

    await this.prisma.accountSettings.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });

    return { message: 'Đã cập nhật cài đặt tài khoản' };
  }
}
