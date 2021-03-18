Commit Best Practices
---------------------

Pre-commit hooks
~~~~~~~~~~~~~~~~

Some pre-commit hooks are defined to do some linting checks and also to format
all Python code automatically.

Those checks are also run in the CI pre-merge test suite to enforce code
linting.

To enable pre-commit hook to run automatically when committing, install it as
follows:

.. code-block:: shell

   pip install pre-commit
   pre-commit install

You can skip this pre-commit hook on a specific commit
``git commit --no-verify``.

To run pre-commit manually, use tox:

.. code-block:: shell

   tox -e pre-commit

It is also possible to run only a specific hook (e.g. for pylint
``tox -e pre-commit pylint``).

How to split a change into commits
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Why do we need to split changes into commits
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This has several advantages amongst which are:

- small commits are easier to review (a large pull request correctly divided
  into commits is easier/faster to review than a medium-sized one with less
  thought-out division)

- simple commits are easier to revert (`e866b01f0553 <https://github.com/scality/metalk8s/commit/e866b01f05535925e80da20aca00417904422433>`_/`8208a170ac66 <https://github.com/scality/metalk8s/commit/8208a170ac66912ace018bcd00c058ad214d169b>`_)/cherry-pick
  (`Pull request #1641 <https://github.com/scality/metalk8s/pull/1641>`_)

- when looking for a regression (e.g. using ``git bisect``) it is easier to
  find the root cause

- make ``git log`` and ``git blame`` way more useful

Examples
^^^^^^^^

The golden rule to create good commits is to ensure that there is only one
"logical" change per commit.

Cosmetic changes
::::::::::::::::

Use a dedicated commit when you want to make cosmetic changes to the code
(linting, whitespaces, alignment, renaming, etc.).

Mixing cosmetics and functional changes is bad because the cosmetics (which
tend to generate a lot of diff/noise) will obscure the important functional
changes, making it harder to correctly determine whether the change is correct
during the review.

Example (Pull request `#1620 <https://github.com/scality/metalk8s/issues/1620>`_):

- one commit for the cosmetic changes: `766f572e462c6933c8168a629ed4f479bb68a803 <https://github.com/scality/metalk8s/commit/766f572e462c6933c8168a629ed4f479bb68a803>`_

- one commit for the functional changes: `3367fabdefc0b35d34bf7cf2fb0d33ff81f9fd5a <https://github.com/scality/metalk8s/commit/3367fabdefc0b35d34bf7cf2fb0d33ff81f9fd5a>`_

Ideally, purely cosmetic changes which inflate the number of changes in a PR
significantly, should go in a separate PR

Refactoring
:::::::::::

When introducing new features, you often have to add new helpers or refactor
existing code. In such case, instead of having single commit with everything
inside, you can either:

1. first add a new helper: `29f49cbe9dfa <https://github.com/scality/metalk8s/commit/29f49cbe9dfa0b824c818d25d4a2f6965351e65d>`_

2. then use it in new code: `7e47310a8f20 <https://github.com/scality/metalk8s/commit/7e47310a8f20fd49f0ad36707b20e6c2a53df638>`_

Or:

1. first add the new code: `5b2a6d5fa498 <https://github.com/scality/metalk8s/commit/5b2a6d5fa49815180a2effdd37cb58542e83b5a5>`_

2. then refactor the now duplicated code: `ac08d0f53a83 <https://github.com/scality/metalk8s/commit/ac08d0f53a835a0b2bc61c1fe5b7317bf4d6550c>`_

Mixing unrelated changes
::::::::::::::::::::::::

It is sometimes tempting to do small unrelated changes as you are working on
something else in the same code area.
Please refrain to do so, or at least do it in a dedicated commit.

Mixing non-related changes into the same commit makes revert and cherry-pick
harder (and understanding as well).

The pull request `#1846 <https://github.com/scality/metalk8s/pull/1846>`_ is a good example. It tackles three issues at once: `#1830 <https://github.com/scality/metalk8s/issues/1830>`_
and `#1831 <https://github.com/scality/metalk8s/issues/1831>`_ (because they are similar) and `#839 <https://github.com/scality/metalk8s/issues/839>`_ (because it was making the other
changes easier), but it uses distincts commits for each issue.

How to write a commit message
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Why do we need commit messages
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

After comments in the code, commit messages are the easiest way to find context
for every single line of code: running ``git blame`` on a file will give you,
for each line, the identifier of the last commit that changed the line.

