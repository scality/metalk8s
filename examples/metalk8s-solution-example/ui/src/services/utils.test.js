import { isVersionSupported } from './utils';
const versions = [
  { version: '1.1.4-prod' },
  { version: '1.2.0' },
  { version: '0.1.5' },
  { version: '1.0.5' },
  { version: '1.0.2-dev' }
];

it('should return false when volume is unknown', () => {
  const result = versions.filter(isVersionSupported('1.1.4'));
  expect(result).toEqual([
    { version: '1.1.4-prod' },
    { version: '1.0.5' },
    { version: '1.0.2-dev' }
  ]);
});

it('should return false when volume is unknown', () => {
  const result = versions.filter(isVersionSupported('0.1.5'));
  expect(result).toEqual([{ version: '0.1.5' }]);
});
