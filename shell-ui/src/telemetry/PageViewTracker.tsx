import type { Logger } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { useCurrentRoutePattern } from '@scality/core-ui/dist/components/routes/Routes.component';
import { useEffect, useState } from 'react';

export const PAGE_VIEW_LOGS_URL = '/api/maestro/otlp/v1/logs';
const SCOPE_NAME = 'shell-ui';

export function createPageViewLoggerProvider() {
  return new LoggerProvider({
    resource: resourceFromAttributes({ 'service.name': SCOPE_NAME }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: PAGE_VIEW_LOGS_URL }),
        scheduledDelayMillis: 5000,
        maxExportBatchSize: 50,
      }),
    ],
  });
}

export function PageViewTracker() {
  const pattern = useCurrentRoutePattern();
  const [logger, setLogger] = useState<Logger | null>(null);

  useEffect(() => {
    const provider = createPageViewLoggerProvider();
    setLogger(provider.getLogger(SCOPE_NAME));

    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        provider.forceFlush().catch(() => undefined);
      }
    };
    document.addEventListener('visibilitychange', flushWhenHidden);

    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      setLogger(null);
      provider.shutdown().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!logger || !pattern) {
      return;
    }
    try {
      logger.emit({
        eventName: 'ui.page_view',
        timestamp: Date.now(),
        attributes: { 'url.template': pattern },
      });
    } catch {
      // Telemetry must never break the UI.
    }
  }, [logger, pattern]);

  return null;
}
