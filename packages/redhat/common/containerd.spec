%global goipath github.com/containerd/containerd
Version:        1.4.3

%if %{defined fedora}
%gometa
%ifnarch %{arm}
%bcond_without tests
%endif
%else
ExclusiveArch: %{?go_arches:%{go_arches}}%{!?go_arches:%{ix86} x86_64 %{arm} aarch64 ppc64le s390x %{mips}}
%global debug_package %{nil}
%global gourl https://%{goipath}
%global gosource %{gourl}/archive/v%{version}/%{name}-%{version}.tar.gz
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
Release:        3%{?dist}
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

# NOTE: We do not require golang as currently build does not work
# with golang >= 1.16, and we will not be able to easily install
# golang **package** prior to 1.16
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
# grep -v -e '^$' -e '^#' containerd-*/vendor.conf | sort | awk '{print "Provides:       bundled(golang("$1")) = "$2}'
Provides:       bundled(golang(github.com/beorn7/perks)) = v1.0.1
Provides:       bundled(golang(github.com/BurntSushi/toml)) = v0.3.1
Provides:       bundled(golang(github.com/cespare/xxhash/v2)) = v2.1.1
Provides:       bundled(golang(github.com/cilium/ebpf)) = 1c8d4c9ef7759622653a1d319284a44652333b28
Provides:       bundled(golang(github.com/containerd/aufs)) = 371312c1e31c210a21e49bf3dfd3f31729ed9f2f
Provides:       bundled(golang(github.com/containerd/btrfs)) = 404b9149801e455c8076f615b06dc0abee0a977a
Provides:       bundled(golang(github.com/containerd/cgroups)) = 318312a373405e5e91134d8063d04d59768a1bff
Provides:       bundled(golang(github.com/containerd/console)) = v1.0.0
Provides:       bundled(golang(github.com/containerd/continuity)) = efbc4488d8fe1bdc16bde3b2d2990d9b3a899165
Provides:       bundled(golang(github.com/containerd/cri)) = adc0b6a578ed6f646bb24c1c639d65b70e14cccc
Provides:       bundled(golang(github.com/containerd/fifo)) = f15a3290365b9d2627d189e619ab4008e0069caf
Provides:       bundled(golang(github.com/containerd/go-cni)) = v1.0.1
Provides:       bundled(golang(github.com/containerd/go-runc)) = 7016d3ce2328dd2cb1192b2076ebd565c4e8df0c
Provides:       bundled(golang(github.com/containerd/imgcrypt)) = v1.0.1
Provides:       bundled(golang(github.com/containerd/ttrpc)) = v1.0.1
Provides:       bundled(golang(github.com/containerd/typeurl)) = v1.0.1
Provides:       bundled(golang(github.com/containerd/zfs)) = 9abf673ca6ff9ab8d9bd776a4ceff8f6dc699c3d
Provides:       bundled(golang(github.com/containernetworking/cni)) = v0.8.0
Provides:       bundled(golang(github.com/containernetworking/plugins)) = v0.8.6
Provides:       bundled(golang(github.com/containers/ocicrypt)) = v1.0.1
Provides:       bundled(golang(github.com/coreos/go-systemd/v22)) = v22.1.0
Provides:       bundled(golang(github.com/cpuguy83/go-md2man/v2)) = v2.0.0
Provides:       bundled(golang(github.com/davecgh/go-spew)) = v1.1.1
Provides:       bundled(golang(github.com/docker/docker)) = 4634ce647cf2ce2c6031129ccd109e557244986f
Provides:       bundled(golang(github.com/docker/go-events)) = e31b211e4f1cd09aa76fe4ac244571fab96ae47f
Provides:       bundled(golang(github.com/docker/go-metrics)) = v0.0.1
Provides:       bundled(golang(github.com/docker/go-units)) = v0.4.0
Provides:       bundled(golang(github.com/docker/spdystream)) = 449fdfce4d962303d702fec724ef0ad181c92528
Provides:       bundled(golang(github.com/emicklei/go-restful)) = v2.9.5
Provides:       bundled(golang(github.com/fsnotify/fsnotify)) = v1.4.9
Provides:       bundled(golang(github.com/fullsailor/pkcs7)) = 8306686428a5fe132eac8cb7c4848af725098bd4
Provides:       bundled(golang(github.com/godbus/dbus/v5)) = v5.0.3
Provides:       bundled(golang(github.com/gogo/googleapis)) = v1.3.2
Provides:       bundled(golang(github.com/gogo/protobuf)) = v1.3.1
Provides:       bundled(golang(github.com/golang/protobuf)) = v1.3.5
Provides:       bundled(golang(github.com/go-logr/logr)) = v0.2.0
Provides:       bundled(golang(github.com/google/go-cmp)) = v0.2.0
Provides:       bundled(golang(github.com/google/gofuzz)) = v1.1.0
Provides:       bundled(golang(github.com/google/uuid)) = v1.1.1
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-prometheus)) = v1.2.0
Provides:       bundled(golang(github.com/hashicorp/errwrap)) = v1.0.0
Provides:       bundled(golang(github.com/hashicorp/golang-lru)) = v0.5.3
Provides:       bundled(golang(github.com/hashicorp/go-multierror)) = v1.0.0
Provides:       bundled(golang(github.com/imdario/mergo)) = v0.3.7
Provides:       bundled(golang(github.com/json-iterator/go)) = v1.1.10
Provides:       bundled(golang(github.com/konsorten/go-windows-terminal-sequences)) = v1.0.3
Provides:       bundled(golang(github.com/matttproud/golang_protobuf_extensions)) = v1.0.1
Provides:       bundled(golang(github.com/Microsoft/go-winio)) = v0.4.14
Provides:       bundled(golang(github.com/Microsoft/hcsshim)) = v0.8.10
Provides:       bundled(golang(github.com/mistifyio/go-zfs)) = f784269be439d704d3dfa1906f45dd848fed2beb
Provides:       bundled(golang(github.com/modern-go/concurrent)) = 1.0.3
Provides:       bundled(golang(github.com/modern-go/reflect2)) = v1.0.1
Provides:       bundled(golang(github.com/opencontainers/go-digest)) = v1.0.0
Provides:       bundled(golang(github.com/opencontainers/image-spec)) = v1.0.1
Provides:       bundled(golang(github.com/opencontainers/runc)) = v1.0.0-rc92
Provides:       bundled(golang(github.com/opencontainers/runtime-spec)) = 4d89ac9fbff6c455f46a5bb59c6b1bb7184a5e43
Provides:       bundled(golang(github.com/opencontainers/selinux)) = v1.6.0
Provides:       bundled(golang(github.com/pkg/errors)) = v0.9.1
Provides:       bundled(golang(github.com/prometheus/client_golang)) = v1.6.0
Provides:       bundled(golang(github.com/prometheus/client_model)) = v0.2.0
Provides:       bundled(golang(github.com/prometheus/common)) = v0.9.1
Provides:       bundled(golang(github.com/prometheus/procfs)) = v0.0.11
Provides:       bundled(golang(github.com/russross/blackfriday/v2)) = v2.0.1
Provides:       bundled(golang(github.com/shurcooL/sanitized_anchor_name)) = v1.0.0
Provides:       bundled(golang(github.com/sirupsen/logrus)) = v1.6.0
Provides:       bundled(golang(github.com/syndtr/gocapability)) = d98352740cb2c55f81556b63d4a1ec64c5a319c2
Provides:       bundled(golang(github.com/tchap/go-patricia)) = v2.2.6
Provides:       bundled(golang(github.com/urfave/cli)) = v1.22.1
Provides:       bundled(golang(github.com/willf/bitset)) = v1.1.11
Provides:       bundled(golang(go.etcd.io/bbolt)) = v1.3.5
Provides:       bundled(golang(golang.org/x/crypto)) = 75b288015ac94e66e3d6715fb68a9b41bf046ec2
Provides:       bundled(golang(golang.org/x/net)) = ab34263943818b32f575efc978a3d24e80b04bd7
Provides:       bundled(golang(golang.org/x/oauth2)) = 858c2ad4c8b6c5d10852cb89079f6ca1c7309787
Provides:       bundled(golang(golang.org/x/sync)) = 42b317875d0fa942474b76e1b46a6060d720ae6e
Provides:       bundled(golang(golang.org/x/sys)) = ed371f2e16b4b305ee99df548828de367527b76b
Provides:       bundled(golang(golang.org/x/text)) = v0.3.3
Provides:       bundled(golang(golang.org/x/time)) = 555d28b269f0569763d25dbe1a237ae74c6bcc82
Provides:       bundled(golang(google.golang.org/genproto)) = e50cd9704f63023d62cd06a1994b98227fc4d21a
Provides:       bundled(golang(google.golang.org/grpc)) = v1.27.1
Provides:       bundled(golang(go.opencensus.io)) = v0.22.0
Provides:       bundled(golang(gopkg.in/inf.v0)) = v0.9.1
Provides:       bundled(golang(gopkg.in/square/go-jose.v2)) = v2.3.1
Provides:       bundled(golang(gopkg.in/yaml.v2)) = v2.2.8
Provides:       bundled(golang(gotest.tools/v3)) = v3.0.2
Provides:       bundled(golang(k8s.io/apimachinery)) = v0.19.4
Provides:       bundled(golang(k8s.io/apiserver)) = v0.19.4
Provides:       bundled(golang(k8s.io/api)) = v0.19.4
Provides:       bundled(golang(k8s.io/client-go)) = v0.19.4
Provides:       bundled(golang(k8s.io/cri-api)) = v0.19.4
Provides:       bundled(golang(k8s.io/klog/v2)) = v2.2.0
Provides:       bundled(golang(k8s.io/utils)) = d5654de09c73da55eb19ae4ab4f734f7a61747a6
Provides:       bundled(golang(sigs.k8s.io/structured-merge-diff/v4)) = v4.0.1
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
%doc docs PLUGINS.md ROADMAP.md RUNC.md SCOPE.md code-of-conduct.md BUILDING.md
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
