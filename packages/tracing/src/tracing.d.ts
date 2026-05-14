import { NodeSDK } from '@opentelemetry/sdk-node';
export interface TracingOptions {
    serviceName: string;
    serviceVersion?: string;
    /** OTLP collector endpoint. Defaults to http://localhost:4318/v1/traces */
    collectorUrl?: string;
    /** Set to false to disable tracing (e.g., in test env). Default: true */
    enabled?: boolean;
}
/**
 * Initializes OpenTelemetry distributed tracing.
 * MUST be called before any other imports/require statements in the service entrypoint.
 *
 * @example
 * // bootstrap.ts (run before main.ts)
 * initTracing({ serviceName: 'auth-service' });
 */
export declare function initTracing(options: TracingOptions): void;
export { NodeSDK };
//# sourceMappingURL=tracing.d.ts.map