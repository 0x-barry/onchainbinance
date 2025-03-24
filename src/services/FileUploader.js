import Papa from 'papaparse';

/**
 * Koinly Tag Mapping Documentation
 * -------------------------------
 * This documents how we map different transaction types to Koinly tags (or lack thereof).
 * Some transactions intentionally have no tags as per Koinly's documentation.
 * 
 * Trade History CSV:
 * - Spot Trades (Buy/Sell): No tag required
 * - Perpetual Trades:
 *   • Opening Position: "Futures Fee" or "Fee Refund"
 *   • Closing Position: "Realized Gain"
 * 
 * Deposits and Withdrawals CSV:
 * - Regular Deposits: No tag required
 * - Regular Withdrawals: No tag required
 * - Internal Transfers (perp.spot.transfer, sub.account.transfer, spot.perp.transfer):
 *   • No tag required
 *   • TODO: Consider excluding these from the timeline
 *     to allow proper matching and zero net impact in Koinly
 * - Vault Operations:
 *   • Deposits (create.vault.capitalize, vault.deposit): "Add to Pool"
 *   • Withdrawals (vault.distribution, vault.withdrawal): "Remove from Pool"
 * - Genesis Distribution: "Airdrop"
 * 
 * Funding History CSV:
 * - All funding payments (positive or negative): "Funding Fee"
 * 
 * Staking Rewards CSV:
 * - Staking Rewards: "Reward"
 * - Open Interest Rewards: "Reward"
 * 
 * Staking Actions CSV:
 * - Delegate: "Add to Pool"
 * - Undelegate: "Remove from Pool"
 * - Transfers to/from staking:
 *   • No tag required
 *   • TODO: Consider excluding these from the timeline
 *     to allow proper matching in Koinly
 * 
 * UI Display:
 * - Internal transfers (both staking and regular) are visually identified 
 *   in the UI as "Internal Transfer" regardless of their Koinly tag
 */

export class FileUploader {
  // Main Public Interface
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
            // Get date samples - up to 20 samples
            const dateSamples = results.data
              .slice(0, Math.min(20, results.data.length))
              .map(row => row.time)
              .filter(Boolean);
            
            if (dateSamples.length > 0) {
              // Detect and store the date format
              this.dateFormat = this.detectDateFormat(dateSamples);
              console.log(`Detected date format: ${this.dateFormat}`);
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
          event.display.sentCurrency,
          event.display.receivedCurrency,
          event.display.feeCurrency
        ].filter(Boolean);
        
