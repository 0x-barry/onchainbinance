# Trading Data Processing Services

## FileUploader.js

Main service for processing trading data files and maintaining accurate position/balance tracking.

### Core Functions

#### Data Ingestion
- **parseCSVFile(file)**
  - Takes a CSV file and converts it to JSON using PapaParse
  - Entry point for raw data processing

- **parseDate(dateStr)**
  - Utility function to handle different date formats
  - Handles both ISO format (trades) and MM/DD/YYYY - HH:mm:ss format (deposits)

#### Trade Processing
- **processTrades(trades, spotTokenMap)**
  - First-pass processing of raw trade data
  - Validates required fields
  - Normalizes coin names
  - Categorizes trades as spot/perp and long/short
  - Returns processed trades for further aggregation

- **aggregateTrades(trades)**
  - Maintains a map of open positions
  - When a trade comes in:
    - If it's an "open" trade and there's an existing position, it aggregates with it
    - If it's a "close" trade, it matches against an open position
  - Returns both completed trades and any remaining open trades

#### Other Transaction Types
- **processFunding(funding)**
  - Processes funding payments data
  - Validates and normalizes funding payment records

- **processDepositsAndWithdrawals(deposits)**
  - Processes deposit/withdrawal records
  - Validates and normalizes transfer records

#### Data Storage and Timeline
- **storeProcessedData(processedTrades, fundingData, depositsData)**
  - Main orchestration function
  - Clears existing localStorage
  - Gets spot token map
  - Creates chronological timeline of all events
  - Processes events in order to maintain accurate balances
  - Stores final results in localStorage

### Planned Features

#### Tax Reporting
- Process timeline to generate tax reports
- Calculate cost basis for spot trades
- Track wash sales
- Generate CSV files for tax software import

#### Position Tracking
- Improve balance tracking accuracy
- Add support for additional transaction types
- Enhanced error detection for impossible states

#### Data Validation
- Add schema validation for input files
- Improve error messaging
- Add support for different file formats

## Usage

```javascript
// Example usage of FileUploader service
const fileUploader = new FileUploader();

// Process CSV files
const trades = await fileUploader.parseCSVFile(tradesFile);
const funding = await fileUploader.parseCSVFile(fundingFile);
const deposits = await fileUploader.parseCSVFile(depositsFile);

// Store and process all data
await fileUploader.storeProcessedData(trades, funding, deposits);
```

## Data Flow

1. User uploads CSV files
2. Files are parsed into JSON
3. Each transaction type is processed and normalized
4. All events are combined into a chronological timeline
5. Timeline is processed to maintain accurate balances and positions
6. Results are stored in localStorage for use by the UI

## Error Handling

- All functions include error validation
- Console warnings for suspicious states
- Error throwing for invalid data
- User-friendly error messages for UI display