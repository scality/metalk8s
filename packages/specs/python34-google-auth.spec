%global py3 python%{python3_pkgversion}
%global library google-auth

%global provider        github
%global provider_tld    com
%global project         googleapis
%global repository      google-auth-library-python
%global provider_prefix https://%{provider}.%{provider_tld}/%{project}/%{repository}

Name:       %{py3}-%{library}
Version:    1.6.3
Release:    1%{?dist}
Summary:    Google Auth Python Library
License:    ASL 2.0
URL:        %{provider_prefix}

Source0:    %{provider_prefix}/archive/v%{version}.tar.gz

BuildArch:  noarch

%{?python_provide:%python_provide %{py3}-%{library}}

BuildRequires:  %{py3}-devel
BuildRequires:  %{py3}-setuptools
BuildRequires:  git

Requires:  %{py3}-pyasn1
Requires:  %{py3}-pyasn1-modules
Requires:  %{py3}-rsa
Requires:  %{py3}-six
Requires:  %{py3}-cachetools

%description
Google Auth Python Library

%prep
%setup -q -n google-auth-library-python-%{version}

%build
%py3_build

%install
%py3_install

%check

%files
%license LICENSE
%{python3_sitelib}/google/auth
%{python3_sitelib}/google/oauth2
%{python3_sitelib}/google_auth-%{version}*.egg-info
%{python3_sitelib}/google_auth-%{version}*.pth

# File is empty, which breaks RPMLint
%exclude %{python3_sitelib}/google/auth/crypt/_helpers.py

%changelog
* Sun Mar 10 2019 Guillaume Demonet <guillaume.demonet@scality.com> - 1.6.3-1
- Initial build (copied and edited from the EPEL python2-google-auth package)