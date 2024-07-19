import type { User } from 'oidc-react';
import type { PathDescription } from '../index';
import { UserGroupsMapping } from '../../initFederation/ShellConfigProvider';
export declare const isEntryAccessibleByTheUser: ([path, pathDescription]: [string, PathDescription], userGroups: string[]) => boolean;
export declare const normalizePath: (path: string) => string;
export declare const isPathAccessible: (path: string, accessiblePaths: string[]) => boolean;
export declare const getUserGroups: (user?: User, userGroupsMapping?: UserGroupsMapping) => string[];
