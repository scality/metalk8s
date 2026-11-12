// MetalK8s's agent for the eval: guardian, with this platform's own names for things.
//
// The package deliberately knows nothing about guardian — it speaks a chat API and takes a
// catalogue per turn. Everything guardian-shaped lives here: which agent to select, which source
// it is restricted to, where a developer's token file is, and the GUARDIAN_* environment the CI
// job sets.

import { homedir } from 'os';
import { join } from 'path';
import { createAgent } from '@scality/webmcp-eval/v1';

export const GUARDIAN_URL = process.env.GUARDIAN_URL || 'http://localhost:8081';

// aiops_agent is the only agent with `supports_mcp: true` (guardian-backend
// src/guardian/config/agents.json). Anything else silently ignores mcp_tools and the eval tests
// nothing — it accepts the request and answers prose, with nothing saying why.
export const AGENT = process.env.GUARDIAN_EVAL_AGENT || 'aiops_agent';

// THIS DOES NOT WORK YET, AND THE DEFAULT IS DELIBERATELY THE ONE THAT DOESN'T.
//
// Guardian has no MetalK8s surface. Its SourceType is
//
//   "portal" | "artesca_ui" | "customer_portal" | "ring_ui" | "adi_ui"
//
// so `metalk8s_ui` is a 422 at the agents endpoint, and aiops_agent restricts itself further to
// ["artesca_ui", "adi_ui"] on top of that. Two changes on their side make this honest: add
// metalk8s_ui to SourceType, and add it to that agent's source_restriction.
//
// Until then, to watch a run locally:
//
//   GUARDIAN_EVAL_SOURCE=artesca_ui npm run eval
//
// That is borrowing another product's surface, which is why it is an override and not the
// default: a default that works by claiming to be ARTESCA would ship, and nobody would notice.
const SOURCE = process.env.GUARDIAN_EVAL_SOURCE || 'metalk8s_ui';

// CI injects one from a secret; locally it is the file `make token` writes.
const TOKEN_FILE = join(homedir(), '.guardian', 'access_token.txt');

export const guardian = createAgent({
  url: GUARDIAN_URL,
  agent: AGENT,
  source: SOURCE,
  token: process.env.GUARDIAN_TOKEN,
  tokenFile: TOKEN_FILE,
});
