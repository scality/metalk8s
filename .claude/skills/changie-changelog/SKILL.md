---
name: changie-changelog
description: >
  Manage changelog entries in repositories that use the changie CLI plus
  the paired `changie-add-changelog` / `changie-check-changelog` GitHub
  Actions workflows. Use when the repo contains `.changie.yaml` alongside
  either `.github/workflows/changie-add-changelog.yaml` or
  `.github/workflows/changie-check-changelog.yaml`. Covers the preferred
  PR flow (post a `/changie` comment rather than committing an
  `unreleased/*.yaml`), local `changie new` usage, and the comment
  lifecycle (edit/delete round-trips to the entry).
allowed-tools: [Read, Grep, Glob, Bash]
---

# Changie changelog workflow

This skill applies to any repository that pairs the
[changie](https://changie.dev) CLI with the "changie-add-changelog" and
"changie-check-changelog" GitHub Actions workflows. Together they let
contributors describe a changelog entry with a single `/changie` PR
comment, and enforce that every non-trivial PR has one.

## When to activate

Activate this skill in a repository where **all three** of the
following exist:

1. `.changie.yaml` at the repo root.
2. `.github/workflows/changie-add-changelog.yaml`.
3. `.github/workflows/changie-check-changelog.yaml`.

Quick probe:

```bash
test -f .changie.yaml \
  && test -f .github/workflows/changie-add-changelog.yaml \
  && test -f .github/workflows/changie-check-changelog.yaml \
  && echo "adopted"
```

If any file is missing, do not use this skill — fall back to the repo's
native changelog convention (e.g. editing `CHANGELOG.md` directly).

## Preferred behaviour when Claude creates a PR

**Default:** after opening a PR, add the changelog entry by posting a
`/changie` comment on the PR — do **not** commit a
`.changes/unreleased/*.yaml` on the branch.

Rationale: the `changie-add-changelog` workflow tracks which comment
created which entry via `custom.CommentId`. Entries authored via
comment can later be edited (edit the comment) or removed (delete the
comment). A yaml committed manually is orphaned from that lifecycle and
can only be edited/removed by touching the file directly.

The user can override this default by asking Claude to commit the yaml
directly (e.g. "add the changelog yaml on the branch, don't use the
`/changie` comment"). Only skip the comment flow when explicitly told
to.

### Full sequence

```
1. Make code changes on a feature branch.
2. Push the branch.
3. Create the PR:  gh pr create ...
4. Decide (see "Choosing an entry vs. `skip changelog`" below):
   - If the change looks trivial (CI-only, docs-only, chore), ask
     the user whether to apply the `skip changelog` label. NEVER
     apply it automatically.
   - Otherwise → continue.
5. Post the /changie comment(s):
       gh pr comment <PR#> --body "/changie <Kind> <body>"
   Repeat once per entry if the PR carries more than one entry — see
   "Multiple entries per PR" below.
6. Wait: the changie-add-changelog workflow reacts 👍 and commits the
   yaml to the PR branch. The changie-check-changelog workflow re-runs
   and posts a success preview comment.
```

Step 5 uses a heredoc for multi-line bodies (see below).

## Match the existing CHANGELOG.md style

Before drafting any entry body — for a single entry, a split, a
combined write-up, or a rewording of a user-supplied line — read a
sample of the repo's existing `CHANGELOG.md` and match its style.
Projects converge on different conventions and matching them makes
the entry read as if it belongs.

Recommended: skim the top ~200 lines of `CHANGELOG.md` for the most
recent released entries, plus the current in-flight entries:

```bash
head -n 200 CHANGELOG.md
ls .changes/unreleased/*.yaml 2>/dev/null | xargs -r -n1 tail -n +1
```

Things to align on:

- **Tense / mood.** Imperative ("Add X"), past ("Added X"), or
  present ("Adds X") — pick whichever is dominant in recent entries.
- **Detail level.** If existing entries stay to one line, don't
  over-explain. If they sub-bullet the affected components or the
  breaking-change consequences, do the same.
- **Terminology.** Reuse the exact names existing entries use for
  components, subsystems, products, features.
- **Cross-references.** If entries include a ticket trailer
  (`Ref MK8S-XXX`, `Fixes #123`, upstream release-note link, …),
  follow that convention.
- **Line wrapping.** If existing entries hard-wrap at ~80 chars
  inside the body, wrap the new one the same way.
- **Dependency-bump format.** For version-bump PRs especially, look
  at the last few bump entries — projects often standardise on
  `from → to`, sub-bulleted upstream highlights, upstream changelog
  links, etc. Reproduce that shape.

Only fall back to a plain imperative first line + optional detail
lines when `CHANGELOG.md` is empty or has only a header — then let
the user shape the style from there.

## Multiple entries per PR

A PR can carry any number of changelog entries — one per `/changie`
comment. Decide how many based on the PR, not on the request:

- **User explicitly asks for multiple entries.** Post one `/changie`
  comment per entry, in the order the user specifies. No need to
  double-check — they've already made the call.

- **The PR is a natural mix of concerns and the user only asked for
  "a changelog".** Suggest the split and ask the user to confirm
  before posting. Describe each proposed entry (kind + first line)
  and let them approve, reject, or reshape the split. Do not
  silently produce multiple entries; a single well-worded entry is
  the default and the split is an offer.

- **The PR clearly warrants a single entry.** Don't offer a split.

PRs that typically warrant a suggested split:

- **Independent dependency bumps** in one PR — one entry per
  dependency (e.g. one for `kube-prometheus`, one for `containerd`),
  so each shows up on its own bullet in the release notes.
- **Refactor + drive-by bug fix** — one `Enhanced` and one `Fix`.
- **Breaking API change + paired migration helper** — one
  `Breaking` and one `Added`.

PRs that should stay a single entry:

- A single feature spread across multiple files.
- A single bug fix, even if the fix touches several places.
- A version bump of one component (even if the yaml diff is large).

Posting multiple entries is just calling `gh pr comment` several
times — one comment per entry. Each comment owns its entry
independently: editing one comment updates only its entry, deleting
one comment removes only its entry.

## `/changie` comment syntax

Single-line:

```
/changie Fix Corrected the deployment logic when running on ARM
```

Multi-line — everything after the first line is captured as additional
body text:

```
/changie Enhanced
Bump the Kubernetes version to 1.34.7.
- drops support for RHEL 8
- requires containerd 2.x
```

Both forms combine — text on the same line as `/changie <Kind>` is
joined to the following lines with a newline:

```
/changie Enhanced Bump Kubernetes to 1.34.7.
- drops support for RHEL 8
- requires containerd 2.x
```

The `<Kind>` token must match a `label` in `.changie.yaml` exactly
(case-sensitive).

### Posting from the CLI

Single-line:

```bash
gh pr comment <PR#> --body "/changie Fix Corrected the deployment logic when running on ARM"
```

Multi-line — heredoc is the reliable form (avoids shell quoting
issues):

```bash
gh pr comment <PR#> --body "$(cat <<'MD'
/changie Enhanced
Bump the Kubernetes version to 1.34.7.
- drops support for RHEL 8
- requires containerd 2.x
MD
)"
```

Do this **after** the PR exists — the workflow keys off the PR number
attached to the comment.

## Kinds

Read `.changie.yaml` for the actual list. A typical set is:

| Kind       | Meaning                             |
|------------|-------------------------------------|
| `Enhanced` | User-visible improvement            |
| `Breaking` | Backwards-incompatible change       |
| `Fix`      | Bug fix                             |
| `Added`    | New feature / capability            |
| `Removed`  | Feature removal                     |

Extract the exact list programmatically:

```bash
grep -E '^\s*- label:' .changie.yaml | awk '{print $NF}'
```

## Editing and removing entries

The `/changie` comment owns its entry across its whole lifecycle:

- **Fix a typo:** edit the original `/changie` comment. The workflow
  removes the previous entry and creates a fresh one.
- **Remove the entry:** delete the `/changie` comment. The workflow
  removes the entry from `.changes/unreleased/`.
- **Multiple entries on one PR:** post additional `/changie` comments
  — one per entry. Each comment owns its own entry independently.
  See "Multiple entries per PR" above for guidance on when to split.

## Choosing an entry vs. `skip changelog`

**Never apply the `skip changelog` label automatically.** Always ask
the user first — even when the PR looks obviously trivial (CI-only,
docs-only, chore, formatter run). The user is the sole authority on
whether a change is release-note-worthy in their project.

When you believe a PR may not need an entry, phrase the question as an
either/or and offer both paths:

> "This PR only touches [CI config / docs / …]. Would you like me to:
> (a) apply the `skip changelog` label, or
> (b) add a `/changie <Kind> <body>` comment anyway?"

Apply the label only after the user answers (a):

```bash
gh pr edit <PR#> --add-label "skip changelog"
```

The check workflow skips entirely when this label is present.

## `skip changelog` label

Mechanics only — see "Choosing an entry vs. `skip changelog`" above
for when to apply it.

```bash
gh pr edit <PR#> --add-label "skip changelog"
```

The check workflow's top-level `if:` skips the entire job when this
label is present. To reverse:

```bash
gh pr edit <PR#> --remove-label "skip changelog"
```

## Success preview comment

The `changie-check-changelog` workflow posts a comment on the PR after
a passing run:

> ✅ **Changelog check passed** — this PR contributes the following
> entries to the next release:
>
> ````markdown
> ### Enhancements
>
> - <body>
>   (PR[#<num>](<repo-url>/pull/<num>))
> ````

The comment is refreshed on every push (the workflow's cleanup step
wipes any prior comment carrying the `<!-- changie-workflow-comment -->`
marker before posting a fresh one). If the render looks wrong on a PR,
just push a new commit and check the refreshed comment.

## Local CLI usage

Use the CLI when driving the repo from a local machine and the PR
doesn't exist yet, or when the user explicitly asks for a
committed-on-branch yaml.

### Interactive

```bash
changie new
```

Prompts for kind, body, and every `custom.*` field in `.changie.yaml`.
For a multi-line body, prefer:

```bash
changie new --body-editor
```

which opens `$EDITOR` for the body.

### Scripted, single-line

```bash
changie new \
  --kind Enhanced \
  --body "Short line describing the change" \
  --custom Pull=<PR#> \
  --custom CommentId=cli
```

### Scripted, multi-line

```bash
changie new \
  --kind Enhanced \
  --body "$(cat <<'MD'
Bump the Kubernetes version to 1.34.7.
- drops support for RHEL 8
- requires containerd 2.x
MD
)" \
  --custom Pull=<PR#> \
  --custom CommentId=cli
```

### Custom fields

Read `.changie.yaml`'s `custom:` section for the schema. Typical fields
in this workflow family:

- `Pull` (`int`, required) — the PR number this entry belongs to. Used
  by the check workflow to filter and by the rendered link.
- `CommentId` (`string`, required in practice) — pass `cli` (any
  non-numeric marker) when authoring locally; the workflow passes the
  numeric GitHub comment id so it can find the entry to update/remove
  on comment edit/delete.

**Note:** `optional: true` is buggy in changie v1.24/1.25 — a missing
value errors out even when the field is declared optional. Treat all
declared custom fields as required in practice.

### Preview a release render

```bash
changie batch <version> --dry-run
```

`<version>` must be a semver token. Use `0.0.0` for a preview render
that only wants to see the shape of the upcoming entries; strip the
synthetic `## Release 0.0.0` header from the output if you want just
the kind/entry section:

```bash
changie batch 0.0.0 --dry-run | awk '/^### / {p=1} p'
```

## Rendered format

The `.changie.yaml` `changeFormat` template controls the shape. A
common form:

```
- <body-first-line>
  <body-subsequent-lines-indented-2>
  (PR[#<num>](<repo-url>/pull/<num>))
```

`body: { block: true }` under changie config preserves multi-line
bodies verbatim (they aren't collapsed).

## Common pitfalls

- **Invalid kind.** Case-sensitive, must match a `label` in
  `.changie.yaml`. The workflow fails and posts an error comment on
  the PR.
- **Empty body.** `/changie <Kind>` with no body fails.
- **Missing `CommentId` in scripted CLI usage.** Fails with a prompt
  error in non-interactive contexts. Always pass
  `--custom CommentId=cli` (or any placeholder) when scripting.
- **Bypassing the comment flow.** If you commit a
  `.changes/unreleased/*.yaml` manually and the user later wants to
  fix a typo, the fix has to be another commit — the `/changie`
  edit/delete lifecycle only works for workflow-created entries.
- **Wrong PR number in `Pull`.** The check workflow filters the
  success-preview render by `Pull == <this PR>`. A mismatched value
  hides the entry from the preview.

## Files touched by this feature

For orientation when adopting or debugging the workflow in a new repo:

- `.changie.yaml` — kinds, custom-field schema, template.
- `.changes/unreleased/*.yaml` — one file per unreleased entry.
- `.changes/<version>.md` — one file per released version (produced
  by `changie batch <version>`).
- `CHANGELOG.md` — assembled from `.changes/<version>.md` files via
  `changie merge`.
- `.github/workflows/changie-add-changelog.yaml` — reacts to `/changie`
  PR comments; requires a `pull-requests: write` + `contents: write`
  token (typically via a GitHub App to bypass branch protection).
- `.github/workflows/changie-check-changelog.yaml` — enforces the
  entry, posts the success preview comment on the PR.

## References

- changie CLI: <https://changie.dev>
- changie-action: <https://github.com/miniscruff/changie-action>
