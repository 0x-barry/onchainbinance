import React from 'react';
import styled from 'styled-components';

const NavigationContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.theme.colors.background};
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem 2rem;
  display: flex;
  justify-content: ${props => props.$justifyContent || 'space-between'};
  z-index: 1000;
  border-top: 1px solid ${props => props.theme.colors.secondary};
  backdrop-filter: blur(5px);
  
  /* Add a subtle glow effect */
  &:before {
    content: '';
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    height: 10px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.05), transparent);
    pointer-events: none;
  }
`;

const Button = styled.button`
  background: ${props => {
    if (props.disabled) return props.theme.colors.text.secondary;
    return props.$primary ? props.theme.colors.primary : props.theme.colors.secondary;
  }};
  color: ${props => props.$primary ? props.theme.colors.background : props.theme.colors.text.primary};
  border: 1px solid ${props => {
    if (props.disabled) return props.theme.colors.text.secondary;
    return props.$primary ? props.theme.colors.primary : props.theme.colors.secondary;
  }};
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 0.75rem 1.5rem;
  font-weight: ${props => props.theme.fontWeights.bold};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-family: ${props => props.theme.fonts.body};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: ${props => props.disabled ? 0.7 : 1};
  
  &:hover {
    opacity: ${props => props.disabled ? 0.7 : 0.9};
  }
`;

const ButtonIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

// Arrow icons for buttons
export const LeftArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M12 8a.5.5 0 0 1-.5.5H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5a.5.5 0 0 1 .5.5z"/>
  </svg>
);

export const RightArrowIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"/>
  </svg>
);

/**
 * WizardNavigation component
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.leftContent - Content to display on the left side
 * @param {React.ReactNode} props.rightContent - Content to display on the right side
 * @param {string} props.justifyContent - CSS justify-content value for the container
 * @param {React.ReactNode} props.children - Alternative to using leftContent and rightContent
 */
const WizardNavigation = ({ leftContent, rightContent, justifyContent, children, ...props }) => {
  // If children are provided, render them directly
  if (children) {
    return (
      <NavigationContainer $justifyContent={justifyContent} {...props}>
        {children}
      </NavigationContainer>
    );
  }
  
  // Otherwise use leftContent and rightContent
  return (
    <NavigationContainer $justifyContent={justifyContent} {...props}>
      {leftContent}
      {rightContent}
    </NavigationContainer>
  );
};

/**
 * WizardButton component
 * 
 * @param {Object} props
 * @param {boolean} props.primary - Whether this is a primary button
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {Function} props.onClick - Click handler
 * @param {React.ReactNode} props.leftIcon - Icon to display on the left
 * @param {React.ReactNode} props.rightIcon - Icon to display on the right
 * @param {React.ReactNode} props.children - Button content
 */
export const WizardButton = ({ 
  primary, 
  disabled, 
  onClick, 
  leftIcon, 
  rightIcon, 
  children, 
  ...props 
}) => {
  return (
    <Button 
      $primary={primary} 
      disabled={disabled} 
      onClick={onClick}
      {...props}
    >
      {leftIcon && <ButtonIcon>{leftIcon}</ButtonIcon>}
      {children}
      {rightIcon && <ButtonIcon>{rightIcon}</ButtonIcon>}
    </Button>
  );
};

export default WizardNavigation; 