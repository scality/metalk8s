Name:		metalk8s-sosreport
Version:	_VERSION_
Release:	2%{?dist}
Summary: 	Metalk8s SOS report custom plugins

BuildRequires: /usr/bin/pathfix.py

Requires: sos >= 4.0
Requires: python3 >= 3.6
Requires: python3-requests
Requires: python3-boto3 >= 1.6

ExclusiveArch:  x86_64
ExclusiveOS:    Linux

License:        ASL 2.0
Source0:        ../../common/metalk8s-sosreport/metalk8s.py
Source1:        ../../common/metalk8s-sosreport/metalk8s_containerd.py

%description
%{Summary}

%define python_lib %{python3_sitelib}
%define report_plugins %{python_lib}/sos/report/plugins

%install
install -m 755 -d %{buildroot}/%{report_plugins}
install -p -m 755 %{_topdir}/SOURCES/metalk8s.py %{buildroot}/%{report_plugins}/metalk8s.py
install -p -m 755 %{_topdir}/SOURCES/metalk8s_containerd.py %{buildroot}/%{report_plugins}/metalk8s_containerd.py
pathfix.py -pni "%{__python3} %{py3_shbang_opts}" %{buildroot}%{python_lib}

%files
%defattr(-,root,root)
%{report_plugins}/metalk8s_containerd.py
%{report_plugins}/metalk8s.py
%{report_plugins}/__pycache__/metalk8s_containerd.cpython-%{python3_version_nodots}.pyc
%{report_plugins}/__pycache__/metalk8s_containerd.cpython-%{python3_version_nodots}.opt-?.pyc
%{report_plugins}/__pycache__/metalk8s.cpython-%{python3_version_nodots}.pyc
%{report_plugins}/__pycache__/metalk8s.cpython-%{python3_version_nodots}.opt-?.pyc

%changelog
* Tue Dec 08 2020 Alexandre Allard <alexandre.allard@scality.com> - 1.0.0-2
- Build for Python3

* Fri Jul 05 2019 SayfEddine Hammemi <sayf-eddine.hammemi@scality.com> - 1.0.0-1
- Initial build
