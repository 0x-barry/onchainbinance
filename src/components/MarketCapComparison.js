import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { fetchAllFullyDilutedValuations } from '../utils/api';
import { COIN_NAMES, TOTAL_POINTS, POINTS_ALLOCATION, COINS } from '../utils/constants';
import hlAnimatedGif from '../images/hl-animated.gif';
import adairImage from '../images/adair.jpg';

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  color: ${props => props.theme.colors.text.primary};

  -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
      box-sizing: border-box;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const Title = styled.h1`
  font-size: 2.25rem;
  margin-bottom: 1rem;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const HighlightedSpan = styled.span`
  color: ${props => props.theme.colors.primary};
`;

const SelectWrapper = styled.div`
  position: relative;
  display: inline-block;
  width: 100%;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    width: 80%;
  }
`;

const StyledSelect = styled.div`
  font-size: 2.25rem;
  padding: 0.75rem 1.5rem;
  text-align: center;
  font-family: ${props => props.theme.fonts.body};
  color: ${props => props.theme.colors.text.primary};
  background-color: ${props => props.theme.colors.secondary};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &::after {
    content: '▼';
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
  }

  @media (min-width: 768px) {
    font-size: 3rem;
    padding: 1rem 1.5rem;
  }
`;

const OptionsList = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.secondary};
  max-height: 300px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin: 0;
  z-index: 1;
`;

const Option = styled.li`
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  cursor: pointer;

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
  }
`;

const CoinLogo = styled.img`
  width: 30px;
  height: 30px;
  margin-right: 1rem;
  opacity: ${props => props.$isBelow ? 0.33 : 1};
`;

const ResultContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 0rem;
  margin-bottom: 2rem;

  @media (min-width: 768px) {
    margin-top: 1rem;
    margin-bottom: 3rem;
  }
`;

const ValueDisplay = styled.div`
  font-size: 2.75rem;
  font-weight: bold;
  color: ${props => props.color};
  transition: color 0.5s ease-out;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const ToggleContainer = styled.div`
  width: 100%;
  margin-bottom: 2rem;
  padding: 1.5rem;
`;

const ToggleRow = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SwitchLabel = styled.button`
  font-size: 0.875rem;
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.text.secondary};
  cursor: pointer;
  transition: color 0.2s ease;
  background: none;
  border: none;
  padding: 0;
`;

const SwitchContainer = styled.label`
  display: flex;
  align-items: center;
  margin: 0 1rem;
  cursor: pointer;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
`;

const SwitchSlider = styled.span`
  position: relative;
  display: inline-block;
  width: 32px;
  height: 16px;
  background-color: #ccc;
  border-radius: 16px;
  margin: 0 0.5rem;
  transition: 0.4s;
  cursor: pointer;

  &:before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    border-radius: 50%;
    transition: 0.4s;
  }

  input:checked + & {
    background-color: ${props => props.theme.colors.primary};
  }

  input:checked + &:before {
    transform: translateX(16px);
  }
`;

// Add this new styled component for the animated GIF
const AnimatedLogo = styled.img`
  width: 25px;  // Adjust the size as needed
  height: auto;
`;

const CurrencyToggle = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.primary};
  cursor: pointer;
  font-size: 0.8rem;
  margin-top: 0.5rem;
  text-decoration: underline;
  display: block;
  margin-left: auto;
  margin-right: auto;
`;

const HistogramContainer = styled.div`
  display: flex;
  align-items: center;
`;

const AdairValue = styled(ValueDisplay)`
  margin-right: 0.75rem;
`;

const AdairImageContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
`;

const AdairImage = styled.img`
  width: 25px;
  height: 25px;
  margin: 2px;
  border-radius: 50%;
  object-fit: cover;
`;

const ChartContainer = styled.div`
  width: 100%;
  margin-top: 2rem;
  padding-right: 120px;
  box-sizing: border-box;
`;

const ChartRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const ChartLabelContainer = styled.div`
  display: flex;
  align-items: center;
  width: 120px;
  margin-right: 1rem;
`;

