import React from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import ThemeProvider from './ThemeProvider';
import RatioMeter from './components/RatioMeter';
import MarketCapComparison from './components/MarketCapComparison';
import Summary from './components/Tax/Summary';
import GlobalStyle from './GlobalStyle';
import DriftErrorPage from './components/DriftErrorPage';
import Upload from './components/Tax/Upload';
import AirdropConfig from './components/Tax/AirdropConfig';

const Nav = styled.nav`
  padding: 1rem;
  margin-bottom: 2rem;
`;

const NavList = styled.ul`
  display: flex;
  justify-content: center;
  gap: 2rem;
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StyledNavLink = styled(NavLink)`
  color: white;
  text-decoration: none;
  padding: 0.5rem 0;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -4px;
    width: 100%;
    height: 3px;
    background: ${props => props.theme.colors.primary};
    transform: scaleX(0);
    transition: transform 0.2s ease;
  }

  &.active {
    color: ${props => props.theme.colors.primary};
    
    &:after {
      transform: scaleX(1);
    }
  }
`;

function App() {
  return (
    <ThemeProvider>
      <GlobalStyle />
      <Router>
        <div className="App">
          <Nav>
            <NavList>
              <li>
                <StyledNavLink 
                  to="/calculator/solana"
                >
                  Market Cap
                </StyledNavLink>
              </li>
              <li><StyledNavLink to="/upload">Tax</StyledNavLink></li>
            </NavList>
          </Nav>

          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/airdrop-config" element={<AirdropConfig />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="/ratio" element={<RatioMeter />} />
            <Route path="/calculator" element={<Navigate to="/calculator/solana" replace />} />
            <Route path="/calculator/:coin" element={<MarketCapComparison />} />
            <Route path="/drift-error" element={<DriftErrorPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
