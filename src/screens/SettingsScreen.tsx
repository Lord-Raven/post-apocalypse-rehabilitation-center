import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage } from '../Stage';
import { GlassPanel, Title, Button, TextInput } from '../components/UIComponents';
import { Close } from '@mui/icons-material';

interface SettingsScreenProps {
    stage: () => Stage;
    onClose: () => void;
    isNewGame?: boolean;
}

interface SettingsData {
    playerName: string;
    playerDescription: string;
    assistantName: string;
    assistantDescription: string;
    tagToggles: { [key: string]: boolean };
}

export const SettingsScreen: FC<SettingsScreenProps> = ({ stage, onClose, isNewGame = false }) => {
    // Load existing settings or use defaults
    const [settings, setSettings] = useState<SettingsData>({
        playerName: stage().getSave().player?.name || '',
        playerDescription: '',
        assistantName: 'Assistant',
        assistantDescription: 'Your helpful companion in the Post-Apocalypse Rehabilitation Center.',
        // Tag toggles; disabling these can be used to filter undesired content
        tagToggles: {
            'NSFW': true,
            'Male': true,
            'Female': true,
            'Transgender': true,
            'Futanari': true,
            'Bisexual': true,
            'Gay': true,
            'Lesbian': true,
            'Asexual': true,
            'Human': true,
            'Non-Human': true,
            'Anthro': true,
            'Robot': true,
            'Elf': true,
            'Monster': true,
            'Historical': true,
            'Anime': true,
            'Game Character': true,
            'Movies & TV': true,
            'Original Character': true,
            'Tsundere': true,
            'Yandere': true,
            'Virgin': true,
            'Submissive': true,
            'Dominant': true,
            'Sadistic': true,
            'Masochistic': true,
            'BDSM': true,
            'Villain': true,
            'Tomboy': true,
            'Femboy': true,
            'MILF': true,
            'Goth': true,
            'Big Breasts': true,
            'Big Butt': true,
            'Big Dick': true,
            'Small Breasts': true,
            'Small Butt': true,
            'Small Dick': true,
            'Petite': true,
            'Chubby': true,
            'Muscular': true,
            'Giant': true,
            'Size Difference': true,
            'Fantasy': true,
            'Sci-Fi': true,
            'Romance': true,
            'Comedy': true,
            'Horror': true,
            'NTR': true,
        }
    });

    // Each toggle can map to multiple tags when saved.
    const tagMap: { [key: string]: string[] } = {
        'NSFW': ['NSFW', 'Explicit'],
        'Male': ['Male', 'Boy', 'Man'],
        'Female': ['Female', 'Girl', 'Woman'],
        'NTR': ['NTR', 'Cuckold', 'Cheating', 'Infidelity', 'Affair', 'Netori', 'Netorare'],
        'Game Character': ['Game Character', 'Video Game', 'games', 'game', 'videogames'],
        'Original Character': ['Original Character', 'OC', 'original'],
        'MILF': ['MILF', 'mother', 'mom', 'mommy'],
        'Muscular': ['Muscular'],
        'Fantasy': ['Fantasy'],
        'Sci-Fi': ['Sci-Fi', 'Science Fiction'],
        'Romance': ['Romance', 'Love', 'Drama'],
        'Villain': ['Villain', 'Evil'],

    }

    const handleSave = () => {
        // TODO: Actually save settings to Stage/Save
        console.log('Saving settings:', settings);
        
        // Update player name in save
        const save = stage().getSave();
        save.player.name = settings.playerName;

        save.bannedTags = Object.keys(settings.tagToggles).filter(key => !settings.tagToggles[key]).map(key => tagMap[key] ? tagMap[key] : [key]).flat();


        stage().saveGame();
        
        onClose();
    };

    const handleToggle = (key: string) => {
        setSettings(prev => ({
            ...prev,
            tagToggles: {
                ...prev.tagToggles,
                [key]: !prev.tagToggles[key]
            }
        }));
    };

    const handleInputChange = (field: keyof SettingsData, value: string) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 10, 20, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px',
                }}
                onClick={(e) => {
                    // Close if clicking backdrop
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 50 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GlassPanel 
                        variant="bright"
                        style={{
                            maxWidth: '600px',
                            width: '90vw',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            position: 'relative',
                        }}
                    >
                        {/* Close button */}
                        {!isNewGame && (
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                style={{
                                    position: 'absolute',
                                    top: '15px',
                                    right: '15px',
                                    background: 'transparent',
                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#00ff88',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <Close />
                            </motion.button>
                        )}

                        {/* Title */}
                        <Title variant="glow" style={{ textAlign: 'center', marginBottom: '30px', fontSize: '24px' }}>
                            {isNewGame ? 'New Game Setup' : 'Settings'}
                        </Title>

                        {/* Settings Form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Player Name */}
                            <div>
                                <label 
                                    htmlFor="player-name"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Player Name
                                </label>
                                <TextInput
                                    id="player-name"
                                    fullWidth
                                    value={settings.playerName}
                                    onChange={(e) => handleInputChange('playerName', e.target.value)}
                                    placeholder="Enter your name"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            {/* Player Description */}
                            <div>
                                <label 
                                    htmlFor="player-description"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Player Description
                                </label>
                                <textarea
                                    id="player-description"
                                    className="text-input-primary"
                                    value={settings.playerDescription}
                                    onChange={(e) => handleInputChange('playerDescription', e.target.value)}
                                    placeholder="Describe your character..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Assistant Name */}
                            <div>
                                <label 
                                    htmlFor="assistant-name"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Assistant Name (Unused as yet)
                                </label>
                                <TextInput
                                    id="assistant-name"
                                    fullWidth
                                    value={settings.assistantName}
                                    onChange={(e) => handleInputChange('assistantName', e.target.value)}
                                    placeholder="Enter assistant name"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            {/* Assistant Description */}
                            <div>
                                <label 
                                    htmlFor="assistant-description"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Assistant Description
                                </label>
                                <textarea
                                    id="assistant-description"
                                    className="text-input-primary"
                                    value={settings.assistantDescription}
                                    onChange={(e) => handleInputChange('assistantDescription', e.target.value)}
                                    placeholder="Describe your assistant..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Toggle Grid */}
                            <div>
                                <label 
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '12px',
                                    }}
                                >
                                    Tags
                                </label>
                                <div 
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                        gap: '12px',
                                    }}
                                >
                                    {Object.entries(settings.tagToggles).map(([key, value]) => (
                                        <motion.div
                                            key={key}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => handleToggle(key)}
                                            style={{
                                                padding: '12px',
                                                background: value 
                                                    ? 'rgba(0, 255, 136, 0.15)' 
                                                    : 'rgba(0, 20, 40, 0.7)',
                                                border: value
                                                    ? '2px solid rgba(0, 255, 136, 0.5)'
                                                    : '2px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    background: value ? '#00ff88' : 'rgba(255, 255, 255, 0.1)',
                                                    border: '2px solid ' + (value ? '#00ff88' : 'rgba(255, 255, 255, 0.3)'),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                {value && (
                                                    <motion.span
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        style={{
                                                            color: '#002210',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        ✓
                                                    </motion.span>
                                                )}
                                            </div>
                                            <span
                                                style={{
                                                    color: value ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                                                    fontSize: '13px',
                                                    fontWeight: value ? 'bold' : 'normal',
                                                }}
                                            >
                                                {key}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div 
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    marginTop: '20px',
                                    justifyContent: 'flex-end',
                                }}
                            >
                                {!isNewGame && (
                                    <Button
                                        variant="secondary"
                                        onClick={onClose}
                                    >
                                        Cancel
                                    </Button>
                                )}
                                <Button
                                    variant="primary"
                                    onClick={handleSave}
                                >
                                    {isNewGame ? 'Start Game' : 'Save Settings'}
                                </Button>
                            </div>
                        </div>
                    </GlassPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
