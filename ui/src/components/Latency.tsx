import { useMemo } from 'react';

const units = [
  { units: 'µs', threshold: 0 },
  { units: 'ms', threshold: 1000 },
  { units: 's', threshold: 1000 * 1000 },
  { units: 'm', threshold: 60 * 1000 * 1000 },
  { units: 'h', threshold: 60 * 60 * 1000 * 1000 },
  { units: 'd', threshold: 24 * 60 * 60 * 1000 * 1000 },
];

export const Latency = ({
  latencyInMicroSeconds,
}: {
  latencyInMicroSeconds: number;
}) => {
  const readableLatency = useMemo(() => {
    for (let i = 1; i < units.length; i++) {
      const unit = units[i];
      const readableLatency = `${(
        latencyInMicroSeconds / unit.threshold
      ).toFixed(2)} ${unit.units}`;
      if (
        i !== units.length - 1 &&
        latencyInMicroSeconds > unit.threshold &&
        latencyInMicroSeconds < units[i + 1].threshold
      ) {
        return readableLatency;
      } else if (
        i === units.length - 1 &&
        latencyInMicroSeconds > unit.threshold
      ) {
        return readableLatency;
      }
    }
    return `${latencyInMicroSeconds} µs`;
  }, [latencyInMicroSeconds]);
  return <>{readableLatency}</>;
};
