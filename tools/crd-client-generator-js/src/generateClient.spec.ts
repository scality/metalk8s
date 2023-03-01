import { generateClient } from "./generateClient";

const path = require('path');
const fs = require('fs');

describe('client generator', () => {
    it('should generate expected cluster scoped client given v1beta1 clustered scoped CRD file', () => {
        const crdFile = path.join(__dirname, './__TESTS__/v1beta1.clustered.crd.yaml');
        const destFile = path.join(__dirname, './__TESTS__/expected.ts');
        const expectedFile = path.join(__dirname, './__TESTS__/expected.v1beta1.clustered.crd.client.ts');

        const result = generateClient(crdFile, destFile, 'Metalk8s');
        expect(result).toBe(fs.readFileSync(expectedFile, {encoding:'utf8'}));
    })

    it('should generate expected namespaced scoped client given v1beta1 namespaced scoped CRD file', () => {
      const crdFile = path.join(__dirname, './__TESTS__/v1beta1.namespaced.crd.yaml');
      const destFile = path.join(__dirname, './__TESTS__/expected.ts');
      const expectedFile = path.join(__dirname, './__TESTS__/expected.v1beta1.namespaced.crd.client.ts');

      const result = generateClient(crdFile, destFile);
      expect(result).toBe(fs.readFileSync(expectedFile, {encoding:'utf8'}));
  })

  it('should generate expected namespaced scoped client given v1 namespaced scoped CRD file', () => {
    const crdFile = path.join(__dirname, './__TESTS__/v1.namespaced.crd.yaml');
    const destFile = path.join(__dirname, './__TESTS__/expected.ts');
    const expectedFile = path.join(__dirname, './__TESTS__/expected.v1.namespaced.crd.client.ts');

    const result = generateClient(crdFile, destFile);
    expect(result).toBe(fs.readFileSync(expectedFile, {encoding:'utf8'}));
  })

  it('should generate expected namespaced scoped client given multi version v1 namespaced scoped CRD file', () => {
    const crdFile = path.join(__dirname, './__TESTS__/v1.multiversion.namespaced.crd.yaml');
    const destFile = path.join(__dirname, './__TESTS__/expected.ts');
    const expectedFile = path.join(__dirname, './__TESTS__/expected.v1.multiversion.namespaced.crd.client.ts');

    const result = generateClient(crdFile, destFile);
    expect(result).toBe(fs.readFileSync(expectedFile, {encoding:'utf8'}));
  })
})
