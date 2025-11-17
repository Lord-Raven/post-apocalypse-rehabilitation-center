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
import StatChangeDisplay from './StatChangeDisplay';
import Nameplate from '../components/Nameplate';
import { BlurredBackground } from '../components/BlurredBackground';

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
import SingleTypeOut from '../SingleTypeOut';

// Small component that shows a loading indicator
const LoadingIndicator: React.FC<{ active?: boolean }> = ({ active }) => {
    if (!active) return <span>...</span>;
    return <CircularProgress size={16} sx={{ color: '#bfffd0' }} />;
};

// Helper function to format text with dialogue, italics, and bold styling
const formatMessage = (text: string): JSX.Element => {
    if (!text) return <></>;

    // Replace directional quotes with standard quotes
    text = text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    
    // Split by dialogue (text in quotes) first
    const dialogueParts = text.split(/(\"[^"]*\")/g);
    
    return (
        <>
            {dialogueParts.map((part, index) => {
                // Check if this part is dialogue (wrapped in quotes)
                if (part.startsWith('"') && part.endsWith('"')) {
                    return (
                        <span key={index} style={{ color: '#87CEEB' }}>
                            {formatInlineStyles(part)}
                        </span>
                    );
                } else {
                    return (
                        <span key={index}>
                            {formatInlineStyles(part)}
                        </span>
                    );
                }
            })}
        </>
    );
};

// Helper function to format bold, italic, underlined, strikethrough, subscript, and header texts, following markdown-like syntax
const formatInlineStyles = (text: string): JSX.Element => {
    if (!text) return <></>;

    const formatItalics = (text: string): JSX.Element => {
        
        // Process both * and _ for italics, but avoid ** (bold)
        const italicParts = text.split(/(\*(?!\*)[^*]+\*|_[^_]+_)/g);
        
        return (
            <>
                {italicParts.map((italicPart, italicIndex) => {
                    if ((italicPart.startsWith('*') && italicPart.endsWith('*') && !italicPart.startsWith('**')) ||
                        (italicPart.startsWith('_') && italicPart.endsWith('_'))) {
                        const italicText = italicPart.slice(1, -1); // Remove * or _
                        return <em key={italicIndex}>{italicText}</em>;
                    } else {
                        return <span key={italicIndex}>{italicPart}</span>;
                    }
                })}
            </>
        );
    }

    const formatBold = (text: string): JSX.Element => {
        const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
        
        return (
            <>
                {boldParts.map((boldPart, boldIndex) => {
                    if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
                        const boldText = boldPart.slice(2, -2); // Remove **
                        return (
                            <strong key={boldIndex}>
                                {formatItalics(boldText)}
                            </strong>
                        );
                    } else {
                        return (
                            <span key={boldIndex}>
                                {formatItalics(boldPart)}
                            </span>
                        );
                    }
                })}
            </>
        );
    }

    const formatStrikethrough = (text: string): JSX.Element => {
        const strikeParts = text.split(/(~~[^~]+~~)/g);
        
        return (
            <>
                {strikeParts.map((strikePart, strikeIndex) => {
                    if (strikePart.startsWith('~~') && strikePart.endsWith('~~')) {
                        const strikeText = strikePart.slice(2, -2); // Remove ~~
                        return (
                            <s key={strikeIndex}>
                                {formatBold(strikeText)}
                            </s>
                        );
                    } else {
                        return (
                            <span key={strikeIndex}>
                                {formatBold(strikePart)}
                            </span>
                        );
                    }
                })}
            </>
        );
    }

    const formatUnderline = (text: string): JSX.Element => {
        const underlineParts = text.split(/(__[^_]+__)/g);
        
        return (
            <>
                {underlineParts.map((underlinePart, underlineIndex) => {
                    if (underlinePart.startsWith('__') && underlinePart.endsWith('__')) {
                        const underlineText = underlinePart.slice(2, -2); // Remove __
                        return (
                            <u key={underlineIndex}>
                                {formatStrikethrough(underlineText)}
                            </u>
                        );
                    } else {
                        return (
                            <span key={underlineIndex}>
                                {formatStrikethrough(underlinePart)}
                            </span>
                        );
                    }
                })}
            </>
        );
    }

    const formatSubscript = (text: string): JSX.Element => {
        const subscriptParts = text.split(/(~[^~]+~)/g);
        
        return (
            <>
                {subscriptParts.map((subPart, subIndex) => {
                    if (subPart.startsWith('~') && subPart.endsWith('~')) {
                        const subText = subPart.slice(1, -1); // Remove ~
                        return (
                            <sub key={subIndex}>
                                {formatUnderline(subText)}
                            </sub>
                        );
                    } else {
                        return (
                            <span key={subIndex}>
                                {formatUnderline(subPart)}
                            </span>
                        );
                    }
                })}
            </>
        );
    }

    const formatHeaders = (text: string): JSX.Element => {
        const headerParts = text.split(/(#{1,6} [^\n]+)/g);
        
        return (
            <>
                {headerParts.map((headerPart, headerIndex) => {
                    if (headerPart.startsWith('#')) {
                        const headerText = headerPart.replace(/^#{1,6} /, ''); // Remove leading #s and space
                        const level = headerPart.match(/^#{1,6}/)?.[0].length || 1;
                        switch (level) {
                            case 1:
                                return <h1 key={headerIndex}>{formatSubscript(headerText)}</h1>;
                            case 2:
                                return <h2 key={headerIndex}>{formatSubscript(headerText)}</h2>;
                            case 3:
                                return <h3 key={headerIndex}>{formatSubscript(headerText)}</h3>;
                            case 4:
                                return <h4 key={headerIndex}>{formatSubscript(headerText)}</h4>;
                            case 5:
                                return <h5 key={headerIndex}>{formatSubscript(headerText)}</h5>;
                            case 6:
                                return <h6 key={headerIndex}>{formatSubscript(headerText)}</h6>;
                            default:
                                return <span key={headerIndex}>{formatSubscript(headerText)}</span>;
                        }
                    } else {
                        return (
                            <span key={headerIndex}>
                                {formatSubscript(headerPart)}
                            </span>
                        );
                    }
                })}
            </>
        );
    }

    return formatHeaders(text);
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
    const [speaker, setSpeaker] = React.useState<Actor|null>(null);
    const [displayName, setDisplayName] = React.useState<string>('');
    const [displayMessage, setDisplayMessage] = React.useState<JSX.Element>(<></>);
    const [finishTyping, setFinishTyping] = React.useState<boolean>(false);
    const [characterStatChanges, setCharacterStatChanges] = React.useState<Array<{
        actor: Actor;
        statChanges: Array<{
            statName: string;
            oldValue: number;
            newValue: number;
        }>;
    }>>([]);


    useEffect(() => {
        if (vignette.script.length == 0) {
            setLoading(true);
            stage().continueVignette().then(() => {
                setVignette({...stage().getSave().currentVignette as VignetteData});
                setLoading(false);
                const vignetteData = stage().getSave().currentVignette;
                const ended = vignetteData?.endScene || false;
                setSceneEnded(ended);
                
                // Process stat changes when scene ends
                if (ended) {
                    if (vignetteData?.endProperties) {
                        processStatChanges(vignetteData.endProperties);
                    }
                    stage().incPhase();
                }
            });
        }
    }, [vignette]);

    // speaker is set by index change
    useEffect(() => {
        if (vignette.script && vignette.script.length > 0) {
            const currentSpeakerName = vignette.script[index]?.speaker?.trim() || '';
            const actors = Object.values(stage().getSave().actors);
            const matchingActor = actors.find(actor => 
                actor.name && namesMatch(actor.name.trim().toLowerCase(), currentSpeakerName.toLowerCase())
            );
            
            // Check if this is the player speaking
            const playerName = stage().getSave().player.name;
            const isPlayerSpeaker = !matchingActor && playerName && namesMatch(playerName.trim().toLowerCase(), currentSpeakerName.toLowerCase());
            
            setSpeaker(matchingActor || null);
            setDisplayName(matchingActor?.name || (isPlayerSpeaker ? playerName : ''));
            setDisplayMessage(formatMessage(vignette.script[index]?.message || ''));
            setFinishTyping(false); // Reset typing state when message changes
        } else {
            setSpeaker(null);
            setDisplayName('');
            setDisplayMessage(<></>);
            setFinishTyping(false);
        }

    }, [index, vignette, stage]);

    const next = () => {
        if (finishTyping) {
            setIndex(prevIndex => Math.min(prevIndex + 1, vignette.script.length - 1));
        } else {
            setFinishTyping(true);
        }
    };

    const prev = () => {
        setIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };

    const renderActors = (module: Module | null, actors: Actor[], currentSpeaker?: string) => {
        // Display actors centered across the scene bottom. Use emotion from current script entry or neutral as fallback
        return actors.map((actor, i) => {
            const range = Math.min(90, 30 + actors.length * 10); // Adjust used screen space by number of present actors.
            
            // Get emotion for this actor from current script entry
            let emotion = Emotion.neutral;
            
            if (vignette.script && vignette.script.length > 0 && index < vignette.script.length) {
                // scan backward through vignette script to find most recent emotion for this actor:
                for (let j = index; j >= 0; j--) {
                    const entry = vignette.script[j];
                    if (entry.actorEmotions && entry.actorEmotions[actor.name]) {
                        console.log(`Setting emotion for actor ${actor.name} to ${entry.actorEmotions[actor.name]} from script entry ${j}`);
                        emotion = entry.actorEmotions[actor.name];
                        break;
                    }
                }
            }
            
            const increment = actors.length > 1 ? (i / (actors.length - 1)) : 0.5;
            const xPosition = Math.round(increment * range) + (100 - range) / 2;
            const isSpeaking = actor === speaker;
            return (
                <ActorImage
                    key={actor.id}
                    actor={actor}
                    emotion={emotion}
                    imageUrl={actor.emotionPack[emotion] || actor.emotionPack['neutral'] || ''}
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

    // Process stat changes and prepare data for StatChangeDisplay
    const processStatChanges = (endProperties: { [actorId: string]: { [stat: string]: number } }) => {
        const changes: Array<{
            actor: Actor;
            statChanges: Array<{
                statName: string;
                oldValue: number;
                newValue: number;
            }>;
        }> = [];

        Object.entries(endProperties).forEach(([actorId, statChanges]) => {
            const actor = stage().getSave().actors[actorId];
            if (!actor) return;

            const actorChanges: Array<{
                statName: string;
                oldValue: number;
                newValue: number;
            }> = [];

            Object.entries(statChanges).forEach(([statName, change]) => {
                // Find the current stat value
                const normalizedStatName = statName.toLowerCase();
                let currentValue = 0;
                let foundStat = false;

                // Try to match the stat name to the actor's stats
                Object.entries(actor.stats).forEach(([actorStat, value]) => {
                    if (actorStat.toLowerCase() === normalizedStatName || 
                        actorStat.toLowerCase().includes(normalizedStatName) ||
                        normalizedStatName.includes(actorStat.toLowerCase())) {
                        currentValue = value;
                        foundStat = true;
                    }
                });

                if (foundStat) {
                    const newValue = Math.max(1, Math.min(10, currentValue + change));
                    actorChanges.push({
                        statName: statName,
                        oldValue: currentValue,
                        newValue: newValue
                    });

                    // Apply the change to the actor
                    Object.keys(actor.stats).forEach(actorStat => {
                        if (actorStat.toLowerCase() === normalizedStatName || 
                            actorStat.toLowerCase().includes(normalizedStatName) ||
                            normalizedStatName.includes(actorStat.toLowerCase())) {
                            (actor.stats as any)[actorStat] = newValue;
                        }
                    });
                }
            });

            if (actorChanges.length > 0) {
                changes.push({
                    actor: actor,
                    statChanges: actorChanges
                });
            }
        });

        setCharacterStatChanges(changes);
    };

    return (
        <BlurredBackground
            imageUrl={stage().getSave().layout.getModuleById(vignette.moduleId || '')?.getAttribute('defaultImageUrl') || ''}
        >
            <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>

            {/* Actors */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                {renderActors(stage().getSave().layout.getModuleById(vignette.moduleId || ''), Object.values(stage().getSave().actors).filter(actor => actor.locationId === (vignette.moduleId || '')) || [], vignette.script && vignette.script.length > 0 ? vignette.script[index]?.speaker : undefined)}
            </div>

            {/* Stat Change Display - shown when scene ends with stat changes */}
            {sceneEnded && characterStatChanges.length > 0 && index === vignette.script.length - 1 && (
                <StatChangeDisplay characterChanges={characterStatChanges} layout={stage().getSave().layout} />
            )}

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
                            disabled={index === 0 || loading}
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
                            disabled={index === vignette.script.length - 1 || loading}
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
                        {displayName && speaker && (
                            <Nameplate 
                                actor={speaker} 
                                size="large"
                                role={(() => {
                                    const roleModules = stage().getSave().layout.getModulesWhere((m: any) => 
                                        m && m.type !== 'quarters' && m.ownerId === speaker.id
                                    );
                                    return roleModules.length > 0 ? roleModules[0].getAttribute('role') : undefined;
                                })()}
                                layout="inline"
                            />
                        )}
                        {displayName && !speaker && (
                            <Nameplate 
                                name={displayName}
                                size="large"
                                layout="inline"
                            />
                        )}
                    </Box>
                </Box>

                {/* Message content */}
                <Box 
                    sx={{ 
                        minHeight: '4rem', 
                        mb: 2, 
                        cursor: 'pointer',
                        borderRadius: 1,
                        transition: 'background-color 0.2s ease',
                        '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.02)'
                        }
                    }}
                    onClick={() => {
                        if (!finishTyping) {
                            // Force typing to complete immediately
                            setFinishTyping(true);
                        } else {
                            // Already finished typing, advance to next message
                            next();
                        }
                    }}
                >
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
                                speed={20}
                                finishTyping={finishTyping}
                                onTypingComplete={() => setFinishTyping(true)}
                            >
                                {displayMessage}
                            </SingleTypeOut>
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
                                '&.Mui-disabled': {
                                    color: 'rgba(255,255,255,0.6)',
                                    '& fieldset': {
                                        borderColor: 'rgba(255,255,255,0.04)',
                                    },
                                },
                            },
                            '& .MuiInputBase-input::placeholder': {
                                color: 'rgba(255,255,255,0.5)',
                                opacity: 1,
                            },
                            '& .MuiInputBase-input.Mui-disabled::placeholder': {
                                color: 'rgba(255,255,255,0.4)',
                                opacity: 1,
                            },
                            '& .MuiInputBase-input.Mui-disabled': {
                                color: 'rgba(255,255,255,0.45)',
                                WebkitTextFillColor: 'rgba(255,255,255,0.45)',
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
        </BlurredBackground>
    );
    
    // Handle submission of player's guidance (or blank submit to continue the scene autonomously)
    function handleSubmit() {
        // Add input text to vignette script as a player speaker action:
        const stageVignette = stage().getSave().currentVignette;
        if (!stageVignette) return;
        if (inputText.trim()) {
            stageVignette?.script.push({ speaker: stage().getSave().player.name.toUpperCase(), message: inputText });
        }
        setVignette({...stageVignette as VignetteData});
        setLoading(true);
        setIndex(stageVignette.script.length - 1);
        setInputText('');
        const oldIndex = stageVignette.script.length;
        stage().continueVignette().then(() => {
            const newIndex = Math.min(oldIndex, (stage().getSave().currentVignette?.script.length || 1) - 1);
            const vignetteData = stage().getSave().currentVignette;
            setVignette({...vignetteData as VignetteData});
            setIndex(newIndex);
            setLoading(false);
            const ended = vignetteData?.endScene || false;
            setSceneEnded(ended);
            
            // Process stat changes when scene ends
            if (ended && vignetteData?.endProperties) {
                processStatChanges(vignetteData.endProperties);
            }
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
