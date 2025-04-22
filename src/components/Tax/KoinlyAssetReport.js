import React from 'react';
import styled from 'styled-components';
import { 
  isFullySupported,
  getAssetWarningType
} from '../../services/KoinlyAssetSupport';

const ReportContainer = styled.div`
  margin: 20px 0;
  padding: 20px;
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  font-family: ${props => props.theme.fonts.body};
`;

const SummaryStats = styled.div`
  margin-bottom: ${props => props.theme.spacing.large};
`;

const SectionTitle = styled.h3`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: ${props => props.theme.spacing.small};
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${props => props.theme.spacing.medium};
  margin-top: ${props => props.theme.spacing.medium};
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${props => props.theme.spacing.medium};
  border-radius: ${props => props.theme.borderRadius.small};
  text-align: center;
  background-color: ${props => {
    if (props.type === 'supported') return 'rgba(22, 199, 132, 0.2)';
    if (props.type === 'softWarning') return 'rgba(255, 199, 0, 0.2)';
    if (props.type === 'hardWarning') return 'rgba(234, 57, 67, 0.2)';
    if (props.type === 'unknown') return 'rgba(140, 140, 140, 0.2)';
    return 'rgba(140, 140, 140, 0.2)';
  }};
`;

const StatValue = styled.span`
  font-size: 24px;
  font-weight: ${props => props.theme.fontWeights.bold};
  margin-bottom: 5px;
  color: ${props => {
    if (props.type === 'supported') return props.theme.colors.accent.green;
    if (props.type === 'softWarning') return '#FFC700';
    if (props.type === 'hardWarning') return props.theme.colors.accent.red;
    if (props.type === 'unknown') return props.theme.colors.text.secondary;
    return props.theme.colors.text.secondary;
  }};
`;

const StatLabel = styled.span`
  color: ${props => props.theme.colors.text.primary};
`;

const AssetCategory = styled.div`
  margin-bottom: ${props => props.theme.spacing.large};
  padding: ${props => props.theme.spacing.medium};
  border-radius: ${props => props.theme.borderRadius.small};
  border: 1px solid ${props => {
    if (props.type === 'supported') return 'rgba(22, 199, 132, 0.3)';
    if (props.type === 'softWarning') return 'rgba(255, 199, 0, 0.3)';
    if (props.type === 'hardWarning') return 'rgba(234, 57, 67, 0.3)';
    if (props.type === 'unknown') return 'rgba(140, 140, 140, 0.3)';
    return 'rgba(140, 140, 140, 0.3)';
  }};
  background-color: ${props => {
    if (props.type === 'supported') return 'rgba(22, 199, 132, 0.05)';
    if (props.type === 'softWarning') return 'rgba(255, 199, 0, 0.05)';
    if (props.type === 'hardWarning') return 'rgba(234, 57, 67, 0.05)';
    if (props.type === 'unknown') return 'rgba(140, 140, 140, 0.05)';
    return 'rgba(140, 140, 140, 0.05)';
  }};
`;

const CategoryTitle = styled.h3`
  color: ${props => {
    if (props.type === 'supported') return props.theme.colors.accent.green;
    if (props.type === 'softWarning') return '#FFC700';
    if (props.type === 'hardWarning') return props.theme.colors.accent.red;
    if (props.type === 'unknown') return props.theme.colors.text.secondary;
    return props.theme.colors.text.secondary;
  }};
  margin-bottom: ${props => props.theme.spacing.small};
`;

const CategoryDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const AssetTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${props => props.theme.spacing.small};
  margin-top: ${props => props.theme.spacing.small};
`;

const AssetTag = styled.span`
  display: inline-block;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 14px;
  background-color: ${props => {
    if (props.type === 'supported') return 'rgba(22, 199, 132, 0.2)';
    if (props.type === 'softWarning') return 'rgba(255, 199, 0, 0.2)';
    if (props.type === 'hardWarning') return 'rgba(234, 57, 67, 0.2)';
    if (props.type === 'unknown') return 'rgba(140, 140, 140, 0.2)';
    return 'rgba(140, 140, 140, 0.2)';
  }};
  color: ${props => {
    if (props.type === 'supported') return props.theme.colors.accent.green;
    if (props.type === 'softWarning') return '#FFC700';
    if (props.type === 'hardWarning') return props.theme.colors.accent.red;
    if (props.type === 'unknown') return props.theme.colors.text.secondary;
    return props.theme.colors.text.secondary;
  }};
`;

const Recommendations = styled.div`
  margin-top: ${props => props.theme.spacing.large};
  padding: ${props => props.theme.spacing.medium};
  background-color: rgba(0, 230, 179, 0.05);
  border-radius: ${props => props.theme.borderRadius.small};
  border-left: 4px solid ${props => props.theme.colors.primary};
`;

const RecommendationsList = styled.ul`
  margin-top: ${props => props.theme.spacing.small};
  padding-left: 20px;
  color: ${props => props.theme.colors.text.primary};
`;

const RecommendationItem = styled.li`
  margin-bottom: ${props => props.theme.spacing.small};
