import {
  formatNodesPromRangeForChart,
  formatNodesThroughputPromRangeForChart,
} from './graphUtils';
import { fromUnixTimestampToDate } from './utils';

const testPromData = [
  {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {},
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
  },
  {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {},
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
  },
];

const testFailedData = [
  {
    status: 'error',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {},
          values: [],
        },
      ],
    },
  },
  {
    status: 'error',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {},
          values: [],
        },
      ],
    },
  },
];

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

const testThroughputData = [
  {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            instance: '192.168.1.1:9100',
          },
          values: [
            [1620727967, '0'],
            [1620731567, '1'],
            [1620735167, '2'],
            [1620738767, '3'],
            [1620742367, '4'],
          ],
        },
        {
          metric: {
            instance: '192.168.1.2:9100',
          },
          values: [
            [1620727967, '0'],
            [1620731567, '1'],
            [1620735167, '2'],
            [1620738767, '3'],
            [1620742367, '4'],
          ],
        },
      ],
    },
  },
  {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            instance: '192.168.1.1:9100',
          },
          values: [
            [1620727967, '0'],
            [1620731567, '1'],
            [1620735167, '2'],
            [1620738767, '3'],
            [1620742367, '4'],
          ],
        },
        {
          metric: {
            instance: '192.168.1.2:9100',
          },
          values: [
            [1620727967, '0'],
            [1620731567, '1'],
            [1620735167, '2'],
            [1620738767, '3'],
            [1620742367, '4'],
          ],
        },
      ],
    },
  },
];

const testFailedThroughputData = [
  {
    status: 'error',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            instance: '192.168.1.1:9100',
          },
          values: [],
        },
        {
          metric: {
            instance: '192.168.1.2:9100',
          },
          values: [],
        },
      ],
    },
  },
  {
    status: 'error',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            instance: '192.168.1.1:9100',
          },
          values: [],
        },
        {
          metric: {
            instance: '192.168.1.2:9100',
          },
          values: [],
        },
      ],
    },
  },
];

it('format data properly for "per node" chart on successful request', () => {
  const res = formatNodesPromRangeForChart(testPromData, testNodesData);
  // Check node concatenation
  expect(res.length).toEqual(10);

  // Check if process all data from each node
  const node1Items = res.filter((item) => item.type === 'node1');
  const node2Items = res.filter((item) => item.type === 'node2');
  expect(node1Items.length).toEqual(5);
  expect(node2Items.length).toEqual(5);

  // Check data formatting
  const goodFormatting = {
    date: fromUnixTimestampToDate(testPromData[0].data.result[0].values[0][0]),
    type: testNodesData[0].name,
    y: testPromData[0].data.result[0].values[0][1],
  };
  expect(res[0]).toEqual(goodFormatting);
});

it('does not process failed "per node" metrics data', () => {
  const res = formatNodesPromRangeForChart(testFailedData, testNodesData);
  expect(res.length).toEqual(0);
});

it('format data properly for "throughput" chart on successful request', () => {
  const res = formatNodesThroughputPromRangeForChart(
    testThroughputData,
    testNodesData,
  );

  // Check node concatenation
  expect(res.length).toEqual(20);

  // Check if both read and write data are processed for each node
  const node1ReadItems = res.filter((item) => item.type === 'node1-read');
  const node2ReadItems = res.filter((item) => item.type === 'node2-read');
  const node1WriteItems = res.filter((item) => item.type === 'node1-write');
  const node2WriteItems = res.filter((item) => item.type === 'node2-write');
  expect(node1ReadItems.length).toEqual(5);
  expect(node2ReadItems.length).toEqual(5);
  expect(node1WriteItems.length).toEqual(5);
  expect(node2WriteItems.length).toEqual(5);

  // Check data formatting
  const goodFormatting = {
    date: fromUnixTimestampToDate(
      testThroughputData[0].data.result[0].values[0][0],
    ),
    type: `${testNodesData[0].name}-read`,
    y: parseFloat(testThroughputData[0].data.result[0].values[0][1]),
  };
  expect(res[0]).toEqual(goodFormatting);

  // Check read data are converted to negative values
  const readRegex = new RegExp('-read$');
  const readItems = res.filter((item) => readRegex.test(item.type));
  expect(readItems.length).toEqual(10);
  const testNeg = readItems.filter((item) => item.y <= 0);
  expect(testNeg.length).toEqual(10);
});

it('does not process failed "throughput" metrics data', () => {
  const res = formatNodesThroughputPromRangeForChart(
    testFailedThroughputData,
    testNodesData,
  );
  expect(res).toBeNull();
});
