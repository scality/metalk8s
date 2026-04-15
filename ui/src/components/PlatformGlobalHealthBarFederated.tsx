import { MetricsTimeSpanContext } from '@scality/core-ui/dist/components/charts/MetricsTimeSpanProvider';
import { useShellHooks } from '@scality/module-federation';
import { useLayoutEffect, useMemo } from 'react';
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


  /**
   * Initialize the Prometheus client and set the authorization header if the token is available
   * The initialization of Prometheus client is neeeded here as it is shared with Module Federation to another ui
   * The prometheus client could not be initialized in the parent component rendering it.
   */
  useLayoutEffect(() => {
    if (token) {
      initializePrometheus(prometheusUrl);
      setHeaders({ Authorization: `Bearer ${token}` });
    }
  }, [prometheusUrl, token]);

  const timeSpan = useMemo(
    () => ({
      query: '',
      label: '',
      duration: durationSeconds,
      interval: frequencySeconds,
      //TODO: remove this field when QueryTimeSpan type is updated
      frequency: frequencySeconds, // required by QueryTimeSpan type (deprecated but not optional)
    }),
    [durationSeconds, frequencySeconds],
  );

  if (!token) return null;

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
