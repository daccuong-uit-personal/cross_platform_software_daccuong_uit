import {
  Controller,
  Get,
  Post,
  Delete,
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
import { FriendshipService } from './friendship.service';
import { PaginationQueryDto, FriendSuggestionsQueryDto } from './dto/friendship.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('friendship')
@Controller()
export class FriendshipController {
  constructor(private readonly friendshipService: FriendshipService) {}

  // ── Friends List ──────────────────────────────────────────
  @Get('friends')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách bạn bè' })
  getFriends(
    @CurrentUser() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendshipService.getFriends(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  // ── Suggestions ───────────────────────────────────────────
  @Get('friends/suggestions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gợi ý kết bạn' })
  getSuggestions(
    @CurrentUser() userId: string,
    @Query() query: FriendSuggestionsQueryDto,
  ) {
    return this.friendshipService.getSuggestions(userId, query.limit ?? 10);
  }

  // ── Incoming Requests ─────────────────────────────────────
  @Get('friends/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lời mời kết bạn nhận được' })
  getIncomingRequests(
    @CurrentUser() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendshipService.getIncomingRequests(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  // ── Sent Requests ─────────────────────────────────────────
  @Get('friends/requests/sent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lời mời kết bạn đã gửi' })
  getSentRequests(
    @CurrentUser() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendshipService.getSentRequests(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  // ── Send / Cancel Request ─────────────────────────────────
  @Post('friends/requests/:userId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lời mời kết bạn' })
  sendRequest(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.friendshipService.sendRequest(currentUserId, userId);
  }

  @Delete('friends/requests/:userId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy lời mời kết bạn đã gửi' })
  cancelRequest(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.friendshipService.cancelRequest(currentUserId, userId);
  }

  // ── Accept / Reject Request ───────────────────────────────
  @Post('friends/requests/:userId/accept')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chấp nhận lời mời kết bạn' })
  acceptRequest(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.friendshipService.acceptRequest(currentUserId, userId);
  }

  @Post('friends/requests/:userId/reject')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Từ chối lời mời kết bạn' })
  rejectRequest(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.friendshipService.rejectRequest(currentUserId, userId);
  }

  // ── Unfriend ──────────────────────────────────────────────
  @Delete('friends/:userId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy kết bạn' })
  unfriend(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.friendshipService.unfriend(currentUserId, userId);
  }

  // ── Mutual Friends ────────────────────────────────────────
  @Get('friends/:userId/mutual')
  @ApiOperation({ summary: 'Bạn chung' })
  getMutualFriends(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendshipService.getMutualFriends(
      currentUserId,
      userId,
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }
}
