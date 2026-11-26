import { Icon } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import type { CSSProperties } from 'react';
import { useAskAssistant } from '../hooks';
import type { Alert } from '../services/alertUtils';

/**
 * The Guardian button on an alert's row: asks the assistant to diagnose that alert.
 *
 * The question says what the row shows — severity, name, start and description — and no id, which
 * means nothing to the user. The assistant finds the alert in getAlerts by those same fields, which
 * that tool returns as the row does. Everything else about the alert is the assistant's to read.
 *
 * The table renders it only when Guardian is available (useAskAssistant's isAvailable), so it does
 * not check again here.
 */
export function AskGuardianButton({ alert }: { alert: Alert }) {
  const { ask } = useAskAssistant();
  return (
    <Button
      size="inline"
      variant="secondary"
      icon={<Icon name="HandSparkles" />}
      tooltip={{ overlay: 'Ask Guardian' }}
      aria-label={`Ask Guardian about ${alert.labels.alertname}`}
      onClick={(event) => {
        // The row is selectable: the click is the button's, not the row's.
        event.stopPropagation();
        // The id only has to be stable across the shell's retries of ONE ask: the assistant drops
        // a repeat of an id it has already seen, so a fixed id would silently swallow the second
        // click on the same alert.
        const description = alert.description || alert.summary;
        ask(
          `Diagnose the ${alert.severity} alert ${alert.labels.alertname}, active since ${alert.startsAt}` +
            (description ? `: ${description}` : ''),
          `alert:${alert.id}:${Date.now()}`,
        );
      }}
    />
  );
}

/** The last column of an alert table. Add it only when Guardian is available: no column beats an empty one. */
export const askGuardianColumn = <Row,>(alertOf: (row: Row) => Alert, cellStyle: CSSProperties = {}) => ({
  Header: '',
  id: 'askGuardian',
  disableSortBy: true,
  cellStyle: {
    flex: 0.5,
    minWidth: '3rem',
    textAlign: 'center',
    order: 1,
    ...cellStyle,
  },
  Cell: ({ row }: { row: { original: Row } }) => <AskGuardianButton alert={alertOf(row.original)} />,
});
