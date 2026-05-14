import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { HttpProxyService } from '../common/services/http-proxy.service';
import { appConfig } from '../config/app.config';

@Controller('v1/auth')
export class AuthProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: any) {
    // 1. Create authentication account
    const authResponse = await this.proxy.forward<any>('POST', `${appConfig.AUTH_SERVICE_URL}/auth/register`, {
      body: {
        email: body.email,
        password: body.password,
        username: body.username,
        displayName: body.displayName,
      },
    });

    // 2. Create identity profile
    try {
      await this.proxy.forward('POST', `${appConfig.IDENTITY_SERVICE_URL}/profiles`, {
        body: {
          userId: authResponse.accountId,
          username: body.username,
          displayName: body.displayName,
        },
      });
    } catch (err) {
      // In a production app, we would handle this with a saga/compensating transaction
      // For now, we'll just log it and return the auth response
      console.error('[gateway] Failed to create profile for user', authResponse.accountId, err);
    }

    return authResponse;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: unknown) {
    return this.proxy.forward('POST', `${appConfig.AUTH_SERVICE_URL}/auth/login`, { body });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: unknown) {
    return this.proxy.forward('POST', `${appConfig.AUTH_SERVICE_URL}/auth/refresh`, { body });
  }
}