`;

const KoinlyAssetReport = ({ timeline = [] }) => {
  // Extract all unique assets from the timeline
  const allAssets = React.useMemo(() => {
    const assets = new Set();
    
    if (timeline && Array.isArray(timeline)) {
      console.log('Processing timeline for assets:', {
        timelineLength: timeline.length,
        firstEvent: timeline[0],
        lastEvent: timeline[timeline.length - 1]
      });
      
      timeline.forEach(event => {
        // Check both data and display properties for currencies
        const currencies = [
          event.data?.sentCurrency,
          event.data?.receivedCurrency,
          event.data?.feeCurrency,
          event.display?.sentCurrency,
          event.display?.receivedCurrency,
          event.display?.feeCurrency
        ].filter(Boolean);
        
        currencies.forEach(currency => assets.add(currency));
      });
    }
    
    const assetArray = Array.from(assets).filter(asset => asset); // Remove empty values
    console.log('Extracted unique assets:', assetArray);
    return assetArray;
  }, [timeline]);
  
  // Categorize assets by support status
  const categorizedAssets = React.useMemo(() => {
    const categorized = {
      supported: allAssets.filter(asset => isFullySupported(asset)),
      softWarning: allAssets.filter(asset => getAssetWarningType(asset) === 'soft'),
      hardWarning: allAssets.filter(asset => getAssetWarningType(asset) === 'hard')
    };
    
    console.log('Categorized assets:', categorized);
    return categorized;
  }, [allAssets]);
  
  // Count transactions by asset support status
  const transactionCounts = React.useMemo(() => {
    const counts = {
      supported: 0,
      softWarning: 0,
      hardWarning: 0,
      total: timeline?.length || 0
    };
    
    if (timeline && Array.isArray(timeline)) {
      timeline.forEach(event => {
        // Check both data and display properties for currencies
        const assets = [
          event.data?.sentCurrency,
          event.data?.receivedCurrency,
          event.data?.feeCurrency,
          event.display?.sentCurrency,
          event.display?.receivedCurrency,
          event.display?.feeCurrency
        ].filter(asset => asset); // Remove empty values
        
        let hasHardWarning = assets.some(asset => getAssetWarningType(asset) === 'hard');
        let hasSoftWarning = assets.some(asset => getAssetWarningType(asset) === 'soft');
        
        // Prioritize the most severe issue for counting
        if (hasHardWarning) counts.hardWarning++;
        else if (hasSoftWarning) counts.softWarning++;
        else counts.supported++;
      });
    }
    
    console.log('Transaction counts:', counts);
    return counts;
  }, [timeline]);
  
  return (
    <ReportContainer>      
      <SummaryStats>
        <StatGrid>
          <StatItem type="supported">
            <StatValue>{transactionCounts.supported}</StatValue>
            <StatLabel>Fully Supported</StatLabel>
          </StatItem>
          <StatItem type="softWarning">
            <StatValue>{transactionCounts.softWarning}</StatValue>
            <StatLabel>Partial Support</StatLabel>
          </StatItem>
          <StatItem type="hardWarning">
            <StatValue>{transactionCounts.hardWarning}</StatValue>
            <StatLabel>Unsupported</StatLabel>
          </StatItem>
        </StatGrid>
      </SummaryStats>
      
      <AssetCategory type="supported">
        <CategoryTitle type="supported">Fully Supported Assets ({categorizedAssets.supported.length}) - {transactionCounts.supported} transactions</CategoryTitle>
        <CategoryDescription>These assets (and USDC) should be supported by Koinly and should import correctly with the correct pricing data.</CategoryDescription>
        <AssetTags>
          {categorizedAssets.supported.map(asset => (
            <AssetTag key={asset} type="supported">{asset}</AssetTag>
          ))}
        </AssetTags>
      </AssetCategory>
      
      <AssetCategory type="softWarning">
        <CategoryTitle type="softWarning">Assets with Partial Support ({categorizedAssets.softWarning.length}) - {transactionCounts.softWarning} transactions</CategoryTitle>
        <CategoryDescription>These assets can be uploaded to Koinly, but they may get tied to a different token that has the same name. You'll need to review these transactions.</CategoryDescription>
        <AssetTags>
          {categorizedAssets.softWarning.map(asset => (
            <AssetTag key={asset} type="softWarning">{asset}</AssetTag>
          ))}
        </AssetTags>
      </AssetCategory>
      
      <AssetCategory type="hardWarning">
        <CategoryTitle type="hardWarning">Unsupported Assets ({categorizedAssets.hardWarning.length}) - {transactionCounts.hardWarning} transactions</CategoryTitle>
        <CategoryDescription>Koinly may reject transactions with these assets. You'll need to handle these manually.</CategoryDescription>
        <AssetTags>
          {categorizedAssets.hardWarning.map(asset => (
            <AssetTag key={asset} type="hardWarning">{asset}</AssetTag>
          ))}
        </AssetTags>
      </AssetCategory>
      
      <Recommendations>
        <SectionTitle>Recommendations</SectionTitle>
        <RecommendationsList>
          <RecommendationItem><strong>For assets with partial support:</strong> After import, check that Koinly has correctly identified them. If not, you may need to manually edit the transactions to use the correct asset.</RecommendationItem>
          <RecommendationItem><strong>For unsupported assets:</strong> You'll need to manually add these transactions in Koinly. Consider using a placeholder asset and then editing it in Koinly.</RecommendationItem>
          <RecommendationItem><strong>For all problematic assets:</strong> Double-check cost basis values and ensure that buy/sell pairs are properly matched.</RecommendationItem>
          <RecommendationItem><strong>Consider using tags:</strong> Use the "Ignore" tag in Koinly for internal transfers involving problematic assets to prevent tax calculation issues.</RecommendationItem>
        </RecommendationsList>
      </Recommendations>
    </ReportContainer>
  );
};

export default KoinlyAssetReport; 