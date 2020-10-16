%global goipath github.com/containerd/containerd
Version:        1.2.14

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
go build -buildmode pie -compiler gc -tags="rpm_crashtraceback ${BUILDTAGS:-}" -ldflags "${LDFLAGS:-} -B 0x$(head -c20 /dev/urandom|od -An -tx1|tr -d ' \\n') -extldflags '%__global_ldflags %{?__golang_extldflags}'" -a -v -x %{?**};
%else
go build -compiler gc -tags="rpm_crashtraceback ${BUILDTAGS:-}" -ldflags "${LDFLAGS:-} -B 0x$(head -c20 /dev/urandom|od -An -tx1|tr -d ' \\n') -extldflags '%__global_ldflags %{?__golang_extldflags}'" -a -v -x %{?**};
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

BuildRequires:  golang >= 1.10
BuildRequires:  btrfs-progs-devel
BuildRequires:  go-md2man
BuildRequires:  systemd
%{?systemd_requires}
Requires:       runc

# vendored libraries
# grep -v -e '^$' -e '^#' containerd-*/vendor.conf | sort | awk '{print "Provides:       bundled(golang("$1")) = "$2}'
Provides:       bundled(golang(github.com/beorn7/perks)) = 4c0e84591b9aa9e6dcfdf3e020114cd81f89d5f9
Provides:       bundled(golang(github.com/blang/semver)) = v3.1.0
Provides:       bundled(golang(github.com/BurntSushi/toml)) = a368813c5e648fee92e5f6c30e3944ff9d5e8895
Provides:       bundled(golang(github.com/containerd/aufs)) = ffa39970e26ad01d81f540b21e65f9c1841a5f92
Provides:       bundled(golang(github.com/containerd/btrfs)) = 2e1aa0ddf94f91fa282b6ed87c23bf0d64911244
Provides:       bundled(golang(github.com/containerd/cgroups)) = c4b9ac5c7601384c965b9646fc515884e091ebb9
Provides:       bundled(golang(github.com/containerd/console)) = 8375c3424e4d7b114e8a90a4a40c8e1b40d1d4e6
Provides:       bundled(golang(github.com/containerd/continuity)) = bd77b46c8352f74eb12c85bdc01f4b90f69d66b4
Provides:       bundled(golang(github.com/containerd/cri)) = b1052f3b73fb9f0a6805d3c20e884a4cef265a38
Provides:       bundled(golang(github.com/containerd/fifo)) = 3d5202aec260678c48179c56f40e6f38a095738c
Provides:       bundled(golang(github.com/containerd/go-cni)) = 40bcf8ec8acd7372be1d77031d585d5d8e561c90
Provides:       bundled(golang(github.com/containerd/go-runc)) = e029b79d8cda8374981c64eba71f28ec38e5526f
Provides:       bundled(golang(github.com/containerd/ttrpc)) = 92c8520ef9f86600c650dd540266a007bf03670f
Provides:       bundled(golang(github.com/containerd/typeurl)) = a93fcdb778cd272c6e9b3028b2f42d813e785d40
Provides:       bundled(golang(github.com/containerd/zfs)) = 2ceb2dbb8154202ed1b8fd32e4ea25b491d7b251
Provides:       bundled(golang(github.com/containernetworking/cni)) = v0.6.0
Provides:       bundled(golang(github.com/containernetworking/plugins)) = v0.7.5
Provides:       bundled(golang(github.com/coreos/go-systemd)) = 48702e0da86bd25e76cfef347e2adeb434a0d0a6
Provides:       bundled(golang(github.com/davecgh/go-spew)) = v1.1.0
Provides:       bundled(golang(github.com/docker/distribution)) = 0d3efadf0154c2b8a4e7b6621fff9809655cc580
Provides:       bundled(golang(github.com/docker/docker)) = 86f080cff0914e9694068ed78d503701667c4c00
Provides:       bundled(golang(github.com/docker/go-events)) = 9461782956ad83b30282bf90e31fa6a70c255ba9
Provides:       bundled(golang(github.com/docker/go-metrics)) = 4ea375f7759c82740c893fc030bc37088d2ec098
Provides:       bundled(golang(github.com/docker/go-units)) = v0.3.1
Provides:       bundled(golang(github.com/docker/spdystream)) = 449fdfce4d962303d702fec724ef0ad181c92528
Provides:       bundled(golang(github.com/emicklei/go-restful)) = v2.2.1
Provides:       bundled(golang(github.com/ghodss/yaml)) = v1.0.0
Provides:       bundled(golang(github.com/godbus/dbus)) = c7fdd8b5cd55e87b4e1f4e372cdb1db61dd6c66f
Provides:       bundled(golang(github.com/gogo/googleapis)) = 08a7655d27152912db7aaf4f983275eaf8d128ef
Provides:       bundled(golang(github.com/gogo/protobuf)) = v1.0.0
Provides:       bundled(golang(github.com/golang/glog)) = 44145f04b68cf362d9c4df2182967c2275eaefed
Provides:       bundled(golang(github.com/golang/protobuf)) = v1.1.0
Provides:       bundled(golang(github.com/google/go-cmp)) = v0.1.0
Provides:       bundled(golang(github.com/google/gofuzz)) = 44d81051d367757e1c7c6a5a86423ece9afcf63c
Provides:       bundled(golang(github.com/google/uuid)) = v1.1.1
Provides:       bundled(golang(github.com/grpc-ecosystem/go-grpc-prometheus)) = 6b7015e65d366bf3f19b2b2a000a831940f0f7e0
Provides:       bundled(golang(github.com/hashicorp/errwrap)) = 7554cd9344cec97297fa6649b055a8c98c2a1e55
Provides:       bundled(golang(github.com/hashicorp/go-multierror)) = ed905158d87462226a13fe39ddf685ea65f1c11f
Provides:       bundled(golang(github.com/json-iterator/go)) = 1.1.5
Provides:       bundled(golang(github.com/matttproud/golang_protobuf_extensions)) = v1.0.0
Provides:       bundled(golang(github.com/Microsoft/go-winio)) = v0.4.11
Provides:       bundled(golang(github.com/Microsoft/hcsshim)) = v0.8.1
Provides:       bundled(golang(github.com/mistifyio/go-zfs)) = f784269be439d704d3dfa1906f45dd848fed2beb
Provides:       bundled(golang(github.com/modern-go/concurrent)) = 1.0.3
Provides:       bundled(golang(github.com/modern-go/reflect2)) = 1.0.1
Provides:       bundled(golang(github.com/opencontainers/go-digest)) = c9281466c8b2f606084ac71339773efd177436e7
Provides:       bundled(golang(github.com/opencontainers/image-spec)) = v1.0.1
Provides:       bundled(golang(github.com/opencontainers/runc)) = dc9208a3303feef5b3839f4323d9beb36df0a9dd
Provides:       bundled(golang(github.com/opencontainers/runtime-spec)) = eba862dc2470385a233c7507392675cbeadf7353
Provides:       bundled(golang(github.com/opencontainers/runtime-tools)) = v0.6.0
Provides:       bundled(golang(github.com/opencontainers/selinux)) = 5215b1806f52b1fcc2070a8826c542c9d33cd3cf
Provides:       bundled(golang(github.com/pkg/errors)) = v0.8.0
Provides:       bundled(golang(github.com/prometheus/client_golang)) = f4fb1b73fb099f396a7f0036bf86aa8def4ed823
Provides:       bundled(golang(github.com/prometheus/client_model)) = 99fa1f4be8e564e8a6b613da7fa6f46c9edafc6c
Provides:       bundled(golang(github.com/prometheus/common)) = 89604d197083d4781071d3c65855d24ecfb0a563
Provides:       bundled(golang(github.com/prometheus/procfs)) = cb4147076ac75738c9a7d279075a253c0cc5acbd
Provides:       bundled(golang(github.com/seccomp/libseccomp-golang)) = v0.9.1
Provides:       bundled(golang(github.com/sirupsen/logrus)) = v1.0.0
Provides:       bundled(golang(github.com/syndtr/gocapability)) = db04d3cc01c8b54962a58ec7e491717d06cfcc16
Provides:       bundled(golang(github.com/tchap/go-patricia)) = v2.2.6
Provides:       bundled(golang(github.com/urfave/cli)) = 7bc6a0acffa589f415f88aca16cc1de5ffd66f9c
Provides:       bundled(golang(github.com/xeipuuv/gojsonpointer)) = 4e3ac2762d5f479393488629ee9370b50873b3a6
Provides:       bundled(golang(github.com/xeipuuv/gojsonreference)) = bd5ef7bd5415a7ac448318e64f11a24cd21e594b
Provides:       bundled(golang(github.com/xeipuuv/gojsonschema)) = 1d523034197ff1f222f6429836dd36a2457a1874
Provides:       bundled(golang(go.etcd.io/bbolt)) = v1.3.1-etcd.8
Provides:       bundled(golang(golang.org/x/crypto)) = 69ecbb4d6d5dab05e49161c6e77ea40a030884e1
Provides:       bundled(golang(golang.org/x/net)) = b3756b4b77d7b13260a0a2ec658753cf48922eac
Provides:       bundled(golang(golang.org/x/oauth2)) = a6bd8cefa1811bd24b86f8902872e4e8225f74c4
Provides:       bundled(golang(golang.org/x/sync)) = 450f422ab23cf9881c94e2db30cac0eb1b7cf80c
Provides:       bundled(golang(golang.org/x/sys)) = 41f3e6584952bb034a481797859f6ab34b6803bd
Provides:       bundled(golang(golang.org/x/text)) = 19e51611da83d6be54ddafce4a4af510cb3e9ea4
Provides:       bundled(golang(golang.org/x/time)) = f51c12702a4d776e4c1fa9b0fabab841babae631
Provides:       bundled(golang(google.golang.org/appengine)) = 54a98f90d1c46b7731eb8fb305d2a321c30ef610
Provides:       bundled(golang(google.golang.org/genproto)) = d80a6e20e776b0b17a324d0ba1ab50a39c8e8944
Provides:       bundled(golang(google.golang.org/grpc)) = 39e8a7b072a67ca2a75f57fa2e0d50995f5b22f6
Provides:       bundled(golang(gopkg.in/inf.v0)) = 3887ee99ecf07df5b447e9b00d9c0b2adaa9f3e4
Provides:       bundled(golang(gopkg.in/yaml.v2)) = 53403b58ad1b561927d19068c655246f2db79d48
Provides:       bundled(golang(gotest.tools)) = v2.1.0
Provides:       bundled(golang(k8s.io/api)) = kubernetes-1.12.0
Provides:       bundled(golang(k8s.io/apimachinery)) = kubernetes-1.12.0
Provides:       bundled(golang(k8s.io/apiserver)) = kubernetes-1.12.0
Provides:       bundled(golang(k8s.io/client-go)) = kubernetes-1.12.0
Provides:       bundled(golang(k8s.io/kubernetes)) = v1.12.0
Provides:       bundled(golang(k8s.io/utils)) = cd34563cd63c2bd7c6fe88a73c4dcf34ed8a67cb


