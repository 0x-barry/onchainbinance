import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { fetchBTCPerpVolume } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function RatioMeter() {
  const [currentRatio, setCurrentRatio] = useState(null);
  const [historicalRatios, setHistoricalRatios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const hyperliquidVolume = await fetchBTCPerpVolume('hyperliquid');
        const binanceVolume = await fetchBTCPerpVolume('binance');
        const ratio = hyperliquidVolume / binanceVolume;
        setCurrentRatio(ratio);

        // Simulating historical data (replace with actual API call)
        const historical = Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ratio: ratio * (1 + (Math.random() - 0.5) * 0.1)
        })).reverse();
        setHistoricalRatios(historical);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
    // Set up an interval to fetch data every 5 minutes
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const chartData = {
    labels: historicalRatios.map(data => data.date),
    datasets: [
      {
        label: 'Hyperliquid/Binance BTC Perp Volume Ratio',
        data: historicalRatios.map(data => data.ratio),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Hyperliquid vs Binance BTC Perp Volume Ratio',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="ratio-meter">
      <h1>Hyperliquid vs Binance BTC Perp Volume Ratio</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="current-ratio">
            <h2>Current Ratio</h2>
            <p>{currentRatio ? currentRatio.toFixed(4) : 'N/A'}</p>
          </div>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </>
      )}
    </div>
  );
}

export default RatioMeter;
