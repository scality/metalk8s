import type { InMemoryLogRecordExporter } from '@opentelemetry/sdk-logs';
import { RoutePatternProvider, Routes } from '@scality/core-ui/dist/components/routes/Routes.component';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter, type NavigateFunction, Route, useNavigate } from 'react-router';
import { PAGE_VIEW_LOGS_URL, PageViewTracker } from './PageViewTracker';

jest.mock('@opentelemetry/exporter-logs-otlp-http', () => {
  const { InMemoryLogRecordExporter } = jest.requireActual('@opentelemetry/sdk-logs');
  return { OTLPLogExporter: jest.fn(() => new InMemoryLogRecordExporter()) };
});
const { OTLPLogExporter } = jest.requireMock('@opentelemetry/exporter-logs-otlp-http');
const latestExporter = (): InMemoryLogRecordExporter => OTLPLogExporter.mock.results.at(-1).value;

let navigate: NavigateFunction;
const CaptureNavigate = () => {
  navigate = useNavigate();
  return null;
};

const hidePage = () => {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('PageViewTracker', () => {
  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('emits one ui.page_view record per route pattern change, with only url.template', async () => {
    render(
      <MemoryRouter initialEntries={['/nodes?sort=name']}>
        <RoutePatternProvider>
          <CaptureNavigate />
          <PageViewTracker />
          <Routes>
            <Route path="/nodes" element={null} />
            <Route path="/nodes/:name/*" element={null} />
          </Routes>
        </RoutePatternProvider>
      </MemoryRouter>,
    );

    await act(async () => navigate('/nodes/node-1/overview'));
    await act(async () => navigate('/nodes/node-2/overview'));
    act(hidePage);

    await waitFor(() => expect(latestExporter().getFinishedLogRecords()).toHaveLength(2));
    const records = latestExporter().getFinishedLogRecords();
    expect(records.map((record) => record.eventName)).toEqual(['ui.page_view', 'ui.page_view']);
    expect(records.map((record) => record.attributes)).toEqual([
      { 'url.template': '/nodes' },
      { 'url.template': '/nodes/:name/*' },
    ]);
    expect(records[0].instrumentationScope.name).toBe('shell-ui');
    expect(records[0].resource.attributes).toEqual({ 'service.name': 'shell-ui' });
    expect(OTLPLogExporter).toHaveBeenCalledWith({ url: PAGE_VIEW_LOGS_URL });
  });

  it('emits nothing while no core-ui Routes reports a pattern', async () => {
    render(
      <MemoryRouter initialEntries={['/nodes']}>
        <RoutePatternProvider>
          <PageViewTracker />
        </RoutePatternProvider>
      </MemoryRouter>,
    );

    act(hidePage);
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(latestExporter().getFinishedLogRecords()).toHaveLength(0);
  });
});
