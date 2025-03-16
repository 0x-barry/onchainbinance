import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FileUploader } from '../../services/FileUploader';

const Container = styled.div`
  padding: 2rem;
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.5rem;
  font-family: ${props => props.theme.fonts.header};
`;

const UploadCard = styled.div`
  background: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.large};
  padding: 1.5rem;
  box-shadow: ${props => props.theme.shadows.card};
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 2rem;
  position: relative;
`;

const UploadContent = styled.div`
  display: flex;
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const DropZoneContainer = styled.div`
  width: 50%;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.theme.colors.text.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  text-align: center;
  background: ${props => props.theme.colors.background};
  transition: all 0.2s ease;
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const UploadIcon = styled.div`
  margin-bottom: 1rem;
  svg {
    width: 48px;
    height: 48px;
    color: ${props => props.theme.colors.primary};
    opacity: 0.8;
  }
`;

const DropText = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 0.5rem;
  font-family: ${props => props.theme.fonts.body};
`;

const BrowseText = styled.span`
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  font-weight: ${props => props.theme.fontWeights.bold};
  
  &:hover {
    text-decoration: underline;
  }
`;

const FileFormatText = styled.p`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 1rem;
  font-family: ${props => props.theme.fonts.body};
`;

const HiddenInput = styled.input`
  display: none;
`;

const FileStatusContainer = styled.div`
  width: 50%;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const FileStatusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const FileStatusItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: ${props => props.$isUploaded ? props.theme.colors.secondary : props.theme.colors.background};
  border: 1px solid ${props => props.$isUploaded ? props.theme.colors.primary : props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.small};
  transition: all 0.2s ease;
`;

const FileTypeIcon = styled.div`
  margin-right: 0.75rem;
  
  svg {
    width: 24px;
    height: 24px;
    color: ${props => props.$color || props.theme.colors.primary};
  }
`;

const FileTypeDetails = styled.div`
  flex: 1;
`;

const FileTypeName = styled.div`
  font-weight: ${props => props.theme.fontWeights.bold};
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  font-family: ${props => props.theme.fonts.body};
`;

const RequiredBadge = styled.span`
  background: ${props => props.$isRequired ? props.theme.colors.accent.green : props.theme.colors.secondary};
  color: ${props => props.theme.colors.text.primary};
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 8px;
  font-weight: ${props => props.theme.fontWeights.bold};
  font-family: ${props => props.theme.fonts.body};
`;

const FileTypeStatus = styled.div`
  font-size: 0.75rem;
  color: ${props => props.$isUploaded ? props.theme.colors.accent.green : props.theme.colors.text.secondary};
  font-family: ${props => props.theme.fonts.body};
`;

const FileProgress = styled.div`
  width: 100%;
  height: 3px;
  background: ${props => props.theme.colors.secondary};
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const ProgressBar = styled.div`
  height: 100%;
  background: ${props => props.theme.colors.accent.green};
  width: ${props => props.$progress}%;
`;

const ProcessButton = styled.button`
  background-color: ${props => props.disabled ? props.theme.colors.secondary : props.theme.colors.primary};
  border: none;
  border-radius: ${props => props.theme.borderRadius.small};
  color: ${props => props.theme.colors.background};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 1rem;
  font-weight: ${props => props.theme.fontWeights.bold};
  padding: 0.75rem 1.5rem;
  width: 100%;
  transition: background-color 0.3s;
  margin-top: 1.5rem;
  font-family: ${props => props.theme.fonts.body};

  &:hover {
    background-color: ${props => props.disabled ? props.theme.colors.secondary : props.theme.colors.primary};
    opacity: ${props => props.disabled ? 1 : 0.9};
  }
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.error};
  opacity: 0.1;
  border: 1px solid ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.borderRadius.small};
  color: ${props => props.theme.colors.error};
  margin-bottom: 1rem;
  padding: 1rem;
  font-family: ${props => props.theme.fonts.body};
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingCard = styled.div`
  background: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 2rem;
  text-align: center;
  max-width: 400px;
  width: 90%;
