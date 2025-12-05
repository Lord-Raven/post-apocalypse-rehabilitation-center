/*
 * This screen displays Visual Novel skit scenes, displaying dialogue and characters as they interact with the player and each other.
 */
import React, { FC, useEffect } from 'react';
import { ScreenType } from './BaseScreen';
import { Module } from '../Module';
import Actor, { namesMatch, findBestNameMatch } from '../actors/Actor';
import { Stage } from '../Stage';
import { SkitData } from '../Skit';
import ActorImage from '../actors/ActorImage';
import { Emotion } from '../actors/Emotion';
import SkitOutcomeDisplay from './SkitOutcomeDisplay';
import Nameplate from '../components/Nameplate';
import { BlurredBackground } from '../components/BlurredBackground';
import { useTooltip } from '../contexts/TooltipContext';
import ActorCard, { ActorCardSection } from '../components/ActorCard';

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
    Forward,
    Close,
    Casino,
    Computer,
    VolumeUp,
    VolumeOff
} from '@mui/icons-material';
import TypeOut from '../components/TypeOut';

// Base text shadow for non-dialogue text
const baseTextShadow = '2px 2px 2px rgba(0, 0, 0, 0.8)';

// Helper function to brighten a color for better visibility
const adjustColor = (color: string, amount: number = 0.6): string => {
    // Parse hex color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Brighten by mixing with white
    const newR = Math.min(255, Math.round(r + (255 - r) * amount));
    const newG = Math.min(255, Math.round(g + (255 - g) * amount));
    const newB = Math.min(255, Math.round(b + (255 - b) * amount));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

    // Helper function to format text with dialogue, italics, and bold styling
// Accepts optional speaker actor to apply custom font and drop shadow
const formatMessage = (text: string, speakerActor?: Actor | null): JSX.Element => {
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
                    // Apply custom font and drop shadow to dialogue if speaker has custom properties
                    const brightenedColor = speakerActor?.themeColor 
                        ? adjustColor(speakerActor.themeColor, 0.6)
                        : '#87CEEB';
                    
                    const dialogueStyle: React.CSSProperties = { 
                        color: brightenedColor,
                        fontFamily: speakerActor?.themeFontFamily || undefined,
                        textShadow: speakerActor?.themeColor 
                            ? `2px 2px 2px ${adjustColor(speakerActor.themeColor, -0.25)}`
                            : '2px 2px 2px rgba(135, 206, 235, 0.5)'
                    };
                    return (
                        <span key={index} style={dialogueStyle}>
                            {formatInlineStyles(part)}
                        </span>
                    );
                } else {
                    return (
                        <span key={index} style={{ textShadow: baseTextShadow }}>
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
                        return italicPart;
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
                        return formatItalics(boldPart);
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
                        return formatBold(strikePart);
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
                        return formatStrikethrough(underlinePart);
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
                        return formatUnderline(subPart);
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
                        return formatSubscript(headerPart);
                    }
                })}
            </>
        );
    }

    return formatHeaders(text);
};

interface SkitScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

/**
 * Helper function to get the actors present in the scene at a given script index.
 * Walks through movements from initialActorLocations, filtering by skit's moduleId.
 */
const getActorsAtIndex = (skit: SkitData, scriptIndex: number, allActors: {[key: string]: Actor}): Actor[] => {
    // Start with initial actor locations
    const currentLocations = {...(skit.initialActorLocations || {})};
    
    // Apply movements up to and including the current index
    for (let i = 0; i <= scriptIndex && i < skit.script.length; i++) {
        const entry = skit.script[i];
        if (entry.movements) {
            Object.entries(entry.movements).forEach(([actorId, newLocationId]) => {
                currentLocations[actorId] = newLocationId;
            });
        }
    }
    
    // Filter actors who are at the skit's module
    const actorsAtModule: Actor[] = [];
    Object.entries(currentLocations).forEach(([actorId, locationId]) => {
        if (locationId === skit.moduleId && allActors[actorId]) {
            actorsAtModule.push(allActors[actorId]);
        }
    });
    
    return actorsAtModule;
};

