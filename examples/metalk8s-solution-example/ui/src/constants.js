export const REFRESH_TIMEOUT = 15000;

export const LABEL_COMPONENT = 'app.kubernetes.io/component';
export const LABEL_NAME = 'app.kubernetes.io/name';
export const LABEL_PART_OF = 'app.kubernetes.io/part-of';
export const LABEL_VERSION = 'app.kubernetes.io/version';
export const SOLUTION_NAME = 'hyperdrive';

export const DEPLOYMENT_NAME = 'example-operator';
// -> OPERATOR_NAME
export const OPERATOR_NAME = 'example-solution-operator';
// -> OPERATOR_IMAGE_NAME
export const SOLUTION_CONFIGMAP_NAME = 'metalk8s-solutions';

export const OPERATOR_NAMESPACE = 'hyperdrive';

export const protectionOptions = [
  {
    label: 'Standard Durability Replication COS 2',
    value: 'replication-2',
    payload: {
      type: 'replication',
      copie: 2,
    },
  },
  {
    label: 'Standard Durability Replication COS 3',
    value: 'replication-3',
    payload: {
      type: 'replication',
      copie: 3,
    },
  },
  {
    label: 'Erasure Coding 2+1',
    value: 'ec-2+1',
    payload: {
      type: 'isa-l',
      k: 2,
      n: 1,
    },
  },
  {
    label: 'Erasure Coding 4+2',
    value: 'ec-4+2',
    payload: {
      type: 'isa-l',
      k: 4,
      n: 2,
    },
  },
];
