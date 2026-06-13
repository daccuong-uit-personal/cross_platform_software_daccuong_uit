import {
  Controller,
  Get,
  Put,
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
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  ReportDto,
  UpdatePrivacySettingsDto,
  UpdateAccountSettingsDto,
  PaginationQueryDto,
  SuggestionsQueryDto,
} from './dto/user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Suggestions ──────────────────────────────────────────
  @Get('users/suggestions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gợi ý người dùng nên follow' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getSuggestions(
    @CurrentUser() userId: string,
    @Query() query: SuggestionsQueryDto,
  ) {
    return this.usersService.getSuggestions(userId, query.limit ?? 10);
  }

  // ── Profile ──────────────────────────────────────────────
  @Get('users/:userId')
  @ApiOperation({ summary: 'Lấy thông tin profile người dùng' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng' })
  @ApiResponse({ status: 404, description: 'Người dùng không tồn tại' })
  getProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.usersService.getProfile(userId, currentUserId);
  }

  @Put('users/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật profile' })
  @ApiResponse({ status: 200, description: 'Profile sau khi cập nhật' })
  updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('users/:userId/profile-tabs')
  @ApiOperation({ summary: 'Lấy danh sách subtab profile người dùng' })
  getProfileTabs(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.usersService.getProfileTabs(userId);
  }

  // ── Block ────────────────────────────────────────────────
  @Post('users/:userId/block')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chặn người dùng' })
  blockUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.usersService.blockUser(currentUserId, userId);
  }

  @Delete('users/:userId/block')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bỏ chặn người dùng' })
  unblockUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.usersService.unblockUser(currentUserId, userId);
  }

  @Get('users/me/blocked')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách người dùng đang bị chặn' })
  getBlockedUsers(
    @CurrentUser() userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.usersService.getBlockedUsers(userId, query.page ?? 1, query.pageSize ?? 20);
  }

  // ── Mute ─────────────────────────────────────────────────
  @Post('users/:userId/mute')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tắt thông báo từ người dùng' })
  muteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.usersService.muteUser(currentUserId, userId);
  }

  @Delete('users/:userId/mute')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bỏ tắt thông báo từ người dùng' })
  unmuteUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
  ) {
    return this.usersService.unmuteUser(currentUserId, userId);
  }

  // ── Report ───────────────────────────────────────────────
  @Post('users/:userId/report')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Báo cáo người dùng' })
  reportUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUserId: string,
    @Body() dto: ReportDto,
  ) {
    return this.usersService.reportUser(currentUserId, userId, dto.reason, dto.description);
  }

  // ── Privacy Settings ─────────────────────────────────────
  @Get('users/me/privacy')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy cài đặt quyền riêng tư' })
  getPrivacySettings(@CurrentUser() userId: string) {
    return this.usersService.getPrivacySettings(userId);
  }

  @Put('users/me/privacy')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật cài đặt quyền riêng tư' })
  updatePrivacySettings(
    @CurrentUser() userId: string,
    @Body() dto: UpdatePrivacySettingsDto,
  ) {
    return this.usersService.updatePrivacySettings(userId, dto);
  }

  // ── Account Settings ─────────────────────────────────────
  @Get('users/me/account-settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy cài đặt tài khoản' })
  getAccountSettings(@CurrentUser() userId: string) {
    return this.usersService.getAccountSettings(userId);
  }

  @Put('users/me/account-settings')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật cài đặt tài khoản' })
  updateAccountSettings(
    @CurrentUser() userId: string,
    @Body() dto: UpdateAccountSettingsDto,
  ) {
    return this.usersService.updateAccountSettings(userId, dto);
  }
}
