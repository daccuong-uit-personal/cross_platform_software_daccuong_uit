"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.winston = void 0;
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
exports.winston = winston_1.default;
const { combine, timestamp, printf, colorize, json, errors } = winston_1.default.format;
const prettyFormat = combine(colorize({ all: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), printf(({ level, message, timestamp, service, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}${stackStr}`;
}));
const jsonFormat = combine(timestamp(), errors({ stack: true }), json());
/**
 * Creates a structured, production-ready logger for a given service.
 * Uses Winston under the hood with JSON in production and pretty-print in development.
 */
function createLogger(options) {
    const { service, level = 'info', prettyPrint = process.env.NODE_ENV !== 'production' } = options;
    return winston_1.default.createLogger({
        level,
        defaultMeta: { service },
        format: prettyPrint ? prettyFormat : jsonFormat,
        transports: [
            new winston_1.default.transports.Console(),
        ],
    });
}
//# sourceMappingURL=logger.js.map