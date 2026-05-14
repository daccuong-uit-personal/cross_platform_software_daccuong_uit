import winston from 'winston';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';
export interface LoggerOptions {
    service: string;
    level?: LogLevel;
    prettyPrint?: boolean;
}
/**
 * Creates a structured, production-ready logger for a given service.
 * Uses Winston under the hood with JSON in production and pretty-print in development.
 */
export declare function createLogger(options: LoggerOptions): winston.Logger;
export type Logger = winston.Logger;
export { winston };
//# sourceMappingURL=logger.d.ts.map