import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../../services/FileUploader';
import hlAnimatedGif from '../../images/hl-animated.gif';
import StandardTable from '../UI/StandardTable';
import WizardNavigation, { WizardButton, RightArrowIcon } from '../UI/WizardNavigation';
import { TAX_SERVICES, taxServiceConfigs } from '../../services/TaxServiceConfig';

// Styled components for the animated logo and eyebrow
const AnimatedLogo = styled.img`
  width: 25px;
  height: auto;
  margin-bottom: 0.5rem;
  display: block;
  margin-left: auto;
  margin-right: auto;
`;

const Title = styled.h1`
  font-size: 2.25rem;
  margin-bottom: 3rem;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

// Keep only the styled components that are being used
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  padding-bottom: 5rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  color: ${props => props.theme.colors.text.primary};
  font-family: ${props => props.theme.fonts.body};
  
  @media (min-width: 768px) {
    padding: 2rem;
    padding-bottom: 5rem;
  }
`;

const DateCell = styled.div`
  .date {
    font-weight: ${props => props.theme.fontWeights.bold};
    font-size: 0.9rem;
  }
  .time {
    color: ${props => props.theme.colors.text.secondary};
    font-size: 0.8rem;
  }
`;

const LabelTag = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  width: 100%; /* Ensure it takes full width of the cell */
  
  .eventLabel {
    font-weight: ${props => props.theme.fontWeights.bold};
    font-size: 0.9rem;
    color: ${props => props.theme.colors.primary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .tag {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: ${props => props.theme.borderRadius.small};
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text.secondary};
    display: inline-block;
    max-width: fit-content;
  }
`;

const TransactionRow = styled.tr`
  cursor: pointer;
  background-color: ${props => props.$isInternalTransfer ? props.theme.colors.secondary : 'transparent'};
  opacity: ${props => props.$isInternalTransfer ? 0.7 : 1};
  
  &:hover {
    background-color: ${props => props.$isInternalTransfer ? props.theme.colors.secondary : props.theme.colors.secondary};
    opacity: ${props => props.$isInternalTransfer ? 0.9 : 0.7};
  }
`;

const DescriptionRow = styled.tr`
  background-color: ${props => props.theme.colors.secondary};
  opacity: 0.5;
  
  td {
    padding: 0.75rem;
    font-size: 0.8rem;
    color: ${props => props.theme.colors.text.secondary};
    font-family: ${props => props.theme.fonts.body};
  }

  td:first-child {
    width: 15%; /* Match the width of the date column */
  }

  .description {
    margin-bottom: 0.5rem;
  }

  .raw-data {
    font-family: monospace;
    font-size: 0.75rem;
    padding: 0.5rem;
    background-color: ${props => props.theme.colors.background};
    border-radius: ${props => props.theme.borderRadius.small};
    white-space: pre-wrap;
    overflow-x: auto;
  }
`;

const ErrorMessage = styled.div`
  color: ${props => props.theme.colors.error};
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(234, 57, 67, 0.1);
  border-radius: ${props => props.theme.borderRadius.small};
  font-family: ${props => props.theme.fonts.body};
`;

const TaxServiceSelect = styled.select`
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  font-family: ${props => props.theme.fonts.body};
  margin-right: 1rem;
  cursor: pointer;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const Summary = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterConfig, setFilterConfig] = useState({
    coin: '',
    startDate: '',
    endDate: '',
    internalTag: ''
  });
  const itemsPerPage = 25;
  const [sortConfig, setSortConfig] = useState({
    key: 'time',
    direction: 'desc'
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [availableCoins, setAvailableCoins] = useState([]);
  const [selectedTaxService, setSelectedTaxService] = useState(TAX_SERVICES.KOINLY);

  // Add a ref to track if we're already processing
  const isProcessingRef = React.useRef(false);

  const processData = useCallback(async () => {
    // Guard against concurrent processing
    if (isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      // Get raw data from localStorage
      const rawTrades = localStorage.getItem('rawTradeData');
      const rawFunding = localStorage.getItem('rawFundingData');
      const rawDeposits = localStorage.getItem('rawDepositsData');
      const rawStakingRewards = localStorage.getItem('rawStakingRewardsData');
      const rawStakingActions = localStorage.getItem('rawStakingActionsData');

      if (!rawTrades || !rawFunding || !rawDeposits) {
        const error = 'No raw data found. Please upload files again.';
        console.error(error);
        setError(error);
        setIsLoading(false);
        navigate('/tax');
        return;
      }

      // Process the raw data
      const result = await FileUploader.processData(
        JSON.parse(rawTrades),
        JSON.parse(rawFunding),
        JSON.parse(rawDeposits),
        rawStakingRewards ? JSON.parse(rawStakingRewards) : [],
        rawStakingActions ? JSON.parse(rawStakingActions) : []
      );
      
      // Set timeline directly in state
      setTimeline(result.timeline);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in processData:', error);
      setError(`Error processing data: ${error.message}`);
      setIsLoading(false);
    } finally {
      isProcessingRef.current = false;
    }
  }, [navigate]);

  useEffect(() => {
    processData();
  }, [processData]);

  useEffect(() => {
    // Extract unique coins from timeline
    const coins = new Set();
    timeline.forEach(event => {
      // Check all possible locations for coin information
      [
        event.data.sentCurrency,
        event.data.receivedCurrency,
        event.data.feeCurrency,
      ].forEach(coin => {
        if (coin) coins.add(coin);
      });
    });
    setAvailableCoins(Array.from(coins).sort());
  }, [timeline]);

  const handleStartOver = () => {    // Navigate to upload page
    navigate('/tax');
  };

  const filteredTimeline = timeline.filter(event => {
    if (filterConfig.coin) {
      // Extract coin information from various places in the event object
      const eventCoins = [
        event.data.sentCurrency,
        event.data.receivedCurrency,
        event.data.feeCurrency,
        event.original?.coin,
        event.original?.asset
      ].filter(Boolean);
      
      // Check if any of the coins match the filter
      if (!eventCoins.some(coin => 
        coin && coin.toLowerCase().includes(filterConfig.coin.toLowerCase())
      )) {
        return false;
      }
    }
    
    if (filterConfig.internalTag) {
      // Check if the internal tag matches the filter
      if (!event.data.internalTag) return false;
      
      // Handle roll-up of specific transfer types into broader categories
      if (filterConfig.internalTag === 'transfer:deposit') {
        // Roll up all deposit types
        if (!event.data.internalTag.startsWith('transfer:deposit')) return false;
      } else if (filterConfig.internalTag === 'transfer:withdrawal') {
        // Roll up all withdrawal types
        if (!event.data.internalTag.startsWith('transfer:withdrawal')) return false;
      } else {
        // For other tags, use exact match
        if (!event.data.internalTag.includes(filterConfig.internalTag)) return false;
      }
    }
    
    if (filterConfig.startDate) {
      const eventDate = new Date(event.time);
      const startDate = new Date(filterConfig.startDate);
      if (eventDate < startDate) return false;
    }
    
    if (filterConfig.endDate) {
      const eventDate = new Date(event.time);
      const endDate = new Date(filterConfig.endDate);
      if (eventDate > endDate) return false;
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredTimeline.length / itemsPerPage);

  const handleFilterChange = (field, value) => {
    setFilterConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatNumber = (value) => {
    if (!value || value === '-') return '-';
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? value : num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  const sortedTimeline = React.useMemo(() => {
    const sorted = [...filteredTimeline].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;
      
      switch (sortConfig.key) {
        case 'time':
          return direction * (new Date(a.time) - new Date(b.time));
        case 'label':
          return direction * (a.data.eventLabel.localeCompare(b.data.eventLabel));
        case 'sent': {
          const aValue = parseFloat(a.data.sentAmount) || 0;
          const bValue = parseFloat(b.data.sentAmount) || 0;
          return direction * (aValue - bValue);
        }
        case 'received': {
          const aValue = parseFloat(a.data.receivedAmount) || 0;
          const bValue = parseFloat(b.data.receivedAmount) || 0;
          return direction * (aValue - bValue);
        }
        case 'fee': {
          const aValue = parseFloat(a.data.feeAmount) || 0;
          const bValue = parseFloat(b.data.feeAmount) || 0;
          return direction * (aValue - bValue);
        }
        case 'gain': {
          const aValue = parseFloat(a.data.pnl || 0);
          const bValue = parseFloat(b.data.pnl || 0);
          return direction * (aValue - bValue);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredTimeline, sortConfig]);

  const handleExportToTaxService = () => {
    try {
      const result = FileUploader.downloadTaxCSV(timeline, selectedTaxService);
      
      // Store the result in localStorage for the guide to use
      if (result) {
        localStorage.setItem('lastExportResult', JSON.stringify(result));
      }
      
      // Navigate to the appropriate guide page
      navigate(taxServiceConfigs[selectedTaxService].guidePath, { state: { timeline } });

    } catch (error) {
      console.error('Export failed:', error);
      setError(`Export failed: ${error.message}`);
    }
  };

  const handleGenerateTestCSV = () => {
    try {
      const tokenAddressMap = JSON.parse(localStorage.getItem('tokenAddressMap'));
      if (!tokenAddressMap) {
        throw new Error('No token address map found. Please process data first.');
      }
      FileUploader.generateTestKoinlyCSV(tokenAddressMap);
    } catch (error) {
      setError(`Error generating test CSV: ${error.message}`);
    }
  };

  const toggleRow = (index) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Define columns for the StandardTable
  const columns = [
    { 
      id: 'time', 
      label: 'Date', 
      sortable: true,
      render: (item) => {
        const date = new Date(item.time);
        const formattedDate = date.getDate() + ' ' + 
          date.toLocaleString('en-US', { month: 'short' }) + ' ' + 
          date.getFullYear().toString().substr(-2);
        const formattedTime = date.getHours().toString().padStart(2, '0') + ':' + 
          date.getMinutes().toString().padStart(2, '0') + ':' + 
          date.getSeconds().toString().padStart(2, '0');
        
        return (
          <DateCell>
            <div className="date">{formattedDate}</div>
            <div className="time">{formattedTime}</div>
          </DateCell>
        );
      }
    },
    { 
      id: 'label', 
      label: 'Label', 
      sortable: true,
      render: (item) => (
        <LabelTag>
          <span className="eventLabel">{item.data.eventLabel}</span>
          {item.data.tag && (
            <span className="tag">{item.data.tag}</span>
          )}
        </LabelTag>
      )
    },
    { 
      id: 'sent', 
      label: 'Sent', 
      sortable: true,
      render: (item) => item.data.sentAmount && (
        `${formatNumber(item.data.sentAmount)} ${item.data.sentCurrency}`
      )
    },
    { 
      id: 'received', 
      label: 'Received', 
      sortable: true,
      render: (item) => item.data.receivedAmount && (
        `${formatNumber(item.data.receivedAmount)} ${item.data.receivedCurrency}`
      )
    },
    { 
      id: 'fee', 
      label: 'Fee', 
      sortable: true,
      render: (item) => item.data.feeAmount && (
        `${formatNumber(item.data.feeAmount)} ${item.data.feeCurrency}`
      )
    },
    { 
      id: 'actions', 
      label: '', 
      sortable: false,
      render: (item) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ transform: expandedRows.has(item.id) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>
      )
    }
  ];

  // Prepare filters for StandardTable
  const filters = {
    dateFilters: [
      {
        id: 'startDate',
        label: 'From:',
        value: filterConfig.startDate,
        type: 'date'
      },
      {
        id: 'endDate',
        label: 'To:',
        value: filterConfig.endDate,
        type: 'date'
      }
    ],
    mainFilters: [
      {
        id: 'internalTag',
        label: 'Tag:',
        value: filterConfig.internalTag,
        type: 'select',
        options: [
          { value: '', label: 'All Tags' },
          { value: 'trade:spot', label: 'Spot Trade' },
          { value: 'trade:perp:open', label: 'Perp Open' },
          { value: 'trade:perp:close', label: 'Perp Close' },
          { value: 'transfer:deposit', label: 'All Deposits' },
          { value: 'transfer:withdrawal', label: 'All Withdrawals' },
          { value: 'transfer:internal', label: 'Internal Transfer' },
          { value: 'transfer:airdrop', label: 'Airdrop' },
          { value: 'transfer:deposit:subaccount', label: 'Subaccount Deposit' },
          { value: 'transfer:withdrawal:subaccount', label: 'Subaccount Withdrawal' },
          { value: 'transfer:withdrawal:spot_to_evm', label: 'Spot to EVM Transfer' },
          { value: 'transfer:deposit:evm_to_spot', label: 'EVM to Spot Transfer' },
          { value: 'funding', label: 'Funding' },
          { value: 'staking:reward', label: 'Staking Reward' },
          { value: 'staking:delegate', label: 'Staking Delegate' },
          { value: 'staking:undelegate', label: 'Staking Undelegate' }
        ]
      },
      {
        id: 'coin',
        label: 'Coin:',
        value: filterConfig.coin,
        type: 'select',
        options: [
          { value: '', label: 'All Coins' },
          ...availableCoins.map(coin => ({ value: coin, label: coin }))
        ]
      }
    ]
  };

  // Prepare pagination for StandardTable
  const pagination = {
    currentPage,
    totalPages,
    itemsPerPage
  };

  // Add unique IDs to timeline items for tracking expanded rows
  const timelineWithIds = sortedTimeline.map((item, index) => ({
    ...item,
    id: index
  }));

  // Custom row renderer for StandardTable
  const renderRow = (item, index) => {
    const rowIndex = item.id;
    
    return (
      <React.Fragment key={rowIndex}>
        <TransactionRow 
          onClick={() => toggleRow(rowIndex)}
          $isInternalTransfer={item.isInternalTransfer || false}
        >
          {columns.map(column => (
            <td key={`${rowIndex}-${column.id}`}>
              {column.render ? column.render(item) : item[column.id]}
            </td>
          ))}
        </TransactionRow>
        {expandedRows.has(rowIndex) && (
          <DescriptionRow>
            <td></td>
            <td colSpan="5">
              <div className="description">{item.data.description}</div>
              {item.original?.action === 'genesis.distribution' && (
                <div className="airdrop-info" style={{ marginTop: '0.5rem', color: props => props.theme.colors.accent.green }}>
                  <strong>Airdrop Cost Basis:</strong> {
                    item.data.netWorthAmount 
                      ? `$${item.data.netWorthAmount} ${item.data.netWorthCurrency || 'USD'}`
                      : 'Not set'
                  }
                </div>
              )}
              <div className="raw-data">{JSON.stringify(item.original, null, 2)}</div>
            </td>
          </DescriptionRow>
        )}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <Container>
        <div>Loading...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>
          <h3 style={{ marginBottom: '0.5rem' }}>Error Processing Data</h3>
          <div>{error}</div>
          <div style={{ marginTop: '1rem' }}>
            <details>
              <summary style={{ cursor: 'pointer' }}>Debugging Information</summary>
              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                <p>Please check the browser console for more detailed error information.</p>
                <p>You may need to:</p>
                <ul style={{ marginLeft: '1.5rem', listStyleType: 'disc' }}>
                  <li>Verify your CSV files have the correct format</li>
                  <li>Check for missing required columns</li>
                  <li>Look for invalid data in your CSV files</li>
                  {error.includes('quota') && (
                    <>
                      <li><strong>Storage quota exceeded:</strong> Your data is too large for browser storage</li>
                      <li>Try using a different browser or clearing browser data</li>
                      <li>Consider processing fewer transactions at a time</li>
                    </>
                  )}
                </ul>
              </div>
            </details>
          </div>
        </ErrorMessage>
        
        <WizardNavigation>
          <WizardButton 
            primary
            onClick={() => navigate('/tax')}
            rightIcon={<RightArrowIcon />}
          >
            Return to Upload
          </WizardButton>
          {error.includes('quota') && (
            <WizardButton 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              style={{ background: '#f44336', borderColor: '#f44336' }}
            >
              Clear All Data & Reload
            </WizardButton>
          )}
        </WizardNavigation>
      </Container>
    );
  }

  return (
    <Container>
      <AnimatedLogo src={hlAnimatedGif} alt="Animated HL Logo" />
      <Title>Review Your Transactions</Title>

      <StandardTable
        columns={columns}
        data={timelineWithIds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortConfig={sortConfig}
        onSort={handleSort}
        pagination={pagination}
        onPageChange={setCurrentPage}
        renderRow={renderRow}
        columnWidths={{
          col1: '15%',  // Date column
          col2: '30%',  // Label column - 30% as requested
          col3: '15%',  // Sent column
          col4: '15%',  // Received column
          col5: '15%',  // Fee column
          col6: '10%'    // Actions column (dropdown caret) - 5% as requested
        }}
      />

      <WizardNavigation>
        <WizardButton onClick={handleStartOver}>
          Start Over
        </WizardButton>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
          {/* <WizardButton 
            onClick={handleGenerateTestCSV}
            style={{ background: props => props.theme.colors.secondary, borderColor: props => props.theme.colors.secondary }}
          >
            Generate Test CSV
          </WizardButton> */}
          <label style={{ color: props => props.theme.colors.text.secondary, fontSize: '0.8rem' }}>Choose Service:</label>
          <TaxServiceSelect
            value={selectedTaxService}
            onChange={(e) => setSelectedTaxService(e.target.value)}
            style={{ background: '#ffffff', border: '1px solid #e0e0e0' }}
          >
            {Object.values(TAX_SERVICES).map(service => (
              <option key={service} value={service}>
                {taxServiceConfigs[service].name}
                {service === TAX_SERVICES.AWAKEN && ' ⚠️ ALPHA'}
              </option>
            ))}
          </TaxServiceSelect>
          <WizardButton 
            primary
            onClick={handleExportToTaxService}
            rightIcon={<RightArrowIcon />}
          >
            Export CSV
          </WizardButton>
        </div>
      </WizardNavigation>
    </Container>
  );
};

export default Summary;