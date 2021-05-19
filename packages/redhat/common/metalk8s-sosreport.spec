Name:		metalk8s-sosreport
Version:	_VERSION_
Release:	2%{?dist}
Summary: 	Metalk8s SOS report custom plugins

BuildRequires: /usr/bin/pathfix.py

# Does not work with 4.0.0 and later
Requires: sos >= 3.1, sos < 4.0
%if 0%{rhel} >= 8
Requires: python3 >= 3.6
%else
Requires: python >= 2.6, python < 2.8
# NameError on FileNotFoundError in sos 3.5 python2.7
Conflicts: sos = 3.5
%endif

ExclusiveArch:  x86_64
ExclusiveOS:    Linux

License:        ASL 2.0
Source0:        ../../common/metalk8s-sosreport/metalk8s.py
Source1:        ../../common/metalk8s-sosreport/containerd.py

%description
%{Summary}

%if 0%{rhel} >= 8
%define python_lib %{python3_sitelib}
%else
%define python_lib %{python_sitelib}
%endif

%install
install -m 755 -d %{buildroot}/%{python_lib}/sos/plugins
install -p -m 755 %{_topdir}/SOURCES/metalk8s.py %{buildroot}/%{python_lib}/sos/plugins/metalk8s.py
install -p -m 755 %{_topdir}/SOURCES/containerd.py %{buildroot}/%{python_lib}/sos/plugins/containerd.py
%if 0%{rhel} >= 8
pathfix.py -pni "%{__python3} %{py3_shbang_opts}" %{buildroot}%{python_lib}
%else
pathfix.py -pni "%{__python} %{py_shbang_opts}" %{buildroot}%{python_lib}
%endif

%files
%defattr(-,root,root)
%{python_lib}/sos/plugins/containerd.py
%{python_lib}/sos/plugins/metalk8s.py
%if 0%{rhel} >= 8
%{python_lib}/sos/plugins/__pycache__/containerd.cpython-%{python3_version_nodots}.pyc
%{python_lib}/sos/plugins/__pycache__/containerd.cpython-%{python3_version_nodots}.opt-?.pyc
%{python_lib}/sos/plugins/__pycache__/metalk8s.cpython-%{python3_version_nodots}.pyc
%{python_lib}/sos/plugins/__pycache__/metalk8s.cpython-%{python3_version_nodots}.opt-?.pyc
%else
%{python_lib}/sos/plugins/metalk8s.pyc
%{python_lib}/sos/plugins/containerd.pyc
%{python_lib}/sos/plugins/metalk8s.pyo
%{python_lib}/sos/plugins/containerd.pyo
%endif

%changelog
* Tue Dec 08 2020 Alexandre Allard <alexandre.allard@scality.com> - 1.0.0-2
- Build for Python3

* Fri Jul 05 2019 SayfEddine Hammemi <sayf-eddine.hammemi@scality.com> - 1.0.0-1
- Initial build
