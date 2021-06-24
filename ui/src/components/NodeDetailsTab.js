import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { padding, fontSize } from '@scality/core-ui/dist/style/theme';
import { NodeTab } from './style/CommonLayoutStyle';
import { useIntl } from 'react-intl';

const NodeObjectContent = styled.div`
  padding: ${padding.large} 50px 0 ${padding.larger};
  white-space: pre-wrap;
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
  const intl = useIntl();
  return (
    <NodeTab>
      <NodeObjectContent>
        {currentNodeObject ? (
          JSON.stringify(currentNodeObject, null, '\t')
        ) : (
          <ErrorText>
            {intl.formatMessage({ id: 'error_volume_details' })}
          </ErrorText>
        )}
      </NodeObjectContent>
    </NodeTab>
  );
};

export default NodePageDetailsTab;
