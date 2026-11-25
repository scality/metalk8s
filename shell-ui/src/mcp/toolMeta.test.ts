import { rememberGuardianHints, withToolMeta } from './toolMeta';

it('ignores the hints of a registration already aborted, which would never be forgotten', () => {
  const registration = new AbortController();
  registration.abort();

  rememberGuardianHints('diagnose', { entrypoint: true }, registration.signal);

  expect(withToolMeta([{ name: 'diagnose' }])).toEqual([{ name: 'diagnose' }]);
});
