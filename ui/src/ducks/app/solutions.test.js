import { call, put } from 'redux-saga/effects';
import { fetchSolutions, SET_SOLUTIONS } from './solutions';
import * as ApiK8s from '../../services/k8s/api';

it('update the solutions list state when fetchSolutions', () => {
  const gen = fetchSolutions();

  expect(gen.next().value).toEqual(
    call(ApiK8s.getSolutionsConfigMapForAllNamespaces),
  );

  const result = {
    body: {
      items: [
        {
          data: {
            'example-solution1':
              '[{"iso":"/vagrant/iso/example-solution-0.1.0-dev.iso","version":"0.1.0-dev","deployed":true},{"iso":"/vagrant/iso/example-solution-0.1.1-dev.iso","version":"0.1.1-dev","deployed":false},{"iso":"/vagrant/iso/example-solution-0.1.2-dev.iso","version":"0.1.2-dev","deployed":false}]',
            'example-solution2':
              '[{"iso":"/vagrant/iso/example-solution-1.1.0-dev.iso","version":"1.1.0-dev","deployed":true},{"iso":"/vagrant/iso/example-solution-1.1.1-dev.iso","version":"1.1.1-dev","deployed":false}]',
          },
        },
      ],
    },
  };

  expect(gen.next(result).value.type).toEqual('SELECT');
  const services = [
    {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'my-service-ui-1',
        labels: {
          'app.kubernetes.io/part-of': 'example-solution1',
          'app.kubernetes.io/version': '0.1.0-dev',
          'app.kubernetes.io/component': 'ui',
        },
      },
      spec: {
        type: 'NodePort',
        ports: [
          {
            protocol: 'TCP',
            port: 80,
            targetPort: 9376,
            nodePort: 31234,
          },
        ],
      },
    },
  ];
  const solutions = [
    {
      name: 'example-solution1',
      versions: [
        {
          iso: '/vagrant/iso/example-solution-0.1.0-dev.iso',
          version: '0.1.0-dev',
          deployed: true,
          ui_url: 'http://localhost:31234',
        },
        {
          iso: '/vagrant/iso/example-solution-0.1.1-dev.iso',
          version: '0.1.1-dev',
          deployed: false,
        },
        {
          iso: '/vagrant/iso/example-solution-0.1.2-dev.iso',
          version: '0.1.2-dev',
          deployed: false,
        },
      ],
    },
    {
      name: 'example-solution2',
      versions: [
        {
          iso: '/vagrant/iso/example-solution-1.1.0-dev.iso',
          version: '1.1.0-dev',
          deployed: true,
          ui_url: '',
        },
        {
          iso: '/vagrant/iso/example-solution-1.1.1-dev.iso',
          version: '1.1.1-dev',
          deployed: false,
        },
      ],
    },
  ];

  expect(gen.next(services).value).toEqual(
    put({ type: SET_SOLUTIONS, payload: solutions }),
  );
});
