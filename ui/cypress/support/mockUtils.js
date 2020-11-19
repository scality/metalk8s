// Prometheus queries

export const EMPTY_QUERY_RANGE_RESULT = {
  status: 'success',
  data: { resultType: 'matrix', result: [] },
};

export const makeQueryRangeResult = ({ metric, values }) => ({
  status: 'success',
  data: { resultType: 'matrix', result: [{ metric, values }] },
});

export const genValues = ({ start, end, step }) => {
  const startTime = Math.floor(start.getTime() / 1000);
  const span = Math.floor(end.getTime() / 1000) - startTime;
  return Array.from({ length: Math.ceil(span / step) }, (_, idx) => [
    startTime + idx * step,
    '42.123',
  ]);
};
