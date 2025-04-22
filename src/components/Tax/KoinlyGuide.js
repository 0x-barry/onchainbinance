import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import KoinlyAssetReport from './KoinlyAssetReport';
import { useNavigate, useLocation } from 'react-router-dom';
import hlAnimatedGif from '../../images/hl-animated.gif';

// Styled components for the animated logo and eyebrow
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

const GuideContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  color: ${props => props.theme.colors.text.primary};
  font-family: ${props => props.theme.fonts.body};
`;

const Title = styled.h1`
  font-size: 2.25rem;
  margin-bottom: 3rem;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const Section = styled.section`
  margin-bottom: ${props => props.theme.spacing.large};
  padding: ${props => props.theme.spacing.large};
  background-color: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
`;

const SectionTitle = styled.h2`
  color: ${props => props.theme.colors.text.primary};
  font-family: ${props => props.theme.fonts.header};
  margin-bottom: ${props => props.theme.spacing.medium};
  border-bottom: 1px solid ${props => props.theme.colors.primary};
  padding-bottom: ${props => props.theme.spacing.small};
`;

const CollapsibleSection = styled(Section)`
  transition: all 0.3s ease;
`;

const CollapsibleTitle = styled(SectionTitle)`
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &:after {
    content: '${props => props.$isExpanded ? '▲' : '▼'}';
    font-size: 0.8rem;
    margin-left: 0.5rem;
    transition: transform 0.3s ease;
  }
  
  &:hover {
    opacity: 0.9;
  }
`;

const CollapsibleContent = styled.div`
  max-height: ${props => props.$isExpanded ? '3000px' : '0'};
  overflow: hidden;
  transition: max-height 0.5s ease;
  opacity: ${props => props.$isExpanded ? '1' : '0'};
  transition: opacity 0.3s ease, max-height 0.5s ease;
`;

const SubsectionTitle = styled.h3`
  color: ${props => props.theme.colors.primary};
  margin-top: ${props => props.theme.spacing.medium};
  margin-bottom: ${props => props.theme.spacing.small};
`;

const OrderedList = styled.ol`
  margin: ${props => props.theme.spacing.medium} 0;
  padding-left: 20px;
`;

const UnorderedList = styled.ul`
  margin: ${props => props.theme.spacing.medium} 0;
  padding-left: 20px;
`;

const ListItem = styled.li`
  margin-bottom: ${props => props.theme.spacing.small};
`;

const AssetList = styled.div`
  margin-bottom: ${props => props.theme.spacing.large};
`;

const AssetListTitle = styled.h3`
  color: ${props => props.theme.colors.primary};
  font-family: ${props => props.theme.fonts.header};
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const AssetTags = styled.div`
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const AssetTag = styled.span`
  background-color: ${props => {
    if (props.type === 'soft') return 'rgba(255, 199, 0, 0.2)';
    if (props.type === 'hard') return 'rgba(234, 57, 67, 0.2)';
    if (props.type === 'unknown') return 'rgba(140, 140, 140, 0.2)';
    return props.theme.colors.secondary;
  }};
  color: ${props => {
    if (props.type === 'soft') return '#FFC700';
    if (props.type === 'hard') return props.theme.colors.accent.red;
    if (props.type === 'unknown') return props.theme.colors.text.secondary;
    return props.theme.colors.text.primary;
  }};
  padding: 0.25rem 0.5rem;
  border-radius: ${props => props.theme.borderRadius.small};
  margin-right: ${props => props.theme.spacing.small};
  margin-bottom: 0.5rem;
  display: inline-block;
  border: 1px solid ${props => {
    if (props.type === 'soft') return 'rgba(255, 199, 0, 0.3)';
    if (props.type === 'hard') return 'rgba(234, 57, 67, 0.3)';
    if (props.type === 'unknown') return 'rgba(140, 140, 140, 0.3)';
    return props.theme.colors.secondary;
  }};
`;

const AssetListDescription = styled.p`
  color: ${props => props.theme.colors.text.secondary};
`;

