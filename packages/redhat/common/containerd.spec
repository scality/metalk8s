%global goipath github.com/containerd/containerd
Version:        1.6.36

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
go build -buildmode pie -compiler gc -tags="rpm_crashtraceback ${BUILDTAGS:-seccomp no_btrfs}" -ldflags "${LDFLAGS:-} -B 0x$(head -c20 /dev/urandom|od -An -tx1|tr -d ' \\n') -extldflags '%__global_ldflags %{?__golang_extldflags}'" -a -v -x %{?**};
%else
go build -compiler gc -tags="rpm_crashtraceback ${BUILDTAGS:-seccomp no_btrfs}" -ldflags "${LDFLAGS:-} -B 0x$(head -c20 /dev/urandom|od -An -tx1|tr -d ' \\n') -extldflags '%__global_ldflags %{?__golang_extldflags}'" -a -v -x %{?**};
%endif
}
%endif


Name:           containerd
Release:        2%{?dist}
Summary:        An industry-standard container runtime
License:        ASL 2.0
URL:            https://containerd.io
Source0:        %{gosource}
Source1:        containerd.service
Source2:        containerd.toml
# Carve out code requiring github.com/Microsoft/hcsshim
Patch0:         0001-Revert-commit-for-Windows-metrics.patch

# NOTE: We do not require golang as we do not rely on the package to install it
# BuildRequires:  golang >= 1.10
BuildRequires:  libseccomp-devel
BuildRequires:  systemd
%{?systemd_requires}
# NOTE: A bug in runc 1.1.3 seems to cause issues with "exec" in containers
#       See https://github.com/containerd/containerd/issues/7219
Requires:       (runc < 1:1.1.3 or runc > 1:1.1.3)

