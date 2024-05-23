Name:		metalk8s-sosreport
Version:	_VERSION_
Release:	2%{?dist}
Summary: 	Metalk8s SOS report custom plugins

BuildRequires: /usr/bin/pathfix.py

# sos layout changed in version 4.0, in order to make things simpler
# let's consider we have sos >= 4.0 for RHEL 8+ and sos < 4.0 for RHEL 7
%if 0%{rhel} >= 8
Requires: sos >= 4.0
Requires: python3 >= 3.6
Requires: python3-requests
Requires: python3-boto3 >= 1.6
%else
Requires: sos >= 3.1, sos < 4.0
Requires: python >= 2.6, python < 2.8
Requires: python-requests
# NameError on FileNotFoundError in sos 3.5 python2.7
Conflicts: sos = 3.5
%endif

ExclusiveArch:  x86_64
ExclusiveOS:    Linux

License:        ASL 2.0
Source0:        ../../common/metalk8s-sosreport/metalk8s.py
Source1:        ../../common/metalk8s-sosreport/metalk8s_containerd.py

%description
%{Summary}

%if 0%{rhel} >= 8
%define python_lib %{python3_sitelib}
%define report_plugins %{python_lib}/sos/report/plugins
%else
%define python_lib %{python_sitelib}
%define report_plugins %{python_lib}/sos/plugins
%endif

%install
install -m 755 -d %{buildroot}/%{report_plugins}
install -p -m 755 %{_topdir}/SOURCES/metalk8s.py %{buildroot}/%{report_plugins}/metalk8s.py
install -p -m 755 %{_topdir}/SOURCES/metalk8s_containerd.py %{buildroot}/%{report_plugins}/metalk8s_containerd.py
%if 0%{rhel} >= 8
pathfix.py -pni "%{__python3} %{py3_shbang_opts}" %{buildroot}%{python_lib}
%else
pathfix.py -pni "%{__python} %{py_shbang_opts}" %{buildroot}%{python_lib}
%endif

%files
%defattr(-,root,root)
%{report_plugins}/metalk8s_containerd.py
%{report_plugins}/metalk8s.py
%if 0%{rhel} >= 8
%{report_plugins}/__pycache__/metalk8s_containerd.cpython-%{python3_version_nodots}.pyc
%{report_plugins}/__pycache__/metalk8s_containerd.cpython-%{python3_version_nodots}.opt-?.pyc
%{report_plugins}/__pycache__/metalk8s.cpython-%{python3_version_nodots}.pyc
%{report_plugins}/__pycache__/metalk8s.cpython-%{python3_version_nodots}.opt-?.pyc
%else
%{report_plugins}/metalk8s.pyc
%{report_plugins}/metalk8s_containerd.pyc
%{report_plugins}/metalk8s.pyo
%{report_plugins}/metalk8s_containerd.pyo
%endif

%changelog
* Tue Dec 08 2020 Alexandre Allard <alexandre.allard@scality.com> - 1.0.0-2
- Build for Python3

* Fri Jul 05 2019 SayfEddine Hammemi <sayf-eddine.hammemi@scality.com> - 1.0.0-1
- Initial build
