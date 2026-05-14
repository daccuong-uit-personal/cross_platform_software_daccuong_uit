import { z } from 'zod';
/** The shape of data encoded inside a JWT access token. */
export declare const AccessTokenPayloadSchema: z.ZodObject<{
    sub: z.ZodString;
    email: z.ZodString;
    iat: z.ZodOptional<z.ZodNumber>;
    exp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    email: string;
    sub: string;
    iat?: number | undefined;
    exp?: number | undefined;
}, {
    email: string;
    sub: string;
    iat?: number | undefined;
    exp?: number | undefined;
}>;
/** The shape of data encoded inside a JWT refresh token. */
export declare const RefreshTokenPayloadSchema: z.ZodObject<{
    sub: z.ZodString;
    jti: z.ZodString;
    iat: z.ZodOptional<z.ZodNumber>;
    exp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sub: string;
    jti: string;
    iat?: number | undefined;
    exp?: number | undefined;
}, {
    sub: string;
    jti: string;
    iat?: number | undefined;
    exp?: number | undefined;
}>;
export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;
/** Standard error codes for auth failures. Shared across gateway and services. */
export declare const AuthErrorCode: {
    readonly INVALID_TOKEN: "AUTH_INVALID_TOKEN";
    readonly EXPIRED_TOKEN: "AUTH_TOKEN_EXPIRED";
    readonly INSUFFICIENT_PERMISSIONS: "AUTH_INSUFFICIENT_PERMISSIONS";
    readonly ACCOUNT_NOT_FOUND: "AUTH_ACCOUNT_NOT_FOUND";
    readonly ACCOUNT_BANNED: "AUTH_ACCOUNT_BANNED";
    readonly INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS";
};
export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];
//# sourceMappingURL=types.d.ts.map