%description
containerd is an industry-standard container runtime with an emphasis on
simplicity, robustness and portability.  It is available as a daemon for Linux
and Windows, which can manage the complete container lifecycle of its host
system: image transfer and storage, container execution and supervision,
low-level storage and network attachments, etc.


%prep
%autosetup


%build
%gobuildroot
export LDFLAGS="-X %{goipath}/version.Version=%{version}"
%gobuild -o _bin/containerd %{goipath}/cmd/containerd
%gobuild -o _bin/containerd-shim %{goipath}/cmd/containerd-shim
%gobuild -o _bin/containerd-shim-runc-v1 %{goipath}/cmd/containerd-shim-runc-v1
%gobuild -o _bin/ctr %{goipath}/cmd/ctr
mkdir _man
go-md2man -in docs/man/containerd.1.md -out _man/containerd.1
go-md2man -in docs/man/containerd-config.1.md -out _man/containerd-config.1
go-md2man -in docs/man/ctr.1.md -out _man/ctr.1
go-md2man -in docs/man/containerd-config.toml.5.md -out _man/containerd-config.toml.5


%install
install -D -p -m 0755 _bin/containerd %{buildroot}%{_bindir}/containerd
install -D -p -m 0755 _bin/containerd-shim %{buildroot}%{_bindir}/containerd-shim
install -D -p -m 0755 _bin/containerd-shim-runc-v1 %{buildroot}%{_bindir}/containerd-shim-runc-v1
install -D -p -m 0755 _bin/ctr %{buildroot}%{_bindir}/ctr
install -D -p -m 0644 _man/containerd.1 %{buildroot}%{_mandir}/man1/containerd.1
install -D -p -m 0644 _man/containerd-config.1 %{buildroot}%{_mandir}/man1/containerd-config.1
install -D -p -m 0644 _man/ctr.1 %{buildroot}%{_mandir}/man1/ctr.1
install -D -p -m 0644 _man/containerd-config.toml.5 %{buildroot}%{_mandir}/man5/containerd-config.toml.5
install -D -p -m 0644 %{S:1} %{buildroot}%{_unitdir}/containerd.service
install -D -p -m 0644 %{S:2} %{buildroot}%{_sysconfdir}/containerd/config.toml


%if %{with tests}
%check
%gochecks
%endif


%post
%systemd_post containerd.service


%preun
%systemd_preun containerd.service


%postun
%systemd_postun_with_restart containerd.service


%files
%license LICENSE
%doc README.md
%{_bindir}/containerd
%{_bindir}/containerd-shim
%{_bindir}/containerd-shim-runc-v1
%{_bindir}/ctr
%{_mandir}/man1/containerd.1*
%{_mandir}/man1/containerd-config.1*
%{_mandir}/man1/ctr.1*
%{_mandir}/man5/containerd-config.toml.5*
%{_unitdir}/containerd.service
%dir %{_sysconfdir}/containerd
%config(noreplace) %{_sysconfdir}/containerd/config.toml


%changelog
* Fri Oct 16 2020 Guillaume Demonet <guillaume.demonet@scality.com> - 1.2.14-1
- Latest upstream

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
