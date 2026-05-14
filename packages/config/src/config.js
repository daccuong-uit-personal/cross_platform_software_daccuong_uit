"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseEnvSchema = void 0;
exports.loadConfig = loadConfig;
const zod_1 = require("zod");
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
function loadConfig(schema) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
        const formatted = result.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new Error(`\n[CONFIG] Invalid environment variables detected:\n${formatted}\n\nPlease check your .env file or environment setup.\n`);
    }
    return result.data;
}
// ─── Shared base schemas that all services can extend ─────────────────────────
/** Base env vars every service must have. */
exports.BaseEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().min(1).max(65535).default(3000),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
});
//# sourceMappingURL=config.js.map