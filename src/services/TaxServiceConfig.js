/**
 * Tax service configurations and mapping utilities
 * 
 * Awaken Tax Tag Documentation:
 * - Income: Airdrops, rewards, and mining income are taxed as income when received
 * - Transfers: Internal transfers between accounts are non-taxable
 * - Trading: Coin swaps/exchanges realize capital gain/loss on sent tokens
 * - Staking & LP: Staking deposits don't realize gains, rewards are income
 * - Loans: Lending deposits are treated as collateral, no gain/loss realized
 * - Other: Non-taxable transfers and fee expense deductions
 * 
 * For more details, see: https://help.awaken.tax/en/articles/10453755-how-do-i-label-my-transactions
 */

export const TAX_SERVICES = {
  KOINLY: 'koinly',
  AWAKEN: 'awaken'
};

// Field mappings for each tax service
const fieldMappings = {
  [TAX_SERVICES.KOINLY]: {
    // Maps internal field names to Koinly CSV column names
    date: 'Date',
    sentAmount: 'Sent Amount',
    sentCurrency: 'Sent Currency',
    receivedAmount: 'Received Amount',
    receivedCurrency: 'Received Currency',
    feeAmount: 'Fee Amount',
    feeCurrency: 'Fee Currency',
    netWorthAmount: 'Net Worth Amount',
    netWorthCurrency: 'Net Worth Currency',
    tag: 'Label',
    description: 'Description',
    txHash: 'TxHash'
  },
  [TAX_SERVICES.AWAKEN]: {
    // Maps internal field names to Awaken CSV column names
    date: 'Date',
    sentAmount: 'Sent Quantity',
    sentCurrency: 'Sent Currency',
    receivedAmount: 'Received Quantity',
    receivedCurrency: 'Received Currency',
    feeAmount: 'Fee Amount',
    feeCurrency: 'Fee Currency',
    netWorthAmount: 'Received Fiat Amount',
    tag: 'Tag',
    description: 'Notes',
    txHash: 'Transaction Hash'
  }
};

// Field order for each tax service
const fieldOrder = {
  [TAX_SERVICES.KOINLY]: [
    'date',
    'sentAmount',
    'sentCurrency',
    'receivedAmount',
    'receivedCurrency',
    'feeAmount',
    'feeCurrency',
    'netWorthAmount',
    'netWorthCurrency',
    'tag',
    'description',
    'txHash'
  ],
  [TAX_SERVICES.AWAKEN]: [
    'date',
    'receivedAmount',
    'receivedCurrency',
    'netWorthCurrency',
    'sentAmount',
    'sentCurrency',
    'netWorthAmount',
    'feeAmount',
    'feeCurrency',
    'txHash',
    'description',
    'tag'
  ]
};

export const taxServiceConfigs = {
  [TAX_SERVICES.KOINLY]: {
    name: 'Koinly',
    csvHeaders: [
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
    ],
    tagMappings: {
      // Trade tags
      'trade:spot': '',
      'trade:perp:open:fee': 'Futures Fee',
      'trade:perp:open:rebate': 'Realized Gain',
      'trade:perp:close': 'Realized Gain',
      
      // Funding tags
      'funding': 'Funding Fee',
      
      // Transfer tags
      'transfer:deposit': '',
      'transfer:withdrawal': '',
      'transfer:deposit:external': '',
      'transfer:withdrawal:external': '',
      'transfer:internal:perp_to_spot': '',
      'transfer:internal:spot_to_perp': '',
      'transfer:deposit:subaccount': '',
      'transfer:withdrawal:subaccount': '',
      'transfer:deposit:evm_to_spot': '',
      'transfer:withdrawal:spot_to_evm': '',
      'transfer:internal:unknown': '',
      'transfer:vault:deposit': 'Add to Pool',
      'transfer:vault:withdrawal': 'Remove from Pool',
      'transfer:open_interest_reward': 'Reward',
      'transfer:airdrop': 'Airdrop',
      
      // Staking tags
      'staking:reward': 'Reward',
      'staking:delegate': 'Add to Pool',
      'staking:undelegate': 'Remove from Pool',
      'staking:transfer:spot_to_staking': '',
      'staking:transfer:staking_to_spot': ''
    },
    guidePath: '/koinly-guide'
  },
  [TAX_SERVICES.AWAKEN]: {
    name: 'Awaken',
    csvHeaders: [
      'Date',
      'Received Quantity',
      'Received Currency',
      'Received Fiat Amount',
      'Sent Quantity',
      'Sent Currency',
      'Sent Fiat Amount',
      'Fee Amount',
      'Fee Currency',
      'Transaction Hash',
      'Notes',
      'Tag'
    ],
    tagMappings: {
      // Trade tags
      'trade:spot': 'swap',
      'trade:perp:open:fee': 'funding_payment',
      'trade:perp:open:rebate': 'funding_payment',
      'trade:perp:close': 'funding_payment',
      
      // Funding tags
      'funding': 'funding_payment',
      
      // Transfer tags
      'transfer:deposit': 'bridging',
      'transfer:withdrawal': 'bridging',
      'transfer:deposit:external': 'receive',
      'transfer:withdrawal:external': 'payment',
      'transfer:internal:perp_to_spot': 'internal_transfer',
      'transfer:internal:spot_to_perp': 'internal_transfer',
      'transfer:deposit:subaccount': 'receive',
      'transfer:withdrawal:subaccount': 'payment',
      'transfer:deposit:evm_to_spot': 'receive',
      'transfer:withdrawal:spot_to_evm': 'payment',
      'transfer:internal:unknown': 'internal_transfer',
      'transfer:vault:deposit': 'staking',
      'transfer:vault:withdrawal': 'unstaking',
      'transfer:open_interest_reward': 'rewards_income',
      'transfer:airdrop': 'airdrop',
      
      // Staking tags
      'staking:reward': 'claim_rewards',
      'staking:delegate': 'staking',
      'staking:undelegate': 'unstaking',
      'staking:transfer:spot_to_staking': 'internal_transfer',
      'staking:transfer:staking_to_spot': 'internal_transfer'
    },
    guidePath: '/awaken-guide'
  }
};

export class TagMapper {
  constructor(taxService) {
    this.config = taxServiceConfigs[taxService];
    if (!this.config) {
      throw new Error(`Unsupported tax service: ${taxService}`);
    }
    this.fieldMappings = fieldMappings[taxService];
    this.fieldOrder = fieldOrder[taxService];
  }

  mapTag(internalTag) {
    return this.config.tagMappings[internalTag] || '';
  }

  getHeaders() {
    return this.config.csvHeaders;
  }

  getGuidePath() {
    return this.config.guidePath;
  }

  /**
   * Maps internal data fields to tax service specific CSV fields
   * @param {Object} data - Internal data object with standard field names
   * @returns {Array} - Array of values in the correct order for the tax service
   */
  mapFields(data) {
    return this.fieldOrder.map(field => {
      const value = data[field];
      return value || '';
    });
  }
} 