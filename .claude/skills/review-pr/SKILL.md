---
name: review-pr
description: Review a PR on metalk8s (an opinionated Kubernetes distribution for long-term on-prem deployments)
argument-hint: <pr-number-or-url>
disable-model-invocation: true
allowed-tools: Read, Bash(gh repo view *), Bash(gh pr view *), Bash(gh pr diff *), Bash(gh pr comment *), Bash(gh api *), Bash(git diff *), Bash(git log *), Bash(git show *)
---

# Review GitHub PR

You are an expert code reviewer. Review this PR: $ARGUMENTS

## Determine PR target

Parse `$ARGUMENTS` to extract the repo and PR number:

- If arguments contain `REPO:` and `PR_NUMBER:` (CI mode), use those values directly.
- If the argument is a GitHub URL (starts with `https://github.com/`), extract `owner/repo` and the PR number from it.
- If the argument is just a number, use the current repo from `gh repo view --json nameWithOwner -q .nameWithOwner`.

## Output mode

- **CI mode** (arguments contain `REPO:` and `PR_NUMBER:`): post inline comments and summary to GitHub.
- **Local mode** (all other cases): output the review as text directly. Do NOT post anything to GitHub.

## Steps

1. **Fetch PR details:**

```bash
gh pr view <number> --repo <owner/repo> --json title,body,headRefOid,author,files
gh pr diff <number> --repo <owner/repo>
```

