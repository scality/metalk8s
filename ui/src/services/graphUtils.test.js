import {
  getMultiResourceSeriesForChart,
  getMultipleSymmetricalSeries,
  fiterMetricValues,
} from './graphUtils';

const testPromData = {
  status: 'success',
  data: {
    resultType: 'matrix',
    result: [
      {
        metric: { instance: '192.168.1.1:9100' },
        values: [
          [1620724265, '29.84965469788186'],
          [1620727865, '29.921830869711798'],
          [1620731465, '29.835760477410332'],
          [1620735065, '29.818792314356614'],
          [1620738665, '29.994621830058193'],
        ],
      },
      {
        metric: { instance: '192.168.1.2:9100' },
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
      getLegendLabel: expect.anything(),
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
      getLegendLabel: expect.anything(),
      getTooltipLabel: expect.anything(),
      isLineDashed: false,
    },
  ];
  expect(multiResourceSeries).toMatchObject(expectSeries);
});

it('returns the correct labels for tooltip and legend for multi resources chart', () => {
  const multiResourceSeries = getMultiResourceSeriesForChart(
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
    promethusResultAbove,
    promethusResultBelow,
    'write',
    'read',
    testNodesData,
  );

  const expectSymmetricalSeries = [
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
      getLegendLabel: expect.anything(),
      getTooltipLabel: expect.anything(),
    },
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
      getLegendLabel: null,
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
      getLegendLabel: expect.anything(),
      getTooltipLabel: expect.anything(),
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
      getLegendLabel: null,
      getTooltipLabel: expect.anything(),
    },
  ];

  expect(series).toMatchObject(expectSymmetricalSeries);
});

it('returns the correct labels for tooltip and legend for multi resources symmetrical chart', () => {
  const series = getMultipleSymmetricalSeries(
    promethusResultAbove,
    promethusResultBelow,
    'write',
    'read',
    testNodesData,
  );

  //resource: 'node1'
  expect(
    series
      .find(
        (serie) => serie.resource === 'node1' && serie.metricPrefix === 'write',
      )
      .getTooltipLabel('write', 'node1'),
  ).toEqual('node1-write');

  expect(
    series
      .find(
        (serie) => serie.resource === 'node1' && serie.metricPrefix === 'read',
      )
      .getTooltipLabel('read', 'node1'),
  ).toEqual('node1-read');

  //resource: 'node2'
  expect(
    series
      .find(
        (serie) => serie.resource === 'node2' && serie.metricPrefix === 'write',
      )
      .getLegendLabel('write', 'node2'),
  ).toEqual('node2');

  expect(
    series
      .find(
        (serie) => serie.resource === 'node2' && serie.metricPrefix === 'write',
      )
      .getTooltipLabel('write', 'node2'),
  ).toEqual('node2-write');

  expect(
    series
      .find(
        (serie) => serie.resource === 'node2' && serie.metricPrefix === 'write',
      )
      .getTooltipLabel('read', 'node2'),
  ).toEqual('node2-read');
});

// test fiterMetricValuess
it('selects the result with the expected label', () => {
  const label = { instance: '192.168.1.1' };
  const prometheusResult = {
    data: {
      result: [
        {
          metric: { instance: '192.168.1.1' },
          values: [0, '0'],
        },
        {
          metric: { instance: '192.168.1.2' },
          values: [1, '1'],
        },
      ],
    },
  };
  const result = fiterMetricValues(prometheusResult, label);
  expect(result).toEqual({
    metric: { instance: '192.168.1.1' },
    values: [0, '0'],
  });
});

it('selects the result with the 2 expected labels', () => {
  const label = { instance: '192.168.1.2', device: 'eth2' };
  const prometheusResult = {
    data: {
      result: [
        {
          metric: { instance: '192.168.1.1', device: 'eth1' },
          values: [0, '0'],
        },
        {
          metric: { instance: '192.168.1.2', device: 'eth2' },
          values: [1, '1'],
        },
      ],
    },
  };
  const result = fiterMetricValues(prometheusResult, label);
  expect(result).toEqual({
    metric: { instance: '192.168.1.2', device: 'eth2' },
    values: [1, '1'],
  });
});
