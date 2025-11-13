/*
 * This screen displays Visual Novel vignette scenes, displaying dialogue and characters as they interact with the player and each other.
 */
import React, { FC, useEffect } from 'react';
import { ScreenType } from './BaseScreen';
import { Module } from '../Module';
import Actor, { namesMatch } from '../actors/Actor';
import { Stage } from '../Stage';
import { VignetteData } from '../Vignette';
import ActorImage from '../actors/ActorImage';
import { Emotion } from '../Emotion';
import SingleTypeOut from "../SingleTypeOut";
import { 
    Box, 
    Button, 
    TextField, 
    Typography, 
    Paper,
    IconButton,
    Chip,
    CircularProgress
} from '@mui/material';
import {
    ArrowBackIos,
    ArrowForwardIos,
    Send,
    Close
} from '@mui/icons-material';

// Small component that shows a loading indicator
const LoadingIndicator: React.FC<{ active?: boolean }> = ({ active }) => {
    if (!active) return <span>...</span>;
    return <CircularProgress size={16} sx={{ color: '#bfffd0' }} />;
};

interface VignetteScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const VignetteScreen: FC<VignetteScreenProps> = ({ stage, setScreenType }) => {
    const [index, setIndex] = React.useState<number>(0);
    const [inputText, setInputText] = React.useState<string>('');
    const [sceneEnded, setSceneEnded] = React.useState<boolean>(false);
    const [vignette, setVignette] = React.useState<VignetteData>(stage().getSave().currentVignette as VignetteData);
    const [loading, setLoading] = React.useState<boolean>(false);

    useEffect(() => {
        if (vignette.script.length == 0) {
            setLoading(true);
            stage().continueVignette().then(() => {
                setVignette({...stage().getSave().currentVignette as VignetteData});
                setLoading(false);
                setSceneEnded(stage().getSave().currentVignette?.endScene || false);
            });
        }
    }, [vignette]);
    
    const next = () => {
        setIndex(prevIndex => Math.min(prevIndex + 1, vignette.script.length - 1));
    };

    const prev = () => {
        setIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };

    const renderActors = (module: Module | null, actors: Actor[], currentSpeaker?: string) => {
        // Display actors centered across the scene bottom. Use neutral emotion image where possible
        return actors.map((actor, i) => {
            const imageUrl = actor.emotionPack?.neutral || actor.avatarImageUrl || '';
            const increment = actors.length > 1 ? (i / (actors.length - 1)) : 0.5;
            const xPosition = Math.round(increment * 80) + 10;
            const isSpeaking = !!currentSpeaker && !!actor.name && namesMatch(actor.name.trim().toLowerCase(), currentSpeaker.trim().toLowerCase());
            return (
                <ActorImage
                    key={actor.id}
                    actor={actor}
                    emotion={Emotion.neutral}
                    imageUrl={imageUrl}
                    xPosition={xPosition}
                    yPosition={0}
                    zIndex={1}
                    speaker={isSpeaking}
                    highlightColor="rgba(255,255,255,0)"
                    panX={0}
                    panY={0}
                />
            );
        });
    }

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            {/* Background image (module) with slight blur */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${(stage().getSave().layout.getModuleById(vignette.moduleId || '')?.attributes?.defaultImageUrl || '')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(6px) brightness(0.6) contrast(1.05)',
                transform: 'scale(1.03)'
            }} />

            {/* A subtle overlay to tint the scene and provide readable contrast */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 60%)' }} />

