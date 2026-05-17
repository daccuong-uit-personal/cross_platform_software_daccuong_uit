import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@platform/auth-sdk';
import { AuthErrorCode } from '@platform/auth-sdk';
import { appConfig } from '../config/app.config';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { createLogger } from '@platform/logger';

const logger = createLogger({ service: 'auth-service:auth' });

const jwtService = new JwtService({
  accessTokenSecret: appConfig.JWT_ACCESS_SECRET,
  refreshTokenSecret: appConfig.JWT_REFRESH_SECRET,
  accessTokenExpiresIn: appConfig.JWT_ACCESS_EXPIRES_IN,
  refreshTokenExpiresIn: appConfig.JWT_REFRESH_EXPIRES_IN,
});

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.account.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email đã tồn tại trong hệ thống');
    }

    const passwordHash = await argon2.hash(dto.password);

    const account = await this.prisma.account.create({
      data: {
        email: dto.email,
        passwordHash,
        status: 'ACTIVE',
      },
    });

    logger.info('Account registered', { accountId: account.id });

    const tokens = jwtService.signTokenPair(account.id, account.email, randomUUID());
    return { message: 'Đăng ký tài khoản thành công', accountId: account.id, ...tokens };
  }

  async login(dto: LoginDto) {
    const account = await this.prisma.account.findUnique({
      where: { email: dto.email },
    });

    if (!account) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (account.status === 'BANNED') {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
    }

    const isValid = await argon2.verify(account.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    logger.info('Account logged in', { accountId: account.id });

    const tokens = jwtService.signTokenPair(account.id, account.email, randomUUID());
    return { message: 'Đăng nhập thành công', accountId: account.id, ...tokens };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = jwtService.verifyRefreshToken(refreshToken);

      const account = await this.prisma.account.findUnique({
        where: { id: payload.sub },
      });

      if (!account) {
        throw new NotFoundException('Tài khoản không tồn tại');
      }

      if (account.status === 'BANNED') {
        throw new UnauthorizedException('Tài khoản của bạn đã bị khóa');
      }

      const tokens = jwtService.signTokenPair(account.id, account.email, randomUUID());
      return { message: 'Làm mới token thành công', ...tokens };
    } catch (err: unknown) {
      if (
        err instanceof ConflictException ||
        err instanceof NotFoundException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      throw new UnauthorizedException('Token xác thực không hợp lệ hoặc đã hết hạn');
    }
  }

  async getAccount(accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, email: true, status: true, createdAt: true },
    });

    if (!account) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    return account;
  }
}
