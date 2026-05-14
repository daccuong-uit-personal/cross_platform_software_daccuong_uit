import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { HttpProxyService } from '../common/services/http-proxy.service';
import { appConfig } from '../config/app.config';

@Controller('v1/auth')
export class AuthProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: unknown) {
    return this.proxy.forward('POST', `${appConfig.AUTH_SERVICE_URL}/auth/register`, { body });
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
