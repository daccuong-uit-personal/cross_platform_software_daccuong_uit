import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HashtagsQueryDto, HashtagContentQueryDto, HashtagContentType } from './dto/hashtag.dto';

@Injectable()
export class HashtagsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildPagination(page: number, pageSize: number, totalItems: number) {
    return {
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize),
      totalItems,
      itemsPerPage: pageSize,
      hasNext: page < Math.ceil(totalItems / pageSize),
    };
  }

  async getTrending(query: HashtagsQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const [total, hashtags] = await Promise.all([
      this.prisma.hashtag.count(),
      this.prisma.hashtag.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { score: 'desc' }, // Sort by trending score
      }),
    ]);

    return {
      data: hashtags.map(h => ({
        name: h.name,
        totalMentions: h.postCount + h.reelCount + h.videoCount,
        trendingScore: h.score,
      })),
      meta: { pagination: this.buildPagination(page, pageSize, total) },
    };
  }

  async getHashtagDetail(name: string) {
    const hashtagName = name.toLowerCase().replace('#', '');
    const hashtag = await this.prisma.hashtag.findUnique({
      where: { name: hashtagName },
    });

    if (!hashtag) {
      return {
        name: hashtagName,
        totalMentions: 0,
        trendingScore: 0,
      };
    }

    return {
      name: hashtag.name,
      totalMentions: hashtag.postCount + hashtag.reelCount + hashtag.videoCount,
      trendingScore: hashtag.score,
    };
  }

  async getContent(name: string, query: HashtagContentQueryDto, currentUserId?: string) {
    const { page = 1, pageSize = 20, type = HashtagContentType.ALL } = query;
    const hashtagName = name.toLowerCase().replace('#', '');

    // Depending on type, we fetch from different tables. 
    // For simplicity, if ALL, we might fetch from Posts and Reels and merge, 
    // but pagination merging is hard in SQL. 
    // Usually, TikTok/Insta defaults to Reels or Posts. We will implement specifically.
    
    // For this example, let's just return posts if ALL or POST
    if (type === HashtagContentType.POST || type === HashtagContentType.ALL) {
      const where = { hashtags: { has: hashtagName }, isDeleted: false, visibility: 'PUBLIC' };
      const [total, posts] = await Promise.all([
        this.prisma.post.count({ where }),
        this.prisma.post.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: { author: true },
        }),
      ]);

      return {
        data: posts.map(p => ({
          id: p.id,
          type: 'post',
          content: p.content,
          author: { id: p.authorId, username: p.author.username },
          createdAt: p.createdAt,
        })),
        meta: { pagination: this.buildPagination(page, pageSize, total) },
      };
    }

    // Logic for REEL and VIDEO can be added similarly here.
    return { data: [], meta: { pagination: this.buildPagination(page, pageSize, 0) } };
  }

  // Internal method to increment counters (called via Message Queue or direct injection in future)
  async incrementHashtagCount(tags: string[], type: 'post' | 'reel' | 'video') {
    for (const tag of tags) {
      const name = tag.toLowerCase();
      const updateData: any = {};
      if (type === 'post') updateData.postCount = { increment: 1 };
      if (type === 'reel') updateData.reelCount = { increment: 1 };
      if (type === 'video') updateData.videoCount = { increment: 1 };

      await this.prisma.hashtag.upsert({
        where: { name },
        create: { name, [type + 'Count']: 1, score: 1.0 },
        update: { ...updateData, score: { increment: 0.1 } }, // simple scoring
      });
    }
  }
}
