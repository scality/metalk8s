%global provider        github
%global provider_tld    com
%global project         projectcalico
%global repo            cni-plugin
%global provider_prefix %{provider}.%{provider_tld}/%{project}/%{repo}

%ifarch x86_64
%global built_arch              amd64
%global calico_sha256           4675d8d195c0c30467161b459d99cbd0dd715496d4fadea1010e9deb7880f18b
%global calico_ipam_sha256      ee2943609530e1ad429cae5315590671594b6dd795db259a81b919995ad9999e
%endif

Name:           calico-cni-plugin
Version:        3.8.2
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
