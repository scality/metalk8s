import { sortCapacity } from './utils';

const testcases = [
  { storageCapacity: '1Ki' },
  { storageCapacity: '1Gi' },
  { storageCapacity: '100Mi' },
  { storageCapacity: '10Gi' },
  { storageCapacity: '1Mi' }
];

const testcases2 = [
  { storageCapacity: '42949670000' },
  { storageCapacity: '100Mi' },
  { storageCapacity: '250Gi' },
  { storageCapacity: '1Gi' },
  { storageCapacity: '1Mi' },
  { storageCapacity: '11111111111' },
  { storageCapacity: '10Gi' }
];

it('should sort correctly the array', () => {
  const result = sortCapacity(testcases);
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Mi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '10Gi' }
  ]);

  const result2 = sortCapacity(testcases2, 'storageCapacity');
  expect(result2).toEqual([
    { storageCapacity: '1Mi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '10Gi' },
    { storageCapacity: '11111111111' },
    { storageCapacity: '42949670000' },
    { storageCapacity: '250Gi' }
  ]);
});

it('should return an empty array if no arguments', () => {
  const result = sortCapacity();
  expect(result).toEqual([]);
});

it('should not break when the user put the wrong sortBy', () => {
  const result = sortCapacity(testcases, 'toto');
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '10Gi' },
    { storageCapacity: '1Mi' }
  ]);
});

it('should keep the original sequence when the user put the wrong sortDirection', () => {
  const result = sortCapacity(testcases, 'storageCapacity', 'toto');
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '10Gi' },
    { storageCapacity: '1Mi' }
  ]);
});

it('should not break when a item is null', () => {
  const testcases = [
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Gi' },
    { storageCapacity: '100Mi' },
    null,
    { storageCapacity: '1Mi' }
  ];

  const result = sortCapacity(testcases);
  expect(result).toEqual([
    { storageCapacity: '1Ki' },
    { storageCapacity: '1Mi' },
    { storageCapacity: '100Mi' },
    { storageCapacity: '1Gi' },
    null
  ]);
});

it('test the sort with a custom sortBy', () => {
  const testcases = [
    { yanjin: '1Ki' },
    { yanjin: '1Gi' },
    { yanjin: '100Mi' },
    { yanjin: '1Mi' }
  ];

  const result = sortCapacity(testcases, 'yanjin');
  expect(result).toEqual([
    { yanjin: '1Ki' },
    { yanjin: '1Mi' },
    { yanjin: '100Mi' },
    { yanjin: '1Gi' }
  ]);
});
