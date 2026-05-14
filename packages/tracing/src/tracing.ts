import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export interface TracingOptions {
  serviceName: string;
  serviceVersion?: string;
  /** OTLP collector endpoint. Defaults to http://localhost:4318/v1/traces */
  collectorUrl?: string;
  /** Set to false to disable tracing (e.g., in test env). Default: true */
  enabled?: boolean;
}

let sdk: NodeSDK | null = null;

/**
 * Initializes OpenTelemetry distributed tracing.
 * MUST be called before any other imports/require statements in the service entrypoint.
 *
 * @example
 * // bootstrap.ts (run before main.ts)
 * initTracing({ serviceName: 'auth-service' });
 */
export function initTracing(options: TracingOptions): void {
  const {
    serviceName,
    serviceVersion = '0.0.1',
    collectorUrl = 'http://localhost:4318/v1/traces',
    enabled = process.env.NODE_ENV !== 'test',
  } = options;

  if (!enabled) {
    return;
  }

  const exporter = new OTLPTraceExporter({ url: collectorUrl });

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk?.shutdown().finally(() => process.exit(0));
  });
}

export { NodeSDK };
