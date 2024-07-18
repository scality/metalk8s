import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { fontSize } from '@scality/core-ui/dist/style/theme';
import { NodeTab } from './style/CommonLayoutStyle';
import { useIntl } from 'react-intl';
import { spacing } from '@scality/core-ui';
const NodeObjectContent = styled.div`
  white-space: pre-wrap;
  font-size: ${fontSize.small};
`;
const ErrorText = styled.div`
  text-align: center;
  padding: ${spacing.r16};
`;

const NodePageDetailsTab = (props) => {
  const currentNodeObject = useSelector(
    // @ts-expect-error - FIXME when you are working on it
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
            {intl.formatMessage({
              id: 'error_volume_details',
            })}
          </ErrorText>
        )}
      </NodeObjectContent>
    </NodeTab>
  );
};

export default NodePageDetailsTab;
