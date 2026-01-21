import type { Serie } from '@scality/core-ui/dist/next';
import { renderHook } from '@testing-library/react-hooks';
import { useChartLegendRegistration } from './useChartLegendRegistration';

// Mock the useChartLegend hook
const mockRegister = jest.fn();
jest.mock('@scality/core-ui/dist/next', () => ({
  useChartLegend: () => ({
    register: mockRegister,
  }),
}));

describe('useChartLegendRegistration', () => {
  beforeEach(() => {
    mockRegister.mockClear();
  });

  describe('Non-symmetrical series', () => {
    it('should register chart with series names when series is provided', () => {
      const mockSeries: Serie[] = [
        { resource: 'cpu-usage', data: [], getTooltipLabel: () => 'CPU Usage' },
        {
          resource: 'memory-usage',
          data: [],
          getTooltipLabel: () => 'Memory Usage',
        },
      ];

      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'test-chart',
          series: mockSeries,
          isSymmetrical: false,
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('test-chart', ['cpu-usage', 'memory-usage']);
    });

    it('should register chart with empty array when series is empty', () => {
      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'test-chart',
          series: [],
          isSymmetrical: false,
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('test-chart', []);
    });

    it('should not register when series is null', () => {
      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'test-chart',
          series: null,
          isSymmetrical: false,
        }),
      );

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should include additional names when provided', () => {
      const mockSeries: Serie[] = [{ resource: 'cpu-usage', data: [], getTooltipLabel: () => 'CPU Usage' }];

      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'test-chart',
          series: mockSeries,
          isSymmetrical: false,
          additionalNames: ['custom-metric', 'another-metric'],
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('test-chart', ['cpu-usage', 'custom-metric', 'another-metric']);
    });
  });

  describe('Symmetrical series', () => {
    it('should register chart with above and below series names', () => {
      const mockSymmetricalSeries = {
        above: [
          {
            resource: 'network-in',
            data: [],
            getTooltipLabel: () => 'Network In',
          },
          {
            resource: 'disk-read',
            data: [],
            getTooltipLabel: () => 'Disk Read',
          },
        ],
        below: [
          {
            resource: 'network-out',
            data: [],
            getTooltipLabel: () => 'Network Out',
          },
          {
            resource: 'disk-write',
            data: [],
            getTooltipLabel: () => 'Disk Write',
          },
        ],
      };

      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'symmetrical-chart',
          series: mockSymmetricalSeries,
          isSymmetrical: true,
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('symmetrical-chart', [
        'network-in',
        'disk-read',
        'network-out',
        'disk-write',
      ]);
    });

    it('should register chart with only above series when below is empty', () => {
      const mockSymmetricalSeries = {
        above: [
          {
            resource: 'network-in',
            data: [],
            getTooltipLabel: () => 'Network In',
          },
        ],
        below: [],
      };

      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'symmetrical-chart',
          series: mockSymmetricalSeries,
          isSymmetrical: true,
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('symmetrical-chart', ['network-in']);
    });

    it('should register chart with only below series when above is empty', () => {
      const mockSymmetricalSeries = {
        above: [],
        below: [
          {
            resource: 'network-out',
            data: [],
            getTooltipLabel: () => 'Network Out',
          },
        ],
      };

      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'symmetrical-chart',
          series: mockSymmetricalSeries,
          isSymmetrical: true,
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('symmetrical-chart', ['network-out']);
    });

    it('should not register when both above and below are empty', () => {
      const mockSymmetricalSeries = {
        above: [],
        below: [],
      };

      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'symmetrical-chart',
          series: mockSymmetricalSeries,
          isSymmetrical: true,
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('symmetrical-chart', []);
    });

    it('should not register when series is null', () => {
      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'symmetrical-chart',
          series: null,
          isSymmetrical: true,
        }),
      );

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('should include additional names with symmetrical series', () => {
      const mockSymmetricalSeries = {
        above: [
          {
            resource: 'network-in',
            data: [],
            getTooltipLabel: () => 'Network In',
          },
        ],
        below: [
          {
            resource: 'network-out',
            data: [],
            getTooltipLabel: () => 'Network Out',
          },
        ],
      };

      renderHook(() =>
        useChartLegendRegistration({
          chartId: 'symmetrical-chart',
          series: mockSymmetricalSeries,
          isSymmetrical: true,
          additionalNames: ['total-bandwidth'],
        }),
      );

      expect(mockRegister).toHaveBeenCalledWith('symmetrical-chart', ['network-in', 'network-out', 'total-bandwidth']);
    });
  });

  describe('Effect dependencies', () => {
    it('should re-register when chartId changes', () => {
      const mockSeries: Serie[] = [{ resource: 'cpu-usage', data: [], getTooltipLabel: () => 'CPU Usage' }];

      const { rerender } = renderHook(
        ({ chartId }) =>
          useChartLegendRegistration({
            chartId,
            series: mockSeries,
            isSymmetrical: false,
          }),
        { initialProps: { chartId: 'chart-1' } },
      );

      expect(mockRegister).toHaveBeenCalledWith('chart-1', ['cpu-usage']);

      rerender({ chartId: 'chart-2' });

      expect(mockRegister).toHaveBeenCalledWith('chart-2', ['cpu-usage']);
      expect(mockRegister).toHaveBeenCalledTimes(2);
    });

    it('should re-register when series changes', () => {
      const initialSeries: Serie[] = [{ resource: 'cpu-usage', data: [], getTooltipLabel: () => 'CPU Usage' }];
      const updatedSeries: Serie[] = [
        { resource: 'cpu-usage', data: [], getTooltipLabel: () => 'CPU Usage' },
        {
          resource: 'memory-usage',
          data: [],
          getTooltipLabel: () => 'Memory Usage',
        },
      ];

      const { rerender } = renderHook(
        ({ series }) =>
          useChartLegendRegistration({
            chartId: 'test-chart',
            series,
            isSymmetrical: false,
          }),
        { initialProps: { series: initialSeries } },
      );

      expect(mockRegister).toHaveBeenCalledWith('test-chart', ['cpu-usage']);

      rerender({ series: updatedSeries });

      expect(mockRegister).toHaveBeenCalledWith('test-chart', ['cpu-usage', 'memory-usage']);
      expect(mockRegister).toHaveBeenCalledTimes(2);
    });

    it('should re-register when additionalNames changes', () => {
      const mockSeries: Serie[] = [{ resource: 'cpu-usage', data: [], getTooltipLabel: () => 'CPU Usage' }];

      const { rerender } = renderHook(
        ({ additionalNames }) =>
          useChartLegendRegistration({
            chartId: 'test-chart',
            series: mockSeries,
            isSymmetrical: false,
            additionalNames,
          }),
        { initialProps: { additionalNames: ['metric-1'] } },
      );

      expect(mockRegister).toHaveBeenCalledWith('test-chart', ['cpu-usage', 'metric-1']);

      rerender({ additionalNames: ['metric-1', 'metric-2'] });

      expect(mockRegister).toHaveBeenCalledWith('test-chart', ['cpu-usage', 'metric-1', 'metric-2']);
      expect(mockRegister).toHaveBeenCalledTimes(2);
    });
  });
});
