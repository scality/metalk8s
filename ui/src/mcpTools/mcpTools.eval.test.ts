/** @jest-environment node */
//
// The WebMCP eval: does a real model reach for the right tool, given the way a user phrases it?
//
// Unit tests call execute() and check the returned object. They never read a tool's `name`,
// `description` or `inputSchema` — and those three fields are the entire basis on which a model
// decides what to call. A description can contradict itself and every unit test still passes.
//
//   npm run eval:which     what would run — no model, no token, free
//   npm run eval:mcp       the real thing: a model, a token, tokens spent
//
// | Variable        | default    | effect                                        |
// | --------------- | ---------- | --------------------------------------------- |
// | `EVAL_TOOLS`    | everything | comma-separated tool names; narrows scenarios |
// | `EVAL_RUNS`     | 1          | votes per scenario; the bar is 0.8            |
// | `EVAL_DRY_RUN`  | —          | 1 lists the selection and calls nothing       |
// | `GUARDIAN_URL`  | localhost  | which deployment to drive                     |
//
// Excluded from `npm test`: it needs a running backend and a token, it costs model tokens, and it
// is non-deterministic — a failure means "a description is ambiguous", which should not block an
// unrelated change.
//
// EVAL_TOOLS narrows to the scenarios that actually exercise the changed tool, and nothing else.
// A tool no scenario covers runs nothing — runSuite says so by name rather than passing quietly.
// That gap is a missing scenario, not something to paper over by running the whole suite.
import { runSuite } from '@scality/webmcp-eval/v1';
import { AGENT, GUARDIAN_URL, guardian } from './evals/agent';
import { kubeSuite } from './evals/kube';

jest.setTimeout(600_000);

runSuite(kubeSuite, {
  agent: guardian,
  // Run once before the first scenario, so a dead backend or a stale token fails fast and legibly
  // rather than after a model round trip, where it reads as a result instead of an environment
  // problem.
  probe: async () => {
    console.log(`      guardian: ${GUARDIAN_URL} · agent: ${AGENT}`);
    await guardian.probe();
  },
});
