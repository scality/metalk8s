import { disclose, MAX_OBJECT_BYTES } from './disclosure';

const pod = (overrides: Record<string, unknown> = {}) => ({
  metadata: { name: 'web-abc', namespace: 'default', uid: 'uid-1' },
  spec: { nodeName: 'node-1', containers: [{ name: 'web' }] },
  status: { phase: 'Running' },
  ...overrides,
});

describe('disclose', () => {
  it('hands an ordinary object straight through', () => {
    const object = pod();

    const { resource, omitted } = disclose('pods', object);

    expect(resource).toEqual(object);
    expect(omitted).toEqual([]);
  });

  it('keeps env names and drops their values', () => {
    const { resource, omitted } = disclose(
      'pods',
      pod({
        spec: {
          containers: [
            {
              name: 'web',
              env: [
                { name: 'DB_PASSWORD', value: 'hunter2' },
                { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'cfg', key: 'host' } } },
              ],
            },
          ],
        },
      }),
    );

    expect(JSON.stringify(resource)).not.toContain('hunter2');
    expect(resource.spec).toMatchObject({
      containers: [
        {
          env: [
            { name: 'DB_PASSWORD' },
            // A reference is not a value: it says where the variable comes from, which is the half
            // worth having.
            { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'cfg', key: 'host' } } },
          ],
        },
      ],
    });
    expect(omitted).toContain('env values (names kept)');
  });

  it.each([
    [
      'a deployment, whose containers are under spec.template.spec',
      { spec: { template: { spec: { containers: [{ name: 'web', env: [{ name: 'PW', value: 'hunter2' }] }] } } } },
    ],
    [
      'a cronjob, two templates deep',
      {
        spec: {
          jobTemplate: {
            spec: { template: { spec: { containers: [{ name: 'job', env: [{ name: 'PW', value: 'hunter2' }] }] } } },
          },
        },
      },
    ],
  ])('keeps env values out of %s', (_, body) => {
    // Every kind puts its pod template somewhere different, and reaching for the pod path would
    // have handed a Deployment's env values over in full.
    const { resource, omitted } = disclose('deployments', { metadata: { name: 'thing' }, ...body });

    expect(JSON.stringify(resource)).not.toContain('hunter2');
    expect(JSON.stringify(resource)).toContain('"PW"');
    expect(omitted).toContain('env values (names kept)');
  });

  it('leaves dates alone while walking the object', () => {
    const { resource } = disclose(
      'pods',
      pod({ metadata: { name: 'web-abc', creationTimestamp: new Date('2026-10-02T08:11:04Z') } }),
    );

    // A Date has no own entries, so walking one without a guard turns it into {}.
    expect((resource.metadata as { creationTimestamp: Date }).creationTimestamp).toEqual(
      new Date('2026-10-02T08:11:04Z'),
    );
  });

  it("keeps a ConfigMap's keys and drops its values, as the listing does", () => {
    const { resource, omitted } = disclose('configmaps', {
      metadata: { name: 'app-config', namespace: 'default' },
      data: { 'database.url': 'postgres://user:hunter2@db:5432/app' },
    });

    // Describing one is no safer than listing one, and the listing has never returned the values.
    expect(JSON.stringify(resource)).not.toContain('hunter2');
    expect(resource).not.toHaveProperty('data');
    expect(resource.dataKeys).toEqual(['database.url']);
    expect(omitted).toContain('ConfigMap values (keys kept)');
  });

  it('never returns the annotation holding a copy of the applied spec', () => {
    const { resource, omitted } = disclose(
      'pods',
      pod({
        metadata: {
          name: 'web-abc',
          annotations: {
            // kubectl apply writes the whole spec back verbatim, env values and all — redacting the
            // spec and leaving this behind would hand them over anyway.
            'kubectl.kubernetes.io/last-applied-configuration':
              '{"spec":{"containers":[{"name":"web","env":[{"name":"PW","value":"hunter2"}]}]}}',
            'other/annotation': 'kept',
          },
        },
      }),
    );

    expect(JSON.stringify(resource)).not.toContain('hunter2');
    expect(resource.metadata?.annotations).toEqual({ 'other/annotation': 'kept' });
    expect(omitted).toContain('metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]');
  });

  it('sheds its known bulk only once the object is outsized, and names what it shed', () => {
    const { resource, omitted } = disclose(
      'pods',
      pod({
        metadata: {
          name: 'web-abc',
          labels: { app: 'web' },
          // Grown over a year of updates, and the first thing worth losing.
          managedFields: Array.from({ length: 40 }, () => ({ manager: 'x'.repeat(4096) })),
        },
      }),
    );

    expect(resource.metadata).not.toHaveProperty('managedFields');
    expect(resource.metadata).toMatchObject({ labels: { app: 'web' } });
    expect(omitted).toContain('metadata.managedFields');
  });

  it("sheds a node's image list once that is what makes it outsized", () => {
    const { resource, omitted } = disclose('nodes', {
      metadata: { name: 'node-1' },
      status: {
        conditions: [{ type: 'Ready', status: 'True' }],
        // Every image on the box, with every tag it answers to.
        images: Array.from({ length: 200 }, (_, i) => ({ names: [`registry/image-${i}@sha256:${'a'.repeat(700)}`] })),
      },
    });

    expect(resource.status).not.toHaveProperty('images');
    expect(resource.status).toMatchObject({ conditions: [{ type: 'Ready' }] });
    // Only what it actually shed: this node has no managed fields to lose, and naming them would be
    // claiming work it did not do.
    expect(omitted).toEqual(['status.images']);
  });

  it('leaves an object alone when it is under the budget', () => {
    const { omitted } = disclose('pods', pod({ metadata: { name: 'web', managedFields: [{ manager: 'kubelet' }] } }));

    expect(JSON.stringify(pod()).length).toBeLessThan(MAX_OBJECT_BYTES);
    expect(omitted).toEqual([]);
  });
});