`;

const LoadingSpinner = styled.div`
  margin-bottom: 1rem;
  
  svg {
    animation: spin 1.5s linear infinite;
    width: 48px;
    height: 48px;
    color: ${props => props.theme.colors.primary};
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  font-size: 1rem;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 0.5rem;
  font-family: ${props => props.theme.fonts.body};
`;

const LoadingSubText = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
  font-family: ${props => props.theme.fonts.body};
`;

const Upload = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState({});
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const fileListRef = useRef(null);

  const fileTypes = [
    {
      id: 'trade_history',
      name: 'Trade History',
      required: true,
      instructions: 'Account > Trade History > Export CSV',
      filePrefix: 'trade_history',
      color: '#4285F4', // Google blue
      icon: 'document'
    },
    {
      id: 'funding_history',
      name: 'Funding History',
      required: true,
      instructions: 'Account > Funding History > Export CSV',
      filePrefix: 'funding_history',
      color: '#EA4335', // Google red
      icon: 'document'
    },
    {
      id: 'deposits_and_withdrawals',
      name: 'Deposits & Withdrawals',
      required: true,
      instructions: 'Account > Deposits & Withdrawals > Export CSV',
      filePrefix: 'deposits_and_withdrawals',
      color: '#FBBC05', // Google yellow
      icon: 'document'
    },
    {
      id: 'staking_rewards',
      name: 'Staking Rewards',
      required: false,
      instructions: 'Staking > Rewards > Export CSV',
      filePrefix: 'rewardHistory',
      color: '#34A853', // Google green
      icon: 'document'
    },
    {
      id: 'staking_actions',
      name: 'Staking Actions',
      required: false,
      instructions: 'Staking > Actions > Export CSV',
      filePrefix: 'actionHistory',
      color: '#9C27B0', // Purple
      icon: 'document'
    }
  ];

  // Adjust drop zone height to match file list height
  React.useEffect(() => {
    const adjustHeight = () => {
      if (dropZoneRef.current && fileListRef.current) {
        const fileListHeight = fileListRef.current.offsetHeight;
        dropZoneRef.current.style.height = `${fileListHeight}px`;
      }
    };

    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    
    return () => {
      window.removeEventListener('resize', adjustHeight);
    };
  }, [files]);

  const getFileByPrefix = (prefix) => {
    const fileName = Object.keys(files).find(name => name.startsWith(prefix));
    return files[fileName] || [];
  };

  const hasRequiredFiles = () => {
    const fileNames = Object.keys(files);
    return fileTypes
      .filter(type => type.required)
      .every(type => fileNames.some(name => name.startsWith(type.filePrefix)));
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files || e.dataTransfer.files);
    if (uploadedFiles.length === 0) return;

    setError(null);

    try {
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
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e);
  };

  const storeAndContinue = () => {
    try {
      setProcessing(true);
      console.log('Starting storeAndContinue...');
      
      // Clear existing data before processing new files
      FileUploader.clearLocalStorage();
      
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
      
      // Process the data and check for airdrops
      FileUploader.processData(
        JSON.parse(storedTrades),
        JSON.parse(storedFunding),
        JSON.parse(storedDeposits),
        storedStakingRewards ? JSON.parse(storedStakingRewards) : [],
        storedStakingActions ? JSON.parse(storedStakingActions) : []
      ).then(result => {
        // Don't store the timeline in localStorage as it's too big
        // Instead, check for airdrops directly in the deposits data
        
        // Check if there are any airdrops in the deposits data
        const depositsData = JSON.parse(storedDeposits);
        const hasAirdrops = depositsData.some(entry => 
          entry.action === 'genesis.distribution'
        );
        
        // Navigate to airdrop config if airdrops are found, otherwise go to summary
        setTimeout(() => {
          if (hasAirdrops) {
            navigate('/airdrop-config');
          } else {
            navigate('/summary');
          }
          setProcessing(false);
        }, 1000);
      }).catch(error => {
        console.error('Error processing data:', error);
        setError(`Error processing data: ${error.message}`);
        setProcessing(false);
      });
    } catch (error) {
      console.error('Error in storeAndContinue:', error);
      setError(`Error storing files: ${error.message}`);
      setProcessing(false);
    }
  };

  const clearFile = (filePrefix) => {
    setFiles(prevFiles => {
      const newFiles = { ...prevFiles };
      const fileToRemove = Object.keys(newFiles).find(name => name.startsWith(filePrefix));
      if (fileToRemove) {
        delete newFiles[fileToRemove];
      }
      return newFiles;
    });
  };

  const getUploadedFileForType = (filePrefix) => {
    return Object.keys(files).find(name => name.startsWith(filePrefix));
  };

  const getFileIcon = (fileType) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <Container>
      <Header>
        <Title>File Upload</Title>
      </Header>
      
      <UploadCard>
        
        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}
        
        <UploadContent>
          <DropZoneContainer>
            <DropZone 
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                borderColor: isDragging ? props => props.theme.colors.primary : props => props.theme.colors.text.secondary
              }}
            >
              <UploadIcon>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </UploadIcon>
              <DropText>
                Drop your files here.
              </DropText>
              <DropText>
                or <BrowseText onClick={() => fileInputRef.current.click()}>Browse</BrowseText>
              </DropText>
              <FileFormatText>CSV files only (max size 40MB)</FileFormatText>
              <HiddenInput 
                type="file" 
                ref={fileInputRef}
                accept=".csv"
                multiple
                onChange={handleFileUpload}
              />
            </DropZone>
          </DropZoneContainer>
          
          <FileStatusContainer>
            <FileStatusList ref={fileListRef}>
              {fileTypes.map(fileType => {
                const uploadedFile = getUploadedFileForType(fileType.filePrefix);
                const isUploaded = !!uploadedFile;
                
                return (
                  <FileStatusItem key={fileType.id} $isUploaded={isUploaded}>
                    <FileTypeIcon $color={fileType.color}>
                      {getFileIcon(fileType)}
                    </FileTypeIcon>
                    <FileTypeDetails>
                      <FileTypeName>
                        {fileType.name}
                        <RequiredBadge $isRequired={fileType.required}>
                          {fileType.required ? 'Required' : 'Optional'}
                        </RequiredBadge>
                      </FileTypeName>
                      <FileTypeStatus $isUploaded={isUploaded}>
                        {isUploaded 
                          ? `${uploadedFile} (${files[uploadedFile].length} rows)` 
                          : fileType.instructions}
                      </FileTypeStatus>
                      {isUploaded && (
                        <FileProgress>
                          <ProgressBar $progress={100} />
                        </FileProgress>
                      )}
                    </FileTypeDetails>
                  </FileStatusItem>
                );
              })}
            </FileStatusList>
          </FileStatusContainer>
        </UploadContent>
        
        <ProcessButton 
          onClick={storeAndContinue} 
          disabled={!hasRequiredFiles() || processing}
        >
          Process Files
        </ProcessButton>
      </UploadCard>
      
      {processing && (
        <LoadingOverlay>
          <LoadingCard>
            <LoadingSpinner>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </LoadingSpinner>
            <LoadingText>Processing your files...</LoadingText>
            <LoadingSubText>This may take a few moments</LoadingSubText>
          </LoadingCard>
        </LoadingOverlay>
      )}
    </Container>
  );
};

export default Upload; 