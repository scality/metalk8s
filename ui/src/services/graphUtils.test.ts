import {
  getMultiResourceSeriesForChart,
  getMultipleSymmetricalSeries,
  fiterMetricValues,
  createSymmetricalQuantileColorSet,
  createColorSet,
  getTimeFormatForInterval,
} from './graphUtils';
import {
  lineColor2,
  lineColor3,
  lineColor4,
  lineColor5,
  lineColor6,
  lineColor7,
  CHART_COLOR_VALUES,
  SAMPLE_FREQUENCY_LAST_SEVEN_DAYS,
  SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS,
  SAMPLE_FREQUENCY_LAST_ONE_HOUR,
} from '../constants';
const testPromData = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: {
          instance: '192.168.1.1:9100',
        },
        values: [
          [1620724265, '29.84965469788186'],
          [1620727865, '29.921830869711798'],
          [1620731465, '29.835760477410332'],
          [1620735065, '29.818792314356614'],
          [1620738665, '29.994621830058193'],
        ],
      },
      {
        metric: {
          instance: '192.168.1.2:9100',
        },
        values: [
          [1620724265, '29.84965469788186'],
          [1620727865, '29.921830869711798'],
          [1620731465, '29.835760477410332'],
          [1620735065, '29.818792314356614'],
          [1620738665, '29.994621830058193'],
        ],
      },
    ],
  },
};
const testNodesData = [
  {
    name: 'node1',
    internalIP: '192.168.1.1',
  },
  {
    name: 'node2',
    internalIP: '192.168.1.2',
  },
];
it('returns the data set within series for multi resources chart', () => {
  const multiResourceSeries = getMultiResourceSeriesForChart(
    // @ts-expect-error - FIXME when you are working on it
    testPromData,
    testNodesData,
  );
  const expectSeries = [
    {
      data: [
        [1620724265, '29.84965469788186'],
        [1620727865, '29.921830869711798'],
        [1620731465, '29.835760477410332'],
        [1620735065, '29.818792314356614'],
        [1620738665, '29.994621830058193'],
      ],
      resource: 'node1',
      getTooltipLabel: expect.anything(),
      isLineDashed: false,
    },
    {
      data: [
        [1620724265, '29.84965469788186'],
        [1620727865, '29.921830869711798'],
        [1620731465, '29.835760477410332'],
        [1620735065, '29.818792314356614'],
        [1620738665, '29.994621830058193'],
      ],
      resource: 'node2',
      getTooltipLabel: expect.anything(),
      isLineDashed: false,
    },
  ];
  expect(multiResourceSeries).toMatchObject(expectSeries);
});
it('returns the correct labels for tooltip and legend for multi resources chart', () => {
  const multiResourceSeries = getMultiResourceSeriesForChart(
    // @ts-expect-error - FIXME when you are working on it
    testPromData,
    testNodesData,
  );
  expect(multiResourceSeries[0].getTooltipLabel('', 'node1')).toEqual('node1');
  expect(multiResourceSeries[1].getTooltipLabel('', 'node2')).toEqual('node2');
});
// test getMultipleSymmetricalSeries()
const promethusResultAbove = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: {
          instance: '192.168.1.1:9100',
        },
        values: [
          [1620727967, '10'],
          [1620731567, '11'],
          [1620735167, '12'],
          [1620738767, '13'],
          [1620742367, '14'],
        ],
      },
      {
        metric: {
          instance: '192.168.1.2:9100',
        },
        values: [
          [1620727967, '20'],
          [1620731567, '21'],
          [1620735167, '22'],
          [1620738767, '23'],
          [1620742367, '24'],
        ],
      },
    ],
  },
};
const promethusResultBelow = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: {
          instance: '192.168.1.1:9100',
        },
        values: [
          [1620727967, '15'],
          [1620731567, '16'],
          [1620735167, '17'],
          [1620738767, '18'],
          [1620742367, '19'],
        ],
      },
      {
        metric: {
          instance: '192.168.1.2:9100',
        },
        values: [
          [1620727967, '25'],
          [1620731567, '26'],
          [1620735167, '27'],
          [1620738767, '28'],
          [1620742367, '29'],
        ],
      },
    ],
  },
};
it('returns the series for multi resources symmetrical chart', () => {
  const series = getMultipleSymmetricalSeries(
    // @ts-expect-error - FIXME when you are working on it
    promethusResultAbove,
    promethusResultBelow,
    'write',
    'read',
    testNodesData,
  );
  const expectSymmetricalSeries = {
    above: [
      {
        data: [
          [1620727967, '10'],
          [1620731567, '11'],
          [1620735167, '12'],
          [1620738767, '13'],
          [1620742367, '14'],
        ],
        resource: 'node1',
        isLineDashed: false,
        metricPrefix: 'write',
        getTooltipLabel: expect.anything(),
      },
      {
        data: [
          [1620727967, '20'],
          [1620731567, '21'],
          [1620735167, '22'],
          [1620738767, '23'],
          [1620742367, '24'],
        ],
        resource: 'node2',
        isLineDashed: false,
        metricPrefix: 'write',
        getTooltipLabel: expect.anything(),
      },
    ],
    below: [
      {
        data: [
          [1620727967, '15'],
          [1620731567, '16'],
          [1620735167, '17'],
          [1620738767, '18'],
          [1620742367, '19'],
        ],
        resource: 'node1',
        isLineDashed: false,
        metricPrefix: 'read',
        getTooltipLabel: expect.anything(),
        renderTooltipSerie: expect.anything(),
      },
      {
        data: [
          [1620727967, '25'],
          [1620731567, '26'],
          [1620735167, '27'],
          [1620738767, '28'],
          [1620742367, '29'],
        ],
        resource: 'node2',
        isLineDashed: false,
        metricPrefix: 'read',
        getTooltipLabel: expect.anything(),
        renderTooltipSerie: expect.anything(),
      },
    ],
  };
  expect(series).toMatchObject(expectSymmetricalSeries);
});
it('returns the correct labels for tooltip and legend for multi resources symmetrical chart', () => {
  const series = getMultipleSymmetricalSeries(
    // @ts-expect-error - FIXME when you are working on it
    promethusResultAbove,
    promethusResultBelow,
    'write',
    'read',
    testNodesData,
  );
  // Flatten series for easier testing
  const allSeries = [...series.above, ...series.below];

  //resource: 'node1'
  expect(
    allSeries
      .find(
        (serie) => serie.resource === 'node1' && serie.metricPrefix === 'write',
      )
      .getTooltipLabel('write', 'node1'),
  ).toEqual('node1-write');
  expect(
    allSeries
      .find(
        (serie) => serie.resource === 'node1' && serie.metricPrefix === 'read',
      )
      .getTooltipLabel('read', 'node1'),
  ).toEqual('node1-read');
  //resource: 'node2'
  const node2WriteSerite = allSeries.find(
    (serie) => serie.resource === 'node2' && serie.metricPrefix === 'write',
  );
  expect(node2WriteSerite).toBeDefined();
  expect(
    allSeries
      .find(
        (serie) => serie.resource === 'node2' && serie.metricPrefix === 'write',
      )
      .getTooltipLabel('write', 'node2'),
  ).toEqual('node2-write');
  expect(
    allSeries
      .find(
        (serie) => serie.resource === 'node2' && serie.metricPrefix === 'read',
      )
      .getTooltipLabel('read', 'node2'),
  ).toEqual('node2-read');
});
// test fiterMetricValuess
it('selects the result with the expected label', () => {
  const label = {
    instance: '192.168.1.1',
  };
  const prometheusResult = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            instance: '192.168.1.1',
          },
          values: [0, '0'],
        },
        {
          metric: {
            instance: '192.168.1.2',
          },
          values: [1, '1'],
        },
      ],
    },
  };
  // @ts-expect-error - FIXME when you are working on it
  const result = fiterMetricValues(prometheusResult, label);
  expect(result).toEqual({
    metric: {
      instance: '192.168.1.1',
    },
    values: [0, '0'],
  });
});
it('selects the result with the 2 expected labels', () => {
  const label = {
    instance: '192.168.1.2',
    device: 'eth2',
  };
  const prometheusResult = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            instance: '192.168.1.1',
            device: 'eth1',
          },
          values: [0, '0'],
        },
        {
          metric: {
            instance: '192.168.1.2',
            device: 'eth2',
          },
          values: [1, '1'],
        },
      ],
    },
  };
  // @ts-expect-error - FIXME when you are working on it
  const result = fiterMetricValues(prometheusResult, label);
  expect(result).toEqual({
    metric: {
      instance: '192.168.1.2',
      device: 'eth2',
    },
    values: [1, '1'],
  });
});

