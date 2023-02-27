import type { User } from 'oidc-react';
import type { Options, PathDescription, UserGroupsMapping } from '../index';
export const isEntryAccessibleByTheUser = (
  [path, pathDescription]: [string, PathDescription],
  userGroups: string[],
): boolean => {
  return (
    pathDescription.groups?.some((group) => userGroups.includes(group)) ?? true
  );
};
export const getAccessiblePathsFromOptions = (
  options: Options,
  userGroups: string[],
): string[] => {
  return [...Object.entries(options.main), ...Object.entries(options.subLogin)] //$FlowIssue - flow typing for Object.entries incorrectly typing values as [string, mixed] instead of [string, PathDescription]
    .filter((entry: [string, PathDescription]) =>
      isEntryAccessibleByTheUser(entry, userGroups),
    )
    .map(([path]) => path);
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