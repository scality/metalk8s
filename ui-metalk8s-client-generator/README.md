## Metalk8s client generator

It generates a flow client based on `@kubernetes/client` custom objects client from kubernetes `CustomResourceDefinition` of metalk8s volumes.

### Usage 

```bash
$ npm run generate -- src/__TESTS__/storage.metalk8s.scality.com_volumes_crd.yaml sample/GeneratedClient.js 
```

### How to contribute ?

#### Install dependencies

```bash
$ npm i
```

#### Run tests

```bash
$ npm run test -- --watch
```