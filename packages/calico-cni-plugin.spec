%global provider        github
%global provider_tld    com
%global project         projectcalico
%global repo            cni-plugin
%global provider_prefix %{provider}.%{provider_tld}/%{project}/%{repo}

%ifarch x86_64
%global built_arch              amd64
%global calico_sha256           5736d46dc8f3d17eafd1d7874c49457244b698d5fccf726066c60c136ac5a318
%global calico_ipam_sha256      ae32622d5c904e216cd914031e560e481c9ea9c213153172d0eacabadbb5e984
%endif

Name:           calico-cni-plugin
Version:        3.4.0
Release:        1%{?dist}
Summary:        Calico CNI plugin

ExclusiveArch:  x86_64
ExclusiveOS:    Linux

License:        Apache-2
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
* Thu Jan 24 2019 Nicolas Trangez <nicolas.trangez@scality.com> - 3.4.0-1
- Initial build