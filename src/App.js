import React from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, Navigate } from 'react-router-dom';
import ThemeProvider from './ThemeProvider';
import RatioMeter from './components/RatioMeter';
import MarketCapComparison from './components/MarketCapComparison';
import GlobalStyle from './GlobalStyle';
import DriftErrorPage from './components/DriftErrorPage'; // Import the new component

function App() {
  return (
    <ThemeProvider>
      <GlobalStyle />
      <Router>
        <div className="App">
          {/* <nav className="switch-nav">
            <ul>
              <li><NavLink to="/ratio">Ratio</NavLink></li>
              <li>
                <NavLink 
                  to="/points" 
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  Points
                </NavLink>
              </li>
              <li><NavLink to="/shill">Shill Zone</NavLink></li>
            </ul>
          </nav> */}

          <Routes>
            <Route path="/" element={<Navigate to="/points/solana" replace />} />
            <Route path="/ratio" element={<RatioMeter />} />
            <Route path="/points" element={<Navigate to="/points/solana" replace />} />
            <Route path="/points/:coin" element={<MarketCapComparison />} />
            <Route path="/drift-error" element={<DriftErrorPage />} /> {/* Add this line */}
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
