"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthErrorCode = exports.RefreshTokenPayloadSchema = exports.AccessTokenPayloadSchema = void 0;
const zod_1 = require("zod");
/** The shape of data encoded inside a JWT access token. */
exports.AccessTokenPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string().uuid(), // Account ID (from auth-service)
    email: zod_1.z.string().email(),
    iat: zod_1.z.number().optional(),
    exp: zod_1.z.number().optional(),
});
/** The shape of data encoded inside a JWT refresh token. */
exports.RefreshTokenPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string().uuid(), // Account ID
    jti: zod_1.z.string().uuid(), // Unique token ID for revocation support
    iat: zod_1.z.number().optional(),
    exp: zod_1.z.number().optional(),
});
/** Standard error codes for auth failures. Shared across gateway and services. */
exports.AuthErrorCode = {
    INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    EXPIRED_TOKEN: 'AUTH_TOKEN_EXPIRED',
    INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
    ACCOUNT_NOT_FOUND: 'AUTH_ACCOUNT_NOT_FOUND',
    ACCOUNT_BANNED: 'AUTH_ACCOUNT_BANNED',
    INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
};
//# sourceMappingURL=types.js.map