# vendored libraries
# From github.com/containerd/containerd repository, checkout the corresponding version and run:
# go list -m -mod=mod -f '{{ if not .Main }}{{.Path }} {{ .Version }}{{ end }}' -u all 2> /dev/null \
#     | awk '{ s = split($2, v, "-"); print "Provides:       bundled(golang("$1")) = "v[s] }'
Provides:       bundled(golang(buf.build/gen/go/bufbuild/protovalidate/protocolbuffers/go)) = 1c33ebd9ecfa.1
Provides:       bundled(golang(cel.dev/expr)) = v0.16.0
Provides:       bundled(golang(cloud.google.com/go)) = v0.110.0
Provides:       bundled(golang(cloud.google.com/go/accessapproval)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/accesscontextmanager)) = v1.7.0
Provides:       bundled(golang(cloud.google.com/go/aiplatform)) = v1.37.0
Provides:       bundled(golang(cloud.google.com/go/analytics)) = v0.19.0
Provides:       bundled(golang(cloud.google.com/go/apigateway)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/apigeeconnect)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/apigeeregistry)) = v0.6.0
Provides:       bundled(golang(cloud.google.com/go/apikeys)) = v0.6.0
Provides:       bundled(golang(cloud.google.com/go/appengine)) = v1.7.1
Provides:       bundled(golang(cloud.google.com/go/area120)) = v0.7.1
Provides:       bundled(golang(cloud.google.com/go/artifactregistry)) = v1.13.0
Provides:       bundled(golang(cloud.google.com/go/asset)) = v1.13.0
Provides:       bundled(golang(cloud.google.com/go/assuredworkloads)) = v1.10.0
Provides:       bundled(golang(cloud.google.com/go/automl)) = v1.12.0
Provides:       bundled(golang(cloud.google.com/go/baremetalsolution)) = v0.5.0
Provides:       bundled(golang(cloud.google.com/go/batch)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/beyondcorp)) = v0.5.0
Provides:       bundled(golang(cloud.google.com/go/bigquery)) = v1.50.0
Provides:       bundled(golang(cloud.google.com/go/billing)) = v1.13.0
Provides:       bundled(golang(cloud.google.com/go/binaryauthorization)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/certificatemanager)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/channel)) = v1.12.0
Provides:       bundled(golang(cloud.google.com/go/cloudbuild)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/clouddms)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/cloudtasks)) = v1.10.0
Provides:       bundled(golang(cloud.google.com/go/compute)) = v1.23.4
Provides:       bundled(golang(cloud.google.com/go/compute/metadata)) = v0.5.0
Provides:       bundled(golang(cloud.google.com/go/contactcenterinsights)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/container)) = v1.15.0
Provides:       bundled(golang(cloud.google.com/go/containeranalysis)) = v0.9.0
Provides:       bundled(golang(cloud.google.com/go/datacatalog)) = v1.13.0
Provides:       bundled(golang(cloud.google.com/go/dataflow)) = v0.8.0
Provides:       bundled(golang(cloud.google.com/go/dataform)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/datafusion)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/datalabeling)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/dataplex)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/dataproc)) = v1.12.0
Provides:       bundled(golang(cloud.google.com/go/dataqna)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/datastore)) = v1.11.0
Provides:       bundled(golang(cloud.google.com/go/datastream)) = v1.7.0
Provides:       bundled(golang(cloud.google.com/go/deploy)) = v1.8.0
Provides:       bundled(golang(cloud.google.com/go/dialogflow)) = v1.32.0
Provides:       bundled(golang(cloud.google.com/go/dlp)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/documentai)) = v1.18.0
Provides:       bundled(golang(cloud.google.com/go/domains)) = v0.8.0
Provides:       bundled(golang(cloud.google.com/go/edgecontainer)) = v1.0.0
Provides:       bundled(golang(cloud.google.com/go/errorreporting)) = v0.3.0
Provides:       bundled(golang(cloud.google.com/go/essentialcontacts)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/eventarc)) = v1.11.0
Provides:       bundled(golang(cloud.google.com/go/filestore)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/firestore)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/functions)) = v1.13.0
Provides:       bundled(golang(cloud.google.com/go/gaming)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/gkebackup)) = v0.4.0
Provides:       bundled(golang(cloud.google.com/go/gkeconnect)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/gkehub)) = v0.12.0
Provides:       bundled(golang(cloud.google.com/go/gkemulticloud)) = v0.5.0
Provides:       bundled(golang(cloud.google.com/go/grafeas)) = v0.2.0
Provides:       bundled(golang(cloud.google.com/go/gsuiteaddons)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/iam)) = v0.13.0
Provides:       bundled(golang(cloud.google.com/go/iap)) = v1.7.1
Provides:       bundled(golang(cloud.google.com/go/ids)) = v1.3.0
Provides:       bundled(golang(cloud.google.com/go/iot)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/kms)) = v1.10.1
Provides:       bundled(golang(cloud.google.com/go/language)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/lifesciences)) = v0.8.0
Provides:       bundled(golang(cloud.google.com/go/logging)) = v1.7.0
Provides:       bundled(golang(cloud.google.com/go/longrunning)) = v0.4.1
Provides:       bundled(golang(cloud.google.com/go/managedidentities)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/maps)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/mediatranslation)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/memcache)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/metastore)) = v1.10.0
Provides:       bundled(golang(cloud.google.com/go/monitoring)) = v1.13.0
Provides:       bundled(golang(cloud.google.com/go/networkconnectivity)) = v1.11.0
Provides:       bundled(golang(cloud.google.com/go/networkmanagement)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/networksecurity)) = v0.8.0
Provides:       bundled(golang(cloud.google.com/go/notebooks)) = v1.8.0
Provides:       bundled(golang(cloud.google.com/go/optimization)) = v1.3.1
Provides:       bundled(golang(cloud.google.com/go/orchestration)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/orgpolicy)) = v1.10.0
Provides:       bundled(golang(cloud.google.com/go/osconfig)) = v1.11.0
Provides:       bundled(golang(cloud.google.com/go/oslogin)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/phishingprotection)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/policytroubleshooter)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/privatecatalog)) = v0.8.0
Provides:       bundled(golang(cloud.google.com/go/pubsub)) = v1.30.0
Provides:       bundled(golang(cloud.google.com/go/pubsublite)) = v1.7.0
Provides:       bundled(golang(cloud.google.com/go/recaptchaenterprise)) = v1.3.1
Provides:       bundled(golang(cloud.google.com/go/recaptchaenterprise/v2)) = v2.7.0
Provides:       bundled(golang(cloud.google.com/go/recommendationengine)) = v0.7.0
Provides:       bundled(golang(cloud.google.com/go/recommender)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/redis)) = v1.11.0
Provides:       bundled(golang(cloud.google.com/go/resourcemanager)) = v1.7.0
Provides:       bundled(golang(cloud.google.com/go/resourcesettings)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/retail)) = v1.12.0
Provides:       bundled(golang(cloud.google.com/go/run)) = v0.9.0
Provides:       bundled(golang(cloud.google.com/go/scheduler)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/secretmanager)) = v1.10.0
Provides:       bundled(golang(cloud.google.com/go/security)) = v1.13.0
Provides:       bundled(golang(cloud.google.com/go/securitycenter)) = v1.19.0
Provides:       bundled(golang(cloud.google.com/go/servicecontrol)) = v1.11.1
Provides:       bundled(golang(cloud.google.com/go/servicedirectory)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/servicemanagement)) = v1.8.0
Provides:       bundled(golang(cloud.google.com/go/serviceusage)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/shell)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/spanner)) = v1.45.0
Provides:       bundled(golang(cloud.google.com/go/speech)) = v1.15.0
Provides:       bundled(golang(cloud.google.com/go/storage)) = v1.29.0
Provides:       bundled(golang(cloud.google.com/go/storagetransfer)) = v1.8.0
Provides:       bundled(golang(cloud.google.com/go/talent)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/texttospeech)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/tpu)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/trace)) = v1.9.0
Provides:       bundled(golang(cloud.google.com/go/translate)) = v1.7.0
Provides:       bundled(golang(cloud.google.com/go/video)) = v1.15.0
Provides:       bundled(golang(cloud.google.com/go/videointelligence)) = v1.10.0
Provides:       bundled(golang(cloud.google.com/go/vision)) = v1.2.0
Provides:       bundled(golang(cloud.google.com/go/vision/v2)) = v2.7.0
Provides:       bundled(golang(cloud.google.com/go/vmmigration)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/vmwareengine)) = v0.3.0
Provides:       bundled(golang(cloud.google.com/go/vpcaccess)) = v1.6.0
Provides:       bundled(golang(cloud.google.com/go/webrisk)) = v1.8.0
Provides:       bundled(golang(cloud.google.com/go/websecurityscanner)) = v1.5.0
Provides:       bundled(golang(cloud.google.com/go/workflows)) = v1.10.0
Provides:       bundled(golang(dario.cat/mergo)) = v1.0.1
Provides:       bundled(golang(dmitri.shuralyov.com/gpu/mtl)) = 666a987793e9
Provides:       bundled(golang(gioui.org)) = 57750fc8a0a6
Provides:       bundled(golang(git.sr.ht/~sbinet/gg)) = v0.3.1
Provides:       bundled(golang(github.com/AdaLogics/go-fuzz-headers)) = ced1acdcaa24
Provides:       bundled(golang(github.com/AdamKorcz/go-118-fuzz-build)) = 8075edf89bb0
Provides:       bundled(golang(github.com/Azure/go-ansiterm)) = 306776ec8161
Provides:       bundled(golang(github.com/BurntSushi/toml)) = v1.4.0
Provides:       bundled(golang(github.com/BurntSushi/xgb)) = 27f122750802
Provides:       bundled(golang(github.com/JohnCGriffin/overflow)) = 46fa312c352c
Provides:       bundled(golang(github.com/Microsoft/cosesign1go)) = v1.2.0
Provides:       bundled(golang(github.com/Microsoft/didx509go)) = v0.0.3
Provides:       bundled(golang(github.com/Microsoft/go-winio)) = v0.6.2
Provides:       bundled(golang(github.com/Microsoft/hcsshim)) = v0.12.7
Provides:       bundled(golang(github.com/NYTimes/gziphandler)) = v1.1.1
Provides:       bundled(golang(github.com/OneOfOne/xxhash)) = v1.2.8
Provides:       bundled(golang(github.com/agnivade/levenshtein)) = v1.1.1
Provides:       bundled(golang(github.com/ajstarks/deck)) = 30c9fc6549a9
Provides:       bundled(golang(github.com/ajstarks/deck/generate)) = c3f852c02e19
Provides:       bundled(golang(github.com/ajstarks/svgo)) = 1546f124cd8b
Provides:       bundled(golang(github.com/akavel/rsrc)) = v0.10.2
Provides:       bundled(golang(github.com/alecthomas/kingpin/v2)) = v2.4.0
Provides:       bundled(golang(github.com/alecthomas/template)) = a0175ee3bccc
Provides:       bundled(golang(github.com/alecthomas/units)) = b94a6e3cc137
Provides:       bundled(golang(github.com/alexflint/go-filemutex)) = v1.3.0
Provides:       bundled(golang(github.com/andybalholm/brotli)) = v1.0.4
Provides:       bundled(golang(github.com/antihax/optional)) = v1.0.0
Provides:       bundled(golang(github.com/antlr/antlr4/runtime/Go/antlr/v4)) = 5d1fd1a340c9
Provides:       bundled(golang(github.com/antlr4-go/antlr/v4)) = v4.13.0
Provides:       bundled(golang(github.com/apache/arrow/go/v10)) = v10.0.1
Provides:       bundled(golang(github.com/apache/arrow/go/v11)) = v11.0.0
Provides:       bundled(golang(github.com/apache/thrift)) = v0.16.0
Provides:       bundled(golang(github.com/armon/go-socks5)) = e75332964ef5
Provides:       bundled(golang(github.com/asaskevich/govalidator)) = f61b66f89f4a
Provides:       bundled(golang(github.com/beorn7/perks)) = v1.0.1
Provides:       bundled(golang(github.com/blang/semver/v4)) = v4.0.0
Provides:       bundled(golang(github.com/boombuler/barcode)) = v1.0.1
Provides:       bundled(golang(github.com/bufbuild/protovalidate-go)) = v0.2.1
Provides:       bundled(golang(github.com/buger/jsonparser)) = v1.1.1
Provides:       bundled(golang(github.com/cenkalti/backoff/v4)) = v4.3.0
Provides:       bundled(golang(github.com/census-instrumentation/opencensus-proto)) = v0.4.1
Provides:       bundled(golang(github.com/cespare/xxhash)) = v1.1.0
Provides:       bundled(golang(github.com/cespare/xxhash/v2)) = v2.3.0
Provides:       bundled(golang(github.com/checkpoint-restore/checkpointctl)) = v1.2.1
Provides:       bundled(golang(github.com/checkpoint-restore/go-criu/v7)) = v7.2.0
Provides:       bundled(golang(github.com/chzyer/logex)) = v1.1.10
Provides:       bundled(golang(github.com/chzyer/readline)) = 2972be24d48e
Provides:       bundled(golang(github.com/chzyer/test)) = a1ea475d72b1
Provides:       bundled(golang(github.com/cilium/ebpf)) = v0.11.0
Provides:       bundled(golang(github.com/client9/misspell)) = v0.3.4
Provides:       bundled(golang(github.com/cncf/udpa/go)) = c52dc94e7fbe
Provides:       bundled(golang(github.com/cncf/xds/go)) = 024c85f92f20
Provides:       bundled(golang(github.com/containerd/btrfs/v2)) = v2.0.0
Provides:       bundled(golang(github.com/containerd/cgroups/v3)) = v3.0.3
Provides:       bundled(golang(github.com/containerd/console)) = v1.0.4
Provides:       bundled(golang(github.com/containerd/containerd)) = v1.7.21
Provides:       bundled(golang(github.com/containerd/containerd/api)) = rc.3
Provides:       bundled(golang(github.com/containerd/continuity)) = v0.4.3
Provides:       bundled(golang(github.com/containerd/errdefs)) = v0.1.0
Provides:       bundled(golang(github.com/containerd/fifo)) = v1.1.0
Provides:       bundled(golang(github.com/containerd/go-cni)) = v1.1.10
Provides:       bundled(golang(github.com/containerd/go-runc)) = v1.1.0
Provides:       bundled(golang(github.com/containerd/imgcrypt)) = rc1
Provides:       bundled(golang(github.com/containerd/log)) = v0.1.0
Provides:       bundled(golang(github.com/containerd/nri)) = 159f5754db39
Provides:       bundled(golang(github.com/containerd/otelttrpc)) = ea5083fda723
Provides:       bundled(golang(github.com/containerd/platforms)) = v0.2.1
Provides:       bundled(golang(github.com/containerd/plugin)) = v0.1.0
Provides:       bundled(golang(github.com/containerd/protobuild)) = v0.3.0
Provides:       bundled(golang(github.com/containerd/stargz-snapshotter/estargz)) = v0.14.3
Provides:       bundled(golang(github.com/containerd/ttrpc)) = b5cd6e4b3287
Provides:       bundled(golang(github.com/containerd/typeurl/v2)) = v2.2.0
Provides:       bundled(golang(github.com/containernetworking/cni)) = v1.2.3
Provides:       bundled(golang(github.com/containernetworking/plugins)) = v1.5.1
Provides:       bundled(golang(github.com/containers/ocicrypt)) = v1.2.0
Provides:       bundled(golang(github.com/containers/storage)) = v1.54.0
Provides:       bundled(golang(github.com/coreos/go-iptables)) = v0.7.0
Provides:       bundled(golang(github.com/coreos/go-oidc)) = v2.2.1+incompatible
Provides:       bundled(golang(github.com/coreos/go-semver)) = v0.3.1
Provides:       bundled(golang(github.com/coreos/go-systemd/v22)) = v22.5.0
Provides:       bundled(golang(github.com/cpuguy83/go-md2man/v2)) = v2.0.5
Provides:       bundled(golang(github.com/creack/pty)) = v1.1.9
Provides:       bundled(golang(github.com/cyphar/filepath-securejoin)) = v0.2.3
Provides:       bundled(golang(github.com/d2g/dhcp4)) = a1d1b6c41b1c
Provides:       bundled(golang(github.com/d2g/dhcp4client)) = v1.0.0
Provides:       bundled(golang(github.com/d2g/dhcp4server)) = 7d4a0a7f59a5
Provides:       bundled(golang(github.com/d2g/hardwareaddr)) = e7d9fbe030e4
Provides:       bundled(golang(github.com/davecgh/go-spew)) = d8f796af33cc
Provides:       bundled(golang(github.com/decred/dcrd/dcrec/secp256k1/v4)) = v4.2.0
Provides:       bundled(golang(github.com/distribution/reference)) = v0.6.0
Provides:       bundled(golang(github.com/docker/cli)) = v24.0.0+incompatible
Provides:       bundled(golang(github.com/docker/distribution)) = v2.8.2+incompatible
Provides:       bundled(golang(github.com/docker/docker)) = v27.1.1+incompatible
Provides:       bundled(golang(github.com/docker/docker-credential-helpers)) = v0.7.0
Provides:       bundled(golang(github.com/docker/go-connections)) = v0.4.0
Provides:       bundled(golang(github.com/docker/go-events)) = e31b211e4f1c
Provides:       bundled(golang(github.com/docker/go-metrics)) = v0.0.1
Provides:       bundled(golang(github.com/docker/go-units)) = v0.5.0
Provides:       bundled(golang(github.com/docopt/docopt-go)) = ee0de3bc6815
Provides:       bundled(golang(github.com/dustin/go-humanize)) = v1.0.1
Provides:       bundled(golang(github.com/emicklei/go-restful/v3)) = v3.11.0
Provides:       bundled(golang(github.com/envoyproxy/go-control-plane)) = v0.13.0
Provides:       bundled(golang(github.com/envoyproxy/protoc-gen-validate)) = v1.1.0
Provides:       bundled(golang(github.com/felixge/httpsnoop)) = v1.0.4
Provides:       bundled(golang(github.com/fogleman/gg)) = v1.3.0
Provides:       bundled(golang(github.com/frankban/quicktest)) = v1.14.5
Provides:       bundled(golang(github.com/fsnotify/fsnotify)) = v1.7.0
Provides:       bundled(golang(github.com/fxamacker/cbor/v2)) = v2.7.0
Provides:       bundled(golang(github.com/ghodss/yaml)) = v1.0.0
Provides:       bundled(golang(github.com/go-fonts/dejavu)) = v0.1.0
Provides:       bundled(golang(github.com/go-fonts/latin-modern)) = v0.2.0
Provides:       bundled(golang(github.com/go-fonts/liberation)) = v0.2.0
Provides:       bundled(golang(github.com/go-fonts/stix)) = v0.1.0
Provides:       bundled(golang(github.com/go-gl/glfw)) = e6da0acd62b1
Provides:       bundled(golang(github.com/go-gl/glfw/v3.3/glfw)) = 6f7a984d4dc4
Provides:       bundled(golang(github.com/go-ini/ini)) = v1.67.0
Provides:       bundled(golang(github.com/go-jose/go-jose/v4)) = v4.0.2
Provides:       bundled(golang(github.com/go-kit/kit)) = v0.8.0
Provides:       bundled(golang(github.com/go-kit/log)) = v0.2.1
Provides:       bundled(golang(github.com/go-latex/latex)) = c0d11ff05a81
Provides:       bundled(golang(github.com/go-logfmt/logfmt)) = v0.5.1
Provides:       bundled(golang(github.com/go-logr/logr)) = v1.4.2
Provides:       bundled(golang(github.com/go-logr/stdr)) = v1.2.2
Provides:       bundled(golang(github.com/go-logr/zapr)) = v1.3.0
Provides:       bundled(golang(github.com/go-openapi/jsonpointer)) = v0.19.6
Provides:       bundled(golang(github.com/go-openapi/jsonreference)) = v0.20.2
Provides:       bundled(golang(github.com/go-openapi/swag)) = v0.22.4
Provides:       bundled(golang(github.com/go-pdf/fpdf)) = v0.6.0
Provides:       bundled(golang(github.com/go-stack/stack)) = v1.8.0
Provides:       bundled(golang(github.com/go-task/slim-sprig/v3)) = v3.0.0
Provides:       bundled(golang(github.com/gobwas/glob)) = v0.2.3
Provides:       bundled(golang(github.com/goccy/go-json)) = v0.10.2
Provides:       bundled(golang(github.com/godbus/dbus/v5)) = v5.1.0
Provides:       bundled(golang(github.com/gogo/protobuf)) = v1.3.2
Provides:       bundled(golang(github.com/golang-jwt/jwt/v4)) = v4.5.0
Provides:       bundled(golang(github.com/golang/freetype)) = e2365dfdc4a0
Provides:       bundled(golang(github.com/golang/glog)) = v1.2.2
Provides:       bundled(golang(github.com/golang/groupcache)) = 41bb18bfe9da
Provides:       bundled(golang(github.com/golang/mock)) = v1.6.0
Provides:       bundled(golang(github.com/golang/protobuf)) = v1.5.4
Provides:       bundled(golang(github.com/golang/snappy)) = v0.0.4
Provides:       bundled(golang(github.com/google/btree)) = v1.0.1
Provides:       bundled(golang(github.com/google/cel-go)) = v0.20.1
Provides:       bundled(golang(github.com/google/flatbuffers)) = v2.0.8+incompatible
Provides:       bundled(golang(github.com/google/gnostic-models)) = v0.6.8
Provides:       bundled(golang(github.com/google/go-cmp)) = v0.6.0
Provides:       bundled(golang(github.com/google/go-containerregistry)) = v0.20.1
Provides:       bundled(golang(github.com/google/gofuzz)) = v1.2.0
Provides:       bundled(golang(github.com/google/martian)) = v2.1.0+incompatible
Provides:       bundled(golang(github.com/google/martian/v3)) = v3.3.2
Provides:       bundled(golang(github.com/google/pprof)) = 4bfdf5a9a2af
Provides:       bundled(golang(github.com/google/renameio)) = v0.1.0
Provides:       bundled(golang(github.com/google/uuid)) = v1.6.0
Provides:       bundled(golang(github.com/googleapis/enterprise-certificate-proxy)) = v0.2.3
Provides:       bundled(golang(github.com/googleapis/gax-go/v2)) = v2.7.1
Provides:       bundled(golang(github.com/googleapis/go-type-adapters)) = v1.0.0
Provides:       bundled(golang(github.com/googleapis/google-cloud-go-testing)) = bcd43fbb19e8
Provides:       bundled(golang(github.com/gorilla/mux)) = v1.8.1
Provides:       bundled(golang(github.com/gorilla/websocket)) = v1.5.0
Provides:       bundled(golang(github.com/gregjones/httpcache)) = 9cad4c3443a7
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-middleware)) = v1.3.0
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-middleware/providers/prometheus)) = v1.0.1
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-middleware/v2)) = v2.1.0
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-prometheus)) = v1.2.0
Provides:       bundled(golang(github.com/grpc-ecosystem/grpc-gateway)) = v1.16.0
Provides:       bundled(golang(github.com/grpc-ecosystem/grpc-gateway/v2)) = v2.22.0
Provides:       bundled(golang(github.com/hashicorp/errwrap)) = v1.1.0
Provides:       bundled(golang(github.com/hashicorp/go-multierror)) = v1.1.1
Provides:       bundled(golang(github.com/hashicorp/golang-lru)) = v0.5.1
Provides:       bundled(golang(github.com/iancoleman/strcase)) = v0.2.0
Provides:       bundled(golang(github.com/ianlancetaylor/demangle)) = 28f6c0f3b639
Provides:       bundled(golang(github.com/imdario/mergo)) = v0.3.6
Provides:       bundled(golang(github.com/inconshreveable/mousetrap)) = v1.1.0
Provides:       bundled(golang(github.com/intel/goresctrl)) = v0.8.0
Provides:       bundled(golang(github.com/jonboulle/clockwork)) = v0.2.2
Provides:       bundled(golang(github.com/josephspurrier/goversioninfo)) = v1.4.0
Provides:       bundled(golang(github.com/josharian/intern)) = v1.0.0
Provides:       bundled(golang(github.com/jpillora/backoff)) = v1.0.0
Provides:       bundled(golang(github.com/json-iterator/go)) = v1.1.12
Provides:       bundled(golang(github.com/jstemmer/go-junit-report)) = v0.9.1
Provides:       bundled(golang(github.com/julienschmidt/httprouter)) = v1.3.0
Provides:       bundled(golang(github.com/jung-kurt/gofpdf)) = 24315acbbda5
Provides:       bundled(golang(github.com/kballard/go-shellquote)) = 95032a82bc51
Provides:       bundled(golang(github.com/kisielk/errcheck)) = v1.5.0
Provides:       bundled(golang(github.com/kisielk/gotool)) = v1.0.0
Provides:       bundled(golang(github.com/klauspost/asmfmt)) = v1.3.2
Provides:       bundled(golang(github.com/klauspost/compress)) = v1.17.11
Provides:       bundled(golang(github.com/klauspost/cpuid/v2)) = v2.0.9
Provides:       bundled(golang(github.com/klauspost/pgzip)) = v1.2.6
Provides:       bundled(golang(github.com/konsorten/go-windows-terminal-sequences)) = v1.0.1
Provides:       bundled(golang(github.com/kr/fs)) = v0.1.0
Provides:       bundled(golang(github.com/kr/logfmt)) = b84e30acd515
Provides:       bundled(golang(github.com/kr/pretty)) = v0.3.1
Provides:       bundled(golang(github.com/kr/pty)) = v1.1.1
Provides:       bundled(golang(github.com/kr/text)) = v0.2.0
Provides:       bundled(golang(github.com/kylelemons/godebug)) = v1.1.0
Provides:       bundled(golang(github.com/lestrrat-go/backoff/v2)) = v2.0.8
Provides:       bundled(golang(github.com/lestrrat-go/blackmagic)) = v1.0.2
Provides:       bundled(golang(github.com/lestrrat-go/httpcc)) = v1.0.1
Provides:       bundled(golang(github.com/lestrrat-go/iter)) = v1.0.2
Provides:       bundled(golang(github.com/lestrrat-go/jwx)) = v1.2.29
Provides:       bundled(golang(github.com/lestrrat-go/option)) = v1.0.1
Provides:       bundled(golang(github.com/linuxkit/virtsock)) = f8cee7dfc7a3
Provides:       bundled(golang(github.com/lyft/protoc-gen-star)) = v0.6.1
Provides:       bundled(golang(github.com/lyft/protoc-gen-star/v2)) = v2.0.1
Provides:       bundled(golang(github.com/mailru/easyjson)) = v0.7.7
Provides:       bundled(golang(github.com/mattn/go-isatty)) = v0.0.16
Provides:       bundled(golang(github.com/mattn/go-runewidth)) = v0.0.9
Provides:       bundled(golang(github.com/mattn/go-shellwords)) = v1.0.12
Provides:       bundled(golang(github.com/mattn/go-sqlite3)) = v1.14.14
Provides:       bundled(golang(github.com/matttproud/golang_protobuf_extensions)) = v1.0.4
Provides:       bundled(golang(github.com/mdlayher/socket)) = v0.4.1
Provides:       bundled(golang(github.com/mdlayher/vsock)) = v1.2.1
Provides:       bundled(golang(github.com/miekg/pkcs11)) = v1.1.1
Provides:       bundled(golang(github.com/minio/asm2plan9s)) = cdd76441f9d8
Provides:       bundled(golang(github.com/minio/c2goasm)) = 36a3d3bbc4f3
Provides:       bundled(golang(github.com/mitchellh/go-homedir)) = v1.1.0
Provides:       bundled(golang(github.com/mndrix/tap-go)) = 629fa407e90b
Provides:       bundled(golang(github.com/moby/docker-image-spec)) = v1.3.1
Provides:       bundled(golang(github.com/moby/locker)) = v1.0.1
Provides:       bundled(golang(github.com/moby/spdystream)) = v0.4.0
Provides:       bundled(golang(github.com/moby/sys/mountinfo)) = v0.7.2
Provides:       bundled(golang(github.com/moby/sys/sequential)) = v0.6.0
Provides:       bundled(golang(github.com/moby/sys/signal)) = v0.7.1
Provides:       bundled(golang(github.com/moby/sys/symlink)) = v0.3.0
Provides:       bundled(golang(github.com/moby/sys/user)) = v0.3.0
Provides:       bundled(golang(github.com/moby/sys/userns)) = v0.1.0
Provides:       bundled(golang(github.com/moby/term)) = v0.5.0
Provides:       bundled(golang(github.com/modern-go/concurrent)) = bacd9c7ef1dd
Provides:       bundled(golang(github.com/modern-go/reflect2)) = v1.0.2
Provides:       bundled(golang(github.com/mrunalp/fileutils)) = v0.5.0
Provides:       bundled(golang(github.com/munnerz/goautoneg)) = a7dc8b61c822
Provides:       bundled(golang(github.com/mwitkow/go-conntrack)) = 2f068394615f
Provides:       bundled(golang(github.com/mxk/go-flowrate)) = cca7078d478f
Provides:       bundled(golang(github.com/networkplumbing/go-nft)) = v0.4.0
Provides:       bundled(golang(github.com/olekukonko/tablewriter)) = v0.0.5
Provides:       bundled(golang(github.com/onsi/ginkgo/v2)) = v2.19.1
Provides:       bundled(golang(github.com/onsi/gomega)) = v1.34.0
Provides:       bundled(golang(github.com/open-policy-agent/opa)) = v0.68.0
Provides:       bundled(golang(github.com/opencontainers/go-digest)) = v1.0.0
Provides:       bundled(golang(github.com/opencontainers/image-spec)) = v1.1.0
Provides:       bundled(golang(github.com/opencontainers/runc)) = v1.1.14
Provides:       bundled(golang(github.com/opencontainers/runtime-spec)) = v1.2.0
Provides:       bundled(golang(github.com/opencontainers/runtime-tools)) = 2e043c6bd626
Provides:       bundled(golang(github.com/opencontainers/selinux)) = v1.11.0
Provides:       bundled(golang(github.com/pelletier/go-toml)) = v1.9.5
Provides:       bundled(golang(github.com/pelletier/go-toml/v2)) = v2.2.3
Provides:       bundled(golang(github.com/peterbourgon/diskv)) = v2.0.1+incompatible
Provides:       bundled(golang(github.com/phpdave11/gofpdf)) = v1.4.2
Provides:       bundled(golang(github.com/phpdave11/gofpdi)) = v1.0.13
Provides:       bundled(golang(github.com/pierrec/lz4/v4)) = v4.1.15
Provides:       bundled(golang(github.com/pkg/diff)) = 20ebb0f2a09e
Provides:       bundled(golang(github.com/pkg/errors)) = v0.9.1
Provides:       bundled(golang(github.com/pkg/sftp)) = v1.13.1
Provides:       bundled(golang(github.com/planetscale/vtprotobuf)) = 0393e58bdf10
Provides:       bundled(golang(github.com/pmezard/go-difflib)) = 5d4384ee4fb2
Provides:       bundled(golang(github.com/pquerna/cachecontrol)) = v0.1.0
Provides:       bundled(golang(github.com/prometheus/client_golang)) = v1.20.4
Provides:       bundled(golang(github.com/prometheus/client_model)) = v0.6.1
Provides:       bundled(golang(github.com/prometheus/common)) = v0.55.0
Provides:       bundled(golang(github.com/prometheus/procfs)) = v0.15.1
Provides:       bundled(golang(github.com/rcrowley/go-metrics)) = 10cdbea86bc0
Provides:       bundled(golang(github.com/remyoudompheng/bigfft)) = eec4a21b6bb0
Provides:       bundled(golang(github.com/rogpeppe/fastuuid)) = v1.2.0
Provides:       bundled(golang(github.com/rogpeppe/go-internal)) = v1.13.1
Provides:       bundled(golang(github.com/russross/blackfriday)) = v1.6.0
Provides:       bundled(golang(github.com/russross/blackfriday/v2)) = v2.1.0
Provides:       bundled(golang(github.com/ruudk/golang-pdf417)) = a7e3863a1245
Provides:       bundled(golang(github.com/safchain/ethtool)) = v0.4.0
Provides:       bundled(golang(github.com/sirupsen/logrus)) = v1.9.3
Provides:       bundled(golang(github.com/soheilhy/cmux)) = v0.1.5
Provides:       bundled(golang(github.com/spaolacci/murmur3)) = f09979ecbc72
Provides:       bundled(golang(github.com/spf13/afero)) = v1.9.2
Provides:       bundled(golang(github.com/spf13/cobra)) = v1.8.1
Provides:       bundled(golang(github.com/spf13/pflag)) = v1.0.5
Provides:       bundled(golang(github.com/stefanberger/go-pkcs11uri)) = 78d3cae3a980
Provides:       bundled(golang(github.com/stoewer/go-strcase)) = v1.3.0
Provides:       bundled(golang(github.com/stretchr/objx)) = v0.5.2
Provides:       bundled(golang(github.com/stretchr/testify)) = v1.9.0
Provides:       bundled(golang(github.com/syndtr/gocapability)) = 42c35b437635
Provides:       bundled(golang(github.com/tchap/go-patricia/v2)) = v2.3.1
Provides:       bundled(golang(github.com/tmc/grpc-websocket-proxy)) = 673ab2c3ae75
Provides:       bundled(golang(github.com/ulikunitz/xz)) = v0.5.12
Provides:       bundled(golang(github.com/urfave/cli)) = v1.22.15
Provides:       bundled(golang(github.com/urfave/cli/v2)) = v2.27.5
Provides:       bundled(golang(github.com/vbatts/tar-split)) = v0.11.3
Provides:       bundled(golang(github.com/veraison/go-cose)) = v1.1.0
Provides:       bundled(golang(github.com/vishvananda/netlink)) = v1.3.0
Provides:       bundled(golang(github.com/vishvananda/netns)) = v0.0.4
Provides:       bundled(golang(github.com/x448/float16)) = v0.8.4
Provides:       bundled(golang(github.com/xeipuuv/gojsonpointer)) = 02993c407bfb
Provides:       bundled(golang(github.com/xeipuuv/gojsonreference)) = bd5ef7bd5415
Provides:       bundled(golang(github.com/xeipuuv/gojsonschema)) = v1.2.0
Provides:       bundled(golang(github.com/xhit/go-str2duration/v2)) = v2.1.0
Provides:       bundled(golang(github.com/xiang90/probing)) = 43a291ad63a2
Provides:       bundled(golang(github.com/xlab/treeprint)) = v1.2.0
Provides:       bundled(golang(github.com/xrash/smetrics)) = 686a1a2994c1
Provides:       bundled(golang(github.com/yashtewari/glob-intersection)) = v0.2.0
Provides:       bundled(golang(github.com/yuin/goldmark)) = v1.4.13
Provides:       bundled(golang(github.com/zeebo/assert)) = v1.3.0
Provides:       bundled(golang(github.com/zeebo/xxh3)) = v1.0.2
Provides:       bundled(golang(go.etcd.io/bbolt)) = v1.3.11
Provides:       bundled(golang(go.etcd.io/etcd/api/v3)) = v3.5.14
Provides:       bundled(golang(go.etcd.io/etcd/client/pkg/v3)) = v3.5.14
Provides:       bundled(golang(go.etcd.io/etcd/client/v2)) = v2.305.13
Provides:       bundled(golang(go.etcd.io/etcd/client/v3)) = v3.5.14
Provides:       bundled(golang(go.etcd.io/etcd/pkg/v3)) = v3.5.13
Provides:       bundled(golang(go.etcd.io/etcd/raft/v3)) = v3.5.13
Provides:       bundled(golang(go.etcd.io/etcd/server/v3)) = v3.5.13
Provides:       bundled(golang(go.etcd.io/gofail)) = v0.1.0
Provides:       bundled(golang(go.mozilla.org/pkcs7)) = 432b2356ecb1
Provides:       bundled(golang(go.opencensus.io)) = v0.24.0
Provides:       bundled(golang(go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc)) = v0.56.0
Provides:       bundled(golang(go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp)) = v0.56.0
Provides:       bundled(golang(go.opentelemetry.io/otel)) = v1.31.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp/otlptrace)) = v1.31.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc)) = v1.31.0
Provides:       bundled(golang(go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp)) = v1.31.0
Provides:       bundled(golang(go.opentelemetry.io/otel/metric)) = v1.31.0
Provides:       bundled(golang(go.opentelemetry.io/otel/sdk)) = v1.31.0
Provides:       bundled(golang(go.opentelemetry.io/otel/trace)) = v1.31.0
Provides:       bundled(golang(go.opentelemetry.io/proto/otlp)) = v1.3.1
Provides:       bundled(golang(go.uber.org/goleak)) = v1.3.0
Provides:       bundled(golang(go.uber.org/mock)) = v0.4.0
Provides:       bundled(golang(go.uber.org/multierr)) = v1.11.0
Provides:       bundled(golang(go.uber.org/zap)) = v1.26.0
Provides:       bundled(golang(golang.org/x/crypto)) = v0.28.0
Provides:       bundled(golang(golang.org/x/exp)) = aacd6d4b4611
Provides:       bundled(golang(golang.org/x/image)) = 723b81ca9867
Provides:       bundled(golang(golang.org/x/lint)) = 6edffad5e616
Provides:       bundled(golang(golang.org/x/mobile)) = d2bd2a29d028
Provides:       bundled(golang(golang.org/x/mod)) = v0.21.0
Provides:       bundled(golang(golang.org/x/net)) = v0.30.0
Provides:       bundled(golang(golang.org/x/oauth2)) = v0.22.0
Provides:       bundled(golang(golang.org/x/sync)) = v0.8.0
Provides:       bundled(golang(golang.org/x/sys)) = v0.26.0
Provides:       bundled(golang(golang.org/x/term)) = v0.25.0
Provides:       bundled(golang(golang.org/x/text)) = v0.19.0
Provides:       bundled(golang(golang.org/x/time)) = v0.3.0
Provides:       bundled(golang(golang.org/x/tools)) = e35e4ccd0d2d
Provides:       bundled(golang(golang.org/x/xerrors)) = 04be3eba64a2
Provides:       bundled(golang(gonum.org/v1/gonum)) = v0.11.0
Provides:       bundled(golang(gonum.org/v1/netlib)) = 8cb42192e0e0
Provides:       bundled(golang(gonum.org/v1/plot)) = v0.10.1
Provides:       bundled(golang(google.golang.org/api)) = v0.114.0
Provides:       bundled(golang(google.golang.org/appengine)) = v1.6.8
Provides:       bundled(golang(google.golang.org/genproto)) = ef4313101c80
Provides:       bundled(golang(google.golang.org/genproto/googleapis/api)) = 5fefd90f89a9
Provides:       bundled(golang(google.golang.org/genproto/googleapis/rpc)) = 5fefd90f89a9
Provides:       bundled(golang(google.golang.org/grpc)) = v1.67.1
Provides:       bundled(golang(google.golang.org/grpc/cmd/protoc-gen-go-grpc)) = v1.5.1
Provides:       bundled(golang(google.golang.org/protobuf)) = v1.35.1
Provides:       bundled(golang(gopkg.in/alecthomas/kingpin.v2)) = v2.2.6
Provides:       bundled(golang(gopkg.in/check.v1)) = 10cb98267c6c
Provides:       bundled(golang(gopkg.in/errgo.v2)) = v2.1.0
Provides:       bundled(golang(gopkg.in/evanphx/json-patch.v4)) = v4.12.0
Provides:       bundled(golang(gopkg.in/inf.v0)) = v0.9.1
Provides:       bundled(golang(gopkg.in/natefinch/lumberjack.v2)) = v2.2.1
Provides:       bundled(golang(gopkg.in/square/go-jose.v2)) = v2.6.0
Provides:       bundled(golang(gopkg.in/yaml.v2)) = v2.4.0
Provides:       bundled(golang(gopkg.in/yaml.v3)) = v3.0.1
Provides:       bundled(golang(honnef.co/go/tools)) = v0.1.3
Provides:       bundled(golang(k8s.io/api)) = v0.31.1
Provides:       bundled(golang(k8s.io/apimachinery)) = v0.31.1
Provides:       bundled(golang(k8s.io/apiserver)) = v0.31.1
Provides:       bundled(golang(k8s.io/client-go)) = v0.31.1
Provides:       bundled(golang(k8s.io/component-base)) = v0.31.1
Provides:       bundled(golang(k8s.io/cri-api)) = alpha.0
Provides:       bundled(golang(k8s.io/klog/v2)) = v2.130.1
Provides:       bundled(golang(k8s.io/kms)) = v0.31.1
Provides:       bundled(golang(k8s.io/kube-openapi)) = 70dd3763d340
Provides:       bundled(golang(k8s.io/kubelet)) = v0.31.1
Provides:       bundled(golang(k8s.io/utils)) = 18e509b52bc8
Provides:       bundled(golang(lukechampine.com/uint128)) = v1.2.0
Provides:       bundled(golang(modernc.org/cc/v3)) = v3.36.3
Provides:       bundled(golang(modernc.org/ccgo/v3)) = v3.16.9
Provides:       bundled(golang(modernc.org/ccorpus)) = v1.11.6
Provides:       bundled(golang(modernc.org/httpfs)) = v1.0.6
Provides:       bundled(golang(modernc.org/libc)) = v1.17.1
Provides:       bundled(golang(modernc.org/mathutil)) = v1.5.0
Provides:       bundled(golang(modernc.org/memory)) = v1.2.1
Provides:       bundled(golang(modernc.org/opt)) = v0.1.3
Provides:       bundled(golang(modernc.org/sqlite)) = v1.18.1
Provides:       bundled(golang(modernc.org/strutil)) = v1.1.3
Provides:       bundled(golang(modernc.org/tcl)) = v1.13.1
Provides:       bundled(golang(modernc.org/token)) = v1.0.0
Provides:       bundled(golang(modernc.org/z)) = v1.5.1
Provides:       bundled(golang(rsc.io/binaryregexp)) = v0.2.0
Provides:       bundled(golang(rsc.io/pdf)) = v0.1.1
Provides:       bundled(golang(rsc.io/quote/v3)) = v3.1.0
Provides:       bundled(golang(rsc.io/sampler)) = v1.3.0
Provides:       bundled(golang(sigs.k8s.io/apiserver-network-proxy/konnectivity-client)) = v0.30.3
Provides:       bundled(golang(sigs.k8s.io/json)) = bc3834ca7abd
Provides:       bundled(golang(sigs.k8s.io/structured-merge-diff/v4)) = v4.4.1
Provides:       bundled(golang(sigs.k8s.io/yaml)) = v1.4.0
Provides:       bundled(golang(tags.cncf.io/container-device-interface)) = v0.8.0
Provides:       bundled(golang(tags.cncf.io/container-device-interface/specs-go)) = v0.8.0


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

