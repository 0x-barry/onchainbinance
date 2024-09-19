import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import genslerImage from '../images/gensler.png'; // Update this line

const slideUp = keyframes`
  0% { transform: translateY(100%); }
  100% { transform: translateY(0); }
`;

const slideDown = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(100%); }
`;

const AnimatedImage = styled.img`
  position: fixed;
  bottom: 0;
  left: 0%;
  transform: translateX(-50%);
  width: 300px; // Adjust as needed
  animation: ${props => props.isVisible ? slideUp : slideDown} 0.5s ease-in-out forwards;
`;

function GenslerAnimation({ trigger }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!trigger && !isVisible) return null;

  return <AnimatedImage src={genslerImage} alt="Gensler" isVisible={isVisible} />;
}

export default GenslerAnimation;
