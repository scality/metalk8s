#!jinja | metalk8s_kubernetes

{%- from "metalk8s/map.jinja" import repo with context %}
{%- from "metalk8s/repo/macro.sls" import build_image_name with context %}
{%- set fluent_bit_defaults = salt.slsutil.renderer('salt://metalk8s/addons/logging/fluent-bit/config/fluent-bit.yaml.j2', saltenv=saltenv) %}
{%- set fluent_bit = salt.metalk8s_service_configuration.get_service_conf('metalk8s-logging', 'metalk8s-fluent-bit-config', fluent_bit_defaults) %}

{% raw %}

apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.7
    helm.sh/chart: fluent-bit-0.47.9
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
---
apiVersion: v1
data:
  fluent-bit-fluent-bit.json: |-
    {
      "annotations": {
        "list": [
          {
            "builtIn": 1,
            "datasource": {
              "type": "prometheus",
              "uid": "$DS_PROMETHEUS"
            },
            "enable": true,
            "hide": true,
            "iconColor": "rgba(0, 211, 255, 1)",
            "name": "Annotations & Alerts",
            "type": "dashboard"
          }
        ]
      },
      "description": "Fluent Bit dashboard.",
      "editable": true,
      "fiscalYearStartMonth": 0,
      "gnetId": null,
      "graphTooltip": 1,
      "id": null,
      "links": [],
      "liveNow": false,
      "panels": [
        {
          "collapsed": false,
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "gridPos": {
            "h": 1,
            "w": 24,
            "x": 0,
            "y": 0
          },
          "id": 45,
          "panels": [],
          "targets": [
            {
              "datasource": {
                "type": "prometheus",
                "uid": "$DS_PROMETHEUS"
              },
              "refId": "A"
            }
          ],
          "title": "Status",
          "type": "row"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "description": "",
          "fieldConfig": {
            "defaults": {
              "mappings": [],
              "thresholds": {
                "mode": "percentage",
                "steps": [
                  {
                    "color": "#d44a3a",
                    "value": null
                  },
                  {
                    "color": "#299c46",
                    "value": 0
                  }
                ]
              },
              "unit": "none"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 3,
            "w": 24,
            "x": 0,
            "y": 1
          },
          "id": 6,
          "links": [],
          "maxDataPoints": 100,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "vertical",
            "reduceOptions": {
              "calcs": [
                "last"
              ],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(kube_pod_info{job=\"kube-state-metrics\",namespace=\"$namespace\",created_by_kind=\"DaemonSet\",created_by_name=\"$release\"})",
              "format": "time_series",
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "Active Pods",
              "range": true,
              "refId": "A"
            },
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(kube_node_status_condition{job=\"kube-state-metrics\",condition=\"Ready\",status=\"true\"})",
              "interval": "",
              "legendFormat": "Ready Nodes",
              "range": true,
              "refId": "B"
            },
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(kube_node_status_condition{job=\"kube-state-metrics\",condition!=\"Ready\",status=\"true\"})",
              "interval": "",
              "legendFormat": "Non-Ready Nodes",
              "range": true,
              "refId": "C"
            }
          ],
          "transparent": true,
          "type": "stat"
        },
        {
          "collapsed": false,
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "gridPos": {
            "h": 1,
            "w": 24,
            "x": 0,
            "y": 4
          },
          "id": 43,
          "panels": [],
          "targets": [
            {
              "datasource": {
                "type": "prometheus",
                "uid": "$DS_PROMETHEUS"
              },
              "refId": "A"
            }
          ],
          "title": "Fluent Bit Metrics",
          "type": "row"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 50,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "links": [],
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "Bps"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 6,
            "w": 12,
            "x": 0,
            "y": 5
          },
          "id": 2,
          "links": [],
          "options": {
            "legend": {
              "calcs": [
                "lastNotNull"
              ],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "desc"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_input_bytes_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "format": "time_series",
              "hide": false,
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Input Bytes Processing Rate",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 50,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "links": [],
              "mappings": [],
              "min": 0,
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "Bps"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 6,
            "w": 12,
            "x": 12,
            "y": 5
          },
          "id": 9,
          "links": [],
          "options": {
            "legend": {
              "calcs": [
                "lastNotNull"
              ],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "desc"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_output_proc_bytes_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "format": "time_series",
              "hide": false,
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Output Bytes Processing Rate",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 50,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "links": [],
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "rps"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 6,
            "w": 12,
            "x": 0,
            "y": 11
          },
          "id": 40,
          "links": [],
          "options": {
            "legend": {
              "calcs": [
                "lastNotNull"
              ],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "desc"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_input_records_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "format": "time_series",
              "hide": false,
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Input Records Processing Rate",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 50,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "links": [],
              "mappings": [],
              "min": 0,
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "rps"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 6,
            "w": 12,
            "x": 12,
            "y": 11
          },
          "id": 41,
          "links": [],
          "options": {
            "legend": {
              "calcs": [
                "lastNotNull"
              ],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "desc"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_output_proc_records_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "format": "time_series",
              "hide": false,
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Output Record Processing Rate",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "links": [],
              "mappings": [],
              "min": 0,
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "short"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 6,
            "w": 12,
            "x": 0,
            "y": 17
          },
          "id": 11,
          "links": [],
          "options": {
            "legend": {
              "calcs": [
                "mean",
                "lastNotNull",
                "max"
              ],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "desc"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_output_retries_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "format": "time_series",
              "hide": false,
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "{{pod}} Retries to {{name}}",
              "range": true,
              "refId": "A"
            },
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_output_retries_failed_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "format": "time_series",
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "{{pod}} Failed Retries to {{ name }}",
              "range": true,
              "refId": "B"
            }
          ],
          "title": "Output Retry/Failed Rates",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "none"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "links": [],
              "mappings": [],
              "min": 0,
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "errors/sec"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 6,
            "w": 12,
            "x": 12,
            "y": 17
          },
          "id": 10,
          "links": [],
          "options": {
            "legend": {
              "calcs": [
                "lastNotNull"
              ],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": true
            },
            "tooltip": {
              "mode": "multi",
              "sort": "none"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_output_errors_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "format": "time_series",
              "hide": false,
              "interval": "",
              "intervalFactor": 1,
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Output Error Rate",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "Bps"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 23
          },
          "id": 54,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "none"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_filter_bytes_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "interval": "",
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Filter Bytes",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "rps"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 12,
            "y": 23
          },
          "id": 55,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "none"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_filter_records_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "interval": "",
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Filter Records",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "short"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 31
          },
          "id": 48,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "none"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_filter_add_records_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "interval": "",
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Filter Add Records",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "normal"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "short"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 12,
            "y": 31
          },
          "id": 47,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "none"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(rate(fluentbit_filter_drop_records_total{job=\"$release\",namespace=\"$namespace\"}[5m])) by (pod, name)",
              "interval": "",
              "legendFormat": "{{pod}}/{{name}}",
              "range": true,
              "refId": "A"
            }
          ],
          "title": "Filter Drop Records",
          "type": "timeseries"
        },
        {
          "collapsed": false,
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "gridPos": {
            "h": 1,
            "w": 24,
            "x": 0,
            "y": 39
          },
          "id": 53,
          "panels": [],
          "targets": [
            {
              "datasource": {
                "type": "prometheus",
                "uid": "$DS_PROMETHEUS"
              },
              "refId": "A"
            }
          ],
          "title": "Kubernetes Metrics",
          "type": "row"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "none"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "decbytes"
            },
            "overrides": [
              {
                "matcher": {
                  "id": "byRegexp",
                  "options": "/.* request/"
                },
                "properties": [
                  {
                    "id": "color",
                    "value": {
                      "fixedColor": "#F2CC0C",
                      "mode": "fixed"
                    }
                  },
                  {
                    "id": "custom.fillOpacity",
                    "value": 0
                  }
                ]
              }
            ]
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 40
          },
          "id": 51,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "none"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(container_memory_working_set_bytes{job=\"kubelet\",namespace=\"$namespace\",pod=~\"$pod\",container=\"fluent-bit\"}) by (pod)",
              "interval": "",
              "legendFormat": "{{pod}}",
              "range": true,
              "refId": "A"
            },
            {
              "datasource": {
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "avg(kube_pod_container_resource_requests{job=\"kube-state-metrics\",namespace=\"$namespace\",pod=~\"$pod\", container=\"fluent-bit\",resource=\"memory\"})",
              "interval": "",
              "legendFormat": "request",
              "range": true,
              "refId": "B"
            }
          ],
          "title": "Memory Usage",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "$DS_PROMETHEUS"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "legend": false,
                  "tooltip": false,
                  "viz": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "none"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              },
              "unit": "short"
            },
            "overrides": [
              {
                "matcher": {
                  "id": "byRegexp",
                  "options": "/.* request/"
                },
                "properties": [
                  {
                    "id": "color",
                    "value": {
                      "fixedColor": "#F2CC0C",
                      "mode": "fixed"
                    }
                  },
                  {
                    "id": "custom.fillOpacity",
                    "value": 0
                  }
                ]
              }
            ]
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 12,
            "y": 40
          },
          "id": 50,
          "options": {
            "legend": {
              "calcs": [],
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": false
            },
            "tooltip": {
              "mode": "multi",
              "sort": "none"
            }
          },
          "pluginVersion": "9.5.3",
          "targets": [
            {
              "datasource": {
                "type": "prometheus",
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=\"$namespace\",pod=~\"$pod\",container=\"fluent-bit\"}) by (pod)",
              "interval": "",
              "legendFormat": "{{ pod }}",
              "range": true,
              "refId": "A"
            },
            {
              "datasource": {
                "type": "prometheus",
                "uid": "$DS_PROMETHEUS"
              },
              "editorMode": "code",
              "expr": "avg(kube_pod_container_resource_requests{job=\"kube-state-metrics\",namespace=\"$namespace\",pod=~\"$pod\",container=\"fluent-bit\",resource=\"cpu\"})",
              "interval": "",
              "legendFormat": "{{ pod }} request",
              "range": true,
              "refId": "B"
            }
          ],
          "title": "CPU Usage",
          "type": "timeseries"
        }
      ],
      "refresh": "5s",
      "schemaVersion": 38,
      "style": "dark",
      "tags": [],
      "templating": {
        "list": [
          {
            "current": {
              "selected": false,
              "text": "Prometheus",
              "value": "Prometheus"
            },
            "hide": 0,
            "includeAll": false,
            "label": "Datasource",
            "multi": false,
            "name": "DS_PROMETHEUS",
            "options": [],
            "query": "prometheus",
            "queryValue": "",
            "refresh": 1,
            "regex": "",
            "skipUrlSync": false,
            "type": "datasource"
          },
          {
            "allValue": "$fullname-.*",
            "current": {
              "selected": false,
              "text": "All",
              "value": "$__all"
            },
            "datasource": {
              "type": "prometheus",
              "uid": "$DS_PROMETHEUS"
            },
            "definition": "label_values(kube_pod_info{job=\"kube-state-metrics\",namespace=\"$namespace\",created_by_kind=\"DaemonSet\",created_by_name=\"$release\"},pod)",
            "hide": 0,
            "includeAll": true,
            "label": "pod",
            "multi": false,
            "name": "pod",
            "options": [],
            "query": {
              "query": "label_values(kube_pod_info{job=\"kube-state-metrics\",namespace=\"$namespace\",created_by_kind=\"DaemonSet\",created_by_name=\"$release\"},pod)",
              "refId": "PrometheusVariableQueryEditor-VariableQuery"
            },
            "refresh": 2,
            "regex": "",
            "skipUrlSync": false,
            "sort": 0,
            "tagValuesQuery": "",
            "tagsQuery": "",
            "type": "query",
            "useTags": false
          },
          {
            "hide": 2,
            "label": "Namespace",
            "name": "namespace",
            "query": "metalk8s-logging",
            "skipUrlSync": false,
            "type": "constant"
          },
          {
            "hide": 2,
            "label": "Release",
            "name": "release",
            "query": "fluent-bit",
            "skipUrlSync": false,
            "type": "constant"
          },
          {
            "hide": 2,
            "label": "Full Name",
            "name": "fullname",
            "query": "fluent-bit",
            "skipUrlSync": false,
            "type": "constant"
          }
        ]
      },
      "time": {
        "from": "now-30m",
        "to": "now"
      },
      "timepicker": {
        "refresh_intervals": [
          "5s",
          "10s",
          "30s",
          "1m",
          "5m",
          "15m",
          "30m",
          "1h",
          "2h",
          "1d"
        ],
        "time_options": [
          "5m",
          "15m",
          "1h",
          "6h",
          "12h",
          "24h",
          "2d",
          "7d",
          "30d"
        ]
      },
      "timezone": "",
      "title": "fluent-bit",
      "uid": "b50980eb83fa85bca0ce83ceadaf322e09e8a4cd",
      "version": 7,
      "weekStart": ""
    }
kind: ConfigMap
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.7
    grafana_dashboard: '1'
    helm.sh/chart: fluent-bit-0.47.9
    heritage: metalk8s
  name: fluent-bit-dashboard-fluent-bit
  namespace: metalk8s-logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.7
    helm.sh/chart: fluent-bit-0.47.9
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
rules:
- apiGroups:
  - ''
  resources:
  - namespaces
  - pods
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.7
    helm.sh/chart: fluent-bit-0.47.9
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluent-bit
subjects:
- kind: ServiceAccount
  name: fluent-bit
  namespace: metalk8s-logging
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.7
    helm.sh/chart: fluent-bit-0.47.9
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  ports:
  - name: http
    port: 2020
    protocol: TCP
    targetPort: http
  selector:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/name: fluent-bit
  type: ClusterIP
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.7
    helm.sh/chart: fluent-bit-0.47.9
    heritage: metalk8s
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  selector:
    matchLabels:
      app.kubernetes.io/instance: fluent-bit
      app.kubernetes.io/name: fluent-bit
  template:
    metadata:
      annotations:
        checksum/config: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        prometheus.io/path: /api/v1/metrics/prometheus
        prometheus.io/port: '2020'
        prometheus.io/scrape: 'true'
      labels:
        app.kubernetes.io/instance: fluent-bit
        app.kubernetes.io/name: fluent-bit
    spec:
      containers:
      - args:
        - --workdir=/fluent-bit/etc
        - --config=/fluent-bit/etc/conf/fluent-bit.conf
        command:
        - /fluent-bit/bin/fluent-bit
        image: {% endraw -%}{{ build_image_name("fluent-bit", False) }}{%- raw %}:3.1.7
        imagePullPolicy: IfNotPresent
        livenessProbe:
          httpGet:
            path: /
            port: http
        name: fluent-bit
        ports:
        - containerPort: 2020
          name: http
          protocol: TCP
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: http
        resources: {% endraw -%}{{ fluent_bit.spec.deployment.resources }}{%- raw %}
        volumeMounts:
        - mountPath: /fluent-bit/etc/conf
          name: config
        - mountPath: /run/fluent-bit
          name: run
        - mountPath: /var/log
          name: varlog
          readOnly: true
        - mountPath: /run/log
          name: runlog
          readOnly: true
      dnsPolicy: ClusterFirst
      hostNetwork: false
      serviceAccountName: fluent-bit
      tolerations:
      - effect: NoSchedule
        key: node-role.kubernetes.io/bootstrap
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/etcd
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
        operator: Exists
      - effect: NoSchedule
        key: node-role.kubernetes.io/master
        operator: Exists
      volumes:
      - configMap:
          name: fluent-bit
        name: config
      - hostPath:
          path: /run/fluent-bit
        name: run
      - hostPath:
          path: /var/log
        name: varlog
      - hostPath:
          path: /run/log
        name: runlog
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    app.kubernetes.io/instance: fluent-bit
    app.kubernetes.io/managed-by: salt
    app.kubernetes.io/name: fluent-bit
    app.kubernetes.io/part-of: metalk8s
    app.kubernetes.io/version: 3.1.7
    helm.sh/chart: fluent-bit-0.47.9
    heritage: metalk8s
    metalk8s.scality.com/monitor: ''
  name: fluent-bit
  namespace: metalk8s-logging
spec:
  endpoints:
  - path: /api/v2/metrics/prometheus
    port: http
  jobLabel: app.kubernetes.io/instance
  namespaceSelector:
    matchNames:
    - metalk8s-logging
  selector:
    matchLabels:
      app.kubernetes.io/instance: fluent-bit
      app.kubernetes.io/name: fluent-bit

{% endraw %}
