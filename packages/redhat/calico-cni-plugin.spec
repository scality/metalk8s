%global provider        github
%global provider_tld    com
%global project         projectcalico
%global repo            cni-plugin
%global provider_prefix %{provider}.%{provider_tld}/%{project}/%{repo}

%ifarch x86_64
%global built_arch              amd64
%global calico_sha256           984a652c724c8e700ed188110f6de598d2918fddc80d92f23d1c9277d007b81a
%global calico_ipam_sha256      4de0ebdda15d2b47cb7c69c653c9f46ac46a2bb8c25212f9c0f619be6f527f44
%endif

Name:           calico-cni-plugin
Version:        3.8.0
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
* Thu Jul 4 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.8.0-1
- Version bump

* Fri May 10 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.7.2-1
- Version bump

* Thu Feb 14 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.5.1-1
- Version bump

* Thu Jan 24 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.4.0-1
- Initial build