const ChartLabel = styled.span`
  font-size: 1rem;
  color: ${props => props.$isBelow ? props.theme.colors.text.secondary : 'inherit'};
`;

const ChartBarContainer = styled.div`
  flex: 1;
  position: relative;
`;

const ChartBar = styled.div`
  height: 24px;
  background-color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.secondary};
  transition: width 0.3s ease-out;
`;

const ChartValue = styled.span`
  position: absolute;
  right: -120px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.9rem;
  color: ${props => props.$isBelow ? props.theme.colors.text.secondary : 'inherit'};
  white-space: nowrap;
`;

const Eyebrow = styled.h3`
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;
  font-family: ${props => props.theme.fonts.header};

  @media (min-width: 768px) {
    font-size: 1.25rem;
  }
`;

const MathToggle = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  margin: 1rem auto;
  padding: 0.5rem 1rem;
  transition: color 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const MathArrow = styled.span`
  margin-left: 0.5rem;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

const MathContent = styled.div`
  max-height: ${props => props.$isOpen ? '500px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
  background-color: ${props => props.theme.colors.secondary};
  margin: 0 auto;
  width: 100%;
  border-radius: 4px;
`;

const MathInner = styled.div`
  padding: 1.5rem;
  font-family: ${props => props.theme.fonts.mono};
  font-size: 0.875rem;
  line-height: 1.6;
`;

const MathLine = styled.div`
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const MathHighlight = styled.span`
  color: ${props => props.theme.colors.primary};
`;

const BrokenChartBar = styled(ChartBar)`
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: -10px;
    height: 100%;
    width: 20px;
    background: repeating-linear-gradient(
      45deg,
      ${props => props.$active ? props.theme.colors.primary : props.theme.colors.secondary},
      ${props => props.$active ? props.theme.colors.primary : props.theme.colors.secondary} 5px,
      transparent 5px,
      transparent 12px
    );
  }
`;

const ChartSectionHeader = styled.h3`
  font-size: 1rem;
  margin: 3rem 0 1rem;
  text-align: center;
  color: ${props => props.theme.colors.text.secondary};
  width: calc(100% + 120px);  // Include the padding width
  position: relative;
`;

const Multiplier = styled.span`
  color: ${props => props.$isBelow ? props.theme.colors.text.secondary : props.theme.colors.primary};
  margin-left: 0.75rem;
`;

function CustomSelect({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <SelectWrapper ref={selectRef}>
      <StyledSelect onClick={() => setIsOpen(!isOpen)}>
        <CoinLogo src={options.find(opt => opt.value === value)?.image} alt={`${value} logo`} />
        {value}
      </StyledSelect>
      {isOpen && (
        <OptionsList>
          {options.map((option) => (
            <Option
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <CoinLogo src={option.image} alt={`${option.value} logo`} />
              {option.value}
            </Option>
          ))}
        </OptionsList>
      )}
    </SelectWrapper>
  );
}

function AnimatedValue({ value, displayMode, onToggle, fdvData }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [color, setColor] = useState('white');
  const previousValue = useRef(value);

  // Calculate adairValue (1 ADAIR = $100,000)
  const adairValue = value / 100000;

  useEffect(() => {
    if (value !== previousValue.current) {
      setColor(value > previousValue.current ? '#00e6b3' : 'red');
      animateValue(previousValue.current, value, 250);
      const colorResetTimer = setTimeout(() => setColor('white'), 250);
      previousValue.current = value;
      return () => clearTimeout(colorResetTimer);
    }
  }, [value]);

  const animateValue = (start, end, duration) => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayValue(Math.floor(progress * (end - start) + start));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  };

  const hypePrice = fdvData['Hyperliquid']?.price || 0;
  const multiple = hypePrice > 0 ? (value / hypePrice).toFixed(1) : '0.0';

  return (
    <div>
      {displayMode === 'USD' ? (
        <>
          <ValueDisplay color={color}>
            ${displayValue.toLocaleString()}
            <Multiplier $isBelow={value < (fdvData['Hyperliquid']?.price || 0)}>
              (×{multiple})
            </Multiplier>
          </ValueDisplay>
        </>
      ) : (
        <HistogramContainer>
          <AdairValue color={color}>
            {adairValue.toFixed(2)}
          </AdairValue>
          <AdairImageContainer>
            {Array.from({ length: Math.floor(adairValue) }).map((_, index) => (
              <AdairImage key={index} src={adairImage} alt="CRYPTO_ADAIR" />
            ))}
            {(adairValue % 1) > 0 && (
              <AdairImage 
                src={adairImage} 
                alt="CRYPTO_ADAIR" 
                style={{ 
                  clipPath: `inset(0 ${100 - ((adairValue % 1) * 100)}% 0 0)` 
                }}
              />
            )}
          </AdairImageContainer>
        </HistogramContainer>
      )}
      <CurrencyToggle onClick={onToggle}>
        {displayMode === 'USD' ? 'USD' : 'CRYPTO_ADAIR'}
      </CurrencyToggle>
    </div>
  );
}

