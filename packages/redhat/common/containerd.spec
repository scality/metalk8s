%global goipath github.com/containerd/containerd
Version:        1.6.0

%if %{defined fedora}
%gometa
%ifnarch %{arm}
%bcond_without tests
%endif
%else
ExclusiveArch: %{?go_arches:%{go_arches}}%{!?go_arches:%{ix86} x86_64 %{arm} aarch64 ppc64le s390x %{mips}}
%global debug_package %{nil}
%global gourl https://%{goipath}
%global gosource %{gourl}/archive/refs/tags/v%{version}.tar.gz
%define gobuildroot %{expand:
GO_BUILD_PATH=$PWD/_build
install -m 0755 -vd $(dirname $GO_BUILD_PATH/src/%{goipath})
ln -fs $PWD $GO_BUILD_PATH/src/%{goipath}
cd $GO_BUILD_PATH/src/%{goipath}
install -m 0755 -vd _bin
export PATH=$PWD/_bin${PATH:+:$PATH}
export GOPATH=$GO_BUILD_PATH:%{gopath}
}
%define gobuild(o:) %{expand:
%global _dwz_low_mem_die_limit 0
%ifnarch ppc64
go build -buildmode pie -compiler gc -tags="rpm_crashtraceback ${BUILDTAGS:-seccomp %{!?el7:no_btrfs}}" -ldflags "${LDFLAGS:-} -B 0x$(head -c20 /dev/urandom|od -An -tx1|tr -d ' \\n') -extldflags '%__global_ldflags %{?__golang_extldflags}'" -a -v -x %{?**};
%else
go build -compiler gc -tags="rpm_crashtraceback ${BUILDTAGS:-seccomp %{!?el7:no_btrfs}}" -ldflags "${LDFLAGS:-} -B 0x$(head -c20 /dev/urandom|od -An -tx1|tr -d ' \\n') -extldflags '%__global_ldflags %{?__golang_extldflags}'" -a -v -x %{?**};
%endif
}
%endif


Name:           containerd
Release:        1%{?dist}
Summary:        An industry-standard container runtime
License:        ASL 2.0
URL:            https://containerd.io
Source0:        %{gosource}
Source1:        containerd.service
Source2:        containerd.toml
%if 0%{?el7}
Source3:        60-containerd.conf
%endif
# Carve out code requiring github.com/Microsoft/hcsshim
Patch0:         0001-Revert-commit-for-Windows-metrics.patch

# NOTE: We do not require golang as we do not rely on the package to install it
# BuildRequires:  golang >= 1.10
%if 0%{?el7}
BuildRequires:  btrfs-progs-devel
BuildRequires:  go-md2man
%endif
BuildRequires:  libseccomp-devel
BuildRequires:  systemd
%{?systemd_requires}
Requires:       runc

