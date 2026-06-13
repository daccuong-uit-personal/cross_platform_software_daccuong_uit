import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('profiles')
@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get profile header and stats' })
  @ApiResponse({ status: 200, description: 'Returns profile data' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  getProfile(@Param('userId') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get(':userId/statistics/weekly')
  @ApiOperation({ summary: 'Get weekly statistics' })
  @ApiResponse({ status: 200, description: 'Returns weekly statistics data' })
  getWeeklyStatistics(@Param('userId') userId: string) {
    return this.profileService.getWeeklyStatistics(userId);
  }

  @Get(':userId/reels')
  @ApiOperation({ summary: 'Get user reels' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns list of reels' })
  getReels(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.profileService.getReels(userId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get(':userId/stories')
  @ApiOperation({ summary: 'Get user stories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns list of stories' })
  getStories(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.profileService.getStories(userId, parseInt(page, 10), parseInt(limit, 10));
  }
}
