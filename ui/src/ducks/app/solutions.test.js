import { call, put } from 'redux-saga/effects';
import {
  fetchSolutions,
  setSolutionsAction,
  createEnvironment,
  fetchEnvironments,
  setEnvironmentsAction,
  prepareEnvironment,
  updateEnvironments,
  deleteEnvironment,
} from './solutions';
import * as CoreApi from '../../services/k8s/core';
import * as SolutionsApi from '../../services/k8s/solutions';
import * as SaltApi from '../../services/salt/api';
import history from '../../history';
import { addJobAction } from './salt';

it('update the solutions list state when fetchSolutions', () => {
  const gen = fetchSolutions();
  expect(gen.next().value).toEqual(call(SolutionsApi.getSolutionsConfigMap));

  const result = {
    response: {
      _fetchResponse: {},
    },
    body: {
      apiVersion: 'v1',
      data: {
        'example-solution':
          '[{"name": "Example Solution", "archive": "/vagrant/examples/metalk8s-solution-example/_build/example-solution-0.1.0-dev.iso", "version": "0.1.0-dev", "active": true, "mountpoint": "/srv/scality/example-solution-0.1.0-dev", "config": {"operator": {"image": {"tag": "0.1.0-dev", "name": "example-solution-operator"}}, "ui": {"image": {"tag": "0.1.0-dev", "name": "example-solution-ui"}}, "kind": "SolutionConfig", "customApiGroups": [], "apiVersion": "solutions.metalk8s.scality.com/v1alpha1"}, "id": "example-solution-0.1.0-dev"}] ',
      },
      kind: 'ConfigMap',
      metadata: {
        creationTimestamp: '2020-03-14T20:14:30.000Z',
        labels: {
          'metalk8s.scality.com/version': '2.6.0-dev',
        },
        name: 'metalk8s-solutions',
        namespace: 'metalk8s-solutions',
        resourceVersion: '192559',
        selfLink:
          '/api/v1/namespaces/metalk8s-solutions/configmaps/metalk8s-solutions',
        uid: 'a0921110-72fd-42ee-878c-70acd2e414f3',
      },
    },
  };

  const solutions = [
    {
      name: 'example-solution',
      versions: [
        {
          name: 'Example Solution',
          archive:
            '/vagrant/examples/metalk8s-solution-example/_build/example-solution-0.1.0-dev.iso',
          version: '0.1.0-dev',
          active: true,
          mountpoint: '/srv/scality/example-solution-0.1.0-dev',
          config: {
            operator: {
              image: {
                tag: '0.1.0-dev',
                name: 'example-solution-operator',
              },
            },
            ui: {
              image: {
                tag: '0.1.0-dev',
                name: 'example-solution-ui',
              },
            },
            kind: 'SolutionConfig',
            customApiGroups: [],
            apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
          },
          id: 'example-solution-0.1.0-dev',
        },
      ],
    },
  ];
  expect(gen.next(result).value).toEqual(put(setSolutionsAction(solutions)));
  expect(gen.next().done).toEqual(true);
});

it('create ConfigMap for the namespace when createEnvironment', () => {
  const action = {
    type: 'CREATE_ENVIRONMENT',
    payload: { name: 'unit-test', description: '' },
  };
  const gen = createEnvironment(action);

  const resultCreateEnvironment = {
    response: {
      _fetchResponse: {},
    },
    body: {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        annotations: {
          'solutions.metalk8s.scality.com/environment-description': '',
        },
        creationTimestamp: '2020-03-21T17:44:21.000Z',
        labels: {
          'solutions.metalk8s.scality.com/environment': 'unit-test',
        },
        name: 'unit-test',
        resourceVersion: '821669',
        selfLink: '/api/v1/namespaces/unit-test',
        uid: '04e910c3-db8a-4466-a96e-af15586dee3d',
      },
      spec: {
        finalizers: ['kubernetes'],
      },
      status: {
        phase: 'Active',
      },
    },
  };
  expect(gen.next().value).toEqual(
    call(SolutionsApi.createEnvironment, action.payload),
  );
  expect(gen.next(resultCreateEnvironment).value).toEqual(
    call(history.push, '/environments'),
  );
  expect(gen.next().value).toEqual(call(fetchEnvironments));
  expect(gen.next().done).toEqual(true);
});

