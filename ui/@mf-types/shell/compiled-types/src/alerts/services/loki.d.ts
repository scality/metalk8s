import type { Alert } from './alertUtils';
export type StreamValue = {
    stream: Record<string, string>;
    values: [string, string][];
}[];
export declare function getLast7DaysAlerts(lokiUrl: string): Promise<Alert[]>;
export declare function getAlertsLoki(lokiUrl: string, start: string, end: string): Promise<Alert[]>;
export declare function isLokiReady(lokiUrl: string): Promise<boolean>;
