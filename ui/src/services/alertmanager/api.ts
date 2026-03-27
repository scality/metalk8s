export type PrometheusAlert = {
  annotations: Record<string, string>;
  receivers: {
    name: string;
  }[];
  fingerprint: string;
  startsAt: string;
  updatedAt: string;
  endsAt: string;
  status: {
    state: 'unprocessed' | 'active' | 'suppressed';
    silencedBy: string[];
    inhibitedBy: string[];
  };
  labels: Record<string, string>;
  generatorURL: string;
};
export type AlertLabels = {
  // @ts-expect-error - FIXME when you are working on it
  selectors?: string[];
  [labelName: string]: string;
};
