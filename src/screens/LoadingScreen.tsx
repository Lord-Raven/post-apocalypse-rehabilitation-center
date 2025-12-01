import React, { FC } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';

/*
 * Loading screen that displays while the StationAide is being generated.
 * Monitors the generateAidePromise and automatically transitions to the Station screen when complete.
 */

interface LoadingScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const LoadingScreen: FC<LoadingScreenProps> = ({ stage, setScreenType }) => {
    // Poll for completion of aide generation
    React.useEffect(() => {
        const interval = setInterval(() => {
            const aidePromise = stage().getGenerateAidePromise();
            
            // If aide promise has completed, transition to station screen
            if (!aidePromise) {
                setScreenType(ScreenType.STATION);
            }
        }, 100);
        
        return () => clearInterval(interval);
    }, [stage, setScreenType]);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                width: '100vw',
                background: 'linear-gradient(45deg, #001122 0%, #002244 100%)',
            }}
        >
            <CircularProgress 
                size={80} 
                sx={{ 
                    color: '#00ff88',
                    marginBottom: 3
                }} 
            />
            <Typography
                variant="h5"
                sx={{
                    color: '#00ff88',
                    fontWeight: 700,
                    textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
                }}
            >
                Initializing StationAide™...
            </Typography>
        </Box>
    );
};