Unlike a comment in the code (which applies to a single line or file), a commit
message applies to a logical change and thus can provide information on the
design of the code and why the change was done. This makes commit messages a
part of the code documentation and makes them helpful for other developers to
understand your code.

Last but not least: commit messages can also be used for automating tasks such
as issue management.

Note that it is important to have all the necessary information in the commit
message, instead of having them (only) in the related issue, because:

- the issue can contain troubleshooting/design discussion/investigation with a
  lot of back and forth, which makes hard to get the gist of it.

- you need access to an external service to get the whole context, which goes
  against one of biggest advantage of the distributed SCM (having all the
  information you need offline, from your local copy of the repository).

- migration from one tracking system to another will invalidate the
  references/links to the issues.

Anatomy of a good commit message
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

A commit is composed of a subject, a body and a footer. A blank line separates
the subject from body and the body from the footer.

The body can be omitted for trivial commit. That being said, be very careful:
a change might seem trivial when you write it but will seem totally awkward
the day you will have to understand why you made it. If you think your patch is
trivial and somebody tells you he does not understand your patch, then your
patch is not trivial and it requires a detailed description.

The footer contains references for issue management (``Refs``, ``Closes``,
etc.) or other relevant annotations (cherry-pick source, etc.).
Optional if your commit is not related to any issue (should be pretty rare).

Subject
:::::::

A good commit message should start with a short summary of the change: the
subject line.

This summary should be written using the imperative mood and carry as much
information as possible while staying short, ideally under 50 characters (this
is a goal, the hard limit is 72).

Subject topic and description shouldn't start with a capital.

It is composed of:

- a topic, usually the name of the affected component (``ui``, ``build``,
  ``docs``, etc.)

- a slash and then the name of the sub-component (optional)

- a colon

- the description of the change

Examples:

- ``ci: use proxy-cache to reduce flakiness``

- ``build/package: factorize task_dep in DEBPackage``

- ``ui/volume: add banner when failed to create volume``

If several components are affected:

- split your commit (preferred)

- pick only the most affected one

- entirely omit the component (happen for truly global change, like renaming
  ``licence`` to ``license`` over the whole codebase)

As for "what is the topic?", the following heuristic works quite well for
MetalK8s: take the name of the top-level directory (``ui``, ``salt``, ``docs``,
etc.) except for ``eve`` (use ``ci`` instead). ``buildchain`` could also be
shortened to ``build``.

Having the topic in the summary line allows for faster peering over ``git log``
output (you can know what the commit is about just by reading a few characters,
not need to check the entire commit message or the associated diff).
It also helps the review process: if you have a big pull request affecting
front-end and back-end, front-end people can only review commits starting with
``ui`` (not need to read over the whole diff, or to open each commit one by one
in Github to see which ones are interesting).

Body
::::

The body should answer the following questions:

- Why did you make this change? (is this for a new feature, a bugfix - then,
  why was it buggy? -, some cleanup, some optimization, etc.).
  It is really important to describe the intent/motivation behind the changes.

- What change did you make? Document what the original problem was and how it
  is being fixed (can be omitted for short obvious patches).

- Why did you make the change in that way and not in another (mention alternate
  solutions considered but discarded, if any)?

When writing your message you must consider that your reader does not know
anything about the code you have patched.

You should also describe any limitations of the current code. This will avoid
reviewer pointing them out, and also inform future people looking at the code
which tradeoffs were made at the time.

Lines must be wrapped at 72 characters.

Footer
::::::

Use `references <https://help.github.com/en/github/managing-your-work-on-github/closing-issues-using-keywords>`_
such as ``Refs``, ``See``, ``Fixes`` or ``Closes`` followed by
an issue number to automate issue management.

In addition to the references, you can also provide the URLs (it will be
quicker to access them from the terminal).

Example:

.. code:: text

    topic: description

    [ commit message body ]

    Refs: #XXXXX
    Refs: #YYYYY
    Closes: #ZZZZZ
    See: https://github.com/scality/metalk8s/issues/XXXXX
    See: https://github.com/scality/metalk8s/issues/YYYYY
    See: https://github.com/scality/metalk8s/issues/ZZZZZ

Footer can also contain a signature (``git commit -s``) or cherry-pick source
(``git cherry-pick -x``).

Examples
^^^^^^^^

