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
    themeColor: string;
    themeFontFamily: string;
    aideName: string;
    aideDescription: string;
    directorModuleName: string;
    directorModuleRoleName: string;
    disableTextToSpeech: boolean;
    disableEmotionImages: boolean;
    disableDecorImages: boolean;
    disableImpersonation: boolean;
    disableFontEffects: boolean;
    typeOutSpeed: number;
    characterArtStyle: ArtStyle;
    characterArtist: string;
    tagToggles: { [key: string]: boolean };
    writeInTags: string[]; // write-in banned tags (not part of tagMap)
    language: string;
    tone: string;
}

export const SettingsScreen: FC<SettingsScreenProps> = ({ stage, onCancel, onConfirm, isNewGame = false }) => {
    const CUSTOM_TONE_KEY = 'Custom';
    const playerThemeColorDefault = '#718096';
    const playerThemeFontFamilyDefault = `'Geologica', sans-serif`;
    const minTypeOutSpeed = 0;
    const maxTypeOutSpeed = 50;
    const defaultTypeOutSpeed = stage().DEFAULT_TYPE_OUT_SPEED;

    const themeColorOptions = [
        { label: 'Default Slate', value: '#718096' },
        { label: 'PARC Green', value: '#00ff88' },
        { label: 'Sky Blue', value: '#87ceeb' },
        { label: 'Amber', value: '#f6ad55' },
        { label: 'Rose', value: '#f56565' },
        { label: 'Violet', value: '#9f7aea' },
    ];

    const themeFontFamilyOptions = [
        { label: 'Geologica', value: `'Geologica', sans-serif` },
        { label: 'Segoe UI', value: `'Segoe UI', 'Helvetica Neue', Arial, sans-serif` },
        { label: 'Trebuchet', value: `'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif` },
        { label: 'Georgia', value: `Georgia, 'Times New Roman', serif` },
        { label: 'Courier New', value: `'Courier New', monospace` },
    ];

    const clampTypeOutSpeed = (value: number) => {
        if (Number.isNaN(value)) {
            return defaultTypeOutSpeed;
        }
        return Math.min(maxTypeOutSpeed, Math.max(minTypeOutSpeed, value));
    };

    // Common languages for autocomplete
    const commonLanguages = [
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Japanese',
        'Korean', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Hindi', 'Bengali',
        'Urdu', 'Indonesian', 'Turkish', 'Vietnamese', 'Thai', 'Polish', 'Dutch', 'Swedish',
        'Norwegian', 'Danish', 'Finnish', 'Greek', 'Hebrew', 'Czech', 'Hungarian', 'Romanian',
        'Ukrainian', 'Catalan', 'Serbian', 'Croatian', 'Bulgarian', 'Slovak', 'Lithuanian',
        'Latvian', 'Estonian', 'Slovenian', 'Malay', 'Tagalog', 'Swahili', 'Afrikaans', 'Catalan'
    ];

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
        'Submissive': ['Submissive', 'Sub'],
        'Dominant': ['Dominant', 'Dom'],
        'Sadistic': ['Sadistic', 'Sadism'],
        'Masochistic': ['Masochistic', 'Masochism'],
        'BDSM': ['BDSM', 'Bondage', 'Discipline'],
        'Tomboy': ['Tomboy'],
        'Femboy': ['Femboy'],
        'Goth': ['Goth'],
        'MILF': ['MILF', 'mother', 'mom', 'mommy'],
        'Petite': ['Petite'],
        'Chubby': ['Chubby', 'Fat'],
        'Muscular': ['Muscular'],
        'Giant': ['Giant', 'Giantess'],
        'Size Difference': ['Size Difference'],
        'Fantasy': ['Fantasy'],
        'Sci-Fi': ['Sci-Fi', 'Science Fiction'],
        'Romance': ['Romance', 'Love', 'Drama']
    }

    // Build initial tag toggles and write-in tags from save
    const saveFromStage = stage().getSave();
    const toneMap = stage().TONE_MAP;
    const toneEntries = Object.entries(toneMap);

    const getTonePresetFromValue = (toneValue?: string): string => {
        if (!toneValue) {
            return 'Original';
        }

        const match = toneEntries.find(([, value]) => value === toneValue);
        return match ? match[0] : CUSTOM_TONE_KEY;
    };

    const initialTonePreset = getTonePresetFromValue(saveFromStage.tone);
    const initialTone = saveFromStage.tone || toneMap['Original'];

    const initialTagToggles = Object.keys(tagMap).reduce((acc, key) => ({ ...acc, [key]: true }), {} as { [key: string]: boolean });
    const initialWriteIns: string[] = [];

    if (saveFromStage?.bannedTags && Array.isArray(saveFromStage.bannedTags)) {
        for (const banned of saveFromStage.bannedTags) {
            let matched = false;
            for (const [key, arr] of Object.entries(tagMap)) {
                if (arr.includes(banned)) {
                    initialTagToggles[key] = false; // ban the mapped key
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                // This is a write-in tag that doesn't match any mapped tags
                initialWriteIns.push(banned);
            }
        }
    }

    // Load existing settings or use defaults
    const [settings, setSettings] = useState<SettingsData>({
        playerName: saveFromStage.player?.name || 'Director',
        playerDescription: saveFromStage.player?.description || 'The PARC\'s enigmatic Director is the station\'s sole authority.',
        themeColor: saveFromStage.player?.themeColor || playerThemeColorDefault,
        themeFontFamily: saveFromStage.player?.themeFontFamily || playerThemeFontFamilyDefault,
        aideName: saveFromStage.aide?.name || 'Soji',
        aideDescription: saveFromStage.aide?.description ||
            (`Your holographic aide is acutely familiar with the technical details of your Post-Apocalypse Rehabilitation Center, so you don't have to be! ` +
            `Your StationAide™ comes pre-programmed with a friendly and non-condescending demeanor that will leave you feeling empowered but never patronized; ` +
            `your bespoke projection comes with an industry-leading feminine form in a pleasing shade of default blue, but, as always, StationAide™ remains infinitely customizable to suit your tastes.\n\n` +
            `StationAide™. "When life gives you space stations..."`),
        directorModuleName: saveFromStage.directorModule?.name || 'Director\'s Cabin',
        directorModuleRoleName: saveFromStage.directorModule?.roleName || 'Maid',
        disableTextToSpeech: saveFromStage.disableTextToSpeech ?? false,
        disableEmotionImages: saveFromStage.disableEmotionImages ?? false,
        disableDecorImages: saveFromStage.disableDecorImages ?? saveFromStage.disableEmotionImages ?? false,
        disableImpersonation: saveFromStage.disableImpersonation ?? false,
        disableFontEffects: saveFromStage.disableFontEffects ?? false,
        typeOutSpeed: clampTypeOutSpeed(saveFromStage.typeOutSpeed ?? defaultTypeOutSpeed),
        characterArtStyle: saveFromStage.characterArtStyle ?? 'original',
        characterArtist: saveFromStage.characterArtist ?? '',
        language: saveFromStage.language || 'English',
        tone: initialTone,
        // Tag toggles; disabling these can be used to filter undesired content. Load from save array, if one. Otherwise, default to true.
        tagToggles: initialTagToggles,
        writeInTags: initialWriteIns
    });
    const [selectedTonePreset, setSelectedTonePreset] = useState<string>(initialTonePreset);

    const [languageSuggestions, setLanguageSuggestions] = useState<string[]>([]);
    const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);

    // new-writein input
    const [newWriteIn, setNewWriteIn] = useState('');

    const handleSave = () => {
        console.log('Saving settings:', settings);
        
        if (isNewGame) {
            stage().newGame();
        }
        const save = stage().getSave();
        save.player.name = settings.playerName;
        save.player.description = settings.playerDescription;
        save.player.themeColor = settings.themeColor;
        save.player.themeFontFamily = settings.themeFontFamily;
        save.aide.name = settings.aideName;
        save.aide.description = settings.aideDescription;
        save.directorModule = save.directorModule || {};
        save.directorModule.name = settings.directorModuleName;
        save.directorModule.roleName = settings.directorModuleRoleName;

        // Build bannedTags from toggles (mapped arrays) and write-in tags, deduplicated
        const mappedBans = Object.keys(settings.tagToggles)
            .filter(key => !settings.tagToggles[key])
            .map(key => tagMap[key] ? tagMap[key] : [key])
            .flat();

        const writeIns = settings.writeInTags ? settings.writeInTags.filter(Boolean) : [];

        save.bannedTags = Array.from(new Set([...mappedBans, ...writeIns]));
        save.disableTextToSpeech = settings.disableTextToSpeech;
        save.disableEmotionImages = settings.disableEmotionImages;
        save.disableDecorImages = settings.disableDecorImages;
        save.disableImpersonation = settings.disableImpersonation;
        save.disableFontEffects = settings.disableFontEffects;
        save.typeOutSpeed = clampTypeOutSpeed(settings.typeOutSpeed);
        save.characterArtStyle = settings.characterArtStyle;
        save.characterArtist = settings.characterArtist;
        save.language = settings.language;
        save.tone = settings.tone;

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

    const handleLanguageChange = (value: string) => {
        setSettings(prev => ({ ...prev, language: value }));
        
        // Filter and update suggestions
        if (value.trim()) {
            const filtered = commonLanguages.filter(lang => 
                lang.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 8); // Limit to 8 suggestions
            setLanguageSuggestions(filtered);
            setShowLanguageSuggestions(filtered.length > 0);
        } else {
            setLanguageSuggestions([]);
            setShowLanguageSuggestions(false);
        }
    };

    const selectLanguage = (language: string) => {
        setSettings(prev => ({ ...prev, language }));
        setShowLanguageSuggestions(false);
    };

    const handleTonePresetChange = (preset: string) => {
        setSelectedTonePreset(preset);

        if (preset !== CUSTOM_TONE_KEY && toneMap[preset]) {
            setSettings(prev => ({ ...prev, tone: toneMap[preset] }));
        }
    };

    const handleToneChange = (tone: string) => {
        setSelectedTonePreset(CUSTOM_TONE_KEY);
        setSettings(prev => ({ ...prev, tone }));
    };

    // Write-in handlers
    const addWriteInTag = (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        // don't add duplicates (either existing writeIns or tags covered by tagMap)
        const already = settings.writeInTags.some(t => t.toLowerCase() === trimmed.toLowerCase());
        const coveredByMap = Object.values(tagMap).some(arr => arr.some(v => v.toLowerCase() === trimmed.toLowerCase()));
        if (already || coveredByMap) {
            setNewWriteIn('');
            return;
        }
        setSettings(prev => ({ ...prev, writeInTags: [...prev.writeInTags, trimmed] }));
        setNewWriteIn('');
    };

    const updateWriteInTag = (index: number, value: string) => {
        const trimmed = value; // allow editing; handle empty removal on blur elsewhere
        setSettings(prev => ({ ...prev, writeInTags: prev.writeInTags.map((t, i) => i === index ? trimmed : t) }));
    };

    const removeWriteInTag = (index: number) => {
        setSettings(prev => ({ ...prev, writeInTags: prev.writeInTags.filter((_, i) => i !== index) }));
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
                    // Don't close if user is selecting text
                    const selection = window.getSelection();
                    const hasSelection = selection && selection.toString().length > 0;
                    
                    if (e.target === e.currentTarget && !isNewGame && !hasSelection) {
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

                            {/* Player Theme Color */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label
                                    htmlFor="player-theme-color"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Player Theme Color
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <select
                                        id="player-theme-color"
                                        value={settings.themeColor}
                                        onChange={(e) => setSettings(prev => ({ ...prev, themeColor: e.target.value }))}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: 'rgba(0, 20, 40, 0.7)',
                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                            borderRadius: '8px',
                                            color: '#00ff88',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        {themeColorOptions.map((option) => (
                                            <option key={option.value} value={option.value} style={{ background: '#001520', color: '#00ff88' }}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div
                                        style={{
                                            width: '42px',
                                            height: '38px',
                                            borderRadius: '8px',
                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                            backgroundColor: settings.themeColor,
                                            flexShrink: 0,
                                        }}
                                        aria-label={`Theme color preview: ${settings.themeColor}`}
                                    />
                                </div>
                            </div>

                            {/* Player Theme Font */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label
                                    htmlFor="player-theme-font"
                                    style={{
                                        display: 'block',
                                        color: '#00ff88',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        marginBottom: '8px',
                                    }}
                                >
                                    Player Theme Font
                                </label>
                                <select
                                    id="player-theme-font"
                                    value={settings.themeFontFamily}
                                    onChange={(e) => setSettings(prev => ({ ...prev, themeFontFamily: e.target.value }))}
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
                                    }}
                                >
                                    {themeFontFamilyOptions.map((option) => (
                                        <option key={option.value} value={option.value} style={{ background: '#001520', color: '#00ff88' }}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <div
                                    style={{
                                        color: 'rgba(255, 255, 255, 0.75)',
                                        fontSize: '13px',
                                        fontFamily: settings.themeFontFamily,
                                    }}
                                >
                                    Preview: The Director speaks with this voice.
                                </div>
                            </div>

                            {/* StationAide™ Name */}
                            {isNewGame && (
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
                            )}

                            {/* StationAide™ Description */}
                            {isNewGame && (
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
                            )}
                            
                            {/* Director's Module Name */}
                            {isNewGame && (
                                <div>
                                    <label 
                                        htmlFor="director-module-name"
                                        style={{
                                            display: 'block',
                                            color: '#00ff88',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        Director's Module Name
                                    </label>
                                    <TextInput
                                        id="director-module-name"
                                        fullWidth
                                        value={settings.directorModuleName}
                                        onChange={(e) => handleInputChange('directorModuleName', e.target.value)}
                                        placeholder="Enter Director's Module Name"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                            )}
                            {/* Director's Module Job Title */}
                            {isNewGame && (
                                <div>
                                    <label 
                                        htmlFor="director-room-role-name"
                                        style={{
                                            display: 'block',
                                            color: '#00ff88',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            marginBottom: '8px',
                                        }}
                                    >
                                        Director's Module Job Title (a patient-assignable role)
                                    </label>
                                    <TextInput
                                        id="director-module-role-name"
                                        fullWidth
                                        value={settings.directorModuleRoleName}
                                        onChange={(e) => handleInputChange('directorModuleRoleName', e.target.value)}
                                        placeholder="Enter Director's Module Job Title"
                                        style={{ fontSize: '16px' }}
                                    />
                                </div>
                            )}

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

                                    {/* Disable Decor Images Toggle */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSettings(prev => ({ ...prev, disableDecorImages: !prev.disableDecorImages }))}
                                        style={{
                                            padding: '12px',
                                            background: settings.disableDecorImages
                                                ? 'rgba(0, 255, 136, 0.15)'
                                                : 'rgba(0, 20, 40, 0.7)',
                                            border: settings.disableDecorImages
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
                                                background: settings.disableDecorImages ? '#00ff88' : 'rgba(255, 255, 255, 0.1)',
                                                border: '2px solid ' + (settings.disableDecorImages ? '#00ff88' : 'rgba(255, 255, 255, 0.3)'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {settings.disableDecorImages && (
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
                                                color: settings.disableDecorImages ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '13px',
                                                fontWeight: settings.disableDecorImages ? 'bold' : 'normal',
                                            }}
                                        >
                                            Disable Decor Images
                                        </span>
                                    </motion.div>

                                    {/* Disable Impersonation Toggle */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSettings(prev => ({ ...prev, disableImpersonation: !prev.disableImpersonation }))}
                                        style={{
                                            padding: '12px',
                                            background: settings.disableImpersonation
                                                ? 'rgba(0, 255, 136, 0.15)'
                                                : 'rgba(0, 20, 40, 0.7)',
                                            border: settings.disableImpersonation
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
                                                background: settings.disableImpersonation ? '#00ff88' : 'rgba(255, 255, 255, 0.1)',
                                                border: '2px solid ' + (settings.disableImpersonation ? '#00ff88' : 'rgba(255, 255, 255, 0.3)'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {settings.disableImpersonation && (
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
                                                color: settings.disableImpersonation ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '13px',
                                                fontWeight: settings.disableImpersonation ? 'bold' : 'normal',
                                            }}
                                        >
                                            Disable Impersonation
                                        </span>
                                    </motion.div>

                                    {/* Disable Font Effects Toggle */}
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSettings(prev => ({ ...prev, disableFontEffects: !prev.disableFontEffects }))}
                                        style={{
                                            padding: '12px',
                                            background: settings.disableFontEffects
                                                ? 'rgba(0, 255, 136, 0.15)'
                                                : 'rgba(0, 20, 40, 0.7)',
                                            border: settings.disableFontEffects
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
                                                background: settings.disableFontEffects ? '#00ff88' : 'rgba(255, 255, 255, 0.1)',
                                                border: '2px solid ' + (settings.disableFontEffects ? '#00ff88' : 'rgba(255, 255, 255, 0.3)'),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {settings.disableFontEffects && (
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
                                                color: settings.disableFontEffects ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                                                fontSize: '13px',
                                                fontWeight: settings.disableFontEffects ? 'bold' : 'normal',
                                            }}
                                        >
                                            Disable Font Effects
                                        </span>
                                    </motion.div>

                                    {/* Type-Out Speed Slider */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label
                                            htmlFor="type-out-speed"
                                            style={{
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            Type-Out Speed
                                        </label>
                                        <div
                                            style={{
                                                padding: '12px',
                                                background: 'rgba(0, 20, 40, 0.7)',
                                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '10px',
                                            }}
                                        >
                                            <input
                                                id="type-out-speed"
                                                type="range"
                                                min={minTypeOutSpeed}
                                                max={maxTypeOutSpeed}
                                                step={5}
                                                value={settings.typeOutSpeed}
                                                onChange={(e) => setSettings(prev => ({
                                                    ...prev,
                                                    typeOutSpeed: clampTypeOutSpeed(parseInt(e.target.value, 10))
                                                }))}
                                                style={{
                                                    width: '100%',
                                                    accentColor: '#00ff88',
                                                    cursor: 'pointer',
                                                }}
                                            />
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '12px',
                                                    color: 'rgba(255, 255, 255, 0.75)',
                                                    fontSize: '12px',
                                                }}
                                            >
                                                <span>Faster</span>
                                                <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
                                                    {settings.typeOutSpeed} ms/char
                                                </span>
                                                <span>Slower</span>
                                            </div>
                                        </div>
                                    </div>

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
                                            <option value="specific artist" style={{ background: '#001520', color: '#00ff88' }}>Specific Artist</option>
                                        </select>
                                    </div>

                                    {/* Specific Artist Textbox - Only shown when "specific artist" is selected */}
                                    <AnimatePresence>
                                        {settings.characterArtStyle === 'specific artist' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}
                                            >
                                                <label
                                                    htmlFor="specific-artist"
                                                    style={{
                                                        color: 'rgba(255, 255, 255, 0.8)',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                    }}
                                                >
                                                    Artist Name
                                                </label>
                                                <TextInput
                                                    id="specific-artist"
                                                    fullWidth
                                                    value={settings.characterArtist}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, characterArtist: e.target.value }))}
                                                    placeholder="Enter artist name"
                                                    style={{ fontSize: '13px' }}
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Language Input */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label
                                            htmlFor="language-input"
                                            style={{
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            Language
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <TextInput
                                                id="language-input"
                                                fullWidth
                                                value={settings.language}
                                                onChange={(e) => handleLanguageChange(e.target.value)}
                                                onFocus={() => {
                                                    if (settings.language.trim()) {
                                                        handleLanguageChange(settings.language);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    // Delay to allow clicking on suggestions
                                                    setTimeout(() => setShowLanguageSuggestions(false), 200);
                                                }}
                                                placeholder="Enter any language or style..."
                                                style={{ fontSize: '13px' }}
                                            />
                                            {/* Language suggestions dropdown */}
                                            <AnimatePresence>
                                                {showLanguageSuggestions && languageSuggestions.length > 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.15 }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '100%',
                                                            left: 0,
                                                            right: 0,
                                                            marginTop: '4px',
                                                            background: 'rgba(0, 20, 40, 0.95)',
                                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            zIndex: 1000,
                                                            maxHeight: '200px',
                                                            overflowY: 'auto',
                                                        }}
                                                    >
                                                        {languageSuggestions.map((lang, index) => (
                                                            <motion.div
                                                                key={lang}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.02 }}
                                                                onClick={() => selectLanguage(lang)}
                                                                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                                                style={{
                                                                    padding: '10px 12px',
                                                                    cursor: 'pointer',
                                                                    color: 'rgba(255, 255, 255, 0.8)',
                                                                    fontSize: '13px',
                                                                    transition: 'all 0.15s ease',
                                                                    borderBottom: index < languageSuggestions.length - 1 
                                                                        ? '1px solid rgba(0, 255, 136, 0.1)' 
                                                                        : 'none',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = 'rgba(0, 255, 136, 0.15)';
                                                                    e.currentTarget.style.color = '#00ff88';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'transparent';
                                                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                                                }}
                                                            >
                                                                {lang}
                                                            </motion.div>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Narrative Tone Controls */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <label
                                            htmlFor="tone-preset-select"
                                            style={{
                                                color: 'rgba(255, 255, 255, 0.8)',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            Narrative Tone
                                        </label>

                                        <select
                                            id="tone-preset-select"
                                            value={selectedTonePreset}
                                            onChange={(e) => handleTonePresetChange(e.target.value)}
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
                                        >
                                            {toneEntries.map(([key]) => (
                                                <option key={key} value={key} style={{ background: '#001520', color: '#00ff88' }}>
                                                    {key}
                                                </option>
                                            ))}
                                            <option value={CUSTOM_TONE_KEY} style={{ background: '#001520', color: '#00ff88' }}>
                                                {CUSTOM_TONE_KEY}
                                            </option>
                                        </select>

                                        <textarea
                                            className="text-input-primary"
                                            value={settings.tone}
                                            onChange={(e) => handleToneChange(e.target.value)}
                                            placeholder="Enter narrative tone instructions..."
                                            rows={5}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                fontSize: '13px',
                                                resize: 'vertical',
                                            }}
                                        />
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

                                    {/* Existing write-in tags (editable) */}
                                    {settings.writeInTags.map((tag, idx) => (
                                        <motion.div
                                            key={`writein-${idx}`}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                padding: '8px',
                                                background: 'rgba(0, 20, 40, 0.7)',
                                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <div style={{
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '4px',
                                                background: '#ff6b6b',
                                                color: '#200',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                flexShrink: 0,
                                            }}>×</div>
                                            <input
                                                value={tag}
                                                onChange={(e) => updateWriteInTag(idx, e.target.value)}
                                                onBlur={() => {
                                                    // remove if emptied
                                                    if (!settings.writeInTags[idx]?.trim()) {
                                                        removeWriteInTag(idx);
                                                    }
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'rgba(255,255,255,0.9)',
                                                    outline: 'none',
                                                    fontSize: '13px',
                                                    width: '100%'
                                                }}
                                            />
                                            <button
                                                onClick={() => removeWriteInTag(idx)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'rgba(255,255,255,0.6)',
                                                    cursor: 'pointer'
                                                }}
                                                aria-label={`Remove write-in tag ${tag}`}
                                            >
                                                ✕
                                            </button>
                                        </motion.div>
                                    ))}

                                    {/* New write-in input (always present as trailing blank) */}
                                    <motion.div
                                        key="writein-new"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            padding: '8px',
                                            background: 'rgba(0, 20, 40, 0.7)',
                                            border: '2px dashed rgba(255, 255, 255, 0.08)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '4px',
                                            background: '#ff6b6b',
                                            color: '#200',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            flexShrink: 0,
                                        }}>×</div>
                                        <input
                                            placeholder="Ban a tag..."
                                            value={newWriteIn}
                                            onChange={(e) => setNewWriteIn(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addWriteInTag(newWriteIn);
                                                }
                                            }}
                                            onBlur={() => addWriteInTag(newWriteIn)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'rgba(255,255,255,0.6)',
                                                outline: 'none',
                                                fontSize: '13px',
                                                width: '100%'
                                            }}
                                        />
                                    </motion.div>
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
