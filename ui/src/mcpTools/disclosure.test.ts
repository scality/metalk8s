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

  it('hides the env values named like a credential, and only those', () => {
    const { resource, omitted } = disclose(
      'pods',
      pod({
        spec: {
          containers: [
            {
              name: 'web',
              env: [
                { name: 'DB_PASSWORD', value: 'hunter2' },
                { name: 'AWS_ACCESS_KEY_ID', value: 'AKIAEXAMPLE' },
                { name: 'KC_HTTP_PORT', value: '8080' },
                { name: 'KC_HTTPS_CERTIFICATE_KEY_FILE', value: '/etc/tls/tls.key' },
                { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'cfg', key: 'host' } } },
              ],
            },
          ],
        },
      }),
    );

    expect(JSON.stringify(resource)).not.toContain('hunter2');
    expect(resource.spec).toEqual({
      containers: [
        {
          name: 'web',
          env: [
            { name: 'DB_PASSWORD', value: 'hidden' },
            { name: 'AWS_ACCESS_KEY_ID', value: 'hidden' },
            // Configuration, not a credential: a bare KEY names a file as often as a secret.
            { name: 'KC_HTTP_PORT', value: '8080' },
            { name: 'KC_HTTPS_CERTIFICATE_KEY_FILE', value: '/etc/tls/tls.key' },
            // A reference is not a value: it says where the variable comes from, which is the half
            // worth having.
            { name: 'DB_HOST', valueFrom: { configMapKeyRef: { name: 'cfg', key: 'host' } } },
          ],
        },
      ],
    });
    expect(omitted).toContain('credential env values (names kept)');
  });

  it.each([
    [
      'a deployment, whose containers are under spec.template.spec',
      {
        spec: {
          template: { spec: { containers: [{ name: 'web', env: [{ name: 'DB_PASSWORD', value: 'hunter2' }] }] } },
        },
      },
    ],
    [
      'a cronjob, two templates deep',
      {
        spec: {
          jobTemplate: {
            spec: {
              template: { spec: { containers: [{ name: 'job', env: [{ name: 'DB_PASSWORD', value: 'hunter2' }] }] } },
            },
          },
        },
      },
    ],
  ])('keeps env values out of %s', (_, body) => {
    // Every kind puts its pod template somewhere different, and reaching for the pod path would
    // have handed a Deployment's env values over in full.
    const { resource, omitted } = disclose('deployments', { metadata: { name: 'thing' }, ...body });

    expect(JSON.stringify(resource)).not.toContain('hunter2');
    expect(JSON.stringify(resource)).toContain('"DB_PASSWORD"');
    expect(omitted).toContain('credential env values (names kept)');
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
            // kubectl apply writes the whole spec back verbatim, credentials and all — redacting the
            // spec and leaving this behind would hand them over anyway.
            'kubectl.kubernetes.io/last-applied-configuration':
              '{"spec":{"containers":[{"name":"web","env":[{"name":"DB_PASSWORD","value":"hunter2"}]}]}}',
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
    expect(omitted).toEqual(['credentials (fields kept)']);
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

  it('hides a credential-named field on any kind, a Secret name included: the accepted cost', () => {
    const { resource, omitted } = disclose('widgets', {
      apiVersion: 'example.com/v1',
      metadata: { name: 'x' },
      secret: 'my-secret-name',
    });

    expect(resource.secret).toBe('hidden');
    expect(omitted).toEqual(['credentials (fields kept)']);
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
    expect(omitted).toEqual(['credentials (fields kept)']);
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

  it("hides a Keycloak instance's bootstrap and TLS Secret names too, and keeps the references beside it", () => {
    const { resource } = disclose('keycloaks', {
      apiVersion: 'k8s.keycloak.org/v2alpha1',
      kind: 'Keycloak',
      metadata: { name: 'artesca-keycloak', namespace: 'artesca-auth' },
      spec: {
        bootstrapAdmin: { user: { secret: 'artesca-kc-initial-admin' } },
        db: { passwordSecret: { name: 'pg-creds', key: 'password' } },
        http: { tlsSecret: 'keycloak-tls' },
      },
    });

    expect(resource.spec).toEqual({
      // Names, but their fields are called secret: hidden, which is what a generic rule costs.
      bootstrapAdmin: { user: { secret: 'hidden' } },
      http: { tlsSecret: 'hidden' },
      // A reference object: walked into, and a name and a key are not credentials.
      db: { passwordSecret: { name: 'pg-creds', key: 'password' } },
    });
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
    expect(omitted).toContain('credentials (fields kept)');
  });

  it("hides a Zenko overlay's S3 account and location keys", () => {
    const { resource, omitted } = disclose('zenkoconfigurationoverlays', {
      apiVersion: 'zenko.io/v1alpha1',
      kind: 'ZenkoConfigurationOverlay',
      metadata: { name: 'artesca-data', namespace: 'zenko' },
      spec: {
        accounts: [{ name: 'admin', accessKey: 'AKIAFAKE', encryptedSecretKey: 'ENCRYPTED-KEY' }],
        locations: [{ name: 'aws', details: { bucketName: 'b', secretKey: 'S3-SECRET' } }],
      },
    });

    expect(resource.spec).toEqual({
      accounts: [{ name: 'admin', accessKey: 'hidden', encryptedSecretKey: 'hidden' }],
      locations: [{ name: 'aws', details: { bucketName: 'b', secretKey: 'hidden' } }],
    });
    expect(omitted).toEqual(['credentials (fields kept)']);
  });

  it('hides Dex MFA and WebAuthn material whole, whatever shape it takes', () => {
    const { resource } = disclose('useridentities', {
      apiVersion: 'dex.coreos.com/v1',
      kind: 'UserIdentity',
      metadata: { name: 'u', namespace: 'dex' },
      userID: 'u1',
      mfaSecrets: { totp: { secret: 'TOTP-SEED', confirmed: true } },
      webauthnCredentials: [{ id: 'cred-1', publicKey: 'PUB', signCount: 3 }],
    });

    expect(resource).toMatchObject({ userID: 'u1', mfaSecrets: 'hidden', webauthnCredentials: 'hidden' });
    expect(JSON.stringify(resource)).not.toMatch(/TOTP-SEED|cred-1/);
  });

  it("hides a Keycloak user's stored credential data", () => {
    const { resource } = disclose('keycloakrealmimports', {
      apiVersion: 'k8s.keycloak.org/v2alpha1',
      kind: 'KeycloakRealmImport',
      metadata: { name: 'r', namespace: 'kc' },
      spec: {
        realm: { users: [{ username: 'u', credentials: [{ type: 'password', secretData: '{"value":"HASH"}' }] }] },
      },
    });

    expect(JSON.stringify(resource)).not.toContain('HASH');
  });

  it("hides Dex's connector config, and leaves a config field alone anywhere else", () => {
    const dex = disclose('connectors', {
      apiVersion: 'dex.coreos.com/v1',
      metadata: { name: 'ldap', namespace: 'dex' },
      type: 'ldap',
      config: 'eyJiaW5kUFciOiJ4In0=',
    });
    const other = disclose('widgets', { apiVersion: 'example.com/v1', metadata: { name: 'x' }, config: 'debug' });

    expect(dex.resource).toMatchObject({ type: 'ldap', config: 'hidden' });
    expect(other.resource.config).toBe('debug');
  });

  it.each([
    'adminPassword',
    'rootPassword',
    'secretAccessKey',
    'refreshToken',
    'sessionToken',
    'bindPW',
    'keystorePassword',
    'accessKeyID',
    'encryptedSecretKey',
    'privateKey',
    'hmac_key',
    'client_secret',
    'user_code',
    'connectorData',
  ])('hides %s, a credential by the words of its name', (field) => {
    const { resource } = disclose('widgets', { metadata: { name: 'x' }, spec: { [field]: 'hunter2' } });

    expect(resource.spec).toEqual({ [field]: 'hidden' });
  });

  it.each([
    'secretName',
    'passwordKey',
    'tokenKey',
    'bearerTokenFile',
    'passwordSecretRef',
    'secretNamespace',
    'certificateKey',
  ])('keeps %s, whose last word makes it a reference', (field) => {
    const { resource } = disclose('widgets', { metadata: { name: 'x' }, spec: { [field]: 'db' } });

    expect(resource.spec).toEqual({ [field]: 'db' });
  });

  it.each([
    ['PGPASSWORD', true],
    ['DB_PASS', true],
    ['MYSQL_PWD', true],
    ['AWS_SECRET_ACCESS_KEY', true],
    ['API_KEY', true],
    ['TLS_KEY_FILE', false],
    ['KC_HTTP_PORT', false],
    ['TOKEN_PATH', false],
  ])('hides the env value of %s: %s', (name, hidden) => {
    const { resource } = disclose(
      'pods',
      pod({ spec: { containers: [{ name: 'web', env: [{ name, value: 'v' }] }] } }),
    );

    expect(resource.spec).toEqual({ containers: [{ name: 'web', env: [{ name, value: hidden ? 'hidden' : 'v' }] }] });
  });

  it.each([
    'ENCRYPTION_KEY',
    'SIGNING_KEY',
    'MASTER_KEY',
    'SESSION_KEY',
    'COOKIE_KEY',
    'SSH_KEY',
    'ACCESS_KEYS',
  ])('hides the env value of %s, a key that is the credential itself', (name) => {
    const { resource } = disclose(
      'pods',
      pod({ spec: { containers: [{ name: 'web', env: [{ name, value: 'v' }] }] } }),
    );

    expect(resource.spec).toEqual({ containers: [{ name: 'web', env: [{ name, value: 'hidden' }] }] });
  });

  it.each(['encryptionKey', 'apiKeys', 'accessKeys', 'privateKeys'])('hides %s, a list of keys included', (field) => {
    const { resource } = disclose('widgets', { metadata: { name: 'x' }, spec: { [field]: ['k1', 'k2'] } });

    expect(resource.spec).toEqual({ [field]: 'hidden' });
  });

  it('leaves an empty list under a credential name alone: there is no value to hide', () => {
    const serviceAccount = { metadata: { name: 'default' }, secrets: [], imagePullSecrets: [] };

    const { resource, omitted } = disclose('serviceaccounts', serviceAccount);

    expect(resource).toEqual(serviceAccount);
    expect(omitted).toEqual([]);
  });

  it('hides the value of a { name, value } item named like a credential, outside containers too', () => {
    const { resource, omitted } = disclose('keycloaks', {
      metadata: { name: 'kc' },
      spec: {
        additionalOptions: [
          { name: 'db-password', value: 'hunter2' },
          { name: 'db-pool-max-size', value: '20' },
          { name: 'db-username', secret: { name: 'pg-creds', key: 'username' } },
        ],
      },
    });

    expect(resource.spec).toEqual({
      additionalOptions: [
        { name: 'db-password', value: 'hidden' },
        { name: 'db-pool-max-size', value: '20' },
        { name: 'db-username', secret: { name: 'pg-creds', key: 'username' } },
      ],
    });
    expect(omitted).toEqual(['credentials (fields kept)']);
  });

  it.each([
    ['a PEM private key', '-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----\n'],
    ['a URL with a password', 'postgres://app:hunter2@db:5432/app'],
  ])('hides %s whatever the field or env variable is called', (_, credential) => {
    const { resource, omitted } = disclose('widgets', {
      metadata: { name: 'x' },
      spec: {
        tlsKey: credential,
        databaseUrl: credential,
        hosts: ['web', credential],
        containers: [{ name: 'web', env: [{ name: 'DATABASE_URL', value: credential }] }],
      },
    });

    expect(resource.spec).toEqual({
      tlsKey: 'hidden',
      databaseUrl: 'hidden',
      hosts: 'hidden',
      containers: [{ name: 'web', env: [{ name: 'DATABASE_URL', value: 'hidden' }] }],
    });
    expect(omitted).toEqual(['credential env values (names kept)', 'credentials (fields kept)']);
  });

  it('keeps a URL with no password, a public key and a certificate', () => {
    const spec = {
      databaseUrl: 'postgres://app@db:5432/app',
      issuerUrl: 'https://keycloak.example.invalid:8443/realms/artesca',
      publicKey: '-----BEGIN PUBLIC KEY-----\nMIIB\n-----END PUBLIC KEY-----\n',
      caBundle: '-----BEGIN CERTIFICATE-----\nMIIC\n-----END CERTIFICATE-----\n',
      containers: [{ name: 'web', env: [{ name: 'DATABASE_URL', value: 'postgres://db:5432/app' }] }],
    };

    const { resource, omitted } = disclose('widgets', { metadata: { name: 'x' }, spec });

    expect(resource.spec).toEqual(spec);
    expect(omitted).toEqual([]);
  });

  it("hides a probe's Authorization header, and keeps its other headers", () => {
    const { resource } = disclose(
      'pods',
      pod({
        spec: {
          containers: [
            {
              name: 'web',
              livenessProbe: {
                httpGet: {
                  path: '/healthz',
                  port: 8080,
                  httpHeaders: [
                    { name: 'Authorization', value: 'Bearer eyJhbGciOi' },
                    { name: 'Accept', value: 'application/json' },
                  ],
                },
              },
            },
          ],
        },
      }),
    );

    expect(JSON.stringify(resource)).not.toContain('eyJhbGciOi');
    expect(resource.spec).toMatchObject({
      containers: [
        {
          livenessProbe: {
            httpGet: {
              httpHeaders: [
                { name: 'Authorization', value: 'hidden' },
                { name: 'Accept', value: 'application/json' },
              ],
            },
          },
        },
      ],
    });
  });

  it('hides every value of a map named like a credential, and keeps its references', () => {
    const { resource, omitted } = disclose('widgets', {
      metadata: { name: 'x' },
      spec: {
        secrets: { db: 'pw123', AWS_KEY: 'AKIAEXAMPLE' },
        credentials: { username: 'admin', apiKeyValue: 'k-123' },
        passwordSecret: { name: 'pg-creds', key: 'password' },
        volumes: [{ name: 'creds', secret: { secretName: 'db', items: [{ key: 'pw', path: 'pw' }] } }],
      },
    });

    expect(resource.spec).toEqual({
      secrets: { db: 'hidden', AWS_KEY: 'hidden' },
      credentials: { username: 'hidden', apiKeyValue: 'hidden' },
      // A reference to a Secret: its name and key, not its value.
      passwordSecret: { name: 'pg-creds', key: 'password' },
      volumes: [{ name: 'creds', secret: { secretName: 'db', items: [{ key: 'pw', path: 'pw' }] } }],
    });
    expect(omitted).toEqual(['credentials (fields kept)']);
  });

  it("leaves a pod template's metadata alone, wherever it sits", () => {
    const deployment = {
      metadata: { name: 'web' },
      spec: {
        selector: { matchLabels: { app: 'web' } },
        template: { metadata: { labels: { app: 'web' }, annotations: { 'checksum/secret': 'abc' } } },
      },
    };

    const { resource, omitted } = disclose('deployments', deployment);

    expect(resource).toEqual(deployment);
    expect(omitted).toEqual([]);
  });

  it('keeps references to Secrets, and never touches metadata', () => {
    const pod = {
      metadata: {
        name: 'web',
        namespace: 'default',
        labels: { 'pod-template-hash': '7d9f' },
        annotations: { 'checksum/secret': 'abc' },
      },
      spec: {
        containers: [
          {
            name: 'web',
            env: [{ name: 'DB_PASSWORD', valueFrom: { secretKeyRef: { name: 'db', key: 'password' } } }],
          },
        ],
        volumes: [{ name: 'creds', secret: { secretName: 'db' } }],
        tolerations: [{ key: 'node-role.kubernetes.io/master', effect: 'NoSchedule' }],
      },
    };

    const { resource, omitted } = disclose('pods', pod);

    expect(resource).toEqual(pod);
    expect(omitted).toEqual([]);
  });
});
