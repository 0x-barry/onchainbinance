import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { fetchAllFullyDilutedValuations } from '../utils/api';
import { COIN_NAMES } from '../utils/constants';
import GenslerAnimation from './GenslerAnimation';
import hlAnimatedGif from '../images/hl-animated.gif';
import adairImage from '../images/adair.jpg';

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

const Eyebrow = styled.h3`
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;
  font-family: ${props => props.theme.fonts.header};

  @media (min-width: 768px) {
    font-size: 1.25rem;
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

const SliderContainer = styled.div`
  width: 100%;
  margin-bottom: 2rem;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: 0px;
`;

const SliderInnerContainer = styled.div`
  padding: 1em 1rem 0.75rem 1rem;
  
  @media (min-width: 768px) {
    padding: 2rem 2rem 1rem 2rem;
  }
`;

const SliderLabel = styled.div`
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
`;

const Slider = styled.input`
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  background: ${props => props.theme.colors.background};
  outline: none;
  opacity: 1;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 8px;
    height: 20px;
    background: ${props => props.theme.colors.text.primary};
    cursor: pointer;
    border-radius: 0%;
  }

  &::-moz-range-thumb {
    width: 8px;
    height: 20px;
    background: ${props => props.theme.colors.primary};
    cursor: pointer;
    border-radius: 0%;
  }

  &::-webkit-slider-runnable-track {
    background: linear-gradient(to right, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primary} ${props => props.value * (props.isMaxiMode ? 1 : 100/51)}%, ${props => props.theme.colors.background} ${props => props.value * (props.isMaxiMode ? 1 : 100/51)}%, ${props => props.theme.colors.background} 100%);
  }

  &::-moz-range-progress {
    background-color: ${props => props.theme.colors.primary};
  }
`;

const SliderValue = styled.span`
  margin-left: 1rem;
  font-size: 0.9rem;
  min-width: 32px;
  color: ${props => props.theme.colors.text.primary};
  font-weight: bold;
`;

const ButtonRow = styled.div`
  display: flex;
  width: 100%;
`;

const PercentageButton = styled.button`
  padding: 0.25rem 0.5rem;
  background-color: ${props => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.active ? props.theme.colors.background : props.theme.colors.text.primary};
  border: 1px solid ${props => props.theme.colors.background};
  flex: 1 1 auto;
  margin: 1px;
  font-size: 0.8rem;
  box-sizing: border-box;
  border-radius: 0px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: ${props => props.active ? 'bold' : 'normal'};

  &:not(:last-child) {
    border-right: none;
  }

  &:hover {
    background-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.background};
    opacity: 0.8;
  }

  @media (min-width: 768px) {
    flex: 1 1 auto;
    margin: 0;
    font-size: 1rem;
    padding: 0.25rem 0.75rem;
  }
`;

const ChartContainer = styled.div`
  width: 100%;
  margin-top: 1rem;

  @media (min-width: 768px) {
    width: 80%;
  }
`;

const ChartRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const ChartLabelContainer = styled.div`
  display: flex;
  align-items: center;
  width: 140px;
  margin-right: 0.5rem;
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 140px;
    margin-right: 1rem;
  }
`;

const ChartLabel = styled.div`
  font-size: 0.9rem;
  text-align: right;
  margin-left: 0.25rem;

  @media (min-width: 768px) {
    font-size: 0.9rem;
    margin-left: 0.5rem;
  }
`;

const ChartBarContainer = styled.div`
  flex-grow: 1;
  display: flex;
  align-items: center;
`;

const ChartBar = styled.div`
  height: 20px;
  background-color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.secondary};
  transition: width 0.3s ease, background-color 0.3s ease;
`;

const ChartValue = styled.div`
  margin-left: 0.25rem;
  font-size: 0.8rem;
  min-width: 60px;
  text-align: right;

  @media (min-width: 768px) {
    margin-left: 0.5rem;
    font-size: 0.9rem;
    min-width: 70px;
  }
