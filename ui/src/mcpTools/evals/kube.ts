// The Kubernetes tool scenarios.
//
// DELIBERATELY EMPTY FOR NOW. The plumbing is what is being proved here — the package resolves,
// the catalogue builds from the real tools, the CI job narrows and skips correctly — and an
// invented scenario would make that proof say something it has not earned.
//
// A scenario is a situation the model is dropped into (Given), one thing that happens (When), and
// what it must have done about it (Expect). Every tool answer is stated here, beside the scenario
// that depends on it. See EXAMPLES.md in @scality/webmcp-eval.
//
// The first ones worth writing, once someone can run them against a real cluster:
//
//   - "why is this pod failing?" reaches for getPodLogs rather than describeKubeResource alone
//   - a namespace named in the question is not silently widened to cluster-wide
//   - listKubeResources is not called again for something already in the transcript
//
// Until then runSuite reports that nothing was selected, which is honest: an eval that selects
// zero scenarios and prints green is the one outcome that hides a mistake, so it says so by name.

import { defineSuite, loadCatalogue } from '@scality/webmcp-eval/v1';
import { CATALOGUE_PATH } from './catalogue';
import type { MetalK8sToolArguments } from './gen/toolArguments';

const catalogue = loadCatalogue(CATALOGUE_PATH);

export const kubeSuite = defineSuite<MetalK8sToolArguments>({
  name: 'kube',
  purpose:
    'Whether the Kubernetes read tools are reached for correctly: the right one for the question, ' +
    'scoped to what was asked, and not called again for something already answered.',
  catalogue,
  scenarios: [],
});
