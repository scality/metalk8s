Simple tool to get the kubernetes control plane manifests deployed by kubeadm for a
specific version

## Building

Build the docker container for the Kubernetes version you want

```shell
K8S_SHORT_VERSION=<kube short version, e.g.: "1.26">
docker build "$(git rev-parse --show-toplevel)/tools/get-kubeadm-manifests" --build-arg "K8S_SHORT_VERSION=$K8S_SHORT_VERSION" -t "metalk8s-kubeadm:$K8S_SHORT_VERSION"
```

## Get Kubernetes control plane manifests

To retrieve the various Kubernetes control plane manifests,
you must run the previously built container.

```shell
docker run -it --rm "metalk8s-kubeadm:$K8S_SHORT_VERSION"
```
