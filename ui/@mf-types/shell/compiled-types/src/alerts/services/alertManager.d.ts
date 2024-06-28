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
    parents?: string[];
    selectors?: string[];
    [labelName: string]: string;
};
export declare function getAlerts(alertManagerUrl: string): Promise<import("./alertUtils").Alert[]>;
export declare const checkActiveAlertProvider: () => Promise<{
    status: 'healthy' | 'critical';
}>;
