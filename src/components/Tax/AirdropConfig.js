import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../../services/FileUploader';
import hlAnimatedGif from '../../images/hl-animated.gif';
import StandardTable from '../UI/StandardTable';
import WizardNavigation, { WizardButton, LeftArrowIcon, RightArrowIcon } from '../UI/WizardNavigation';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  padding-bottom: 5rem; /* Add padding to account for the fixed navigation */
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  color: ${props => props.theme.colors.text.primary};
  font-family: ${props => props.theme.fonts.body};
  
  @media (min-width: 768px) {
    padding: 2rem;
    padding-bottom: 5rem; /* Add padding to account for the fixed navigation */
  }
`;

const AnimatedLogo = styled.img`
  width: 25px;
  height: auto;
  margin-bottom: 0.5rem;
  display: block;
  margin-left: auto;
  margin-right: auto;
`;

const Eyebrow = styled.h3`
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;
  font-family: ${props => props.theme.fonts.header};
  width: 100%;

  @media (min-width: 768px) {
    font-size: 1.25rem;
  }
`;

const Title = styled.h1`
  font-size: 2.25rem;
  margin-bottom: 3rem;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const InfoBox = styled.div`
  background: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
`;

const InfoTitle = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  margin-top: 0;
  margin-bottom: 0;
  font-family: ${props => props.theme.fonts.header};
  font-size: 1.1rem; /* Smaller title */
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:after {
    content: '${props => props.$isExpanded ? '▲' : '▼'}';
    font-size: 0.8rem;
    margin-left: 0.5rem;
  }
