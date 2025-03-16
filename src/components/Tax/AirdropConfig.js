import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../../services/FileUploader';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  color: ${props => props.theme.colors.text.primary};
  font-family: ${props => props.theme.fonts.body};
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const Header = styled.div`
  width: 100%;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.5rem;
  font-family: ${props => props.theme.fonts.header};
`;

const Description = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const InfoBox = styled.div`
  background: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
  font-size: 0.9rem; /* Smaller font size for the entire info box */
`;

const InfoTitle = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.75rem;
  font-family: ${props => props.theme.fonts.header};
  font-size: 1.1rem; /* Smaller title */
`;

const InfoText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 0.75rem;
  line-height: 1.4;
  font-size: 0.85rem; /* Smaller text */
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.colors.secondary};
  }

  th {
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const SortableHeader = styled.th`
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 1.5rem !important;

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
  }

  .sort-indicator {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    opacity: ${props => props.$active ? 1 : 0.3};
  }
`;

const Input = styled.input`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text.primary};
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  width: 100%;
  max-width: 150px;
`;

const Select = styled.select`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.text.primary};
  padding: 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  width: 100%;
  max-width: 150px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 2rem;
`;

const Button = styled.button`
  background: ${props => props.primary ? props.theme.colors.primary : props.theme.colors.secondary};
  color: ${props => props.theme.colors.background};
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  padding: 0.75rem 1.5rem;
  font-weight: ${props => props.theme.fontWeights.bold};
  cursor: pointer;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
`;

const NoAirdropsMessage = styled.div`
  background: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 2rem;
  text-align: center;
  width: 100%;
`;

const BulkActionContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 1rem;
  width: 100%;
  gap: 0.5rem;
`;

const BulkActionLabel = styled.span`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
`;