%if %{with tests}
%check
%gochecks -d . -d mount -t snapshots
%endif


%post
%systemd_post containerd.service


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


%changelog
* Fri Oct 18 2024 Ayoub Nasr <ayoub.nasr@scality.com> - 1.6.36
- Latest upstream in branch 1.6.x

* Mon Sep 23 2024 Teddy Andrieux <teddy.andrieux@scality.com> - 1.6.35-2
- Drop RHEL 7 based support

* Mon Aug 12 2024 Yoan Moscatelli <yoan.moscatelli@scality.com> - 1.6.35-1
- Latest upstream in branch 1.6.x

* Mon Apr 8 2024 Teddy Andrieux <teddy.andrieux@scality.com> - 1.6.31-1
- Latest upstream

* Mon Sep 25 2023 Teddy Andrieux <teddy.andrieux@scality.com> - 1.6.24-1
- Latest upstream

* Tue Jul 18 2023 Teddy Andrieux <teddy.andrieux@scality.com> - 1.6.21-1
- Latest upstream

* Thu Mar 2 2023 Teddy Andrieux <teddy.andrieux@scality.com> - 1.6.19-1
- Latest upstream

* Tue Sep 27 2022 Teddy Andrieux <teddy.andrieux@scality.com> - 1.6.8-1
- Latest upstream

* Fri Aug 5 2022 Guillaume Demonet <guillaume.demonet@scality.com> - 1.6.4-2
- Constrain runc version to avoid issue with "exec"

* Wed May 25 2022 Guillaume Demonet <guillaume.demonet@scality.com> - 1.6.4-1
- Latest upstream

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
