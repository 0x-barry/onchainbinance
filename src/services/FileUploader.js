import Papa from 'papaparse';
import { TagMapper } from './TaxServiceConfig';
import { getAssetWarningType, formatCurrencyForKoinly } from './KoinlyAssetSupport';

// Define tax services
const TAX_SERVICES = {
  KOINLY: 'koinly',
  AWAKEN: 'awaken'
};

export class FileUploader {

  static async parseCSVFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !(file instanceof File)) {
        reject(new Error('Invalid file object provided'));
        return;
      }
      
      if (!file.name.toLowerCase().endsWith('.csv')) {
        reject(new Error('File must be a CSV file'));
        return;
      }

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log(`Parsing complete for ${file.name}:`, {
            rowCount: results.data.length,
            headers: results.meta.fields,
            hasErrors: results.errors.length > 0,
            errorCount: results.errors.length,
            firstRow: results.data[0] ? JSON.stringify(results.data[0]) : 'No data'
          });
          
          if (results.errors && results.errors.length > 0) {
            const errorMessages = results.errors.map(err => `Row ${err.row}: ${err.message}`).join('\n');
            console.error(`CSV parsing errors for ${file.name}:`, results.errors);
            reject(new Error(`CSV parsing failed:\n${errorMessages}`));
            return;
          }
          
          if (!results.data || !Array.isArray(results.data) || results.data.length === 0) {
            console.error(`No valid data rows in ${file.name}`);
            reject(new Error('CSV file contains no valid data rows'));
            return;
          }
          
          // Detect file type based on name and validate expected columns
          let fileType = '';
          if (file.name.includes('trade_history')) fileType = 'trades';
          else if (file.name.includes('funding_history')) fileType = 'funding';
          else if (file.name.includes('deposits_and_withdrawals')) fileType = 'deposits';
          else if (file.name.includes('rewardHistory')) fileType = 'stakingRewards';
          else if (file.name.includes('actionHistory')) fileType = 'stakingActions';
          
          // Detect date format if file has a time field
          const hasTimeField = results.meta.fields?.includes('time');
          
          if (hasTimeField && results.data.length > 0) {
            // Get all date samples for analysis
            const dateSamples = results.data
              .map(row => row.time)
              .filter(Boolean);
            
            if (dateSamples.length > 0) {
              // Detect and store the date format using full batch processing
              this.dateFormat = this.detectDateFormat(dateSamples);
              console.log(`Detected date format for ${file.name}: ${this.dateFormat}`);
            }
          }
          
          if (fileType) {
            try {
              this.validateCSVFormat(results.data, fileType);
            } catch (validationError) {
              console.error(`Validation error for ${file.name}:`, validationError.message);
              console.warn(`Continuing with processing despite validation errors in ${file.name}`);
            }
          } else {
            console.warn(`Unknown file type for ${file.name}, skipping validation`);
          }
          
          resolve(results.data);
        },
        error: (error) => {
          console.error(`Error parsing ${file.name}:`, error);
          reject(new Error(`Failed to read file: ${error.message}`));
        }
      });
    });
  }

  static async processData(processedTrades, fundingData, depositsData, stakingRewards = [], stakingActions = []) {
    // Get token data
    const tokenData = await this.getSpotTokenMap();
    localStorage.setItem('tokenAddressMap', JSON.stringify(tokenData.tokenAddressMap));
    
    // Process all data types and create timeline
    const timeline = [
        ...this.processDepositsAndWithdrawals(depositsData, tokenData.tokenAddressMap).map(deposit => ({ ...deposit, eventType: 'transfer' })),
        ...this.processTrades(processedTrades, tokenData).map(trade => ({ ...trade, eventType: 'trade' })),
        ...this.processFunding(fundingData, tokenData.tokenAddressMap).map(funding => ({ ...funding, eventType: 'funding' })),
        ...this.processStakingRewards(stakingRewards, tokenData.tokenAddressMap).map(reward => ({ ...reward, eventType: 'stakingReward' })),
        ...this.processStakingActions(stakingActions, tokenData.tokenAddressMap).map(action => ({ ...action, eventType: 'stakingAction' }))
    ].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Return the formatted timeline directly
    return { timeline };
  }

  static downloadKoinlyCSV(timeline) {
    try {
      if (!timeline || !Array.isArray(timeline)) {
        throw new Error('No timeline data provided');
      }

      const { getAssetWarningType } = require('./KoinlyAssetSupport');
      
      // Track problematic assets for reporting
      const problematicAssets = {
        soft: new Set(),
        hard: new Set()
      };

      // First pass: identify all problematic assets
      timeline.forEach(event => {
        const currencies = [
          event.data?.sentCurrency,
          event.data?.receivedCurrency,
          event.data?.feeCurrency
        ].filter(Boolean);
        
        console.log('Processing event currencies:', {
          eventType: event.eventType,
          currencies,
          time: event.time
        });
        
        currencies.forEach(currency => {
          const warningType = getAssetWarningType(currency);
          console.log('Asset warning type:', {
            currency,
            warningType
          });
          if (warningType === 'soft') problematicAssets.soft.add(currency);
          if (warningType === 'hard') problematicAssets.hard.add(currency);
        });
      });

      console.log('Identified problematic assets:', {
        soft: Array.from(problematicAssets.soft),
        hard: Array.from(problematicAssets.hard)
      });

      // Create NULL mappings for hard warning assets
      const nullMappings = this.createNullMappings(Array.from(problematicAssets.hard));
      console.log('Created NULL mappings:', nullMappings);

      // Define CSV headers
      const headers = [
        'Date',
        'Sent Amount',
        'Sent Currency',
        'Received Amount',
        'Received Currency',
        'Fee Amount',
        'Fee Currency',
        'Net Worth Amount',
        'Net Worth Currency',
        'Label',
        'Description',
        'TxHash'
      ];

      // Create rows for both CSVs
      const mainRows = timeline.map(event => this.createKoinlyRow(event));
      
      // Only include transactions with hard warning assets in the unsupported CSV
      const unsupportedRows = timeline
        .filter(event => {
          const currencies = [
            event.data?.sentCurrency,
            event.data?.receivedCurrency,
            event.data?.feeCurrency
          ].filter(Boolean);
          
          const hasHardWarning = currencies.some(currency => 
            getAssetWarningType(currency) === 'hard'
          );
          
          console.log('Checking event for hard warnings:', {
            eventType: event.eventType,
            time: event.time,
            currencies,
            hasHardWarning
          });
          
          return hasHardWarning;
        })
        .map(event => this.createUnsupportedKoinlyRow(event, nullMappings));

      console.log('Unsupported rows count:', unsupportedRows.length);
      console.log('Sample of unsupported rows:', unsupportedRows.slice(0, 2));

      // Download the main CSV
      this.downloadCSV(headers, mainRows, 'hyperliquid_transactions_koinly.csv');
      
      // Download the unsupported assets CSV if there are any rows
      if (unsupportedRows.length > 0) {
        console.log('Downloading unsupported assets CSV with', unsupportedRows.length, 'rows');
        this.downloadCSV(headers, unsupportedRows, 'hyperliquid_transactions_koinly_unsupported_assets.csv');
      } else {
        console.log('No unsupported assets found, skipping unsupported assets CSV download');
      }
      
      // Store problematic assets in localStorage for the follow-up guide
      localStorage.setItem('koinlySoftWarningAssets', 
        JSON.stringify(Array.from(problematicAssets.soft)));
      localStorage.setItem('koinlyHardWarningAssets', 
        JSON.stringify(Array.from(problematicAssets.hard)));
      
      return {
        softWarningAssets: Array.from(problematicAssets.soft),
        hardWarningAssets: Array.from(problematicAssets.hard),
        nullMappings
      };
    } catch (error) {
      console.error('Error downloading Koinly CSV:', error);
      throw error;
    }
  }

  /**
   * Creates a consistent mapping between unsupported assets and NULL numbers
   * @param {Array<string>} unsupportedAssets - Array of unsupported asset names
   * @returns {Object} - Mapping of asset names to NULL numbers
   */
  static createNullMappings(unsupportedAssets) {
    const mappings = {};
    unsupportedAssets.forEach((asset, index) => {
      mappings[asset] = `NULL${901 + index}`;
    });
    return mappings;
  }

  /**
   * Creates a row for the Koinly CSV, applying NULL prefixes to hard warning assets
   * @param {Object} event - The timeline event
   * @param {Object} nullMappings - Mapping of unsupported assets to NULL numbers
   * @returns {Array} - The formatted row
   */
  static createKoinlyRow(event) {
    const { formatCurrencyForKoinly } = require('./KoinlyAssetSupport');
    
    return [
      event.time,
      event.data.sentAmount,
      formatCurrencyForKoinly(event.data.sentCurrency),
      event.data.receivedAmount,
      formatCurrencyForKoinly(event.data.receivedCurrency),
      event.data.feeAmount,
      formatCurrencyForKoinly(event.data.feeCurrency),
      event.data.netWorthAmount || '',
      event.data.netWorthCurrency || '',
      event.data.tag,
      event.data.description,
      '' // TxHash
    ].map(cell => {
      if (cell && (cell.toString().includes(',') || cell.toString().includes('"'))) {
        return `"${cell.toString().replace(/"/g, '""')}"`;
      }
      return cell;
    });
  }

  static createUnsupportedKoinlyRow(event, nullMappings) {
    const { getAssetWarningType, formatCurrencyForKoinly } = require('./KoinlyAssetSupport');
    
    // Format currency, using NULL prefix for hard warning assets
    const formatCurrency = (currency) => {
      if (!currency) return '';
      return getAssetWarningType(currency) === 'hard' 
        ? nullMappings[currency]
        : formatCurrencyForKoinly(currency);
    };
    
    return [
      event.time,
      event.data.sentAmount,
      formatCurrency(event.data.sentCurrency),
      event.data.receivedAmount,
      formatCurrency(event.data.receivedCurrency),
      event.data.feeAmount,
      formatCurrency(event.data.feeCurrency),
      event.data.netWorthAmount || '',
      event.data.netWorthCurrency || '',
      event.data.tag,
      event.data.description,
      '' // TxHash
    ].map(cell => {
      if (cell && (cell.toString().includes(',') || cell.toString().includes('"'))) {
        return `"${cell.toString().replace(/"/g, '""')}"`;
      }
      return cell;
    });
  }

  /**
   * Downloads a CSV file with the given headers and rows
   * @param {Array<string>} headers - CSV headers
   * @param {Array<Array>} rows - CSV rows
   * @param {string} filename - Name of the file to download
   */
  static downloadCSV(headers, rows, filename) {
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Primary Data Processing
  static processTrades(trades, tokenData) {
    if (!Array.isArray(trades)) {
      throw new Error('Invalid trades data format');
    }

    return trades.map(trade => {
      const direction = trade.dir.toLowerCase();
      const isSpotDustConversion = direction.includes('dust');
      const isSpot = direction.includes('buy') || direction.includes('sell') || isSpotDustConversion;
      const isBuyOrOpen = direction.includes('buy') || direction.includes('open');
      const price = parseFloat(trade.px);
      const size = parseFloat(trade.sz);
      const fee = parseFloat(trade.fee);
      const pnl = parseFloat(trade.closedPnl || 0);
      const notional = parseFloat(trade.ntl);
      
      const coin = this.normalizeCoinName(trade.coin, tokenData);
      const usdc = 'USDC';
      
      let data = {
        sentAmount: '',
        sentCurrency: '',
        receivedAmount: '',
        receivedCurrency: '',
        feeAmount: '',
        feeCurrency: '',
        netWorthAmount: '',
        netWorthCurrency: '',
        tag: '',
        description: isSpotDustConversion 
          ? `Spot dust conversion of ${size} ${coin} to ${pnl} USDC`
          : `${isSpot ? (isBuyOrOpen ? 'Buy' : 'Sell') : (isBuyOrOpen ? 'Open' : 'Close')} ${size} ${coin} at ${price} USDC per ${coin}`,
        eventLabel: isSpot 
          ? `${isBuyOrOpen ? 'Buy' : 'Sell'} ${coin}`
          : `${isBuyOrOpen ? 'Open' : 'Close'} ${coin} ${direction.includes('long') ? 'Long' : 'Short'}`,
        internalTag: isSpot ? 'trade:spot' : (
          isBuyOrOpen ? (
            fee > 0 ? 'trade:perp:open:fee' : 'trade:perp:open:rebate'
          ) : 'trade:perp:close'
        ),
        pnl: pnl || undefined
      };
      
      // Spot trade logic
      if (isSpot) {
        if (isBuyOrOpen) {
          data.sentAmount = notional.toString();
          data.sentCurrency = usdc;
          data.receivedAmount = size.toString();
          data.receivedCurrency = coin;
          data.feeAmount = fee.toString(); // Fee is in coin for spot buys
          data.feeCurrency = coin;
        } else if (isSpotDustConversion) {
          data.sentAmount = size.toString();
          data.sentCurrency = coin;
          data.receivedAmount = pnl.toString(); // Likely 0 if spot was just burned
          data.receivedCurrency = usdc;
        } else {
          data.sentAmount = size.toString();
          data.sentCurrency = coin;
          data.receivedAmount = notional.toString();
          data.receivedCurrency = usdc;
          data.feeAmount = fee.toString(); // Fee is in USDC for spot sells
          data.feeCurrency = usdc;
        }
      // Perp trade logic
      } else {
        if (isBuyOrOpen) {
          if (fee < 0) {
            // Fee rebate
            data.receivedAmount = Math.abs(fee).toString();
            data.receivedCurrency = usdc;
          } else if (fee > 0) {
            // Regular fee
            data.sentAmount = fee.toString();
            data.sentCurrency = usdc;
          }
        } else {
          // Closing a position - handle PnL
          if (pnl > 0) {
            data.receivedAmount = pnl.toString();
            data.receivedCurrency = usdc;
          } else if (pnl < 0) {
            data.sentAmount = Math.abs(pnl).toString();
            data.sentCurrency = usdc;
          }
        }
      }
      
      return {
        time: this.parseDate(trade.time).toISOString(),
        eventType: 'trade',
        type: isSpot ? 'spot' : 'perp',
        data,
        original: trade
      };
    });
  }

  static processFunding(funding, tokenAddressMap = {}) {
    if (!Array.isArray(funding)) {
      throw new Error('Invalid funding data format');
    }

    return funding.map(payment => {
      const amount = parseFloat(payment.payment);
      const rate = parseFloat(payment.rate);
      const coin = payment.coin;
      const usdc = 'USDC';
      
      const data = {
        sentAmount: amount < 0 ? Math.abs(amount).toString() : '',
        sentCurrency: amount < 0 ? usdc : '',
        receivedAmount: amount > 0 ? amount.toString() : '',
        receivedCurrency: amount > 0 ? usdc : '',
        feeAmount: '',
        feeCurrency: '',
        netWorthAmount: '',
        netWorthCurrency: '',
        tag: '',
        description: `Funding payment for ${coin} position at rate ${rate}`,
        eventLabel: 'Funding Fee',
        internalTag: 'funding'
      };

      return {
        time: this.parseDate(payment.time).toISOString(),
        eventType: 'funding',
        data,
        original: payment
      };
    });
  }

  static processDepositsAndWithdrawals(deposits, tokenAddressMap = {}) {
    if (!Array.isArray(deposits)) {
      throw new Error('Invalid deposits data format');
    }

    return deposits.map(deposit => {
      const [amountStr, coin] = deposit.accountValueChange.split(' ');
      const amount = Math.abs(parseFloat(amountStr));
      const fee = Math.abs(parseFloat(deposit.fee || 0));
      const action = deposit.action.toLowerCase();
      const isPositive = parseFloat(amountStr) > 0;
      const isReceived = ['deposit', 'receive.spot', 'receive.usdc.perps.wallet', 'vault.distribution', 'vault.withdrawal','open.interest.reward', 'genesis.distribution','spot.perp.transfer','evm.to.spot.transfer'].includes(action) || 
                        (action === 'sub.account.transfer' && isPositive);
      const isInternalTransfer = ['perp.spot.transfer', 'spot.perp.transfer'].includes(action);
      
      let eventLabel = '';
      let description = '';
      let internalTag = '';

      if (action === 'deposit') {
        eventLabel = 'Bridge In';
        description = `Bridged in ${amount} ${coin}`;
        internalTag = 'transfer:deposit';
      } else if (action === 'withdrawal') {
        eventLabel = 'Bridge Out';
        description = `Bridged out ${amount} ${coin}`;
        internalTag = 'transfer:withdrawal';
      } else if (action === 'receive.spot') {
        eventLabel = coin === 'USDC' ? 'Receive USDC' : 'Receive Tokens';
        description = `Received ${amount} ${coin}`;
        internalTag = 'transfer:deposit:external';
      } else if (action === 'receive.usdc.perps.wallet') {
        eventLabel = 'Receive USDC';
        description = `Received ${amount} ${coin}`;
        internalTag = 'transfer:deposit:external';
      } else if (action === 'send.spot') {
        eventLabel = coin === 'USDC' ? 'Send USDC' : 'Send Tokens';
        description = `Sent ${amount} ${coin}`;
        internalTag = 'transfer:withdrawal:external';
      } else if (action === 'send.usdc.perps.wallet') {
        eventLabel = 'Send USDC';
        description = `Sent ${amount} ${coin}`;
        internalTag = 'transfer:withdrawal:external';
      } else if (['create.vault.capitalize', 'vault.deposit'].includes(action)) {
        eventLabel = 'Vault Deposit';
        description = `Deposited ${amount} ${coin} to unspecified vault [VAULT DEPOSIT]`;
        internalTag = 'transfer:vault:deposit';
      } else if (['vault.distribution', 'vault.withdrawal'].includes(action)) {
        eventLabel = 'Vault Withdrawal';
        description = `Withdrew ${amount} ${coin} from unspecified vault [VAULT WITHDRAWAL]`;
        internalTag = 'transfer:vault:withdrawal';
      } else if (action === 'perp.spot.transfer') {
        eventLabel = 'Perp to Spot Transfer';
        description = `Transferred ${amount} ${coin} from Perpetual to Spot account [INTRAWALLET TRANSFER]`;
        internalTag = 'transfer:internal:perp_to_spot';
      } else if (action === 'sub.account.transfer') {
        eventLabel = isPositive ? 'Receive from Subaccount' : 'Send to Subaccount';
        description = isPositive 
          ? `Received ${amount} ${coin} from subaccount [SUBACCOUNT MUST BE ADDED AS SEPARATE WALLET]`
          : `Sent ${amount} ${coin} to subaccount [SUBACCOUNT MUST BE ADDED AS SEPARATE WALLET]`;
        internalTag = isPositive ? 'transfer:deposit:subaccount' : 'transfer:withdrawal:subaccount';
      } else if (action === 'spot.perp.transfer') {
        eventLabel = 'Spot to Perp Transfer';
        description = `Transferred ${amount} ${coin} from Spot to Perpetual account [INTRAWALLET TRANSFER]`;
        internalTag = 'transfer:internal:spot_to_perp';
      } else if (action === 'open.interest.reward') {
        eventLabel = 'Open Interest Reward';
        description = `Received ${amount} ${coin} open interest reward`;
        internalTag = 'transfer:open_interest_reward';
      } else if (action === 'genesis.distribution') {
        eventLabel = `${coin} Airdrop`;
        description = `Received ${amount} ${coin} airdrop`;
        internalTag = 'transfer:airdrop';
      } else if (action === 'spot.to.evm.transfer') {
        eventLabel = 'Spot to EVM Transfer';
        description = `Transferred ${amount} ${coin} from Spot to EVM account`;
        internalTag = 'transfer:withdrawal:spot_to_evm';
      } else if (action === 'evm.to.spot.transfer') {
        eventLabel = 'EVM to Spot Transfer';
        description = `Transferred ${amount} ${coin} from EVM to Spot account`;
        internalTag = 'transfer:deposit:evm_to_spot';
      } else {
        eventLabel = 'Transfer';
        description = `Transferred ${amount} ${coin}`;
        internalTag = 'transfer:internal:unknown';
      }

      const data = {
        sentAmount: !isReceived ? amount.toString() : '',
        sentCurrency: !isReceived ? coin : '',
        receivedAmount: isReceived ? amount.toString() : '',
        receivedCurrency: isReceived ? coin : '',
        feeAmount: fee > 0 ? fee.toString() : '',
        feeCurrency: fee > 0 ? coin : '',
        netWorthAmount: deposit.netWorthAmount || '',
        netWorthCurrency: deposit.netWorthCurrency || '',
        tag: '',
        description,
        eventLabel,
        internalTag
      };

      return {
        time: this.parseDate(deposit.time).toISOString(),
        eventType: 'transfer',
        isInternalTransfer,
        data,
        original: deposit
      };
    });
  }

  static processStakingRewards(stakingRewards, tokenAddressMap = {}) {
    if (!Array.isArray(stakingRewards)) {
      throw new Error('Invalid staking rewards data format');
    }

    return stakingRewards.flatMap(reward => {
      const amount = parseFloat(reward.amount);
      const coin = 'HYPE';
      const rewardTime = this.parseDate(reward.time);
      
      // First transaction: Receive the reward
      const rewardData = {
        sentAmount: '',
        sentCurrency: '',
        receivedAmount: amount.toString(),
        receivedCurrency: coin,
        feeAmount: '',
        feeCurrency: '',
        netWorthAmount: '',
        netWorthCurrency: '',
        tag: '',
        description: `Staking reward of ${amount} ${coin}`,
        eventLabel: 'Staking Reward',
        internalTag: 'staking:reward'
      };
      
      const rewardTransaction = {
        time: rewardTime.toISOString(),
        eventType: 'stakingReward',
        data: rewardData,
        original: reward
      };
      
      // Second transaction: Auto-stake the reward (1 second later)
      const autoStakeTime = new Date(rewardTime.getTime() + 1000); // Add 1 second
      const autoStakeData = {
        sentAmount: amount.toString(),
        sentCurrency: coin,
        receivedAmount: '',
        receivedCurrency: '',
        feeAmount: '',
        feeCurrency: '',
        netWorthAmount: '',
        netWorthCurrency: '',
        tag: '',
        description: `Manual txn to account for auto-staking of ${amount} ${coin} reward [STAKE/DELEGATE]`,
        eventLabel: 'Auto-Stake Reward',
        internalTag: 'staking:delegate'
      };
      
      const autoStakeTransaction = {
        time: autoStakeTime.toISOString(),
        eventType: 'stakingAction',
        isInternalTransfer: false,
        data: autoStakeData,
        original: { ...reward, source: 'auto-stake' }
      };
      
      return [rewardTransaction, autoStakeTransaction];
    });
  }

  static processStakingActions(stakingActions, tokenAddressMap = {}) {
    if (!Array.isArray(stakingActions)) {
      throw new Error('Invalid staking actions data format');
    }

    return stakingActions.map(action => {
      const amount = parseFloat(action.amount);
      const coin = 'HYPE';
      const actionType = action.action.toLowerCase();
      const isInternalTransfer = ['deposit', 'withdrawal'].includes(actionType);

      let eventLabel = '';
      let description = '';
      let internalTag = '';
      
      if (actionType === 'delegate') {
        eventLabel = 'Stake HYPE';
        description = `Staked ${amount} ${coin} [STAKE/DELEGATE]`;
        internalTag = 'staking:delegate';
      } else if (actionType === 'undelegate') {
        eventLabel = 'Unstake HYPE';
        description = `Unstaked ${amount} ${coin} [UNSTAKE/UNDELEGATE]  `;
        internalTag = 'staking:undelegate';
      } else if (actionType === 'deposit') {
        eventLabel = 'Transfer Spot to Staking';
        description = `Transferred ${amount} ${coin} from Spot to Staking [INTRAWALLET TRANSFER]`;
        internalTag = 'staking:transfer:spot_to_staking';
      } else if (actionType === 'withdrawal') {
        eventLabel = 'Transfer Staking to Spot';
        description = `Transferred ${amount} ${coin} from Staking to Spot [INTRAWALLET TRANSFER]`;
        internalTag = 'staking:transfer:staking_to_spot';
      }

      const data = {
        sentAmount: ['deposit', 'delegate'].includes(actionType) ? amount.toString() : '',
        sentCurrency: ['deposit', 'delegate'].includes(actionType) ? coin : '',
        receivedAmount: ['withdrawal', 'undelegate'].includes(actionType) ? amount.toString() : '',
        receivedCurrency: ['withdrawal', 'undelegate'].includes(actionType) ? coin : '',
        feeAmount: '',
        feeCurrency: '',
        netWorthAmount: '',
        netWorthCurrency: '',
        tag: '',
        description,
        eventLabel,
        internalTag
      };
      
      return {
        time: this.parseDate(action.time).toISOString(),
        eventType: 'stakingAction',
        isInternalTransfer,
        data,
        original: action
      };
    });
  }

  // Helper Functions

  // Standardizes the coin name
  static normalizeCoinName(coin, tokenData) {
    const { pairToTokenMap } = tokenData || { pairToTokenMap: {} };
    if (coin === 'PURR/USDC') return 'PURR'; // early PURR transactions were named PURR/USDC in CSV
    if (pairToTokenMap[coin]) return pairToTokenMap[coin];
    return coin;
  }

  // Parses the date from the CSV data
  static parseDate(dateStr) {
    try {
      // Handle Date objects directly
      if (dateStr instanceof Date) {
        return dateStr;
      }

      // Handle null/undefined/empty values
      if (!dateStr) {
        throw new Error('Invalid date: received empty value');
      }

      // Handle ISO 8601 format (e.g., '2023-08-16T20:46:50.000Z')
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(dateStr)) {
        return new Date(dateStr);
      }

      // Handle timestamp format (e.g., '1740950869326') for staking CSVs
      if (/^\d{13}$/.test(dateStr)) {
        // Unix timestamps are UTC by definition
        // Create date in UTC by using UTC methods
        const timestamp = parseInt(dateStr);
        return new Date(timestamp);
      }

      // Handle ISO format (e.g., '2024-02-17 16:31:52')
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
        const [datePart, timePart] = dateStr.split(' ');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes, seconds] = timePart.split(':');
        
        // Create UTC date
        const utcTimestamp = Date.UTC(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );
        
        return new Date(utcTimestamp);
      }

      // Handle date-time format (e.g., '11/1/2023 - 12:00:37') for other CSVs
      if (dateStr.includes(' - ')) {
        const [datePart, timePart] = dateStr.split(' - ');
        
        // Use the detected date format or fall back to MM/DD/YYYY
        const dateFormat = this.dateFormat || 'MM/DD/YYYY';
        let month, day, year;
        
        if (dateFormat === 'MM/DD/YYYY') {
          [month, day, year] = datePart.split('/');
        } else {
          [day, month, year] = datePart.split('/');
        }
        
        const [hours, minutes, seconds] = timePart.split(':');
        
        // First create a local date object
        // Hyperliquid CSVs are in the local timezone (if it's date string)
        const localDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          parseInt(seconds)
        );

        // Convert to UTC by getting the UTC timestamp
        const utcTimestamp = Date.UTC(
          localDate.getUTCFullYear(),
          localDate.getUTCMonth(),
          localDate.getUTCDate(),
          localDate.getUTCHours(),
          localDate.getUTCMinutes(),
          localDate.getUTCSeconds()
        );

        // Create final UTC date
        return new Date(utcTimestamp);
      }

      throw new Error(`Unrecognized date format: ${dateStr}`);
    } catch (error) {
      console.error(`Date parsing error for "${dateStr}":`, error);
      throw new Error(`Failed to parse date: ${dateStr}`);
    }
  }

  /**
   * Detects whether dates in the provided sample are in MM/DD/YYYY or DD/MM/YYYY format
   * @param {Array<string>} dateSamples - Array of date strings to analyze
   * @returns {string} - 'MM/DD/YYYY' or 'DD/MM/YYYY'
   */
  static detectDateFormat(dateSamples) {
    // Constants
    const MAX_SAMPLES = 1000;
    const CONFIDENCE_THRESHOLD = 0.7;
    const METHOD_WEIGHTS = {
      unambiguous: 0.7,
      rangeValidation: 0.2,
      consistency: 0.1
    };

    // First, scan all dates for unambiguous format indicators
    const quickScanResults = this.analyzeUnambiguousDates(dateSamples);
    console.log('Quick scan for unambiguous dates:', quickScanResults);
    
    // If we found unambiguous dates, use them to determine the format
    if (quickScanResults.mmdd > 0 || quickScanResults.ddmm > 0) {
      if (quickScanResults.ddmm > quickScanResults.mmdd) {
        console.log('Detected DD/MM/YYYY format based on unambiguous dates');
        return 'DD/MM/YYYY';
      } else if (quickScanResults.mmdd > quickScanResults.ddmm) {
        console.log('Detected MM/DD/YYYY format based on unambiguous dates');
        return 'MM/DD/YYYY';
      }
    }

    // If no unambiguous dates found, proceed with detailed analysis
    console.log('No unambiguous dates found, proceeding with detailed analysis');
    
    // Initialize scores
    let mmddScore = 0;
    let ddmmScore = 0;
    
    // Process dates in batches if needed
    let processedSamples = 0;
    let currentBatch = dateSamples.slice(0, Math.min(100, dateSamples.length));
    
    while (currentBatch.length > 0 && processedSamples < MAX_SAMPLES) {
      // Method 2: Date Range Validation
      const rangeResults = this.validateDateRanges(currentBatch);
      mmddScore += rangeResults.mmdd * METHOD_WEIGHTS.rangeValidation;
      ddmmScore += rangeResults.ddmm * METHOD_WEIGHTS.rangeValidation;
      
      // Method 3: Consistency Analysis
      const consistencyResults = this.analyzeDateConsistency(currentBatch);
      mmddScore += consistencyResults.mmdd * METHOD_WEIGHTS.consistency;
      ddmmScore += consistencyResults.ddmm * METHOD_WEIGHTS.consistency;
      
      // Log the analysis for debugging
      console.log('Date format detection analysis:', {
        batchSize: currentBatch.length,
        rangeResults,
        consistencyResults,
        currentScores: { mmddScore, ddmmScore }
      });
      
      // Check if we have enough confidence
      const totalScore = mmddScore + ddmmScore;
      if (totalScore > 0) {
        const mmddConfidence = mmddScore / totalScore;
        const ddmmConfidence = ddmmScore / totalScore;
        
        if (mmddConfidence >= CONFIDENCE_THRESHOLD) {
          console.log('Detected MM/DD/YYYY format with confidence:', mmddConfidence);
          return 'MM/DD/YYYY';
        }
        if (ddmmConfidence >= CONFIDENCE_THRESHOLD) {
          console.log('Detected DD/MM/YYYY format with confidence:', ddmmConfidence);
          return 'DD/MM/YYYY';
        }
      }
      
      // Get next batch if needed
      processedSamples += currentBatch.length;
      if (processedSamples < dateSamples.length && processedSamples < MAX_SAMPLES) {
        const nextBatchSize = Math.min(100, dateSamples.length - processedSamples);
        currentBatch = dateSamples.slice(processedSamples, processedSamples + nextBatchSize);
      } else {
        break;
      }
    }
    
    // If we couldn't determine with confidence, use default format
    console.log('Using default MM/DD/YYYY format');
    return 'MM/DD/YYYY';
  }

  /**
   * Analyzes dates for unambiguous format indicators
   * @param {Array<string>} dates - Array of date strings
   * @returns {Object} - Counts of unambiguous MM/DD and DD/MM dates
   */
  static analyzeUnambiguousDates(dates) {
    let mmddCount = 0;
    let ddmmCount = 0;
    
    for (const dateStr of dates) {
      if (!dateStr.includes('/')) continue;
      
      const parts = dateStr.split('/');
      if (parts.length !== 3) continue;
      
      const num1 = parseInt(parts[0], 10);
      const num2 = parseInt(parts[1], 10);
      
      if (num1 > 12 && num2 <= 12) {
        ddmmCount++;
      } else if (num1 <= 12 && num2 > 12) {
        mmddCount++;
      }
    }
    
    return { mmdd: mmddCount, ddmm: ddmmCount };
  }

  /**
   * Validates dates against calendar rules to determine format
   * @param {Array<string>} dates - Array of date strings
   * @returns {Object} - Scores for MM/DD and DD/MM formats
   */
  static validateDateRanges(dates) {
    let mmddValid = 0;
    let ddmmValid = 0;
    
    for (const dateStr of dates) {
      if (!dateStr.includes('/')) continue;
      
      const parts = dateStr.split('/');
      if (parts.length !== 3) continue;
      
      const num1 = parseInt(parts[0], 10);
      const num2 = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      // Skip if either number is > 12 (unambiguous)
      if (num1 > 12 || num2 > 12) continue;
      
      // Check if date is valid in MM/DD format
      if (this.isValidDate(num1, num2, year)) {
        mmddValid++;
      }
      
      // Check if date is valid in DD/MM format
      if (this.isValidDate(num2, num1, year)) {
        ddmmValid++;
      }
    }
    
    return { mmdd: mmddValid, ddmm: ddmmValid };
  }

  /**
   * Checks if a date is valid
   * @param {number} month - Month (1-12)
   * @param {number} day - Day
   * @param {number} year - Year
   * @returns {boolean} - Whether the date is valid
   */
  static isValidDate(month, day, year) {
    if (month < 1 || month > 12) return false;
    if (day < 1) return false;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
  }

  /**
   * Analyzes date sequences for consistency
   * @param {Array<string>} dates - Array of date strings
   * @returns {Object} - Scores for MM/DD and DD/MM formats
   */
  static analyzeDateConsistency(dates) {
    let mmddConsistent = 0;
    let ddmmConsistent = 0;
    
    // Sort dates to analyze sequences
    const sortedDates = [...dates].sort();
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      
      if (!prevDate.includes('/') || !currDate.includes('/')) continue;
      
      const prevParts = prevDate.split('/');
      const currParts = currDate.split('/');
      
      if (prevParts.length !== 3 || currParts.length !== 3) continue;
      
      // Check MM/DD consistency
      const prevMonth = parseInt(prevParts[0], 10);
      const currMonth = parseInt(currParts[0], 10);
      const prevDay = parseInt(prevParts[1], 10);
      const currDay = parseInt(currParts[1], 10);
      
      if (this.isConsistentSequence(prevMonth, currMonth, prevDay, currDay)) {
        mmddConsistent++;
      }
      
      // Check DD/MM consistency
      if (this.isConsistentSequence(prevDay, currDay, prevMonth, currMonth)) {
        ddmmConsistent++;
      }
    }
    
    return { mmdd: mmddConsistent, ddmm: ddmmConsistent };
  }

  /**
   * Checks if a sequence of dates is consistent
   * @param {number} prevMajor - Previous major component (month or day)
   * @param {number} currMajor - Current major component
   * @param {number} prevMinor - Previous minor component (day or month)
   * @param {number} currMinor - Current minor component
   * @returns {boolean} - Whether the sequence is consistent
   */
  static isConsistentSequence(prevMajor, currMajor, prevMinor, currMinor) {
    // If major component increases, sequence is consistent
    if (currMajor > prevMajor) return true;
    
    // If major component stays same but minor increases, sequence is consistent
    if (currMajor === prevMajor && currMinor > prevMinor) return true;
    
    return false;
  }

  // Clears all data from localStorage
  static clearLocalStorage() {
    
    // Clear token address map
    localStorage.removeItem('tokenAddressMap');
    
    // Clear all raw data
    localStorage.removeItem('rawTradeData');
    localStorage.removeItem('rawFundingData');
    localStorage.removeItem('rawDepositsData');
    localStorage.removeItem('rawStakingRewardsData');
    localStorage.removeItem('rawStakingActionsData');
  }

  // API Integration
  static async getSpotTokenMap() {
    try {

      const response = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'spotMeta'
        })
      });
      
      const data = await response.json();
      
      if (!data.tokens || !data.universe) {
        throw new Error('Invalid spot metadata format');
      }

      const tokenMap = {};
      const tokenAddressMap = {};
      
      // Store token metadata including addresses
      data.tokens.forEach(token => {
        if (token.name && token.tokenId) {
          // Store the token address in the format SYMBOL:ADDRESS:BLOCKCHAIN
          tokenAddressMap[token.name] = `${token.name}:${token.tokenId}:HYPE`;
        }
      });
            
      // Map trading pairs to token names
      data.universe.forEach(pair => {
        if (pair.name.startsWith('@')) {
          const tokenIndex = pair.tokens[0];
          const token = data.tokens[tokenIndex];
          if (token) {
            tokenMap[pair.name] = token.name;
          }
        }
      });

      return { 
        pairToTokenMap: tokenMap,
        tokenAddressMap: tokenAddressMap
      };
    } catch (error) {
      console.error('Error fetching spot token map:', error);
      return { 
        pairToTokenMap: {},
        tokenAddressMap: {
          // Fallback with at least HYPE token address
          'HYPE': 'HYPE:0x0d01dc56dcaaca66ad901c959b4011ec:HYPE'
        }
      };
    }
  }

  // Validates that all required headers exist in the CSV data
  static validateCSVFormat(data, fileType) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('No data to validate');
    }

    const requiredColumns = {
      trades: ['time', 'dir', 'px', 'sz', 'fee', 'ntl', 'coin'],
      funding: ['time', 'payment', 'rate', 'coin'],
      deposits: ['time', 'action', 'accountValueChange', 'fee'],
      stakingRewards: ['time', 'source', 'amount'],
      stakingActions: ['time', 'action', 'validator', 'amount']
    };

    const columns = Object.keys(data[0]);
    const missingColumns = requiredColumns[fileType].filter(col => !columns.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns for ${fileType}: ${missingColumns.join(', ')}. Found columns: ${columns.join(', ')}`);
    }
  }

  static generateTestKoinlyCSV(tokenAddressMap) {
    try {
      // Define CSV headers
      const headers = [
        'Date',
        'Sent Amount',
        'Sent Currency',
        'Received Amount',
        'Received Currency',
        'Fee Amount',
        'Fee Currency',
        'Net Worth Amount',
        'Net Worth Currency',
        'Label',
        'Description',
        'TxHash'
      ];

      // Generate two rows for each token
      const rows = Object.entries(tokenAddressMap).flatMap(([token, address]) => [
        // Row with full address format
        [
          new Date().toISOString(), // Current date
          '', // Sent Amount
          '', // Sent Currency
          '1', // Received Amount
          address, // Full token address (e.g., PURR:address:HYPE)
          '', // Fee Amount
          '', // Fee Currency
          '', // Net Worth Amount
          '', // Net Worth Currency
          '', // Label
          `Test transaction for ${token} using full address`, // Description with token name
          '' // TxHash
        ]
        ,
        // Row with just token symbol
        [
          new Date().toISOString(), // Current date
          '', // Sent Amount
          '', // Sent Currency
          '1', // Received Amount
          token, // Just the token symbol
          '', // Fee Amount
          '', // Fee Currency
          '', // Net Worth Amount
          '', // Net Worth Currency
          '', // Label
          `Test transaction for ${token} using token symbol`, // Description with token name
          '' // TxHash
        ]
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => 
          // Properly escape cells containing commas or quotes
          cell ? `"${cell.toString().replace(/"/g, '""')}"` : ''
        ).join(','))
      ].join('\n');
      
      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create a download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Set link properties
      link.setAttribute('href', url);
      link.setAttribute('download', 'koinly_test_transactions.csv');
      link.style.visibility = 'hidden';
      
      // Add to document, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error generating test Koinly CSV:', error);
      throw error;
    }
  }

  static downloadTaxCSV(timeline, taxService) {
    try {
      const mapper = new TagMapper(taxService);
      
      // Track problematic assets for Koinly
      let problematicAssets = null;
      if (taxService === TAX_SERVICES.KOINLY) {
        problematicAssets = {
          soft: new Set(),
          hard: new Set()
        };
        
        // First pass: identify all problematic assets
        timeline.forEach(event => {
          const currencies = [
            event.data?.sentCurrency,
            event.data?.receivedCurrency,
            event.data?.feeCurrency
          ].filter(Boolean);
          
          currencies.forEach(currency => {
            const warningType = getAssetWarningType(currency);
            if (warningType === 'soft') problematicAssets.soft.add(currency);
            if (warningType === 'hard') problematicAssets.hard.add(currency);
          });
        });
      }
      
      // Create NULL mappings for hard warning assets (Koinly only)
      const nullMappings = taxService === TAX_SERVICES.KOINLY 
        ? this.createNullMappings(Array.from(problematicAssets.hard))
        : null;

      // Create rows for the CSV
      const rows = timeline.map(event => {
        // Get the appropriate tag for this tax service
        const tag = mapper.mapTag(event.data.internalTag);
        
        // Create a data object with standard field names
        const data = {
          date: event.time,
          sentAmount: event.data.sentAmount,
          sentCurrency: taxService === TAX_SERVICES.KOINLY 
            ? this.formatKoinlyCurrency(event.data.sentCurrency, nullMappings)
            : event.data.sentCurrency,
          receivedAmount: event.data.receivedAmount,
          receivedCurrency: taxService === TAX_SERVICES.KOINLY 
            ? this.formatKoinlyCurrency(event.data.receivedCurrency, nullMappings)
            : event.data.receivedCurrency,
          feeAmount: event.data.feeAmount,
          feeCurrency: taxService === TAX_SERVICES.KOINLY 
            ? this.formatKoinlyCurrency(event.data.feeCurrency, nullMappings)
            : event.data.feeCurrency,
          netWorthAmount: event.data.netWorthAmount || '',
          netWorthCurrency: event.data.netWorthCurrency || '',
          tag,
          description: event.data.description,
          txHash: event.original?.txHash || ''
        };

        // Map the fields to the correct order and format for the tax service
        return mapper.mapFields(data).map(cell => {
          if (cell && (cell.toString().includes(',') || cell.toString().includes('"'))) {
            return `"${cell.toString().replace(/"/g, '""')}"`;
          }
          return cell;
        });
      });

      // Create the CSV content with headers
      const csvContent = [
        mapper.getHeaders().join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hyperliquid_${taxService}_export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // For Koinly, also create the unsupported assets CSV if needed
      if (taxService === TAX_SERVICES.KOINLY && problematicAssets.hard.size > 0) {
        const unsupportedRows = timeline
          .filter(event => {
            const currencies = [
              event.data?.sentCurrency,
              event.data?.receivedCurrency,
              event.data?.feeCurrency
            ].filter(Boolean);
            return currencies.some(currency => getAssetWarningType(currency) === 'hard');
          })
          .map(event => {
            const tag = mapper.mapTag(event.data.internalTag);
            const data = {
              date: event.time,
              sentAmount: event.data.sentAmount,
              sentCurrency: this.formatKoinlyCurrency(event.data.sentCurrency, nullMappings),
              receivedAmount: event.data.receivedAmount,
              receivedCurrency: this.formatKoinlyCurrency(event.data.receivedCurrency, nullMappings),
              feeAmount: event.data.feeAmount,
              feeCurrency: this.formatKoinlyCurrency(event.data.feeCurrency, nullMappings),
              netWorthAmount: event.data.netWorthAmount || '',
              netWorthCurrency: event.data.netWorthCurrency || '',
              tag,
              description: event.data.description,
              txHash: event.original?.txHash || ''
            };
            return mapper.mapFields(data).map(cell => {
              if (cell && (cell.toString().includes(',') || cell.toString().includes('"'))) {
                return `"${cell.toString().replace(/"/g, '""')}"`;
              }
              return cell;
            });
          });

        const unsupportedCSV = [
          mapper.getHeaders().join(','),
          ...unsupportedRows.map(row => row.join(','))
        ].join('\n');

        const unsupportedBlob = new Blob([unsupportedCSV], { type: 'text/csv' });
        const unsupportedUrl = window.URL.createObjectURL(unsupportedBlob);
        const unsupportedA = document.createElement('a');
        unsupportedA.href = unsupportedUrl;
        unsupportedA.download = 'hyperliquid_transactions_koinly_unsupported_assets.csv';
        document.body.appendChild(unsupportedA);
        unsupportedA.click();
        document.body.removeChild(unsupportedA);
        window.URL.revokeObjectURL(unsupportedUrl);
      }

      // Store problematic assets in localStorage for the follow-up guide (Koinly only)
      if (taxService === TAX_SERVICES.KOINLY) {
        localStorage.setItem('koinlySoftWarningAssets', 
          JSON.stringify(Array.from(problematicAssets.soft)));
        localStorage.setItem('koinlyHardWarningAssets', 
          JSON.stringify(Array.from(problematicAssets.hard)));
      }

      return {
        success: true,
        ...(taxService === TAX_SERVICES.KOINLY && {
          softWarningAssets: Array.from(problematicAssets.soft),
          hardWarningAssets: Array.from(problematicAssets.hard),
          nullMappings
        })
      };
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw error;
    }
  }

  // Helper function for Koinly currency formatting
  static formatKoinlyCurrency(currency, nullMappings) {
    if (!currency) return '';
    const warningType = getAssetWarningType(currency);
    return warningType === 'hard' 
      ? nullMappings[currency]
      : formatCurrencyForKoinly(currency);
  }
}