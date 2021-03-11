//@flow
import {
  getAccessiblePathsFromOptions,
  getUserGroups,
  isEntryAccessibleByTheUser,
  isPathAccessible,
  normalizePath,
} from './permissionUtils';
import { type Options } from '../index';

describe('permission utils - isEntryAccessibleByTheUser', () => {
  it('should return true if the user has explicit access', () => {
    //E
    const hasAccess = isEntryAccessibleByTheUser(
      ['http://fake/path', { en: 'Path', fr: 'Path', groups: ['group'] }],
      ['group'],
    );
    //V
    expect(hasAccess).toBe(true);
  });
  it('should return true if the path is public', () => {
    //E
    const hasAccess = isEntryAccessibleByTheUser(
      ['http://fake/path', { en: 'Path', fr: 'Path' }],
      ['group'],
    );
    //V
    expect(hasAccess).toBe(true);
  });
  it('should return false if the user is not part of the expected group', () => {
    //E
    const hasAccess = isEntryAccessibleByTheUser(
      ['http://fake/path', { en: 'Path', fr: 'Path', groups: ['group'] }],
      [],
    );
    //V
    expect(hasAccess).toBe(false);
  });
});

describe('permission utils - getAccessiblePathsFromOptions', () => {
  it('should return accessible paths', () => {
    //S
    const options: Options = {
      main: {
        'http://fake/publicPath': { en: 'publicPath', fr: 'publicPath' },
        'http://fake/groupPath': {
          en: 'groupPath',
          fr: 'groupPath',
          groups: ['group'],
        },
        'http://fake/groupAPath': {
          en: 'groupAPath',
          fr: 'groupAPath',
          groups: ['groupA'],
        },
      },
      subLogin: {
        'http://fake/subLoginPublicPath': {
          en: 'publicPath',
          fr: 'publicPath',
        },
        'http://fake/subLoginGroupPath': {
          en: 'groupPath',
          fr: 'groupPath',
          groups: ['group'],
        },
        'http://fake/subLoginGroupAPath': {
          en: 'groupAPath',
          fr: 'groupAPath',
          groups: ['groupA'],
        },
      },
    };
    //E
    const accessiblePaths = getAccessiblePathsFromOptions(options, ['group']);
    //V
    expect(accessiblePaths).toEqual([
      'http://fake/publicPath',
      'http://fake/groupPath',
      'http://fake/subLoginPublicPath',
      'http://fake/subLoginGroupPath',
    ]);
  });
});

describe('permission utils - normalizePath', () => {
  it('should normalize path', () => {
    expect(normalizePath('http://fake/groupPath')).toEqual(
      'http://fake/groupPath',
    );
    expect(normalizePath('http://fake/path/subPath?a=test#test')).toEqual(
      'http://fake/path/subPath',
    );
  });

  it('should throw if the path is an invalid url', () => {
    expect(() => normalizePath('invalidUrl')).toThrow();
  });
});

describe('permission utils - isPathAccessible', () => {
  it('should return true when the path is accessible', () => {
    //E
    const isAccessible = isPathAccessible('http://fake/path?hello=world', [
      'http://fake/path?hello=test',
    ]);
    //V
    expect(isAccessible).toBe(true);
  });
  it('should return false when the path is not accessible', () => {
    //E
    const isAccessible = isPathAccessible('http://fake/path?hello=world', [
      'http://fake/another-path?hello=test',
    ]);
    //V
    expect(isAccessible).toBe(false);
  });
});

describe('permission utils - getUserGroups', () => {
  it('should return an array of groups when defined in OIDC claims ', () => {
    //E
    const oidcGroups = ['oidcGroup'];
    const groups = getUserGroups(
      { profile: { email: 'test@test.com', groups: oidcGroups } },
      undefined,
    );
    //V
    expect(groups).toEqual(oidcGroups);
  });

  it('should return an array of groups when defined in static mapping', () => {
    //S
    const staticGroups = ['oidcGroup'];
    //E
    const groups = getUserGroups(
      { profile: { email: 'test@test.com' } },
      { 'test@test.com': staticGroups },
    );
    //V
    expect(groups).toEqual(staticGroups);
  });

  it('should return a merged array of groups when defined in OIDC claims and mapping ', () => {
    //S
    const oidcOnlyGroups = ['OIDCGroup'];
    const staticOnlyGroups = ['StaticGroup'];
    const oidcAndStaticGroups = ['group'];
    //E
    const groups = getUserGroups(
      {
        profile: {
          email: 'test@test.com',
          groups: [...oidcAndStaticGroups, ...oidcOnlyGroups],
        },
      },
      { 'test@test.com': [...oidcAndStaticGroups, ...staticOnlyGroups] },
    );
    //V
    expect(groups).toEqual([
      ...oidcAndStaticGroups,
      ...oidcOnlyGroups,
      ...staticOnlyGroups,
    ]);
  });
});
