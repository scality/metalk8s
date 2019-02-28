This project is POC Web App using Scality shared UI "scality-ui".
This POC contains:
- Dex Auth using redux-oidc
- K8s API server calls using https://github.com/scality/kubernetes-client-javascript
- ThemeProvider(only color)

To test:
- checkout the branch
- cd ui
- npm install

- cd node_modules/scality-ui
- npm install
- npm run build
- rm -rf node_modules (in node_modules/scality-ui)
Note: the 4 above steps will be built in the CI

- Open browser, surf to REACT_APP_OIDC_PROVIDER url, accept TLS certificate
- In same browser, surf to REACT_APP_API_SERVER url, accept TLS certificate
Note: to solve self-signed certificate issue (known issue)

- go back to ui
- REACT_APP_OIDC_PROVIDER="TO_ADD" REACT_APP_API_SERVER="TO_ADD" npm run start (you need VPN up)