it('update the solutions which have been deployed in the environment when fetchEnvironments', () => {
  const gen = fetchEnvironments();
  expect(gen.next().value.type).toEqual('SELECT');
  expect(gen.next().value).toEqual(call(SolutionsApi.listEnvironments));
  const environments = [
    {
      name: 'dev',
      description: 'dev',
      namespaces: [
        {
          metadata: {
            annotations: {
              'solutions.metalk8s.scality.com/environment-description': 'dev',
            },
            creationTimestamp: '2020-03-21T10:19:15.000Z',
            labels: {
              'solutions.metalk8s.scality.com/environment': 'dev',
            },
            name: 'dev',
            resourceVersion: '765679',
            selfLink: '/api/v1/namespaces/dev',
            uid: 'f159f967-c3d6-4976-920d-33dc6f9f172f',
          },
          spec: {
            finalizers: ['kubernetes'],
          },
          status: {
            phase: 'Active',
          },
        },
      ],
    },
  ];

  const updatedEnvironments = [
    {
      name: 'dev',
      description: 'dev',
      namespaces: [
        {
          metadata: {
            annotations: {
              'solutions.metalk8s.scality.com/environment-description': 'dev',
            },
            creationTimestamp: '2020-03-21T10:19:15.000Z',
            labels: {
              'solutions.metalk8s.scality.com/environment': 'dev',
            },
            name: 'dev',
            resourceVersion: '765679',
            selfLink: '/api/v1/namespaces/dev',
            uid: 'f159f967-c3d6-4976-920d-33dc6f9f172f',
          },
          spec: {
            finalizers: ['kubernetes'],
          },
          status: {
            phase: 'Active',
          },
        },
      ],
      solutions: [
        {
          name: 'example-solution',
          version: '0.1.0-dev',
        },
      ],
      isPreparing: false,
    },
  ];
  expect(gen.next(environments).value).toEqual(
    call(updateEnvironments, environments),
  );
  expect(gen.next(updatedEnvironments).value).toEqual(
    put(setEnvironmentsAction(updatedEnvironments)),
  );
  expect(gen.next().done).toEqual(true);
});

it('patch namespace with solution when preparing the evironment', () => {
  const action = {
    type: 'PREPARE_ENVIRONMENT',
    payload: {
      envName: 'test-prepare-env',
      solName: 'example-solution',
      solVersion: '0.1.0-dev',
    },
  };

  const gen = prepareEnvironment(action);
  const existingEnv = [
    { name: 'test-prepare-env', isPreparing: false },
    { name: 'test-prepare-prod', isPreparing: false },
  ];
  expect(gen.next().value.type).toEqual('SELECT');
  const clusterVersion = '2.6.0-dev';
  expect(gen.next(existingEnv).value).toEqual(
    call(
      SolutionsApi.addSolutionToEnvironment,
      'test-prepare-env',
      'example-solution',
      '0.1.0-dev',
    ),
  );

  const patchConfigMapResult = {
    response: {
      _fetchResponse: {},
    },
    body: {
      apiVersion: 'v1',
      data: {
        'example-solution': '0.1.0-dev',
      },
      kind: 'ConfigMap',
      metadata: {
        creationTimestamp: '2020-03-23T07:13:54.000Z',
        name: 'metalk8s-environment',
        namespace: 'monday-test',
        resourceVersion: '913031',
        selfLink:
          '/api/v1/namespaces/monday-test/configmaps/metalk8s-environment',
        uid: '5319ff3a-d788-424b-9fb4-e7c470ea98f7',
      },
    },
  };
  expect(gen.next(patchConfigMapResult).value.type).toEqual('SELECT');
  expect(gen.next(clusterVersion).value).toEqual(
    call(SaltApi.prepareEnvironment, 'test-prepare-env', '2.6.0-dev'),
  );
  const result = {
    return: [
      {
        jid: '20200322173837550838',
        tag: 'salt/run/20200322173837550838',
        env: 'test-prepare-env',
      },
    ],
  };
  expect(gen.next(result).value).toEqual(
    put(
      addJobAction({
        type: `prepare-env`,
        jid: '20200322173837550838',
        env: 'test-prepare-env',
      }),
    ),
  );
  expect(gen.next().done).toEqual(true);
});

it('display the error notification when environment creation has failed', () => {
  const action = {
    type: 'CREATE_ENVIRONMENT',
    payload: { name: 'unit-test', description: '' },
  };
  const gen = createEnvironment(action);

  expect(gen.next().value).toEqual(
    call(SolutionsApi.createEnvironment, action.payload),
  );

  const resultCreateEnvironment = {
    error: 'This is an error',
  };
  expect(gen.next(resultCreateEnvironment).value.type).toEqual('PUT');
  expect(gen.next(resultCreateEnvironment).value).toEqual(
    call(history.push, '/environments'),
  );
  expect(gen.next().value).toEqual(call(fetchEnvironments));
  expect(gen.next().done).toEqual(true);
});

