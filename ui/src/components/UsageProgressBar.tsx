import { ProgressBar } from '@scality/core-ui';
import { useTheme } from 'styled-components';

/* Prometheus has no used/capacity sample for a volume that was never mounted, so
   the usage accessor is undefined for it. ProgressBar's percentage defaults to 50
   when it is not a number, which renders a half-full bar labelled 'undefined%' --
   an unknown usage reading as a real one. */
export const UsageProgressBar = ({ percentage }: { percentage?: number | string }) => {
  const theme = useTheme();
  const value = typeof percentage === 'number' ? percentage : parseFloat(percentage ?? '');
  const isKnown = Number.isFinite(value);

  return (
    <ProgressBar
      size="large"
      percentage={isKnown ? value : 0}
      buildinLabel={isKnown ? `${value}%` : 'N/A'}
      color={theme.infoSecondary}
      backgroundColor={theme.buttonSecondary}
      aria-label={isKnown ? `${value}%` : 'usage not available'}
    />
  );
};
