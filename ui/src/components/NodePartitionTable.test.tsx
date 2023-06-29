import React from 'react';
import { screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import NodePartitionTable from './NodePartitionTable';
import {
  waitForLoadingToFinish,
  render,
  FAKE_CONTROL_PLANE_IP,
} from './__TEST__/util';
import { initialize as initializeProm } from '../services/prometheus/api';
import { initialize as initializeAM } from '../services/alertmanager/api';
import { initialize as initializeLoki } from '../services/loki/api';
import { mockOffsetSize } from '../tests/mocks/util';
import { useAlerts } from '../containers/AlertProvider';

const server = setupServer(
  rest.get(
    `http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus/api/v1/query_range`,
    (req, res, ctx) => {
      const result = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              values: [],
            },
          ],
        },
      };
      // return success status
      return res(ctx.json(result));
    },
  ),
  rest.get(
    `http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus/api/v1/query`,
    (req, res, ctx) => {
      const result = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: {
                container: 'node-exporter',
                device: '/dev/vdc',
                endpoint: 'metrics',
                fstype: 'xfs',
                instance: '192.168.1.29:9100',
                job: 'node-exporter',
                mountpoint: '/mnt/testpart',
                namespace: 'metalk8s-monitoring',
                pod: 'prometheus-operator-prometheus-node-exporter-wk86s',
                service: 'prometheus-operator-prometheus-node-exporter',
              },
              value: [1611905929.203, '96.86575443786982'],
            },
          ],
        },
      };
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
describe('the system partition table', () => {
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn',
    });
    mockOffsetSize(200, 100);
  });
  beforeEach(() => {
    // use fake timers to let react query retry immediately after promise failure
    jest.useFakeTimers();
  });
  test('displays the table', async () => {
    useAlerts.mockImplementation(() => {
      const alerts = [
        {
          annotations: {
            description:
              'Filesystem on /dev/vdc at 192.168.1.29:9100 has only 3.13% available space left.',
            runbook_url:
              'https://github.com/kubernetes-monitoring/kubernetes-mixin/tree/master/runbook.md#alert-name-nodefilesystemalmostoutofspace',
            summary: 'Filesystem has less than 5% space left.',
          },

          /*
        We want to have an active alert triggered, meaning the current time should be in between `startsAt` and `endsAt`.
        Since we can't spy on the `activeOn` in getHealthStatus(). If we use ```endsAt: new Date().toISOString()```, there will be a slightly difference between the two current times.
        Hence, here we add one day to make sure the alert is active.
        */
          endsAt: new Date(
            new Date().getTime() + 1000 * 60 * 60 * 24,
          ).toISOString(),
          fingerprint: '37b2591ac3cdb320',
          receivers: [
            {
              name: 'null',
            },
          ],
          startsAt: '2021-01-25T09:12:05.358Z',
          status: {
            inhibitedBy: [],
            silencedBy: [],
            state: 'active',
          },
          updatedAt: '2021-01-29T07:36:11.363Z',
          generatorURL:
            'http://prometheus-operator-prometheus.metalk8s-monitoring:9090/graph?g0.expr=%28node_filesystem_avail_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2F+node_filesystem_size_bytes%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%2A+100+%3C+5+and+node_filesystem_readonly%7Bfstype%21%3D%22%22%2Cjob%3D%22node-exporter%22%7D+%3D%3D+0%29&g0.tab=1',
          labels: {
            alertname: 'NodeFilesystemAlmostOutOfSpace',
            container: 'node-exporter',
            device: '/dev/vdc',
            endpoint: 'metrics',
            fstype: 'xfs',
            instance: '192.168.1.29:9100',
            job: 'node-exporter',
            mountpoint: '/mnt/testpart',
            namespace: 'metalk8s-monitoring',
            pod: 'prometheus-operator-prometheus-node-exporter-wk86s',
            prometheus: 'metalk8s-monitoring/prometheus-operator-prometheus',
            service: 'prometheus-operator-prometheus-node-exporter',
            severity: 'warning',
          },
        },
      ];
      return {
        alerts,
      };
    });
    // Setup
    initializeProm(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus`);
    initializeAM(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/alertmanager`);
    initializeLoki(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/loki`);
    const { getByLabelText } = render(
      <NodePartitionTable instanceIP={'192.168.1.29'} />,
    );
    expect(getByLabelText('loading')).toBeInTheDocument();
    // Exercise
    await waitForLoadingToFinish();
    // Verify
    expect(
      screen.getByLabelText('Exclamation-circle status warning'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('97%')).toBeInTheDocument();
    expect(screen.getByText('/mnt/testpart')).toBeInTheDocument();
    // since we use the same query, so the number of global size is the same as usage
    expect(screen.getByText('96.9 Bytes')).toBeInTheDocument();
  });
  afterEach(() => server.resetHandlers());
  test('handles server error', async () => {
    // S
    initializeProm(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus`);
    initializeAM(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/alertmanager`);
    initializeLoki(`http://${FAKE_CONTROL_PLANE_IP}:8443/api/loki`);
    // override the default route with error status
    server.use(
      rest.get(
        `http://${FAKE_CONTROL_PLANE_IP}:8443/api/prometheus/api/v1/query`,
        (req, res, ctx) => {
          return res(ctx.status(500));
        },
      ),
    );
    const { getByLabelText } = render(
      <NodePartitionTable instanceIP={'192.168.1.29'} />,
    );
    expect(getByLabelText('loading')).toBeInTheDocument();
    // E
    await waitForLoadingToFinish();
    // V
    expect(
      screen.getByText('System partitions request has failed.'),
    ).toBeInTheDocument();
  });
  afterAll(() => {
    server.close();
  });
});