it('display the error notification when create ConfigMap has failed', () => {
  const action = {
    type: 'CREATE_ENVIRONMENT',
    payload: { name: 'unit-test', description: '' },
  };
  const gen = createEnvironment(action);

  expect(gen.next().value).toEqual(
    call(SolutionsApi.createEnvironment, action.payload),
  );

  const resultCreateNamespacedConfigMap = {
    error: 'There is an error in create ConfigMap',
  };
  expect(gen.next(resultCreateNamespacedConfigMap).value.type).toEqual('PUT');
  expect(gen.next().value).toEqual(call(history.push, '/environments'));
  expect(gen.next().value).toEqual(call(fetchEnvironments));
  expect(gen.next().done).toEqual(true);
});

it('update the environment with the deployed solutions when updateEnviornments', () => {
  const environments = [
    {
      name: 'test',
      namespaces: [
        {
          metadata: {
            annotations: {
              'solutions.metalk8s.scality.com/environment-description': '',
            },
            creationTimestamp: '2020-03-24T12:25:43.000Z',
            labels: {
              'solutions.metalk8s.scality.com/environment': 'test',
            },
            name: 'test',
            resourceVersion: '1072822',
            selfLink: '/api/v1/namespaces/test',
            uid: '68d0831e-ad9b-4f94-886a-83fee359ca3f',
          },
          spec: {
            finalizers: ['kubernetes'],
          },
          status: {
            phase: 'Active',
          },
        },
      ],
      solutions: [
        {
          name: 'example-solution',
          version: '0.1.0-dev',
        },
      ],
      isPreparing: false,
    },
  ];
  const gen = updateEnvironments(environments);
  expect(gen.next().value).toEqual(
    call(SolutionsApi.getEnvironmentConfigMap, environments[0]),
  );
  const envConfig = {
    'example-solution': '0.1.0-dev',
  };
  expect(gen.next(envConfig).value).toEqual(
    call(CoreApi.getNamespacedDeployment, `example-solution-operator`, 'test'),
  );

  const operatorVersion = '0.1.0-dev';

  const availableSolutions = [
    {
      name: 'example-solution',
      versions: [
        {
          name: 'Example Solution',
          archive: '/vagrant/_build/root/example-solution-0.2.0-dev.iso',
          version: '0.2.0-dev',
          active: false,
          mountpoint: '/srv/scality/example-solution-0.2.0-dev',
          config: {
            operator: {
              image: {
                tag: '0.2.0-dev',
                name: 'example-solution-operator',
              },
            },
            ui: {
              image: {
                tag: '0.2.0-dev',
                name: 'example-solution-ui',
              },
            },
            kind: 'SolutionConfig',
            customApiGroups: [],
            apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
          },
          id: 'example-solution-0.2.0-dev',
        },
        {
          name: 'Example Solution',
          archive:
            '/vagrant/examples/metalk8s-solution-example/_build/example-solution-0.1.0-dev.iso',
          version: '0.1.0-dev',
          active: false,
          mountpoint: '/srv/scality/example-solution-0.1.0-dev',
          config: {
            operator: {
              image: {
                tag: '0.1.0-dev',
                name: 'example-solution-operator',
              },
            },
            ui: {
              image: {
                tag: '0.1.0-dev',
                name: 'example-solution-ui',
              },
            },
            kind: 'SolutionConfig',
            customApiGroups: [],
            apiVersion: 'solutions.metalk8s.scality.com/v1alpha1',
          },
          id: 'example-solution-0.1.0-dev',
        },
      ],
    },
  ];
  const availableUpgradeVersion = [];
  const availableDowngradeVersion = [];
  expect(
    gen.next(
      availableSolutions,
      availableUpgradeVersion,
      availableDowngradeVersion,
    ).done,
  ).toEqual(true);
});

it('delete the Environemnt and then fetch the environments when deleteEnvironment', () => {
  const action = {
    type: 'DELETE_ENVIRONMENT',
    payload: 'dev',
  };
  const gen = deleteEnvironment(action);
  expect(gen.next(action).value).toEqual(
    call(SolutionsApi.deleteEnvironment, 'dev'),
  );
  const result = {
    response: {
      _fetchResponse: {},
    },
    body: {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        resourceVersion: '1250132',
        selfLink: '/api/v1/namespaces/new',
      },
      status: {
        phase: 'Terminating',
      },
    },
  };
  expect(gen.next(result).value.type).toEqual('PUT');
  expect(gen.next().value).toEqual(call(fetchEnvironments));
  expect(gen.next().done).toEqual(true);
});
