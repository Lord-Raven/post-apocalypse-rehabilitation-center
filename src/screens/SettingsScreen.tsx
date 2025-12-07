import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage } from '../Stage';
import { GlassPanel, Title, Button, TextInput } from '../components/UIComponents';
import { Close } from '@mui/icons-material';
import { ArtStyle } from '../actors/Actor';

interface SettingsScreenProps {
    stage: () => Stage;
    onCancel: () => void;
    onConfirm: () => void;
    isNewGame?: boolean;
}

interface SettingsData {
    playerName: string;
    playerDescription: string;
    aideName: string;
    aideDescription: string;
    disableTextToSpeech: boolean;
    disableEmotionImages: boolean;
    characterArtStyle: ArtStyle;
    tagToggles: { [key: string]: boolean };
}

export const SettingsScreen: FC<SettingsScreenProps> = ({ stage, onCancel, onConfirm, isNewGame = false }) => {

    // Each toggle can map to multiple tags when saved.
    const tagMap: { [key: string]: string[] } = {
        'NSFW': ['NSFW', 'Explicit'],
        'Male': ['Male', 'Boy', 'Man'],
        'Female': ['Female', 'Girl', 'Woman'],
        'Transgender': ['Trans', 'Transgender', 'Transexual','Transfem','Transmasc'],
        'Futanari': ['Futanari', 'Futa'],
        'Bisexual': ['Bisexual', 'Bi'],
        'Gay': ['Gay'],
        'Lesbian': ['Lesbian'],
        'Asexual': ['Asexual', 'Ace'],
        'Human': ['Human'],
        'Non-Human': ['Non-Human'],
        'Anthro': ['Anthro', 'Furry'],
        'Robot': ['Robot', 'Android', 'Cyborg'],
        'Elf': ['Elf', 'Elven', 'Dark Elf'],
        'Monster': ['Monster', 'Beast', 'Creature', 'Monstergirl'],
        'Anime': ['Anime', 'Manga', 'Cartoon'],
        'Movies & TV': ['Movies & TV', 'Film', 'Television', 'Series'],
        'Game Character': ['Game Character', 'Video Game', 'games', 'game', 'videogames'],
        'Original Character': ['Original Character', 'OC', 'Original'],
        'Tsundere': ['Tsundere'],
        'Yandere': ['Yandere'],
        'Virgin': ['Virgin'],
        'Submissive': ['Submissive', 'Sub'],
        'Dominant': ['Dominant', 'Dom'],
        'Sadistic': ['Sadistic', 'Sadism'],
        'Masochistic': ['Masochistic', 'Masochism'],
        'BDSM': ['BDSM', 'Bondage', 'Discipline'],
        'Tomboy': ['Tomboy'],
        'Femboy': ['Femboy'],
        'Goth': ['Goth'],
        'MILF': ['MILF', 'mother', 'mom', 'mommy'],
        'Big Breasts': ['Big Breasts', 'Large Breasts', 'Big Boobs', 'Large Boobs', 'Huge Boobs', 'Huge Breasts'],
        'Big Butt': ['Big Butt', 'Large Butt', 'Big Ass', 'Huge Butt'],
        'Big Dick': ['Big Dick', 'Huge Dick', 'Large Dick', 'Big Cock', 'Huge Cock', 'Large Cock'],
        'Small Breasts': ['Small Breasts', 'Flat'],
        'Small Butt': ['Small Butt', 'Flat Butt'],
        'Small Dick': ['Small Dick', 'Small Penis', 'Small Cock'],
        'Petite': ['Petite'],
        'Chubby': ['Chubby', 'Fat'],
        'Muscular': ['Muscular'],
        'Giant': ['Giant', 'Giantess'],
        'Size Difference': ['Size Difference'],
        'Fantasy': ['Fantasy'],
        'Sci-Fi': ['Sci-Fi', 'Science Fiction'],
        'Romance': ['Romance', 'Love', 'Drama'],
        'Villain': ['Villain', 'Evil'],
        'NTR': ['NTR', 'Cuckold', 'Cheating', 'Infidelity', 'Affair', 'Netori', 'Netorare'],
    }

    // Load existing settings or use defaults
    const [settings, setSettings] = useState<SettingsData>({
        playerName: stage().getSave().player?.name || 'Director',
        playerDescription: stage().getSave().player?.description || 'The PARC\'s enigmatic Director is the station\'s sole authority.',
        aideName: stage().getSave().aide?.name || 'Soji',
        aideDescription: stage().getSave().aide?.description || 
            (`Your holographic aide is acutely familiar with the technical details of your Post-Apocalypse Rehabilitation Center, so you don't have to be! ` +
            `Your StationAide™ comes pre-programmed with a friendly and non-condescending demeanor that will leave you feeling empowered but never patronized; ` +
            `your bespoke projection comes with an industry-leading feminine form in a pleasing shade of default blue, but, as always, StationAide™ remains infinitely customizable to suit your tastes.\n\n` +
            `StationAide™. "When life gives you space stations..."`),
        disableTextToSpeech: stage().getSave().disableTextToSpeech ?? false,
        disableEmotionImages: stage().getSave().disableEmotionImages ?? false,
        characterArtStyle: stage().getSave().characterArtStyle ?? 'original',
        // Tag toggles; disabling these can be used to filter undesired content. Load from save array, if one. Otherwise, default to true.
        tagToggles: stage().getSave().bannedTags ? Object.fromEntries(
            Object.keys(tagMap).map(key => [
                key, !stage().getSave().bannedTags?.some(bannedTag => tagMap[key].includes(bannedTag))
            ])
        ) : Object.keys(tagMap).reduce((acc, key) => ({...acc, [key]: true}), {})
    });

    const handleSave = () => {
        console.log('Saving settings:', settings);
        
        // Update player name in save
        if (isNewGame) {
            stage().newGame();
        }
        const save = stage().getSave();
        save.player.name = settings.playerName;
        save.player.description = settings.playerDescription;
        save.aide.name = settings.aideName;
        save.aide.description = settings.aideDescription;

        save.bannedTags = Object.keys(settings.tagToggles).filter(key => !settings.tagToggles[key]).map(key => tagMap[key] ? tagMap[key] : [key]).flat();
        save.disableTextToSpeech = settings.disableTextToSpeech;
        save.disableEmotionImages = settings.disableEmotionImages;
        save.characterArtStyle = settings.characterArtStyle;

        stage().saveGame();
        onConfirm();
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
                    // Close if clicking backdrop (but not during new game setup)
                    if (e.target === e.currentTarget && !isNewGame) {
                        onCancel();
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
                            width: '80vw',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            position: 'relative',
                            padding: '30px',
                        }}
                    >
                        {/* Header with close button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px'
                        }}>
                            <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                {isNewGame ? 'New Game Setup' : 'Settings'}
                            </Title>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onCancel}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(0, 255, 136, 0.7)',
                                    cursor: 'pointer',
                                    fontSize: '24px',
                                    padding: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Close />
                            </motion.button>
                        </div>

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

                            {/* StationAide™ Name */}
                            <div>
                                <label 
                                    htmlFor="aide-name"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    StationAide™ Name
                                </label>
                                <TextInput
                                    id="aide-name"
                                    fullWidth
                                    value={settings.aideName}
                                    onChange={(e) => handleInputChange('aideName', e.target.value)}
                                    placeholder="Enter StationAide™ name"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>

                            {/* StationAide™ Description */}
                            <div>
                                <label 
                                    htmlFor="aide-description"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    StationAide™ Description
                                </label>
                                <textarea
                                    id="aide-description"
                                    className="text-input-primary"
                                    value={settings.aideDescription}
                                    onChange={(e) => handleInputChange('aideDescription', e.target.value)}
                                    placeholder="Describe your StationAide™..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        fontSize: '14px',
                                        resize: 'vertical',
                                    }}
                                />
                            </div>

                            {/* Generation Settings */}
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
                                    Generation Settings
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Disable Text to Speech Toggle */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSettings(prev => ({ ...prev, disableTextToSpeech: !prev.disableTextToSpeech }))}
                                        style={{
                                            padding: '12px',
                                            background: settings.disableTextToSpeech
                                                ? 'rgba(0, 255, 136, 0.15)'
                                                : 'rgba(0, 20, 40, 0.7)',
                                            border: settings.disableTextToSpeech
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
                                                background: settings.disableTextToSpeech ? '#00ff88' : 'rgba(255, 255, 255, 0.1)',
                                                border: '2px solid ' + (settings.disableTextToSpeech ? '#00ff88' : 'rgba(255, 255, 255, 0.3)'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {settings.disableTextToSpeech && (
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
                                                color: settings.disableTextToSpeech ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '13px',
                                                fontWeight: settings.disableTextToSpeech ? 'bold' : 'normal',
                                            }}
                                        >
                                            Disable Text to Speech
                                        </span>
                                    </motion.div>

                                    {/* Disable Emotion Images Toggle */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSettings(prev => ({ ...prev, disableEmotionImages: !prev.disableEmotionImages }))}
                                        style={{
                                            padding: '12px',
                                            background: settings.disableEmotionImages
                                                ? 'rgba(0, 255, 136, 0.15)'
                                                : 'rgba(0, 20, 40, 0.7)',
                                            border: settings.disableEmotionImages
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
                                                background: settings.disableEmotionImages ? '#00ff88' : 'rgba(255, 255, 255, 0.1)',
                                                border: '2px solid ' + (settings.disableEmotionImages ? '#00ff88' : 'rgba(255, 255, 255, 0.3)'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {settings.disableEmotionImages && (
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
                                                color: settings.disableEmotionImages ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '13px',
                                                fontWeight: settings.disableEmotionImages ? 'bold' : 'normal',
                                            }}
                                        >
                                            Disable Emotion Images
                                        </span>
                                    </motion.div>

                                    {/* Art Style Dropdown */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label
                                            style={{
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            Character Art Style
                                        </label>
                                        <select
                                            value={settings.characterArtStyle}
                                            onChange={(e) => setSettings(prev => ({ ...prev, characterArtStyle: e.target.value as ArtStyle }))}
                                            style={{
                                                padding: '10px',
                                                background: 'rgba(0, 20, 40, 0.7)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '8px',
                                                color: '#00ff88',
                                                fontSize: '13px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                outline: 'none',
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.5)';
                                                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                                                e.currentTarget.style.background = 'rgba(0, 20, 40, 0.7)';
                                            }}
                                        >
                                            <option value="original" style={{ background: '#001520', color: '#00ff88' }}>Original</option>
                                            <option value="anime" style={{ background: '#001520', color: '#00ff88' }}>Anime</option>
                                            <option value="chibi" style={{ background: '#001520', color: '#00ff88' }}>Chibi</option>
                                            <option value="comic" style={{ background: '#001520', color: '#00ff88' }}>Comic</option>
                                            <option value="pixel art" style={{ background: '#001520', color: '#00ff88' }}>Pixel Art</option>
                                            <option value="hyper-realistic" style={{ background: '#001520', color: '#00ff88' }}>Hyper-Realistic</option>
                                            <option value="realistic" style={{ background: '#001520', color: '#00ff88' }}>Realistic</option>
                                        </select>
                                    </div>
                                </div>
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
                                <Button
                                    variant="secondary"
                                    onClick={onCancel}
                                >
                                    Cancel
                                </Button>
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
