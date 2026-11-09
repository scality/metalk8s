#!/usr/bin/env bash
#
# Get the local guardian into a state where the WebMCP eval can run, then run it.
#
#   npm run eval            # this script, then the eval
#   npm run eval:mcp        # the eval alone, assuming the environment is already good
#
# Why a script and not just `make token && docker restart && jest`:
#
#   - `make token` opens a BROWSER. Running it unconditionally makes the common case (a valid
#     token) worse than doing nothing, so we probe first and only re-auth when we must.
#   - `make token` runs `uv`, which rewrites guardian-backend/.venv. That directory is bind-mounted
#     into the container, whose uvicorn --reload watches it — so the backend shuts down and does
#     NOT come back. The restart below is a workaround for that, not a normal step. The real fix is
#     an anonymous volume for /code/.venv in guardian-ui/docker-compose.dev.yml.
#   - After a restart the backend takes ~45s to serve, and until then everything looks like a hang.
#
set -euo pipefail

GUARDIAN_URL="${GUARDIAN_URL:-http://localhost:8081}"
GUARDIAN_BACKEND="${GUARDIAN_BACKEND:-$HOME/Projects/guardian-backend}"
CONTAINER="${GUARDIAN_CONTAINER:-guardian-ui-guardian-backend-1}"
TOKEN_FILE="$HOME/.guardian/access_token.txt"

say() { printf '  %s\n' "$1"; }

# /health is public, so it only tells us the backend is serving.
backend_up() {
  [ "$(curl -s -m 3 -o /dev/null -w '%{http_code}' "$GUARDIAN_URL/api/v1/health/" 2>/dev/null || echo 000)" = "200" ]
}

SOURCE="${GUARDIAN_EVAL_SOURCE:-metalk8s_ui}"

# /agents IS authenticated (401 without a token), which is what makes it a usable expiry probe.
# The STATUS, not a yes/no: 401 and 422 are different problems and only one of them is fixed by
# signing in again.
agents_status() {
  [ -s "$TOKEN_FILE" ] || { echo 000; return; }
  curl -s -m 5 -o /dev/null -w '%{http_code}' \
    -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
    "$GUARDIAN_URL/api/v1/agents/?source=$SOURCE" 2>/dev/null || echo 000
}

token_valid() { [ "$(agents_status)" = "200" ]; }

# A SOURCE THE DEPLOYMENT DOES NOT KNOW IS NOT AN EXPIRED TOKEN. 422 means the service answered
# and refused a value, so re-authenticating cannot help — and the old check treated every non-200
# as expiry, which opened a browser, minted a perfectly good token, restarted the backend, and
# then reported the token as rejected. Say what is actually wrong instead.
reject_bad_source() {
  [ "$(agents_status)" = "422" ] || return 0
  say "the backend refused source=\"$SOURCE\" (HTTP 422) — the token is fine."
  curl -s -m 5 -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
    "$GUARDIAN_URL/api/v1/agents/?source=$SOURCE" 2>/dev/null | head -c 300
  echo
  say "Guardian knows a fixed set of surfaces and metalk8s is not yet one of them."
  say "To run against it today:  GUARDIAN_EVAL_SOURCE=artesca_ui npm run eval"
  exit 1
}

wait_for_backend() {
  for i in $(seq 1 40); do
    backend_up && { say "backend healthy after ~$((i * 3))s"; return 0; }
    sleep 3
  done
  say "backend did not become healthy in 120s. Try: docker logs --tail 30 $CONTAINER"
  return 1
}

restart_backend() {
  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    say "container '$CONTAINER' is not running."
    say "start it:  cd ~/Projects/guardian-ui && docker compose -f docker-compose.dev.yml up -d"
    exit 1
  fi
  say "restarting $CONTAINER"
  docker restart "$CONTAINER" >/dev/null
  wait_for_backend
}

# 1. Backend serving? A container can report "Up" while the app inside is dead — the port stays
#    forwarded, so requests hang instead of being refused. Only /health tells the truth.
if backend_up; then
  say "backend already healthy"
else
  say "backend not answering at $GUARDIAN_URL"
  restart_backend
fi

# 2. Is the source even one this deployment accepts? Checked BEFORE the token, because a 422 is
#    not fixed by signing in and the browser round trip is the expensive part.
reject_bad_source

# 3. Token usable? Only re-auth if not — this is the step that opens a browser.
if token_valid; then
  say "token still valid"
else
  say "token missing or expired — running 'make token' (a browser will open)"
  ( cd "$GUARDIAN_BACKEND" && make token )
  # make token just rewrote .venv, which kills the container. Always restart after it.
  restart_backend
  reject_bad_source
  token_valid || { say "token still rejected after re-auth — check ONELOGIN_* in $GUARDIAN_BACKEND/.env"; exit 1; }
fi

# 4. Run the eval. Everything after this point is a real result, not an environment problem.
say "running the eval"
echo
exec npm run eval:mcp
