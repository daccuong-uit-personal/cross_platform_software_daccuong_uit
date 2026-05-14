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
export declare class JwtService {
    private readonly options;
    constructor(options: JwtServiceOptions);
    signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string;
    signRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string;
    verifyAccessToken(token: string): AccessTokenPayload;
    verifyRefreshToken(token: string): RefreshTokenPayload;
    signTokenPair(accountId: string, email: string, jti: string): TokenPair;
}
//# sourceMappingURL=jwt.service.d.ts.map