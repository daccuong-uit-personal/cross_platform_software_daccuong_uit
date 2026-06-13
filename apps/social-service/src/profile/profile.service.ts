import { Injectable } from '@nestjs/common';
import { createLogger } from '@platform/logger';

const logger = createLogger({ service: 'social-service:profile' });

@Injectable()
export class ProfileService {
  constructor() {}

  async getProfile(userId: string) {
    logger.info('Fetching profile header', { userId });
    return {
      id: userId === 'me' ? 'user-123' : userId,
      displayName: 'Người dùng Reals',
      username: 'nguoi_dung',
      avatarUrl: 'https://ui-avatars.com/api/?name=User&background=333&color=fff',
      bannerUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18',
      isVerified: true,
      joinDate: '2021-12-01T00:00:00Z',
      socialLinks: {
        facebook: 'facebook.com/nguyendac.cuon...',
        instagram: null,
      },
      stats: {
        followingCount: 98,
        followersCount: 1200,
      },
    };
  }

  async getWeeklyStatistics(userId: string) {
    logger.info('Fetching weekly stats', { userId });
    return {
      weeklyVisits: {
        total: 1254,
        trendPercentage: 12.5,
        isPositive: true,
      },
      contentViewsIncrease: {
        stories: 450,
        reels: 1200,
        videos: 320,
        posts: 890,
      },
      interactionsIncrease: {
        comments: 156,
        reactions: 842,
        shares: 45,
        totalTrendPercentage: 24.0,
      },
    };
  }

  async getReels(userId: string, page: number, limit: number) {
    logger.info('Fetching reels', { userId, page, limit });
    return {
      data: [
        {
          id: 'reel-1',
          title: 'Bí kíp quay video triệu view',
          views: 1200000,
          viewsFormatted: '1.2M',
          coverUrl: 'https://picsum.photos/300/500?random=11',
          createdAt: '2026-06-10T10:00:00Z',
        },
      ],
      meta: {
        totalItems: 1,
        currentPage: page,
        totalPages: 1,
      },
    };
  }

  async getStories(userId: string, page: number, limit: number) {
    logger.info('Fetching stories', { userId, page, limit });
    return {
      data: [
        {
          id: 'story-1',
          title: 'Bí Ẩn Mùa Hè',
          status: 'Đang ra • 45 chương',
          genre: 'Tiểu thuyết, Bí ẩn, Hành động',
          description: 'Một câu chuyện hấp dẫn về những bí ẩn chưa có lời giải đáp...',
          coverUrl: 'https://picsum.photos/300/450?random=1',
          metrics: {
            likes: '1.2K',
            comments: '450',
            shares: '32',
            views: '5.6K',
          },
          createdAt: '2026-05-20T08:30:00Z',
        },
      ],
      meta: {
        totalItems: 1,
        currentPage: page,
        totalPages: 1,
      },
    };
  }
}
