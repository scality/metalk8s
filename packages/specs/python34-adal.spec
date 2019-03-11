%global py3 python%{python3_pkgversion}
%global srcname adal

%global common_summary ADAL for Python
%global common_description The ADAL for Python library makes it easy for python applications to \
authenticate to AAD in order to access AAD protected web resources.

%global provider        github
%global provider_tld    com
%global project         AzureAD
%global repository      azure-activedirectory-library-for-python
%global provider_prefix https://%{provider}.%{provider_tld}/%{project}/%{repository}

Name:           %{py3}-%{srcname}
Version:        1.2.1
Release:        1%{?dist}
Summary:        %{common_summary}

Group:          System Environment/Libraries
License:        MIT
URL:            %{provider_prefix}/
Source0:        %{provider_prefix}/archive/%{version}.tar.gz

BuildArch:      noarch

%{?python_provide:%python_provide %{py3}-%{srcname}}

BuildRequires:  %{py3}-setuptools
BuildRequires:  %{py3}-devel

Requires:       %{py3}-dateutil
Requires:       %{py3}-jwt
Requires:       %{py3}-requests


%description
%{common_description}

%prep
%setup -q -n azure-activedirectory-library-for-python-%{version}

# Remove BOM
pushd adal/
tail --bytes=+4 __init__.py >__init__.py.new && \
touch -r __init__.py __init__.py.new && \
mv __init__.py.new __init__.py
popd

%build
%py3_build


%install
%py3_install


%check
# FIXME: needs python34-httpretty, which is not in EPEL...
# %{__python3} setup.py test


%files -n %{py3}-%{srcname}
%doc README.md
%license LICENSE
%{python3_sitelib}/*


%changelog
* Sun Mar 10 2019 Guillaume Demonet <guillaume.demonet@scality.com> - 1.2.1-1
- Initial build (copied and edited from the EPEL python-adal package)