<h1>
    <img src="artwork/generated/metalk8s-logo-wide-black-400.png" width="400" height="100%" alt="MetalK8s logo" title="Debian packages" />
</h1>

## Requirement

To build manually, the commands `debuild` and `dh` are required.
To install them, run the following:

```shell
apt install devscripts build-essential debhelper
```

## Package building

In the package folder, run the following:

```shell
debuild -b -uc -us
```

In the parent folder, verify that you have the `<package-name_version_archi.deb>`

## Package installation

To install the generated Debian package, run the following:

```shell
dpkg -i `<package-name_version_archi.deb>`
```

