import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import type { TooltipContentProps } from 'recharts';
import {
  QuantileTooltipRenderer,
  transformRegularPayload,
  sortPayloadEntries,
} from './shared/QuantileTooltipShared';

type QuantileTooltipProps = {
  tooltipProps: TooltipContentProps<number, string>;
  getQuantileHoverQuery: (
    timestamp?: string,
    threshold?: number,
    operator?: '>' | '<',
    isOnHoverFetchingRequired?: boolean,
    devices?: string | string[],
  ) => any;
  nodeMapPerIp: Record<string, string>;
  devices: string | string[];
  valueBase: number;
  unitLabel: string;
  timeFormat?:
    | 'day-month-abbreviated-hour-minute'
    | 'day-month-abbreviated-hour-minute-second'
    | 'long-date-without-weekday';
};

export const QuantileTooltip: React.FC<QuantileTooltipProps> = ({
  tooltipProps,
  nodeMapPerIp,
  devices,
  valueBase,
  unitLabel,
  timeFormat,
  getQuantileHoverQuery,
}) => {
  const { active, payload, label } = tooltipProps;

  // Extract quantile values from payload
  const quantileData = useMemo(() => {
    if (!payload || !payload.length) return null;
    return transformRegularPayload(payload, label);
  }, [payload, label]);

  // Determine if additional fetching is needed
  const isOnHoverFetchingNeeded = useMemo(() => {
    if (!quantileData) return false;
    return (
      quantileData.median !== quantileData.q90 &&
      quantileData.median !== quantileData.q5
    );
  }, [quantileData]);

  // Fetch quantile hover data
  const quantile90Result = useQuery(
    getQuantileHoverQuery(
      quantileData?.timestamp?.toString(),
      quantileData?.q90,
      '>',
      isOnHoverFetchingNeeded,
      devices,
    ),
    {
      enabled: !!quantileData && isOnHoverFetchingNeeded,
    },
  );

  const quantile5Result = useQuery(
    getQuantileHoverQuery(
      quantileData?.timestamp?.toString(),
      quantileData?.q5,
      '<',
      isOnHoverFetchingNeeded,
      devices,
    ),
    {
      enabled: !!quantileData && isOnHoverFetchingNeeded,
    },
  );

  if (!active || !payload || !payload.length || !label || !quantileData) {
    return null;
  }

  // Sort payload using shared sorting logic (Q90-Q50-Q5)
  const sortedPayload = sortPayloadEntries([...payload]);

  // Add quantile results to payload entries
  const enrichedPayload = sortedPayload.map((entry) => ({
    ...entry,
    quantileResult:
      entry.name === 'Q90'
        ? quantile90Result
        : entry.name === 'Q5'
        ? quantile5Result
        : null,
  }));

  return (
    <QuantileTooltipRenderer
      tooltipProps={tooltipProps}
      sortedPayload={enrichedPayload}
      isOnHoverFetchingNeeded={isOnHoverFetchingNeeded}
      nodeMapPerIp={nodeMapPerIp}
      valueBase={valueBase}
      unitLabel={unitLabel}
      timeFormat={timeFormat}
      showSeparator={false}
    />
  );
};
