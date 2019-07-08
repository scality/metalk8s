Name:		metalk8s-sosreport
Version:	_VERSION_
Release:	1%{?dist}
Summary: 	Metalk8s SOS report custom plugins


Requires: python >= 2.6, python < 2.8
Requires: sos >= 3.1
# NameError on FileNotFoundError in sos 3.5 python2.7
Conflicts: sos = 3.5

ExclusiveArch:  x86_64
ExclusiveOS:    Linux

License:        GPL+
Source0:        metalk8s-sosreport/src/metalk8s.py
Source1:        metalk8s-sosreport/src/containerd.py

%description
%{Summary}

%install
install -m 755 -d %{buildroot}/%{python_sitelib}/sos/plugins
install -p -m 755 %{_topdir}/SOURCES/metalk8s.py %{buildroot}/%{python_sitelib}/sos/plugins/metalk8s.py
install -p -m 755 %{_topdir}/SOURCES/containerd.py %{buildroot}/%{python_sitelib}/sos/plugins/containerd.py

%files
%defattr(-,root,root)
%{python_sitelib}/sos/plugins/metalk8s.py
%{python_sitelib}/sos/plugins/containerd.py
%{python_sitelib}/sos/plugins/metalk8s.pyc
%{python_sitelib}/sos/plugins/containerd.pyc
%{python_sitelib}/sos/plugins/metalk8s.pyo
%{python_sitelib}/sos/plugins/containerd.pyo

%changelog
* Fri Jul 05 2019 SayfEddine Hammemi <sayf-eddine.hammemi@scality.com> - 1.0.0-1
- Initial build
