import axios from 'axios';
import { COINS } from './constants';

const API_KEY = process.env.REACT_APP_COINGECKO_API_KEY;
const BASE_URL = 'https://api.coingecko.com/api/v3';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  params: {
    x_cg_demo_api_key: API_KEY
  }
});

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCachedData(key) {
  const cachedData = localStorage.getItem(key);
  if (cachedData) {
    const { timestamp, data } = JSON.parse(cachedData);
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }
  }
  return null;
}

function setCachedData(key, data) {
  const cacheObject = {
    timestamp: Date.now(),
    data: data
  };
  localStorage.setItem(key, JSON.stringify(cacheObject));
}

export async function fetchFullyDilutedValuation(coinDisplayName) {
  const coinId = COINS[coinDisplayName];
  if (!coinId) {
    throw new Error(`Unknown coin: ${coinDisplayName}`);
  }

  const cacheKey = `fdv_${coinId}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    console.log('Cached data:', cachedData);
    return cachedData;
  }

  try {
    const response = await axiosInstance.get(`/coins/${coinId}`, {
      params: {
        localization: false,
        tickers: false,
        market_data: true,
        community_data: false,
        developer_data: false,
        sparkline: false
      }
    });
    const fdv = response.data.market_data.fully_diluted_valuation.usd;
    setCachedData(cacheKey, fdv);
    return fdv;
  } catch (error) {
    console.error('Error fetching FDV:', error.response ? error.response.data : error.message);
    throw new Error(`Failed to fetch fully diluted valuation for ${coinDisplayName}`);
  }
}

export async function fetchTokenPrice(coinDisplayName) {
  const coinId = COINS[coinDisplayName];
  if (!coinId) {
    throw new Error(`Unknown coin: ${coinDisplayName}`);
  }

  const cacheKey = `price_${coinId}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axiosInstance.get('/simple/price', {
      params: {
        ids: coinId,
        vs_currencies: 'usd'
      }
    });
    const price = response.data[coinId].usd;
    setCachedData(cacheKey, price);
    return price;
  } catch (error) {
    console.error('Error fetching token price:', error);
    throw new Error('Failed to fetch token price');
  }
}

export async function fetchBTCPerpVolume(exchange) {
  const cacheKey = `btc_perp_volume_${exchange}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await axiosInstance.get(`/exchanges/${exchange}`);
    const volume = response.data.trade_volume_24h_btc;
    setCachedData(cacheKey, volume);
    return volume;
  } catch (error) {
    console.error(`Error fetching BTC perp volume for ${exchange}:`, error);
    throw new Error(`Failed to fetch BTC perp volume for ${exchange}`);
  }
}

export async function fetchAllFullyDilutedValuations(coinDisplayNames) {
  const cacheKey = `all_fdv_${coinDisplayNames.sort().join('_')}`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    console.log('Using cached data for all FDVs:', cachedData);
    return cachedData;
  }

  try {
    const coinIds = coinDisplayNames.map(name => {
      const id = COINS[name];
      if (!id) {
        throw new Error(`Unknown coin: ${name}`);
      }
      return id;
    });

    const response = await axiosInstance.get('/coins/markets', {
      params: {
        vs_currency: 'usd',
        ids: coinIds.join(','),
        order: 'market_cap_desc',
        per_page: 250,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h'
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid data received from API');
    }
    const result = {};
    for (const coin of response.data) {
      const coinName = Object.keys(COINS).find(key => COINS[key] === coin.id);
      result[coinName] = {
        price: coin.current_price,
        marketCap: coin.market_cap,
        fdv: coin.fully_diluted_valuation,
        volume24h: coin.total_volume,
        change24h: coin.price_change_percentage_24h,
        lastUpdated: new Date(coin.last_updated).getTime() / 1000,
        image: coin.image
      };
    }

    setCachedData(cacheKey, result);
    console.log('Setting cached data for all FDVs:', result);
    return result;
  } catch (error) {
    console.error('Error fetching all FDVs:', error);
    throw error;
  }
}

