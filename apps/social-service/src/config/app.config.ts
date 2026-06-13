import 'dotenv/config';
import { loadConfig, BaseEnvSchema } from '@platform/config';
import { z } from 'zod';

const SocialEnvSchema = BaseEnvSchema.extend({
  PORT: z.coerce.number().default(3004),
  SOCIAL_SERVICE_PORT: z.coerce.number().default(3004),
  DATABASE_URL: z.string().url().optional(),
  CORS_ORIGIN: z.string().default('*'),
}).transform((data) => ({
  ...data,
  PORT: data.SOCIAL_SERVICE_PORT || data.PORT,
}));

export const appConfig = loadConfig(SocialEnvSchema);
export type AppConfig = typeof appConfig;
