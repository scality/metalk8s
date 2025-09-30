import React, { useMemo } from 'react';
import { useQuery } from 'react-query';
import type { TooltipContentProps } from 'recharts';
import {
  QuantileTooltipRenderer,
  transformSymmetricalPayload,
  sortPayloadEntries,
} from './shared/QuantileTooltipShared';

type SymmetricalQuantileTooltipProps = {
  tooltipProps: TooltipContentProps<number, string>;
  metricPrefixAbove: string;
  metricPrefixBelow: string;
  valueBase: number;
  unitLabel: string;
  timeFormat?:
    | 'day-month-abbreviated-hour-minute'
    | 'day-month-abbreviated-hour-minute-second'
    | 'long-date-without-weekday';
  getAboveQuantileHoverQuery?: (
    timestamp?: string,
    threshold?: number,
    operator?: '>' | '<',
    isOnHoverFetchingRequired?: boolean,
    devices?: string | string[],
  ) => any;
  getBelowQuantileHoverQuery?: (
    timestamp?: string,
    threshold?: number,
    operator?: '>' | '<',
    isOnHoverFetchingRequired?: boolean,
    devices?: string | string[],
  ) => any;
  nodeMapPerIp?: Record<string, string>;
  devices?: string | string[];
};

export const SymmetricalQuantileTooltip: React.FC<
  SymmetricalQuantileTooltipProps
