%global provider        github
%global provider_tld    com
%global project         projectcalico
%global repo            cni-plugin
%global provider_prefix %{provider}.%{provider_tld}/%{project}/%{repo}

%ifarch x86_64
%global built_arch              amd64
%global calico_sha256           3a8b8e80599597bed8a4c10a43bad6424c2f3d8c00b3bb26f1268a0cae2a60da
%global calico_ipam_sha256      3a8b8e80599597bed8a4c10a43bad6424c2f3d8c00b3bb26f1268a0cae2a60da
%endif

Name:           calico-cni-plugin
Version:        3.20.0
Release:        1%{?dist}
Summary:        Calico CNI plugin

ExclusiveArch:  x86_64
ExclusiveOS:    Linux

License:        ASL 2.0
URL:            https://%{provider_prefix}
Source0:        https://%{provider_prefix}/archive/v%{version}.tar.gz
Source1:        https://%{provider_prefix}/releases/download/v%{version}/calico-%{built_arch}
Source2:        https://%{provider_prefix}/releases/download/v%{version}/calico-ipam-%{built_arch}

BuildRequires:  /usr/bin/sha256sum
Requires:       kubernetes-cni

%description
%{summary}

%prep
%setup -q -n %{repo}-%{version}
echo "%{calico_sha256}  %{SOURCE1}" | /usr/bin/sha256sum --status --strict --check
echo "%{calico_ipam_sha256}  %{SOURCE2}" | /usr/bin/sha256sum --status --strict --check

%install
install -m 755 -d %{buildroot}/opt/cni/bin

install -p -m 755 %{SOURCE1} %{buildroot}/opt/cni/bin/calico
install -p -m 755 %{SOURCE2} %{buildroot}/opt/cni/bin/calico-ipam

%files
/opt/cni/bin/calico
/opt/cni/bin/calico-ipam

%license LICENSE
%doc README.md

%changelog
* Wed Sep 8 2021 Teddy Andrieux <teddy.andrieux@scality.com> - 3.20.0.1-1
- Version bump

* Tue Jun 29 2021 Teddy Andrieux <teddy.andrieux@scality.com> - 3.19.1-1
- Version bump

* Tue May 11 2021 Alexandre Allard <alexandre.allard@scality.com> - 3.19.0-1
- Version bump

* Wed Nov 25 2020 Teddy Andrieux <teddy.andrieux@scality.com> - 3.17.0-1
- Version bump

* Thu Oct 1 2020 Teddy Andrieux <teddy.andrieux@scality.com> - 3.16.1-1
- Version bump

* Thu Feb 20 2020 Nicolas Trangez <nicolas.trangez@scality.com> - 3.12.0-1
- Version bump

* Sat Dec 14 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.10.2-1
- Version bump

* Thu Aug 22 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.8.2-1
- Version bump

* Thu Jul 4 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.8.0-1
- Version bump

* Fri May 10 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.7.2-1
- Version bump

* Thu Feb 14 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.5.1-1
- Version bump

* Thu Jan 24 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.4.0-1
- Initial build