# vendored libraries
# From github.com/containerd/containerd repository, checkout the corresponding version and run:
# go list -m -f '{{ if not .Main }}{{.Path }} {{ .Version }}{{ end }}' -u all 2> /dev/null \
#     | awk '{ s = split($2, v, "-"); print "Provides:       bundled(golang("$1")) = "v[s] }'
Provides:       bundled(golang(bazil.org/fuse)) = 5883e5a4b512
Provides:       bundled(golang(cloud.google.com/go)) = v0.81.0
Provides:       bundled(golang(cloud.google.com/go/bigquery)) = v1.8.0
Provides:       bundled(golang(cloud.google.com/go/datastore)) = v1.1.0
Provides:       bundled(golang(cloud.google.com/go/firestore)) = v1.1.0
Provides:       bundled(golang(cloud.google.com/go/pubsub)) = v1.3.1
Provides:       bundled(golang(cloud.google.com/go/storage)) = v1.10.0
Provides:       bundled(golang(dmitri.shuralyov.com/gpu/mtl)) = 666a987793e9
Provides:       bundled(golang(github.com/AdaLogics/go-fuzz-headers)) = 6c3934b029d8
Provides:       bundled(golang(github.com/Azure/go-ansiterm)) = d185dfc1b5a1
Provides:       bundled(golang(github.com/Azure/go-autorest)) = v14.2.0+incompatible
Provides:       bundled(golang(github.com/Azure/go-autorest/autorest)) = v0.11.18
Provides:       bundled(golang(github.com/Azure/go-autorest/autorest/adal)) = v0.9.13
Provides:       bundled(golang(github.com/Azure/go-autorest/autorest/date)) = v0.3.0
Provides:       bundled(golang(github.com/Azure/go-autorest/autorest/mocks)) = v0.4.1
Provides:       bundled(golang(github.com/Azure/go-autorest/logger)) = v0.2.1
Provides:       bundled(golang(github.com/Azure/go-autorest/tracing)) = v0.6.0
Provides:       bundled(golang(github.com/BurntSushi/toml)) = v0.3.1
Provides:       bundled(golang(github.com/BurntSushi/xgb)) = 27f122750802
Provides:       bundled(golang(github.com/Microsoft/go-winio)) = v0.5.1
Provides:       bundled(golang(github.com/Microsoft/hcsshim)) = v0.9.2
Provides:       bundled(golang(github.com/NYTimes/gziphandler)) = v1.1.1
Provides:       bundled(golang(github.com/OneOfOne/xxhash)) = v1.2.2
Provides:       bundled(golang(github.com/PuerkitoBio/purell)) = v1.1.1
Provides:       bundled(golang(github.com/PuerkitoBio/urlesc)) = de5bf2ad4578
Provides:       bundled(golang(github.com/alecthomas/template)) = fb15b899a751
Provides:       bundled(golang(github.com/alecthomas/units)) = f65c72e2690d
Provides:       bundled(golang(github.com/alexflint/go-filemutex)) = v1.1.0
Provides:       bundled(golang(github.com/antihax/optional)) = v1.0.0
Provides:       bundled(golang(github.com/armon/circbuf)) = bbbad097214e
Provides:       bundled(golang(github.com/armon/consul-api)) = eb2c6b5be1b6
Provides:       bundled(golang(github.com/armon/go-metrics)) = f0300d1749da
Provides:       bundled(golang(github.com/armon/go-radix)) = 7fddfc383310
Provides:       bundled(golang(github.com/asaskevich/govalidator)) = f61b66f89f4a
Provides:       bundled(golang(github.com/benbjohnson/clock)) = v1.0.3
Provides:       bundled(golang(github.com/beorn7/perks)) = v1.0.1
Provides:       bundled(golang(github.com/bgentry/speakeasy)) = v0.1.0
Provides:       bundled(golang(github.com/bits-and-blooms/bitset)) = v1.2.0
Provides:       bundled(golang(github.com/bketelsen/crypt)) = 5cbc8cc4026c
Provides:       bundled(golang(github.com/blang/semver)) = v3.5.1+incompatible
Provides:       bundled(golang(github.com/buger/jsonparser)) = v1.1.1
Provides:       bundled(golang(github.com/cenkalti/backoff/v4)) = v4.1.2
Provides:       bundled(golang(github.com/census-instrumentation/opencensus-proto)) = v0.2.1
Provides:       bundled(golang(github.com/certifi/gocertifi)) = 2c3bb06c6054
Provides:       bundled(golang(github.com/cespare/xxhash)) = v1.1.0
Provides:       bundled(golang(github.com/cespare/xxhash/v2)) = v2.1.2
Provides:       bundled(golang(github.com/checkpoint-restore/go-criu/v5)) = v5.3.0
Provides:       bundled(golang(github.com/chzyer/logex)) = v1.1.10
Provides:       bundled(golang(github.com/chzyer/readline)) = 2972be24d48e
Provides:       bundled(golang(github.com/chzyer/test)) = a1ea475d72b1
Provides:       bundled(golang(github.com/cilium/ebpf)) = v0.7.0
Provides:       bundled(golang(github.com/client9/misspell)) = v0.3.4
Provides:       bundled(golang(github.com/cncf/udpa/go)) = 04548b0d99d4
Provides:       bundled(golang(github.com/cncf/xds/go)) = cb28da3451f1
Provides:       bundled(golang(github.com/cockroachdb/datadriven)) = bf6692d28da5
Provides:       bundled(golang(github.com/cockroachdb/errors)) = v1.2.4
Provides:       bundled(golang(github.com/cockroachdb/logtags)) = eb05cc24525f
Provides:       bundled(golang(github.com/containerd/aufs)) = v1.0.0
Provides:       bundled(golang(github.com/containerd/btrfs)) = v1.0.0
Provides:       bundled(golang(github.com/containerd/cgroups)) = v1.0.3
Provides:       bundled(golang(github.com/containerd/console)) = v1.0.3
Provides:       bundled(golang(github.com/containerd/continuity)) = v0.2.2
Provides:       bundled(golang(github.com/containerd/fifo)) = v1.0.0
Provides:       bundled(golang(github.com/containerd/go-cni)) = v1.1.3
Provides:       bundled(golang(github.com/containerd/go-runc)) = v1.0.0
Provides:       bundled(golang(github.com/containerd/imgcrypt)) = v1.1.3
Provides:       bundled(golang(github.com/containerd/nri)) = v0.1.0
Provides:       bundled(golang(github.com/containerd/stargz-snapshotter/estargz)) = v0.4.1
Provides:       bundled(golang(github.com/containerd/ttrpc)) = v1.1.0
Provides:       bundled(golang(github.com/containerd/typeurl)) = v1.0.2
Provides:       bundled(golang(github.com/containerd/zfs)) = v1.0.0
Provides:       bundled(golang(github.com/containernetworking/cni)) = v1.0.1
Provides:       bundled(golang(github.com/containernetworking/plugins)) = v1.0.1
Provides:       bundled(golang(github.com/containers/ocicrypt)) = v1.1.2
Provides:       bundled(golang(github.com/coreos/bbolt)) = v1.3.2
Provides:       bundled(golang(github.com/coreos/etcd)) = v3.3.13+incompatible
Provides:       bundled(golang(github.com/coreos/go-iptables)) = v0.6.0
Provides:       bundled(golang(github.com/coreos/go-oidc)) = v2.1.0+incompatible
Provides:       bundled(golang(github.com/coreos/go-semver)) = v0.3.0
Provides:       bundled(golang(github.com/coreos/go-systemd)) = 95778dfbb74e
Provides:       bundled(golang(github.com/coreos/go-systemd/v22)) = v22.3.2
Provides:       bundled(golang(github.com/coreos/pkg)) = 399ea9e2e55f
Provides:       bundled(golang(github.com/cpuguy83/go-md2man/v2)) = v2.0.0
Provides:       bundled(golang(github.com/creack/pty)) = v1.1.11
Provides:       bundled(golang(github.com/cyphar/filepath-securejoin)) = v0.2.3
Provides:       bundled(golang(github.com/d2g/dhcp4)) = a1d1b6c41b1c
Provides:       bundled(golang(github.com/d2g/dhcp4client)) = v1.0.0
Provides:       bundled(golang(github.com/d2g/dhcp4server)) = 7d4a0a7f59a5
Provides:       bundled(golang(github.com/davecgh/go-spew)) = v1.1.1
Provides:       bundled(golang(github.com/dgrijalva/jwt-go)) = v3.2.0+incompatible
Provides:       bundled(golang(github.com/dgryski/go-sip13)) = e10d5fee7954
Provides:       bundled(golang(github.com/docker/cli)) = a8ff7f821017
Provides:       bundled(golang(github.com/docker/distribution)) = v2.7.1+incompatible
Provides:       bundled(golang(github.com/docker/docker)) = a8608b5b67c7
Provides:       bundled(golang(github.com/docker/docker-credential-helpers)) = v0.6.3
Provides:       bundled(golang(github.com/docker/go-connections)) = v0.4.0
Provides:       bundled(golang(github.com/docker/go-events)) = e31b211e4f1c
Provides:       bundled(golang(github.com/docker/go-metrics)) = v0.0.1
Provides:       bundled(golang(github.com/docker/go-units)) = v0.4.0
Provides:       bundled(golang(github.com/docopt/docopt-go)) = ee0de3bc6815
Provides:       bundled(golang(github.com/dustin/go-humanize)) = v1.0.0
Provides:       bundled(golang(github.com/elazarl/goproxy)) = 947c36da3153
Provides:       bundled(golang(github.com/emicklei/go-restful)) = v2.9.5+incompatible
Provides:       bundled(golang(github.com/envoyproxy/go-control-plane)) = cf90f659a021
Provides:       bundled(golang(github.com/envoyproxy/protoc-gen-validate)) = v0.1.0
Provides:       bundled(golang(github.com/evanphx/json-patch)) = v4.11.0+incompatible
Provides:       bundled(golang(github.com/fatih/color)) = v1.7.0
Provides:       bundled(golang(github.com/felixge/httpsnoop)) = v1.0.1
Provides:       bundled(golang(github.com/form3tech-oss/jwt-go)) = v3.2.3+incompatible
Provides:       bundled(golang(github.com/frankban/quicktest)) = v1.11.3
Provides:       bundled(golang(github.com/fsnotify/fsnotify)) = v1.4.9
Provides:       bundled(golang(github.com/getsentry/raven-go)) = v0.2.0
Provides:       bundled(golang(github.com/ghodss/yaml)) = v1.0.0
Provides:       bundled(golang(github.com/go-gl/glfw)) = e6da0acd62b1
Provides:       bundled(golang(github.com/go-gl/glfw/v3.3/glfw)) = 6f7a984d4dc4
Provides:       bundled(golang(github.com/go-kit/kit)) = v0.9.0
Provides:       bundled(golang(github.com/go-kit/log)) = v0.1.0
Provides:       bundled(golang(github.com/go-logfmt/logfmt)) = v0.5.0
Provides:       bundled(golang(github.com/go-logr/logr)) = v1.2.2
Provides:       bundled(golang(github.com/go-logr/stdr)) = v1.2.2
Provides:       bundled(golang(github.com/go-openapi/jsonpointer)) = v0.19.5
Provides:       bundled(golang(github.com/go-openapi/jsonreference)) = v0.19.5
Provides:       bundled(golang(github.com/go-openapi/spec)) = v0.19.3
Provides:       bundled(golang(github.com/go-openapi/swag)) = v0.19.14
Provides:       bundled(golang(github.com/go-stack/stack)) = v1.8.0
Provides:       bundled(golang(github.com/go-task/slim-sprig)) = 348f09dbbbc0
Provides:       bundled(golang(github.com/godbus/dbus/v5)) = v5.0.6
Provides:       bundled(golang(github.com/gogo/googleapis)) = v1.4.0
Provides:       bundled(golang(github.com/gogo/protobuf)) = v1.3.2
Provides:       bundled(golang(github.com/golang/glog)) = 23def4e6c14b
Provides:       bundled(golang(github.com/golang/groupcache)) = 41bb18bfe9da
Provides:       bundled(golang(github.com/golang/mock)) = v1.6.0
Provides:       bundled(golang(github.com/golang/protobuf)) = v1.5.2
Provides:       bundled(golang(github.com/google/btree)) = v1.0.1
Provides:       bundled(golang(github.com/google/go-cmp)) = v0.5.6
Provides:       bundled(golang(github.com/google/go-containerregistry)) = v0.5.1
Provides:       bundled(golang(github.com/google/gofuzz)) = v1.2.0
Provides:       bundled(golang(github.com/google/martian)) = v2.1.0+incompatible
Provides:       bundled(golang(github.com/google/martian/v3)) = v3.1.0
Provides:       bundled(golang(github.com/google/pprof)) = cbba55b83ad5
Provides:       bundled(golang(github.com/google/renameio)) = v0.1.0
Provides:       bundled(golang(github.com/google/uuid)) = v1.2.0
Provides:       bundled(golang(github.com/googleapis/gax-go/v2)) = v2.0.5
Provides:       bundled(golang(github.com/googleapis/gnostic)) = v0.5.5
Provides:       bundled(golang(github.com/gopherjs/gopherjs)) = 0766667cb4d1
Provides:       bundled(golang(github.com/gorilla/mux)) = v1.7.3
Provides:       bundled(golang(github.com/gorilla/websocket)) = v1.4.2
Provides:       bundled(golang(github.com/gregjones/httpcache)) = 9cad4c3443a7
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-middleware)) = v1.3.0
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-prometheus)) = v1.2.0
Provides:       bundled(golang(github.com/grpc-ecosystem/grpc-gateway)) = v1.16.0
Provides:       bundled(golang(github.com/hashicorp/consul/api)) = v1.1.0
Provides:       bundled(golang(github.com/hashicorp/consul/sdk)) = v0.1.1
Provides:       bundled(golang(github.com/hashicorp/errwrap)) = v1.1.0
Provides:       bundled(golang(github.com/hashicorp/go-cleanhttp)) = v0.5.1
Provides:       bundled(golang(github.com/hashicorp/go-immutable-radix)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/go-msgpack)) = v0.5.3
Provides:       bundled(golang(github.com/hashicorp/go-multierror)) = v1.1.1
Provides:       bundled(golang(github.com/hashicorp/go-rootcerts)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/go-sockaddr)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/go-syslog)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/go-uuid)) = v1.0.1
Provides:       bundled(golang(github.com/hashicorp/go.net)) = v0.0.1
Provides:       bundled(golang(github.com/hashicorp/golang-lru)) = v0.5.1
Provides:       bundled(golang(github.com/hashicorp/hcl)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/logutils)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/mdns)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/memberlist)) = v0.1.3
Provides:       bundled(golang(github.com/hashicorp/serf)) = v0.8.2
Provides:       bundled(golang(github.com/hpcloud/tail)) = v1.0.0
Provides:       bundled(golang(github.com/ianlancetaylor/demangle)) = 28f6c0f3b639
Provides:       bundled(golang(github.com/imdario/mergo)) = v0.3.12
Provides:       bundled(golang(github.com/inconshreveable/mousetrap)) = v1.0.0
Provides:       bundled(golang(github.com/intel/goresctrl)) = v0.2.0
Provides:       bundled(golang(github.com/j-keck/arping)) = v1.0.2
Provides:       bundled(golang(github.com/joefitzgerald/rainbow-reporter)) = v0.1.0
Provides:       bundled(golang(github.com/jonboulle/clockwork)) = v0.2.2
Provides:       bundled(golang(github.com/josharian/intern)) = v1.0.0
Provides:       bundled(golang(github.com/jpillora/backoff)) = v1.0.0
Provides:       bundled(golang(github.com/json-iterator/go)) = v1.1.12
Provides:       bundled(golang(github.com/jstemmer/go-junit-report)) = v0.9.1
Provides:       bundled(golang(github.com/jtolds/gls)) = v4.20.0+incompatible
Provides:       bundled(golang(github.com/julienschmidt/httprouter)) = v1.3.0
Provides:       bundled(golang(github.com/kisielk/errcheck)) = v1.5.0
Provides:       bundled(golang(github.com/kisielk/gotool)) = v1.0.0
Provides:       bundled(golang(github.com/klauspost/compress)) = v1.11.13
Provides:       bundled(golang(github.com/konsorten/go-windows-terminal-sequences)) = v1.0.3
Provides:       bundled(golang(github.com/kr/logfmt)) = b84e30acd515
Provides:       bundled(golang(github.com/kr/pretty)) = v0.2.1
Provides:       bundled(golang(github.com/kr/pty)) = v1.1.5
Provides:       bundled(golang(github.com/kr/text)) = v0.2.0
Provides:       bundled(golang(github.com/linuxkit/virtsock)) = f8cee7dfc7a3
Provides:       bundled(golang(github.com/magiconair/properties)) = v1.8.1
Provides:       bundled(golang(github.com/mailru/easyjson)) = v0.7.6
Provides:       bundled(golang(github.com/mattn/go-colorable)) = v0.0.9
Provides:       bundled(golang(github.com/mattn/go-isatty)) = v0.0.3
Provides:       bundled(golang(github.com/mattn/go-shellwords)) = v1.0.12
Provides:       bundled(golang(github.com/matttproud/golang_protobuf_extensions)) = c182affec369
Provides:       bundled(golang(github.com/maxbrunsfeld/counterfeiter/v6)) = v6.2.2
Provides:       bundled(golang(github.com/miekg/dns)) = v1.0.14
Provides:       bundled(golang(github.com/miekg/pkcs11)) = v1.0.3
Provides:       bundled(golang(github.com/mistifyio/go-zfs)) = f784269be439+incompatible
Provides:       bundled(golang(github.com/mitchellh/cli)) = v1.0.0
Provides:       bundled(golang(github.com/mitchellh/go-homedir)) = v1.1.0
Provides:       bundled(golang(github.com/mitchellh/go-testing-interface)) = v1.0.0
Provides:       bundled(golang(github.com/mitchellh/gox)) = v0.4.0
Provides:       bundled(golang(github.com/mitchellh/iochan)) = v1.0.0
Provides:       bundled(golang(github.com/mitchellh/mapstructure)) = v1.1.2
Provides:       bundled(golang(github.com/moby/locker)) = v1.0.1
Provides:       bundled(golang(github.com/moby/spdystream)) = v0.2.0
Provides:       bundled(golang(github.com/moby/sys/mountinfo)) = v0.5.0
Provides:       bundled(golang(github.com/moby/sys/signal)) = v0.6.0
Provides:       bundled(golang(github.com/moby/sys/symlink)) = v0.2.0
Provides:       bundled(golang(github.com/moby/term)) = 9d4ed1856297
Provides:       bundled(golang(github.com/modern-go/concurrent)) = bacd9c7ef1dd
Provides:       bundled(golang(github.com/modern-go/reflect2)) = v1.0.2
Provides:       bundled(golang(github.com/morikuni/aec)) = v1.0.0
Provides:       bundled(golang(github.com/mrunalp/fileutils)) = v0.5.0
Provides:       bundled(golang(github.com/munnerz/goautoneg)) = a7dc8b61c822
Provides:       bundled(golang(github.com/mwitkow/go-conntrack)) = 2f068394615f
Provides:       bundled(golang(github.com/mxk/go-flowrate)) = cca7078d478f
Provides:       bundled(golang(github.com/niemeyer/pretty)) = a10e7caefd8e
Provides:       bundled(golang(github.com/nxadm/tail)) = v1.4.8
Provides:       bundled(golang(github.com/oklog/ulid)) = v1.3.1
Provides:       bundled(golang(github.com/onsi/ginkgo)) = v1.16.4
Provides:       bundled(golang(github.com/onsi/gomega)) = v1.15.0
Provides:       bundled(golang(github.com/opencontainers/go-digest)) = v1.0.0
Provides:       bundled(golang(github.com/opencontainers/image-spec)) = 693428a734f5
Provides:       bundled(golang(github.com/opencontainers/runc)) = v1.1.0
Provides:       bundled(golang(github.com/opencontainers/runtime-spec)) = 1c3f411f0417
Provides:       bundled(golang(github.com/opencontainers/selinux)) = v1.10.0
Provides:       bundled(golang(github.com/opentracing/opentracing-go)) = v1.1.0
Provides:       bundled(golang(github.com/pascaldekloe/goe)) = 57f6aae5913c
Provides:       bundled(golang(github.com/pelletier/go-toml)) = v1.9.3
Provides:       bundled(golang(github.com/peterbourgon/diskv)) = v2.0.1+incompatible
Provides:       bundled(golang(github.com/pkg/errors)) = v0.9.1
Provides:       bundled(golang(github.com/pmezard/go-difflib)) = v1.0.0
Provides:       bundled(golang(github.com/posener/complete)) = v1.1.1
Provides:       bundled(golang(github.com/pquerna/cachecontrol)) = 0dec1b30a021
Provides:       bundled(golang(github.com/prometheus/client_golang)) = v1.11.0
Provides:       bundled(golang(github.com/prometheus/client_model)) = v0.2.0
Provides:       bundled(golang(github.com/prometheus/common)) = v0.30.0
Provides:       bundled(golang(github.com/prometheus/procfs)) = v0.7.3
Provides:       bundled(golang(github.com/prometheus/tsdb)) = v0.7.1
Provides:       bundled(golang(github.com/rogpeppe/fastuuid)) = v1.2.0
Provides:       bundled(golang(github.com/rogpeppe/go-internal)) = v1.3.0
Provides:       bundled(golang(github.com/russross/blackfriday/v2)) = v2.0.1
Provides:       bundled(golang(github.com/ryanuber/columnize)) = 9b3edd62028f
Provides:       bundled(golang(github.com/safchain/ethtool)) = 9aa261dae9b1
Provides:       bundled(golang(github.com/satori/go.uuid)) = v1.2.0
Provides:       bundled(golang(github.com/sclevine/agouti)) = v3.0.0+incompatible
Provides:       bundled(golang(github.com/sclevine/spec)) = v1.2.0
Provides:       bundled(golang(github.com/sean-/seed)) = e2103e2c3529
Provides:       bundled(golang(github.com/seccomp/libseccomp-golang)) = 3879420cc921
Provides:       bundled(golang(github.com/shurcooL/sanitized_anchor_name)) = v1.0.0
Provides:       bundled(golang(github.com/sirupsen/logrus)) = v1.8.1
Provides:       bundled(golang(github.com/smartystreets/assertions)) = b2de0cb4f26d
Provides:       bundled(golang(github.com/smartystreets/goconvey)) = v1.6.4
Provides:       bundled(golang(github.com/soheilhy/cmux)) = v0.1.5
Provides:       bundled(golang(github.com/spaolacci/murmur3)) = f09979ecbc72
Provides:       bundled(golang(github.com/spf13/afero)) = v1.2.2
Provides:       bundled(golang(github.com/spf13/cast)) = v1.3.0
Provides:       bundled(golang(github.com/spf13/cobra)) = v1.1.3
Provides:       bundled(golang(github.com/spf13/jwalterweatherman)) = v1.0.0
Provides:       bundled(golang(github.com/spf13/pflag)) = v1.0.5
Provides:       bundled(golang(github.com/spf13/viper)) = v1.7.0
Provides:       bundled(golang(github.com/stefanberger/go-pkcs11uri)) = 78d3cae3a980
Provides:       bundled(golang(github.com/stoewer/go-strcase)) = v1.2.0
Provides:       bundled(golang(github.com/stretchr/objx)) = v0.2.0
Provides:       bundled(golang(github.com/stretchr/testify)) = v1.7.0
Provides:       bundled(golang(github.com/subosito/gotenv)) = v1.2.0
Provides:       bundled(golang(github.com/syndtr/gocapability)) = 42c35b437635
Provides:       bundled(golang(github.com/tchap/go-patricia)) = v2.2.6+incompatible
Provides:       bundled(golang(github.com/tmc/grpc-websocket-proxy)) = e5319fda7802
Provides:       bundled(golang(github.com/tv42/httpunix)) = 2ba4b9c3382c
Provides:       bundled(golang(github.com/ugorji/go)) = v1.1.4
Provides:       bundled(golang(github.com/urfave/cli)) = v1.22.2
Provides:       bundled(golang(github.com/vishvananda/netlink)) = f5de75959ad5
Provides:       bundled(golang(github.com/vishvananda/netns)) = 2eb08e3e575f
Provides:       bundled(golang(github.com/xiang90/probing)) = 43a291ad63a2
Provides:       bundled(golang(github.com/xordataexchange/crypt)) = b2862e3d0a77
Provides:       bundled(golang(github.com/yuin/goldmark)) = v1.3.5
Provides:       bundled(golang(go.etcd.io/bbolt)) = v1.3.6
Provides:       bundled(golang(go.etcd.io/etcd/api/v3)) = v3.5.0
Provides:       bundled(golang(go.etcd.io/etcd/client/pkg/v3)) = v3.5.0
Provides:       bundled(golang(go.etcd.io/etcd/client/v2)) = v2.305.0
Provides:       bundled(golang(go.etcd.io/etcd/client/v3)) = v3.5.0
Provides:       bundled(golang(go.etcd.io/etcd/pkg/v3)) = v3.5.0
Provides:       bundled(golang(go.etcd.io/etcd/raft/v3)) = v3.5.0
Provides:       bundled(golang(go.etcd.io/etcd/server/v3)) = v3.5.0
Provides:       bundled(golang(go.mozilla.org/pkcs7)) = 432b2356ecb1
Provides:       bundled(golang(go.opencensus.io)) = v0.23.0
Provides:       bundled(golang(go.opentelemetry.io/contrib)) = v0.20.0
Provides:       bundled(golang(go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc)) = v0.28.0
Provides:       bundled(golang(go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp)) = v0.20.0
Provides:       bundled(golang(go.opentelemetry.io/otel)) = v1.3.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp)) = v0.20.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp/internal/retry)) = v1.3.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp/otlptrace)) = v1.3.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc)) = v1.3.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp)) = v1.3.0
Provides:       bundled(golang(go.opentelemetry.io/otel/metric)) = v0.20.0
Provides:       bundled(golang(go.opentelemetry.io/otel/oteltest)) = v0.20.0
Provides:       bundled(golang(go.opentelemetry.io/otel/sdk)) = v1.3.0
Provides:       bundled(golang(go.opentelemetry.io/otel/sdk/export/metric)) = v0.20.0
Provides:       bundled(golang(go.opentelemetry.io/otel/sdk/metric)) = v0.20.0
Provides:       bundled(golang(go.opentelemetry.io/otel/trace)) = v1.3.0
Provides:       bundled(golang(go.opentelemetry.io/proto/otlp)) = v0.11.0
Provides:       bundled(golang(go.uber.org/atomic)) = v1.7.0
Provides:       bundled(golang(go.uber.org/goleak)) = v1.1.12
Provides:       bundled(golang(go.uber.org/multierr)) = v1.6.0
Provides:       bundled(golang(go.uber.org/zap)) = v1.17.0
Provides:       bundled(golang(golang.org/x/crypto)) = 32db794688a5
Provides:       bundled(golang(golang.org/x/exp)) = 6cc2880d07d6
Provides:       bundled(golang(golang.org/x/image)) = cff245a6509b
Provides:       bundled(golang(golang.org/x/lint)) = 83fdc39ff7b5
Provides:       bundled(golang(golang.org/x/mobile)) = d2bd2a29d028
Provides:       bundled(golang(golang.org/x/mod)) = v0.4.2
Provides:       bundled(golang(golang.org/x/net)) = fe4d6282115f
Provides:       bundled(golang(golang.org/x/oauth2)) = 2bc19b11175f
Provides:       bundled(golang(golang.org/x/sync)) = 036812b2e83c
Provides:       bundled(golang(golang.org/x/sys)) = 1d35b9e2eb4e
Provides:       bundled(golang(golang.org/x/term)) = 6886f2dfbf5b
Provides:       bundled(golang(golang.org/x/text)) = v0.3.7
Provides:       bundled(golang(golang.org/x/time)) = 1f47c861a9ac
Provides:       bundled(golang(golang.org/x/tools)) = v0.1.5
Provides:       bundled(golang(golang.org/x/xerrors)) = 5ec99f83aff1
Provides:       bundled(golang(google.golang.org/api)) = v0.43.0
Provides:       bundled(golang(google.golang.org/appengine)) = v1.6.7
Provides:       bundled(golang(google.golang.org/genproto)) = 3a66f561d7aa
Provides:       bundled(golang(google.golang.org/grpc)) = v1.43.0
Provides:       bundled(golang(google.golang.org/protobuf)) = v1.27.1
Provides:       bundled(golang(gopkg.in/alecthomas/kingpin.v2)) = v2.2.6
Provides:       bundled(golang(gopkg.in/check.v1)) = 10cb98267c6c
Provides:       bundled(golang(gopkg.in/errgo.v2)) = v2.1.0
Provides:       bundled(golang(gopkg.in/fsnotify.v1)) = v1.4.7
Provides:       bundled(golang(gopkg.in/inf.v0)) = v0.9.1
Provides:       bundled(golang(gopkg.in/ini.v1)) = v1.51.0
Provides:       bundled(golang(gopkg.in/natefinch/lumberjack.v2)) = v2.0.0
Provides:       bundled(golang(gopkg.in/resty.v1)) = v1.12.0
Provides:       bundled(golang(gopkg.in/square/go-jose.v2)) = v2.5.1
Provides:       bundled(golang(gopkg.in/tomb.v1)) = dd632973f1e7
Provides:       bundled(golang(gopkg.in/yaml.v2)) = v2.4.0
Provides:       bundled(golang(gopkg.in/yaml.v3)) = 496545a6307b
Provides:       bundled(golang(gotest.tools)) = v2.2.0+incompatible
Provides:       bundled(golang(gotest.tools/v3)) = v3.0.3
Provides:       bundled(golang(honnef.co/go/tools)) = 2020.1.4
Provides:       bundled(golang(k8s.io/api)) = v0.22.5
Provides:       bundled(golang(k8s.io/apimachinery)) = v0.22.5
Provides:       bundled(golang(k8s.io/apiserver)) = v0.22.5
Provides:       bundled(golang(k8s.io/client-go)) = v0.22.5
Provides:       bundled(golang(k8s.io/code-generator)) = v0.19.7
Provides:       bundled(golang(k8s.io/component-base)) = v0.22.5
Provides:       bundled(golang(k8s.io/cri-api)) = v0.23.1
Provides:       bundled(golang(k8s.io/gengo)) = 83324d819ded
Provides:       bundled(golang(k8s.io/klog/v2)) = v2.30.0
Provides:       bundled(golang(k8s.io/kube-openapi)) = 20434351676c
Provides:       bundled(golang(k8s.io/utils)) = cb0fa318a74b
Provides:       bundled(golang(rsc.io/binaryregexp)) = v0.2.0
Provides:       bundled(golang(rsc.io/quote/v3)) = v3.1.0
Provides:       bundled(golang(rsc.io/sampler)) = v1.3.0
Provides:       bundled(golang(sigs.k8s.io/apiserver-network-proxy/konnectivity-client)) = v0.0.22
Provides:       bundled(golang(sigs.k8s.io/structured-merge-diff/v4)) = v4.1.2
Provides:       bundled(golang(sigs.k8s.io/yaml)) = v1.2.0


