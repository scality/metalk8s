import React from 'react';
import styled from 'styled-components';
import { intl } from '../translations/IntlGlobalProvider';
import { padding } from '@scality/core-ui/dist/style/theme';
import { VolumeTab } from './CommonLayoutStyle';

const VolumeObjectContent = styled.div`
  white-space: pre-wrap;
`;

const ErrorText = styled.div`
  text-align: center;
  padding: ${padding.base};
`;

const VolumeDetailsTab = (props) => {
  const { data, error } = props.currentVolumeObject;

  return (
    <VolumeTab>
      <VolumeObjectContent>
        {data && JSON.stringify(data, null, '\t')}
        {error && (
          <ErrorText>{intl.translate('error_volume_details')}</ErrorText>
        )}
      </VolumeObjectContent>
    </VolumeTab>
  );
};

export default VolumeDetailsTab;
