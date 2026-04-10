import { MetricsTimeSpanContext } from '@scality/core-ui/dist/components/charts/MetricsTimeSpanProvider';
import { useShellHooks } from '@scality/module-federation';
import { useLayoutEffect } from 'react';
import FederatedIntlProvider from '../containers/IntlProvider';
import StartTimeProvider from '../containers/StartTimeProvider';
import { initialize as initializePrometheus, setHeaders } from '../services/prometheus/api';
import PlatformGlobalHealthBar from './PlatformGlobalHealthBar';

// 7-day defaults — same constants as core-ui's SAMPLE_DURATION/FREQUENCY_LAST_SEVEN_DAYS
const DEFAULT_DURATION_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_FREQUENCY_SECONDS = 60 * 60;

type Props = {
  prometheusUrl: string;
  title?: string;
  durationSeconds?: number;
  frequencySeconds?: number;
};

export default function PlatformGlobalHealthBarFederated({
  prometheusUrl,
  title,
  durationSeconds = DEFAULT_DURATION_SECONDS,
  frequencySeconds = DEFAULT_FREQUENCY_SECONDS,
}: Props) {
  const { useAuth } = useShellHooks();
  const { userData } = useAuth();
  const token = userData?.token;

  useLayoutEffect(() => {
    if (token) {
      initializePrometheus(prometheusUrl);
      setHeaders({ Authorization: `Bearer ${token}` });
    }
  }, [prometheusUrl, token]);

  if (!token) return null;

  const timeSpan = {
    query: '',
    label: '',
    duration: durationSeconds,
    interval: frequencySeconds,
    frequency: frequencySeconds, // StartTimeProvider reads this deprecated field
  };

  return (
    <MetricsTimeSpanContext.Provider value={timeSpan}>
      <StartTimeProvider>
        <FederatedIntlProvider>
          <PlatformGlobalHealthBar title={title} />
        </FederatedIntlProvider>
      </StartTimeProvider>
    </MetricsTimeSpanContext.Provider>
  );
}
