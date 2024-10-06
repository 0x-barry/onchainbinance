import React, { useState, useEffect } from 'react';
import { fetchAllExchangesData } from '../utils/api';

function RatioMeter() {
  const [exchangeData, setExchangeData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await fetchAllExchangesData();
        setExchangeData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching exchange data:', error);
        setError('Failed to fetch exchange data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    // Fetch data every 5 minutes
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="exchange-data">
      <h1>Exchange Comparison</h1>
      {Object.entries(exchangeData).map(([exchangeId, data]) => (
        <div key={exchangeId} className="exchange-info">
          <h2>{data.name || exchangeId}</h2>
          <p>Open Interest (BTC): {
            typeof data.open_interest_btc === 'number' 
              ? data.open_interest_btc.toFixed(2) 
              : 'N/A'
          }</p>
          <p>24h Trade Volume (BTC): {
            typeof data.trade_volume_24h_btc === 'string'
              ? parseFloat(data.trade_volume_24h_btc).toFixed(2)
              : typeof data.trade_volume_24h_btc === 'number'
                ? data.trade_volume_24h_btc.toFixed(2)
                : 'N/A'
          }</p>
        </div>
      ))}
    </div>
  );
}

export default RatioMeter;
