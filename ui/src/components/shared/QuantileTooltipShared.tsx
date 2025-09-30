import {
  chartColors,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import React from 'react';
import {
  Stack,
  spacing,
  SmallerText,
  Wrap,
  FormattedDateTime,
} from '@scality/core-ui/dist/index';
import styled from 'styled-components';
import { LegendShape } from '@scality/core-ui/dist/components/chartlegend/ChartLegend';
import {
  SmallerSecondaryText,
  Text,
} from '@scality/core-ui/dist/components/text/Text.component';
import type { TooltipContentProps } from 'recharts';
import { useIntl } from 'react-intl';

// Simple base props for tooltip components
export interface BaseQuantileTooltipProps {
  tooltipProps: TooltipContentProps<number, string>;
  nodeMapPerIp: Record<string, string>;
  devices: string | string[];
  valueBase: number;
  unitLabel: string;
  timeFormat?:
    | 'day-month-abbreviated-hour-minute'
    | 'day-month-abbreviated-hour-minute-second'
    | 'long-date-without-weekday';
}

// Data transformation types
export type RegularQuantileData = {
  q90: number;
  q5: number;
  median: number;
  timestamp: number;
};

export type SymmetricalQuantileData = {
  q90: {
    above: number | null;
    below: number | null;
    aboveColor?: string;
    belowColor?: string;
  };
  median: {
    above: number | null;
    below: number | null;
    aboveColor?: string;
    belowColor?: string;
  };
  q5: {
    above: number | null;
    below: number | null;
    aboveColor?: string;
    belowColor?: string;
  };
  timestamp: number;
};

// Payload transformation functions
export const transformRegularPayload = (
  payload: any[],
  label: string | number,
): RegularQuantileData | null => {
  if (!payload || !payload.length) return null;

  const q90Item = payload.find(
    (item) => item.name === 'Q90' || item.dataKey === 'Q90',
  );
  const q5Item = payload.find(
    (item) => item.name === 'Q5' || item.dataKey === 'Q5',
  );
  const medianItem = payload.find(
    (item) => item.name === 'Median' || item.dataKey === 'Median',
  );

  if (!q90Item || !q5Item || !medianItem) return null;

  return {
    q90: Math.abs(Number(q90Item.value)),
    q5: Math.abs(Number(q5Item.value)),
    median: Math.abs(Number(medianItem.value)),
    timestamp: label ? new Date(label).getTime() / 1000 : 0,
  };
};

export const transformSymmetricalPayload = (
  payload: any[],
  label: string | number,
  metricPrefixAbove: string,
  metricPrefixBelow: string,
): SymmetricalQuantileData | null => {
  if (!payload || !payload.length) return null;

  const findQuantile = (quantileName: string, metricPrefix: string) => {
    return payload.find(
      (item) =>
        item.name === `${quantileName}-${metricPrefix}` ||
        item.dataKey === `${quantileName}-${metricPrefix}` ||
        (item.name &&
          item.name.includes(quantileName) &&
          item.name.includes(metricPrefix)),
    );
  };

  const q90Above = findQuantile('Q90', metricPrefixAbove);
  const q90Below = findQuantile('Q90', metricPrefixBelow);
  const medianAbove = findQuantile('Median', metricPrefixAbove);
  const medianBelow = findQuantile('Median', metricPrefixBelow);
  const q5Above = findQuantile('Q5', metricPrefixAbove);
  const q5Below = findQuantile('Q5', metricPrefixBelow);

  return {
    q90: {
      above: q90Above ? Math.abs(Number(q90Above.value)) : null,
      below: q90Below ? Math.abs(Number(q90Below.value)) : null,
      aboveColor: q90Above?.color,
      belowColor: q90Below?.color,
    },
    median: {
      above: medianAbove ? Math.abs(Number(medianAbove.value)) : null,
      below: medianBelow ? Math.abs(Number(medianBelow.value)) : null,
      aboveColor: medianAbove?.color,
      belowColor: medianBelow?.color,
    },
    q5: {
      above: q5Above ? Math.abs(Number(q5Above.value)) : null,
      below: q5Below ? Math.abs(Number(q5Below.value)) : null,
      aboveColor: q5Above?.color,
      belowColor: q5Below?.color,
    },
    timestamp: label ? new Date(label).getTime() / 1000 : 0,
  };
};

// Shared styled components
export const TooltipContainer = styled.div`
  background-color: ${(props) => props.theme.backgroundLevel1};
  padding: ${spacing.r8};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 300px;
  max-width: 400px;
`;

export const TooltipTime = styled.div`
  margin-bottom: ${spacing.r8};
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.smaller};
  font-weight: ${fontWeight.bold};
  text-align: center;
`;

export const LoadingText = styled.div`
  padding: ${spacing.r2} ${spacing.r16};
  color: ${(props) => props.theme.textSecondary};
  font-size: ${fontSize.smaller};
  font-style: italic;
`;

export const ErrorText = styled.div`
  padding: ${spacing.r2} ${spacing.r16};
  color: ${(props) => props.theme.statusCritical};
  font-size: ${fontSize.smaller};
`;

export const SeparatorLine = styled.div`
  height: 1px;
  background-color: ${(props) => props.theme.border};
  margin: ${spacing.r8} 0;
  width: 100%;
`;

// Shared QuantileNodeList component
export const QuantileNodeList: React.FC<{
  queryResult: any;
  quantileName: string;
  nodeMapPerIp: Record<string, string>;
  valueBase: number;
  unitLabel: string;
  intl: any;
}> = ({
  queryResult,
  quantileName,
  nodeMapPerIp,
  valueBase,
  unitLabel,
  intl,
}) => {
  const { isIdle, isLoading, isSuccess, isError, data } = queryResult;

  if (isLoading || isIdle) {
    return <LoadingText>Loading...</LoadingText>;
  }

  if (isError) {
    return (
      <ErrorText>
        {intl.formatMessage({ id: 'error_occur_outpassing_threshold' })}
      </ErrorText>
    );
  }

  if (isSuccess && data?.data?.result.length > 0) {
    return (
      <Stack direction="vertical" gap={'r2'}>
        {data.data.result.map((nodeData: any, index: number) => {
          const nodeName = nodeMapPerIp[nodeData.metric.instance];
          const rawValue = parseFloat(nodeData.value[1]);
          const formattedValue = (rawValue / (valueBase || 1)).toFixed(2);
          const displayValue = unitLabel
            ? `${formattedValue} ${unitLabel}`
            : formattedValue;

          return (
            <Wrap key={index + nodeName}>
              <SmallerSecondaryText>{nodeName}</SmallerSecondaryText>
              <Text
                variant="Smaller"
                color="textSecondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {displayValue}
              </Text>
            </Wrap>
          );
        })}
      </Stack>
    );
  }
  if (isSuccess && data?.data?.result.length === 0) {
    return (
      <Text variant="Smaller" style={{ fontStyle: 'italic', color: '#666' }}>
        No nodes found {quantileName === 'Q90' ? 'above' : 'below'} threshold
      </Text>
    );
  }

  return null;
};

export const OverOrBelowThresholdSection: React.FC<{
  quantileName: string;
  metricPrefix?: string;
  isOnHoverFetchingNeeded: boolean;
  quantileResult: any;
  nodeMapPerIp: Record<string, string>;
  valueBase: number;
  unitLabel: string;
  intl: any;
}> = ({
  quantileName,
  metricPrefix,
  isOnHoverFetchingNeeded,
  quantileResult,
  nodeMapPerIp,
  valueBase,
  unitLabel,
  intl,
}) => {
  const title = metricPrefix
    ? quantileName === 'Q90'
      ? `Nodes above ${quantileName}-${metricPrefix}`
      : `Nodes below ${quantileName}-${metricPrefix}`
    : quantileName === 'Q90'
    ? `Nodes above ${quantileName}`
    : `Nodes below ${quantileName}`;

  return (
    <Stack direction="vertical" gap={'r2'} style={{ paddingLeft: spacing.r32 }}>
      <Text variant="Smaller">{title}</Text>
      {isOnHoverFetchingNeeded && nodeMapPerIp && (
        <QuantileNodeList
          queryResult={quantileResult}
          quantileName={quantileName}
          nodeMapPerIp={nodeMapPerIp}
          valueBase={valueBase}
          unitLabel={unitLabel}
          intl={intl}
        />
      )}
    </Stack>
  );
};

// Shared sorting logic for different tooltip types
export const sortPayloadEntries = (
  entries: any[],
  metricPrefixes?: { metricPrefixAbove: string; metricPrefixBelow: string },
): any[] => {
  if (metricPrefixes) {
    const { metricPrefixAbove, metricPrefixBelow } = metricPrefixes;
    // For symmetrical: Q90Above → Q50Above → Q5Above → Q5Below → Q50Below → Q90Below
    const order = [
      `Q90-${metricPrefixAbove}`,
      `Median-${metricPrefixAbove}`,
      `Q5-${metricPrefixAbove}`,
      `Q5-${metricPrefixBelow}`,
      `Median-${metricPrefixBelow}`,
      `Q90-${metricPrefixBelow}`,
    ];

    return entries.sort((a, b) => {
      const aName = a.name;
      const bName = b.name;

      const aIndex = order.indexOf(aName);
      const bIndex = order.indexOf(bName);

      // If not found in predefined order, fall back to alphabetical
      if (aIndex === -1 && bIndex === -1) {
        return aName.localeCompare(bName);
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  } else {
    // For regular: Q90-Q50-Q5 (sort by value, highest first)
    return entries.sort((a, b) => Number(b.value) - Number(a.value));
  }
};

// Shared tooltip entry rendering logic
export const TooltipEntry = ({
  entry,
  index,
  unitLabel,
  isOnHoverFetchingNeeded,
  nodeMapPerIp,
  valueBase,
  intl,
  quantileResult,
  quantileName,
  metricPrefix,
  isLastAboveEntry,
}: {
  entry: any;
  index: number;
  unitLabel: string;
  isOnHoverFetchingNeeded: boolean;
  nodeMapPerIp: Record<string, string>;
  valueBase: number;
  intl: any;
  quantileResult: any;
  quantileName: string;
  metricPrefix: string;
  isLastAboveEntry: boolean;
}) => {
  const serieData = {
    color: entry.color,
    name: entry.name,
    value: `${Number(entry.value).toFixed(2)} ${unitLabel}`,
    key: entry.dataKey || entry.name,
  };

  return (
    <>
      <Stack direction="vertical" gap={'r4'} key={index}>
        <Wrap>
          <Stack direction="horizontal" gap={'r10'}>
            <LegendShape
              color={serieData.color}
              shape="line"
              chartColors={chartColors}
            />
            <SmallerText>{serieData.name}</SmallerText>
          </Stack>

          <Text
            variant="Smaller"
            style={{
              justifySelf: 'flex-end',
              textAlign: 'right',
            }}
          >
            {serieData.value}
          </Text>
        </Wrap>

        {(quantileName === 'Q90' || quantileName === 'Q5') &&
          quantileResult && (
            <OverOrBelowThresholdSection
              quantileName={quantileName}
              metricPrefix={metricPrefix}
              isOnHoverFetchingNeeded={isOnHoverFetchingNeeded}
              quantileResult={quantileResult}
              nodeMapPerIp={nodeMapPerIp}
              valueBase={valueBase}
              unitLabel={unitLabel}
              intl={intl}
            />
          )}
      </Stack>
      {isLastAboveEntry && <SeparatorLine />}
    </>
  );
};

export interface QuantileTooltipRendererProps {
  tooltipProps: TooltipContentProps<number, string>;
  sortedPayload: any[];
  isOnHoverFetchingNeeded: boolean;
  nodeMapPerIp: Record<string, string>;
  valueBase: number;
  unitLabel: string;
  timeFormat?:
    | 'day-month-abbreviated-hour-minute'
    | 'day-month-abbreviated-hour-minute-second'
    | 'long-date-without-weekday';
  showSeparator?: boolean;
  metricPrefixAbove?: string;
  metricPrefixBelow?: string;
}

export const QuantileTooltipRenderer: React.FC<
  QuantileTooltipRendererProps
> = ({
  tooltipProps,
  sortedPayload,
  isOnHoverFetchingNeeded,
  nodeMapPerIp,
  valueBase,
  unitLabel,
  timeFormat,
  showSeparator = false,
  metricPrefixAbove,
  metricPrefixBelow,
}) => {
  const intl = useIntl();
  const { active, payload, label } = tooltipProps;

  if (!active || !payload || !payload.length || !label) {
    return null;
  }

  return (
    <TooltipContainer>
      <TooltipTime>
        <FormattedDateTime format={timeFormat} value={new Date(label)} />
      </TooltipTime>

      <Stack direction="vertical" gap={'r12'}>
        {sortedPayload.map((entry, index) => {
          const isLastAboveEntry =
            showSeparator &&
            metricPrefixAbove &&
            metricPrefixBelow &&
            entry.metricPrefix === metricPrefixAbove &&
            entry.quantileType === 'Q5' &&
            sortedPayload[index + 1]?.metricPrefix === metricPrefixBelow;

          return (
            <TooltipEntry
              key={index}
              entry={entry}
              index={index}
              unitLabel={unitLabel}
              isOnHoverFetchingNeeded={isOnHoverFetchingNeeded}
              nodeMapPerIp={nodeMapPerIp}
              valueBase={valueBase}
              intl={intl}
              quantileResult={entry.quantileResult}
              quantileName={entry.quantileType || entry.name}
              metricPrefix={entry.metricPrefix}
              isLastAboveEntry={isLastAboveEntry}
            />
          );
        })}
      </Stack>
    </TooltipContainer>
  );
};
