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

// Which agent to drive. No default is guessed here beyond the one Guardian advertises for
// platform questions: an agent that does not support MCP accepts the request and ignores the
// catalogue, so a wrong name reports prose with nothing saying why.
export const AGENT = process.env.GUARDIAN_EVAL_AGENT || 'aiops_agent';

// The source the agent is restricted to. MetalK8s is not artesca_ui, so this has to be whatever
// guardian-backend lists for this console in its agents config — set it before the first real run.
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