const KoinlyGuide = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if timeline data exists in location state
  // If not, redirect to upload page
  useEffect(() => {
    if (!location.state?.timeline) {
      console.warn('Attempted to access KoinlyGuide without timeline data, redirecting to upload');
      navigate('/tax');
    } else {
      console.log('Timeline data received:', {
        timelineLength: location.state.timeline.length,
        firstEvent: location.state.timeline[0],
        lastEvent: location.state.timeline[location.state.timeline.length - 1],
        sampleEvent: location.state.timeline[0] ? {
          eventType: location.state.timeline[0].eventType,
          data: location.state.timeline[0].data,
          display: location.state.timeline[0].display,
          time: location.state.timeline[0].time
        } : null
      });
    }
  }, [location.state, navigate]);
  
  // Get timeline from location state (will be undefined if not provided)
  const timeline = location.state?.timeline || [];
  
  // Get problematic assets from localStorage
  const softWarningAssets = React.useMemo(() => {
    try {
      const assets = localStorage.getItem('koinlySoftWarningAssets');
      console.log('Soft warning assets from localStorage:', assets);
      return assets ? JSON.parse(assets) : [];
    } catch (error) {
      console.error('Error parsing soft warning assets:', error);
      return [];
    }
  }, []);
  
  const hardWarningAssets = React.useMemo(() => {
    try {
      const assets = localStorage.getItem('koinlyHardWarningAssets');
      console.log('Hard warning assets from localStorage:', assets);
      return assets ? JSON.parse(assets) : [];
    } catch (error) {
      console.error('Error parsing hard warning assets:', error);
      return [];
    }
  }, []);
  
  // State to track which sections are expanded
  const [expandedSections, setExpandedSections] = useState({
    intro: true,  // Keep intro always expanded
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    troubleshooting: false
  });
  
  // Toggle expanded state for a section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // If we're in the process of redirecting, show minimal content
  if (!location.state?.timeline) {
    return <GuideContainer>Redirecting...</GuideContainer>;
  }
  
  return (
    <GuideContainer>
        <AnimatedLogo src={hlAnimatedGif} alt="Hyperliquid Logo" />
        <Title>Uploading to Koinly & Next Steps</Title>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.intro} onClick={() => toggleSection('intro')}>
          Transaction Scorecard (Updated 3/16/2025)
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.intro}>
          <p>Unfortunately Koinly doesn't support all Hyperliquid spot assets.</p>
          <p>In most cases, this shouldn't be too much of a problem.</p>
          <p>You'll want to keep an eye on transactions that don't get imported - as well as the cost basis for assets that get uploaded, but incorrectly tied to a different token.</p>
          <KoinlyAssetReport timeline={timeline} />
        </CollapsibleContent>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.step1} onClick={() => toggleSection('step1')}>
          Step 1: Handle Unsupported Assets
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.step1}>
          <p>For transactions involving unsupported assets, we've generated two separate CSV files:</p>
          <OrderedList>
            <ListItem>
              <strong>Main CSV (hyperliquid_transactions_koinly.csv)</strong>
              <ul>
                <li>Contains all your transactions with original token names</li>
                <li>Upload this file to Koinly first</li>
              </ul>
            </ListItem>
            <ListItem>
              <strong>Unsupported Assets CSV (hyperliquid_transactions_koinly_unsupported_assets.csv)</strong>
              <ul>
                <li>Contains only transactions involving unsupported assets</li>
                <li>Uses NULL prefixes (e.g., NULL901, NULL902) for unsupported tokens</li>
                <li>Original token names are preserved in the transaction descriptions</li>
                <li>Review this file before uploading to ensure the NULL mappings are consistent</li>
              </ul>
            </ListItem>
          </OrderedList>
          
          <SubsectionTitle>Steps to Follow:</SubsectionTitle>
          <OrderedList>
            <ListItem>Upload the main CSV file (hyperliquid_transactions_koinly.csv) to Koinly first</ListItem>
            <ListItem>Review the unsupported assets CSV to familiarize yourself with the NULL mappings:</ListItem>
            <UnorderedList>
              <ListItem>Each unsupported token has been assigned a consistent NULL number (starting from NULL901)</ListItem>
              <ListItem>The original token names are preserved in the transaction descriptions</ListItem>
              <ListItem>Make note of which NULL number corresponds to which token</ListItem>
            </UnorderedList>
            <ListItem>Upload the unsupported assets CSV to Koinly</ListItem>
            <ListItem>After uploading, verify that:
              <UnorderedList>
                <ListItem>The NULL prefixes are consistent across all transactions</ListItem>
                <ListItem>The amounts and dates match your records</ListItem>
                <ListItem>The transaction descriptions clearly indicate the actual token names</ListItem>
              </UnorderedList>
            </ListItem>
          </OrderedList>
          
          {hardWarningAssets.length > 0 && (
            <AssetList>
              <AssetListTitle>Unsupported Assets in Your Transactions:</AssetListTitle>
              <AssetTags>
                {hardWarningAssets.map(asset => (
                  <AssetTag key={asset} type="hard">{asset}</AssetTag>
                ))}
              </AssetTags>
              <AssetListDescription>
                These assets are not directly supported by Koinly. Check the unsupported assets CSV to see how they've been mapped to NULL prefixes.
              </AssetListDescription>
            </AssetList>
          )}
        </CollapsibleContent>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.step2} onClick={() => toggleSection('step2')}>
          Step 2: Remove Intrawallet Transfers
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.step2}>
          <p>Intrawallet transfers within your Hyperliquid account (i.e., between spot and perps accounts, or between spot and staking balances) can potentially be ignored within Koinly as they are transfers within the same wallet:</p>
          <OrderedList>
            <ListItem>Go to <strong>Transactions</strong> in Koinly</ListItem>
            <ListItem>Filter by Description containing [INTRAWALLET TRANSFER]</ListItem>
            <ListItem>Delete these transactions</ListItem>
            <ListItem>If you want to keep them, ensure they're properly accounted for as a transfer</ListItem>
          </OrderedList>
        </CollapsibleContent>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.step3} onClick={() => toggleSection('step3')}>
          Step 3: Tag Staking Transactions
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.step3}>
          <p>Staking transactions need special tags in Koinly that cannot be applied via CSV import:</p>
          <OrderedList>
            <ListItem>Go to <strong>Transactions</strong> in Koinly</ListItem>
            <ListItem>Filter by Description containing "[STAKE/DELEGATE]"</ListItem>
            <ListItem>Select all staking transactions, and apply the <strong>Pool In</strong> tag</ListItem>
            <ListItem>Then filter by Description containing "[UNSTAKE/UNDELEGATE]"</ListItem>
            <ListItem>Select all unstaking transactions, and apply the <strong>Pool Out</strong> tag</ListItem>
            <ListItem>These tags ensure proper tax treatment of your staking activities</ListItem>
          </OrderedList>
          <AssetListDescription>
            <strong>Note:</strong> "Pool In" and "Pool Out" tags cannot be applied via CSV import and must be added manually in the Koinly interface.
          </AssetListDescription>
        </CollapsibleContent>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.step4} onClick={() => toggleSection('step4')}>
          Step 4: Tag Vault Transactions
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.step4}>
          <p>Vault or liquidity provision transactions need to be handled manually, otherwise they will be treated as disposals and acquisitions:</p>
          <OrderedList>
            <ListItem>Go to <strong>Transactions</strong> in Koinly</ListItem>
            <ListItem>Filter by Description containing "[VAULT DEPOSIT]" or "[VAULT WITHDRAWAL]"</ListItem>
            <ListItem>For each "VAULT DEPOSIT" transaction, edit it and apply the <strong>Pool In</strong> tag</ListItem>
            <ListItem>For each "VAULT WITHDRAWAL" transaction, edit it and apply the <strong>Pool Out</strong> tag</ListItem>
            <ListItem>Consult an accountant. These transactions should probably be tagged as "Liquidity In" and "Liquidity Out" respectively, but Koinly doesn't support this. You will likely need to deal with some manual adjustments of amounts here if you made or lost money in a vault like HLP.</ListItem>
          </OrderedList>
          <AssetListDescription>
            <strong>Note:</strong> "Pool In" and "Pool Out" tags cannot be applied via CSV import and must be added manually in the Koinly interface.
          </AssetListDescription>
        </CollapsibleContent>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.step5} onClick={() => toggleSection('step5')}>
          Step 5: Review Partially Supported Assets
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.step5}>
          <p>For transactions involving assets with partial support:</p>
          <OrderedList>
            <ListItem>Go to <strong>Transactions</strong> in Koinly</ListItem>
            <ListItem>Filter by Description containing "REVIEW"</ListItem>
            <ListItem>For each transaction, check if Koinly has correctly identified the asset</ListItem>
            <ListItem>If not, click <strong>Edit</strong> and correct the asset name</ListItem>
            <ListItem>Ensure the cost basis is correct</ListItem>
          </OrderedList>
          
          {softWarningAssets.length > 0 && (
            <AssetList>
              <AssetListTitle>Assets with Partial Support in Your Transactions:</AssetListTitle>
              <AssetTags>
                {softWarningAssets.map(asset => (
                  <AssetTag key={asset} type="soft">{asset}</AssetTag>
                ))}
              </AssetTags>
              <AssetListDescription>
                These assets may have limited support in Koinly. Check that they are correctly identified after import.
              </AssetListDescription>
            </AssetList>
          )}
        </CollapsibleContent>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.step6} onClick={() => toggleSection('step6')}>
          Step 6: Final Review
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.step6}>
          <p>Before finalizing your tax report:</p>
          <OrderedList>
            <ListItem>Check for any remaining unreviewed transactions</ListItem>
            <ListItem>Verify that all cost basis values are correct</ListItem>
            <ListItem>Ensure all trades have matching buy/sell pairs</ListItem>
            <ListItem>Review the tax summary to ensure it looks reasonable</ListItem>
          </OrderedList>
        </CollapsibleContent>
      </CollapsibleSection>
      
      <CollapsibleSection>
        <CollapsibleTitle $isExpanded={expandedSections.troubleshooting} onClick={() => toggleSection('troubleshooting')}>
          Troubleshooting
        </CollapsibleTitle>
        <CollapsibleContent $isExpanded={expandedSections.troubleshooting}>
          <SubsectionTitle>Missing Transactions</SubsectionTitle>
          <p>If some transactions are missing after import:</p>
          <UnorderedList>
            <ListItem>Check if they involve unsupported assets</ListItem>
            <ListItem>Try manually adding them in Koinly</ListItem>
            <ListItem>Ensure you've uploaded all relevant CSV files from Hyperliquid</ListItem>
          </UnorderedList>
          
          <SubsectionTitle>Incorrect Asset Identification</SubsectionTitle>
          <p>If Koinly misidentifies an asset:</p>
          <UnorderedList>
            <ListItem>Edit the transaction and select the correct asset</ListItem>
            <ListItem>If the asset doesn't exist in Koinly, use the NULLx placeholders (NULL1, NULL2, etc.)</ListItem>
            <ListItem>Add a detailed description that clearly specifies the actual token name</ListItem>
            <ListItem>Maintain consistency by using the same NULL placeholder for the same token across all transactions</ListItem>
            <ListItem>Keep a record of which NULL placeholder corresponds to which token for your reference</ListItem>
          </UnorderedList>
          
          <SubsectionTitle>Cost Basis Issues</SubsectionTitle>
          <p>If cost basis values seem incorrect:</p>
          <UnorderedList>
            <ListItem>Check the original transaction in Hyperliquid</ListItem>
            <ListItem>Verify that the CSV export includes the correct values</ListItem>
            <ListItem>Manually edit the cost basis in Koinly if needed</ListItem>
          </UnorderedList>
          
          <SubsectionTitle>Duplicate Transactions</SubsectionTitle>
          <p>If you see duplicate transactions in Koinly:</p>
          <UnorderedList>
            <ListItem>Check if you've imported the same data multiple times</ListItem>
            <ListItem>Look for transactions that might be split into multiple entries</ListItem>
            <ListItem>Use the "Ignore" tag for one of the duplicates</ListItem>
          </UnorderedList>
        </CollapsibleContent>
      </CollapsibleSection>
    </GuideContainer>
  );
};

export default KoinlyGuide; 