//@flow
import type { User } from 'oidc-react';
import type {
  Options,
  TranslationAndGroups,
  UserGroupsMapping,
} from '../index';

export const isEntryAccessibleByTheUser = (
  [path, translationAndGroup]: [string, TranslationAndGroups],
  userGroups: string[],
): boolean => {
  return (
    translationAndGroup.groups?.every((group) => userGroups.includes(group)) ??
    true
  );
};

export const getAccessiblePathsFromOptions = (
  options: Options,
  userGroups: string[],
): string[] => {
  return (
    [...Object.entries(options.main), ...Object.entries(options.subLogin)]
      //$FlowIssue - flow typing for Object.entries incorrectly typing values as [string, mixed] instead of [string, TranslationAndGroups]
      .filter((entry: [string, TranslationAndGroups]) =>
        isEntryAccessibleByTheUser(entry, userGroups),
      )
      .map(([path]) => path)
  );
};

export const normalizePath = (path: string): string => {
  const url = new URL(path);
  return url.origin + url.pathname;
};

export const isPathAccessible = (
  path: string,
  accessiblePaths: string[],
): boolean => {
  const normalizedPath = normalizePath(path);
  return accessiblePaths.some(
    (accessiblePath) => normalizePath(accessiblePath) === normalizedPath,
  );
};

export const getUserGroups = (
  user?: User,
  userGroupsMapping?: UserGroupsMapping,
): string[] => {
  const userOIDCGroups: string[] = user?.profile?.groups || [];
  const userMappedGroups = userGroupsMapping
    ? userGroupsMapping[user?.profile?.email || ''] || []
    : [];

  return Array.from(new Set([...userOIDCGroups, ...userMappedGroups]));
};
