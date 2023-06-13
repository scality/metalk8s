import fs from 'fs';
import path from 'path';
import {
  act,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';
import { debug } from 'jest-preview';
import { Route, Switch } from 'react-router';

import ConfigureAlerting from './ConfigureAlerting';
import {
  FAKE_CONTROL_PLANE_IP,
  render,
  waitForLoadingToFinish,
} from '../components/__TEST__/util';

const saltLoginRequest = jest.fn();
const patchAlertmanagerConfig = jest.fn();

jest.setTimeout(30000);

const server = setupServer(
  rest.get(
    `http://${FAKE_CONTROL_PLANE_IP}:8443/shell/config.json`,
    (req, res, ctx) => {
      const result = {
        navbar: {
          main: [
            {
              kind: 'artesca-base-ui',
              view: 'overview',
            },
            {
              kind: 'artesca-base-ui',
              view: 'identity',
            },
            {
              kind: 'metalk8s-ui',
              view: 'platform',
            },
            {
              kind: 'xcore-ui',
              view: 'storageservices',
            },
            {
              kind: 'metalk8s-ui',
              view: 'alerts',
            },
          ],
          subLogin: [
            {
              kind: 'artesca-base-ui',
              view: 'certificates',
            },
            {
              kind: 'artesca-base-ui',
              view: 'about',
            },
            {
              kind: 'artesca-base-ui',
              view: 'license',
              icon: 'fas fa-file-invoice',
            },
          ],
        },
        discoveryUrl: '/shell/deployed-ui-apps.json',
        productName: 'MetalK8s',
      };
      // return success status
      return res(ctx.json(result));
    },
  ),
  rest.get(
    `http://${FAKE_CONTROL_PLANE_IP}:8443/api/alertmanager/api/v2/alerts`,
    (req, res, ctx) => {
      const result = [];
      // return success status
      return res(ctx.json(result));
    },
  ),

  rest.get(
    `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
    (req, res, ctx) => {
      const test = {
        kind: 'ConfigMap',
        apiVersion: 'v1',
        metadata: {
          name: 'metalk8s-alertmanager-config',
          namespace: 'metalk8s-monitoring',
          uid: 'xxx-yyy-zzz',
          resourceVersion: '0',
          creationTimestamp: '2023-03-23T16:45:41Z',
          labels: {},
          managedFields: [],
        },
        data: {
          'config.yaml':
            'apiVersion: addons.metalk8s.scality.com\nkind: AlertmanagerConfig\nspec:\n  notification:\n    config:\n',
        },
      };
      return res(ctx.json(test));
    },
  ),

  rest.get(
    `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/pods/alertmanager-prometheus-operator-alertmanager-0/log`,
    (req, res, ctx) => {
      const logs = '';
      return res(ctx.text(logs));
    },
  ),

  rest.get('http://localhost/brand/email.html', (req, res, ctx) => {
    const result = 'TEMPLATE DELETED';
    return res(ctx.text(result));
  }),

  rest.get('http://localhost/logo.svg', (req, res, ctx) => {
    const result = 'LOGO';
    return res(ctx.text(result));
  }),

  rest.patch(
    'http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config',
    (req, res, ctx) => {
      const body = req.body;
      patchAlertmanagerConfig(body);
      return res(ctx.json({}));
    },
  ),

  rest.post('http://localhost/api/salt/login', (req, res, ctx) => {
    const body = req.body;
    saltLoginRequest(body);

    return res(
      ctx.json({
        return: [
          {
            token: 'xxx-yyy-zzzz-token',
          },
        ],
      }),
    );
  }),

  rest.post('http://localhost/api/salt', (req, res, ctx) => {
    return res(ctx.json({}));
  }),

  rest.get('http://localhost/api/kubernetes/api/v1/nodes', (req, res, ctx) => {
    const result = {
      items: [
        {
          metadata: {
            name: 'node1',
            labels: {
              'metalk8s.scality.com/version': '125.0.0',
            },
          },
        },
      ],
    };
    return res(ctx.json(result));
  }),

  rest.get(
    'http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/pods',
    (req, res, ctx) => {
      const result = {
        items: [
          {
            metadata: {
              name: 'pods',
            },
          },
        ],
      };
      return res(ctx.json(result));
    },
  ),

  rest.post(
    'http://localhost/api/alertmanager/api/v1/alerts',
    (req, res, ctx) => {
      const result = {
        status: 'success',
      };
      return res(ctx.json(result));
    },
  ),
);

const commonSetup = async () => {
  render(
    <Switch>
      <Route exact path="/alerts">
        <div>Redirected Alert Page</div>
      </Route>
      <Route exact path="/">
        <ConfigureAlerting />
      </Route>
    </Switch>,
  );

  await waitForLoadingToFinish();
};

describe('<ConfigureAlerting />', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });
  beforeEach(() => {
    saltLoginRequest.mockClear();
    patchAlertmanagerConfig.mockClear();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  const selectors = {
    enableConfiguration: () =>
      screen.getByLabelText(/Enable Email Notification Configuration \*/i),
    host: () => screen.getByLabelText(/SMTP Host \*/i),
    port: () => screen.getByLabelText(/SMTP Port \*/i),
    enableTls: () => screen.getByLabelText(/Enable SMTP Over TLS/i),
    authSelect: {
      label: () => screen.getByLabelText(/SMTP Auth \*/i).parentElement,
      authClick: () => screen.getByLabelText(/SMTP Auth \*/i),
      optionNoAuth: () =>
        screen.getByRole('option', { name: /NO AUTHENTICATION/i }),
      optionLogin: () => screen.getByRole('option', { name: /LOGIN/i }),
      optionCramMd5: () => screen.getByRole('option', { name: /CRAM-MD5/i }),
      optionPlain: () => screen.getByRole('option', { name: /PLAIN/i }),
    },
    username: () => screen.getByLabelText(/Username \*/i),
    password: () => screen.getByLabelText(/Password \*/i),
    identity: () => screen.getByLabelText(/identity \*/i),
    secret: () => screen.getByLabelText(/secret \*/i),
    sender: () => screen.getByLabelText(/Sender Email Address \*/i),
    recipient: () => screen.getByLabelText(/Recipient Email Addresses \*/i),
    receiveResolved: () =>
      screen.getByLabelText(/Enable Receive Resolved Alerts/i),
    sendTestingEmailButton: () =>
      screen.getByRole('button', { name: /send a test email/i }),
    cancelButton: () => screen.getByRole('button', { name: /cancel/i }),
    saveButton: () => screen.getByRole('button', { name: /save|saving.../i }),
  };

  it('render default value when the form is not defined', async () => {
    render(<ConfigureAlerting />);
    await waitForLoadingToFinish();

    await act(async () => {
      await userEvent.click(selectors.authSelect.authClick());
    });

    expect(selectors.enableConfiguration()).not.toBeChecked();
    expect(selectors.host()).toHaveValue('');
    expect(selectors.port()).toHaveValue(25);
    expect(selectors.enableTls()).not.toBeChecked();

    expect(selectors.authSelect.label()).toHaveTextContent('NO AUTHENTICATION');
    expect(selectors.authSelect.optionNoAuth()).toBeInTheDocument();
    expect(selectors.authSelect.optionLogin()).toBeInTheDocument();
    expect(selectors.authSelect.optionCramMd5()).toBeInTheDocument();
    expect(selectors.authSelect.optionPlain()).toBeInTheDocument();

    expect(selectors.sender()).toHaveValue('');
    expect(selectors.recipient()).toHaveValue('');
    expect(selectors.receiveResolved()).not.toBeChecked();

    expect(selectors.sendTestingEmailButton()).toBeEnabled();
    expect(selectors.cancelButton()).toBeEnabled();
    expect(selectors.saveButton()).toBeEnabled();

    await act(async () => {
      await userEvent.click(selectors.authSelect.optionLogin());
    });

    expect(selectors.authSelect.label()).toHaveTextContent('LOGIN');
    expect(selectors.username()).toBeInTheDocument();
    expect(selectors.password()).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionCramMd5());
    });

    expect(selectors.authSelect.label()).toHaveTextContent('CRAM-MD5');
    expect(selectors.username()).toBeInTheDocument();
    expect(selectors.secret()).toBeInTheDocument();

    await act(async () => {
      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionPlain());
    });

    expect(selectors.authSelect.label()).toHaveTextContent('PLAIN');
    expect(selectors.identity()).toBeInTheDocument();
    expect(selectors.username()).toBeInTheDocument();
    expect(selectors.password()).toBeInTheDocument();
  });

  it('render form values when the form is defined (NO AUTHENTICATION)', async () => {
    const configYaml = fs.readFileSync(
      path.join(__dirname, './test-yaml/simple-noauth.yaml'),
      'utf8',
    );
    server.use(
      rest.get(
        `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
        (req, res, ctx) => {
          const test = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            metadata: {
              name: 'metalk8s-alertmanager-config',
              namespace: 'metalk8s-monitoring',
              uid: 'xxx-yyy-zzz',
              resourceVersion: '0',
              creationTimestamp: '2023-03-23T16:45:41Z',
              labels: {},
              managedFields: [],
            },
            data: { 'config.yaml': configYaml },
          };
          return res(ctx.json(test));
        },
      ),
    );
    await commonSetup();

    expect(selectors.enableConfiguration()).toBeChecked();
    expect(selectors.host()).toHaveValue('smtp4dev.default.svc.cluster.local');
    expect(selectors.port()).toHaveValue(25);
    expect(selectors.enableTls()).toBeChecked();
    expect(selectors.authSelect.label()).toHaveTextContent('NO AUTHENTICATION');

    expect(selectors.sender()).toHaveValue('admin@scality.com');
    expect(selectors.recipient()).toHaveValue(
      'Renard <renard@scality.com>, Chat <chat@scality.com>, Lapin <lapin@scality.com>',
    );
    expect(selectors.receiveResolved()).toBeChecked();
  });

  it('render form values when the form is defined (LOGIN)', async () => {
    const configYaml = fs.readFileSync(
      path.join(__dirname, './test-yaml/simple-login.yaml'),
      'utf8',
    );
    server.use(
      rest.get(
        `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
        (req, res, ctx) => {
          const test = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            metadata: {
              name: 'metalk8s-alertmanager-config',
              namespace: 'metalk8s-monitoring',
              uid: 'xxx-yyy-zzz',
              resourceVersion: '0',
              creationTimestamp: '2023-03-23T16:45:41Z',
              labels: {},
              managedFields: [],
            },
            data: { 'config.yaml': configYaml },
          };
          return res(ctx.json(test));
        },
      ),
    );
    await commonSetup();

    expect(selectors.enableConfiguration()).toBeChecked();
    expect(selectors.host()).toHaveValue('smtp4dev.default.svc.cluster.local');
    expect(selectors.port()).toHaveValue(25);
    expect(selectors.enableTls()).toBeChecked();
    expect(selectors.authSelect.label()).toHaveTextContent('LOGIN');
    expect(selectors.username()).toHaveValue('Renard');
    expect(selectors.password()).toHaveValue('Renard Password');

    expect(selectors.sender()).toHaveValue('admin@scality.com');
    expect(selectors.recipient()).toHaveValue(
      'Renard <renard@scality.com>, Chat <chat@scality.com>, Lapin <lapin@scality.com>',
    );
    expect(selectors.receiveResolved()).toBeChecked();
  });

  it('render form values when the form is defined (CRAM-MD5)', async () => {
    const configYaml = fs.readFileSync(
      path.join(__dirname, './test-yaml/simple-cram-md5.yaml'),
      'utf8',
    );
    server.use(
      rest.get(
        `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
        (req, res, ctx) => {
          const test = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            metadata: {
              name: 'metalk8s-alertmanager-config',
              namespace: 'metalk8s-monitoring',
              uid: 'xxx-yyy-zzz',
              resourceVersion: '0',
              creationTimestamp: '2023-03-23T16:45:41Z',
              labels: {},
              managedFields: [],
            },
            data: { 'config.yaml': configYaml },
          };
          return res(ctx.json(test));
        },
      ),
    );
    await commonSetup();

    expect(selectors.enableConfiguration()).toBeChecked();
    expect(selectors.host()).toHaveValue('smtp4dev.default.svc.cluster.local');
    expect(selectors.port()).toHaveValue(25);
    expect(selectors.enableTls()).toBeChecked();
    expect(selectors.authSelect.label()).toHaveTextContent('CRAM-MD5');
    expect(selectors.username()).toHaveValue('Renard');
    expect(selectors.secret()).toHaveValue('Renard Secret');

    expect(selectors.sender()).toHaveValue('admin@scality.com');
    expect(selectors.recipient()).toHaveValue(
      'Renard <renard@scality.com>, Chat <chat@scality.com>, Lapin <lapin@scality.com>',
    );
    expect(selectors.receiveResolved()).toBeChecked();
  });

  it('render form values when the form is defined (PLAIN)', async () => {
    const configYaml = fs.readFileSync(
      path.join(__dirname, './test-yaml/simple-plain.yaml'),
      'utf8',
    );
    server.use(
      rest.get(
        `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
        (req, res, ctx) => {
          const test = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            metadata: {
              name: 'metalk8s-alertmanager-config',
              namespace: 'metalk8s-monitoring',
              uid: 'xxx-yyy-zzz',
              resourceVersion: '0',
              creationTimestamp: '2023-03-23T16:45:41Z',
              labels: {},
              managedFields: [],
            },
            data: { 'config.yaml': configYaml },
          };
          return res(ctx.json(test));
        },
      ),
    );
    await commonSetup();

    expect(selectors.enableConfiguration()).toBeChecked();
    expect(selectors.host()).toHaveValue('smtp4dev.default.svc.cluster.local');
    expect(selectors.port()).toHaveValue(25);
    expect(selectors.enableTls()).toBeChecked();
    expect(selectors.authSelect.label()).toHaveTextContent('PLAIN');
    expect(selectors.identity()).toHaveValue('Renard Identity');
    expect(selectors.username()).toHaveValue('Renard');
    expect(selectors.password()).toHaveValue('Renard Password');

    expect(selectors.sender()).toHaveValue('admin@scality.com');
    expect(selectors.recipient()).toHaveValue(
      'Renard <renard@scality.com>, Chat <chat@scality.com>, Lapin <lapin@scality.com>',
    );
    expect(selectors.receiveResolved()).toBeChecked();
  });

  it('show errors on submit with not all required field', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.click(selectors.saveButton());
    });

    const errors = [
      /"smtp host" is not allowed to be empty/i,
      /"Sender Email Address" is not allowed to be empty/i,
      /"Recipient Email Addresses" is not allowed to be empty/i,
    ];

    errors.forEach((error) => {
      expect(screen.getByText(error)).toBeInTheDocument();
    });
  });

  it('should redirect to alerts page when you click on cancel button', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.click(selectors.cancelButton());
    });

    await waitFor(() => {
      return expect(
        screen.getByText(/Redirected Alert Page/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Redirected Alert Page/i)).toBeInTheDocument();
  });

  it('submit disabled form NO AUTHENTICATION', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');

      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.saveButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Saving.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes: []
      receivers:
        - name: default
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              send_resolved: false
              html: TEMPLATE DELETED
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/Redirected Alert Page/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Redirected Alert Page/i)).toBeInTheDocument();
  });

  it('submit the correct values with existing value in the form NO AUTHENTICATION', async () => {
    const configYaml = fs.readFileSync(
      path.join(__dirname, './test-yaml/simple-login.yaml'),
      'utf8',
    );
    server.use(
      rest.get(
        `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/configmaps/metalk8s-alertmanager-config`,
        (req, res, ctx) => {
          const test = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            metadata: {
              name: 'metalk8s-alertmanager-config',
              namespace: 'metalk8s-monitoring',
              uid: 'xxx-yyy-zzz',
              resourceVersion: '0',
              creationTimestamp: '2023-03-23T16:45:41Z',
              labels: {},
              managedFields: [],
            },
            data: { 'config.yaml': configYaml },
          };
          return res(ctx.json(test));
        },
      ),
    );
    await commonSetup();

    await act(async () => {
      await userEvent.clear(selectors.host());
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.clear(selectors.port());
      await userEvent.type(selectors.port(), '22');

      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionNoAuth());

      await userEvent.clear(selectors.sender());
      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');

      await userEvent.clear(selectors.recipient());
      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.saveButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Saving.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes:
          - group_by:
              - ...
            matchers:
              - severity !~ \"info|none\"
            receiver: default
            continue: true
      receivers:
        - name: default
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:22
              require_tls: true
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              send_resolved: true
              html: TEMPLATE DELETED
              tls_config:
                insecure_skip_verify: true
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/Redirected Alert Page/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Redirected Alert Page/i)).toBeInTheDocument();
  });

  it('submit the correct form values NO AUTHENTICATION', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.click(selectors.enableConfiguration());
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');

      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.saveButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Saving.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes:
          - group_by:
              - ...
            matchers:
              - severity !~ \"info|none\"
            receiver: default
            continue: true
      receivers:
        - name: default
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              send_resolved: false
              html: TEMPLATE DELETED
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/Redirected Alert Page/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Redirected Alert Page/i)).toBeInTheDocument();
  });

  it('submit the correct form values LOGIN', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionLogin());

      await userEvent.type(selectors.username(), 'Renard');
      await userEvent.type(selectors.password(), 'Renard Password');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');
      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.saveButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Saving.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes: []
      receivers:
        - name: default
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              send_resolved: false
              html: TEMPLATE DELETED
              auth_username: Renard
              auth_password: Renard Password
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/Redirected Alert Page/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Redirected Alert Page/i)).toBeInTheDocument();
  });

  it('submit the correct form values CRAM-MD5', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionCramMd5());

      await userEvent.type(selectors.username(), 'Renard');
      await userEvent.type(selectors.secret(), 'xxxyyyzzz-secret');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');
      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.saveButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Saving.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes: []
      receivers:
        - name: default
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              send_resolved: false
              html: TEMPLATE DELETED
              auth_username: Renard
              auth_secret: xxxyyyzzz-secret
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/Redirected Alert Page/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Redirected Alert Page/i)).toBeInTheDocument();
  });

  it('submit the correct form values PLAIN', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionPlain());

      await userEvent.type(selectors.identity(), 'RenardID');
      await userEvent.type(selectors.username(), 'Renard');
      await userEvent.type(selectors.password(), 'xxxyyyzzz-password');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');
      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.saveButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Saving.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes: []
      receivers:
        - name: default
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              send_resolved: false
              html: TEMPLATE DELETED
              auth_identity: RenardID
              auth_username: Renard
              auth_password: xxxyyyzzz-password
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/Redirected Alert Page/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Redirected Alert Page/i)).toBeInTheDocument();
  });

  it('test the "send a test email" button (NO AUTHENTICATION)', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');

      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.sendTestingEmailButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Sending.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes:
          - group_by:
              - ...
            group_wait: 1s
            group_interval: 1s
            matchers:
              - alertname = \"dummy_alert\"
            receiver: test-receiver-config-from-ui
      receivers:
        - name: test-receiver-config-from-ui
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              html: TEMPLATE DELETED
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/The email has been sent, please check your email/i),
      ).toBeInTheDocument();
    });
  });

  it('test the "send a test email" button (LOGIN)', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionLogin());

      await userEvent.type(selectors.username(), 'Renard');
      await userEvent.type(selectors.password(), 'Renard Password');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');
      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.sendTestingEmailButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Sending.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes:
          - group_by:
              - ...
            group_wait: 1s
            group_interval: 1s
            matchers:
              - alertname = \"dummy_alert\"
            receiver: test-receiver-config-from-ui
      receivers:
        - name: test-receiver-config-from-ui
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              html: TEMPLATE DELETED
              auth_username: Renard
              auth_password: Renard Password
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/The email has been sent, please check your email/i),
      ).toBeInTheDocument();
    });
  });

  it('test the "send a test email" button (PLAIN)', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.click(selectors.authSelect.authClick());
      await userEvent.click(selectors.authSelect.optionPlain());

      await userEvent.type(selectors.identity(), 'Renard ID');
      await userEvent.type(selectors.username(), 'Renard');
      await userEvent.type(selectors.password(), 'Renard Password');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');
      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );

      await userEvent.click(selectors.sendTestingEmailButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Sending.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes:
          - group_by:
              - ...
            group_wait: 1s
            group_interval: 1s
            matchers:
              - alertname = \"dummy_alert\"
            receiver: test-receiver-config-from-ui
      receivers:
        - name: test-receiver-config-from-ui
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              html: TEMPLATE DELETED
              auth_identity: Renard ID
              auth_username: Renard
              auth_password: Renard Password
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/The email has been sent, please check your email/i),
      ).toBeInTheDocument();
    });
  });

  it('test "send a test email" with error banner', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(
        selectors.host(),
        'smtp4dev.default.svc.cluster.local',
      );
      await userEvent.type(selectors.port(), '42');

      await userEvent.type(selectors.sender(), 'renard.admin@scality.com');

      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com',
      );
      server.use(
        rest.get(
          `http://localhost/api/kubernetes/api/v1/namespaces/metalk8s-monitoring/pods/alertmanager-prometheus-operator-alertmanager-0/log`,
          (req, res, ctx) => {
            const logs = `
    ts=2023-06-27T12:00:00.000Z caller=dispatch.go:352 level=error component=dispatcher msg="Notify for alerts failed" num_alerts=1 err="test-receiver-config-from-ui/email[0]: notify retry canceled after 7 attempts: establish connection to server: dial tcp: lookup smtp4dev.default.svc.cluster.local1 on 10.0.0.0: no such host"
    ts=2023-06-27T12:00:00.000Z caller=notify.go:732 level=warn component=dispatcher receiver=test-receiver-config-from-ui integration=email[0] msg="Notify attempt failed, will retry later" attempts=1 err="establish connection to server: dial tcp: lookup smtp4dev.default.svc.cluster.local1 on 10.0.0.0: no such host"
            `;
            return res(ctx.text(logs));
          },
        ),
      );
      await userEvent.click(selectors.sendTestingEmailButton());
    });

    await waitForElementToBeRemoved(() => {
      return screen.getByText(/Sending.../);
    });

    expect(saltLoginRequest).toHaveBeenCalledWith({
      eauth: 'kubernetes_rbac',
      username: 'oidc:renard.admin@scality.com',
      token: 'xxx-yyy-zzz-token',
    });

    const data = `apiVersion: addons.metalk8s.scality.com
kind: AlertmanagerConfig
spec:
  notification:
    config:
      route:
        routes:
          - group_by:
              - ...
            group_wait: 1s
            group_interval: 1s
            matchers:
              - alertname = \"dummy_alert\"
            receiver: test-receiver-config-from-ui
      receivers:
        - name: test-receiver-config-from-ui
          email_configs:
            - smarthost: smtp4dev.default.svc.cluster.local:2542
              require_tls: false
              from: renard.admin@scality.com
              to: user1@test.com, user2@test.com
              html: TEMPLATE DELETED
`;

    expect(patchAlertmanagerConfig).toHaveBeenCalledWith({
      data: {
        'config.yaml': data,
      },
    });
    await waitFor(() => {
      return expect(
        screen.getByText(/The email has been sent, please check your email/i),
      ).toBeInTheDocument();
    });
    await waitFor(() => {
      return expect(
        screen.getByText(
          /establish connection to server: dial tcp: lookup smtp4dev.default.svc.cluster.local1/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it('show errors on sender email address and Recipient Email Addresses fields', async () => {
    await commonSetup();

    await act(async () => {
      await userEvent.type(selectors.sender(), 'fsdjfkl');
      await userEvent.type(
        selectors.recipient(),
        'user1@test.com, user2@test.com <>',
      );
    });
    expect(
      screen.getByText(/The email address is invalid/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The email addresses are invalid/i),
    ).toBeInTheDocument();
  });
});
