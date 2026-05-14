import 'dotenv/config';
import { loadConfig, BaseEnvSchema } from '@platform/config';
import { z } from 'zod';

const GatewayEnvSchema = BaseEnvSchema.extend({
  JWT_ACCESS_SECRET: z.string().min(32),
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  IDENTITY_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_LIMIT: z.coerce.number().default(100),
});

export const appConfig = loadConfig(GatewayEnvSchema);
export type AppConfig = typeof appConfig;