        currencies.forEach(currency => {
          const warningType = getAssetWarningType(currency);
          if (warningType === 'soft') problematicAssets.soft.add(currency);
          if (warningType === 'hard') problematicAssets.hard.add(currency);
        });
      });

      // Create NULL mappings for hard warning assets
      const nullMappings = this.createNullMappings(Array.from(problematicAssets.hard));

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
            event.display.sentCurrency,
            event.display.receivedCurrency,
            event.display.feeCurrency
          ].filter(Boolean);
          
          return currencies.some(currency => 
            getAssetWarningType(currency) === 'hard'
          );
        })
        .map(event => this.createUnsupportedKoinlyRow(event, nullMappings));

      // Download the main CSV
      this.downloadCSV(headers, mainRows, 'hyperliquid_transactions_koinly.csv');
      
      // Download the unsupported assets CSV if there are any rows
      if (unsupportedRows.length > 0) {
        this.downloadCSV(headers, unsupportedRows, 'hyperliquid_transactions_koinly_unsupported_assets.csv');
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
      event.koinly.sentAmount,
      formatCurrencyForKoinly(event.koinly.sentCurrency),
      event.koinly.receivedAmount,
      formatCurrencyForKoinly(event.koinly.receivedCurrency),
      event.koinly.feeAmount,
      formatCurrencyForKoinly(event.koinly.feeCurrency),
      event.koinly.netWorthAmount || '',
      event.koinly.netWorthCurrency || '',
      event.koinly.tag,
      event.koinly.description,
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
    const formatCurrency = (displayCurrency, koinlyCurrency) => {
      if (!displayCurrency) return '';
      return getAssetWarningType(displayCurrency) === 'hard' 
        ? nullMappings[displayCurrency]
        : formatCurrencyForKoinly(koinlyCurrency);
    };
    
    return [
      event.time,
      event.koinly.sentAmount,
      formatCurrency(event.display.sentCurrency, event.koinly.sentCurrency),
      event.koinly.receivedAmount,
      formatCurrency(event.display.receivedCurrency, event.koinly.receivedCurrency),
      event.koinly.feeAmount,
      formatCurrency(event.display.feeCurrency, event.koinly.feeCurrency),
      event.koinly.netWorthAmount || '',
      event.koinly.netWorthCurrency || '',
      event.koinly.tag,
      event.koinly.description,
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
      const coinAddress = tokenData.tokenAddressMap[coin] || coin;
      const usdc = 'USDC';
      const usdcAddress = tokenData.tokenAddressMap[usdc] || usdc;
    
      let tag = '';
      let sentAmount = '';
      let sentCurrency = '';
      let sentCurrencyDisplay = '';
      let receivedAmount = '';
      let receivedCurrency = '';
      let receivedCurrencyDisplay = '';
      let feeAmount = '';
      let feeCurrency = '';
      let feeCurrencyDisplay = '';
      let description = isSpotDustConversion 
        ? `Spot dust conversion of ${size} ${coin} to ${pnl} USDC`
        : `${isSpot ? (isBuyOrOpen ? 'Buy' : 'Sell') : (isBuyOrOpen ? 'Open' : 'Close')} ${size} ${coin} at ${price} USDC per ${coin}`;
      const eventLabel = isSpot 
        ? `${isBuyOrOpen ? 'Buy' : 'Sell'} ${coin}`
        : `${isBuyOrOpen ? 'Open' : 'Close'} ${coin} ${direction.includes('long') ? 'Long' : 'Short'}`;
      
      // Spot trade logic
      if (isSpot) {
        if (isBuyOrOpen) {
          sentAmount = notional.toString();
          sentCurrency = usdcAddress;
          sentCurrencyDisplay = usdc;
          receivedAmount = size.toString();
          receivedCurrency = coinAddress;
          receivedCurrencyDisplay = coin;
          feeAmount = fee.toString(); // Fee is in coin for spot buys
          feeCurrency = coinAddress;
          feeCurrencyDisplay = coin;
        } else if (isSpotDustConversion) {
          sentAmount = size.toString();
          sentCurrency = coinAddress;
          sentCurrencyDisplay = coin;
          receivedAmount = pnl.toString(); // Likely 0 if spot was just burned
          receivedCurrency = usdcAddress;
          receivedCurrencyDisplay = usdc;
          feeAmount = '';
          feeCurrency = '';
          feeCurrencyDisplay = '';
        } else {
          sentAmount = size.toString();
          sentCurrency = coinAddress;
          sentCurrencyDisplay = coin;
          receivedAmount = notional.toString();
          receivedCurrency = usdcAddress;
          receivedCurrencyDisplay = usdc;
          feeAmount = fee.toString(); // Fee is in USDC for spot sells
          feeCurrency = usdcAddress;
          feeCurrencyDisplay = usdc;
        }
        // Perp`trade logic
      } else {
        if (isBuyOrOpen) {
          if (fee < 0) {
            // Fee rebate
            tag = 'Realized Gain';
            receivedAmount = Math.abs(fee).toString();
            receivedCurrency = usdcAddress;
            receivedCurrencyDisplay = usdc;
          } else if (fee > 0) {
            // Regular fee
            tag = 'Futures Fee';
            sentAmount = fee.toString();
            sentCurrency = usdcAddress;
            sentCurrencyDisplay = usdc;
          }
        } else {
          // Closing a position - handle PnL
          if (pnl > 0) {
            tag = 'Realized Gain';
            receivedAmount = pnl.toString();
            receivedCurrency = usdcAddress;
            receivedCurrencyDisplay = usdc;
          } else if (pnl < 0) {
            tag = 'Realized Gain';
            sentAmount = Math.abs(pnl).toString();
            sentCurrency = usdcAddress;
            sentCurrencyDisplay = usdc;
          }
          
        }
      }
      
      return {
        time: this.parseDate(trade.time).toISOString(),
        eventType: 'trade',
        type: isSpot ? 'spot' : 'perp', // Keep type for filtering
        
        koinly: {
          sentAmount,
          sentCurrency,
          receivedAmount,
          receivedCurrency,
          feeAmount,
          feeCurrency,
          tag,
          description
        },
        
        display: {
          sentAmount,
          sentCurrency: sentCurrencyDisplay,
          receivedAmount,
          receivedCurrency: receivedCurrencyDisplay,
          feeAmount,
          feeCurrency: feeCurrencyDisplay,
          eventLabel,
          description,
          pnl
        },
        
        details: {
          trade: {
            ...trade,  // Include all original fields
          }
        }
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
      const usdcAddress = tokenAddressMap[usdc] || usdc;
      
      const sentAmount = amount < 0 ? Math.abs(amount).toString() : '';
      const sentCurrency = amount < 0 ? usdcAddress : '';
      const sentCurrencyDisplay = usdc;
      const receivedAmount = amount > 0 ? amount.toString() : '';
      const receivedCurrency = amount > 0 ? usdcAddress : '';
      const receivedCurrencyDisplay = usdc;
      const feeAmount = '';
      const feeCurrency = '';
      const tag = 'Funding Fee';
      const eventLabel = 'Funding Fee';
      const description = `Funding payment for ${coin} position at rate ${rate}`;

      return {
        time: this.parseDate(payment.time).toISOString(),
        eventType: 'funding',
        
        koinly: {
          sentAmount,
          sentCurrency,
          receivedAmount,
          receivedCurrency,
          feeAmount,
          feeCurrency,
          tag,
          description
        },
        
        display: {
          sentAmount,
          sentCurrency: sentCurrencyDisplay,
          receivedAmount,
          receivedCurrency: receivedCurrencyDisplay,
          feeAmount,
          feeCurrency,
          eventLabel,
          description
        },
        
        details: {
          funding: {
            ...payment
          }
        }
      };
    });
  }

  static processDepositsAndWithdrawals(deposits, tokenAddressMap = {}) {
    if (!Array.isArray(deposits)) {
      throw new Error('Invalid deposits data format');
    }

    // TODO: For internal transfers (perp.spot.transfer, sub.account.transfer, spot.perp.transfer),
    // consider splitting these into separate transactions (send/receive) to allow proper matching
    // and zero net impact in Koinly

    return deposits.map(deposit => {
      const [amountStr, coin] = deposit.accountValueChange.split(' ');
      // Use Math.abs to ensure no negative values
      const amount = Math.abs(parseFloat(amountStr));
      const fee = Math.abs(parseFloat(deposit.fee || 0));
      const action = deposit.action.toLowerCase();
      const coinAddress = tokenAddressMap[coin] || coin;
      
      const isReceived = ['deposit', 'receive.spot', 'receive.usdc.perps.wallet', 'vault.distribution', 'vault.withdrawal','open.interest.reward', 'genesis.distribution','spot.perp.transfer'].includes(action);
      const isInternalTransfer = ['perp.spot.transfer', 'sub.account.transfer', 'spot.perp.transfer'].includes(action);
      
      const feeAmount = fee > 0 ? fee.toString() : '';
      const feeCurrency = fee > 0 ? coinAddress : '';
      const feeCurrencyDisplay = fee > 0 ? coin : '';

      const sentAmount = !isReceived ? amount.toString() : '';
      const sentCurrency = !isReceived ? coinAddress : '';
      const sentCurrencyDisplay = !isReceived ? coin : '';

      const receivedAmount = isReceived ? amount.toString() : '';
      const receivedCurrency = isReceived ? coinAddress : '';
      const receivedCurrencyDisplay = isReceived ? coin : '';

      // Get netWorthAmount and netWorthCurrency from the deposit if they exist
      const netWorthAmount = deposit.netWorthAmount || '';
      const netWorthCurrency = deposit.netWorthCurrency || '';

      let eventLabel = '';
      let tag = '';
      let description = '';
      if (action === 'deposit') {
        eventLabel = 'Bridge In';
        description = `Bridged in ${amount} ${coin}`;
      } else if (action === 'withdrawal') {
        eventLabel = 'Bridge Out';
        description = `Bridged out ${amount} ${coin}`;
      } else if (action === 'receive.spot') {
        eventLabel = coin === 'USDC' ? 'Receive USDC' : 'Receive Tokens';
        description = `Received ${amount} ${coin}`;
      } else if (action === 'receive.usdc.perps.wallet') {
        eventLabel = 'Receive USDC';
        description = `Received ${amount} ${coin}`;
      } else if (action === 'send.spot') {
        eventLabel = coin === 'USDC' ? 'Send USDC' : 'Send Tokens';
        description = `Sent ${amount} ${coin}`;
      } else if (action === 'send.usdc.perps.wallet') {
        eventLabel = 'Send USDC';
        description = `Sent ${amount} ${coin}`;
      } else if (['create.vault.capitalize', 'vault.deposit'].includes(action)) {
        eventLabel = 'Vault Deposit';
        description = `Deposited ${amount} ${coin} to unspecified vault [VAULT DEPOSIT]`;
      } else if (['vault.distribution', 'vault.withdrawal'].includes(action)) {
        eventLabel = 'Vault Withdrawal';
        description = `Withdrew ${amount} ${coin} from unspecified vault [VAULT WITHDRAWAL]`;
      } else if (action === 'perp.spot.transfer') {
        eventLabel = 'Intrawallet Transfer';
        description = `Transferred ${amount} ${coin} from Perpetual to Spot account [INTRAWALLET TRANSFER]`;
      } else if (action === 'sub.account.transfer') {
        eventLabel = 'Intrawallet Transfer';
        description = `Transferred ${amount} ${coin} between Subaccounts [INTRAWALLET TRANSFER]`;
      } else if (action === 'spot.perp.transfer') {
        eventLabel = 'Intrawallet Transfer';
        description = `Transferred ${amount} ${coin} from Spot to Perpetual account [INTRAWALLET TRANSFER]`;
      } else if (action === 'open.interest.reward') {
        eventLabel = 'Open Interest Reward';
        tag = 'Reward';
        description = `Received ${amount} ${coin} open interest reward`;
      } else if (action === 'genesis.distribution') {
        eventLabel = `${coin} Airdrop`;
        tag = 'Airdrop';
        description = `Received ${amount} ${coin} airdrop`;
      } else {
        eventLabel = 'Transfer';
        description = `Transferred ${amount} ${coin}`;
      }
      
      return {
        time: this.parseDate(deposit.time).toISOString(),
        eventType: 'transfer',
        isInternalTransfer,
        
        koinly: {
          sentAmount,
          sentCurrency,
          receivedAmount,
          receivedCurrency,
          feeAmount,
          feeCurrency,
          netWorthAmount,
          netWorthCurrency,
          tag,
          description
        },
        
        display: {
          sentAmount,
          sentCurrency: sentCurrencyDisplay,
          receivedAmount,
          receivedCurrency: receivedCurrencyDisplay,
          feeAmount,
          feeCurrency: feeCurrencyDisplay,
          netWorthAmount,
          netWorthCurrency,
          eventLabel, 
          description
        },
        
        details: {
          transfer: {
            ...deposit,
          }
        }
      };
    });
  }

  static processStakingRewards(stakingRewards, tokenAddressMap = {}) {
    if (!Array.isArray(stakingRewards)) {
      throw new Error('Invalid staking rewards data format');
    }

    // Create a flattened array with two transactions for each reward
    return stakingRewards.flatMap(reward => {
      const amount = parseFloat(reward.amount);
      const coin = 'HYPE';
      const coinAddress = tokenAddressMap[coin] || coin;
      const rewardTime = this.parseDate(reward.time);
      
      // First transaction: Receive the reward
      const rewardTransaction = {
        time: rewardTime.toISOString(),
        eventType: 'stakingReward',
        
        koinly: {
          sentAmount: '',
          sentCurrency: '',
          receivedAmount: amount.toString(),
          receivedCurrency: coinAddress,
          feeAmount: '',
          feeCurrency: '',
          tag: 'Reward',
          description: `Staking reward of ${amount} ${coin}`
        },
        
        display: {
          sentAmount: '',
          sentCurrency: '',
          receivedAmount: amount.toString(),
          receivedCurrency: coin,
          feeAmount: '',
          feeCurrency: '',
          eventLabel: 'Staking Reward',
          description: `Staking reward of ${amount} ${coin}`
        },
        
        details: {
          staking: {
            amount,
            source: reward.source || 'unknown'
          }
        }
      };
      
      // Second transaction: Auto-stake the reward (1 second later)
      const autoStakeTime = new Date(rewardTime.getTime() + 1000); // Add 1 second
      const autoStakeTransaction = {
        time: autoStakeTime.toISOString(),
        eventType: 'stakingAction',
        isInternalTransfer: false,
        
        koinly: {
          sentAmount: amount.toString(),
          sentCurrency: coinAddress,
          receivedAmount: '',
          receivedCurrency: '',
          feeAmount: '',
          feeCurrency: '',
          tag: 'Add to Pool',
          description: `Manual txn to account for auto-staking of ${amount} ${coin} reward [STAKE/DELEGATE]`
        },
        
        display: {
          sentAmount: amount.toString(),
          sentCurrency: coin,
          receivedAmount: '',
          receivedCurrency: '',
          feeAmount: '',
          feeCurrency: '',
          eventLabel: 'Auto-Stake Reward',
          description: `Manual txn to account for auto-staking of ${amount} ${coin} reward [STAKE/DELEGATE]`
        },
        
        details: {
          staking: {
            amount,
            source: 'auto-stake',
            originalReward: reward
          }
        }
      };
      
      // Return both transactions
      return [rewardTransaction, autoStakeTransaction];
    });
  }

  static processStakingActions(stakingActions, tokenAddressMap = {}) {
    if (!Array.isArray(stakingActions)) {
      throw new Error('Invalid staking actions data format');
    }

    // TODO: For staking transfers (deposit/withdrawal), consider splitting these into
    // separate transactions (send/receive) to allow proper matching in Koinly

    return stakingActions.map(action => {
      const amount = parseFloat(action.amount);
      const coin = 'HYPE';
      const coinAddress = tokenAddressMap[coin] || coin;
      const actionType = action.action.toLowerCase();
      const isInternalTransfer = ['deposit', 'withdrawal'].includes(actionType);

      const sentAmount = ['deposit', 'delegate'].includes(actionType) ? amount.toString() : '';
      const sentCurrency = ['deposit', 'delegate'].includes(actionType) ? coinAddress : '';
      const sentCurrencyDisplay = ['deposit', 'delegate'].includes(actionType) ? coin : '';
      const receivedAmount = ['withdrawal', 'undelegate'].includes(actionType) ? amount.toString() : '';
      const receivedCurrency = ['withdrawal', 'undelegate'].includes(actionType) ? coinAddress : '';
      const receivedCurrencyDisplay = ['withdrawal', 'undelegate'].includes(actionType) ? coin : '';
      const feeAmount = '';
      const feeCurrency = '';
      
      // Get event label using logic from getEventLabel
      let eventLabel = '';
      let tag = '';
      let description = '';
      if (actionType === 'delegate') {
        eventLabel = 'Stake HYPE';
        description = `Staked ${amount} ${coin} [STAKE/DELEGATE]`;
      } else if (actionType === 'undelegate') {
        eventLabel = 'Unstake HYPE';
        description = `Unstaked ${amount} ${coin} [UNSTAKE/UNDELEGATE]  `;
      } else if (actionType === 'deposit') {
        eventLabel = 'Transfer Spot to Staking';
        description = `Transferred ${amount} ${coin} from Spot to Staking [INTRAWALLET TRANSFER]`;
      } else if (actionType === 'withdrawal') {
        eventLabel = 'Transfer Staking to Spot';
        description = `Transferred ${amount} ${coin} from Staking to Spot [INTRAWALLET TRANSFER]`;
      }
      
      return {
        time: this.parseDate(action.time).toISOString(),
        eventType: 'stakingAction',
        isInternalTransfer,
        
        koinly: {
          sentAmount,
          sentCurrency,
          receivedAmount,
          receivedCurrency,
          feeAmount,
          feeCurrency,
          tag,
          description
        },
        
        display: {
          sentAmount,
          sentCurrency: sentCurrencyDisplay,
          receivedAmount,
          receivedCurrency: receivedCurrencyDisplay,
          feeAmount,
          feeCurrency,
          eventLabel,
          description
        },
        
        details: {
          staking: {
            ...action,
          }
        }
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
    // Initialize counters for each format
    let mmddCount = 0;
    let ddmmCount = 0;
    
    // Process each date in the sample
    for (const fullDateStr of dateSamples) {
      // Extract just the date part if it's in the format with time
      let dateStr = fullDateStr;
      if (fullDateStr.includes(' - ')) {
        dateStr = fullDateStr.split(' - ')[0];
      }
      
      // Skip if not in expected format with slashes
      if (!dateStr.includes('/')) continue;
      
      const parts = dateStr.split('/');
      if (parts.length !== 3) continue;
      
      const num1 = parseInt(parts[0], 10);
      const num2 = parseInt(parts[1], 10);
      
      // Check for unambiguous date formats
      if (num1 > 12 && num2 <= 12) {
        // First number > 12, must be DD/MM format
        ddmmCount++;
      } else if (num1 <= 12 && num2 > 12) {
        // Second number > 12, must be MM/DD format
        mmddCount++;
      }
      // Ambiguous dates don't contribute to either count
    }
    
    console.log(`Date format detection results: MM/DD count: ${mmddCount}, DD/MM count: ${ddmmCount}`);
    
    // Determine format based on which has more unambiguous examples
    if (ddmmCount > mmddCount) {
      return 'DD/MM/YYYY';
    } else if (mmddCount > ddmmCount) {
      return 'MM/DD/YYYY';
    } else {
      // If tied or no unambiguous dates found, return default
      console.log('Inconclusive date format detection, using MM/DD/YYYY as default');
      return 'MM/DD/YYYY';
    }
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
    if (!data || !data[0]) {
      throw new Error('No data to validate');
    }

    const headers = Object.keys(data[0]);
    const requiredColumns = {
      trades: ['time', 'dir', 'px', 'sz', 'fee', 'coin', 'ntl', 'closedPnl'],
      funding: ['time', 'payment', 'rate', 'coin', 'sz', 'side'],
      deposits: ['time', 'action', 'accountValueChange', 'fee'],
      stakingRewards: ['time', 'amount', 'source'],
      stakingActions: ['time', 'action', 'amount', 'validator']
    };

    const missingColumns = requiredColumns[fileType]?.filter(col => !headers.includes(col));
    
    if (missingColumns?.length > 0) {
      throw new Error(
        `Missing required columns for ${fileType}: ${missingColumns.join(', ')}\n` +
        `Found columns: ${headers.join(', ')}`
      );
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
        // [
        //   new Date().toISOString(), // Current date
        //   '', // Sent Amount
        //   '', // Sent Currency
        //   '1', // Received Amount
        //   address, // Full token address (e.g., PURR:address:HYPE)
        //   '', // Fee Amount
        //   '', // Fee Currency
        //   '', // Net Worth Amount
        //   '', // Net Worth Currency
        //   '', // Label
        //   `Test transaction for ${token} using full address`, // Description with token name
        //   '' // TxHash
        // ]
        // ,
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
}