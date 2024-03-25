import React from 'react';
import styled from 'styled-components';
import { Box, Button } from '@scality/core-ui/dist/next';
import { useIntl } from 'react-intl';
import { padding } from '@scality/core-ui/dist/style/theme';
import NodePartitionTable from './NodePartitionTable';
import { GRAFANA_DASHBOARDS, PORT_NODE_EXPORTER } from '../constants';
import { useTypedSelector } from '../hooks';
import { Icon, spacing } from '@scality/core-ui';
const TitleContainer = styled.div`
  display: flex;
  position: sticky;
  z-index: 100;
  top: 0;
  justify-content: flex-end;
  padding: ${spacing.r16};
`;

const NodePagePartitionTab = (props: Record<string, any>) => {
  const { instanceIP } = props;
  const intl = useIntl();
  // To redirect to the right Node(Detailed) dashboard in Grafana
  const api = useTypedSelector((state) => state.config.api);
  const unameInfos = useTypedSelector(
    (state) => state.app.monitoring.unameInfo,
  );
  const hostnameLabel = unameInfos.find(
    (unameInfo) =>
      unameInfo?.metric?.instance === `${instanceIP}:${PORT_NODE_EXPORTER}`,
  )?.metric?.nodename;
  return (
    <Box height="100%" display="flex" flexDirection={'column'}>
      <TitleContainer>
        {api && api.url_grafana && (
          <a // We can't redirect to the Node(detailed) Filesystem Detail category.
            // So we hardcode the panel ID to redirect to 'File Nodes Free' chart
            href={`${api.url_grafana}/d/${GRAFANA_DASHBOARDS.nodes}?var-DS_PROMETHEUS=Prometheus&var-job=node-exporter&var-name=${hostnameLabel}&viewPanel=41`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              label={intl.formatMessage({
                id: 'advanced_metrics',
              })}
              variant={'secondary'}
              icon={<Icon name="External-link" />}
              data-cy="advanced_metrics_node_detailed_file_node_free"
            />
          </a>
        )}
      </TitleContainer>
      <NodePartitionTable instanceIP={instanceIP} />
    </Box>
  );
};

export default NodePagePartitionTab;