            {/* Actors */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                {renderActors(stage().getSave().layout.getModuleById(vignette.moduleId || ''), Object.values(stage().getSave().actors).filter(actor => actor.locationId === (vignette.moduleId || '')) || [], vignette.script && vignette.script.length > 0 ? vignette.script[index]?.speaker : undefined)}
            </div>

            {/* Bottom text window */}
            <Paper 
                elevation={8}
                sx={{ 
                    position: 'absolute', 
                    left: '5%', 
                    right: '5%', 
                    bottom: '4%', 
                    background: 'rgba(10,20,30,0.95)', 
                    border: '2px solid rgba(0,255,136,0.12)', 
                    borderRadius: 3,
                    p: 3,
                    color: '#e8fff0', 
                    zIndex: 2,
                    backdropFilter: 'blur(8px)'
                }}
            >
                {/* Navigation and speaker section */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <IconButton 
                            onClick={prev} 
                            disabled={index === 0}
                            size="small"
                            sx={{ 
                                color: '#cfe', 
                                border: '1px solid rgba(255,255,255,0.08)',
                                '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                            }}
                        >
                            <ArrowBackIos fontSize="small" />
                        </IconButton>

                        {/* Progress indicator */}
                        <Chip
                            label={loading ? <LoadingIndicator active={loading} /> : `${index + 1} / ${vignette.script.length}`}
                            sx={{ 
                                minWidth: 80,
                                fontWeight: 700, 
                                color: '#bfffd0', 
                                background: 'rgba(255,255,255,0.02)', 
                                border: '1px solid rgba(255,255,255,0.03)',
                                '& .MuiChip-label': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                }
                            }}
                        />

                        <IconButton 
                            onClick={next} 
                            disabled={index === vignette.script.length - 1}
                            size="small"
                            sx={{ 
                                color: '#cfe', 
                                border: '1px solid rgba(255,255,255,0.08)',
                                '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                            }}
                        >
                            <ArrowForwardIos fontSize="small" />
                        </IconButton>

                        {/* Speaker name */}
                        {(vignette.script && vignette.script.length > 0 && vignette.script[index]?.speaker && vignette.script[index]?.speaker.trim().toUpperCase() !== 'NARRATOR') && (
                            <Chip
                                label={vignette.script[index]?.speaker}
                                variant="outlined"
                                sx={{ 
                                    ml: 1.5,
                                    fontWeight: 800, 
                                    color: '#eafff0', 
                                    letterSpacing: '0.6px',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    textShadow: '0 1px 0 rgba(0,0,0,0.6)'
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Message content */}
                <Box sx={{ minHeight: '4rem', mb: 2 }}>
                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: '1.18rem',
                            lineHeight: 1.55,
                            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                            color: '#e9fff7'
                        }}
                    >
                        {vignette.script && vignette.script.length > 0 ? (
                            <SingleTypeOut
                                key={`message-box-${index}`}
                                text={vignette.script[index]?.message || ''}
                                speed={20}
                                onAdvance={next}
                            />
                        ) : ''}
                    </Typography>
                </Box>

                {/* Chat input */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <TextField
                        fullWidth
                        value={inputText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputText(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (index === vignette.script.length - 1 && !sceneEnded) handleSubmit();
                                else if (sceneEnded) handleClose();
                            }
                        }}
                        placeholder={
                            index === vignette.script.length - 1 
                                ? (sceneEnded ? 'Scene concluded' : 'Type your course of action...') 
                                : (loading ? 'Generating...' : 'Advance to the final line...')
                        }
                        disabled={!(index === vignette.script.length - 1) || sceneEnded || loading}
                        variant="outlined"
                        size="small"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
                                color: '#eafff2',
                                '& fieldset': {
                                    borderColor: 'rgba(255,255,255,0.08)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255,255,255,0.12)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: 'rgba(0,255,136,0.3)',
                                },
                            },
                            '& .MuiInputBase-input::placeholder': {
                                color: 'rgba(255,255,255,0.5)',
                                opacity: 1,
                            },
                        }}
                    />
                    <Button
                        onClick={() => { if (sceneEnded) handleClose(); else handleSubmit(); }}
                        disabled={!(index === vignette.script.length - 1) || loading}
                        variant="contained"
                        startIcon={sceneEnded ? <Close /> : <Send />}
                        sx={{
                            background: sceneEnded 
                                ? 'linear-gradient(90deg,#ff8c66,#ff5a3b)' 
                                : (index === vignette.script.length - 1 && !sceneEnded) 
                                    ? 'linear-gradient(90deg,#00ff88,#00b38f)' 
                                    : 'rgba(255,255,255,0.04)',
                            color: sceneEnded ? '#fff' : '#00221a',
                            fontWeight: 800,
                            minWidth: 100,
                            '&:hover': {
                                background: sceneEnded 
                                    ? 'linear-gradient(90deg,#ff7a52,#ff4621)' 
                                    : (index === vignette.script.length - 1 && !sceneEnded) 
                                        ? 'linear-gradient(90deg,#00e67a,#009a7b)' 
                                        : 'rgba(255,255,255,0.06)',
                            },
                            '&:disabled': {
                                background: 'rgba(255,255,255,0.04)',
                                color: 'rgba(255,255,255,0.3)',
                            }
                        }}
                    >
                        {sceneEnded ? 'Close' : 'Send'}
                    </Button>
                </Box>
            </Paper>
        </div>
    );
    
    // Handle submission of player's guidance (or blank submit to continue the scene autonomously)
    function handleSubmit() {
        // Add input text to vignette script as a player speaker action:
        const stageVignette = stage().getSave().currentVignette;
        if (!stageVignette) return;
        stageVignette?.script.push({ speaker: stage().getSave().player.name.toUpperCase(), message: inputText });
        setVignette({...stageVignette as VignetteData});
        setLoading(true);
        setIndex(stageVignette.script.length - 1);
        setInputText('');
        const oldIndex = stageVignette.script.length;
        stage().continueVignette().then(() => {
            const newIndex = Math.min(oldIndex, (stage().getSave().currentVignette?.script.length || 1) - 1);
            setVignette({...stage().getSave().currentVignette as VignetteData});
            setIndex(newIndex);
            setLoading(false);
            setSceneEnded(stage().getSave().currentVignette?.endScene || false);
        });
    }

    function handleClose() {
        // When the scene is concluded, switch back to the Station screen
        // Output stat change for now:
        console.log('Vignette concluded with stat changes:', vignette.endProperties || {});
        setScreenType(ScreenType.STATION);
    }
}

export default VignetteScreen;
