import { coreUIAvailableThemes } from '@scality/core-ui/dist/style/theme';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useSelector } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { mockOffsetSize } from '../tests/mocks/util';
import translations_en from '../translations/en.json';
import NodePagePodsTab from './NodePagePodsTab';

const mockUseSelector = useSelector as jest.Mock;

const mockResult = (numContainerRunning: number, status = 'Running') => ({
  name: 'test-pod',
  age: '4d2h',
  namespace: 'xcore',
  status: {
    status,
    numContainer: 3,
    numContainerRunning,
  },
  log: 'test',
});

const statusHealthyRGB = 'rgb(10, 173, 166)';
const statusWarningRGB = 'rgb(248, 243, 43)';
const statusCriticalRGB = 'rgb(232, 72, 85)';

const selectors = {
  podName: () => screen.getByText('test-pod'),
  podAge: () => screen.getByText('4d2h'),
  podNamespace: () => screen.getByText('xcore'),
  podStatus: (status: string) => screen.getByText(status),
};

const CustomWrapper = ({ children }: { children?: React.ReactNode }) => {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        })
      }
    >
      <IntlProvider locale="en" messages={translations_en}>
        <ThemeProvider theme={coreUIAvailableThemes.darkRebrand}>
          {children}
        </ThemeProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
};
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('NodePagePodsTab', () => {
  beforeAll(() => {
    mockOffsetSize(400, 200);
  });
  beforeEach(() => {
    mockUseSelector.mockImplementation((selector) =>
      selector({
        config: {
          api: {
            url_grafana: 'http://mock.grafana.url',
          },
        },
      }),
    );
  });
  afterEach(() => {
    mockUseSelector.mockClear();
  });

  it('should render the pods tabs with healthy status when all containers are ready', () => {
    render(<NodePagePodsTab pods={[mockResult(3)]} />, {
      wrapper: CustomWrapper,
    });

    expect(selectors.podName()).toBeInTheDocument();
    expect(selectors.podAge()).toBeInTheDocument();
    expect(selectors.podNamespace()).toBeInTheDocument();

    const { color } = window.getComputedStyle(
      selectors.podStatus('Running (3/3)'),
    );

    expect(color).toBe(statusHealthyRGB);
  });

  it('should render the pods tabs with warning status when some containers are not ready', () => {
    render(<NodePagePodsTab pods={[mockResult(2)]} />, {
      wrapper: CustomWrapper,
    });

    expect(selectors.podName()).toBeInTheDocument();
    expect(selectors.podAge()).toBeInTheDocument();
    expect(selectors.podNamespace()).toBeInTheDocument();

    const { color } = window.getComputedStyle(
      selectors.podStatus('Running (2/3)'),
    );

    expect(color).toBe(statusWarningRGB);
  });

  it('should render the pods tabs with warning status when containers not running', () => {
    render(<NodePagePodsTab pods={[mockResult(1, 'Failed')]} />, {
      wrapper: CustomWrapper,
    });

    expect(selectors.podName()).toBeInTheDocument();
    expect(selectors.podAge()).toBeInTheDocument();
    expect(selectors.podNamespace()).toBeInTheDocument();

    const { color } = window.getComputedStyle(selectors.podStatus('Failed'));

    expect(color).toBe(statusCriticalRGB);
  });
});
