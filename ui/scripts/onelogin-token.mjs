#!/usr/bin/env node
//
// Mint a Guardian access token without a human.
//
// Exactly the flow `make token` runs in guardian-backend (utils/generate_token.py) — Authorization
// Code + PKCE against the public Guardian UI app — with a headless browser filling in the sign-in
// page instead of a person. Same client, so the token carries the same audience as one the UI
// issues, which is why nothing in Guardian or the gateway has to change to accept it.
//
// Two inputs, both secret:
//   GUARDIAN_EVAL_ONE_LOGIN_USERNAME
//   GUARDIAN_EVAL_ONE_LOGIN_PASSWORD
//
// Everything else is a pre-prod constant below. None of it is secret — the client id is in the
// address bar of every sign-in — so making them settings would be more things to keep in step for
// no protection at all.
//
// Usage: node scripts/onelogin-token.mjs [--out <file>] [--shot <file.png>]

import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

// Pre-prod. PRE-PROD ONLY: a production token is accepted directly by the production customer
// portal, which does not check audience.
const SUBDOMAIN = 'scality';
const CLIENT_ID = '8c0b2730-492a-013e-bd61-6b7723ec344170862';
const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}`; // lands on the runner itself — nothing to expose

const say = (message) => process.stderr.write(`${message}\n`);
const die = (message) => {
  say(`\n${message}`);
  process.exit(1);
};

const arg = (flag, fallback) => {
  const at = process.argv.indexOf(flag);
  return at === -1 ? fallback : process.argv[at + 1];
};

// `!value`, not `=== undefined`: an unset GitHub secret arrives as an EMPTY STRING, and submitting
// an empty password is a failed sign-in attempt we cannot afford to spend.
const username = process.env.GUARDIAN_EVAL_ONE_LOGIN_USERNAME?.trim();
// NOT trimmed: whitespace can be part of a password, and trimming it would submit the wrong
// one on every run — the lockout this script exists to avoid. An unset secret is '', which
// the check below still catches.
const password = process.env.GUARDIAN_EVAL_ONE_LOGIN_PASSWORD;
if (!username || !password) {
  die('GUARDIAN_EVAL_ONE_LOGIN_USERNAME and GUARDIAN_EVAL_ONE_LOGIN_PASSWORD must both be set.');
}

const outFile = arg('--out', path.join(os.homedir(), '.guardian', 'access_token.txt'));
const shotFile = arg('--shot', null);

// ── PKCE ────────────────────────────────────────────────────────────────────────────────────────

const verifier = crypto.randomBytes(40).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

const authUrl =
  `https://${SUBDOMAIN}.onelogin.com/oidc/2/auth?` +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile params',
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

// ── catch the redirect ──────────────────────────────────────────────────────────────────────────

let resolveCode;
const codeArrives = new Promise((resolve) => {
  resolveCode = resolve;
});

const server = http.createServer((request, response) => {
  const { searchParams } = new URL(request.url, REDIRECT_URI);
  response.writeHead(200, { 'content-type': 'text/plain' });
  response.end('ok');
  // A refusal comes back on THIS redirect, not as a missing one: `?error=access_denied` and friends
  // (RFC 6749 §4.1.2.1). Resolving only `code` turned those into "nothing arrived", and the
  // diagnosis below then read the browser page — which by then shows this server's own "ok", so it
  // either matched a word in it by accident or blamed a 60s timeout that never happened.
  resolveCode({
    code: searchParams.get('code'),
    error: searchParams.get('error'),
    description: searchParams.get('error_description'),
  });
});
// Listening BEFORE the browser starts: OneLogin redirects the moment the password is accepted.
server.listen(PORT, '127.0.0.1');

// ── drive the sign-in page ──────────────────────────────────────────────────────────────────────

/** The first of these that is actually visible. OneLogin's markup is not a contract. */
const visible = async (page, selectors, timeout = 10_000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    for (const selector of selectors) {
      const found = page.locator(selector).first();
      if (await found.isVisible().catch(() => false)) return found;
    }
    await page.waitForTimeout(250);
  }
  return null;
};

const submit = async (page, field) => {
  const button = await visible(page, ['button[type="submit"]', 'input[type="submit"]'], 3_000);
  if (button) await button.click();
  else await field.press('Enter');
};

const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(30_000);

