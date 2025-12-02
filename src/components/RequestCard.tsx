import React, { FC, useState } from 'react';
import { motion } from 'framer-motion';
import Request, { ActorWithStatsRequirement, SpecificActorRequirement, StationStatsRequirement } from '../factions/Request';
import Actor, { Stat, ACTOR_STAT_ICONS } from '../actors/Actor';
import { StationStat, STATION_STAT_ICONS } from '../Module';
import { Stage } from '../Stage';
import { Nameplate } from './Nameplate';
import { useTooltip } from '../contexts/TooltipContext';
import { SwapHoriz, HourglassEmpty } from '@mui/icons-material';
import { scoreToGrade } from '../utils';

interface RequestCardProps {
    request: Request;
    stage: Stage;
    /** Whether the card is expanded */
    isExpanded?: boolean;
    /** Custom hover animation properties */
    whileHover?: any;
    /** Additional styles */
    style?: React.CSSProperties;
    /** Additional class name */
    className?: string;
    /** onClick handler */
    onClick?: () => void;
    /** Callback when request is fulfilled */
    onFulfill?: (actorId?: string) => void;
}

/**
 * Reusable request card component that displays request information.
 * Collapsed state: Shows requirement and reward summary with can-fulfill indicator.
 * Expanded state: Adds full description text.
 */
