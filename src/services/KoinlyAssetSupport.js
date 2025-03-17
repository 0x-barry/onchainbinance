/**
 * This file contains mappings for Hyperliquid assets and their compatibility with Koinly
 */

// Assets fully supported by Koinly - these will work correctly with full token address
export const KOINLY_SUPPORTED_ASSETS = [
  'ATEHUN', 'AUTIST', 'CAT', 'CZ', 'DEPIN', 'FARM', 'FLY', 'FRUDO', 
  'FUN', 'GMEOW', 'H', 'HFUN', 'HYPE', 'HYENA', 'JEFF', 'LAUNCH', 
  'LIQD', 'LQNA', 'ORA', 'PANDA', 'PIP', 'PILL', 'POINTS', 'PURR', 
  'SENT', 'SOVRN', 'VAPOR', 'VAULT', 'VEGAS', 'YEETI'
];

// Assets that Koinly rejects entirely (even just with ticker)
export const KOINLY_UNSUPPORTED_ASSETS = [
  'DHYPE', 'FEIT', 'HBOOST', 'HETU', 'HWTR', 'ILIENS', 'NMTD', 'NOCEX', 
  'PRFI', 'PURRPS', 'STHYPE', 'STRICT', 'TJIF', 'VIZN', 'WATAR', 'WHYPI'
];

// Special case assets that don't need warnings
export const KOINLY_SPECIAL_CASES = ['USDC'];

/**
 * Determines if an asset is fully supported by Koinly
 * @param {string} addressString - The address formatted in Koinly's preferred format COIN:address:BLOCKCHAIN
 * @returns {boolean} - Whether the asset is fully supported
 */
export function isFullySupported(addressString) {
  if (!addressString) return false;
  
  // Extract token name from addressString
  const coin = addressString.split(':')[0];
  
  return KOINLY_SUPPORTED_ASSETS.includes(coin);
}

/**
 * Formats a currency symbol for Koinly export based on its support status
 * @param {string} addressString - The address formatted in Koinly's preferred format COIN:address:BLOCKCHAIN
 * @returns {string} - The formatted currency for Koinly
 */
export function formatCurrencyForKoinly(addressString) {
  if (!addressString) return '';
  
  // Extract token name from addressString
  const coin = addressString.split(':')[0];
  
  // For fully supported assets, we can use the full address format
  if (KOINLY_SUPPORTED_ASSETS.includes(coin)) {
    return addressString; // Can use full address format
  } else {
    // For all other assets, just use the symbol
    return coin;
  }
}

/**
 * Determines if an asset needs a warning in the Koinly export
 * @param {string} addressString - The address formatted in Koinly's preferred format COIN:address:BLOCKCHAIN
 * @returns {'hard'|'soft'|null} - The type of warning needed, or null if no warning
 */
export function getAssetWarningType(addressString) {
  if (!addressString) return null;
  
  // Extract token name from addressString
  const coin = addressString.split(':')[0];
  
  // Hard warning for completely unsupported assets
  if (KOINLY_UNSUPPORTED_ASSETS.includes(coin)) {
    return 'hard';
  }
  
  // No warning for fully supported assets or special cases
  if (KOINLY_SUPPORTED_ASSETS.includes(coin) || 
      KOINLY_SPECIAL_CASES.includes(coin)) {
    return null;
  }
  
  // Soft warning for everything else
  return 'soft';
} 