`;

const InfoContent = styled.div`
  max-height: ${props => props.$isExpanded ? '1000px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  font-size: 0.85rem;
  transition: opacity 0.3s ease-in-out, max-height 0.3s ease-in-out;
`;

const InfoText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 0.75rem;
  line-height: 1.4;
  font-size: 0.85rem; /* Smaller text */
`;

const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const TotalCostBasis = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.8rem;
  margin-top: 0.25rem;
  opacity: 0.8;
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

const Button = styled.button`
  background: ${props => props.theme.colors.primary};
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

// Define a custom header component for the StandardTable
const CustomTableHeader = ({ bulkMethod, setBulkMethod, applyBulkMethod }) => (
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
);

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
  const [infoBoxExpanded, setInfoBoxExpanded] = useState(false);

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
        } else if (bulkMethod === 'custom') {
          // Keep existing custom value if already set, otherwise default to 0
          value = airdrop.costBasisMethod === 'custom' ? airdrop.costBasisValue : '0.00';
        }
        
        return {
          ...airdrop,
          costBasisMethod: bulkMethod,
          costBasisValue: value
        };
      })
    );
  };

  // Calculate total cost basis for an airdrop
  const calculateTotalCostBasis = (perTokenValue, tokenAmount) => {
    const perToken = parseFloat(perTokenValue) || 0;
    const total = perToken * tokenAmount;
    return total.toFixed(2);
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
            // Extract the amount from the accountValueChange
            const [amountStr] = entry.accountValueChange.split(' ');
            const amount = parseFloat(amountStr);
            
            // Calculate the total cost basis (per token value * number of tokens)
            const perTokenValue = parseFloat(matchingAirdrop.costBasisValue) || 0;
            const totalCostBasis = (perTokenValue * amount).toFixed(2);
            
            // Update the entry with the total cost basis value
            return {
              ...entry,
              netWorthAmount: totalCostBasis,
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

  // Format number function to match Summary.js
  const formatNumber = (value) => {
    if (!value || value === '-') return '-';
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? value : num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  // Define columns for the StandardTable
  const columns = [
    { 
      id: 'time', 
      label: 'Date', 
      sortable: true,
      render: (airdrop) => {
        const date = new Date(airdrop.time);
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
      id: 'asset', 
      label: 'Asset', 
      sortable: true 
    },
    { 
      id: 'amount', 
      label: 'Amount', 
      sortable: true,
      render: (airdrop) => formatNumber(airdrop.amount)
    },
    { 
      id: 'method', 
      label: 'Method', 
      sortable: false,
      render: (airdrop) => (
        <Select 
          value={airdrop.costBasisMethod}
          onChange={(e) => handleMethodChange(airdrop.id, e.target.value)}
        >
          <option value="zero">Zero Cost</option>
          <option value="firstTraded" disabled>First Traded Price (Coming Soon)</option>
          <option value="custom">Custom Value</option>
        </Select>
      )
    },
    { 
      id: 'costBasis', 
      label: 'Cost Basis (USD)', 
      sortable: false,
      render: (airdrop) => (
        <InputContainer>
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
          <TotalCostBasis>
            Total: ${airdrop.costBasisMethod === 'zero' ? '0.00' : calculateTotalCostBasis(airdrop.costBasisValue, airdrop.amount)}
          </TotalCostBasis>
        </InputContainer>
      )
    }
  ];

  // Prepare filters for StandardTable - in this case, we don't need filters
  const filters = {
    mainFilters: []
  };

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
        <AnimatedLogo src={hlAnimatedGif} alt="Animated Logo" />
        <Title>Error</Title>
        <div>{error}</div>
        
        <WizardNavigation>
          <WizardButton 
            primary
            onClick={() => navigate('/tax')}
            rightIcon={<RightArrowIcon />}
          >
            Return to Upload
          </WizardButton>
        </WizardNavigation>
      </Container>
    );
  }

  if (airdrops.length === 0) {
    return (
      <Container>
        <AnimatedLogo src={hlAnimatedGif} alt="Animated Logo" />
        <Title>No Airdrops Detected</Title>
        
        <NoAirdropsMessage>
          <p>We didn't find any airdrops in your transaction history.</p>
        </NoAirdropsMessage>
        
        <WizardNavigation>
          <WizardButton 
            onClick={() => navigate('/tax')}
            leftIcon={<LeftArrowIcon />}
          >
            Back to Upload
          </WizardButton>
          <WizardButton 
            primary 
            onClick={() => navigate('/summary')}
            rightIcon={<RightArrowIcon />}
          >
            Continue to Summary
          </WizardButton>
        </WizardNavigation>
      </Container>
    );
  }

  return (
    <Container>
      <AnimatedLogo src={hlAnimatedGif} alt="Animated Logo" />
      <Title>Set Airdrop Value</Title>
      
      <InfoBox>
        <InfoTitle 
          onClick={() => setInfoBoxExpanded(!infoBoxExpanded)} 
          $isExpanded={infoBoxExpanded}
        >
          About Airdrop Taxation
        </InfoTitle>
        <InfoContent $isExpanded={infoBoxExpanded}>
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
            <strong>Note:</strong> Enter the cost basis <em>per token</em>. The total value (per token × quantity) will be calculated automatically and used for tax reporting.
          </InfoText>
          <InfoText>
            <strong>Disclaimer:</strong> This is not tax advice. Please consult with a tax professional for guidance specific to your situation.
          </InfoText>
        </InfoContent>
      </InfoBox>
      
      <StandardTable
        columns={columns}
        data={sortedAirdrops}
        filters={filters}
        sortConfig={sortConfig}
        onSort={handleSort}
        headerContent={
          <CustomTableHeader 
            bulkMethod={bulkMethod} 
            setBulkMethod={setBulkMethod} 
            applyBulkMethod={applyBulkMethod} 
          />
        }
        columnWidths={{
          col1: '15%',  // Date column
          col2: '15%',  // Asset column
          col3: '15%',  // Amount column
          col4: '20%',  // Method column
          col5: '35%'   // Cost Basis column (wider for the input and total display)
        }}
      />
      
      <WizardNavigation>
        <WizardButton 
          onClick={() => navigate('/tax')}
          leftIcon={<LeftArrowIcon />}
        >
          Back to Upload
        </WizardButton>
        <WizardButton 
          primary 
          onClick={saveAirdropConfig}
          rightIcon={<RightArrowIcon />}
        >
          Save and Continue
        </WizardButton>
      </WizardNavigation>
    </Container>
  );
};

export default AirdropConfig; 