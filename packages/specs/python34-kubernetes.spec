%global py3 python%{python3_pkgversion}
%global library kubernetes

%global provider        github
%global provider_tld    com
%global project         kubernetes-client
%global provider_prefix %{provider}.%{provider_tld}/%{project}

Name:       %{py3}-%{library}
Version:    8.0.1
Release:    1%{?dist}
Summary:    Python client for the kubernetes API
License:    ASL 2.0
URL:        https://pypi.python.org/pypi/kubernetes

Source0:    %{provider_prefix}/python/archive/v%{version}.tar.gz
Source1:    %{provider_prefix}/python-base/archive/83ebb9d5fdc0d46bbb2e30afcd8eec42c5da4ad1.tar.gz

BuildArch:  noarch

%{?python_provide:%python_provide %{py3}-%{library}}

BuildRequires:  git
BuildRequires:  %{py3}-devel
BuildRequires:  %{py3}-setuptools 

Requires:  %{py3}-adal
Requires:  %{py3}-certifi
Requires:  %{py3}-dateutil
Requires:  %{py3}-google-auth
Requires:  %{py3}-PyYAML
Requires:  %{py3}-requests
Requires:  %{py3}-requests-oauthlib
Requires:  %{py3}-setuptools 
Requires:  %{py3}-six
Requires:  %{py3}-urllib3
Requires:  %{py3}-websocket-client


%description
Python client for the kubernetes API.

%package -n %{py3}-%{library}-tests
Summary:    Tests python-kubernetes library

Requires:  %{py3}-nose
Requires:  %{py3}-py
Requires:  %{py3}-mock
Requires:  %{py3}-%{library} = %{version}-%{release}

%description -n %{py3}-%{library}-tests
Tests python-kubernetes library

%prep
%setup -q -n python-%{version}
pushd kubernetes
rm -rf base
tar zxvf %{SOURCE1}
mv python-base-83ebb9d5fdc0d46bbb2e30afcd8eec42c5da4ad1 base
popd

%build
%py3_build

%install
%py3_install
cp -pr kubernetes/test %{buildroot}%{python3_sitelib}/%{library}/
cp -pr kubernetes/e2e_test %{buildroot}%{python3_sitelib}/%{library}/

%check

%files -n %{py3}-%{library}
%license LICENSE
%doc README.md
%{python3_sitelib}/%{library}
%{python3_sitelib}/%{library}-*.egg-info
%exclude %{python3_sitelib}/%{library}/test
%exclude %{python3_sitelib}/%{library}/e2e_test

%files -n %{py3}-%{library}-tests
%license LICENSE
%{python3_sitelib}/%{library}/test
%{python3_sitelib}/%{library}/e2e_test

%changelog
* Wed Mar 06 2019 Guillaume Demonet <guillaume.demonet@scality.com> - 8.0.1-1
- Initial build
