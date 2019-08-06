import React from 'react';
import styled from 'styled-components';
import {
  fontSize,
  padding,
  yellowOrange
} from '@scality/core-ui/dist/style/theme';

const BannerContainer = styled.div`
  display: flex;
  margin: ${padding.base} 0 0 ${padding.larger};
  padding: ${padding.small} ${padding.small} ${padding.small} 0;
  font-size: ${fontSize.small};
  border: 1px solid ${yellowOrange};
  border-left: 5px solid ${yellowOrange};
  border-radius: 3px;
  a {
    text-decoration: none;
    margin-left: ${padding.smaller};
  }
  i {
    display: flex;
    align-items: center;
    margin-left: ${padding.small};
    color: ${yellowOrange};
  }
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const TextLine = styled.span`
  margin-left: ${padding.base};
`;

const Banner = props => {
  const { intlMsg } = props;

  return (
    <BannerContainer>
      <i className="fas fa-exclamation-triangle" />
      <TextContainer>
        <TextLine>{intlMsg.no_storage_class_found}</TextLine>
        <TextLine>
          {intlMsg.storage_class_is_required}
          <a
            // eslint-disable-next-line react/jsx-no-target-blank
            target="_blank"
            href="https://kubernetes.io/docs/concepts/storage/storage-classes/#the-storageclass-resource"
          >
            {intlMsg.learn_more}
          </a>
        </TextLine>
      </TextContainer>
    </BannerContainer>
  );
};

export default Banner;