try {
  await page.goto(authUrl, { waitUntil: 'domcontentloaded' });

  const userField = await visible(page, ['input[name="username"]', 'input#username', 'input[type="email"]']);
  // Stop BEFORE typing anything. At this point the account is no closer to being locked, and the
  // fix is a selector, not a credential.
  if (!userField) throw new Error('no username field — the OneLogin page has changed shape');
  await userField.fill(username);

  // Look for the password field BEFORE submitting. On a single-page form, submitting after the
  // username alone sends an EMPTY password — a failed attempt, and OneLogin locks the account after
  // a handful of those.
  let passField = await visible(page, ['input[name="password"]', 'input[type="password"]'], 1_000);
  if (!passField) {
    await submit(page, userField);
    passField = await visible(page, ['input[name="password"]', 'input[type="password"]']);
  }
  if (!passField) throw new Error('no password field appeared — the password was NOT submitted');

  await passField.fill(password);
  await submit(page, passField);

  // NO RETRY, anywhere in this script. A retry loop around a broken selector would lock the account
  // and take every other run down with it.
  // A PLAIN timer, not page.waitForTimeout: on the success path the loser of this race is still
  // pending when browser.close() runs, and Playwright rejects a page-bound wait with "Target page,
  // context or browser has been closed". `.then()` does not catch that, and Node 20 exits 1 on an
  // unhandled rejection — so the step failed AFTER the token was already minted. `.unref()` so a
  // pending timer cannot hold the process open either.
  const redirect = await Promise.race([
    codeArrives,
    new Promise((resolve) => setTimeout(() => resolve(null), 60_000).unref()),
  ]);

  // Named by the authorization server itself, so it is said plainly rather than guessed at from
  // page text. Still terminal: `access_denied` and `consent_required` do not improve on a retry,
  // and a retry is what locks the account.
  if (redirect?.error) {
    throw new Error(
      `OneLogin refused the authorization: ${redirect.error}` +
        (redirect.description ? ` — ${redirect.description}` : '') +
        '. Not retrying.',
    );
  }

  const code = redirect?.code ?? null;

  if (!code) {
    const said = await page.locator('body').innerText().catch(() => '');
    const why = said.match(/incorrect|invalid|locked|too many|expired|verification|factor|code/i);
    throw new Error(
      why
        ? `OneLogin did not sign in — the page mentions "${why[0]}". Not retrying.`
        : 'no redirect arrived within 60s. If MFA was requested, this account needs an exemption ' +
          'or an IP-bound policy: a push or SMS factor needs a human on every run.',
    );
  }

  // ── exchange the code ─────────────────────────────────────────────────────────────────────────

  const response = await fetch(`https://${SUBDOMAIN}.onelogin.com/oidc/2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) throw new Error(`the token exchange was refused: HTTP ${response.status}`);

  const token = await response.json();
  if (!token.access_token) throw new Error('the token response carried no access_token');

  // To a file, never to stdout — stdout becomes a CI log, and a token in a log is a disclosed token.
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, token.access_token, { mode: 0o600 });
  say(`token written to ${outFile} — expires in ${token.expires_in}s`);
} catch (error) {
  // The page as it stood is the only way to see what a selector stopped matching — but it is not
  // safe to capture as-is. A password renders as dots; the USERNAME does not, and it is filled in
  // before most of the failure points below, and echoed back on OneLogin's own password and error
  // pages. Log masking does not reach an image, so an unscrubbed shot publishes that secret to
  // anyone who can download the artifact.
  //
  // Scrubbed by value, not by selector: whatever element it ended up in — the field we filled, a
  // confirmation line, an error message — the one thing we know is the string itself.
  if (shotFile) {
    // The shot is taken ONLY if the scrub ran. `evaluate` throws when the page is mid-navigation
    // — "Execution context was destroyed" is the likely case here, right after a submit — and
    // swallowing that would upload the unscrubbed page, which is the exact thing being prevented.
    // Losing the diagnostic is the cheaper failure.
    const scrubbed = await page
      .evaluate((secret) => {
        for (const input of document.querySelectorAll('input')) {
          if (input.value && input.value.includes(secret)) input.value = '[redacted]';
        }
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (node.nodeValue?.includes(secret)) node.nodeValue = node.nodeValue.split(secret).join('[redacted]');
        }
      }, username)
      .then(
        () => true,
        () => false,
      );

    if (scrubbed) await page.screenshot({ path: shotFile }).catch(() => {});
    else say('skipped the screenshot: the page could not be scrubbed, and an unscrubbed one leaks the username');
  }
  await browser.close();
  server.close();
  die(error.message);
}

await browser.close();
server.close();
