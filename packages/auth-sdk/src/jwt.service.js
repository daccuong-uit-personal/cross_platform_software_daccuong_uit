"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Stateless JWT utility.
 * Responsible ONLY for signing and verifying tokens.
 * Token storage and revocation are the responsibility of the auth-service.
 */
class JwtService {
    constructor(options) {
        this.options = options;
    }
    signAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.options.accessTokenSecret, {
            expiresIn: (this.options.accessTokenExpiresIn ?? '15m'),
        });
    }
    signRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.options.refreshTokenSecret, {
            expiresIn: (this.options.refreshTokenExpiresIn ?? '7d'),
        });
    }
    verifyAccessToken(token) {
        return jsonwebtoken_1.default.verify(token, this.options.accessTokenSecret);
    }
    verifyRefreshToken(token) {
        return jsonwebtoken_1.default.verify(token, this.options.refreshTokenSecret);
    }
    signTokenPair(accountId, email, jti) {
        return {
            accessToken: this.signAccessToken({ sub: accountId, email }),
            refreshToken: this.signRefreshToken({ sub: accountId, jti }),
        };
    }
}
exports.JwtService = JwtService;
//# sourceMappingURL=jwt.service.js.map