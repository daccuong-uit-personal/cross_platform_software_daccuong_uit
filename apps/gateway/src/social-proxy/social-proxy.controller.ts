import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HttpProxyService } from '../common/services/http-proxy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { appConfig } from '../config/app.config';
import { AccessTokenPayload } from '@platform/auth-sdk';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

interface AuthenticatedRequest {
  user: AccessTokenPayload;
}

@ApiTags('users')
@Controller('users')
export class SocialProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  // ── User Profile (Public - Optional Auth) ────────────────
  @Get(':userId')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'User profile data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfile(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const headers: Record<string, string> = {};
    if (req.user?.sub) {
      headers['x-user-id'] = req.user.sub;
    }
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}`, {
      headers,
    });
  }

  @Get(':userId/profile-summary')
  @ApiOperation({ summary: 'Get user profile summary' })
  @ApiResponse({ status: 200, description: 'User profile summary' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfileSummary(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const headers: Record<string, string> = {};
    if (req.user?.sub) {
      headers['x-user-id'] = req.user.sub;
    }
    return this.proxy.forward(
      'GET',
      `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/profile-summary`,
      { headers },
    );
  }

  @Get(':userId/profile-insights')
  @ApiOperation({ summary: 'Get user profile insights' })
  @ApiResponse({ status: 200, description: 'User profile insights' })
  getProfileInsights(@Param('userId') userId: string) {
    return this.proxy.forward(
      'GET',
      `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/profile-insights`,
    );
  }

  @Get(':userId/profile-tabs')
  @ApiOperation({ summary: 'Get user profile tabs list' })
  @ApiResponse({ status: 200, description: 'Profile tabs list' })
  getProfileTabs(@Param('userId') userId: string) {
    return this.proxy.forward(
      'GET',
      `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/profile-tabs`,
    );
  }

  @Get(':userId/profile-tabs/:tabId')
  @ApiOperation({ summary: 'Get user profile tab content' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Profile tab content' })
  getProfileTab(
    @Param('userId') userId: string,
    @Param('tabId') tabId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    const url = `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/profile-tabs/${tabId}${
      queryString ? `?${queryString}` : ''
    }`;
    return this.proxy.forward('GET', url);
  }

  // ── User Actions (Requires Auth) ────────────────────────
  @Put(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateProfile(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('PUT', `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}`, {
      body,
      headers: { 'x-user-id': req.user.sub },
    });
  }

  @Post(':userId/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  blockUser(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/block`, {
      headers: { 'x-user-id': req.user.sub },
    });
  }

  @Delete(':userId/block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  unblockUser(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('DELETE', `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/block`, {
      headers: { 'x-user-id': req.user.sub },
    });
  }

  @Post(':userId/mute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute a user' })
  @ApiResponse({ status: 200, description: 'User muted' })
  muteUser(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/mute`, {
      headers: { 'x-user-id': req.user.sub },
    });
  }

  @Delete(':userId/mute')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmute a user' })
  @ApiResponse({ status: 200, description: 'User unmuted' })
  unmuteUser(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('DELETE', `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/mute`, {
      headers: { 'x-user-id': req.user.sub },
    });
  }

  @Post(':userId/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a user' })
  @ApiResponse({ status: 200, description: 'User reported' })
  reportUser(
    @Param('userId') userId: string,
    @Body() body: unknown,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/users/${userId}/report`, {
      body,
      headers: { 'x-user-id': req.user.sub },
    });
  }

  // ── My Account (Requires Auth) ──────────────────────────
  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user suggestions' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User suggestions' })
  getSuggestions(
    @Query('limit') limit?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const userId = req?.user?.sub || '00000000-0000-0000-0000-000000000000';
    const query = new URLSearchParams();
    if (limit) query.append('limit', limit);
    const queryString = query.toString();
    const url = `${appConfig.SOCIAL_SERVICE_URL}/users/suggestions${
      queryString ? `?${queryString}` : ''
    }`;
    return this.proxy.forward('GET', url, {
      headers: { 'x-user-id': userId },
    });
  }

  @Get('me/blocked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of blocked users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of blocked users' })
  getBlockedUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const userId = req?.user?.sub || '00000000-0000-0000-0000-000000000000';
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    const url = `${appConfig.SOCIAL_SERVICE_URL}/users/me/blocked${
      queryString ? `?${queryString}` : ''
    }`;
    return this.proxy.forward('GET', url, {
      headers: { 'x-user-id': userId },
    });
  }

  @Get('blocked')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of blocked users via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getBlockedUsersAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    const url = `${appConfig.SOCIAL_SERVICE_URL}/users/blocked${queryString ? `?${queryString}` : ''}`;
    return this.proxy.forward('GET', url, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('muted')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get list of muted users via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getMutedUsersAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    const url = `${appConfig.SOCIAL_SERVICE_URL}/users/muted${queryString ? `?${queryString}` : ''}`;
    return this.proxy.forward('GET', url, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('me/privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings' })
  getPrivacySettings(@Request() req: AuthenticatedRequest) {
    const userId = req?.user?.sub || '00000000-0000-0000-0000-000000000000';
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/users/me/privacy`, {
      headers: { 'x-user-id': userId },
    });
  }

  @Put('me/privacy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings updated' })
  updatePrivacySettings(
    @Body() body: unknown,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('PUT', `${appConfig.SOCIAL_SERVICE_URL}/users/me/privacy`, {
      body,
      headers: { 'x-user-id': req.user.sub },
    });
  }

  @Get('me/account-settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account settings' })
  @ApiResponse({ status: 200, description: 'Account settings' })
  getAccountSettings(@Request() req: AuthenticatedRequest) {
    const userId = req?.user?.sub || '00000000-0000-0000-0000-000000000000';
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/users/me/account-settings`, {
      headers: { 'x-user-id': userId },
    });
  }

  @Get('friendship/friends')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get friends via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getFriendsAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/friendship/friends${queryString ? `?${queryString}` : ''}`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('friendship/suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get friend suggestions via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getSuggestionsAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/friendship/suggestions${queryString ? `?${queryString}` : ''}`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('friendship/requests/received')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get received friend requests via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getReceivedRequestsAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/friendship/requests/received${queryString ? `?${queryString}` : ''}`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('friendship/requests/sent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sent friend requests via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getSentRequestsAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/friendship/requests/sent${queryString ? `?${queryString}` : ''}`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('friendship/relationships')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get relationships via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getRelationshipsAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/friendship/relationships${queryString ? `?${queryString}` : ''}`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Post('friendship/requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send friend request via FE route' })
  sendFriendRequestAlias(
    @Body() body: { targetUserId: string },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/friendship/requests`, {
      body,
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Post('friendship/requests/:userId/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept friend request via FE route' })
  acceptFriendRequestAlias(
    @Param('userId') userId: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/friendship/requests/${userId}/accept`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Post('friendship/requests/:userId/decline')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline friend request via FE route' })
  declineFriendRequestAlias(
    @Param('userId') userId: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/friendship/requests/${userId}/decline`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Post('follow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Follow via FE route' })
  followAlias(
    @Body() body: { targetUserId: string },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/follow`, {
      body,
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Post('follow/unfollow')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow via FE route' })
  unfollowAlias(
    @Body() body: { targetUserId: string },
    @Request() req?: AuthenticatedRequest,
  ) {
    return this.proxy.forward('POST', `${appConfig.SOCIAL_SERVICE_URL}/follow/unfollow`, {
      body,
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('follow/followers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get followers via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getFollowersAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/follow/followers${queryString ? `?${queryString}` : ''}`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Get('follow/following')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get following via FE route' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  getFollowingAlias(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const query = new URLSearchParams();
    if (page) query.append('page', page);
    if (pageSize) query.append('pageSize', pageSize);
    const queryString = query.toString();
    return this.proxy.forward('GET', `${appConfig.SOCIAL_SERVICE_URL}/follow/following${queryString ? `?${queryString}` : ''}`, {
      headers: { 'x-user-id': req?.user?.sub || '' },
    });
  }

  @Put('me/account-settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update account settings' })
  @ApiResponse({ status: 200, description: 'Account settings updated' })
  updateAccountSettings(
    @Body() body: unknown,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.proxy.forward('PUT', `${appConfig.SOCIAL_SERVICE_URL}/users/me/account-settings`, {
      body,
      headers: { 'x-user-id': req.user.sub },
    });
  }
}
