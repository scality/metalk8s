%global py3 python%{python3_pkgversion}
%global library oauthlib

%global provider        github
%global provider_tld    com
%global project         idan
%global repository      oauthlib
%global provider_prefix https://%{provider}.%{provider_tld}/%{project}/%{repository}


Name:               %{py3}-%{library}
Version:            3.0.1
Release:            1%{?dist}
Summary:            An implementation of the OAuth request-signing logic

Group:              Development/Libraries
License:            BSD
URL:                http://pypi.python.org/pypi/oauthlib

Source0:            %{provider_prefix}/archive/v%{version}.tar.gz

BuildArch:          noarch

%{?python_provide:%python_provide %{py3}-%{library}}

BuildRequires:      %{py3}-devel
BuildRequires:      %{py3}-setuptools

Requires:           %{py3}-jwcrypto
Requires:           %{py3}-cryptography >= 0.8.1


%description
OAuthLib is a generic utility which implements the logic of OAuth without
assuming a specific HTTP request object or web framework. Use it to graft
OAuth client support onto your favorite HTTP library, or provider support
onto your favourite web framework. If you're a maintainer of such a
library, write a thin veneer on top of OAuthLib and get OAuth support for
very little effort.

%prep
%setup -q -n %{library}-%{version}

# Remove bundled egg-info in case it exists
rm -rf %{library}.egg-info

%build
%py3_build

%install
%py3_install

%check

%files
%doc README.rst
%license LICENSE
%{python3_sitelib}/%{library}/
%{python3_sitelib}/%{library}-%{version}-*

%changelog
* Sun Mar 10 2019 Guillaume Demonet <guillaume.demonet@scality.com> - 3.0.1-1
- Initial build
