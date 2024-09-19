import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
    font-family: ${({ theme }) => theme.fonts.body};
    font-weight: ${({ theme }) => theme.fontWeights.normal};
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.fonts.body};
    font-weight: ${({ theme }) => theme.fontWeights.normal};
  }

  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;
  }

  button {
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.text.primary};
    border: none;
    padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.medium};
    border-radius: ${props => props.theme.borderRadius.small};
    cursor: pointer;
  }
`;

export default GlobalStyle;
