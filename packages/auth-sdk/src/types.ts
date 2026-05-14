import { z } from 'zod';

/** The shape of data encoded inside a JWT access token. */
export const AccessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),        // Account ID (from auth-service)
  email: z.string().email(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

/** The shape of data encoded inside a JWT refresh token. */
export const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),        // Account ID
  jti: z.string().uuid(),        // Unique token ID for revocation support
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

/** Standard error codes for auth failures. Shared across gateway and services. */
export const AuthErrorCode = {
  INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  EXPIRED_TOKEN: 'AUTH_TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  ACCOUNT_NOT_FOUND: 'AUTH_ACCOUNT_NOT_FOUND',
  ACCOUNT_BANNED: 'AUTH_ACCOUNT_BANNED',
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
