ARG GRAFANA_IMAGE_VERSION=6.7.1

FROM grafana/grafana:${GRAFANA_IMAGE_VERSION}

# cannot install plugin to /var/lib/grafana since it will be overwritten
# For more about this see https://community.grafana.com/t/install-plugin-from-dockerfile/2603/5
RUN mkdir -p /home/grafana/plugin && chown -R grafana:grafana /home/grafana/plugin

# set new plugin path
ENV GF_PATHS_PLUGINS=/home/grafana/plugin

RUN grafana-cli --pluginsDir /home/grafana/plugin plugins install grafana-piechart-panel