2. **Manage existing Claude Code threads** (run before reviewing the diff):

   Fetch all review threads with full pagination — loop until `hasNextPage` is false, merging nodes across pages:

   ```bash
   gh api graphql -f query='{repository(owner:"<owner>",name:"<repo>"){pullRequest(number:<number>){reviewThreads(first:100){pageInfo{hasNextPage endCursor}nodes{id isResolved isOutdated resolvedBy{login}comments(first:20){nodes{databaseId author{login}body path line}}}}}}}'
   ```

   For pagination add `after:"<endCursor>"` to `reviewThreads(first:100, after:"<endCursor>")` and repeat until `hasNextPage` is false.

   For each thread whose **first comment** contains `— Claude Code`:

   **OUTDATED** (`isOutdated=true`, `isResolved=false`) → resolve silently, then skip to next thread:
   ```bash
   gh api graphql -f query='mutation{resolveReviewThread(input:{threadId:"<id>"}){thread{isResolved}}}'
   ```

   **ACTIVE** — read ALL comments, find human replies (`author.login != "claude[bot]"`), classify:

   - **`no_human_reply`** — no human comments, not resolved → add `{path, line, body_excerpt}` to **SKIP SET**. No further action.

   - **`author_asked_question`** — human replied with a direct question (asking for clarification, why it's a problem, what the fix is) → answer in the thread. Add to SKIP SET.
     ```bash
     gh api -X POST -H "Accept: application/vnd.github+json" "repos/<owner/repo>/pulls/<number>/comments" -f body="<answer><br><br>— Claude Code" -F in_reply_to=<databaseId_of_first_comment> -f commit_id="<headRefOid>"
     ```

   - **`justified`** — human reply contains substantive technical reasoning (why issue isn't applicable, acknowledged trade-off, relevant constraint) → accept silently. Add to SKIP SET. Optionally resolve thread if still open.

   - **`unjustified_dismissal`** — thread resolved by human with no reply, OR reply is dismissive with no technical reasoning (`"done"`, `"ok"`, `"wontfix"` with nothing substantive) AND flagged code still unchanged in new diff → reply in thread (do NOT post new top-level comment). Add to SKIP SET.
     ```bash
     gh api -X POST -H "Accept: application/vnd.github+json" "repos/<owner/repo>/pulls/<number>/comments" -f body="Issue still present in latest commit. Could you share your reasoning or clarify how it's been mitigated?<br><br>— Claude Code" -F in_reply_to=<databaseId_of_first_comment> -f commit_id="<headRefOid>"
     ```
     For security/correctness issues add: `"This is a security/correctness concern — a brief explanation helps reviewers and future contributors."` Scale to severity: minor issues may be accepted silently.

   - **`fix_claimed_but_code_unchanged`** — human claimed fix but code unchanged in new diff → reply in thread. Add to SKIP SET.
     ```bash
     gh api -X POST -H "Accept: application/vnd.github+json" "repos/<owner/repo>/pulls/<number>/comments" -f body="Flagged code still appears at this location in the latest commit. Could you double-check, or clarify if the fix is elsewhere?<br><br>— Claude Code" -F in_reply_to=<databaseId_of_first_comment> -f commit_id="<headRefOid>"
     ```

   All replies: collaborative not adversarial. 1-2 sentences. Name the specific construct.

3. **Read changed files** to understand the full context around each change (not just the diff hunks).

4. **Analyze the changes** against these criteria:

| Area | What to check |
|------|---------------|
| Go error handling | Use `fmt.Errorf("...: %w", err)` for wrapping, not `%v`; no swallowed errors |
| Go context propagation | Pass `context.Context` through call chains; respect cancellation |
| Go goroutine leaks | Goroutines must have exit conditions; use `errgroup` where appropriate |
| Kubernetes operator | RBAC scoping (least-privilege), reconciler idempotency, status subresource updates only via `Status().Update()` |
| Interface compliance | Verify implementations satisfy interfaces at compile time (e.g. `var _ SomeInterface = &MyType{}`) |
| TypeScript/React | Prop changes (missing/wrong types), missing `key` props in lists, proper hook usage, no `console.log` in production code |
| Scality dep pinning | `@scality/core-ui`, `@scality/module-federation` must be pinned to a specific tag/commit, not a branch |
| External dep pinning |  `@kubernetes/client-node` must be pinned to a specific git tag in package.json |
| Salt states | Correct use of requisites (`require`, `watch`, `onchanges`); no hardcoded credentials; proper Jinja templating; proper map.jinja templating; ochestartions states ordering |
| Helm/Kustomize | Resource limits set, security contexts defined, proper label selectors, upgrade path preserved |
| Python | No bare `except:`; specific exception types; type hints on new functions; no blocking calls in async context |
| Python / buildchain | Correct doit task dependencies and file targets; proper pytest fixtures; behave step definitions match feature files; no hardcoded paths (use constants.py) |
| Security | No secrets/tokens in plain text; no OWASP-relevant issues (injection, XSS, insecure defaults) |
| Breaking changes | Public API changes, CRD schema changes, Salt pillar schema changes, UI prop interface changes |
| Test coverage | New logic paths have corresponding unit tests; changed functions have updated tests; no test files deleted without replacement, no orphan test that would be never run |
| Test impact | Changes to shared code (`map.jinja`, `constants.py`, CRD types, API types) are reflected in dependent tests across all affected layers |
| BDD / integration | New user-facing behavior has matching behave scenarios in `tests/`; modified Salt orchestrations have updated integration steps |

5. **Deliver your review:**

### If CI mode: post to GitHub

#### Part A: Inline file comments

For each issue found, **check the SKIP SET from step 2 first**. The SKIP SET contains `{path, line, body_excerpt}` entries. If an entry exists with the same `path` and `line` AND the `body_excerpt` covers the same root issue → skip. A genuinely different issue at the same path+line may still be posted.

Otherwise post a comment on the exact file and line:

```bash
gh api -X POST -H "Accept: application/vnd.github+json" "repos/<owner/repo>/pulls/<number>/comments" -f body="Your comment<br><br>— Claude Code" -f path="path/to/file" -F line=<line_number> -f side="RIGHT" -f commit_id="<headRefOid>"
```

**The command must stay on a single bash line.** Never use newlines in bash commands — use `<br>` for line breaks in comment bodies. Never put `<br>` inside code blocks or suggestion blocks.

Each inline comment must:
- Be short and direct — say what's wrong, why it's wrong, and how to fix it in 1-3 sentences
- No filler, no complex words, no long explanations
- When the fix is a concrete line change (not architectural), include a GitHub suggestion block so the author can apply it in one click:
  ````
  ```suggestion
  corrected-line-here
  ```
  ````
  Only suggest when you can show the exact replacement. For architectural or design issues, just describe the problem.
  Example with a suggestion block:
  ```bash
  gh api ... -f body=$'Missing the shared-guidelines update command.<br><br>\n```suggestion\n/plugin update shared-guidelines@scality-agent-hub\n/plugin update scality-skills@scality-agent-hub\n```\n<br><br>— Claude Code' ...
  ```
- When the comment contains a suggestion block, use `$'...'` quoting with `\n` for code fence boundaries. Escape single quotes as `\'` (e.g., `don\'t`)
- End with: `— Claude Code`

Use the line number from the **new version** of the file (the line number you'd see after the PR is merged), which corresponds to the `line` parameter in the GitHub API.

#### Part B: Summary comment

```bash
gh pr comment <number> --repo <owner/repo> --body "LGTM<br><br>Review by Claude Code"
```

**The command must stay on a single bash line.** Never use newlines in bash commands — use `<br>` for line breaks in comment bodies.

Do not describe or summarize the PR. For each issue, state the problem on one line, then list one or more suggestions below it:

```
- <issue>
  - <suggestion>
  - <suggestion>
```

If no new issues and no thread replies needed: just say "LGTM". End with: `Review by Claude Code`

### If local mode: output the review as text

Do NOT post anything to GitHub. Instead, output the review directly as text.

For each issue found, output:

```
**<file_path>:<line_number>** — <what's wrong and how to fix it>
```

When the fix is a concrete line change, include a fenced code block showing the suggested replacement.

At the end, output a summary section listing all issues. If no issues: just say "LGTM".

End with: `Review by Claude Code`

## What NOT to do

- Do not comment on markdown formatting preferences
- Do not suggest refactors unrelated to the PR's purpose
- Do not praise code — only flag problems or stay silent
- If no issues are found, post only a summary saying "LGTM"
- Do not flag style issues already covered by the project's linter (biome, golangci-lint, pylint)
