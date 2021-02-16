import { render, screen } from '@testing-library/react';
import { useAuth } from 'oidc-react';
import { act } from 'react-dom/test-utils';

import StateManager from 'react-select';
import { AUTHENTICATED_EVENT } from '.';

const fakeDataChangedAfterTime = 5;
const initialUserData = {};
const changedUserData = { test: 'changed' };

jest.mock('oidc-react', () => ({
  useAuth: () => {
    const { useState } = require('react');
    const [userData, setUserData] = useState(initialUserData);

    setTimeout(() => setUserData(changedUserData), fakeDataChangedAfterTime);

    return { userData };
  },
}));

import { UserDataListener } from './UserDataListener';

describe('UserDataListener', () => {
  it('should call onAuthenticated when user data changed', () => {
    //S
    jest.useFakeTimers();
    const onAuthenticated = jest.fn();
    //E
    render(<UserDataListener onAuthenticated={onAuthenticated} />);
    //V
    expect(onAuthenticated).toHaveBeenCalledTimes(1);
    expect(onAuthenticated).toHaveBeenLastCalledWith(
      new CustomEvent(AUTHENTICATED_EVENT, { detail: initialUserData }),
    );

    act(() => {
      jest.advanceTimersByTime(fakeDataChangedAfterTime);
    });

    expect(onAuthenticated).toHaveBeenCalledTimes(2);
    expect(onAuthenticated).toHaveBeenLastCalledWith(
      new CustomEvent(AUTHENTICATED_EVENT, { detail: changedUserData }),
    );
  });
});
