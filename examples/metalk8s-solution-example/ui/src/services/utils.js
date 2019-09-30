import { createSelector } from 'reselect';
import { sortBy as sortByArray } from 'lodash';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import semver from 'semver';

export const sortSelector = createSelector(
  (list, sortBy, sortDirection) => {
    const sortedList = sortByArray(list, [
      item => {
        return typeof item[sortBy] === 'string'
          ? item[sortBy].toLowerCase()
          : item[sortBy];
      }
    ]);

    if (sortDirection === 'DESC') {
      sortedList.reverse();
    }
    return sortedList;
  },
  list => list
);

export const useRefreshEffect = (refreshAction, stopRefreshAction) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(refreshAction());
    return () => {
      dispatch(stopRefreshAction());
    };
  }, [dispatch, refreshAction, stopRefreshAction]);
};

/* Check if a version is supported by comparaing it to the 'environmentVersion'
   Here we decide that all the  "preminor of 1" versions are allowed
   Example :
   const versions = [
              { version: '1.1.4-prod' },
              { version: '1.2.0' },
              { version: '0.1.5' },
              { version: '1.0.5' },
              { version: '1.0.2-dev' }];

    Results: versions.filter(isVersionSupported('1.1.4')) === [
              { version: '1.1.4-prod' },
              { version: '1.0.5' },
              { version: '1.0.2-dev' }

    ]
*/
export const isVersionSupported = environmentVersion => item => {
  if (environmentVersion) {
    const environmentVersionMajor = semver.major(environmentVersion);
    const environmentVersionMinor = semver.minor(environmentVersion);
    const environmentVersionPatch = semver.patch(environmentVersion);

    const parsedEnvironmentVersion = `${environmentVersionMajor}.${environmentVersionMinor}.${environmentVersionPatch}`;
    const minimunSupportedVersion = `${environmentVersionMajor}.${
      environmentVersionMinor > 1 ? environmentVersionMinor - 1 : 0
    }.0`;

    return (
      semver.gte(item.version, minimunSupportedVersion) &&
      semver.lte(item.version, parsedEnvironmentVersion)
    );
  } else {
    return true;
  }
};
