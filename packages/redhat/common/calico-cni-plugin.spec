%global provider        github
%global provider_tld    com
%global project         projectcalico
%global repo            calico
%global provider_prefix %{provider}.%{provider_tld}/%{project}/%{repo}

%ifarch x86_64
%global built_arch              amd64
%global calico_sha256           906c5f20c6d9b48d1ac78559fc82f86a8ffa4448c1671e77b794f84f61606cd8
%global calico_ipam_sha256      906c5f20c6d9b48d1ac78559fc82f86a8ffa4448c1671e77b794f84f61606cd8
%endif

Name:           calico-cni-plugin
Version:        3.23.1
Release:        1%{?dist}
Summary:        Calico CNI plugin

ExclusiveArch:  x86_64
ExclusiveOS:    Linux

License:        ASL 2.0
URL:            https://%{provider_prefix}
Source0:        https://%{provider_prefix}/archive/v%{version}.tar.gz
Source1:        https://%{provider_prefix}/releases/download/v%{version}/release-v%{version}.tgz

BuildRequires:  /usr/bin/sha256sum
Requires:       kubernetes-cni

%description
%{summary}

%prep
%setup -b 1 -q -n release-v%{version}/bin/cni/%{built_arch}
echo "%{calico_sha256}  calico" | /usr/bin/sha256sum --status --strict --check
echo "%{calico_ipam_sha256}  calico-ipam" | /usr/bin/sha256sum --status --strict --check

%setup -q -n %{repo}-%{version}/cni-plugin

%install
install -m 755 -d %{buildroot}/opt/cni/bin

install -p -m 755 %{_builddir}/release-v%{version}/bin/cni/%{built_arch}/calico %{buildroot}/opt/cni/bin/calico
install -p -m 755 %{_builddir}/release-v%{version}/bin/cni/%{built_arch}/calico-ipam %{buildroot}/opt/cni/bin/calico-ipam

%files
/opt/cni/bin/calico
/opt/cni/bin/calico-ipam

%license LICENSE
%doc README.md

%changelog
* Wed May 18 2022 Teddy Andrieux <teddy.andrieux@scality.com> - 3.23.1.1-1
- Version bump

* Fri Feb 18 2022 Teddy Andrieux <teddy.andrieux@scality.com> - 3.22.0.1-1
- Version bump

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