export const RequestCard: FC<RequestCardProps> = ({
    request,
    stage,
    isExpanded: controlledExpanded,
    whileHover,
    style,
    className,
    onClick,
    onFulfill
}) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
    const { setTooltip, clearTooltip } = useTooltip();
    
    const canFulfill = request.canFulfill(stage);
    const faction = stage.getSave().factions[request.factionId];
    const isInProgress = request.isInProgress();

    // Get qualified actors for specific-actor requirements (for background display)
    const getQualifiedActorsForBackground = () => {
        // If in progress, show the fulfilling actor
        if (isInProgress && request.inProgressActorId) {
            const actor = stage.getSave().actors[request.inProgressActorId];
            return actor ? [actor] : [];
        }
        
        // Otherwise show qualifying actors
        if (request.requirement.type === 'specific-actor') {
            const req = request.requirement as SpecificActorRequirement;
            const actor = stage.getSave().actors[req.actorId];
            return actor && !actor.remote ? [actor] : [];
        }
        return [];
    };
    const qualifiedActorsForBackground = getQualifiedActorsForBackground();

    // Get qualified actors for actor-with-stats requirements (for button display)
    const getQualifiedActorsForStats = (): Actor[] => {
        if (request.requirement.type !== 'actor-with-stats') {
            return [];
        }

        const requirement = request.requirement as ActorWithStatsRequirement;
        const save = stage.getSave();
        const allActors = Object.values(save.actors);

        return allActors.filter(actor => {
            // Skip remote actors (not physically present on the station)
            if (actor.remote) {
                return false;
            }

            // Check minimum stats
            if (requirement.minStats) {
                for (const [stat, minValue] of Object.entries(requirement.minStats)) {
                    if (actor.stats[stat as Stat] < minValue) {
                        return false;
                    }
                }
            }

            // Check maximum stats
            if (requirement.maxStats) {
                for (const [stat, maxValue] of Object.entries(requirement.maxStats)) {
                    if (actor.stats[stat as Stat] > maxValue) {
                        return false;
                    }
                }
            }

            return true;
        });
    };
    const qualifiedActorsForStats = getQualifiedActorsForStats();

    const handleClick = () => {
        if (controlledExpanded === undefined) {
            setInternalExpanded(!internalExpanded);
        }
        onClick?.();
    };

    // Default hover behavior
    const defaultWhileHover = {
        x: 5,
        backgroundColor: canFulfill ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 107, 107, 0.15)',
        borderColor: canFulfill ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 107, 107, 0.5)',
    };

    // Get requirement content (text + optional image/icons)
    const getRequirementContent = () => {
        switch (request.requirement.type) {
            case 'actor-with-stats': {
                const req = request.requirement as ActorWithStatsRequirement;
                const statElements: JSX.Element[] = [];
                
                if (req.minStats) {
                    Object.entries(req.minStats).forEach(([stat, value]) => {
                        const StatIcon = ACTOR_STAT_ICONS[stat as Stat];
                        statElements.push(
                            <React.Fragment key={`min-${stat}`}>
                                {StatIcon && <StatIcon style={{ fontSize: '1.2rem', color: '#00ff88', marginRight: '4px' }} />}
                                <span>{stat} ≥ {scoreToGrade(value)}</span>
                            </React.Fragment>
                        );
                    });
                }
                
                if (req.maxStats) {
                    Object.entries(req.maxStats).forEach(([stat, value]) => {
                        const StatIcon = ACTOR_STAT_ICONS[stat as Stat];
                        statElements.push(
                            <React.Fragment key={`max-${stat}`}>
                                {StatIcon && <StatIcon style={{ fontSize: '1.2rem', color: '#ff6b6b', marginRight: '4px' }} />}
                                <span>{stat} ≤ {scoreToGrade(value)}</span>
                            </React.Fragment>
                        );
                    });
                }
                
                return {
                    text: 'Patient:',
                    statElements,
                    image: null
                };
            }
            
            case 'specific-actor': {
                const req = request.requirement as SpecificActorRequirement;
                const actor = stage.getSave().actors[req.actorId];
                return {
                    text: `Specific Patient: ${actor?.name || 'Unknown'}`,
                    statElements: [],
                    image: null // We'll show actors in background instead
                };
            }
            
            case 'station-stats': {
                const req = request.requirement as StationStatsRequirement;
                const statElements = Object.entries(req.stats).map(([stat, value]) => {
                    const StatIcon = STATION_STAT_ICONS[stat as StationStat];
                    return (
                        <React.Fragment key={stat}>
                            {StatIcon && <StatIcon style={{ fontSize: '1.2rem', color: '#ff6b6b', marginRight: '4px' }} />}
                            <span>{stat} -{value}</span>
                        </React.Fragment>
                    );
                });
                return {
                    text: 'Station:',
                    statElements,
                    image: null
                };
            }
            
            default:
                return {
                    text: 'Unknown requirement',
                    statElements: [],
                    image: null
                };
        }
    };

    // Get reward content (text + icons)
    const getRewardContent = () => {
        if (request.reward.type === 'station-stats') {
            const statElements = Object.entries(request.reward.stats).map(([stat, value]) => {
                const StatIcon = STATION_STAT_ICONS[stat as StationStat];
                return (
                    <React.Fragment key={stat}>
                        {StatIcon && <StatIcon style={{ fontSize: '1.2rem', color: '#00ff88', marginRight: '4px' }} />}
                        <span>{stat} +{value}</span>
                    </React.Fragment>
                );
            });
            return {
                statElements
            };
        }
        return {
            statElements: [<span key="unknown">Unknown reward</span>]
        };
    };

    const requirementContent = getRequirementContent();
    const rewardContent = getRewardContent();

    // Calculate remaining turns if in progress
    const remainingTurns = isInProgress ? request.getRemainingTurns(stage.getSave().day, stage.getSave().turn) : -1;

    return (
        <motion.div
            onClick={handleClick}
            whileHover={whileHover || defaultWhileHover}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            animate={{ 
                height: isExpanded ? 'auto' : 'fit-content',
                minHeight: isExpanded ? 'auto' : '200px',
                opacity: isInProgress ? 0.6 : 1
            }}
            style={{
                border: `3px solid ${isInProgress ? '#ffa726' : (canFulfill ? '#00ff88' : '#ff6b6b')}`,
                borderRadius: '8px',
                background: 'rgba(0, 10, 20, 0.5)',
                cursor: isInProgress ? 'default' : 'pointer',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'column',
                padding: '12px',
                position: 'relative',
                pointerEvents: isInProgress ? 'none' : 'auto',
                ...style
            }}
            className={className}
        >
            {/* Background layer for specific-actor requests */}
            {qualifiedActorsForBackground.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 0,
                    pointerEvents: 'none',
                    borderRadius: '5px',
                    overflow: 'hidden',
                }}>
                    {/* Faction background layer */}
                    {faction?.backgroundImageUrl && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `url(${faction.backgroundImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.15,
                        }} />
                    )}
                    
                    {/* Actor images layer */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                    }}>
                        {qualifiedActorsForBackground.map((actor) => (
                            actor.avatarImageUrl && (
                                <div
                                    key={actor.id}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundImage: `url(${actor.avatarImageUrl})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'top center',
                                        opacity: 0.3,
                                        borderRadius: '4px',
                                    }}
                                />
                            )
                        ))}
                    </div>
                    
                    {/* Dark overlay for readability */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 10, 20, 0.7)',
                    }} />
                </div>
            )}

            {/* Content wrapper with higher z-index */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Faction Nameplate */}
                {faction && (
                    <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '12px',
                }}>
                    <Nameplate
                        name={faction.name}
                        size="small"
                        style={{
                            background: faction.themeColor || '#4a5568',
                            border: faction.themeColor ? `2px solid ${faction.themeColor}CC` : '2px solid #718096',
                            fontFamily: faction.themeFont || 'Arial, sans-serif',
                        }}
                        />
                    </div>
                )}

                {/* In-Progress Status */}
                {isInProgress && (
                    <div style={{
                        fontSize: '0.9rem',
                        color: '#ffa726',
                        fontWeight: 700,
                        marginBottom: '8px',
                        padding: '8px',
                        background: 'rgba(255, 167, 38, 0.2)',
                        borderRadius: '4px',
                        textAlign: 'center',
                        textShadow: '0 0 8px #ffa726',
                        border: '1px solid rgba(255, 167, 38, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <HourglassEmpty style={{ fontSize: '1.2rem' }} />
                        <span>IN PROGRESS - {remainingTurns} turn{remainingTurns !== 1 ? 's' : ''} remaining</span>
                    </div>
                )}

                {/* Description (shown when expanded) */}
                {isExpanded && (
                <div style={{
                    color: '#00ff88',
                    fontSize: '0.9rem',
                    lineHeight: '1.4',
                    fontWeight: 600,
                    marginBottom: '12px',
                    padding: '8px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    borderRadius: '4px',
                    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                }}>
                    {request.description}
                </div>
                )}

                {/* Requirement section */}
                <div style={{
                padding: '8px',
                background: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '4px',
                marginBottom: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Requires
                </div>
                
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                }}>

                    
                    <div style={{
                        fontSize: '0.85rem',
                        color: '#ffffff',
                        fontWeight: 600,
                        textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                    }}>
                        <span style={{
                            fontSize: '1.2rem',
                            color: canFulfill ? '#00ff88' : '#ff6b6b',
                            fontWeight: 700,
                            lineHeight: 1,
                            textShadow: canFulfill 
                                ? '0 0 8px #00ff88'
                                : '0 0 8px #ff6b6b',
                            flexShrink: 0,
                        }}>
                            {canFulfill ? '✓' : '✗'}
                        </span>
                        <span>{requirementContent.text}</span>
                        {requirementContent.statElements.length > 0 && requirementContent.statElements.map((element, index) => (
                            <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
                                {element}
                                {index < requirementContent.statElements.length - 1 && <span style={{ marginLeft: '4px' }}>,</span>}
                            </span>
                        ))}
                        {/* Display hourglass icons for timed requests */}
                        {(request.requirement.type === 'actor-with-stats' || request.requirement.type === 'specific-actor') && 
                         (request.requirement as ActorWithStatsRequirement | SpecificActorRequirement).timeInTurns && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '8px' }}>
                                {Array.from({ length: (request.requirement as ActorWithStatsRequirement | SpecificActorRequirement).timeInTurns! }).map((_, i) => (
                                    <HourglassEmpty key={i} style={{ fontSize: '1rem', color: '#ffa726' }} />
                                ))}
                            </span>
                        )}
                        </div>
                    </div>
                </div>

                {/* Reward section */}
                <div style={{
                padding: '8px',
                background: 'rgba(0, 0, 0, 0.6)',
                borderRadius: '4px',
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: '#888',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Rewards
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                }}>
                    {rewardContent.statElements.length > 0 && rewardContent.statElements.map((element, index) => (
                        <span key={index} style={{
                            fontSize: '0.85rem',
                            color: '#00ff88',
                            fontWeight: 700,
                            textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0px'
                        }}>
                            {element}
                            {index < rewardContent.statElements.length - 1 && <span style={{ marginLeft: '4px' }}>,</span>}
                        </span>
                        ))}
                    </div>
                </div>

                {/* Fulfill section (shown when expanded) */}
                {isExpanded && onFulfill && (
                    <div style={{
                        marginTop: '12px',
                        padding: '8px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        borderRadius: '4px',
                    }}>
                        {/* Actor-with-stats: Show buttons for each qualified actor */}
                        {request.requirement.type === 'actor-with-stats' && qualifiedActorsForStats.length > 0 && (
                            <>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#888',
                                    marginBottom: '8px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}>
                                    Select Actor to Fulfill
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                }}>
                                    {qualifiedActorsForStats.map((actor) => (
                                        <motion.button
                                            key={actor.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onFulfill(actor.id);
                                            }}
                                            onMouseEnter={() => setTooltip(`Trade ${actor.name} to ${faction.name}`, SwapHoriz)}
                                            onMouseLeave={clearTooltip}
                                            whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 255, 136, 0.3)' }}
                                            whileTap={{ scale: 0.95 }}
                                            style={{
                                                background: 'rgba(0, 255, 136, 0.2)',
                                                border: '2px solid #00ff88',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '60px',
                                                height: '60px',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {actor.avatarImageUrl ? (
                                                <img
                                                    src={actor.avatarImageUrl}
                                                    alt={actor.name}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        objectPosition: 'top center',
                                                        borderRadius: '4px',
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    color: '#00ff88',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    textAlign: 'center',
                                                    wordBreak: 'break-word',
                                                }}>
                                                    {actor.name}
                                                </div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Specific-actor or station-stats: Show single accept button */}
                        {(request.requirement.type === 'specific-actor' || request.requirement.type === 'station-stats') && canFulfill && (
                            <motion.button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFulfill(request.requirement.type === 'specific-actor' 
                                        ? (request.requirement as SpecificActorRequirement).actorId 
                                        : undefined);
                                }}
                                whileHover={{ scale: 1.02, backgroundColor: 'rgba(0, 255, 136, 0.3)' }}
                                whileTap={{ scale: 0.98 }}
                                onMouseEnter={() => setTooltip(request.requirement.type === 'specific-actor' ? `Trade ${stage.getSave().actors[request.requirement.actorId || ''].name} to ${faction.name}` : `Accept ${faction.name}'s request`, SwapHoriz)}
                                onMouseLeave={clearTooltip}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'rgba(0, 255, 136, 0.2)',
                                    border: '2px solid #00ff88',
                                    borderRadius: '8px',
                                    color: '#00ff88',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    textShadow: '0 0 8px #00ff88',
                                }}
                            >
                                Accept Request
                            </motion.button>
                        )}

                        {/* Show message if can't fulfill */}
                        {!canFulfill && (
                            <div style={{
                                color: '#ff6b6b',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                textAlign: 'center',
                                textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                            }}>
                                Requirements not met
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default RequestCard;
