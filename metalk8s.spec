Name:		metalk8s
Version:	2.0.0
Release:	1%{?dist}
Summary:	An opinionated Kubernetes distribution

License:	ASL 2.0
URL:		https://github.com/Scality/metalk8s
Source0:	metalk8s-%{version}.tar.gz
Source1:	metalk8s-ui-%{version}-node-modules.tar.gz

%description
An opinionated Kubernetes distribution with a focus on long-term on-prem
deployments.

%package ui
Summary:	A web UI for MetalK8s
BuildArch:	noarch
BuildRequires:	/usr/bin/npm

%description ui
%{summary}.

%prep
%setup -q
/usr/bin/gzip -dc %{SOURCE1} | /usr/bin/tar -C ui -xf -

%build
cd ui
# The build tree is on tmpfs, which Docker sets up `noexec`, so we can't `npm
# run build` directly, because this invokes `react-scripts` as a script.
/usr/bin/env node node_modules/.bin/react-scripts build

%install
# metalk8s-ui
install -m 755 -d %{buildroot}/%{_datadir}/metalk8s-ui/
pushd ui/build
find . -type d -exec install -m 755 -d %{buildroot}/%{_datadir}/metalk8s-ui/{}/ \;
find . -type f -exec install -p -m 644 {} %{buildroot}/%{_datadir}/metalk8s-ui/{} \;
popd

%files
%doc README.md
%license LICENSE

%files ui
%doc ui/README.md
%license LICENSE
%{_datadir}/metalk8s-ui

%changelog
* Mon Mar 18 2019 Nicolas Trangez <ikke@nicolast.be> - 2.0.0
- Initial import
