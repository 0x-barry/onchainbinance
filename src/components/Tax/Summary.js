import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../../services/FileUploader';

// Keep only the styled components that are being used
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  color: ${props => props.theme.colors.text.primary};
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const TableContainer = styled.div`
  width: 100%;
  margin-top: 1rem;
  
  @media (min-width: 768px) {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  table-layout: fixed;
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.colors.secondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  th {
    font-weight: 500;
    color: ${props => props.theme.colors.text.secondary};
  }

  td {
    font-family: monospace;
  }

  // Responsive percentage-based column widths
  th:nth-child(1), td:nth-child(1) { width: 15%; } /* Date */
  th:nth-child(2), td:nth-child(2) { width: 20%; } /* Label */
  th:nth-child(3), td:nth-child(3) { width: 20%; } /* Sent */
  th:nth-child(4), td:nth-child(4) { width: 20%; } /* Received */
  th:nth-child(5), td:nth-child(5) { width: 12%; } /* Fee */
  th:nth-child(6), td:nth-child(6) { width: 10%; } /* Gain */
  th:nth-child(7), td:nth-child(7) { width: 3%; } /* Icon */

  @media (max-width: 768px) {
    th:nth-child(1), td:nth-child(1) { width: 20%; } /* Date gets slightly wider on mobile */
    th:nth-child(2), td:nth-child(2) { width: 25%; } /* Label gets slightly wider on mobile */
    th:nth-child(3), td:nth-child(3) { width: 15%; } /* Sent gets slightly narrower */
    th:nth-child(4), td:nth-child(4) { width: 15%; } /* Received gets slightly narrower */
    th:nth-child(5), td:nth-child(5) { width: 12%; } /* Fee stays the same */
    th:nth-child(6), td:nth-child(6) { width: 10%; } /* Gain stays the same */
    th:nth-child(7), td:nth-child(7) { width: 3%; } /* Icon stays the same */
  }
`;

const DateCell = styled.td`
  .date {
    font-weight: 500;
  }
  .time {
    color: #888;
    font-size: 0.8rem;
  }
`;

const LabelTag = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  
  .category {
    font-weight: 600;
    font-size: 0.8rem;
  }
  
  .subcategory {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 3px;
    background-color: rgba(128, 128, 128, 0.15);
    color: #666;
    display: inline-block;
  }
`;

const StartOverButton = styled.button`
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: #2a2a2a;
  border: 1px solid #333;
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  z-index: 100;
  
  &:hover {
    background: #333;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterInput = styled.input`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text.primary};
  padding: 0.5rem;
  border-radius: 4px;
`;

const FilterSelect = styled.select`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text.primary};
  padding: 0.5rem;
  border-radius: 4px;
`;

const ErrorMessage = styled.div`
  color: #EF4444;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
`;

const DescriptionRow = styled.tr`
  background-color: rgba(128, 128, 128, 0.1);
  
  td {
    padding: 0.75rem;
    font-size: 0.8rem;
    color: ${props => props.theme.colors.text.secondary};
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
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    white-space: pre-wrap;
    overflow-x: auto;
  }
`;

const TransactionRow = styled.tr`
  cursor: pointer;
  background-color: ${props => props.$isInternalTransfer ? 'rgba(128, 128, 128, 0.1)' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.$isInternalTransfer ? 'rgba(128, 128, 128, 0.15)' : 'rgba(128, 128, 128, 0.1)'};
  }
`;

const SortableHeader = styled.th`
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 1.5rem !important;

  &:hover {
    background-color: rgba(128, 128, 128, 0.1);
  }

  .sort-indicator {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    opacity: ${props => props.$active ? 1 : 0.3};
  }
