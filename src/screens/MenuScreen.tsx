import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { ScreenType } from './BaseScreen';
import { Stage } from '../Stage';

/*
 * This screen represents both the start-up and in-game menu screen. It should present basic options: new game, load game, settings.
 */

interface MenuScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const MenuScreen: FC<MenuScreenProps> = ({ stage, setScreenType }) => {
    const [hoveredButton, setHoveredButton] = React.useState<string | null>(null);
    
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
        // For now, just go to station - in the future this might reset the save
        setScreenType(ScreenType.STATION);
        stage().startGame();
    };

    const handleLoad = () => {
        // Placeholder for load functionality
        console.log('Load game clicked - functionality to be implemented');
    };

    const handleSettings = () => {
        // Placeholder for settings functionality
        console.log('Settings clicked - functionality to be implemented');
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
            key: 'load', 
            label: 'Load Game', 
            onClick: handleLoad,
            enabled: false // Disabled for now
        },
        { 
            key: 'settings', 
            label: 'Settings', 
            onClick: handleSettings,
            enabled: false // Disabled for now
        }
    ];

    return (
        <div 
            className="menu-screen" 
            style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh', 
                width: '100vw', 
                background: 'linear-gradient(45deg, #001122 0%, #002244 100%)',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {/* Background grid effect similar to StationScreen */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `
                        linear-gradient(rgba(0, 255, 136, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 255, 136, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px',
                    backgroundPosition: '0 0',
                    backgroundRepeat: 'repeat',
                    pointerEvents: 'none',
                }}
            />

            {/* Main menu container */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                    background: 'rgba(0, 20, 40, 0.9)',
                    border: '2px solid #00ff88',
                    borderRadius: '10px',
                    padding: '40px',
                    minWidth: '300px',
                    boxShadow: '0 10px 30px rgba(0, 255, 136, 0.2)',
                }}
            >
                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    style={{
                        color: '#00ff88',
                        textAlign: 'center',
                        marginBottom: '40px',
                        fontSize: '28px',
                        fontWeight: 'bold',
                        textShadow: '0 2px 4px rgba(0, 255, 136, 0.3)',
                    }}
                >
                    Apocalypse Rehabilitation Center
                </motion.h1>

                {/* Menu buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {menuButtons.map((button, index) => (
                        <motion.button
                            key={button.key}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ 
                                delay: 0.4 + (index * 0.1), 
                                duration: 0.4, 
                                ease: 'easeOut' 
                            }}
                            whileHover={{ 
                                x: button.enabled ? 10 : 0,
                                scale: button.enabled ? 1.02 : 1
                            }}
                            whileTap={{ scale: button.enabled ? 0.98 : 1 }}
                            onHoverStart={() => setHoveredButton(button.enabled ? button.key : null)}
                            onHoverEnd={() => setHoveredButton(null)}
                            onClick={button.enabled ? button.onClick : undefined}
                            disabled={!button.enabled}
                            style={{
                                width: '100%',
                                padding: '15px 25px',
                                background: button.enabled 
                                    ? (hoveredButton === button.key 
                                        ? 'rgba(0, 255, 136, 0.2)' 
                                        : 'transparent')
                                    : 'rgba(0, 20, 40, 0.5)',
                                border: button.enabled 
                                    ? '3px solid #00ff88' 
                                    : '3px solid rgba(0, 255, 136, 0.3)',
                                borderRadius: '8px',
                                color: button.enabled ? '#00ff88' : 'rgba(0, 255, 136, 0.4)',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: button.enabled ? 'pointer' : 'not-allowed',
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                                textShadow: button.enabled 
                                    ? '0 1px 2px rgba(0, 255, 136, 0.3)' 
                                    : 'none',
                                opacity: button.enabled ? 1 : 0.6,
                            }}
                        >
                            {button.label}
                        </motion.button>
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
    );
};