import jwt from 'jsonwebtoken';
import { AccessTokenPayload, RefreshTokenPayload } from './types';

export interface JwtServiceOptions {
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenExpiresIn?: string | number;
  refreshTokenExpiresIn?: string | number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Stateless JWT utility.
 * Responsible ONLY for signing and verifying tokens.
 * Token storage and revocation are the responsibility of the auth-service.
 */
export class JwtService {
  constructor(private readonly options: JwtServiceOptions) {}

  signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.options.accessTokenSecret, {
      expiresIn: (this.options.accessTokenExpiresIn ?? '15m') as any,
    });
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.options.refreshTokenSecret, {
      expiresIn: (this.options.refreshTokenExpiresIn ?? '7d') as any,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return jwt.verify(token, this.options.accessTokenSecret) as AccessTokenPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.options.refreshTokenSecret) as RefreshTokenPayload;
  }

  signTokenPair(accountId: string, email: string, jti: string): TokenPair {
    return {
      accessToken: this.signAccessToken({ sub: accountId, email }),
      refreshToken: this.signRefreshToken({ sub: accountId, jti }),
    };
  }
}