%description
containerd is an industry-standard container runtime with an emphasis on
simplicity, robustness and portability.  It is available as a daemon for Linux
and Windows, which can manage the complete container lifecycle of its host
system: image transfer and storage, container execution and supervision,
low-level storage and network attachments, etc.


%prep
%autosetup -p1
# Used only for generation:
rm -rf cmd/protoc-gen-gogoctrd


%build
%gobuildroot
export LDFLAGS="-X %{goipath}/version.Version=%{version}"
for cmd in cmd/* ; do
  %gobuild -o _bin/$(basename $cmd) %{goipath}/$cmd
done
mkdir _man
go-md2man -in docs/man/containerd-config.8.md -out _man/containerd-config.8
go-md2man -in docs/man/containerd-config.toml.5.md -out _man/containerd-config.toml.5
_bin/gen-manpages containerd.8 _man
_bin/gen-manpages ctr.8 _man
rm _bin/gen-manpages


%install
install -m 0755 -vd                     %{buildroot}%{_bindir}
install -m 0755 -vp _bin/* %{buildroot}%{_bindir}/
install -D -p -m 0644 _man/containerd.8 %{buildroot}%{_mandir}/man1/containerd.8
install -D -p -m 0644 _man/containerd-config.8 %{buildroot}%{_mandir}/man1/containerd-config.8
install -D -p -m 0644 _man/ctr.8 %{buildroot}%{_mandir}/man1/ctr.8
install -D -p -m 0644 _man/containerd-config.toml.5 %{buildroot}%{_mandir}/man5/containerd-config.toml.5
install -D -p -m 0644 %{S:1} %{buildroot}%{_unitdir}/containerd.service
install -D -p -m 0644 %{S:2} %{buildroot}%{_sysconfdir}/containerd/config.toml
%if 0%{?el7}
install -D -p -m 0644 %{S:3} %{buildroot}%{_sysctldir}/60-containerd.conf
%endif

%if %{with tests}
%check
%gochecks -d . -d mount -t snapshots
%endif


%post
%systemd_post containerd.service
%if 0%{?el7}
%sysctl_apply 60-containerd.conf
%endif


%preun
%systemd_preun containerd.service


%postun
%systemd_postun_with_restart containerd.service


%files
%license LICENSE NOTICE
%doc docs ROADMAP.md SCOPE.md code-of-conduct.md BUILDING.md
%doc README.md RELEASES.md
%{_bindir}/*
%{_mandir}/man1/containerd.8*
%{_mandir}/man1/containerd-config.8*
%{_mandir}/man1/ctr.8*
%{_mandir}/man5/containerd-config.toml.5*
%{_unitdir}/containerd.service
%dir %{_sysconfdir}/containerd
%config(noreplace) %{_sysconfdir}/containerd/config.toml
%if 0%{?el7}
%{_sysctldir}/60-containerd.conf
%endif


%changelog
* Mon Feb 21 2022 Teddy Andrieux <teddy.andrieux@scality.com> - 1.6.0-1
- Latest upstream

* Mon Dec 20 2021 Alexandre Allard <alexandre.allard@scality.com> - 1.5.8-1
- Latest upstream

* Thu Jul 29 2021 Nicolas Trangez <nicolas.trangez@scality.com> - 1.4.8-1
- Latest upstream

* Fri Mar 19 2021 Nicolas Trangez <nicolas.trangez@scality.com> - 1.4.3-3
- Only configure 'fs.may_detach_mounts' on EL7

* Fri Mar 19 2021 Nicolas Trangez <nicolas.trangez@scality.com> - 1.4.3-2
- Configure 'fs.may_detach_mounts' sysctl to be '1'

* Tue Dec 1 2020 Nicolas Trangez <nicolas.trangez@scality.com> - 1.4.3-1
- Latest upstream

* Fri Oct 16 2020 Nicolas Trangez <nicolas.trangez@scality.com> - 1.4.1-1
- Update to 1.4.1, based on containerd-1.4.1-1.fc34

* Fri Oct 16 2020 Guillaume Demonet <guillaume.demonet@scality.com> - 1.2.14-2
- Re-enable seccomp support

* Fri Oct 16 2020 Guillaume Demonet <guillaume.demonet@scality.com> - 1.2.14-1
- Latest upstream

* Mon Apr 6 2020 Nicolas Trangez <nicolas.trangez@scality.com> - 1.2.13-2
- Enable seccomp support

* Mon Apr 6 2020 Nicolas Trangez <nicolas.trangez@scality.com> - 1.2.13-1
- Latest upstream

* Tue Feb 26 2019 Carl George <carl@george.computer> - 1.2.4-1
- Latest upstream

* Thu Jan 31 2019 Fedora Release Engineering <releng@fedoraproject.org> - 1.2.1-2
- Rebuilt for https://fedoraproject.org/wiki/Fedora_30_Mass_Rebuild

* Thu Jan 03 2019 Carl George <carl@george.computer> - 1.2.1-1
- Latest upstream
- Run test suite (except on el7 or %%arm)

* Thu Oct 25 2018 Carl George <carl@george.computer> - 1.2.0-1
- Latest upstream

* Mon Aug 13 2018 Carl George <carl@george.computer> - 1.1.2-1
- Latest upstream

* Thu Jul 12 2018 Fedora Release Engineering <releng@fedoraproject.org> - 1.1.0-2
- Rebuilt for https://fedoraproject.org/wiki/Fedora_29_Mass_Rebuild

* Thu Apr 26 2018 Carl George <carl@george.computer> - 1.1.0-1
- Latest upstream
- Build and include man pages

* Wed Apr 04 2018 Carl George <carl@george.computer> - 1.0.3-1
- Latest upstream

* Wed Feb 07 2018 Fedora Release Engineering <releng@fedoraproject.org> - 1.0.1-2
- Rebuilt for https://fedoraproject.org/wiki/Fedora_28_Mass_Rebuild

* Mon Jan 22 2018 Carl George <carl@george.computer> - 1.0.1-1
- Latest upstream

* Wed Dec 06 2017 Carl George <carl@george.computer> - 1.0.0-1
- Latest upstream

* Fri Nov 10 2017 Carl George <carl@george.computer> - 1.0.0-0.5.beta.3
- Latest upstream

* Thu Oct 19 2017 Carl George <carl@george.computer> - 1.0.0-0.4.beta.2
- Own /etc/containerd

* Thu Oct 12 2017 Carl George <carl@george.computer> - 1.0.0-0.3.beta.2
- Latest upstream
- Require runc 1.0.0 https://github.com/containerd/containerd/issues/1508#issuecomment-335566293

* Mon Oct 09 2017 Carl George <carl@george.computer> - 1.0.0-0.2.beta.1
- Add provides for vendored dependencies
- Add ctr command

* Wed Oct 04 2017 Carl George <carl@george.computer> - 1.0.0-0.1.beta.1
- Initial package