`;

const Summary = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterConfig, setFilterConfig] = useState({
    eventType: '',
    coin: '',
    startDate: '',
    endDate: ''
  });
  const itemsPerPage = 25;
  const [sortConfig, setSortConfig] = useState({
    key: 'time',
    direction: 'desc'
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [availableCoins, setAvailableCoins] = useState([]);

  const processData = useCallback(async () => {
    try {
      // Get raw data from localStorage
      const rawTrades = localStorage.getItem('rawTradeData');
      const rawFunding = localStorage.getItem('rawFundingData');
      const rawDeposits = localStorage.getItem('rawDepositsData');
      const rawStakingRewards = localStorage.getItem('rawStakingRewardsData');
      const rawStakingActions = localStorage.getItem('rawStakingActionsData');

      if (!rawTrades || !rawFunding || !rawDeposits) {
        navigate('/');
        return;
      }

      // Process the raw data
      const result = await FileUploader.storeProcessedData(
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
    }
  }, [navigate]);

  useEffect(() => {
    processData();
  }, [processData]);

  useEffect(() => {
    // Extract unique coins from timeline
    const coins = new Set();
    timeline.forEach(event => {
      if (event.coin) coins.add(event.coin);
      if (event.asset) coins.add(event.asset);
    });
    setAvailableCoins(Array.from(coins).sort());
  }, [timeline]);

  const handleStartOver = () => {
    // Clear ALL localStorage items
    localStorage.clear();
    
    // Navigate to upload page
    navigate('/upload');
  };

  const filteredTimeline = timeline.filter(event => {
    if (filterConfig.eventType) {
      switch (filterConfig.eventType) {
        case 'spot_trade':
          if (event.eventType !== 'trade' || event.type !== 'spot') return false;
          break;
        case 'perp_trade':
          if (event.eventType !== 'trade' || event.type !== 'perp') return false;
          break;
        case 'transfer':
          if (event.eventType !== 'transfer') return false;
          break;
        case 'funding':
          if (event.eventType !== 'funding') return false;
          break;
        case 'staking':
          if (event.eventType !== 'stakingReward' && event.eventType !== 'stakingAction') return false;
          break;
        default:
          if (event.eventType !== filterConfig.eventType) return false;
      }
    }
    
    if (filterConfig.coin) {
      const eventCoin = event.details.trade?.coin || 
                       event.details.funding?.coin || 
                       event.details.transfer?.coin || 
                       event.details.staking?.coin;
      if (!eventCoin || !eventCoin.toLowerCase().includes(filterConfig.coin.toLowerCase())) return false;
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
          return direction * (a.display.category.localeCompare(b.display.category));
        case 'sent': {
          const aValue = parseFloat(a.display.sentAmount) || 0;
          const bValue = parseFloat(b.display.sentAmount) || 0;
          return direction * (aValue - bValue);
        }
        case 'received': {
          const aValue = parseFloat(a.display.receivedAmount) || 0;
          const bValue = parseFloat(b.display.receivedAmount) || 0;
          return direction * (aValue - bValue);
        }
        case 'fee': {
          const aValue = parseFloat(a.display.feeAmount) || 0;
          const bValue = parseFloat(b.display.feeAmount) || 0;
          return direction * (aValue - bValue);
        }
        case 'gain': {
          const aValue = parseFloat(a.display.pnl || 0);
          const bValue = parseFloat(b.display.pnl || 0);
          return direction * (aValue - bValue);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [filteredTimeline, sortConfig]);

  const handleReprocess = async () => {
    try {
      console.log('Starting reprocess...');
      setIsLoading(true);
      setError(null);
      
      // Clear all processed data from localStorage
      FileUploader.clearProcessedData(false);
      
      const trades = localStorage.getItem('rawTradeData');
      const funding = localStorage.getItem('rawFundingData');
      const deposits = localStorage.getItem('rawDepositsData');
      const stakingRewards = localStorage.getItem('rawStakingRewardsData');
      const stakingActions = localStorage.getItem('rawStakingActionsData');

      console.log('Raw data for reprocessing:', {
        hasRawTrades: !!trades,
        hasRawFunding: !!funding,
        hasRawDeposits: !!deposits,
        hasRawStakingRewards: !!stakingRewards,
        hasRawStakingActions: !!stakingActions
      });

      if (!trades || !funding || !deposits) {
        const error = 'No raw data found. Please upload files again.';
        console.error(error);
        setError(error);
        setIsLoading(false);
        return;
      }

      console.log('Starting reprocessing of data...');
      const result = await FileUploader.storeProcessedData(
        JSON.parse(trades),
        JSON.parse(funding),
        JSON.parse(deposits),
        stakingRewards ? JSON.parse(stakingRewards) : [],
        stakingActions ? JSON.parse(stakingActions) : []
      );
      
      console.log('Reprocessing complete, updating UI...');
      setTimeline(result.timeline);
      setIsLoading(false);
    } catch (error) {
      const errorMessage = `Error reprocessing data: ${error.message}`;
      console.error(errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleExportToKoinly = () => {
    try {
      FileUploader.downloadKoinlyCSV();
    } catch (error) {
      setError(`Error exporting to Koinly: ${error.message}`);
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
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button 
              onClick={() => navigate('/')}
              style={{ 
                padding: '0.5rem 1rem', 
                background: '#4CAF50', 
                border: 'none', 
                borderRadius: '4px', 
                color: 'white', 
                cursor: 'pointer' 
              }}
            >
              Return to Upload
            </button>
            {error.includes('quota') && (
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: '#f44336', 
                  border: 'none', 
                  borderRadius: '4px', 
                  color: 'white', 
                  cursor: 'pointer' 
                }}
              >
                Clear All Data & Reload
              </button>
            )}
          </div>
        </ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <StartOverButton onClick={handleStartOver}>
        Start Over
      </StartOverButton>
      <StartOverButton 
        onClick={handleReprocess}
        style={{ right: '120px' }}
      >
        Reprocess
      </StartOverButton>
      <StartOverButton 
        onClick={handleExportToKoinly}
        style={{ right: '220px', background: '#4CAF50', borderColor: '#45a049' }}
      >
        Export for Koinly
      </StartOverButton>

      <TableContainer>
        <FilterContainer>
          <FilterSelect
            value={filterConfig.eventType}
            onChange={e => handleFilterChange('eventType', e.target.value)}
          >
            <option value="">All Event Types</option>
            <option value="spot_trade">Spot Trades</option>
            <option value="perp_trade">Perp Trades</option>
            <option value="transfer">Transfers</option>
            <option value="funding">Funding</option>
            <option value="staking">Staking</option>
          </FilterSelect>
          
          <FilterSelect
            value={filterConfig.coin}
            onChange={e => handleFilterChange('coin', e.target.value)}
          >
            <option value="">All Coins</option>
            {availableCoins.map(coin => (
              <option key={coin} value={coin}>{coin}</option>
            ))}
          </FilterSelect>
          
          <FilterInput
            type="date"
            placeholder="Start date"
            value={filterConfig.startDate}
            onChange={e => handleFilterChange('startDate', e.target.value)}
          />
          
          <FilterInput
            type="date"
            placeholder="End date"
            value={filterConfig.endDate}
            onChange={e => handleFilterChange('endDate', e.target.value)}
          />
        </FilterContainer>
        
        <Table>
          <thead>
            <tr>
              <SortableHeader 
                onClick={() => handleSort('time')}
                $active={sortConfig.key === 'time'}
              >
                Date
                <span className="sort-indicator">
                  {sortConfig.key === 'time' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </SortableHeader>
              <SortableHeader 
                onClick={() => handleSort('label')}
                $active={sortConfig.key === 'label'}
              >
                Label
                <span className="sort-indicator">
                  {sortConfig.key === 'label' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </SortableHeader>
              <SortableHeader 
                onClick={() => handleSort('sent')}
                $active={sortConfig.key === 'sent'}
              >
                Sent
                <span className="sort-indicator">
                  {sortConfig.key === 'sent' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </SortableHeader>
              <SortableHeader 
                onClick={() => handleSort('received')}
                $active={sortConfig.key === 'received'}
              >
                Received
                <span className="sort-indicator">
                  {sortConfig.key === 'received' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </SortableHeader>
              <SortableHeader 
                onClick={() => handleSort('fee')}
                $active={sortConfig.key === 'fee'}
              >
                Fee
                <span className="sort-indicator">
                  {sortConfig.key === 'fee' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </SortableHeader>
              <SortableHeader 
                onClick={() => handleSort('gain')}
                $active={sortConfig.key === 'gain'}
              >
                Gain
                <span className="sort-indicator">
                  {sortConfig.key === 'gain' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </SortableHeader>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedTimeline
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((event, index) => {
                const date = new Date(event.time);
                const formattedDate = date.getDate() + ' ' + 
                  date.toLocaleString('en-US', { month: 'short' }) + ' ' + 
                  date.getFullYear().toString().substr(-2);
                const formattedTime = date.getHours().toString().padStart(2, '0') + ':' + 
                  date.getMinutes().toString().padStart(2, '0') + ':' + 
                  date.getSeconds().toString().padStart(2, '0');
                
                const rowIndex = (currentPage - 1) * itemsPerPage + index;
                
                return (
                  <React.Fragment key={rowIndex}>
                    <TransactionRow 
                      onClick={() => toggleRow(rowIndex)}
                      $isInternalTransfer={event.details?.transfer?.isInternalTransfer || false}
                    >
                      <DateCell>
                        <div className="date">{formattedDate}</div>
                        <div className="time">{formattedTime}</div>
                      </DateCell>
                      <td>
                        <LabelTag>
                          <span className="category">{event.display.category}</span>
                          {event.koinly.tag && (
                            <span className="subcategory">{event.koinly.tag}</span>
                          )}
                        </LabelTag>
                      </td>
                      <td>
                        {event.display.sentAmount && (
                          `${formatNumber(event.display.sentAmount)} ${event.display.sentCurrency}`
                        )}
                      </td>
                      <td>
                        {event.display.receivedAmount && (
                          `${formatNumber(event.display.receivedAmount)} ${event.display.receivedCurrency}`
                        )}
                      </td>
                      <td>
                        {event.display.feeAmount && (
                          `${formatNumber(event.display.feeAmount)} ${event.display.feeCurrency}`
                        )}
                      </td>
                      <td style={{ color: parseFloat(event.display.pnl || 0) >= 0 ? '#4CAF50' : '#FF5252' }}>
                        {event.display.pnl ? `$${formatNumber(event.display.pnl)}` : '-'}
                      </td>
                      <td>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ transform: expandedRows.has(rowIndex) ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                        </svg>
                      </td>
                    </TransactionRow>
                    {expandedRows.has(rowIndex) && (
                      <DescriptionRow>
                        <td></td>
                        <td colSpan="6">
                          <div className="description">{event.display.description}</div>
                          <div className="raw-data">{JSON.stringify(event, null, 2)}</div>
                        </td>
                      </DescriptionRow>
                    )}
                  </React.Fragment>
                );
              })}
          </tbody>
        </Table>
        
        {totalPages > 1 && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span style={{ margin: '0 1rem' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </TableContainer>
    </Container>
  );
};

export default Summary;