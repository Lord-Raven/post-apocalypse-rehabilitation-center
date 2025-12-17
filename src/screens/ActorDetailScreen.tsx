import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Stage } from '../Stage';
import Actor, { Stat, ACTOR_STAT_ICONS, getStatDescription, generatePrimaryActorImage, generateEmotionImage } from '../actors/Actor';
import { Emotion, EMOTION_PROMPTS } from '../actors/Emotion';
import { GlassPanel, Title, Button, TextInput, Chip } from '../components/UIComponents';
import { Close, Save, Image as ImageIcon } from '@mui/icons-material';
import { scoreToGrade } from '../utils';

interface ActorDetailScreenProps {
    actor: Actor;
    stage: () => Stage;
    onClose: () => void;
}

export const ActorDetailScreen: FC<ActorDetailScreenProps> = ({ actor, stage, onClose }) => {
    // Local state for editable fields
    const [editedActor, setEditedActor] = useState<{
        name: string;
        description: string;
        profile: string;
        development: string;
        style: string;
        voiceId: string;
        themeColor: string;
        themeFontFamily: string;
    }>({
        name: actor.name,
        description: actor.description,
        profile: actor.profile,
        development: actor.development || '',
        style: actor.style,
        voiceId: actor.voiceId,
        themeColor: actor.themeColor,
        themeFontFamily: actor.themeFontFamily,
    });

    const [isSaving, setIsSaving] = useState(false);
    const [regeneratingImages, setRegeneratingImages] = useState<Set<string>>(new Set());
    const [, forceUpdate] = useState({});
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ open: false, title: '', message: '', onConfirm: () => {} });

    const handleSave = () => {
        setIsSaving(true);
        
        // Update the actor in the save
        actor.name = editedActor.name;
        actor.description = editedActor.description;
        actor.profile = editedActor.profile;
        actor.development = editedActor.development;
        actor.style = editedActor.style;
        actor.voiceId = editedActor.voiceId;
        actor.themeColor = editedActor.themeColor;
        actor.themeFontFamily = editedActor.themeFontFamily;

        // Save the game
        stage().saveGame();
        
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleInputChange = (field: string, value: string | number) => {
        setEditedActor(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleRegenerateEmotion = async (emotion: Emotion) => {
        if (regeneratingImages.has(emotion)) return;
        
        setConfirmDialog({
            open: true,
            title: `Regenerate ${emotion} Image`,
            message: `This will regenerate the ${emotion} emotion image and replace the existing one. Continue?`,
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setRegeneratingImages(prev => new Set(prev).add(emotion));
                
                try {
                    await generateEmotionImage(actor, emotion, stage(), true);
                    // Force a re-render to show the new image
                    forceUpdate({});
                } catch (error) {
                    console.error(`Failed to regenerate ${emotion} emotion:`, error);
                    alert(`Failed to regenerate ${emotion} emotion. Check console for details.`);
                } finally {
                    setRegeneratingImages(prev => {
                        const next = new Set(prev);
                        next.delete(emotion);
                        return next;
                    });
                }
            }
        });
    };

    const handleRegenerateBase = async () => {
        if (regeneratingImages.has('base')) return;
        
        setConfirmDialog({
            open: true,
            title: 'Regenerate Base Image',
            message: 'This will regenerate the base image and may affect all emotion variations. Continue?',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, open: false }));
                setRegeneratingImages(prev => new Set(prev).add('base'));
                
                try {
                    await generatePrimaryActorImage(actor, stage(), true);
                    // Force a re-render to show the new image
                    forceUpdate({});
                } catch (error) {
                    console.error('Failed to regenerate base image:', error);
                    alert('Failed to regenerate base image. Check console for details.');
                } finally {
                    setRegeneratingImages(prev => {
                        const next = new Set(prev);
                        next.delete('base');
                        return next;
                    });
                }
            }
        });
    };

    // Get all emotions for the grid
    const allEmotions = Object.values(Emotion);
    
    // Get decor images
    const decorImages = Object.entries(actor.decorImageUrls).filter(([_, url]) => url);

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
                    style={{
                        width: '90vw',
                        maxWidth: '1400px',
                        maxHeight: '90vh',
                    }}
                >
                    <GlassPanel 
                        variant="bright"
                        style={{
                            height: '90vh',
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
                            marginBottom: '20px',
                            position: 'sticky',
                            top: 0,
                            background: 'rgba(0, 20, 40, 0.95)',
                            backdropFilter: 'blur(8px)',
                            padding: '10px 0',
                            zIndex: 10,
                        }}>
                            <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                Actor Details: {actor.name}
                            </Title>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Save style={{ fontSize: '20px' }} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
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
                        </div>

                        {/* Form Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            
                            {/* Basic Info Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Basic Information
                                </h2>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {/* Name */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Name
                                        </label>
                                        <TextInput
                                            fullWidth
                                            value={editedActor.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Character name"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Physical Description
                                        </label>
                                        <textarea
                                            value={editedActor.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="Physical appearance, attire, and distinguishing features"
                                            style={{
                                                width: '100%',
                                                minHeight: '100px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    {/* Profile/Personality */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Personality Profile
                                        </label>
                                        <textarea
                                            value={editedActor.profile}
                                            onChange={(e) => handleInputChange('profile', e.target.value)}
                                            placeholder="Key personality traits and behaviors"
                                            style={{
                                                width: '100%',
                                                minHeight: '100px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    {/* Development */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Development
                                        </label>
                                        <textarea
                                            value={editedActor.development}
                                            onChange={(e) => handleInputChange('development', e.target.value)}
                                            placeholder="Character arc over this narrative"
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    {/* Style */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Style & Aesthetic
                                        </label>
                                        <textarea
                                            value={editedActor.style}
                                            onChange={(e) => handleInputChange('style', e.target.value)}
                                            placeholder="Overall style, mood, interests, or aesthetic for decorating spaces"
                                            style={{
                                                width: '100%',
                                                minHeight: '60px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Theme & Voice Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Theme & Voice
                                </h2>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {/* Voice ID */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Voice ID
                                        </label>
                                        <TextInput
                                            fullWidth
                                            value={editedActor.voiceId}
                                            onChange={(e) => handleInputChange('voiceId', e.target.value)}
                                            placeholder="Voice identifier"
                                        />
                                    </div>

                                    {/* Theme Color */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Theme Color
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <TextInput
                                                value={editedActor.themeColor}
                                                onChange={(e) => handleInputChange('themeColor', e.target.value)}
                                                placeholder="#RRGGBB"
                                                style={{ flex: 1 }}
                                            />
                                            <div
                                                style={{
                                                    width: '50px',
                                                    height: '38px',
                                                    backgroundColor: editedActor.themeColor,
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Font Family */}
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Font Family
                                        </label>
                                        <TextInput
                                            fullWidth
                                            value={editedActor.themeFontFamily}
                                            onChange={(e) => handleInputChange('themeFontFamily', e.target.value)}
                                            placeholder="Font stack (e.g., Arial, sans-serif)"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Stats Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Character Stats
                                </h2>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                                    gap: '15px' 
                                }}>
                                    {Object.values(Stat).map(stat => {
                                        const StatIcon = ACTOR_STAT_ICONS[stat];
                                        return (
                                            <div 
                                                key={stat}
                                                style={{
                                                    backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                    padding: '12px',
                                                }}
                                            >
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    gap: '8px',
                                                    marginBottom: '8px'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <StatIcon style={{ color: '#00ff88', fontSize: '20px' }} />
                                                        <span
                                                            style={{
                                                                color: '#00ff88',
                                                                fontSize: '14px',
                                                                fontWeight: 'bold',
                                                                textTransform: 'capitalize',
                                                            }}
                                                        >
                                                            {stat}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '24px',
                                                            fontWeight: 'bold',
                                                            color: '#00ff88',
                                                        }}
                                                    >
                                                        {scoreToGrade(actor.stats[stat])}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Emotion Images Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <ImageIcon />
                                    Emotion Images
                                </h2>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                                    gap: '15px' 
                                }}>
                                    {/* Base Image */}
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleRegenerateBase}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '120px',
                                                height: '120px',
                                                backgroundColor: actor.emotionPack['base'] ? 'transparent' : 'rgba(0, 20, 40, 0.6)',
                                                border: `2px solid ${actor.emotionPack['base'] ? 'rgba(255, 136, 0, 0.5)' : 'rgba(0, 255, 136, 0.2)'}`,
                                                borderRadius: '8px',
                                                backgroundImage: actor.emotionPack['base'] ? `url(${actor.emotionPack['base']})` : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center top',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                position: 'relative',
                                            }}
                                        >
                                            {!actor.emotionPack['base'] && (
                                                <div style={{
                                                    color: 'rgba(0, 255, 136, 0.3)',
                                                    fontSize: '12px',
                                                    textAlign: 'center',
                                                    padding: '10px'
                                                }}>
                                                    Not Generated
                                                </div>
                                            )}
                                            {regeneratingImages.has('base') && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#00ff88',
                                                    fontSize: '12px',
                                                }}>
                                                    Generating...
                                                </div>
                                            )}
                                        </div>
                                        <Chip style={{
                                            fontSize: '11px',
                                            textTransform: 'capitalize',
                                            backgroundColor: 'rgba(255, 136, 0, 0.2)',
                                        }}>
                                            Base
                                        </Chip>
                                    </motion.div>

                                    {/* Emotion Images */}
                                    {allEmotions.map(emotion => {
                                        const imageUrl = actor.emotionPack[emotion];
                                        const hasImage = !!imageUrl;
                                        const isRegenerating = regeneratingImages.has(emotion);
                                        
                                        return (
                                            <motion.div
                                                key={emotion}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => handleRegenerateEmotion(emotion)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '120px',
                                                        height: '120px',
                                                        backgroundColor: hasImage ? 'transparent' : 'rgba(0, 20, 40, 0.6)',
                                                        border: `2px solid ${hasImage ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 255, 136, 0.2)'}`,
                                                        borderRadius: '8px',
                                                        backgroundImage: hasImage ? `url(${imageUrl})` : 'none',
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center top',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        overflow: 'hidden',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {!hasImage && (
                                                        <div style={{
                                                            color: 'rgba(0, 255, 136, 0.3)',
                                                            fontSize: '12px',
                                                            textAlign: 'center',
                                                            padding: '10px'
                                                        }}>
                                                            Not Generated
                                                        </div>
                                                    )}
                                                    {isRegenerating && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: '#00ff88',
                                                            fontSize: '12px',
                                                        }}>
                                                            Generating...
                                                        </div>
                                                    )}
                                                </div>
                                                <Chip style={{
                                                    fontSize: '11px',
                                                    textTransform: 'capitalize',
                                                    backgroundColor: hasImage ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 20, 40, 0.6)',
                                                }}>
                                                    {emotion}
                                                </Chip>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Decor Images Section */}
                            {decorImages.length > 0 && (
                                <section>
                                    <h2 style={{ 
                                        color: '#00ff88', 
                                        fontSize: '18px', 
                                        fontWeight: 'bold',
                                        marginBottom: '15px',
                                        borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                        paddingBottom: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <ImageIcon />
                                        Module Decor Images
                                    </h2>
                                    
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                                        gap: '15px' 
                                    }}>
                                        {decorImages.map(([moduleType, imageUrl]) => (
                                            <motion.div
                                                key={moduleType}
                                                whileHover={{ scale: 1.05 }}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '200px',
                                                        height: '150px',
                                                        backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                        border: '2px solid rgba(0, 255, 136, 0.5)',
                                                        borderRadius: '8px',
                                                        backgroundImage: `url(${imageUrl})`,
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                        overflow: 'hidden',
                                                    }}
                                                />
                                                <Chip style={{
                                                    fontSize: '11px',
                                                    textTransform: 'capitalize',
                                                }}>
                                                    {moduleType}
                                                </Chip>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Read-only Info Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Additional Information
                                </h2>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '15px',
                                    backgroundColor: 'rgba(0, 20, 40, 0.4)',
                                    padding: '15px',
                                    borderRadius: '5px',
                                    border: '1px solid rgba(0, 255, 136, 0.2)',
                                }}>
                                    <div>
                                        <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                            Actor ID
                                        </div>
                                        <div style={{ color: '#e0f0ff', fontSize: '14px', fontFamily: 'monospace' }}>
                                            {actor.id}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                            Birth Day
                                        </div>
                                        <div style={{ color: '#e0f0ff', fontSize: '14px' }}>
                                            {actor.birthDay >= 0 ? `Day ${actor.birthDay}` : 'Not born yet'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                            Participations
                                        </div>
                                        <div style={{ color: '#e0f0ff', fontSize: '14px' }}>
                                            {actor.participations}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                            Origin
                                        </div>
                                        <div style={{ color: '#e0f0ff', fontSize: '14px', textTransform: 'capitalize' }}>
                                            {actor.origin}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                            Images Complete
                                        </div>
                                        <div style={{ color: '#e0f0ff', fontSize: '14px' }}>
                                            {actor.isImageLoadingComplete ? 'Yes' : 'No'}
                                        </div>
                                    </div>
                                    {actor.fullPath && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                                Source Path
                                            </div>
                                            <div style={{ 
                                                color: '#e0f0ff', 
                                                fontSize: '12px', 
                                                fontFamily: 'monospace',
                                                wordBreak: 'break-all'
                                            }}>
                                                {actor.fullPath}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>
                    </GlassPanel>
                </motion.div>
            </motion.div>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                PaperProps={{
                    style: {
                        backgroundColor: 'rgba(0, 20, 40, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(0, 255, 136, 0.3)',
                        borderRadius: '8px',
                        color: '#e0f0ff',
                        minWidth: '400px',
                    }
                }}
            >
                <DialogTitle style={{
                    color: '#00ff88',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                    paddingBottom: '10px',
                }}>
                    {confirmDialog.title}
                </DialogTitle>
                <DialogContent style={{ paddingTop: '20px' }}>
                    <div style={{
                        color: '#e0f0ff',
                        fontSize: '14px',
                        lineHeight: '1.6',
                    }}>
                        {confirmDialog.message}
                    </div>
                </DialogContent>
                <DialogActions style={{ padding: '15px 20px' }}>
                    <Button
                        onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                        variant="secondary"
                        style={{ marginRight: '10px' }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDialog.onConfirm}
                        variant="primary"
                    >
                        Regenerate
                    </Button>
                </DialogActions>
            </Dialog>
        </AnimatePresence>
    );
};
