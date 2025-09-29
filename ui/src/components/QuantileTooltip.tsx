import {
  chartColors,
  fontSize,
  fontWeight,
} from '@scality/core-ui/dist/style/theme';
import React, { useMemo } from 'react';
import {
  Stack,
  spacing,
  FormattedDateTime,
  SmallerText,
} from '@scality/core-ui/dist/index';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import type { TooltipContentProps } from 'recharts';
import styled from 'styled-components';
import { LegendShape } from '@scality/core-ui/dist/components/chartlegend/ChartLegend';
import {
  SmallerSecondaryText,
  Text,
} from '@scality/core-ui/dist/components/text/Text.component';

const TooltipContainer = styled.div`
  background-color: ${(props) => props.theme.backgroundLevel1};
  padding: ${spacing.r8};
  border: 1px solid ${(props) => props.theme.border};
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 500px;
  min-width: 280px;
`;

const TooltipTime = styled.div`
  margin-bottom: ${spacing.r8};
  color: ${(props) => props.theme.textPrimary};
  font-size: ${fontSize.smaller};
  font-weight: ${fontWeight.bold};
  text-align: center;
`;

const LoadingText = styled.div`
  padding: ${spacing.r2} ${spacing.r16};
  color: ${(props) => props.theme.textSecondary};
  font-size: ${fontSize.smaller};
  font-style: italic;
`;

const ErrorText = styled.div`
  padding: ${spacing.r2} ${spacing.r16};
  color: ${(props) => props.theme.statusCritical};
  font-size: ${fontSize.smaller};
`;

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
  timeFormat?: 'date-time' | 'date';
};

// Component for rendering quantile node data
const QuantileNodeList: React.FC<{
  queryResult: any;
  nodeMapPerIp: Record<string, string>;
  valueBase: number;
  unitLabel: string;
  intl: any;
}> = ({ queryResult, nodeMapPerIp, valueBase, unitLabel, intl }) => {
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

  if (isSuccess && data?.data?.result) {
    return (
      <Stack direction="vertical" gap={'r2'}>
        {data.data.result.map((nodeData: any, index: number) => {
          const nodeName = nodeMapPerIp[nodeData.metric.instance];
          const rawValue = parseFloat(nodeData.value[1]);
          const formattedValue = (rawValue / (valueBase || 1)).toFixed(2);
          const displayValue = unitLabel
            ? `${formattedValue} ${unitLabel}`
            : formattedValue;
          const array = [1, 2, 3];
          return array.map((item) => {
            return (
              <Stack direction="horizontal" gap={'r8'} key={index}>
                <SmallerSecondaryText>{nodeName}</SmallerSecondaryText>
                <SmallerSecondaryText>{displayValue}</SmallerSecondaryText>
              </Stack>
            );
          });
        })}
      </Stack>
    );
  }

  return null;
};

const OverOrBelowThresholdSection = ({
  quantileName,
  isOnHoverFetchingNeeded,
  quantileResult,
  nodeMapPerIp,
  valueBase,
  unitLabel,
  intl,
}) => {
  const title =
    quantileName === 'Q90'
      ? `Nodes above ${quantileName}`
      : `Nodes below ${quantileName}`;
  console.log('DEBUG OverOrBelowThresholdSection', title);
  return (
    <Stack direction="horizontal" gap={'r8'}>
      <Text variant="Smaller" style={{ width: '30%' }}>
        {title}
      </Text>
      {isOnHoverFetchingNeeded && (
        <QuantileNodeList
          queryResult={quantileResult}
          nodeMapPerIp={nodeMapPerIp}
          valueBase={valueBase}
          unitLabel={unitLabel}
          intl={intl}
        />
      )}
    </Stack>
  );
};

export const QuantileTooltip: React.FC<QuantileTooltipProps> = ({
  tooltipProps,
  getQuantileHoverQuery,
  nodeMapPerIp,
  devices,
  valueBase,
  unitLabel,
  timeFormat = 'date-time',
}) => {
  const intl = useIntl();
  const { active, payload, label } = tooltipProps;

  // Extract quantile values from payload
  //TODO move to an extract data utils function in graphUtils
  const quantileData = useMemo(() => {
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

  // Sort payload by value (highest first)
  const sortedPayload = [...payload].sort((a, b) => {
    const aValue = Number(a.value);
    const bValue = Number(b.value);
    return bValue - aValue;
  });

  return (
    <TooltipContainer>
      <TooltipTime>
        <FormattedDateTime
          format={
            timeFormat === 'date-time'
              ? 'day-month-abbreviated-hour-minute-second'
              : 'long-date-without-weekday'
          }
          value={new Date(label)}
        />
      </TooltipTime>

      <Stack direction="vertical" gap={'r8'} withSeparators>
        {sortedPayload.map((entry, index) => {
          const serieData = {
            color: entry.color,
            name: entry.name,
            value: `${Number(entry.value).toFixed(2)} ${unitLabel}`,
            key: entry.dataKey || entry.name,
          };
          return (
            <Stack direction="vertical" gap={'r4'}>
              <Stack direction="horizontal" gap={'r8'} style={{ width: '30%' }}>
                <LegendShape
                  color={serieData.color}
                  shape="line"
                  chartColors={chartColors}
                />
                <SmallerText>{serieData.name}</SmallerText>

                <Text
                  variant="Smaller"
                  style={{
                    justifySelf: 'flex-end',
                    textAlign: 'right',
                  }}
                >
                  {serieData.value}
                </Text>
              </Stack>

              {(entry.name === 'Q90' || entry.name === 'Q5') && (
                <OverOrBelowThresholdSection
                  quantileName={entry.name}
                  isOnHoverFetchingNeeded={isOnHoverFetchingNeeded}
                  quantileResult={
                    entry.name === 'Q90' ? quantile90Result : quantile5Result
                  }
                  nodeMapPerIp={nodeMapPerIp}
                  valueBase={valueBase}
                  unitLabel={unitLabel}
                  intl={intl}
                />
              )}
            </Stack>
          );
        })}
      </Stack>
    </TooltipContainer>
  );
};
