import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';
import { createLogger } from '@platform/logger';

const logger = createLogger({ service: 'identity-service:profile' });

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(dto: CreateProfileDto) {
    const [existingUser, existingUsername] = await Promise.all([
      this.prisma.profile.findUnique({ where: { userId: dto.userId } }),
      this.prisma.profile.findUnique({ where: { username: dto.username } }),
    ]);

    if (existingUser) {
      throw new ConflictException('A profile already exists for this user.');
    }
    if (existingUsername) {
      throw new ConflictException('This username is already taken.');
    }

    const profile = await this.prisma.profile.create({
      data: {
        userId: dto.userId,
        username: dto.username,
        displayName: dto.displayName ?? dto.username,
      },
    });

    logger.info('Profile created', { profileId: profile.id, userId: dto.userId });
    return profile;
  }

  async getProfileByUsername(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
    });

    if (!profile) {
      throw new NotFoundException(`Profile '@${username}' not found.`);
    }

    return profile;
  }

  async getProfileByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found for this user.');
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found.');
    }

    const updated = await this.prisma.profile.update({
      where: { userId },
      data: dto,
    });

    logger.info('Profile updated', { profileId: updated.id });
    return updated;
  }
}