// Test createSymmetricalQuantileColorSet function
describe('createSymmetricalQuantileColorSet', () => {
  const mockAboveSeries = [
    { resource: 'Q90-write', name: 'Q90-write' },
    { resource: 'Median-write', name: 'Median-write' },
    { resource: 'Q5-write', name: 'Q5-write' },
  ];

  const mockBelowSeries = [
    { resource: 'Q5-read', name: 'Q5-read' },
    { resource: 'Median-read', name: 'Median-read' },
    { resource: 'Q90-read', name: 'Q90-read' },
  ];

  it('assigns correct colors for above series', () => {
    const colorSet = createSymmetricalQuantileColorSet(mockAboveSeries, []);

    expect(colorSet['Q90-write']).toBe(lineColor3); // cyan
    expect(colorSet['Median-write']).toBe(lineColor5); // yellow
    expect(colorSet['Q5-write']).toBe(lineColor4); // blue
  });

  it('assigns correct colors for below series', () => {
    const colorSet = createSymmetricalQuantileColorSet([], mockBelowSeries);

    expect(colorSet['Q5-read']).toBe(lineColor6); // red
    expect(colorSet['Median-read']).toBe(lineColor2); // gold
    expect(colorSet['Q90-read']).toBe(lineColor7); // orange
  });

  it('assigns correct colors for both above and below series', () => {
    const colorSet = createSymmetricalQuantileColorSet(
      mockAboveSeries,
      mockBelowSeries,
    );

    // Above series colors
    expect(colorSet['Q90-write']).toBe(lineColor3); // cyan
    expect(colorSet['Median-write']).toBe(lineColor5); // yellow
    expect(colorSet['Q5-write']).toBe(lineColor4); // blue

    // Below series colors
    expect(colorSet['Q5-read']).toBe(lineColor6); // red
    expect(colorSet['Median-read']).toBe(lineColor2); // gold
    expect(colorSet['Q90-read']).toBe(lineColor7); // orange
  });

  it('handles empty series arrays', () => {
    const colorSet = createSymmetricalQuantileColorSet([], []);

    expect(colorSet).toEqual({});
  });

  it('handles series with name property instead of resource', () => {
    const aboveSeriesWithName = [
      { name: 'Q90-write' },
      { name: 'Median-write' },
      { name: 'Q5-write' },
    ];

    const colorSet = createSymmetricalQuantileColorSet(aboveSeriesWithName, []);

    expect(colorSet['Q90-write']).toBe(lineColor3); // cyan
    expect(colorSet['Median-write']).toBe(lineColor5); // yellow
    expect(colorSet['Q5-write']).toBe(lineColor4); // blue
  });

  it('handles mixed series with both resource and name properties', () => {
    const mixedAboveSeries = [
      { resource: 'Q90-write' },
      { name: 'Median-write' },
      { resource: 'Q5-write', name: 'Q5-write' },
    ];

    const colorSet = createSymmetricalQuantileColorSet(mixedAboveSeries, []);

    expect(colorSet['Q90-write']).toBe(lineColor3); // cyan
    expect(colorSet['Median-write']).toBe(lineColor5); // yellow
    expect(colorSet['Q5-write']).toBe(lineColor4); // blue
  });
});