`;

const TOTAL_POINTS = 51362258; // Total number of Hyperliquid points

const eyebrowOptions = [
  "Points Calculator"
];

const SwitchContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1rem;
`;

const SwitchLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
`;

const SwitchInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchSlider = styled.span`
  position: relative;
  display: inline-block;
  width: 32px;
  height: 16px;
  background-color: #ccc;
  border-radius: 16px;
  margin-bottom: 8px;
  transition: 0.4s;

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

  ${SwitchInput}:checked + & {
    background-color: ${props => props.theme.colors.error};
  }

  ${SwitchInput}:checked + &:before {
    transform: translateX(16px);
  }
`;

const SwitchText = styled.span`
  font-size: 0.75rem;
  text-align: center;
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

function AnimatedValue({ value, displayMode, onToggle }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [color, setColor] = useState('white');
  const previousValue = useRef(value);

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

  const adairValue = displayValue / 800;

  return (
    <div>
      {displayMode === 'USD' ? (
        <ValueDisplay color={color}>
          ${displayValue.toLocaleString()}
        </ValueDisplay>
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

function MarketCapComparison() {
  const { coin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [state, setState] = useState(() => {
    const params = new URLSearchParams(location.search);
    let supplyAirdropped = parseInt(params.get('supplyAirdropped'), 10);

    if (isNaN(supplyAirdropped) || supplyAirdropped < 1) {
      supplyAirdropped = 51;
    } else if (supplyAirdropped > 100) {
      supplyAirdropped = 100;
    }

    const normalizedCoin = coin ? coin.charAt(0).toUpperCase() + coin.slice(1).toLowerCase() : '';
    const validCoin = COIN_NAMES.includes(normalizedCoin) ? normalizedCoin : 'Solana';

    return {
      selectedCoin: validCoin,
      pointsPercentage: supplyAirdropped,
      isMaxiMode: supplyAirdropped > 51 && supplyAirdropped <= 100,
    };
  });

  const { selectedCoin, pointsPercentage, isMaxiMode } = state;

  const [fdvData, setFDVData] = useState({});
  const [pointValue, setPointValue] = useState(null);
  const [error, setError] = useState(null);
  const [showGensler, setShowGensler] = useState(false);
  const [displayMode, setDisplayMode] = useState('USD');

  const randomEyebrow = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * eyebrowOptions.length);
    return eyebrowOptions[randomIndex];
  }, []);

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
    async function fetchData() {
      try {
        setError(null);
        const allFDVs = await fetchAllFullyDilutedValuations(COIN_NAMES);
        setFDVData(allFDVs);
      } catch (err) {
        setError('Failed to fetch fully diluted valuations. Please try again later.');
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const lowercaseCoin = selectedCoin.toLowerCase();
    navigate(`/points/${lowercaseCoin}?supplyAirdropped=${pointsPercentage}`, { replace: true });
  }, [selectedCoin, pointsPercentage, navigate]);

  useEffect(() => {
    if (fdvData[selectedCoin]) {
      const hlFDV = fdvData[selectedCoin].fdv * (pointsPercentage / 100);
      const value = hlFDV / TOTAL_POINTS;
      setPointValue(Math.round(value)); // Round to nearest dollar
    }
  }, [fdvData, selectedCoin, pointsPercentage]);

  const chartData = COIN_NAMES.map(coin => {
    const fdv = fdvData[coin] ? fdvData[coin].fdv : 0;
    const value = Math.round((fdv * (pointsPercentage / 100)) / TOTAL_POINTS); // Round to nearest dollar
    return { name: coin, value, fdv };
  }).sort((a, b) => b.fdv - a.fdv)
    .map(({ name, value }) => ({ name, value }));

  const maxValue = Math.max(...chartData.map(item => item.value));

  const percentageButtons = isMaxiMode 
    ? [10, 25, 33, 50, 66, 75, 90]
    : [10, 15, 20, 25, 33, 40, 51];

  const handleCoinChange = (newCoin) => {
    setState(prevState => ({ ...prevState, selectedCoin: newCoin }));
  };

  const handlePercentageChange = (newPercentage) => {
    setState(prevState => ({
      ...prevState,
      pointsPercentage: newPercentage,
      // Only change isMaxiMode if switching from non-Maxi to Maxi
      isMaxiMode: prevState.isMaxiMode ? prevState.isMaxiMode : newPercentage > 51 && newPercentage <= 100,
    }));
  };

  const handleMaxiModeChange = (newValue) => {
    if (newValue && !isMaxiMode) {
      setShowGensler(true);
    }
    setState(prevState => ({ 
      ...prevState, 
      isMaxiMode: newValue,
      // If turning off Maxi Mode, ensure percentage is at most 51
      pointsPercentage: newValue ? prevState.pointsPercentage : Math.min(prevState.pointsPercentage, 51)
    }));
  };

  const toggleDisplayMode = () => {
    setDisplayMode(prevMode => prevMode === 'USD' ? 'CRYPTO_ADAIR' : 'USD');
  };

  return (
    <Container>
      <AnimatedLogo src={hlAnimatedGif} alt="Animated HL Logo" />
      <Eyebrow>{randomEyebrow}</Eyebrow>
      <Title>Show me the value of <HighlightedSpan>points</HighlightedSpan> with the FDV of</Title>
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
          />
        </ResultContainer>
      )}
      <SliderContainer>
        <SliderInnerContainer>
        <SliderLabel>Token Supply Dropped to Points Holders</SliderLabel>
        <SliderRow>
          <Slider
            type="range"
            min="1"
            max={isMaxiMode ? "100" : "51"}
            value={pointsPercentage}
            onChange={(e) => handlePercentageChange(Number(e.target.value))}
            isMaxiMode={isMaxiMode}
          />
          <SliderValue>{pointsPercentage}%</SliderValue>
        </SliderRow>
        <ButtonRow>
          {percentageButtons.map(percent => (
            <PercentageButton
              key={percent}
              active={pointsPercentage === percent}
              onClick={() => handlePercentageChange(percent)}
            >
              {percent}%
            </PercentageButton>
          ))}
        </ButtonRow>
        <SwitchContainer>
          <SwitchLabel>
            <SwitchInput 
              type="checkbox" 
              checked={isMaxiMode}
              onChange={(e) => handleMaxiModeChange(e.target.checked)}
            />
            <SwitchSlider />
            <SwitchText>Decentralization Maxi Mode</SwitchText>
          </SwitchLabel>
        </SwitchContainer>
        </SliderInnerContainer>
      </SliderContainer>
      
      <Eyebrow>Point Value With FDV Of</Eyebrow>
      <ChartContainer>
        {chartData.map(item => (
          <ChartRow key={item.name}>
            <ChartLabelContainer>
              <CoinLogo src={fdvData[item.name]?.image} alt={`${item.name} logo`} />
              <ChartLabel>{item.name}</ChartLabel>
            </ChartLabelContainer>
            <ChartBarContainer>
              <ChartBar 
                style={{ width: `${(item.value / maxValue) * 100}%` }}
                active={item.name === selectedCoin}
              />
              <ChartValue>${item.value.toLocaleString()}</ChartValue>
            </ChartBarContainer>
          </ChartRow>
        ))}
      </ChartContainer>
      <GenslerAnimation trigger={showGensler} />
    </Container>
  );
}

const ErrorMessage = styled.div`
  color: red;
  margin-top: 1rem;
`;

const GlobalStyle = createGlobalStyle`
  ${StyledSelect} option {
    font-size: 1rem;
    padding: 0.5rem 1rem;
    background-color: white;
    color: ${props => props.theme.colors.text.primary};

    &:hover {
      background-color: ${props => props.theme.colors.primary};
    }
  }
  
  ${StyledSelect} option::before {
    content: '';
    display: inline-block;
    width: 20px;
    height: 20px;
    margin-right: 0.5rem;
    border-radius: 50%;
    background-image: url(attr(data-image));
    background-size: cover;
    vertical-align: middle;
  }
`;

export default MarketCapComparison;