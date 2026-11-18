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

  it("keeps a Secret's keys and hides every value", () => {
    const { resource, omitted } = disclose('secrets', {
      metadata: { name: 'db', namespace: 'default' },
      type: 'Opaque',
      data: { password: 'aHVudGVyMg==', user: 'YWRtaW4=', empty: '' },
    });

    expect(resource).toMatchObject({ type: 'Opaque', data: { password: 'hidden', user: 'hidden', empty: 'hidden' } });
    expect(omitted).toEqual(['Secret values (keys kept)']);
  });

  it("hides a Dex client's secret and keeps everything else", () => {
    const { resource, omitted } = disclose('oauth2clients', {
      apiVersion: 'dex.coreos.com/v1',
      kind: 'OAuth2Client',
      metadata: { name: 'fake-client', namespace: 'dex-test' },
      id: 'fake-client',
      name: 'Fake client',
      redirectURIs: ['https://example.invalid/callback'],
      secret: 'FAKE-CLIENT-SECRET',
    });

    expect(resource).toMatchObject({
      id: 'fake-client',
      name: 'Fake client',
      redirectURIs: ['https://example.invalid/callback'],
      secret: 'hidden',
    });
    expect(omitted).toEqual(['Dex credentials (fields kept)']);
  });

  it("hides a Dex signing key's private parts and keeps its public ones and its rotation", () => {
    const { resource } = disclose('signingkeies', {
      apiVersion: 'dex.coreos.com/v1',
      kind: 'SigningKey',
      metadata: { name: 'openid-connect', namespace: 'dex-test' },
      nextRotation: '2026-12-01T00:00:00Z',
      signingKey: { kty: 'RSA', kid: 'k1', n: 'MODULUS', e: 'AQAB', d: 'PRIV-D', p: 'PRIV-P', q: 'PRIV-Q' },
      signingKeyPub: { kty: 'RSA', kid: 'k1', n: 'MODULUS', e: 'AQAB' },
      verificationKeys: [{ publicKey: { kty: 'RSA', kid: 'k0', n: 'OLD', e: 'AQAB' }, expiry: '2026-11-30T00:00:00Z' }],
    });

    expect(resource).toMatchObject({
      nextRotation: '2026-12-01T00:00:00Z',
      signingKey: { kty: 'RSA', kid: 'k1', n: 'MODULUS', e: 'AQAB', d: 'hidden', p: 'hidden', q: 'hidden' },
      signingKeyPub: { kty: 'RSA', kid: 'k1', n: 'MODULUS', e: 'AQAB' },
      verificationKeys: [{ publicKey: { kid: 'k0', n: 'OLD' }, expiry: '2026-11-30T00:00:00Z' }],
    });
    expect(JSON.stringify(resource)).not.toMatch(/PRIV-/);
  });

  it.each([
    ['passwords', { email: 'admin@example.invalid', hash: 'JDJhJDEw' }, 'hash'],
    ['connectors', { type: 'ldap', name: 'LDAP', config: 'eyJiaW5kUFciOiJ4In0=' }, 'config'],
    ['refreshtokens', { clientID: 'c', token: 'tok', obsoleteToken: 'old' }, 'token'],
  ])("hides a Dex %s's credential field %#", (kind, fields, hiddenField) => {
    const { resource } = disclose(kind, {
      apiVersion: 'dex.coreos.com/v1',
      metadata: { name: 'x', namespace: 'dex' },
      ...fields,
    });

    expect(resource[hiddenField]).toBe('hidden');
  });

  it('leaves a field named secret alone outside the Dex group', () => {
    const { resource, omitted } = disclose('widgets', {
      apiVersion: 'example.com/v1',
      metadata: { name: 'x' },
      secret: 'my-secret-name',
    });

    expect(resource.secret).toBe('my-secret-name');
    expect(omitted).toEqual([]);
  });

  it("drops a Secret's stringData, which never comes back from the API, even with no data beside it", () => {
    const { resource, omitted } = disclose('secrets', {
      metadata: { name: 'db', namespace: 'default' },
      stringData: { password: 'hunter2' },
    });

    expect(JSON.stringify(resource)).not.toContain('hunter2');
    expect(resource).not.toHaveProperty('stringData');
    expect(omitted).toContain('Secret values (keys kept)');
  });

  it("drops the copy of a Secret's data that kubectl apply leaves in its annotation", () => {
    const { resource, omitted } = disclose('secrets', {
      metadata: {
        name: 'db',
        namespace: 'default',
        annotations: {
          'kubectl.kubernetes.io/last-applied-configuration': '{"data":{"password":"aHVudGVyMg=="}}',
          'app.kubernetes.io/managed-by': 'salt',
        },
      },
      data: { password: 'aHVudGVyMg==' },
    });

    expect(JSON.stringify(resource)).not.toContain('aHVudGVyMg==');
    expect(resource.metadata).toMatchObject({ annotations: { 'app.kubernetes.io/managed-by': 'salt' } });
    expect(omitted).toEqual([
      'metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]',
      'Secret values (keys kept)',
    ]);
  });

  it('leaves data alone on any kind but secrets', () => {
    const { resource } = disclose('leases', { metadata: { name: 'x' }, data: { key: 'YWJj' } });

    expect(resource.data).toEqual({ key: 'YWJj' });
  });

  it("hides a Keycloak realm import's client secret and user password, and keeps the rest", () => {
    const { resource, omitted } = disclose('keycloakrealmimports', {
      apiVersion: 'k8s.keycloak.org/v2alpha1',
      kind: 'KeycloakRealmImport',
      metadata: { name: 'fake-realm', namespace: 'keycloak-test' },
      spec: {
        keycloakCRName: 'does-not-exist',
        realm: {
          realm: 'fake-realm',
          enabled: true,
          clients: [
            { clientId: 'fake-client', redirectUris: ['https://example.invalid/*'], secret: 'FAKE-CLIENT-SECRET' },
            { clientId: 'public-client', publicClient: true },
          ],
          users: [
            {
              username: 'fake-user',
              enabled: true,
              credentials: [{ type: 'password', value: 'FAKE-USER-PASSWORD' }],
            },
          ],
        },
      },
    });

    expect(resource.spec).toEqual({
      keycloakCRName: 'does-not-exist',
      realm: {
        realm: 'fake-realm',
        enabled: true,
        clients: [
          { clientId: 'fake-client', redirectUris: ['https://example.invalid/*'], secret: 'hidden' },
          { clientId: 'public-client', publicClient: true },
        ],
        users: [{ username: 'fake-user', enabled: true, credentials: [{ type: 'password', value: 'hidden' }] }],
      },
    });
    expect(omitted).toEqual(['Keycloak credentials (fields kept)']);
  });

  it("hides a realm's identity provider secret, SMTP password and LDAP bind credential", () => {
    const { resource } = disclose('keycloakrealmimports', {
      apiVersion: 'k8s.keycloak.org/v2alpha1',
      kind: 'KeycloakRealmImport',
      metadata: { name: 'r', namespace: 'kc' },
      spec: {
        realm: {
          identityProviders: [{ alias: 'google', config: { clientId: 'g', clientSecret: 'IDP-SECRET' } }],
          smtpServer: { host: 'smtp.example.invalid', password: 'SMTP-PASSWORD' },
          components: {
            'org.keycloak.storage.UserStorageProvider': [
              { name: 'ldap', config: { connectionUrl: ['ldap://x'], bindCredential: ['LDAP-PASSWORD'] } },
            ],
          },
          users: [{ username: 'u', credentials: [{ type: 'password', secretData: '{"value":"HASH"}' }] }],
        },
      },
    });

    expect(JSON.stringify(resource)).not.toMatch(/IDP-SECRET|SMTP-PASSWORD|LDAP-PASSWORD|HASH/);
    expect(resource.spec).toMatchObject({
      realm: {
        identityProviders: [{ alias: 'google', config: { clientId: 'g', clientSecret: 'hidden' } }],
        smtpServer: { host: 'smtp.example.invalid', password: 'hidden' },
      },
    });
  });

  it('leaves a Keycloak instance alone: its secret fields name Secrets, they hold none', () => {
    const keycloak = {
      apiVersion: 'k8s.keycloak.org/v2alpha1',
      kind: 'Keycloak',
      metadata: { name: 'artesca-keycloak', namespace: 'artesca-auth' },
      spec: { bootstrapAdmin: { user: { secret: 'artesca-kc-initial-admin' } } },
    };

    const { resource, omitted } = disclose('keycloaks', keycloak);

    expect(resource).toEqual(keycloak);
    expect(omitted).toEqual([]);
  });

  it("hides a realm's key provider secrets: private key, HMAC secret, keystore and key passwords", () => {
    const { resource } = disclose('keycloakrealmimports', {
      apiVersion: 'k8s.keycloak.org/v2alpha1',
      kind: 'KeycloakRealmImport',
      metadata: { name: 'r', namespace: 'kc' },
      spec: {
        realm: {
          components: {
            'org.keycloak.keys.KeyProvider': [
              { name: 'rsa', providerId: 'rsa', config: { priority: ['100'], privateKey: ['RSA-PRIVATE-KEY'] } },
              { name: 'hmac', providerId: 'hmac-generated', config: { secret: ['HMAC-SECRET'] } },
              {
                name: 'java-keystore',
                providerId: 'java-keystore',
                config: { keystore: ['/opt/ks.jks'], keystorePassword: ['KS-PASSWORD'], keyPassword: ['KEY-PASSWORD'] },
              },
            ],
          },
        },
      },
    });

    expect(JSON.stringify(resource)).not.toMatch(/RSA-PRIVATE-KEY|HMAC-SECRET|KS-PASSWORD|KEY-PASSWORD/);
    expect(resource.spec).toMatchObject({
      realm: {
        components: {
          'org.keycloak.keys.KeyProvider': [
            { name: 'rsa', config: { priority: ['100'], privateKey: 'hidden' } },
            { name: 'hmac', config: { secret: 'hidden' } },
            {
              name: 'java-keystore',
              config: { keystore: ['/opt/ks.jks'], keystorePassword: 'hidden', keyPassword: 'hidden' },
            },
          ],
        },
      },
    });
  });

  it("hides a Dex device request's codes and client secret, and keeps the rest", () => {
    const { resource, omitted } = disclose('devicerequests', {
      apiVersion: 'dex.coreos.com/v1',
      kind: 'DeviceRequest',
      metadata: { name: 'dr', namespace: 'dex' },
      client_id: 'cli',
      scopes: ['openid'],
      device_code: 'DEVICE-CODE',
      user_code: 'USER-CODE',
      client_secret: 'CLIENT-SECRET',
    });

    expect(resource).toMatchObject({
      client_id: 'cli',
      scopes: ['openid'],
      device_code: 'hidden',
      user_code: 'hidden',
      client_secret: 'hidden',
    });
    expect(omitted).toContain('Dex credentials (fields kept)');
  });
});
