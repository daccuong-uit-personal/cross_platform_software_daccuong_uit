import winston from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

export interface LoggerOptions {
  service: string;
  level?: LogLevel;
  prettyPrint?: boolean;
}

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const prettyFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, service, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}${stackStr}`;
  }),
);

const jsonFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

/**
 * Creates a structured, production-ready logger for a given service.
 * Uses Winston under the hood with JSON in production and pretty-print in development.
 */
export function createLogger(options: LoggerOptions): winston.Logger {
  const { service, level = 'info', prettyPrint = process.env.NODE_ENV !== 'production' } = options;

  return winston.createLogger({
    level,
    defaultMeta: { service },
    format: prettyPrint ? prettyFormat : jsonFormat,
    transports: [
      new winston.transports.Console(),
    ],
  });
}

export type Logger = winston.Logger;
export { winston };
