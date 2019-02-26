# Contributing to the Project

This document contains and defines the rules that have to be followed by any
contributor to the project, in order for any change to be merged into the
stable branches.

## Workflow

The workflow followed is [GitWaterFlow](https://dl.acm.org/citation.cfm?id=2993277)
([PDF](https://mt.scality.com/asset/169:releng-release-process)).
In short, a contributor will target the lowest version branch impacted,
starting with 2.0, and the changes will automatically be forward-ported
to more recent versions.

## Restrictions on the development/X.Y branch

The `development/X.Y` branches are very specific branches in the GitWaterFlow
workflow - the per-version release branches. No commit must ever go directly
into any of these branches, and the code shall follow one and only one path to
get into these release branches.

Merging a pull request into these branches will only ever be done by the
Bert-E merging bot. Once the necessary approvals and CI passes are met, one 
only needs to comment `@bert-e approve` to trigger the merging process
for one's pull request.

## Workflow Guidelines

### Branching Guidelines

When branching, the branch name should have one of the following prefixes:

* improvement/
* bugfix/
* feature/

Failure to name the branch with one of these prefixes will cause our merging
bot to **ignore** the pull request at merge-time.

Additionally, the branch name should also contain a reference to the issue
being tackled. For example, a branch tackling issue 123 introducing the new
feature FooBar might be named `feature/GH-123-add-shiny-new-feature-FooBar`.


### Committing Guidelines

No restrictions are placed at this time on individual commits passing in the
CI and/or maintaining full functionality of the repository.

Commit messages should:

* have a short (< 50 characters) summary as title
* contain more explanations, if necessary, in the body
* contain a reference to the issue being tackled in the body

A commit message should *not* contain a reference to the issue in the title.

### Pull Request Guidelines

Pull requests should contain in their body a reference to the GitHub issue 
being targeted by the changeset introduced.

### Signing your work

In order to contribute to the project, you must sign your work. By signing your
work, you certify to the statements set out in the Developer Certificate of
Origin below (from
[developercertificate.org](http://developercertificate.org/)):

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.
1 Letterman Drive
Suite D4700
San Francisco, CA, 94129

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

Signing your work is easy. Just add the following line at the end of each of
your commit messages. You must use your real name in your sign-off.

```
Signed-off-by: Jane Doe <jane.doe@email.com>
```

If your `user.name` and `user.email` are set in your git configs, you can sign
each commit automatically by using the `git commit -s` command.

Note that contributors employed by Scality are considered to sign every commit
by virtue of their contract with Scality.
