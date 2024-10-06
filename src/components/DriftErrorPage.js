import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ErrorPage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 1.5rem;
  text-align: center;
`;

function DriftErrorPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCount) => prevCount - 1);
    }, 1000);

    const redirect = setTimeout(() => {
      window.location.href = 'https://multicoin.capital';
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirect);
    };
  }, []);

  return (
    <ErrorPage>
      <h1>404 - Drift Not Found</h1>
      <p>Redirecting you in {countdown} seconds...</p>
    </ErrorPage>
  );
}

export default DriftErrorPage;
