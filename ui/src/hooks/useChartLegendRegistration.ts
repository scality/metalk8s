import { useEffect } from 'react';
import { useChartLegend } from '@scality/core-ui/dist/components/chartlegend/ChartLegendWrapper';
import { Serie } from '@scality/core-ui/dist/components/linetimeseriechart/linetimeseriechart.component';

interface SymmetricalSeries {
  above: Serie[];
  below: Serie[];
}
type ChartLegendRegistation = {
  chartId: string;
  additionalNames?: string[];
} & (
  | {
      series: Serie[] | null;
      isSymmetrical: false;
    }
  | {
      series: SymmetricalSeries | null;
      isSymmetrical: true;
    }
);

export const useChartLegendRegistration = ({
  chartId,
  series,
  isSymmetrical,
  additionalNames,
}: ChartLegendRegistation) => {
  const { register } = useChartLegend();

  useEffect(() => {
    if (!series) return;

    let seriesNames: Serie['resource'][] = [];

    if (isSymmetrical) {
      // Symmetrical chart (has above/below structure)
      const symmetricalSeries = series;
      if (
        symmetricalSeries.above?.length > 0 ||
        symmetricalSeries.below?.length > 0
      ) {
        const aboveNames =
          symmetricalSeries.above?.map((s) => s.resource) || [];
        const belowNames =
          symmetricalSeries.below?.map((s) => s.resource) || [];
        seriesNames = [...aboveNames, ...belowNames];
      }
    } else if (isSymmetrical === false) {
      const arrayedSeries = series;
      if (arrayedSeries && arrayedSeries.length > 0) {
        seriesNames = arrayedSeries.map((s) => s.resource);
      }
    }

    if (seriesNames.length > 0) {
      const allSeriesNames = [...seriesNames, ...additionalNames];
      register(chartId, allSeriesNames);
    }
  }, [chartId, register, series, isSymmetrical, additionalNames]);
};
