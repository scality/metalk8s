# Example Solution for MetalK8s

Basic demo of how to package a Solution for [MetalK8s].

To build the ISO of this Solution, you will need to have installed:

- [`make`][GNU Make], to run the buildchain
- [`docker`][Docker] 17.03 or higher, to build images
- [`skopeo`][Skopeo] 0.1.19 or higher, to save images into the desired format
- [`hardlink`][hardlink], to deduplicate image layers
- [`go`][Go] 1.12 or higher, and [`operator-sdk`][Operator SDK] 0.17 or higher,
  to build the Operator
- `mkisofs` to generate the ISO

Once all of these are installed, just run `make iso`. The generated ISO will be
accessible at `_build/root/example-solution-<version>.iso`.

For iterative development, the `Makefile` provides intermediate targets,
including:

- `make images`, to build, save, and deduplicate image layers
- `make`, or `make all`, to generate the contents of the ISO without building
  the ISO itself (visible under `_build/root`)
- `make operator` and `make ui`, to generate/copy the various Kubernetes
  manifests used to deploy the Operator and the UI, respectively

**Note**: if within `$GOPATH/src`, you need to enable Go modules:
`GO111MODULE=on make [<target> ...]`.

[Docker]:       https://www.docker.com/
[GNU Make]:     https://www.gnu.org/software/make/
[Go]:           https://golang.org/
[hardlink]:     https://jak-linux.org/projects/hardlink/
[MetalK8s]:     https://github.com/scality/metalk8s/
[Operator SDK]: https://github.com/operator-framework/operator-sdk/
[Skopeo]:       https://github.com/containers/skopeo/

