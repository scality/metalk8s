## CRD client generator

It generates a typescript client based on `@kubernetes/client` custom objects client from a Kubernetes `CustomResourceDefinition`.

### Usage

```bash
$ npm run generate -- <path_to_your_crd> <path_to_the_target_generated_js_file> [optional_type_prefix]
```

#### Sample

```bash
$ npm run generate -- src/__TESTS__/storage.metalk8s.scality.com_volumes.yaml sample/GeneratedClient.js Metalk8s
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
