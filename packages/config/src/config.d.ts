import { z } from 'zod';
/**
 * Validates and parses environment variables using a Zod schema.
 * Throws a descriptive error at startup if any required variable is missing or invalid.
 *
 * @example
 * const AppConfig = loadConfig(z.object({
 *   PORT: z.coerce.number().default(3000),
 *   DATABASE_URL: z.string().url(),
 * }));
 */
export declare function loadConfig<T extends z.ZodTypeAny>(schema: T): z.infer<T>;
/** Base env vars every service must have. */
export declare const BaseEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug", "verbose"]>>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    LOG_LEVEL: "info" | "warn" | "error" | "debug" | "verbose";
}, {
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    LOG_LEVEL?: "info" | "warn" | "error" | "debug" | "verbose" | undefined;
}>;
export type BaseEnv = z.infer<typeof BaseEnvSchema>;
//# sourceMappingURL=config.d.ts.map