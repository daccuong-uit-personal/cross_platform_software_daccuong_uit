import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { PaginationQueryDto } from './dto/follow.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('follow')
@Controller()
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  // ── Follow / Unfollow ─────────────────────────────────────
  @Post('users/:userId/follow')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow người dùng' })
  @ApiResponse({ status: 200, description: 'Đã follow hoặc đã gửi follow request (private account)' })
  follow(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.followService.follow(currentUserId, userId);
  }

  @Delete('users/:userId/follow')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow người dùng' })
  unfollow(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.followService.unfollow(currentUserId, userId);
  }

  // ── Followers / Following ─────────────────────────────────
  @Get('users/:userId/followers')
  @ApiOperation({ summary: 'Danh sách followers' })
  getFollowers(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.followService.getFollowers(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('users/:userId/following')
  @ApiOperation({ summary: 'Danh sách đang theo dõi' })
  getFollowing(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.followService.getFollowing(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  // ── Follow Requests (private account) ────────────────────
  @Get('follow/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách follow requests đang chờ duyệt (tài khoản private)' })
  getFollowRequests(
    @CurrentUser() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.followService.getFollowRequests(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  @Post('follow/requests/:userId/approve')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chấp nhận follow request' })
  approveFollowRequest(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.followService.approveFollowRequest(currentUserId, userId);
  }

  @Post('follow/requests/:userId/reject')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Từ chối follow request' })
  rejectFollowRequest(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.followService.rejectFollowRequest(currentUserId, userId);
  }
}
