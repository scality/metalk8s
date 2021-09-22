import { renderHook } from '@testing-library/react-hooks';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { MetricsTimeSpanProvider } from '@scality/core-ui/dist/next';
import AlertHistoryProvider, { useHistoryAlerts } from './AlertHistoryProvider';
import { FAKE_CONTROL_PLANE_IP, waitFor } from '../components/__TEST__/util';
import { makeQueryRangeResult } from '../../cypress/support/mockUtils';
import { initialize as initializeProm } from '../services/prometheus/api';
import { initialize as initializeAM } from '../services/alertmanager/api';
import { initialize as initializeLoki } from '../services/loki/api';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from 'react-query';
import StartTimeProvider from './StartTimeProvider';

const wrapper = ({ children }) => (
  <MemoryRouter>
    <QueryClientProvider client={new QueryClient()}>
      <MetricsTimeSpanProvider>
        <StartTimeProvider>
          <AlertHistoryProvider>{children}</AlertHistoryProvider>
        </StartTimeProvider>
      </MetricsTimeSpanProvider>
    </QueryClientProvider>
  </MemoryRouter>
);

const server = setupServer(
  rest.get(
    `http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus/api/v1/query_range`,
    (req, res, ctx) => {
      const result = makeQueryRangeResult({
        metric: {},
        values: [
          [1629107937, '3'],
          [1629111537, '3'],
          [1629115137, '3'],
          [1629118737, '3'],
          [1629122337, '3'],
          [1629125937, '3'],
          [1629129537, '3'],
          [1629133137, '3'],
          [1629136737, '3'],
          [1629140337, '3'],
          [1629143937, '3'],
          [1629147537, '3'],
          [1629151137, '3'],
          [1629154737, '3'],
          [1629158337, '3'],
          [1629161937, '3'],
          [1629165537, '3'],
          [1629169137, '3'],
          [1629172737, '3'],
          [1629176337, '3'],
          [1629179937, '3'],
          [1629183537, '3'],
          [1629187137, '3'],
          [1629190737, '3'],
          [1629194337, '3'],
          [1629197937, '3'],
          [1629201537, '3'],
          [1629205137, '3'],
          [1629208737, '3'],
          [1629212337, '3'],
          [1629215937, '3'],
          [1629219537, '3'],
          [1629223137, '3'],
          [1629226737, '3'],
          [1629230337, '3'],
          [1629233937, '3'],
          [1629237537, '3'],
          [1629241137, '3'],
          [1629244737, '3'],
          [1629248337, '3'],
          [1629251937, '3'],
          [1629255537, '3'],
          [1629259137, '3'],
          [1629262737, '3'],
          [1629266337, '3'],
          [1629269937, '3'],
          [1629273537, '3'],
          [1629277137, '3'],
          [1629280737, '3'],
          [1629284337, '3'],
          [1629287937, '3'],
          [1629291537, '3'],
          [1629295137, '3'],
          [1629298737, '3'],
          [1629302337, '3'],
          [1629305937, '3'],
          [1629309537, '3'],
          [1629313137, '3'],
          [1629316737, '3'],
          [1629320337, '3'],
          [1629323937, '3'],
          [1629327537, '3'],
          [1629331137, '3'],
          [1629334737, '3'],
          [1629338337, '3'],
          [1629341937, '3'],
          [1629345537, '3'],
          [1629349137, '3'],
          [1629352737, '3'],
          [1629356337, '3'],
          [1629359937, '3'],
          [1629363537, '3'],
          [1629367137, '3'],
          [1629370737, '3'],
          [1629374337, '3'],
          [1629377937, '3'],
          [1629381537, '3'],
          [1629385137, '3'],
          [1629388737, '3'],
          [1629392337, '3'],
          [1629395937, '3'],
          [1629399537, '3'],
          [1629403137, '3'],
          [1629406737, '3'],
          [1629410337, '3'],
          [1629413937, '3'],
          [1629417537, '3'],
          [1629421137, '3'],
          [1629424737, '3'],
          [1629428337, '3'],
          [1629431937, '3'],
          [1629435537, '3'],
          [1629439137, '3'],
          [1629442737, '3'],
          [1629446337, '3'],
          [1629449937, '3'],
          [1629453537, '3'],
          [1629457137, '3'],
          [1629460737, '3'],
          [1629464337, '3'],
          [1629467937, '3'],
          [1629471537, '3'],
          [1629475137, '3'],
          [1629478737, '3'],
          [1629482337, '3'],
          [1629485937, '3'],
          [1629489537, '3'],
          [1629493137, '3'],
          [1629496737, '3'],
          [1629500337, '3'],
          [1629503937, '3'],
          [1629507537, '3'],
          [1629511137, '3'],
          [1629514737, '3'],
          [1629518337, '3'],
          [1629521937, '3'],
          [1629525537, '3'],
          [1629529137, '3'],
          [1629532737, '3'],
          [1629536337, '3'],
          [1629539937, '3'],
          [1629543537, '3'],
          [1629547137, '3'],
          [1629550737, '3'],
          [1629554337, '3'],
          [1629557937, '3'],
          [1629561537, '3'],
          [1629565137, '3'],
          [1629568737, '3'],
          [1629572337, '3'],
          [1629575937, '3'],
          [1629579537, '3'],
          [1629583137, '3'],
          [1629709137, '3'],
        ],
      });
      // return success status
      return res(ctx.json(result));
    },
  ),
  rest.get(
    `http://${FAKE_CONTROL_PLANE_IP}:8443/api/loki/loki/api/v1/query_range`,
    (req, res, ctx) => {
      const result = {
        status: 'success',
        data: {
          resultType: 'streams',
          result: [
            {
              stream: {
                pod: 'metalk8s-alert-logger-b67bf87bc-kdwkz',
                stream: 'stderr',
                app: 'metalk8s-alert-logger',
                container: 'metalk8s-alert-logger',
                job: 'fluent-bit',
                namespace: 'metalk8s-monitoring',
                node: 'mf-210-dev-10.novalocal',
              },
              values: [
                [
                  '1629707875531297840',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-23T08:37:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629707875531247885',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-23T08:37:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629707305530586315',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-23T08:26:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629580226958515632',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629580226953237917',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629579656791809397',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629537026778010423',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629537026777933801',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629536456645081557',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629493826618100128',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629493826617324680',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629493256512899899',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629450626478361524',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629450626477841630',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629450056375677744',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629407426337176558',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629407426337118392',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629406856255835472',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629364226207205213',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629364226207153342',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629363656142721059',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629321026093608878',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629321026092823411',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629320456041614491',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629277825968714769',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629277825967805017',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629277255925034096',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629234625848652913',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629234625848057590',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629234055826279655',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629191425734623751',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629191425734556286',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629190855718934272',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629148225637370582',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
                [
                  '1629148225631328388',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629147655622974778',
                  '{"status":"firing","labels":{"alertname":"Watchdog","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","severity":"none"},"annotations":{"description":"This is an alert meant to ensure that the entire alerting pipeline is functional.\\nThis alert is always firing, therefore it should always be firing in Alertmanager\\nand always fire against a receiver. There are integrations with various notification\\nmechanisms that send a notification when this alert is not firing. For example the\\n\\"DeadMansSnitch\\" integration in PagerDuty.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-watchdog","summary":"An alert that should always be firing to certify that Alertmanager is working properly."},"startsAt":"2021-08-16T08:59:25.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=vector%281%29\\u0026g0.tab=1","fingerprint":"fc30b79dbdb0a043"}',
                ],
                [
                  '1629105025529967337',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"node-exporter","namespace":"metalk8s-monitoring","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-prometheus-node-exporter","severity":"warning"},"annotations":{"description":"50% of the node-exporter/prometheus-operator-prometheus-node-exporter targets in metalk8s-monitoring namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"f0b37a44b73d5b4d"}',
                ],
                [
                  '1629105025529492733',
                  '{"status":"firing","labels":{"alertname":"TargetDown","job":"kube-proxy","namespace":"kube-system","prometheus":"metalk8s-monitoring/prometheus-operator-prometheus","service":"prometheus-operator-kube-proxy","severity":"warning"},"annotations":{"description":"50% of the kube-proxy/prometheus-operator-kube-proxy targets in kube-system namespace are down.","runbook_url":"https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-targetdown","summary":"One or more targets are unreachable."},"startsAt":"2021-08-16T09:09:55.52Z","endsAt":"0001-01-01T00:00:00Z","generatorURL":"http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=100+%2A+%28count+by%28job%2C+namespace%2C+service%29+%28up+%3D%3D+0%29+%2F+count+by%28job%2C+namespace%2C+service%29+%28up%29%29+%3E+10\\u0026g0.tab=1","fingerprint":"bfc9d3bf855f292b"}',
                ],
              ],
            },
          ],
          stats: {
            summary: {
              bytesProcessedPerSecond: 19975140,
              linesProcessedPerSecond: 21082,
              totalBytesProcessed: 70114,
              totalLinesProcessed: 74,
              execTime: 0.003510063,
            },
            store: {
              totalChunksRef: 26,
              totalChunksDownloaded: 26,
              chunksDownloadTime: 0.00116932,
              headChunkBytes: 0,
              headChunkLines: 0,
              decompressedBytes: 70114,
              decompressedLines: 74,
              compressedBytes: 16492,
              totalDuplicates: 35,
            },
            ingester: {
              totalReached: 1,
              totalChunksMatched: 0,
              totalBatches: 0,
              totalLinesSent: 0,
              headChunkBytes: 0,
              headChunkLines: 0,
              decompressedBytes: 0,
              decompressedLines: 0,
              compressedBytes: 0,
              totalDuplicates: 0,
            },
          },
        },
      };
      // return success status
      return res(ctx.json(result));
    },
  ),
);

describe('useHistoryAlerts', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    Date.now = jest.fn(() => 1629712737000)

    global.Date = class extends Date {
      constructor(date) {
        if (date) {
          return super(date);
        }
  
        return super(1629712737000);
      }
    };

    initializeProm(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus`);
    initializeAM(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/alertmanager`);
    initializeLoki(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/loki`);
    server.listen({onUnhandledRequest: 'error'});
  });

  it('should render properly with the provider', () => {
    const { result } = renderHook(() => useHistoryAlerts(), { wrapper });
    expect(result.error).not.toEqual(
      Error(
        'The useHistoryAlerts hook can only be used within AlertHistoryProvider.',
      ),
    );
  });

  it('should throw an error if no provider', () => {
    const wrapper = ({ children }) => (
      <MemoryRouter>
        <MetricsTimeSpanProvider>{children}</MetricsTimeSpanProvider>
      </MemoryRouter>
    );

    const { result } = renderHook(() => useHistoryAlerts(), { wrapper });
    expect(result.error).toEqual(
      Error(
        'The useHistoryAlerts hook can only be used within AlertHistoryProvider.',
      ),
    );
  });

  it('should retrieve alert history', async () => {
    const { result } = renderHook(() => useHistoryAlerts({ alertname: 'PlatformDegraded' }), { wrapper });

    await waitFor(() => expect(result.current.alerts.length).toEqual(1));

    expect(result.current.alerts).toStrictEqual([
      {
        startsAt: '2021-08-22T09:48:00.000Z',
        endsAt: '2021-08-23T09:58:57.000Z',
        severity: 'unavailable',
        id: 'unavailable-1629625680',
        labels: { alertname: 'PlatformDegraded' },
        description: 'Alerting services were unavailable during this period of time'
      }
    ])
  });

  afterAll(() => {
    server.close();
  });
});
