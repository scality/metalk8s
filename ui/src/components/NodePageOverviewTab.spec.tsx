import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { mockOffsetSize } from '../tests/mocks/util';
import NodePageOverviewTab from './NodePageOverviewTab';
import { render, metalK8sConfig } from './__TEST__/util';

const SUT = jest.fn();

const mockProps = {
  nodeName: 'mock-node',
  nodeTableData: [
    {
      id: 'mock-id',
      name: {
        name: 'mock-node',
        displayName: 'mock-display-name',
        controlPlaneIP: '',
        workloadPlaneIP: '',
      },
      status: {
        status: 'ready',
        conditions: [],
        statusTextColor: '#0AADA6',
        computedStatus: ['ready'],
      },
      roles: 'bootstrap',
      health: {
        health: 'healthy',
        totalAlertsCounter: 0,
        criticalAlertsCounter: 0,
        warningAlertsCounter: 0,
      },
    },
  ],
  nodes: [],
  pods: [],
  volumes: [],
};

const server = setupServer(
  rest.patch(
    `http://localhost/api/kubernetes/api/v1/nodes/${mockProps.nodeName}`,
    (req, res, ctx) => {
      SUT(req.body);
      return res(ctx.status(200), ctx.json({}));
    },
  ),
);

describe('NodePageOverviewTab', () => {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn',
    });
    mockOffsetSize(200, 100);
  });

  afterAll(() => {
    server.close();
  });

  it('should display node page overview', () => {
    render(<NodePageOverviewTab {...mockProps} />);

    expect(screen.getByText('mock-id')).toBeInTheDocument();
    expect(screen.getByText('mock-node')).toBeInTheDocument();
    expect(screen.getByText('mock-display-name')).toBeInTheDocument();
  });

  it('should modify display name', async () => {
    const props = {
      nodeName: 'mock-node',
      nodeTableData: [
        {
          id: 'mock-id',
          name: {
            name: 'mock-node',
            controlPlaneIP: '',
            workloadPlaneIP: '',
          },
          status: {
            status: 'ready',
            conditions: [],
            statusTextColor: '#0AADA6',
            computedStatus: ['ready'],
          },
          roles: 'bootstrap',
          health: {
            health: 'healthy',
            totalAlertsCounter: 0,
            criticalAlertsCounter: 0,
            warningAlertsCounter: 0,
          },
        },
      ],
      nodes: [],
      pods: [],
      volumeS: [],
    };

    const NEW_DISPLAY_NAME = 'new-display-name';

    render(<NodePageOverviewTab {...props} />);

    await userEvent.tab();
    await userEvent.keyboard('{enter}');
    await userEvent.type(document.activeElement, NEW_DISPLAY_NAME);
    await userEvent.keyboard('{enter}');

    expect(SUT).toHaveBeenCalledWith({
      metadata: {
        labels: {
          'metalk8s.scality.com/name': `${props.nodeName}${NEW_DISPLAY_NAME}`,
        },
      },
    });
  });

  it('should display name even if displayName is not empty', async () => {
    const testProps = {
      nodeName: 'mock-node',
      nodeTableData: [
        {
          id: 'mock-id',
          name: {
            name: 'mock-node',
            displayName: '',
            controlPlaneIP: '',
            workloadPlaneIP: '',
          },
          status: {
            status: 'ready',
            conditions: [],
            statusTextColor: '#0AADA6',
            computedStatus: ['ready'],
          },
          roles: 'bootstrap',
          health: {
            health: 'healthy',
            totalAlertsCounter: 0,
            criticalAlertsCounter: 0,
            warningAlertsCounter: 0,
          },
        },
      ],
      nodes: [],
      pods: [],
      volumes: [],
    };

    render(<NodePageOverviewTab {...testProps} />);

    const inputs = await screen.findAllByText(testProps.nodeName);

    expect(inputs.length).toBe(2);
  });

  it('should not be able to modify display name when feature is disabled', async () => {
    const props = {
      nodeName: 'mock-node',
      nodeTableData: [
        {
          id: 'mock-id',
          name: {
            name: 'mock-node',
            controlPlaneIP: '',
            workloadPlaneIP: '',
          },
          status: {
            status: 'ready',
            conditions: [],
            statusTextColor: '#0AADA6',
            computedStatus: ['ready'],
          },
          roles: 'bootstrap',
          health: {
            health: 'healthy',
            totalAlertsCounter: 0,
            criticalAlertsCounter: 0,
            warningAlertsCounter: 0,
          },
        },
      ],
      nodes: [],
      pods: [],
      volumeS: [],
    };

    render(<NodePageOverviewTab {...props} />, {}, [
      '/',
      { ...metalK8sConfig, flags: [] },
    ]);

    expect(screen.queryAllByText('Display Name')).toHaveLength(0);
  });
});
