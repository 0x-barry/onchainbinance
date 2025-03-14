import React, { useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../../services/FileUploader';

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: #fff;
  margin-bottom: 2rem;
`;

const StepIndicator = styled.div`
  color: #888;
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

const FileUploadSection = styled.div`
  margin-bottom: 2rem;
`;

const RequiredFiles = styled.div`
  margin-bottom: 1rem;
`;

const FileStatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`;

const FileStatus = styled.span`
  color: ${props => props.$isUploaded ? '#4CAF50' : '#888'};
  font-weight: ${props => props.$isUploaded ? 'bold' : 'normal'};
`;

const ClearFileButton = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.875rem;
  margin-left: 0.5rem;
`;

const FileInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 2px dashed ${props => props.theme.colors.primary};
  border-radius: 4px;
  background: transparent;
  
  &[type="file"] {
    &::file-selector-button {
      margin-right: 1rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      background: ${props => props.theme.colors.primary};
      color: white;
      cursor: pointer;
      transition: background 0.2s ease;

      &:hover {
        background: ${props => props.theme.colors.primary}dd;
      }
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const ProcessButton = styled.button`
  background-color: ${props => props.disabled ? '#888' : '#4CAF50'};
  border: none;
  border-radius: 0.25rem;
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.75rem 1rem;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => props.disabled ? '#888' : '#45a049'};
  }
`;

const DebugContainer = styled.div`
  margin-top: 2rem;
  padding: 1rem;
  background: #1a1a1a;
  border-radius: 4px;
  overflow: auto;
  max-height: 300px;
`;

const DebugHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const DebugTitle = styled.h4`
  margin: 0;
  color: #ddd;
`;

const DebugToggle = styled.button`
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 0.875rem;
  
  &:hover {
    color: #ddd;
  }
`;

const Upload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const getFileByPrefix = (prefix) => {
    const fileName = Object.keys(files).find(name => name.startsWith(prefix));
    return files[fileName] || [];
  };

  const hasRequiredFiles = () => {
    const fileNames = Object.keys(files);
    return fileNames.some(name => name.startsWith('trade_history')) &&
           fileNames.some(name => name.startsWith('funding_history')) &&
           fileNames.some(name => name.startsWith('deposits_and_withdrawals'));
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;

    setProcessing(true);
    setError(null);

    try {
      // Clear localStorage when new files are uploaded
      console.log('Clearing localStorage for new file upload');
      // Clear both raw and processed data
      FileUploader.clearProcessedData(true);

      const newFiles = {};
      for (const file of uploadedFiles) {
        try {
          const data = await FileUploader.parseCSVFile(file);
          newFiles[file.name] = data;
        } catch (parseError) {
          console.error(`Error parsing ${file.name}:`, parseError);
          throw new Error(`Failed to parse ${file.name}: ${parseError.message}`);
        }
      }

      setFiles(prevFiles => ({
        ...prevFiles,
        ...newFiles
      }));
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Error processing files: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const storeAndContinue = () => {
    try {
      console.log('Starting storeAndContinue...');
      
      const tradeData = getFileByPrefix('trade_history');
      const fundingData = getFileByPrefix('funding_history');
      const depositsData = getFileByPrefix('deposits_and_withdrawals');
      const stakingRewardsData = getFileByPrefix('rewardHistory');
      const stakingActionsData = getFileByPrefix('actionHistory');
      
      console.log('Data to be stored:', {
        tradesLength: tradeData?.length,
        fundingLength: fundingData?.length,
        depositsLength: depositsData?.length,
        stakingRewardsLength: stakingRewardsData?.length,
        stakingActionsLength: stakingActionsData?.length
      });

      // Store raw data in localStorage
      localStorage.setItem('rawTradeData', JSON.stringify(tradeData));
      localStorage.setItem('rawFundingData', JSON.stringify(fundingData));
      localStorage.setItem('rawDepositsData', JSON.stringify(depositsData));
      
      // Store staking data if available
      if (stakingRewardsData?.length > 0) {
        localStorage.setItem('rawStakingRewardsData', JSON.stringify(stakingRewardsData));
      }
      
      if (stakingActionsData?.length > 0) {
        localStorage.setItem('rawStakingActionsData', JSON.stringify(stakingActionsData));
      }
      
      // Verify storage
      const storedTrades = localStorage.getItem('rawTradeData');
      const storedFunding = localStorage.getItem('rawFundingData');
      const storedDeposits = localStorage.getItem('rawDepositsData');
      const storedStakingRewards = localStorage.getItem('rawStakingRewardsData');
      const storedStakingActions = localStorage.getItem('rawStakingActionsData');
      
      console.log('Storage verification:', {
        tradesStored: !!storedTrades,
        fundingStored: !!storedFunding,
        depositsStored: !!storedDeposits,
        stakingRewardsStored: !!storedStakingRewards,
        stakingActionsStored: !!storedStakingActions,
        tradesSampleLength: JSON.parse(storedTrades)?.length
      });
      
      // Navigate to summary page
      console.log('Storage complete, navigating to summary...');
      navigate('/summary');
    } catch (error) {
      console.error('Error in storeAndContinue:', error);
      setError(`Error storing files: ${error.message}`);
    }
  };

  const clearFile = (prefix) => {
    setFiles(prevFiles => {
      const newFiles = { ...prevFiles };
      const fileToRemove = Object.keys(newFiles).find(name => name.startsWith(prefix));
      if (fileToRemove) {
        delete newFiles[fileToRemove];
      }
      return newFiles;
    });
  };

  return (
    <Container>
      <StepIndicator>Step 1 of 2</StepIndicator>
      <Title>Upload Your Trade Data</Title>
      
      <FileUploadSection>
        <RequiredFiles>
          <div className="font-medium mb-2">Required Files:</div>
          <FileStatusRow>
            <FileStatus $isUploaded={Object.keys(files).some(name => name.startsWith('trade_history'))}>
              Trades
            </FileStatus>
            {Object.keys(files).some(name => name.startsWith('trade_history')) && (
              <ClearFileButton onClick={() => clearFile('trade_history')}>×</ClearFileButton>
            )}
          </FileStatusRow>
          
          <FileStatusRow>
            <FileStatus $isUploaded={Object.keys(files).some(name => name.startsWith('funding_history'))}>
              Funding
            </FileStatus>
            {Object.keys(files).some(name => name.startsWith('funding_history')) && (
              <ClearFileButton onClick={() => clearFile('funding_history')}>×</ClearFileButton>
            )}
          </FileStatusRow>
          
          <FileStatusRow>
            <FileStatus $isUploaded={Object.keys(files).some(name => name.startsWith('deposits_and_withdrawals'))}>
              Deposits & Withdrawals
            </FileStatus>
            {Object.keys(files).some(name => name.startsWith('deposits_and_withdrawals')) && (
              <ClearFileButton onClick={() => clearFile('deposits_and_withdrawals')}>×</ClearFileButton>
            )}
          </FileStatusRow>
          
          <div className="font-medium mb-2 mt-4">Optional:</div>
          <FileStatusRow>
            <FileStatus $isUploaded={Object.keys(files).some(name => name.startsWith('rewardHistory'))}>
              Staking Rewards
            </FileStatus>
            {Object.keys(files).some(name => name.startsWith('rewardHistory')) && (
              <ClearFileButton onClick={() => clearFile('rewardHistory')}>×</ClearFileButton>
            )}
          </FileStatusRow>
          
          <FileStatusRow>
            <FileStatus $isUploaded={Object.keys(files).some(name => name.startsWith('actionHistory'))}>
              Staking Actions
            </FileStatus>
            {Object.keys(files).some(name => name.startsWith('actionHistory')) && (
              <ClearFileButton onClick={() => clearFile('actionHistory')}>×</ClearFileButton>
            )}
          </FileStatusRow>
        </RequiredFiles>

        <FileInput 
          type="file" 
          onChange={handleFileUpload}
          accept=".csv"
          multiple
        />

        {processing && (
          <LoadingSpinner>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </LoadingSpinner>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <ProcessButton 
          onClick={storeAndContinue} 
          disabled={!hasRequiredFiles() || processing}
        >
          {processing ? 'Processing...' : 'Process Files'}
        </ProcessButton>
        
        {Object.keys(files).length > 0 && (
          <DebugContainer>
            <DebugHeader>
              <DebugTitle>Debug: Parsed CSV Data</DebugTitle>
              <DebugToggle onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? 'Hide' : 'Show'}
              </DebugToggle>
            </DebugHeader>
            
            {showDebug && (
              <div>
                {Object.entries(files).map(([filename, data]) => (
                  <div key={filename} style={{ marginBottom: '1rem' }}>
                    <h5 style={{ color: '#aaa', marginBottom: '0.5rem' }}>{filename}</h5>
                    <div style={{ fontSize: '0.75rem' }}>
                      <div>Row count: {data.length}</div>
                      <div>Columns: {data[0] ? Object.keys(data[0]).join(', ') : 'No data'}</div>
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#888' }}>First row</summary>
                        <pre style={{ color: '#ddd', overflow: 'auto' }}>
                          {JSON.stringify(data[0], null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DebugContainer>
        )}
      </FileUploadSection>
    </Container>
  );
};

export default Upload; 