> = ({
  tooltipProps,
  nodeMapPerIp,
  devices,
  valueBase,
  unitLabel,
  timeFormat,
  metricPrefixAbove,
  metricPrefixBelow,
  getAboveQuantileHoverQuery,
  getBelowQuantileHoverQuery,
}) => {
  const { active, payload, label } = tooltipProps;

  // Extract quantile data for symmetrical chart
  const quantileData = useMemo(() => {
    if (!payload || !payload.length) return null;
    return transformSymmetricalPayload(
      payload,
      label,
      metricPrefixAbove,
      metricPrefixBelow,
    );
  }, [payload, label, metricPrefixAbove, metricPrefixBelow]);

  // Determine if additional fetching is needed
  const isOnHoverFetchingNeeded = useMemo(() => {
    if (!quantileData) return false;
    return (
      (quantileData.median.above !== quantileData.q90.above &&
        quantileData.median.above !== quantileData.q5.above) ||
      (quantileData.median.below !== quantileData.q90.below &&
        quantileData.median.below !== quantileData.q5.below)
    );
  }, [quantileData]);

  // Fetch quantile hover data for above queries
  const quantile90AboveResult = useQuery(
    getAboveQuantileHoverQuery?.(
      quantileData?.timestamp?.toString(),
      quantileData?.q90.above,
      '>',
      isOnHoverFetchingNeeded,
      devices,
    ),
    {
      enabled:
        !!quantileData &&
        isOnHoverFetchingNeeded &&
        !!getAboveQuantileHoverQuery,
    },
  );

  const quantile5AboveResult = useQuery(
    getAboveQuantileHoverQuery?.(
      quantileData?.timestamp?.toString(),
      quantileData?.q5.above,
      '<',
      isOnHoverFetchingNeeded,
      devices,
    ),
    {
      enabled:
        !!quantileData &&
        isOnHoverFetchingNeeded &&
        !!getAboveQuantileHoverQuery,
    },
  );

  // Fetch quantile hover data for below queries
  const quantile90BelowResult = useQuery(
    getBelowQuantileHoverQuery?.(
      quantileData?.timestamp?.toString(),
      quantileData?.q90.below,
      '>',
      isOnHoverFetchingNeeded,
      devices,
    ),
    {
      enabled:
        !!quantileData &&
        isOnHoverFetchingNeeded &&
        !!getBelowQuantileHoverQuery &&
        quantileData.q90.below !== null,
    },
  );

  const quantile5BelowResult = useQuery(
    getBelowQuantileHoverQuery?.(
      quantileData?.timestamp?.toString(),
      quantileData?.q5.below,
      '<',
      isOnHoverFetchingNeeded,
      devices,
    ),
    {
      enabled:
        !!quantileData &&
        isOnHoverFetchingNeeded &&
        !!getBelowQuantileHoverQuery &&
        quantileData.q5.below !== null,
    },
  );

  // Create sorted payload
  const sortedPayload = useMemo(() => {
    if (!quantileData) return [];
    const entries = [];

    // Add Q90 entries
    if (quantileData.q90.above !== null) {
      entries.push({
        name: `Q90-${metricPrefixAbove}`,
        dataKey: `Q90-${metricPrefixAbove}`,
        value: quantileData.q90.above,
        color: quantileData.q90.aboveColor,
        quantileType: 'Q90',
        metricPrefix: metricPrefixAbove,
        quantileResult: quantile90AboveResult,
      });
    }

    // Add Median entries
    if (quantileData.median.above !== null) {
      entries.push({
        name: `Median-${metricPrefixAbove}`,
        dataKey: `Median-${metricPrefixAbove}`,
        value: quantileData.median.above,
        color: quantileData.median.aboveColor,
        quantileType: 'Median',
        metricPrefix: metricPrefixAbove,
        quantileResult: null,
      });
    }

    // Add Q5 entries
    if (quantileData.q5.above !== null) {
      entries.push({
        name: `Q5-${metricPrefixAbove}`,
        dataKey: `Q5-${metricPrefixAbove}`,
        value: quantileData.q5.above,
        color: quantileData.q5.aboveColor,
        quantileType: 'Q5',
        metricPrefix: metricPrefixAbove,
        quantileResult: quantile5AboveResult,
      });
    }
    if (quantileData.q5.below !== null) {
      entries.push({
        name: `Q5-${metricPrefixBelow}`,
        dataKey: `Q5-${metricPrefixBelow}`,
        value: quantileData.q5.below,
        color: quantileData.q5.belowColor,
        quantileType: 'Q5',
        metricPrefix: metricPrefixBelow,
        quantileResult: quantile5BelowResult,
      });
    }
    if (quantileData.median.below !== null) {
      entries.push({
        name: `Median-${metricPrefixBelow}`,
        dataKey: `Median-${metricPrefixBelow}`,
        value: quantileData.median.below,
        color: quantileData.median.belowColor,
        quantileType: 'Median',
        metricPrefix: metricPrefixBelow,
        quantileResult: null,
      });
    }
    if (quantileData.q90.below !== null) {
      entries.push({
        name: `Q90-${metricPrefixBelow}`,
        dataKey: `Q90-${metricPrefixBelow}`,
        value: quantileData.q90.below,
        color: quantileData.q90.belowColor,
        quantileType: 'Q90',
        metricPrefix: metricPrefixBelow,
        quantileResult: quantile90BelowResult,
      });
    }

    return sortPayloadEntries(entries, {
      metricPrefixAbove,
      metricPrefixBelow,
    });
  }, [
    quantileData,
    metricPrefixAbove,
    metricPrefixBelow,
    quantile90AboveResult,
    quantile90BelowResult,
    quantile5AboveResult,
    quantile5BelowResult,
  ]);

  if (!active || !payload || !payload.length || !label || !quantileData) {
    return null;
  }

  return (
    <QuantileTooltipRenderer
      tooltipProps={tooltipProps}
      sortedPayload={sortedPayload}
      isOnHoverFetchingNeeded={isOnHoverFetchingNeeded}
      nodeMapPerIp={nodeMapPerIp}
      valueBase={valueBase}
      unitLabel={unitLabel}
      timeFormat={timeFormat}
      showSeparator={true}
      metricPrefixAbove={metricPrefixAbove}
      metricPrefixBelow={metricPrefixBelow}
    />
  );
};
