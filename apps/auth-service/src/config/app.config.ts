import 'dotenv/config';
import { loadConfig, BaseEnvSchema } from '@platform/config';
import { z } from 'zod';

const AuthEnvSchema = BaseEnvSchema.extend({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
});

export const appConfig = loadConfig(AuthEnvSchema);
export type AppConfig = typeof appConfig;
