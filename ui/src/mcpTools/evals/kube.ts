// The Kubernetes tool scenarios.
//
// A scenario is a situation the model is dropped into (Given), one thing that happens (When), and
// what it must have done about it (Expect). Every tool answer is stated here, beside the scenario
// that depends on it. See EXAMPLES.md in @scality/webmcp-eval.
//
// Still worth writing, beyond the one below:
//
//   - a namespace named in the question is not silently widened to cluster-wide
//   - listKubeResources is not called again for something already in the transcript
//   - a secret is never described, whatever the question

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

  scenarios: [
    {
      id: 'a-restarting-pod-is-read-not-just-described',
      why:
        'Describing a pod says it is in CrashLoopBackOff. Only the log says why. A model that ' +
        'stops at the description hands the user back the word they already used, and the next ' +
        'thing they do is open a ticket that a support engineer answers by reading the log.',

      given: {
        mocks: {
          // The exact name is in the question, so no listing is needed. Mocked anyway because the
          // description tells the model to get names from here rather than guess them, and a model
          // that follows it should not be answered with {} on the way past.
          listKubeResources: {
            status: 'ok',
            items: [{ name: 'coredns-7d8f9c6b4-x2k9p', namespace: 'kube-system', phase: 'Running' }],
          },

          // The shape the real tool returns on its `ok` path: `{ status, ...description, resource,
          // omitted }`. A mock that drifts from that is the one way this design can test a fiction.
          describeKubeResource: {
            status: 'ok',
            resource: {
              metadata: { name: 'coredns-7d8f9c6b4-x2k9p', namespace: 'kube-system' },
              status: {
                phase: 'Running',
                containerStatuses: [
                  {
                    name: 'coredns',
                    ready: false,
                    restartCount: 47,
                    state: { waiting: { reason: 'CrashLoopBackOff', message: 'back-off 5m0s restarting failed container' } },
                  },
                ],
              },
            },
            events: [
              { type: 'Warning', reason: 'BackOff', count: 47, message: 'Back-off restarting failed container coredns' },
            ],
            omitted: [],
          },

          // Named fields from the tool's own description: lines, bounded, latest.
          getPodLogs: {
            status: 'ok',
            lines: [
              '[FATAL] plugin/loop: Loop (127.0.0.1:38869 -> :53) detected for zone "."',
              'See https://coredns.io/plugins/loop#troubleshooting for more information.',
            ],
            bounded: 'default',
            latest: null,
          },
        },
      },

      when: { userMessage: 'the coredns-7d8f9c6b4-x2k9p pod in kube-system keeps restarting, why?' },

      expect: {
        tools: (calls) => {
          // THE POINT. describeKubeResource reports CrashLoopBackOff, which only renames the
          // symptom; the loop detection is in the log and nowhere else.
          expect(calls.names).toContain('getPodLogs');
        },
        message: (message) => {
          // It has to carry the cause back, not just that the pod is restarting.
          expect(message).toMatch(/loop/i);
        },
      },

      // Enough to describe, read and answer. Not a sequence this asserts on — a model that reads
      // the log first and describes afterwards has done the right thing in a different order.
      maxTurns: 5,
    },
  ],
});
