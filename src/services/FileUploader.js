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
 *   • TODO: Consider splitting these into separate transactions (send/receive)
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
 *   • TODO: Consider splitting these into separate transactions (send/receive)
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

      console.log(`Starting to parse file: ${file.name}`);

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
          
          if (fileType) {
            try {
              this.validateCSVFormat(results.data, fileType);
              console.log(`${file.name} validated as ${fileType} format`);
            } catch (validationError) {
              console.error(`Validation error for ${file.name}:`, validationError.message);
              console.log(`First 3 rows of ${file.name}:`, results.data.slice(0, 3));
              console.warn(`Continuing with processing despite validation errors in ${file.name}`);
            }
          } else {
            console.warn(`Unknown file type for ${file.name}, skipping validation`);
          }
          
          console.log(`First 3 rows of ${file.name}:`, results.data.slice(0, 3));
          resolve(results.data);
        },
        error: (error) => {
          console.error(`Error parsing ${file.name}:`, error);
          reject(new Error(`Failed to read file: ${error.message}`));
        }
      });
    });
  }

  static async storeProcessedData(processedTrades, fundingData, depositsData, stakingRewards = [], stakingActions = []) {
    // Get token data
    const tokenData = await this.getSpotTokenMap();
    
    // Process all data types and create timeline
    const timeline = [
        ...this.processDepositsAndWithdrawals(depositsData, tokenData.tokenAddressMap).map(deposit => ({ ...deposit, eventType: 'transfer' })),
        ...this.processTrades(processedTrades, tokenData).map(trade => ({ ...trade, eventType: 'trade' })),
        ...this.processFunding(fundingData, tokenData.tokenAddressMap).map(funding => ({ ...funding, eventType: 'funding' })),
        ...this.processStakingRewards(stakingRewards, tokenData.tokenAddressMap).map(reward => ({ ...reward, eventType: 'stakingReward' })),
        ...this.processStakingActions(stakingActions, tokenData.tokenAddressMap).map(action => ({ ...action, eventType: 'stakingAction' }))
    ].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Format transaction details for each event
    // const formattedTimeline = timeline.map(event => ({
    //     ...this.minimizeEventData(event),
    //     formattedDetails: this.formatTransactionDetails(event)
    // }));
    
    // Store only token address map for Koinly export
    localStorage.setItem('tokenAddressMap', JSON.stringify(tokenData.tokenAddressMap));
    
    // Return the formatted timeline directly
    return { timeline };
  }

  static downloadKoinlyCSV() {
    try {
      const csvContent = this.exportToKoinlyCSV();
      
      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Create a download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Set link properties
      link.setAttribute('href', url);
      link.setAttribute('download', 'hyperliquid_transactions_koinly.csv');
      link.style.visibility = 'hidden';
      
      // Add to document, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Koinly CSV file download initiated');
    } catch (error) {
      console.error('Error downloading Koinly CSV:', error);
      throw error;
    }
  }

  // Primary Data Processing
  static processTrades(trades, tokenData) {
    if (!Array.isArray(trades)) {
      throw new Error('Invalid trades data format');
    }

    return trades.map(trade => {
      const dir = trade.dir.toLowerCase();
      const isSpot = dir.includes('buy') || dir.includes('sell');
      const isBuyOrOpen = dir.includes('buy') || dir.includes('open');
      const direction = dir.includes('long') ? 'Long' : 'Short';
      const price = parseFloat(trade.px);
      const size = parseFloat(trade.sz);
      const fee = parseFloat(trade.fee);
      const pnl = parseFloat(trade.closedPnl || 0);
      const notional = parseFloat(trade.ntl);
      
      const coin = this.normalizeCoinName(trade.coin, tokenData);
      const coinAddress = tokenData.tokenAddressMap[coin] || coin;
      
      let tag = '';
      let sentAmount = '';
      let sentCurrency = '';
      let receivedAmount = '';
      let receivedCurrency = '';
      let feeAmount = '';
      let feeCurrency = '';
      
      if (isSpot) {
        // Spot trade logic remains the same
        if (isBuyOrOpen) {
          sentAmount = notional.toString();
          sentCurrency = coinAddress;
          receivedAmount = size.toString();
          receivedCurrency = coinAddress;
          feeAmount = fee.toString(); // Fee is in coin for spot buys
          feeCurrency = coinAddress;
        } else {
          sentAmount = size.toString();
          sentCurrency = coinAddress;
          receivedAmount = notional.toString();
          receivedCurrency = coinAddress;
          feeAmount = fee.toString(); // Fee is in USDC for spot sells
          feeCurrency = 'USDC';
        }
      } else {
        // Perp trade logic
        if (isBuyOrOpen) {
          // Fee is included in sent/received amounts
          feeAmount = '';
          feeCurrency = '';
          if (fee < 0) {
            // Fee rebate
            tag = 'Fee Refund';
            receivedAmount = Math.abs(fee).toString();
            receivedCurrency = coinAddress;
          } else if (fee > 0) {
            // Regular fee
            tag = 'Futures Fee';
            sentAmount = fee.toString();
            sentCurrency = coinAddress;
          }
        } else {
          // Closing a position - handle PnL
          if (pnl > 0) {
            tag = 'Realized Gain';
            receivedAmount = pnl.toString();
            receivedCurrency = coinAddress;
          } else if (pnl < 0) {
            tag = 'Realized Gain';
            sentAmount = Math.abs(pnl).toString();
            sentCurrency = coinAddress;
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
          description: `${isSpot ? (isBuyOrOpen ? 'Buy' : 'Sell') : (isBuyOrOpen ? 'Open' : 'Close')} ${size} ${coin} at ${price} USDC per ${coin}`
        },
        
        display: {
          sentAmount: sentAmount ? parseFloat(sentAmount).toFixed(4) : '',
          sentCurrency: coin,
          receivedAmount: receivedAmount ? parseFloat(receivedAmount).toFixed(4) : '',
          receivedCurrency: coin,
          feeAmount: feeAmount ? parseFloat(feeAmount).toFixed(4) : '',
          feeCurrency: isSpot && isBuyOrOpen ? coin : 'USDC',
          category: isSpot ? 
            `${isBuyOrOpen ? 'Buy' : 'Sell'} ${coin}` : 
            `${isBuyOrOpen ? 'Open' : 'Close'} ${coin} ${direction}`,
          description: `${isSpot ? (isBuyOrOpen ? 'Buy' : 'Sell') : (isBuyOrOpen ? 'Open' : 'Close')} ${size} ${coin} at ${price} USDC per ${coin}`,
          pnl: pnl.toFixed(4)
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
      const size = parseFloat(payment.sz);
      const rate = parseFloat(payment.rate);
      const coin = payment.coin;
      const usdcAddress = tokenAddressMap['USDC'] || 'USDC';
      
      return {
        time: this.parseDate(payment.time).toISOString(),
        eventType: 'funding',
        
        koinly: {
          sentAmount: amount < 0 ? Math.abs(amount).toString() : '',
          sentCurrency: amount < 0 ? usdcAddress : '',
          receivedAmount: amount > 0 ? amount.toString() : '',
          receivedCurrency: amount > 0 ? usdcAddress : '',
          feeAmount: '',
          feeCurrency: '',
          tag: 'Funding Fee',
          description: `Funding payment for ${coin} position at rate ${rate}`
        },
        
        display: {
          sentAmount: amount < 0 ? Math.abs(amount).toFixed(4) : '',
          sentCurrency: 'USDC',
          receivedAmount: amount > 0 ? amount.toFixed(4) : '',
          receivedCurrency: 'USDC',
          feeAmount: '',
          feeCurrency: '',
          category: 'Funding Payment',
          description: `Funding ${amount > 0 ? 'received' : 'paid'} for ${coin} position`
        },
        
        details: {
          funding: {
            coin,
            rate,
            side: payment.side,
            size,
            amount
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
      const amount = parseFloat(amountStr);
      const fee = parseFloat(deposit.fee || 0);
      const action = deposit.action.toLowerCase();
      const coinAddress = tokenAddressMap[coin] || coin;
      
      const isDeposit = ['deposit', 'receive.spot', 'receive.usdc.perps.wallet'].includes(action);
      const isVaultOperation = ['create.vault.capitalize', 'vault.deposit', 'vault.distribution', 'vault.withdrawal'].includes(action);
      const isInternalTransfer = ['perp.spot.transfer', 'sub.account.transfer', 'spot.perp.transfer'].includes(action);
      
      let koinlyTag = '';
      if (isVaultOperation) {
        koinlyTag = ['create.vault.capitalize', 'vault.deposit'].includes(action) ? 'Add to Pool' : 'Remove from Pool';
      } else if (action === 'genesis.distribution') {
        koinlyTag = 'Airdrop';
      }
      
      return {
        time: this.parseDate(deposit.time).toISOString(),
        eventType: 'transfer',
        
        koinly: {
          sentAmount: !isDeposit ? amount.toString() : '',
          sentCurrency: !isDeposit ? coinAddress : '',
          receivedAmount: isDeposit ? amount.toString() : '',
          receivedCurrency: isDeposit ? coinAddress : '',
          feeAmount: fee > 0 ? fee.toString() : '',
          feeCurrency: fee > 0 ? coinAddress : '',
          tag: koinlyTag,
          description: `${isDeposit ? 'Deposit' : 'Withdrawal'} of ${amount} ${coin}`
        },
        
        display: {
          sentAmount: !isDeposit ? amount.toFixed(4) : '',
          sentCurrency: coin,
          receivedAmount: isDeposit ? amount.toFixed(4) : '',
          receivedCurrency: coin,
          feeAmount: fee > 0 ? fee.toFixed(4) : '',
          feeCurrency: coin,
          category: isInternalTransfer ? 'Internal Transfer' : (isVaultOperation ? 'Vault Operation' : (isDeposit ? 'Deposit' : 'Withdrawal')),
          description: `${isDeposit ? 'Deposit' : 'Withdrawal'} of ${amount} ${coin}`
        },
        
        details: {
          transfer: {
            action,
            coin,
            amount,
            fee,
            isInternalTransfer
          }
        }
      };
    });
  }

  static processStakingRewards(stakingRewards, tokenAddressMap = {}) {
    if (!Array.isArray(stakingRewards)) {
      throw new Error('Invalid staking rewards data format');
    }

    return stakingRewards.map(reward => {
      const amount = parseFloat(reward.amount);
      const coin = 'HYPE';
      const coinAddress = tokenAddressMap[coin] || coin;
      
      return {
        time: this.parseDate(new Date(parseInt(reward.time))).toISOString(),
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
          receivedAmount: amount.toFixed(4),
          receivedCurrency: coin,
          feeAmount: '',
          feeCurrency: '',
          category: 'Staking Reward',
          description: `Received ${amount} ${coin} staking reward`
        },
        
        details: {
          staking: {
            amount,
            source: reward.source || 'unknown'
          }
        }
      };
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
      const isStake = actionType === 'delegate';
      const isTransfer = ['deposit', 'withdrawal'].includes(actionType);
      
      let koinlyTag = '';
      if (!isTransfer) {
        koinlyTag = isStake ? 'Add to Pool' : 'Remove from Pool';
      }
      
      return {
        time: this.parseDate(new Date(parseInt(action.time))).toISOString(),
        eventType: 'stakingAction',
        
        koinly: {
          sentAmount: isStake || (isTransfer && actionType === 'deposit') ? amount.toString() : '',
          sentCurrency: isStake || (isTransfer && actionType === 'deposit') ? coinAddress : '',
          receivedAmount: !isStake || (isTransfer && actionType === 'withdrawal') ? amount.toString() : '',
          receivedCurrency: !isStake || (isTransfer && actionType === 'withdrawal') ? coinAddress : '',
          feeAmount: '',
          feeCurrency: '',
          tag: koinlyTag,
          description: `${isStake ? 'Staked' : 'Unstaked'} ${amount} ${coin}`
        },
        
        display: {
          sentAmount: isStake || (isTransfer && actionType === 'deposit') ? amount.toFixed(4) : '',
          sentCurrency: coin,
          receivedAmount: !isStake || (isTransfer && actionType === 'withdrawal') ? amount.toFixed(4) : '',
          receivedCurrency: coin,
          feeAmount: '',
          feeCurrency: '',
          category: isTransfer ? 'Internal Transfer' : (isStake ? 'Stake HYPE' : 'Unstake HYPE'),
          description: `${isStake ? 'Staked' : 'Unstaked'} ${amount} ${coin}`
        },
        
        details: {
          staking: {
            action: actionType,
            validator: action.validator,
            amount,
            isInternalTransfer: isTransfer
          }
        }
      };
    });
  }

  // Helper Functions
  static normalizeCoinName(coin, tokenData) {
    const { pairToTokenMap } = tokenData || { pairToTokenMap: {} };
    if (coin === 'PURR/USDC') return 'PURR';
    if (pairToTokenMap[coin]) return pairToTokenMap[coin];
    return coin;
  }

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

      // Handle timestamp format (e.g., '1740950869326')
      if (/^\d{13}$/.test(dateStr)) {
        return new Date(parseInt(dateStr));
      }

      // Handle date-time format (e.g., '11/1/2023 - 12:00:37')
      if (dateStr.includes(' - ')) {
        const [datePart, timePart] = dateStr.split(' - ');
        const [month, day, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        
        // Create date in UTC to avoid timezone issues
        return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
      }

      throw new Error(`Unrecognized date format: ${dateStr}`);
    } catch (error) {
      console.error(`Date parsing error for "${dateStr}":`, error);
      throw new Error(`Failed to parse date: ${dateStr}`);
    }
  }

  static getCategoryLabel(event) {
    switch (event.eventType) {
      case 'trade': {
        if (event.type === 'spot') {
          return `${event.dir.toLowerCase().includes('buy') ? 'Buy' : 'Sell'} ${event.coin}`;
        } else {
          const direction = event.direction || (event.dir.toLowerCase().includes('long') ? 'Long' : 'Short');
          const isOpen = event.dir.toLowerCase().includes('open');
          return `${isOpen ? 'Open' : 'Close'} ${event.coin} ${direction}`;
        }
      }
      case 'transfer': {
        const action = event.action?.toLowerCase() || '';
        if (['deposit', 'receive.spot', 'receive.usdc.perps.wallet'].includes(action)) {
          return 'Deposit';
        }
        if (['withdrawal', 'send.spot', 'send.usdc.perps.wallet'].includes(action)) {
          return 'Withdrawal';
        }
        if (['create.vault.capitalize', 'vault.deposit'].includes(action)) {
          return 'Vault Deposit';
        }
        if (['vault.distribution', 'vault.withdrawal'].includes(action)) {
          return 'Vault Withdrawal';
        }
        if (['perp.spot.transfer', 'sub.account.transfer', 'spot.perp.transfer'].includes(action)) {
          return 'Internal Transfer';
        }
        if (action === 'open.interest.reward') {
          return 'Reward';
        }
        if (action === 'genesis.distribution') {
          return 'Airdrop';
        }
        return 'Transfer';
      }
      case 'funding':
        return 'Funding';
      case 'stakingReward':
        return 'Staking Reward';
      case 'stakingAction': {
        const action = event.action?.toLowerCase() || '';
        if (action === 'delegate') {
          return 'Staking';
        } else if (action === 'undelegate') {
          return 'Unstaking';
        } else if (action === 'deposit') {
          return 'Spot to Staking Transfer';
        } else if (action === 'withdrawal') {
          return 'Staking to Spot Transfer';
        }
        return 'Staking Action';
      }
      default:
        return 'Other';
    }
  }

  /**
   * Clears processed data from localStorage
   * @param {boolean} clearRawData - Whether to also clear raw data
   */
  static clearProcessedData(clearRawData = false) {
    console.log('Clearing processed data from localStorage');
    
    // Clear only essential items
    localStorage.removeItem('tokenAddressMap');
    
    // Optionally clear raw data
    if (clearRawData) {
        localStorage.removeItem('rawTradeData');
        localStorage.removeItem('rawFundingData');
        localStorage.removeItem('rawDepositsData');
        localStorage.removeItem('rawStakingRewardsData');
        localStorage.removeItem('rawStakingActionsData');
    }
  }

  // Transaction Formatting & Export
  // static formatTransactionDetails(event) {
  //   try {
  //     // Helper function to extract display name from token address
  //     const getDisplayName = (tokenAddress) => {
  //       return tokenAddress?.split(':')[0] || tokenAddress;
  //     };

  //     switch (event.eventType) {
  //       case 'trade': {
  //         const isSpot = event.type === 'spot';
  //         const isBuyOrOpen = event.dir.toLowerCase().includes('buy') || event.dir.toLowerCase().includes('open');
  //         const price = event.price || event.px;
  //         const size = event.size || event.sz;
  //         const fees = event.fees || event.fee || 0;
  //         const pnl = event.pnl || event.closedPnl || 0;
  //         const direction = event.dir.toLowerCase().includes('long') ? 'Long' : 'Short';
          
  //         // Store both full address and display versions
  //         const coinAddress = event.coinWithAddress;
  //         const coinDisplay = getDisplayName(event.coinWithAddress);
  //         const usdcAddress = 'USDC:0x6d1e7cde53ba9467b783cb7c530ce054:HYPE';
          
  //         let description = '';
  //         if (isSpot) {
  //           description = `${isBuyOrOpen ? 'Buy' : 'Sell'} ${size} ${coinDisplay} for ${(price * size).toFixed(6)} USDC at ${price.toFixed(4)} USDC/coin`;
  //         } else {
  //           if (isBuyOrOpen) {
  //             description = `Open ${direction} ${size} ${coinDisplay} position at ${price.toFixed(4)} USDC/coin`;
  //           } else {
  //             description = `Close ${direction} ${size} ${coinDisplay} position with ${pnl > 0 ? 'profit' : 'loss'} of ${Math.abs(pnl).toFixed(5)} USDC`;
  //           }
  //         }
          
  //         let tag = 'Trade';
  //         if (!isSpot) {
  //           if (isBuyOrOpen) {
  //             tag = 'Margin Fee';
  //           } else {
  //             tag = pnl > 0 ? 'Realized Profit' : 'Margin Fee';
  //           }
  //         }
          
  //         let sent = '', received = '';
  //         let sentDisplay = '', receivedDisplay = '';
  //         let gain = 0;
          
  //         if (isSpot) {
  //           if (isBuyOrOpen) {
  //             sent = `${(price * size).toFixed(2)} ${usdcAddress}`;
  //             sentDisplay = `${(price * size).toFixed(2)} USDC`;
  //             received = `${size.toFixed(2)} ${coinAddress}`;
  //             receivedDisplay = `${size.toFixed(2)} ${coinDisplay}`;
  //             gain = -fees;
  //           } else {
  //             sent = `${size.toFixed(2)} ${coinAddress}`;
  //             sentDisplay = `${size.toFixed(2)} ${coinDisplay}`;
  //             received = `${(price * size).toFixed(2)} ${usdcAddress}`;
  //             receivedDisplay = `${(price * size).toFixed(2)} USDC`;
  //             gain = (price * size) - fees;
  //           }
  //         } else {
  //           if (isBuyOrOpen) {
  //             sent = `${fees.toFixed(2)} ${usdcAddress}`;
  //             sentDisplay = `${fees.toFixed(2)} USDC`;
  //             received = '';
  //             receivedDisplay = '';
  //             gain = -fees;
  //           } else {
  //             if (pnl > 0) {
  //               sent = '';
  //               sentDisplay = '';
  //               received = `${pnl.toFixed(2)} ${usdcAddress}`;
  //               receivedDisplay = `${pnl.toFixed(2)} USDC`;
  //               gain = pnl - fees;
  //             } else {
  //               sent = `${Math.abs(pnl).toFixed(2)} ${usdcAddress}`;
  //               sentDisplay = `${Math.abs(pnl).toFixed(2)} USDC`;
  //               received = '';
  //               receivedDisplay = '';
  //               gain = pnl - fees;
  //             }
  //           }
  //         }
          
  //         return {
  //           description,
  //           tag,
  //           sent,
  //           sentDisplay,
  //           received,
  //           receivedDisplay,
  //           fee: fees > 0 ? `${fees.toFixed(2)} ${usdcAddress}` : '-',
  //           feeDisplay: fees > 0 ? `${fees.toFixed(2)} USDC` : '-',
  //           gain: gain.toFixed(2),
  //           categoryLabel: this.getCategoryLabel(event)
  //         };
  //       }
        
  //       case 'transfer': {
  //         const amount = event.amount;
  //         const coin = event.coinWithAddress || event.coin;
  //         const displayCoin = getDisplayName(coin);
  //         const action = event.action?.toLowerCase() || '';
          
  //         let tag = '';
  //         let description = '';
  //         let sent = '', received = '';
  //         let sentDisplay = '', receivedDisplay = '';
  //         let gain = 0;
          
  //         if (['deposit', 'receive.spot', 'receive.usdc.perps.wallet'].includes(action)) {
  //           tag = 'Deposit';
  //           description = `Deposit ${amount} ${displayCoin} to Hyperliquid`;
  //           received = `${amount} ${coin}`;
  //           receivedDisplay = `${amount} ${displayCoin}`;
  //         } 
  //         else if (['withdrawal', 'send.spot', 'send.usdc.perps.wallet'].includes(action)) {
  //           tag = 'Withdrawal';
  //           description = `Withdrawal ${amount} ${displayCoin} from Hyperliquid`;
  //           sent = `${amount} ${coin}`;
  //           sentDisplay = `${amount} ${displayCoin}`;
  //         }
  //         else if (['create.vault.capitalize', 'vault.deposit'].includes(action)) {
  //           tag = 'Vault Deposit';
  //           description = `${action === 'create.vault.capitalize' ? 'Create vault with' : 'Deposit to vault'} ${amount} ${displayCoin}`;
  //           sent = `${amount} ${coin}`;
  //           sentDisplay = `${amount} ${coin}`;
  //         }
  //         else if (['vault.distribution', 'vault.withdrawal'].includes(action)) {
  //           tag = 'Vault Withdrawal';
  //           description = `${action === 'vault.distribution' ? 'Distribution from vault' : 'Withdrawal from vault'} ${amount} ${displayCoin}`;
  //           received = `${amount} ${coin}`;
  //           receivedDisplay = `${amount} ${coin}`;
  //         }
  //         else if (['perp.spot.transfer', 'sub.account.transfer', 'spot.perp.transfer'].includes(action)) {
  //           tag = 'Internal Transfer';
  //           if (action === 'perp.spot.transfer') {
  //             description = `Transfer from Perp to Spot account: ${amount} ${displayCoin}`;
  //           } else if (action === 'spot.perp.transfer') {
  //             description = `Transfer from Spot to Perp account: ${amount} ${displayCoin}`;
  //           } else {
  //             description = `Transfer to/from sub account: ${amount} ${displayCoin}`;
  //           }
  //           // For internal transfers, we show both sent and received to indicate the movement
  //           sent = `${amount} ${coin}`;
  //           sentDisplay = `${amount} ${coin}`;
  //           received = `${amount} ${coin}`;
  //           receivedDisplay = `${amount} ${coin}`;
  //         }
          
  //         return {
  //           description,
  //           tag,
  //           sent,
  //           sentDisplay,
  //           received,
  //           receivedDisplay,
  //           fee: '',
  //           feeDisplay: '',
  //           gain: '',
  //           categoryLabel: this.getCategoryLabel(event)
  //         };
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error formatting transaction details:', error);
  //     return {
  //       description: '',
  //       tag: '',
  //       sent: '',
  //       sentDisplay: '',
  //       received: '',
  //       receivedDisplay: '',
  //       fee: '',
  //       feeDisplay: '',
  //       gain: '',
  //       categoryLabel: ''
  //     };
  //   }
  // }

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

      console.log('Token address map:', tokenAddressMap);
      
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
}