%global py3 python%{python3_pkgversion}
%global distname requests-oauthlib
%global modname requests_oauthlib

%global provider        github
%global provider_tld    com
%global project         requests
%global repository      requests-oauthlib
%global provider_prefix https://%{provider}.%{provider_tld}/%{project}/%{repository}

Name:               %{py3}-%{distname}
Version:            1.1.0
Release:            1%{?dist}
Summary:            OAuthlib authentication support for Requests.

Group:              Development/Libraries
License:            ISC
URL:                http://pypi.python.org/pypi/requests-oauthlib
Source0:            %{provider_prefix}/archive/v%{version}.tar.gz

BuildArch:          noarch

%{?python_provide:%python_provide %{py3}-%{distname}}

BuildRequires:      %{py3}-devel
BuildRequires:      %{py3}-setuptools

# FIXME: test dependencies unavailable in the build container (oauthlib)
# BuildRequires:      %{py3}-oauthlib >= 0.6.2
# BuildRequires:      %{py3}-requests >= 2.0.0
# BuildRequires:      %{py3}-mock

Requires:           %{py3}-oauthlib
Requires:           %{py3}-requests

%description
This project provides first-class OAuth library support for python-request.

%prep
%setup -q -n %{distname}-%{version}

# Remove bundled egg-info in case it exists
rm -rf %{distname}.egg-info


%build
%py3_build

%install
%py3_install

%check
# FIXME: test dependencies unavailable in the build container
# %{__python3} setup.py test

%files -n %{py3}-%{distname}
%doc README.rst HISTORY.rst requirements.txt AUTHORS.rst
%license LICENSE
%{python3_sitelib}/%{modname}/
%{python3_sitelib}/%{modname}-%{version}*

%changelog
* Sun Mar 10 2019 Guillaume Demonet <guillaume.demonet@scality.com> - 1.1.0-1
- Initial build
