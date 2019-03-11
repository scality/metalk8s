%global py3 python%{python3_pkgversion}
%global library jwcrypto

%global provider        github
%global provider_tld    com
%global project         latchset
%global repository      jwcrypto
%global provider_prefix https://%{provider}.%{provider_tld}/%{project}/%{repository}


Name:           %{py3}-%{library}
Version:        0.4.2
Release:        1%{?dist}
Summary:        Implements JWK,JWS,JWE specifications using python-cryptography

License:        LGPLv3+
URL:            https://github.com/latchset/%{module_name}
Source0:        https://github.com/latchset/%{module_name}/releases/download/v%{version}/jwcrypto-%{version}.tar.gz
Source1:        https://github.com/latchset/%{module_name}/releases/download/v%{version}/jwcrypto-%{version}.tar.gz.sha512sum.txt

BuildArch:      noarch
BuildRequires:  python-devel
BuildRequires:  python-setuptools
BuildRequires:  python-cryptography >= 1.5
BuildRequires:  pytest
Requires:       python-cryptography >= 1.5

%if 0%{?with_python3}
BuildRequires:      python3-devel
BuildRequires:      python3-setuptools
BuildRequires:      python3-cryptography >= 1.5
BuildRequires:      python3-pytest
%endif

%description
Implements JWK,JWS,JWE specifications using python-cryptography

%if 0%{?with_python3}
%package -n python3-jwcrypto
Summary:            Implements JWK,JWS,JWE specifications using python3-cryptography
Requires:           python3-cryptography

%description -n python3-jwcrypto
Implements JWK,JWS,JWE specifications using python3-cryptography
%endif

%prep
grep `sha512sum %{SOURCE0}` %{SOURCE1} || (echo "Checksum invalid!" && exit 1)
%setup -q -n %{module_name}-%{version}


%build
%{__python2} setup.py build
%if 0%{?with_python3}
%{__python3} setup.py build
%endif


%install
%{__python2} setup.py install -O1 --skip-build --root %{buildroot}
%if 0%{?with_python3}
%{__python3} setup.py install -O1 --skip-build --root %{buildroot}
%endif
rm -rf %{buildroot}%{_docdir}/%{module_name}
rm -rf %{buildroot}%{python2_sitelib}/%{module_name}/tests{,-cookbook}.py*
%if 0%{?with_python3}
rm -rf %{buildroot}%{python3_sitelib}/%{module_name}/tests{,-cookbook}.py*
rm -rf %{buildroot}%{python3_sitelib}/%{module_name}/__pycache__/tests{,-cookbook}.*.py*
%endif


%check
%{__python2} -m py.test -vv ./%{module_name}/tests{,-cookbook}.py
%if 0%{?with_python3}
%{__python3} -m py.test -vv ./%{module_name}/tests{,-cookbook}.py
%endif


%files
%doc README.md
%license LICENSE
%{python2_sitelib}/%{module_name}
%{python2_sitelib}/%{module_name}-*.egg-info

%if 0%{?with_python3}
%files -n python3-jwcrypto
%doc README.md
%license LICENSE
%{python3_sitelib}/%{module_name}
%{python3_sitelib}/%{module_name}-*.egg-info
%endif


%changelog
* Thu Aug 17 2017 Christian Heimes <cheimes@redhat.com> - 0.4.2-1
- Rebase to 0.4.2, resolves rhbz#1434409

* Mon Apr 04 2016 Christian Heimes <cheimes@redhat.com> - 0.2.1-2
- Correct download link

* Thu Mar 31 2016 Christian Heimes <cheimes@redhat.com> - 0.2.1-1
- Initial packaging