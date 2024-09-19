import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import ThemeProvider from './ThemeProvider';
import RatioMeter from './components/RatioMeter';
import MarketCapComparison from './components/MarketCapComparison';
import GlobalStyle from './GlobalStyle';

function App() {
  return (
    <ThemeProvider>
      <GlobalStyle />
      <Router>
        <div className="App">
          {/* <nav>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/points">Points Calculator</Link></li>
            </ul>
          </nav> */}

          <Routes>
            {/* <Route path="/" element={<RatioMeter />} /> */}
            <Route path="/" element={<Navigate to="/points/solana" replace />} />
            <Route path="/points/:coin" element={<MarketCapComparison />} />
            <Route path="/points" element={<Navigate to="/points/solana" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