const ORIGINAL_MAX_SUPPLY = 1000000000; // 1 billion tokens

function MarketCapComparison() {
  const { coin: urlCoin } = useParams();
  const navigate = useNavigate();
  
  const [fdvData, setFdvData] = useState({});
  const [pointValue, setPointValue] = useState(null);
  const [error, setError] = useState(null);
  const [showMath, setShowMath] = useState(false);

  const [state, setState] = useState(() => ({
    selectedCoin: 'Solana',
    showHype: true,
    useMarketCap: true
  }));

  const { selectedCoin, showHype, useMarketCap } = state;

  const coinOptions = useMemo(() => 
    COIN_NAMES.map(coin => ({
      value: coin,
      image: fdvData[coin]?.image,
      fdv: fdvData[coin]?.fdv || 0
    }))
    .sort((a, b) => b.fdv - a.fdv),
    [fdvData]
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAllFullyDilutedValuations(Object.keys(COINS));
        console.log('Fetched data:', data);
        setFdvData(data);
      } catch (error) {
        console.error('Fetch error:', error);
        setError('Failed to fetch market data');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const lowercaseCoin = selectedCoin.toLowerCase();
    navigate(`/calculator/${lowercaseCoin}`, { replace: true });
  }, [selectedCoin, navigate]);

  useEffect(() => {
    if (fdvData[selectedCoin]) {
      const baseValue = useMarketCap ? 
        fdvData[selectedCoin].marketCap : 
        fdvData[selectedCoin].fdv;
      
      const hlData = fdvData['Hyperliquid'];
      if (!hlData) return;

      let value;
      if (showHype) {
        if (useMarketCap) {
          // HYPE & MC: MC ÷ current circulating HYPE supply
          const circulatingSupply = hlData.circulatingSupply || 0;
          value = baseValue / circulatingSupply;
        } else {
          // HYPE & FDV: FDV ÷ current total HYPE supply
          const totalSupply = hlData.totalSupply || hlData.maxSupply || 0;
          value = baseValue / totalSupply;
        }
      } else {
        if (useMarketCap) {
          // Points & MC
          const circulatingSupply = hlData.circulatingSupply || 0;
          const pointsAllocationValue = POINTS_ALLOCATION * ORIGINAL_MAX_SUPPLY;
          const circulatingPointsAllocation = pointsAllocationValue / circulatingSupply;
          value = (baseValue * circulatingPointsAllocation) / TOTAL_POINTS;
        } else {
          // Points & FDV: (FDV × Points allocation) ÷ Total points
          value = (baseValue * POINTS_ALLOCATION) / TOTAL_POINTS;
        }
      }
      
      setPointValue(Math.round(value));
    }
  }, [fdvData, selectedCoin, showHype, useMarketCap]);

  const calculateValue = useCallback((comparisonValue, coinData) => {
    const hlData = fdvData['Hyperliquid'];
    if (!hlData) return 0;

    if (state.showHype) {
      if (state.useMarketCap) {
        // HYPE & MC: MC ÷ current circulating HYPE supply
        const circulatingSupply = hlData.circulatingSupply || 0;
        console.log('Calculate Value - HYPE & MC:', {
          coin: coinData.name,
          marketCap: comparisonValue,  // This should be the comparison coin's market cap
          hlMarketCap: hlData.marketCap,  // Log Hyperliquid's market cap for verification
          circulatingSupply,
          result: comparisonValue / circulatingSupply
        });
        return comparisonValue / circulatingSupply;
      } else {
        // HYPE & FDV: FDV ÷ current total HYPE supply
        const totalSupply = hlData.totalSupply || hlData.maxSupply || 0;
        return comparisonValue / totalSupply;
      }
    } else {
      if (state.useMarketCap) {
        // Points & MC
        const circulatingSupply = hlData?.circulatingSupply || 0;
        const pointsAllocationValue = POINTS_ALLOCATION * ORIGINAL_MAX_SUPPLY;
        const circulatingPointsAllocation = pointsAllocationValue / circulatingSupply;
        return (comparisonValue * circulatingPointsAllocation) / TOTAL_POINTS;
      } else {
        // Points & FDV: (FDV × Points allocation) ÷ Total points
        return (comparisonValue * POINTS_ALLOCATION) / TOTAL_POINTS;
      }
    }
  }, [state.showHype, state.useMarketCap, fdvData]);

  const chartData = useMemo(() => {
    const data = Object.keys(COINS)
      .filter(coin => coin !== 'Hyperliquid')
      .map(coin => {
        const coinData = fdvData[coin];
        if (!coinData) return { name: coin, value: 0 };

        const comparisonValue = state.useMarketCap ? coinData.marketCap : coinData.fdv;
        const value = calculateValue(comparisonValue, coinData);
        
        return { 
          name: coin, 
          value: Math.round(value)
        };
      })
      .sort((a, b) => b.value - a.value);

    // Find Ethereum's value to use as the base for relative sizing
    const ethereumValue = data.find(item => item.name === 'Ethereum')?.value || 0;
    
    return data.map(item => ({
      ...item,
      relativeValue: (item.value / ethereumValue) * 100
    }));
  }, [fdvData, state.useMarketCap, calculateValue]);

  const maxValue = Math.max(...chartData.map(item => item.value));

  const handleCoinChange = (newCoin) => {
    if (newCoin === 'Drift') {
      window.location.href = 'https://multicoin.capital';
    } else {
      setState(prev => ({ ...prev, selectedCoin: newCoin }));
    }

  };

  const handleHypeToggle = () => {
    console.log('Toggling HYPE, current state:', state.showHype);
    setState(prev => {
      const newState = { ...prev, showHype: !prev.showHype };
      console.log('New state will be:', newState);
      return newState;
    });
  };

  const handleMarketCapToggle = () => {
    console.log('Toggling Market Cap, current state:', state.useMarketCap);
    setState(prev => {
      const newState = { ...prev, useMarketCap: !prev.useMarketCap };
      console.log('New state will be:', newState);
      return newState;
    });
  };

  const toggleDisplayMode = () => {
    setDisplayMode(prevMode => prevMode === 'USD' ? 'CRYPTO_ADAIR' : 'USD');
  };

  const [displayMode, setDisplayMode] = useState('USD');

  const titleText = useMemo(() => {
    const tokenType = state.showHype ? '$HYPE' : 'points';
    const valueType = state.useMarketCap ? 'market cap of' : 'FDV of';
    return (
      <>
        Show me the value of <HighlightedSpan>{tokenType}</HighlightedSpan> with the {valueType}
      </>
    );
  }, [state.showHype, state.useMarketCap]);

  const mathExplanation = useMemo(() => {
    const coinData = fdvData[selectedCoin];
    if (!coinData) return null;

    const hlData = fdvData['Hyperliquid'];
    const ORIGINAL_MAX_SUPPLY = 1000000000; // 1 billion tokens
    
    if (state.showHype) {
      if (state.useMarketCap) {
        // HYPE & MC
        const circulatingSupply = hlData?.circulatingSupply || 0;
        return (
          <>
            <MathLine>
              1. Market Cap of {selectedCoin}: <MathHighlight>${coinData.marketCap?.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              2. Current circulating HYPE supply: <MathHighlight>{circulatingSupply.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              3. Formula: Market Cap ÷ current circulating HYPE supply
            </MathLine>
            <MathLine>
              4. Result: <MathHighlight>${(coinData.marketCap / circulatingSupply).toFixed(2)}</MathHighlight> per HYPE
            </MathLine>
          </>
        );
      } else {
        // HYPE & FDV
        const totalSupply = hlData?.totalSupply || hlData?.maxSupply || 0;
        return (
          <>
            <MathLine>
              1. FDV of {selectedCoin}: <MathHighlight>${coinData.fdv?.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              2. Total HYPE supply: <MathHighlight>{totalSupply.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              3. Formula: FDV ÷ Total HYPE supply
            </MathLine>
            <MathLine>
              4. Result: <MathHighlight>${(coinData.fdv / totalSupply).toFixed(2)}</MathHighlight> per HYPE
            </MathLine>
          </>
        );
      }
    } else {
      if (state.useMarketCap) {
        // Points & MC
        const circulatingSupply = hlData?.circulatingSupply || 0;
        const pointsAllocationValue = POINTS_ALLOCATION * ORIGINAL_MAX_SUPPLY;
        const circulatingPointsAllocation = pointsAllocationValue / circulatingSupply;
        
        return (
          <>
            <MathLine>
              1. Market Cap of {selectedCoin}: <MathHighlight>${coinData.marketCap?.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              2. Current HYPE circulating: <MathHighlight>{circulatingSupply.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              3. Points Allocation of Circulating HYPE: <MathHighlight>{(circulatingPointsAllocation * 100).toFixed(1)}% (310,000,000 HYPE)</MathHighlight>
            </MathLine>
            <MathLine>
              4. Total Points: <MathHighlight>{TOTAL_POINTS.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              5. Formula: Market Cap × (Points allocation of circulating HYPE) ÷ Total points
            </MathLine>
            <MathLine>
              6. Result: <MathHighlight>${(coinData.marketCap * circulatingPointsAllocation / TOTAL_POINTS).toFixed(2)}</MathHighlight> per point
            </MathLine>
          </>
        );
      } else {
        // Points & FDV
        return (
          <>
            <MathLine>
              1. FDV of {selectedCoin}: <MathHighlight>${coinData.fdv?.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              2. Points allocation of total HYPE supply: <MathHighlight>{(POINTS_ALLOCATION * 100).toFixed(1)}%</MathHighlight>
            </MathLine>
            <MathLine>
              3. Total points: <MathHighlight>{TOTAL_POINTS.toLocaleString()}</MathHighlight>
            </MathLine>
            <MathLine>
              4. Formula: FDV × (Points allocation of HYPE supply) ÷ Total points
            </MathLine>
            <MathLine>
              5. Result: <MathHighlight>${(coinData.fdv * POINTS_ALLOCATION / TOTAL_POINTS).toFixed(2)}</MathHighlight> per point
            </MathLine>
          </>
        );
      }
    }
  }, [state.showHype, state.useMarketCap, selectedCoin, fdvData]);

  // Add these logs to see what's happening in the render
  console.log('Current state:', state);
  console.log('FDV data:', fdvData);
  console.log('Selected coin data:', fdvData[selectedCoin]);
  
  // Also log the calculated values
  const baseValue = state.useMarketCap ? 
    fdvData[selectedCoin]?.marketCap : 
    fdvData[selectedCoin]?.fdv;
  console.log('Base value:', baseValue);

  return (
    <Container>
      <AnimatedLogo src={hlAnimatedGif} alt="Animated HL Logo" />
      <Eyebrow>Calculator</Eyebrow>
      <Title>{titleText}</Title>
      <CustomSelect 
        value={selectedCoin} 
        onChange={handleCoinChange}
        options={coinOptions}
      />
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {pointValue && pointValue !== null && (
        <ResultContainer>
          <AnimatedValue 
            value={pointValue} 
            displayMode={displayMode}
            onToggle={toggleDisplayMode}
            fdvData={fdvData}
          />
        </ResultContainer>
      )}
      <ToggleContainer>
        <ToggleRow>
          <SwitchLabel 
            as="button"
            $active={!state.showHype}
            onClick={() => setState(prev => ({ ...prev, showHype: false }))}
          >
            Points
          </SwitchLabel>
          <SwitchContainer>
            <SwitchInput 
              type="checkbox" 
              checked={state.showHype}
              onChange={handleHypeToggle}
            />
            <SwitchSlider />
          </SwitchContainer>
          <SwitchLabel 
            as="button"
            $active={state.showHype}
            onClick={() => setState(prev => ({ ...prev, showHype: true }))}
          >
            $HYPE
          </SwitchLabel>
        </ToggleRow>
        
        <ToggleRow>
          <SwitchLabel 
            as="button"
            $active={!state.useMarketCap}
            onClick={() => setState(prev => ({ ...prev, useMarketCap: false }))}
          >
            FDV
          </SwitchLabel>
          <SwitchContainer>
            <SwitchInput 
              type="checkbox" 
              checked={state.useMarketCap}
              onChange={handleMarketCapToggle}
            />
            <SwitchSlider />
          </SwitchContainer>
          <SwitchLabel 
            as="button"
            $active={state.useMarketCap}
            onClick={() => setState(prev => ({ ...prev, useMarketCap: true }))}
          >
            Market Cap
          </SwitchLabel>
        </ToggleRow>
      </ToggleContainer>
      
      <MathToggle onClick={() => setShowMath(!showMath)}>
        Show Me The Math
        <MathArrow $isOpen={showMath}>▼</MathArrow>
      </MathToggle>

      <MathContent $isOpen={showMath}>
        <MathInner>
          {mathExplanation}
        </MathInner>
      </MathContent>

      <ChartContainer>
        {chartData.map((item, index) => {
          const hypePrice = fdvData['Hyperliquid']?.price || 0;
          const isBelow = item.value < hypePrice;
          const multiple = hypePrice > 0 ? (item.value / hypePrice).toFixed(1) : '0.0';
          
          // Show RIP header only before the first below-threshold item
          const showRipHeader = isBelow && 
            index > 0 && 
            chartData[index - 1].value >= hypePrice;

          return (
            <>
              {showRipHeader && <ChartSectionHeader>💀 Rest in Peace 💀</ChartSectionHeader>}
              <ChartRow key={item.name}>
                <ChartLabelContainer>
                  <CoinLogo 
                    src={fdvData[item.name]?.image} 
                    alt={`${item.name} logo`} 
                    $isBelow={isBelow}
                  />
                  <ChartLabel $isBelow={isBelow}>{item.name}</ChartLabel>
                </ChartLabelContainer>
                <ChartBarContainer>
                  {item.name === 'Bitcoin' ? (
                    <BrokenChartBar 
                      $active={item.name === selectedCoin}
                    />
                  ) : (
                    <ChartBar 
                      style={{ width: `${Math.min(item.relativeValue, 100)}%` }}
                      $active={item.name === selectedCoin}
                    />
                  )}
                  <ChartValue $isBelow={isBelow}>
                    ${item.value.toLocaleString()} 
                    <Multiplier $isBelow={isBelow}>(×{multiple})</Multiplier>
                  </ChartValue>
                </ChartBarContainer>
              </ChartRow>
            </>
          );
        })}
      </ChartContainer>
    </Container>
  );
}

const ErrorMessage = styled.div`
  color: red;
  margin-top: 1rem;
`;

export default MarketCapComparison;