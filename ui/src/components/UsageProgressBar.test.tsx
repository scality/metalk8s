import { screen } from '@testing-library/react';
import { UsageProgressBar } from './UsageProgressBar';
import { render } from './__TEST__/util';

describe('the usage progress bar', () => {
  test('labels a known usage with its percentage', () => {
    render(<UsageProgressBar percentage={42} />);

    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  test('reads a numeric string as a usage', () => {
    render(<UsageProgressBar percentage="42" />);

    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  // ProgressBar defaults percentage to 50 for anything that is not a number, so an
  // unset usage would otherwise render a half-full bar labelled 'undefined%'.
  test('labels an unknown usage N/A instead of a half-full bar', () => {
    render(<UsageProgressBar />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    expect(screen.getByLabelText('usage not available')).toBeInTheDocument();
  });

  test('labels an unparseable usage N/A', () => {
    render(<UsageProgressBar percentage="unknown" />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
  });
});
