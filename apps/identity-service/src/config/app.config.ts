import 'dotenv/config';
import { loadConfig, BaseEnvSchema } from '@platform/config';
import { z } from 'zod';

const IdentityEnvSchema = BaseEnvSchema.extend({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('*'),
});

export const appConfig = loadConfig(IdentityEnvSchema);
export type AppConfig = typeof appConfig;
