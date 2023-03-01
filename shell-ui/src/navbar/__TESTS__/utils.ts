import { screen, waitForElementToBeRemoved } from '@testing-library/react';
export const waitForLoadingToFinish = () =>
  waitForElementToBeRemoved(
    () => [
      ...screen.queryAllByLabelText(/loading/i),
      ...screen.queryAllByText(/loading/i),
    ],
    {
      timeout: 4000,
    },
  );