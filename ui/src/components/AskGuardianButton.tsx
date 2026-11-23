import { Icon } from '@scality/core-ui';
import { Button } from '@scality/core-ui/dist/next';
import { useAskAssistant } from '../hooks';
import type { Alert } from '../services/alertUtils';

/**
 * The Guardian button on an alert's row: asks the assistant to diagnose that alert.
 *
 * The prompt carries the alert's id, which getAlert takes, and its name, which the assistant's tool
 * search matches on. Everything else about the alert is the assistant's to read.
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
        ask(`Diagnose the alert ${alert.labels.alertname} (id ${alert.id})`, `alert:${alert.id}:${Date.now()}`);
      }}
    />
  );
}

/** The last column of an alert table. Add it only when Guardian is available: no column beats an empty one. */
export const askGuardianColumn = <Row,>(alertOf: (row: Row) => Alert) => ({
  Header: '',
  id: 'askGuardian',
  disableSortBy: true,
  cellStyle: {
    flex: 0.5,
    minWidth: '3rem',
    textAlign: 'center',
  },
  Cell: ({ row }: { row: { original: Row } }) => <AskGuardianButton alert={alertOf(row.original)} />,
});
