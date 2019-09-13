//@flow
import React from 'react';
import styled from 'styled-components';
import {
  fontSize,
  padding,
  jade,
  yellowOrange,
  warmRed,
} from '@scality/core-ui/dist/style/theme';
import { STATUS_BANNER_WARNING, STATUS_BANNER_ERROR } from '../constants';

const BannerContainer = styled.div`
  display: flex;
  margin: ${padding.base} 0 0 ${padding.larger};
  padding: ${padding.small} ${padding.small} ${padding.small} 0;
  font-size: ${fontSize.small};

  border: 1px solid;
  border-left: 5px solid;
  border-radius: 3px;
  border-color: ${props => {
    return props.themeBanner;
  }};

  a {
    text-decoration: none;
    margin-left: ${padding.smaller};
  }
  i {
    display: flex;
    align-items: center;
    margin-left: ${padding.small};
    color: ${props => {
      return props.themeBanner;
    }};
  }
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const TextLine = styled.span`
  margin-left: ${padding.base};
`;

const Title = styled.div`
  margin-left: ${padding.base};
  font-weight: bold;
`;
type Props = {
  icon: Object,
  title: string,
  messages: Array<string>,
  type: string,
};

const Banner = (props: Props) => {
  const { icon, title, messages, type } = props;
  let themeBanner;
  switch (type) {
    case STATUS_BANNER_WARNING:
      themeBanner = yellowOrange;
      break;
    case STATUS_BANNER_ERROR:
      themeBanner = warmRed;
      break;
    default:
      themeBanner = jade;
  }

  return (
    <BannerContainer themeBanner={themeBanner}>
      {icon}
      <TextContainer>
        <Title>{title}</Title>
        {messages.map((message, idx) => {
          return <TextLine key={idx}>{message}</TextLine>;
        })}
      </TextContainer>
    </BannerContainer>
  );
};

export default Banner;
