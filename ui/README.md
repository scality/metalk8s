# Metalk8s UI

## Prerequisites 

node v14+
npm v6
docker (optional, but recommended)

## Install dependencies

```sh
$ npm install
```

## Run locally with a [metalk8s cluster already running](https://metal-k8s.readthedocs.io/en/latest/developer/running/cluster.html#)

In `webpack.dev.js` edit the value of `controlPlaneIP` and provide your cluster bootstrap node's control plane IP. You can get it by running:

```sh
# salt-call grains.get metalk8s:control_plane_ip
```

Then run the UI with :

```sh
$ npm run start
```

This will first start `<root>/shell-ui` in Docker container and expose it on port 8084 and then will start the Metalk8s UI in dev mode.
If you don't have Docker installed on your machine you can alternatively install `<root>/shell-ui` dependencies via running `npm install` in 
that folder and then run `npm run build`. Then serve statically the content of the `<root>/shell-ui/build` folder on the port 8084. You can pick
whichever other port you want but would then have to change this port in `webpack.dev.js` in the proxy section.

## Build

```sh
$ npm run build
```

## Tests

```sh
$ npm run test
```

## Static typing analysis

```sh
$ npm run flow
```
