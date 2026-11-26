const { defineConfig } = require('cypress');

module.exports = defineConfig({
  env: {
    email: 'admin@metalk8s.invalid',
    username: 'admin',
    password: 'password',
    device_path: '/dev/disk1',
    volume_capacity: 1,
    storage_class: 'metalk8s',
    volume_label_name: 'kubernetest.io/name',
    volume_label_value: 'test',
  },
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'junit/cypress-junit.xml',
    toConsole: true,
  },
  chromeWebSecurity: false,
  viewportWidth: 1440,
  viewportHeight: 900,
  defaultCommandTimeout: 30000,
  experimentalFetchPolyfill: true,
  e2e: {
    // Nous avons importé vos anciens plugins Cypress ici.
    // Vous pouvez éventuellement nettoyer cela plus tard.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js')(on, config);
    },
    baseUrl: 'http://localhost:8084',
  },
});
