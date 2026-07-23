import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
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
import { PaginationQueryDto, TargetUserDto } from './dto/friendship.dto';
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

  @Get('friendship/friends')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách bạn bè theo route FE' })
  getFriendsAlias(
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
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendshipService.getSuggestions(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  @Get('friendship/suggestions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gợi ý kết bạn theo route FE' })
  getSuggestionsAlias(
    @CurrentUser() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendshipService.getSuggestions(userId, query.page ?? 1, query.pageSize ?? 20);
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

  @Get('friendship/requests/received')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lời mời kết bạn nhận được theo route FE' })
  getIncomingRequestsAlias(
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

  @Get('friendship/requests/sent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lời mời kết bạn đã gửi theo route FE' })
  getSentRequestsAlias(
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

  @Post('friendship/requests')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lời mời kết bạn theo route FE' })
  sendRequestAlias(
    @Body() dto: TargetUserDto,
    @CurrentUser() currentUserId: string,
  ) {
    return this.friendshipService.sendRequest(currentUserId, dto.targetUserId);
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

  @Post('friendship/requests/:userId/accept')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chấp nhận lời mời kết bạn theo route FE' })
  acceptRequestAlias(
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

  @Post('friendship/requests/:userId/decline')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Từ chối lời mời kết bạn theo route FE' })
  declineRequestAlias(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.friendshipService.rejectRequest(currentUserId, userId);
  }

  @Get('friendship/relationships')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách mối quan hệ theo route FE' })
  getRelationships(
    @CurrentUser() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.friendshipService.getRelationships(userId, query.page ?? 1, query.pageSize ?? 20);
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
