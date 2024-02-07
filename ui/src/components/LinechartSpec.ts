export const yAxisUsage = [
  {
    field: 'y',
    type: 'quantitative',
    axis: {
      title: null,
      orient: 'right',
    },
    // the max value of usage chart should always be 100%
    scale: {
      domain: [0, 100],
    },
  },
];
export const yAxis = [
  {
    field: 'y',
    type: 'quantitative',
    axis: {
      title: null,
      orient: 'right',
    },
  },
];
export const yAxisWriteRead = [
  {
    field: 'write',
    type: 'quantitative',
    axis: {
      title: null,
      orient: 'right',
    },
  },
  {
    field: 'read',
    type: 'quantitative',
    axis: {
      title: null,
      orient: 'right',
    },
  },
];
export const yAxisThroughput = [
  {
    field: 'y',
    type: 'quantitative',
    axis: {
      title: 'write(+) / read(-)',
      orient: 'right',
    },
  },
];
export const getTooltipConfig = (
  fields: {
    field: string;
    type: string;
    title: string;
    format: string;
  }[],
) => {
  const tooltipConfigBase = {
    transform: [
      {
        pivot: 'type',
        value: 'y',
        groupby: ['date'],
      },
    ],
    mark: 'rule',
    encoding: {
      opacity: {
        condition: {
          value: 1,
          selection: 'hover',
        },
        value: 0,
      },
      tooltip: [
        {
          field: 'date',
          type: 'temporal',
          axis: {
            format: '%d/%m %H:%M',
            ticks: true,
            tickCount: 4,
            labelAngle: -50,
            labelColor: '#B5B5B5',
          },
          title: 'Date',
        },
      ],
      // Hardcode the color of the rule until we have the design for light mode
      color: {
        value: '#ffffff',
      },
    },
    selection: {
      hover: {
        type: 'single',
        fields: ['date'],
        nearest: true,
        on: 'mouseover',
        empty: 'none',
        clear: 'mouseout',
      },
    },
  };

  if (fields.length) {
    const newFields = [...tooltipConfigBase.encoding.tooltip, ...fields];
    const newConfig = Object.assign({}, tooltipConfigBase);
    // @ts-expect-error - FIXME when you are working on it
    newConfig.encoding.tooltip = newFields;
    return newConfig;
  }

  return tooltipConfigBase;
};
