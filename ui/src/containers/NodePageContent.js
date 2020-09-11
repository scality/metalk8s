import React from 'react';
import styled from 'styled-components';
import { padding } from '@scality/core-ui/dist/style/theme';
import { useHistory } from 'react-router';
import NodeListTable from '../components/NodeListTable';
import NodePageRSP from './NodePageRSP';
import {
  LeftSideInstanceList,
  NoInstanceSelectedContainer,
  NoInstanceSelected,
  PageContentContainer,
} from '../components/CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

const NodePageRSPContainer = styled.div`
  flex-direction: column;
  width: 55%;
  margin: ${padding.small} ${padding.small} ${padding.small} 0;
`;

const NodePageContent = (props) => {
  const { nodeTableData } = props;

  const history = useHistory();
  const selectedNodeName =
    history?.location?.pathname?.split('/')?.slice(2)[0] || '';

  return (
    <PageContentContainer>
      <LeftSideInstanceList>
        <NodeListTable
          nodeTableData={nodeTableData}
          selectedNodeName={selectedNodeName}
        />
      </LeftSideInstanceList>
      {selectedNodeName ? (
        <NodePageRSPContainer>
          <NodePageRSP selectedNodeName={selectedNodeName} />
        </NodePageRSPContainer>
      ) : (
        <NoInstanceSelectedContainer>
          <NoInstanceSelected>
            {intl.translate('no_node_selected')}
          </NoInstanceSelected>
        </NoInstanceSelectedContainer>
      )}
    </PageContentContainer>
  );
};

export default NodePageContent;
