import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HttpProxyService } from '../common/services/http-proxy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { appConfig } from '../config/app.config';
import { AccessTokenPayload } from '@platform/auth-sdk';

interface AuthenticatedRequest {
  user: AccessTokenPayload;
}

@Controller('v1/profiles')
export class IdentityProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * POST /v1/profiles
   * Creates a profile for the authenticated user.
   * Injects userId from the verified JWT — client cannot forge it.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createProfile(@Body() body: Record<string, unknown>, @Request() req: AuthenticatedRequest) {
    return this.proxy.forward('POST', `${appConfig.IDENTITY_SERVICE_URL}/profiles`, {
      body: { ...body, userId: req.user.sub },
    });
  }

  /**
   * GET /v1/profiles/me
   * Returns the authenticated user's own profile.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@Request() req: AuthenticatedRequest) {
    return this.proxy.forward(
      'GET',
      `${appConfig.IDENTITY_SERVICE_URL}/profiles/user/${req.user.sub}`,
    );
  }

  /**
   * GET /v1/profiles/username/:username
   * Public profile lookup — no auth required.
   */
  @Get('username/:username')
  getProfileByUsername(@Param('username') username: string) {
    return this.proxy.forward(
      'GET',
      `${appConfig.IDENTITY_SERVICE_URL}/profiles/username/${username}`,
    );
  }

  /**
   * GET /v1/profiles/user/:userId
   * Profile lookup by Account ID.
   */
  @Get('user/:userId')
  getProfileByUserId(@Param('userId') userId: string) {
    return this.proxy.forward(
      'GET',
      `${appConfig.IDENTITY_SERVICE_URL}/profiles/user/${userId}`,
    );
  }

  /**
   * PATCH /v1/profiles/me
   * Updates the authenticated user's profile.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Body() body: unknown, @Request() req: AuthenticatedRequest) {
    return this.proxy.forward(
      'PATCH',
      `${appConfig.IDENTITY_SERVICE_URL}/profiles/user/${req.user.sub}`,
      { body },
    );
  }
}
