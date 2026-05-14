import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * POST /profiles
   * Called by gateway after a successful registration to create a linked profile.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createProfile(@Body() dto: CreateProfileDto) {
    return this.profileService.createProfile(dto);
  }

  /**
   * GET /profiles/username/:username
   * Public profile lookup by handle.
   */
  @Get('username/:username')
  getByUsername(@Param('username') username: string) {
    return this.profileService.getProfileByUsername(username);
  }

  /**
   * GET /profiles/user/:userId
   * Internal lookup by Account ID.
   */
  @Get('user/:userId')
  getByUserId(@Param('userId') userId: string) {
    return this.profileService.getProfileByUserId(userId);
  }

  /**
   * PATCH /profiles/user/:userId
   * Update profile fields (bio, displayName, avatarUrl).
   */
  @Patch('user/:userId')
  updateProfile(@Param('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(userId, dto);
  }
}