const AirdropConfig = () => {
  const navigate = useNavigate();
  const [airdrops, setAirdrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenMap, setTokenMap] = useState({});
  const [sortConfig, setSortConfig] = useState({
    key: 'time',
    direction: 'desc'
  });
  const [bulkMethod, setBulkMethod] = useState('zero');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 1. Get the token mapping data
        const tokenData = await FileUploader.getSpotTokenMap();
        setTokenMap(tokenData.tokenAddressMap);
        
        // 2. Load deposits data from localStorage
        const depositsData = JSON.parse(localStorage.getItem('rawDepositsData') || '[]');
        
        // 3. Filter for genesis.distribution entries
        const airdropEntries = depositsData.filter(entry => 
          entry.action === 'genesis.distribution'
        );
        
        // 4. Transform to a more usable format for the form
        const formattedAirdrops = airdropEntries.map(entry => {
          // Parse the timestamp using FileUploader's parseDate function
          const parsedDate = FileUploader.parseDate(entry.time);
          const timestamp = parsedDate.getTime();
          
          // Extract coin name from accountValueChange
          const [amountStr, coin] = entry.accountValueChange.split(' ');
          
          return {
            id: timestamp, // Using timestamp as a unique ID
            time: parsedDate.toISOString(),
            asset: coin,
            amount: parseFloat(amountStr),
            costBasisMethod: 'zero', // Default method
            costBasisValue: '0.00', // Default value with two decimal places
            originalEntry: entry // Keep reference to original entry
          };
        });
        
        setAirdrops(formattedAirdrops);
        setLoading(false);
      } catch (err) {
        console.error('Error loading airdrop data:', err);
        setError('Failed to load airdrop data. Please return to the upload page and try again.');
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleMethodChange = (id, method) => {
    setAirdrops(prevAirdrops => 
      prevAirdrops.map(airdrop => {
        if (airdrop.id === id) {
          // Set default value based on method
          let value = '0.00';
          if (method === 'firstTraded') {
            // This would be implemented in the future
            value = '0.00'; // Placeholder
          }
          
          return {
            ...airdrop,
            costBasisMethod: method,
            costBasisValue: value
          };
        }
        return airdrop;
      })
    );
  };

  const handleValueChange = (id, value) => {
    // Format to always have two decimal places
    const formattedValue = parseFloat(value).toFixed(2);
    
    setAirdrops(prevAirdrops => 
      prevAirdrops.map(airdrop => {
        if (airdrop.id === id) {
          return {
            ...airdrop,
            costBasisValue: value, // Keep the input value as is for editing
            formattedValue // Store the formatted value separately
          };
        }
        return airdrop;
      })
    );
  };

  const applyBulkMethod = () => {
    setAirdrops(prevAirdrops => 
      prevAirdrops.map(airdrop => {
        // Set default value based on method
        let value = '0.00';
        if (bulkMethod === 'firstTraded') {
          // This would be implemented in the future
          value = '0.00'; // Placeholder
        }
        
        return {
          ...airdrop,
          costBasisMethod: bulkMethod,
          costBasisValue: value
        };
      })
    );
  };

  const saveAirdropConfig = () => {
    try {
      // Get the current deposits data
      const depositsData = JSON.parse(localStorage.getItem('rawDepositsData') || '[]');
      
      // Update the deposits data with new cost basis values
      const updatedDeposits = depositsData.map(entry => {
        if (entry.action === 'genesis.distribution') {
          // Find the matching airdrop in our state
          // Use the parsed date from FileUploader to ensure consistency
          const parsedDate = FileUploader.parseDate(entry.time);
          const timestamp = parsedDate.getTime();
          const matchingAirdrop = airdrops.find(airdrop => airdrop.id === timestamp);
          
          if (matchingAirdrop) {
            // Format the value to always have two decimal places
            const formattedValue = parseFloat(matchingAirdrop.costBasisValue).toFixed(2);
            
            // Update the entry with the cost basis value
            return {
              ...entry,
              netWorthAmount: formattedValue,
              netWorthCurrency: 'USD'
            };
          }
        }
        return entry;
      });
      
      // Save the updated deposits back to localStorage
      localStorage.setItem('rawDepositsData', JSON.stringify(updatedDeposits));
      
      // Navigate to summary page
      navigate('/summary');
    } catch (err) {
      console.error('Error saving airdrop configuration:', err);
      setError('Failed to save airdrop configuration. Please try again.');
    }
  };

  const handleSort = (key) => {
    setSortConfig(prevSort => ({
      key,
      direction: prevSort.key === key && prevSort.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sort the airdrops based on the current sort configuration
  const sortedAirdrops = [...airdrops].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;
    
    switch (sortConfig.key) {
      case 'time':
        return direction * (new Date(a.time) - new Date(b.time));
      case 'asset':
        return direction * a.asset.localeCompare(b.asset);
      case 'amount':
        return direction * (a.amount - b.amount);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <Container>
        <div>Loading airdrop data...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div>{error}</div>
        <Button onClick={() => navigate('/upload')}>Return to Upload</Button>
      </Container>
    );
  }

  if (airdrops.length === 0) {
    return (
      <Container>
        <Header>
          <Title>No Airdrops Detected</Title>
        </Header>
        
        <NoAirdropsMessage>
          <p>We didn't find any airdrops in your transaction history.</p>
          <Button primary onClick={() => navigate('/summary')}>
            Continue to Summary
          </Button>
        </NoAirdropsMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Configure Airdrop Value</Title>
      </Header>
      
      <InfoBox>
        <InfoTitle>About Airdrop Taxation</InfoTitle>
        <InfoText>
          In most jurisdictions, airdrops are considered taxable income at the time of receipt. 
          You need to determine the fair market value (cost basis) of the tokens when you received them.
        </InfoText>
        <InfoText>
          You can choose from several methods:
          <ul>
            <li><strong>Zero Cost Basis:</strong> Set the value to $0 (may require amending later)</li>
            <li><span style={{ opacity: 0.7 }}><strong>First Traded Price:</strong> Use the first traded price after receipt (Coming Soon)</span></li>
            <li><strong>Custom Value:</strong> Enter a specific value based on your research</li>
          </ul>
        </InfoText>
        <InfoText>
          <strong>Note:</strong> This is not tax advice. Please consult with a tax professional for guidance specific to your situation.
        </InfoText>
      </InfoBox>
      
      <BulkActionContainer>
        <BulkActionLabel>Apply to all:</BulkActionLabel>
        <Select 
          value={bulkMethod}
          onChange={(e) => setBulkMethod(e.target.value)}
          style={{ maxWidth: '120px' }}
        >
          <option value="zero">Zero Cost</option>
          <option value="firstTraded" disabled>First Traded Price</option>
          <option value="custom">Custom Value</option>
        </Select>
        <Button 
          onClick={applyBulkMethod}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
        >
          Apply
        </Button>
      </BulkActionContainer>
      
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
              onClick={() => handleSort('asset')}
              $active={sortConfig.key === 'asset'}
            >
              Asset
              <span className="sort-indicator">
                {sortConfig.key === 'asset' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
              </span>
            </SortableHeader>
            <SortableHeader 
              onClick={() => handleSort('amount')}
              $active={sortConfig.key === 'amount'}
            >
              Amount
              <span className="sort-indicator">
                {sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
              </span>
            </SortableHeader>
            <th>Method</th>
            <th>Cost Basis (USD)</th>
          </tr>
        </thead>
        <tbody>
          {sortedAirdrops.map(airdrop => {
            const date = new Date(airdrop.time);
            const formattedDate = date.toLocaleDateString();
            
            return (
              <tr key={airdrop.id}>
                <td>{formattedDate}</td>
                <td>{airdrop.asset}</td>
                <td>{airdrop.amount.toFixed(4)}</td>
                <td>
                  <Select 
                    value={airdrop.costBasisMethod}
                    onChange={(e) => handleMethodChange(airdrop.id, e.target.value)}
                  >
                    <option value="zero">Zero Cost</option>
                    <option value="firstTraded" disabled>First Traded Price (Coming Soon)</option>
                    <option value="custom">Custom Value</option>
                  </Select>
                </td>
                <td>
                  <Input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={airdrop.costBasisValue}
                    onChange={(e) => handleValueChange(airdrop.id, e.target.value)}
                    disabled={airdrop.costBasisMethod === 'zero' || airdrop.costBasisMethod === 'firstTraded'}
                    onBlur={(e) => {
                      // Format to two decimal places when the user leaves the field
                      const formattedValue = parseFloat(e.target.value || 0).toFixed(2);
                      e.target.value = formattedValue;
                      handleValueChange(airdrop.id, formattedValue);
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      
      <ButtonContainer>
        <Button primary onClick={saveAirdropConfig}>
          Save Configuration
        </Button>
      </ButtonContainer>
    </Container>
  );
};

export default AirdropConfig; 