Bad commit message
::::::::::::::::::

- ``Quick fix for service port issue``: what was the issue? It is a quick fix,
  why not a proper fix? What are the limitations?

- ``fix glitchs``: as expressive and useful as ~fix stuff~

- ``Bump Create React App to v3 and add optional-chaining``: Why? What are the
  benefits?

- ``Add skopeo & m2crypto to packages list``: Why do we need them?

- ``Split certificates bootstrap between CA and clients``: Why do we need this
  split? What is the issue we are trying to solve here?

Note that none of these commits contain a reference to an issue (which
could have been used as an (invalid) excuse for the lack of information): you
really have no more context/explanation than what is shown here.

Good commit message
:::::::::::::::::::

Commit `b531290c04c4 <https://github.com/scality/metalk8s/commit/b531290c04c45a01cd103a85431e2428b98d340e>`_
''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''

.. code:: text

    Add gzip to nginx conf

    This will decrease the size of the file the client need to download
    In the current version we have ~7x improvement.
    From 3.17Mb to 0.470Mb send to the client

Some things to note about this commit message:

- Reason behind the changes are explained: we want to decrease the size of
  the downloaded resources.

- Results/effects are demonstrated: measurements are given.

Commit `82d92836d4ff <https://github.com/scality/metalk8s/commit/82d92836d4ff78c623a0e06302c94cfa5ff79908>`_
''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''

.. code:: text

    Use safer invocation of shell commands

    Running commands with the "host" fixture provided by testinfra was done
    without concern for quoting of arguments, and might be vulnerable to
    injections / escaping issues.

    Using a log-like formatting, i.e. `host.run('my-cmd %s %d', arg1, arg2)`
    fixes the issue (note we cannot use a list of strings as with
    `subprocess`).

    Issue: GH-781

Some things to note about this commit message:

- Reasons behind the changes are explained: potential security issue.

- Solution is described: we use log-like formatting.

- Non-obvious parts are clarified: cannot use a list of string (as expected)
  because it is not supported.

Commit `f66ac0be1c19 <https://github.com/scality/metalk8s/commit/f66ac0be1c191be8fa31a925c28d34c113eb172c>`_
''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''

.. code:: text

    build: fix concurrent build on MacOS

    When trying to use the parallel execution feature of `doit` on Mac, we
    observe that the worker processes are killed by the OS and only the
    main one survives.

    The issues seems related to the fact that:
    - by default `doit` uses `fork` (through `multiprocessing`) to spawn its
      workers
    - since macOS 10.13 (High Sierra), Apple added a new security measure[1]
      that kill processes that are using a dangerous mix of threads and
      forks[2])

    As a consequence, now instead of working most of the time (and failing
    in a hard way to debug), the processes are directly killed.

    There are three ways to solve this problems:
    1. set the environment variable `OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES.`
    2. don't use `fork`
    3. fix the code that uses a dangerous mix of thread and forks

    (1) is not good as it doesn't fix the underlying issue: it only disable
    the security and we're back to "works most of the time, sometimes does
    weird things"
    (2) is easy to do because we can tell to `doit` to uses only threads
    instead of forks.
    (3) is probably the best, but requires more troubleshooting/time/

    In conclusion, this commit implements (2) until (3) is done (if ever) by
    detecting macOS and forcing the use of threads in that case.

    [1]: http://sealiesoftware.com/blog/archive/2017/6/5/Objective-C_and_fork_in_macOS_1013.html
    [2]: https://blog.phusion.nl/2017/10/13/why-ruby-app-servers-break-on-macos-high-sierra-and-what-can-be-done-about-it/

    Closes: #1354

Some things to note about this commit message:

- Observed problem is described: parallel builds crash on macOS.

- Root cause is analyzed: OS security measure + thread/fork mix.

- Several solution are proposed: disable the security, workaround the problem
  or fix the root cause.

- Selection of a solution is explained: we go for the workaround because it is
  easy and faster.

- Extra-references are given: links in the footer gives more in-depth
  explanations/context.

Conclusion
~~~~~~~~~~

When reviewing a change, do not simply look at the correctness of the code:
review the commit message itself and request improvements to its content.
Look out for commits that can be divided, ensure that cosmetic changes are not
mixed with functional changes, etc.

The goal here is to improve the long term maintainability, by a wide variety of
developers who may only have the Git history to get some context so it is
important to have a useful Git history.
