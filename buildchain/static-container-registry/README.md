static-container-registry
=========================
This is a set of scripts to create a Docker-compatible read-only 'registry' that
can be served by a static Nginx HTTP server, without the need to run a
full-fledged registry solution.

Getting Started
---------------
First, create a directory that'll contain all images that should be part of the
registry, e.g.

```
$ mkdir images/
```

Then, for every image you want to serve, fetch the image using `skopeo` into a
`dir` target. For every image `name:tag`, create a directory `name` in the root
directory, and let `skopeo` copy the image into `name/tag`:

```
$ mkdir images/alpine images/metalk8s-keepalived
$ skopeo copy --format v2s2 --dest-compress docker://docker.io/alpine:3.9.3 dir:images/alpine/3.9.3
$ skopeo copy --format v2s2 --dest-compress docker://docker.io/alpine:3.9 dir:images/alpine/3.9
$ skopeo copy --format v2s2 --dest-compress docker-daemon:alpine:3.8.4 dir:images/alpine/3.8.4
$ skopeo copy --format v2s2 --dest-compress docker://docker.io/nicolast/metalk8s-keepalived:latest dir:images/metalk8s-keepalived/latest
```

For extra credits, we tell `skopeo` to compress all layers.

In the example above, we pulled Alpine 3.9(.3) twice. As a result, the same
files are now stored multiple files on the system. If many of your images use
the same base image(s), this can quickly add up. Luckily, there's an easy way to
reduce this overhead since these files are always immutable: use hardlinks!
There's a tool which does exactly this, aptly called `hardlink`:

```
$ hardlink -c -vv images
Linked images/metalk8s-keepalived/latest/version to images/alpine/3.9.3/version, saved 33
Linked images/metalk8s-keepalived/latest/version to images/alpine/3.8.4/version, saved 33
Linked images/alpine/3.9.3/cdf98d1859c1beb33ec70507249d34bacf888d59c24df3204057f9a6c758dddb to images/alpine/3.9/cdf98d1859c1beb33ec70507249d34bacf888d59c24df3204057f9a6c758dddb, saved 1512
Linked images/metalk8s-keepalived/latest/version to images/alpine/3.9/version, saved 33
Linked images/alpine/3.9.3/bdf0201b3a056acc4d6062cc88cd8a4ad5979983bfb640f15a145e09ed985f92 to images/alpine/3.9/bdf0201b3a056acc4d6062cc88cd8a4ad5979983bfb640f15a145e09ed985f92, saved 2757009
Linked images/alpine/3.9.3/manifest.json to images/alpine/3.9/manifest.json, saved 528


Directories 7
Objects 24
IFREG 17
Comparisons 7
Linked 6
saved 2781184
```

Now we're ready to create an Nginx configuration file that can be `include`d in
a larger configuration:

```
$ ./static-container-registry.py ./images > registry.conf
```

The following options are available:

- `--name-prefix PREFIX` will prefix `PREFIX` to every container name. As an
  example, given the layout above, setting this to `myproject` would make
  `docker pull registry.domain.tld/myproject/alpine:3.9` work, instead of `docker pull
  registry.domain.tld/alpine:3.9`.
- `--server-root PATH` tells the script where the image files will be stored on
  the web-server. This defaults to the provided image path when the script is
  executed. Hint: this can be any string, including a variable name (e.g.
  `$registry_root`, though remember to take care of shell quoting!), which can
  then be defined (`set $registry_root /path/to/images`) in another Nginx
  configuration file).
- Finally, the positional argument must be the path to the image files. This can
  be unspecified, which will then default to the current working directory.

All that's left to be done is firing up `nginx` with the configuration
`include`d.

Using Docker
------------
A Docker container image for this project is automatically built
[on DockerHub](https://hub.docker.com/r/nicolast/static-container-registry).
To use this image, first create a directory containing all required image blobs
(see above), then run

```
$ docker run \
    --name static-oci-registry \
    -p 127.0.0.1:80:80 \
    --mount type=bind,source=/absolute/path/to/images,destination=/var/lib/images,ro \
    --rm \
    --read-only \
    --mount type=tmpfs,destination=/run \
    --mount type=tmpfs,destination=/var/cache/nginx \
    docker.io/nicolast/static-container-registry:latest
```

Make sure to replace the path to the `images`, which should be exposed at
`/var/lib/images` to the container.

Goals and non-goals
-------------------
This tool is supposed to 'implement' the Docker distribution APIs to the extent
required for `docker pull` (and other container runtimes and tools) to work.
This does not necessarily imply all subtle details of the distribution API,
including error reporting, are fully implemented.

This tool does not, and will never, support uploads (`push`) of new images.

Thanks
------
- [@mtrmac](https://github.com/mtrmac) for hinting at using the `dir` target of
  `skopeo` in
  [#469](https://github.com/containers/skopeo/issues/469#issuecomment-465353019)
- [@rhatdan](https://github.com/rhatdan) and the `skopeo` team for `skopeo`
