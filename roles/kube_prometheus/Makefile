
GRAFANA_DASHBOARD_YAML=files/additionnal_dashboard.yml
SRCDIR=src

GRAFANA_DASHBOARD=$(wildcard $(SRCDIR)/*.json)

all: compile

define SOURCE_EXTRACTOR
$$(python -c "import json; j=json.load(open('$${dashboard}')); print(j['__inputs'][0]['name'])")
endef


compile:
	@echo 'Aggregating $(GRAFANA_DASHBOARD) dashboard into $(GRAFANA_DASHBOARD_YAML)'
	@( \
	   echo "grafana:"; \
	   echo  "  serverDashboardFiles:"; \
	) > $(GRAFANA_DASHBOARD_YAML);
	@for dashboard in $(GRAFANA_DASHBOARD); do \
	( \
	   echo "    $$(echo $$(basename $${dashboard})|sed 's/.json/-dashboard.json/'): |+"; \
	   echo '      {'; \
	   echo '        "inputs": ['; \
	   echo '          {'; \
	   echo "            \"name\": \"$(SOURCE_EXTRACTOR)\","; \
	   echo '            "type": "datasource",'; \
	   echo '            "pluginId": "prometheus",'; \
	   echo '            "value": "prometheus"'; \
	   echo '           }'; \
	   echo '        ],'; \
	   echo '        "overwrite": true,'; \
	   echo '        "dashboard":'; \
	   sed 's/^/          /' $${dashboard}; \
	   echo '      }'; \
	) >> $(GRAFANA_DASHBOARD_YAML); \
	done;

# :vim set noexpandtab shiftwidth=8 softtabstop=0
