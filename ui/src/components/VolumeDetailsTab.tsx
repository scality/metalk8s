import React from 'react';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { fontSize } from '@scality/core-ui/dist/style/theme';
import { VolumeTab } from './style/CommonLayoutStyle';
import { spacing } from '@scality/core-ui';
const VolumeObjectContent = styled.div`
  white-space: pre-wrap;
  font-size: ${fontSize.small};
`;
const ErrorText = styled.div`
  text-align: center;
  padding: ${spacing.r16};
`;

const VolumeDetailsTab = (props) => {
  const { data } = props.currentVolumeObject;
  const intl = useIntl();
  return (
    <VolumeTab>
      <VolumeObjectContent>
        {data && JSON.stringify(data, null, '\t')}
        {!data && (
          <ErrorText>
            {intl.formatMessage({
              id: 'error_volume_details',
            })}
          </ErrorText>
        )}
      </VolumeObjectContent>
    </VolumeTab>
  );
};

export default VolumeDetailsTab;
