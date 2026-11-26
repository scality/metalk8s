import { fireEvent, screen } from '@testing-library/react';
import type { Alert } from '../services/alertUtils';
import { render } from './__TEST__/util';
import AlertsTab from './AlertsTab';
import { AskGuardianButton } from './AskGuardianButton';

const mockAssistant = { ask: jest.fn(), isAvailable: true };
jest.mock('../hooks', () => ({
  ...jest.requireActual('../hooks'),
  useAskAssistant: () => mockAssistant,
}));

const alert = (overrides: Partial<Alert> = {}): Alert =>
  ({
    id: 'a1',
    severity: 'critical',
    description: 'Data volume /mnt/data-06 has been disabled.',
    summary: 'Data volume has been disabled',
    startsAt: '2026-11-26T15:27:21.120Z',
    endsAt: '2026-11-26T16:27:21.120Z',
    labels: { alertname: 'DataVolumeDisabled', severity: 'critical' },
    originalAlert: {},
    ...overrides,
  }) as Alert;

beforeEach(() => {
  mockAssistant.ask.mockReset();
  mockAssistant.isAvailable = true;
});

describe('AskGuardianButton', () => {
  it('asks with what the row shows, and no id', () => {
    render(<AskGuardianButton alert={alert()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ask Guardian about DataVolumeDisabled' }));

    expect(mockAssistant.ask).toHaveBeenCalledWith(
      'Diagnose the critical alert DataVolumeDisabled, active since 2026-11-26T15:27:21.120Z: ' +
        'Data volume /mnt/data-06 has been disabled.',
      expect.stringMatching(/^alert:a1:\d+$/),
    );
  });

  it('falls back to the summary, and says nothing more when there is neither', () => {
    const { rerender } = render(<AskGuardianButton alert={alert({ description: '' })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockAssistant.ask.mock.calls[0][0]).toMatch(/: Data volume has been disabled$/);

    rerender(<AskGuardianButton alert={alert({ description: '', summary: undefined })} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockAssistant.ask.mock.calls[1][0]).toBe(
      'Diagnose the critical alert DataVolumeDisabled, active since 2026-11-26T15:27:21.120Z',
    );
  });

  it('gives each click its own prompt id, so a second ask on the same alert is not dropped', () => {
    // Two clicks within the same millisecond must still differ: a clock that moves on every read.
    let tick = 0;
    const now = jest.spyOn(Date, 'now').mockImplementation(() => ++tick);
    render(<AskGuardianButton alert={alert()} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));

    const [first, second] = mockAssistant.ask.mock.calls.map(([, promptId]) => promptId);
    expect(first).toMatch(/^alert:a1:\d+$/);
    expect(second).toMatch(/^alert:a1:\d+$/);
    expect(second).not.toBe(first);
    now.mockRestore();
  });

  it('keeps the click to itself, so the row does not get selected', () => {
    const selectRow = jest.fn();
    render(
      // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: stands for the selectable row
      <div onClick={selectRow}>
        <AskGuardianButton alert={alert()} />
      </div>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(mockAssistant.ask).toHaveBeenCalled();
    expect(selectRow).not.toHaveBeenCalled();
  });
});

// Read off the headers: the table is virtualized, and a test page has no height to render rows in.
describe('the Guardian column of an alert table', () => {
  it('is added when Guardian is available', () => {
    render(<AlertsTab alerts={[alert()]} status="success" />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(5);
  });

  it('is not there at all when Guardian is not available, rather than left empty', () => {
    mockAssistant.isAvailable = false;
    render(<AlertsTab alerts={[alert()]} status="success" />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
  });
});
