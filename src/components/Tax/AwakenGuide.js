import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import WizardNavigation, { WizardButton, LeftArrowIcon } from '../UI/WizardNavigation';

const Title = styled.h1`
  font-size: 2.25rem;
  margin-bottom: 3rem;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: ${props => props.theme.fonts.body};
`;

const Description = styled.div`
  margin-bottom: 2rem;
  padding: 1rem;
  background: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius.medium};
  border: 1px solid ${props => props.theme.colors.border};
`;

const WelcomeTitle = styled.h4`
  margin-bottom: 1rem;
  font-family: ${props => props.theme.fonts.header};
  color: ${props => props.theme.colors.text.primary};
`;

const Section = styled.section`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
`;

const AlphaTag = styled.span`
  background-color: #ff4444;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
  cursor: help;
  position: relative;
  
  &:hover::after {
    content: "Use At Your Own Risk";
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 0.8rem;
    white-space: nowrap;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(100% + 5px);
    z-index: 1000;
  }
`;

const AwakenGuide = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Title>Awaken Import Guide <AlphaTag>⚠️ ALPHA</AlphaTag></Title>
      <Description>
        <p>Detailed instructions for importing your Hyperliquid transaction data into Awaken will be available here soon.</p>
      </Description>
      
      <Section>
        <h2>Coming Soon</h2>
        <p>Detailed instructions for importing your Hyperliquid transaction data into Awaken Tax will be available here soon.</p>
        <p>The guide will include:</p>
        <ul>
          <li>Step-by-step import instructions</li>
          <li>Handling of different transaction types</li>
          <li>Troubleshooting common issues</li>
          <li>Special considerations for futures trading</li>
        </ul>
      </Section>

      <WelcomeTitle>
        Welcome to Awaken! <span role="img" aria-label="rocket">🚀</span>
      </WelcomeTitle>

      <WizardNavigation>
        <WizardButton
          onClick={() => navigate('/summary')}
          leftIcon={<LeftArrowIcon />}
        >
          Back to Summary
        </WizardButton>
      </WizardNavigation>
    </Container>
  );
};

export default AwakenGuide; 