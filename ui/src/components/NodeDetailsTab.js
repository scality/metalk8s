import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { TabContainer } from './CommonLayoutStyle';
import { intl } from '../translations/IntlGlobalProvider';

const NodeObjectContent = styled.div`
  padding: ${padding.large} 50px 0 ${padding.larger};
  white-space: pre-wrap;
  overflow-y: auto;
  height: 78vh;
  font-size: ${fontSize.base};
`;

const ErrorText = styled.div`
  text-align: center;
  padding: ${padding.base};
`;

const NodePageDetailsTab = (props) => {
  const currentNodeObject = useSelector(
    (state) => state.app.nodes.currentNodeObject,
  );

  return (
    <TabContainer>
      <NodeObjectContent>
        {currentNodeObject ? (
          JSON.stringify(currentNodeObject, null, '\t')
        ) : (
          <ErrorText>{intl.translate('error_volume_details')}</ErrorText>
        )}
      </NodeObjectContent>
    </TabContainer>
  );
};

export default NodePageDetailsTab;