export const SkitScreen: FC<SkitScreenProps> = ({ stage, setScreenType }) => {
    const { setTooltip, clearTooltip } = useTooltip();
    const [index, setIndex] = React.useState<number>(0);
    const [inputText, setInputText] = React.useState<string>('');
    const [sceneEnded, setSceneEnded] = React.useState<boolean>(false);
    const [skit, setSkit] = React.useState<SkitData>(stage().getSave().currentSkit as SkitData);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [speaker, setSpeaker] = React.useState<Actor|null>(null);
    const [displayName, setDisplayName] = React.useState<string>('');
    const [displayMessage, setDisplayMessage] = React.useState<JSX.Element>(<></>);
    const [finishTyping, setFinishTyping] = React.useState<boolean>(false);
    const [hoveredActor, setHoveredActor] = React.useState<Actor | null>(null);
    const [audioEnabled, setAudioEnabled] = React.useState<boolean>(true);
    const currentAudioRef = React.useRef<HTMLAudioElement | null>(null);

    // If audioEnabled changes to false, stop any currently playing audio
    useEffect(() => {
        if (!audioEnabled && currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
        }
    }, [audioEnabled]);

    // Update actor locationIds when navigating through the skit
    useEffect(() => {
        if (!skit.initialActorLocations) return;
        
        // Start with initial locations
        const currentLocations = {...skit.initialActorLocations};
        
        // Apply movements up to and including the current index
        for (let i = 0; i <= index && i < skit.script.length; i++) {
            const entry = skit.script[i];
            if (entry.movements) {
                Object.entries(entry.movements).forEach(([actorId, newLocationId]) => {
                    currentLocations[actorId] = newLocationId;
                });
            }
        }
        
        // Update actual actor locationIds in the save data
        Object.entries(currentLocations).forEach(([actorId, locationId]) => {
            const actor = stage().getSave().actors[actorId];
            if (actor && !actor.isOffSite(stage().getSave())) {
                actor.locationId = locationId;
            }
        });
    }, [index, skit, stage]);

    // Handle arrow key navigation globally (when input is not focused or is empty)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            
            // Only handle arrow keys if input is not focused OR input is empty
            if (e.key === 'ArrowLeft' && (!isInputFocused || inputText.trim() === '')) {
                e.preventDefault();
                prev();
            } else if (e.key === 'ArrowRight' && (!isInputFocused || inputText.trim() === '')) {
                e.preventDefault();
                next();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inputText, index, skit, finishTyping, loading]);

    useEffect(() => {
        if (skit.script.length == 0) {
            setLoading(true);
            stage().continueSkit().then(() => {
                setSkit({...stage().getSave().currentSkit as SkitData});
                setLoading(false);
                const skitData = stage().getSave().currentSkit;
                // Check if the final entry has endScene
                const ended = skitData?.script[skitData.script.length - 1]?.endScene || false;
                setSceneEnded(ended);
            });
        }
    }, [skit]);

    useEffect(() => {
        if (skit.script && skit.script.length > 0) {
            const currentSpeakerName = skit.script[index]?.speaker?.trim() || '';
            const actors = Object.values(stage().getSave().actors);
            const matchingActor = findBestNameMatch(currentSpeakerName, actors);
            
            // Check if this is the player speaking
            const playerName = stage().getSave().player.name;
            const isPlayerSpeaker = !matchingActor && playerName && namesMatch(playerName.trim().toLowerCase(), currentSpeakerName.toLowerCase());
            
            setSpeaker(matchingActor || null);
            setDisplayName(matchingActor?.name || (isPlayerSpeaker ? playerName : ''));
            setDisplayMessage(formatMessage(skit.script[index]?.message || '', matchingActor));
            setFinishTyping(false); // Reset typing state when message changes
            if (currentAudioRef.current) {
                // Stop any currently playing audio
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
            }
            if (audioEnabled && skit.script[index]?.speechUrl) {
                const audio = new Audio(skit.script[index].speechUrl);
                currentAudioRef.current = audio;
                audio.play().catch(err => {
                    console.error('Error playing audio:', err);
                });
            }
        } else {
            setSpeaker(null);
            setDisplayName('');
            setDisplayMessage(<></>);
            setFinishTyping(false);
        }
        
        // Update sceneEnded based on current index
        if (skit.script[index]?.endScene) {
            setSceneEnded(true);
        } else {
            setSceneEnded(false);
        }

    }, [index, skit]);

    const next = () => {
        if (finishTyping) {
            setIndex(prevIndex => Math.min(prevIndex + 1, skit.script.length - 1));
        } else {
            setFinishTyping(true);
        }
    };

    const prev = () => {
        setIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };

    const renderActors = (module: Module | null, actors: Actor[], currentSpeaker?: string) => {
        // There are two expanding ranges to display actors within on screen: one centered around 25vw and one around 75vw. Actors alternate between these two ranges.
        const leftRange = Math.min(40, Math.ceil((actors.length - 2) / 2) * 20); // Adjust used screen space by number of present actors.
        const rightRange = Math.min(40, Math.floor((actors.length - 2) / 2) * 20);

        // Display actors centered across the scene bottom. Use emotion from current script entry or neutral as fallback
        return actors.map((actor, i) => {
            
            // Get emotion for this actor from current script entry
            let emotion = Emotion.neutral;
            
            if (skit.script && skit.script.length > 0 && index < skit.script.length) {
                // scan backward through skit script to find most recent emotion for this actor:
                for (let j = index; j >= 0; j--) {
                    const entry = skit.script[j];
                    if (entry.actorEmotions && entry.actorEmotions[actor.name]) {
                        emotion = entry.actorEmotions[actor.name];
                        break;
                    }
                }
            }
            
            const leftSide = (i % 2) === 0;
            const indexOnSide = leftSide ? Math.floor(i / 2) : Math.floor((i - 1) / 2);
            const actorsOnSide = leftSide ? Math.ceil(actors.length / 2) : Math.floor(actors.length / 2);
            const range = leftSide ? leftRange : rightRange;
            const increment = actorsOnSide > 1 ? (indexOnSide / (actorsOnSide - 1)) : 0.5;
            const center = leftSide ? 25 : 75;
            const xPosition = actors.length == 1 ? 50 : Math.round(increment * range) + (center - Math.floor(range / 2));
            const isSpeaking = actor === speaker;
            const isHovered = hoveredActor === actor;
            
            return (
                <ActorImage
                    key={actor.id}
                    actor={actor}
                    emotion={emotion}
                    imageUrl={actor.getEmotionImage(emotion, stage())}
                    hologram={actor.isHologram(stage().getSave())}
                    xPosition={xPosition}
                    yPosition={0}
                    zIndex={55 - Math.abs(xPosition)} // Higher zIndex for center positions}
                    speaker={isSpeaking}
                    highlightColor={isHovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0)"}
                    panX={0}
                    panY={0}
                    onMouseEnter={() => setHoveredActor(actor)}
                    onMouseLeave={() => setHoveredActor(null)}
                />
            );
        });
    }



    const module = stage().getSave().layout.getModuleById(skit.moduleId || '');
    const decorImageUrl = module ? stage().getSave().actors[module.ownerId || '']?.decorImageUrls[module.type] || module.getAttribute('defaultImageUrl') : '';

    return (
        <BlurredBackground
            imageUrl={decorImageUrl}
        >
            <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>

            {/* Actors */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                {renderActors(stage().getSave().layout.getModuleById(skit.moduleId || ''), getActorsAtIndex(skit, index, stage().getSave().actors), skit.script && skit.script.length > 0 ? skit.script[index]?.speaker : undefined)}
            </div>

            {/* Skit Outcome Display - shown when scene ends */}
            {sceneEnded && index === skit.script.length - 1 && (
                <SkitOutcomeDisplay skitData={skit} stage={stage()} layout={stage().getSave().layout} />
            )}

            {/* Actor Card - shown when hovering over an actor, only if no outcome is displayed */}
            {hoveredActor && !(sceneEnded && index === skit.script.length - 1) && (
                <div style={{
                    position: 'absolute',
                    top: '5%',
                    right: '5%',
                    width: '15vw',
                    height: '30vh',
                    zIndex: 3
                }}>
                    <ActorCard
                        actor={hoveredActor}
                        isAway={hoveredActor.isOffSite(stage().getSave())}
                        role={(() => {
                            const roleModules = stage().getSave().layout.getModulesWhere((m: any) => 
                                m && m.type !== 'quarters' && m.ownerId === hoveredActor.id
                            );
                            if (roleModules.length > 0) {
                                return roleModules[0].getAttribute('role');
                            } else {
                                const factionName = Object.values(stage().getSave().factions).find(faction => faction.representativeId === hoveredActor.id)?.name;
                                return factionName ? `${factionName}` : undefined;
                            }
                        })()}
                        collapsedSections={[ActorCardSection.STATS]}
                    />
                </div>
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
                    p: 2,
                    color: '#e8fff0', 
                    zIndex: 2,
                    backdropFilter: 'blur(8px)'
                }}
            >
                {/* Navigation and speaker section */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flex: 1 }}>
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
                            label={loading ? 
                                <CircularProgress size={16} sx={{ color: '#bfffd0' }} 
                                    onMouseEnter={() => {
                                        setTooltip('Awaiting content from LLM', Computer);
                                    }}
                                    onMouseLeave={() => {
                                        clearTooltip();
                                    }}
                                /> : 
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {index + 1 < skit.script.length && inputText.length > 0 && (
                                        <span 
                                            style={{ 
                                                color: '#ffaa00',
                                                fontSize: '1.1em',
                                                fontWeight: 900
                                            }}
                                            title="Sending input will replace subsequent messages"
                                        >
                                            ⚠
                                        </span>
                                    )}
                                    {`${index + 1} / ${skit.script.length}`}
                                </span>
                            }
                            sx={{ 
                                minWidth: 80,
                                fontWeight: 700, 
                                color: (index + 1 < skit.script.length && inputText.length > 0) ? '#ffdd99' : '#bfffd0', 
                                background: (index + 1 < skit.script.length && inputText.length > 0) ? 'rgba(255,170,0,0.08)' : 'rgba(255,255,255,0.02)', 
                                border: (index + 1 < skit.script.length && inputText.length > 0) ? '1px solid rgba(255,170,0,0.2)' : '1px solid rgba(255,255,255,0.03)',
                                transition: 'all 0.3s ease',
                                '& .MuiChip-label': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5
                                }
                            }}
                        />

                        <IconButton 
                            onClick={next} 
                            disabled={index === skit.script.length - 1 || loading}
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

                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        {/* Audio toggle button */}
                        <IconButton
                            onClick={() => { if (stage().getSave().disableTextToSpeech) return; setAudioEnabled(!audioEnabled); }}
                            onMouseEnter={() => {
                                setTooltip(stage().getSave().disableTextToSpeech ? 'Speech generation is disabled in settings' : (audioEnabled ? 'Disable speech audio' : 'Enable speech audio'),
                                    (stage().getSave().disableTextToSpeech || !audioEnabled) ? VolumeOff : VolumeUp);
                            }}
                            onMouseLeave={() => {
                                clearTooltip();
                            }}
                            size="small"
                            sx={{
                                color: stage().getSave().disableTextToSpeech ? '#888888' : (audioEnabled ? '#00ff88' : '#ff6b6b'),
                                border: `1px solid ${audioEnabled ? 'rgba(0,255,136,0.2)' : 'rgba(255,107,107,0.2)'}`,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: audioEnabled ? 'rgba(0,255,136,0.4)' : 'rgba(255,107,107,0.4)',
                                    color: audioEnabled ? '#00ffaa' : '#ff5252',
                                }
                            }}
                        >
                            {(stage().getSave().disableTextToSpeech || !audioEnabled) ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
                        </IconButton>

                        {/* Re-roll button */}
                        <IconButton
                            onClick={() => {
                                console.log('Re-roll clicked');
                                handleReroll();
                            }}
                            onMouseEnter={() => {
                                setTooltip('Re-generate events from this point', Casino);
                            }}
                            onMouseLeave={() => {
                                clearTooltip();
                            }}
                            disabled={loading || sceneEnded}
                            size="small"
                            sx={{
                                color: '#00ff88',
                                border: '1px solid rgba(0,255,136,0.2)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    borderColor: 'rgba(0,255,136,0.4)',
                                    color: '#00ffaa',
                                    transform: 'rotate(180deg)',
                                },
                                '&:disabled': { color: 'rgba(255,255,255,0.3)' }
                            }}
                        >
                            <Casino fontSize="small" />
                        </IconButton>
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
                        if (!loading) {
                            if (!finishTyping) {
                                // Force typing to complete immediately
                                setFinishTyping(true);
                            } else {
                                // Already finished typing, advance to next message
                                next();
                            }
                        }
                    }}
                >
                    <Typography
                        variant="body1"
                        sx={{
                            fontSize: '1.18rem',
                            lineHeight: 1.55,
                            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                            color: '#e9fff7',
                            textShadow: baseTextShadow,
                        }}
                    >
                        {skit.script && skit.script.length > 0 ? (
                            <TypeOut
                                key={`message-box-${index}`}
                                speed={20}
                                finishTyping={finishTyping}
                                onTypingComplete={() => setFinishTyping(true)}
                            >
                                {displayMessage}
                            </TypeOut>
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
                                if (!sceneEnded && !loading) {
                                    // If input is blank, progress the script; otherwise submit input
                                    if (inputText.trim() === '' && index < skit.script.length) {
                                        next();
                                    } else {
                                        handleSubmit();
                                    }
                                }
                                else if (sceneEnded) handleClose();
                            }
                        }}
                        placeholder={
                            sceneEnded 
                                ? 'Scene concluded' 
                                : (loading ? 'Generating...' : 'Type your course of action...')
                        }
                        disabled={sceneEnded || loading}
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
                        disabled={loading}
                        variant="contained"
                        startIcon={sceneEnded ? <Close /> : (inputText.trim() ? <Send /> : <Forward />)}
                        sx={{
                            background: sceneEnded 
                                ? 'linear-gradient(90deg,#ff8c66,#ff5a3b)' 
                                : !sceneEnded 
                                    ? 'linear-gradient(90deg,#00ff88,#00b38f)' 
                                    : 'rgba(255,255,255,0.04)',
                            color: sceneEnded ? '#fff' : '#00221a',
                            fontWeight: 800,
                            minWidth: 100,
                            '&:hover': {
                                background: sceneEnded 
                                    ? 'linear-gradient(90deg,#ff7a52,#ff4621)' 
                                    : !sceneEnded 
                                        ? 'linear-gradient(90deg,#00e67a,#009a7b)' 
                                        : 'rgba(255,255,255,0.06)',
                            },
                            '&:disabled': {
                                background: 'rgba(255,255,255,0.04)',
                                color: 'rgba(255,255,255,0.3)',
                            }
                        }}
                    >
                        {sceneEnded ? 'Close' : (inputText.trim() ? 'Send' : 'Continue')}
                    </Button>
                </Box>
            </Paper>
            </div>
        </BlurredBackground>
    );

    // Handle reroll
    function handleReroll() {
        const stageSkit = stage().getSave().currentSkit;
        if (!stageSkit) return;
        // Cut out this index through the end of the script and re-generate:
        stageSkit.script = stageSkit.script.slice(0, index);
        setLoading(true);
        setInputText('');
        stage().continueSkit().then(() => {
            const skitData = stage().getSave().currentSkit;
            setSkit({...skitData as SkitData});
            const newIndex = Math.min(index, (skitData?.script.length || 1) - 1);
            setIndex(newIndex);
            setLoading(false);
            // Check if the entry at new index has endScene
            const ended = skitData?.script[newIndex]?.endScene || false;
            setSceneEnded(ended);
        });
    }
    
    // Handle submission of player's guidance (or blank submit to continue the scene autonomously)
    function handleSubmit() {
        // Truncate the script at the current index and add input text as a player speaker action:
        const stageSkit = stage().getSave().currentSkit;
        if (!stageSkit) return;
        
        // Truncate script to current index (removes all messages after current position)
        stageSkit.script = stageSkit.script.slice(0, index + 1);
        
        if (inputText.trim()) {
            stageSkit.script.push({ speaker: stage().getSave().player.name.toUpperCase(), message: inputText, speechUrl: '' });
        } else if (index < stageSkit.script.length - 1) {
            // If input is blank and we're not at the end, just treat as next()
            next();
            return;
        }
        setSkit({...stageSkit as SkitData});
        setLoading(true);
        setIndex(stageSkit.script.length - 1);
        setInputText('');
        const oldIndex = stageSkit.script.length;
        stage().continueSkit().then(() => {
            const newIndex = Math.min(oldIndex, (stage().getSave().currentSkit?.script.length || 1) - 1);
            const skitData = stage().getSave().currentSkit;
            setSkit({...skitData as SkitData});
            console.log('setIndex after new skit generated.');
            setIndex(newIndex);
            setLoading(false);
            // Check if the entry at new index has endScene
            const ended = skitData?.script[newIndex]?.endScene || false;
            setSceneEnded(ended);
        });
    }

    function handleClose() {
        stage().endSkit(setScreenType);
        // Check if aide is still being generated
        if (stage().getGenerateAidePromise()) {
            setScreenType(ScreenType.LOADING);
        } else {
            setScreenType(ScreenType.STATION);
        }
    }
}

export default SkitScreen;
