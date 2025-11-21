import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';
import { BlurredBackground } from '../components/BlurredBackground';
import { GridOverlay, Title, Button } from '../components/UIComponents';
import { SettingsScreen } from './SettingsScreen';
import { useTooltip } from '../contexts/TooltipContext';
import { Save } from '@mui/icons-material';

/*
 * This screen represents both the start-up and in-game menu screen. It should present basic options: new game, load game, settings.
 */

interface MenuScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const MenuScreen: FC<MenuScreenProps> = ({ stage, setScreenType }) => {
    const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
    const [showSettings, setShowSettings] = React.useState(false);
    const [isNewGameSettings, setIsNewGameSettings] = React.useState(false);
    const { setTooltip, clearTooltip } = useTooltip();
    
    // Check if a save exists (if there are any actors or the layout has been modified)
    const saveExists = () => {
        const save = stage().getSave();
        return Object.keys(save.actors).length > 0 || save.day > 1 || save.phase > 0;
    };

    const handleContinue = () => {
        setScreenType(ScreenType.STATION);
        stage().startGame();
    };

    const handleNewGame = () => {
        // Show settings screen for new game setup
        setIsNewGameSettings(true);
        setShowSettings(true);
    };

    const handleLoad = () => {
        // Placeholder for load functionality
        console.log('Load game clicked - functionality to be implemented');
    };

    const handleSave = () => {
        if (stage().initialized) {
            // Display "Saving game..." message in the TooltipBar with 2 second expiry
            setTooltip('Saving game...', Save, undefined, 2000);
            console.log('Saving game.');
            stage().saveGame();
        }
    };

    const handleSettings = () => {
        // Show settings screen
        setIsNewGameSettings(false);
        setShowSettings(true);
    };

    const handleSettingsClose = () => {
        setShowSettings(false);
        
        // If this was new game settings, start the game
        if (isNewGameSettings) {
            stage().newGame();
            stage().startGame();
            setScreenType(ScreenType.STATION);
        }
    };

    const menuButtons = [
        ...(saveExists() ? [{ 
            key: 'continue', 
            label: 'Continue', 
            onClick: handleContinue,
            enabled: true 
        }] : []),
        { 
            key: 'new', 
            label: 'New Game', 
            onClick: handleNewGame,
            enabled: true 
        },
        {
            key: 'save',
            label: 'Save Game',
            onClick: handleSave,
            enabled: stage().initialized
        },
        { 
            key: 'load', 
            label: 'Load Game', 
            onClick: handleLoad,
            enabled: false // Disabled for now
        },
        { 
            key: 'settings', 
            label: 'Settings', 
            onClick: handleSettings,
            enabled: true
        }
    ];

    return (
        <BlurredBackground
            imageUrl="https://media.charhub.io/41b7b65d-839b-4d31-8c11-64ee50e817df/0fc1e223-ad07-41c4-bdae-c9545d5c5e34.png"
            overlay="linear-gradient(45deg, rgba(0,17,34,0.3) 0%, rgba(0,34,68,0.3) 100%)"
        >
            <div 
                className="menu-screen" 
                style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh', 
                    width: '100vw'
                }}
            >
            {/* Background grid effect */}
            <GridOverlay />

            {/* Main menu container */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="glass-panel-bright"
                style={{
                    padding: '40px',
                    minWidth: '300px',
                }}
            >
                {/* Title */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <Title variant="glow" style={{ textAlign: 'center', marginBottom: '40px', fontSize: '28px' }}>
                        Apocalypse Rehabilitation Center
                    </Title>
                </motion.div>

                {/* Menu buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {menuButtons.map((button, index) => (
                        <motion.div
                            key={button.key}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ 
                                opacity: 1, 
                                x: hoveredButton === button.key && button.enabled ? 10 : 0
                            }}
                            transition={{ 
                                opacity: { delay: 0.4 + (index * 0.1), duration: 0.4, ease: 'easeOut' },
                                x: { duration: 0.2, ease: 'easeOut' }
                            }}
                        >
                            <Button
                                variant="menu"
                                onMouseEnter={() => setHoveredButton(button.enabled ? button.key : null)}
                                onMouseLeave={() => setHoveredButton(null)}
                                whileTap={{ scale: button.enabled ? 0.95 : 1 }}
                                onClick={button.enabled ? button.onClick : undefined}
                                disabled={!button.enabled}
                                style={{
                                    width: '100%',
                                    background: button.enabled && hoveredButton === button.key 
                                        ? 'rgba(0, 255, 136, 0.2)' 
                                        : button.enabled ? 'transparent' : 'rgba(0, 20, 40, 0.5)'
                                }}
                            >
                                {button.label}
                            </Button>
                        </motion.div>
                    ))}
                </div>

                {/* Subtitle/version info */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    style={{
                        textAlign: 'center',
                        marginTop: '30px',
                        color: 'rgba(0, 255, 136, 0.6)',
                        fontSize: '12px',
                    }}
                >
                    v0.1.0 - Early Access
                </motion.div>
            </motion.div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <SettingsScreen
                    stage={stage}
                    onClose={handleSettingsClose}
                    isNewGame={isNewGameSettings}
                />
            )}
        </BlurredBackground>
    );
};