// Test createColorSet function
describe('createColorSet', () => {
  it('creates color mapping for series names', () => {
    const seriesNames = ['series1', 'series2', 'series3'];
    const colorSet = createColorSet(seriesNames);

    expect(colorSet['series1']).toBe(CHART_COLOR_VALUES[0]);
    expect(colorSet['series2']).toBe(CHART_COLOR_VALUES[1]);
    expect(colorSet['series3']).toBe(CHART_COLOR_VALUES[2]);
  });

  it('handles empty series array', () => {
    const colorSet = createColorSet([]);
    expect(colorSet).toEqual({});
  });
});

// Test getTimeFormatForInterval function
describe('getTimeFormatForInterval', () => {
  it('returns day-month-abbreviated-hour-minute for 7 days interval', () => {
    const result = getTimeFormatForInterval(SAMPLE_FREQUENCY_LAST_SEVEN_DAYS);
    expect(result).toBe('day-month-abbreviated-hour-minute');
  });

  it('returns day-month-abbreviated-hour-minute for 24 hours interval', () => {
    const result = getTimeFormatForInterval(
      SAMPLE_FREQUENCY_LAST_TWENTY_FOUR_HOURS,
    );
    expect(result).toBe('day-month-abbreviated-hour-minute');
  });

  it('returns day-month-abbreviated-hour-minute-second for 1 hour interval', () => {
    const result = getTimeFormatForInterval(SAMPLE_FREQUENCY_LAST_ONE_HOUR);
    expect(result).toBe('day-month-abbreviated-hour-minute-second');
  });

  it('returns long-date-without-weekday for unknown interval', () => {
    const result = getTimeFormatForInterval(999);
    expect(result).toBe('long-date-without-weekday');
  });
});
