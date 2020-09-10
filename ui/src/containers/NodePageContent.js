import React from 'react';
import { useHistory } from 'react-router';
import NodeListTable from '../components/NodeListTable';
import {
  LeftSideInstanceList,
  RightSidePanel,
  NoInstanceSelectedContainer,
  NoInstanceSelected,
  PageContentContainer,
} from '../components/CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

const NodePageContent = (props) => {
  const { nodeListData } = props;

  const history = useHistory();
  const currentNodeName =
    history?.location?.pathname?.split('/')?.slice(2)[0] || '';

  return (
    <PageContentContainer>
      <LeftSideInstanceList>
        <NodeListTable nodeListData={nodeListData} />
      </LeftSideInstanceList>
      {currentNodeName ? (
        <RightSidePanel></RightSidePanel>
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
