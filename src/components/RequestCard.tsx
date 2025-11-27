import React, { FC, useState } from 'react';
import { motion } from 'framer-motion';
import Request, { ActorWithStatsRequirement, SpecificActorRequirement, StationStatsRequirement } from '../factions/Request';
import { Stat, ACTOR_STAT_ICONS } from '../actors/Actor';
import { StationStat, STATION_STAT_ICONS } from '../Module';
import { Stage } from '../Stage';
import { Nameplate } from './Nameplate';

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
    onClick
}) => {
    const [internalExpanded, setInternalExpanded] = useState(false);
    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
    
    const canFulfill = request.canFulfill(stage);
    const faction = stage.getSave().factions[request.factionId];

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
                const statIcons: JSX.Element[] = [];
                const constraints: string[] = [];
                
                if (req.minStats) {
                    Object.entries(req.minStats).forEach(([stat, value]) => {
                        const StatIcon = ACTOR_STAT_ICONS[stat as Stat];
                        if (StatIcon) {
                            statIcons.push(
                                <StatIcon 
                                    key={`min-${stat}`} 
                                    style={{ fontSize: '1.2rem', color: '#00ff88' }} 
                                />
                            );
                        }
                        constraints.push(`${stat} ≥ ${value}`);
                    });
                }
                
                if (req.maxStats) {
                    Object.entries(req.maxStats).forEach(([stat, value]) => {
                        const StatIcon = ACTOR_STAT_ICONS[stat as Stat];
                        if (StatIcon) {
                            statIcons.push(
                                <StatIcon 
                                    key={`max-${stat}`} 
                                    style={{ fontSize: '1.2rem', color: '#ff6b6b' }} 
                                />
                            );
                        }
                        constraints.push(`${stat} ≤ ${value}`);
                    });
                }
                
                return {
                    text: `Actor: ${constraints.join(', ')}`,
                    icons: statIcons,
                    image: null
                };
            }
            
            case 'specific-actor': {
                const req = request.requirement as SpecificActorRequirement;
                const actor = stage.getSave().actors[req.actorId];
                return {
                    text: `Specific Actor: ${actor?.name || 'Unknown'}`,
                    icons: [],
                    image: actor?.avatarImageUrl || null
                };
            }
            
            case 'station-stats': {
                const req = request.requirement as StationStatsRequirement;
                const statIcons: JSX.Element[] = [];
                const stats = Object.entries(req.stats)
                    .map(([stat, value]) => {
                        const StatIcon = STATION_STAT_ICONS[stat as StationStat];
                        if (StatIcon) {
                            statIcons.push(
                                <StatIcon 
                                    key={stat} 
                                    style={{ fontSize: '1.2rem', color: '#ff6b6b' }} 
                                />
                            );
                        }
                        return `${stat} -${value}`;
                    })
                    .join(', ');
                return {
                    text: `Station: ${stats}`,
                    icons: statIcons,
                    image: null
                };
            }
            
            default:
                return {
                    text: 'Unknown requirement',
                    icons: [],
                    image: null
                };
        }
    };

    // Get reward content (text + icons)
    const getRewardContent = () => {
        if (request.reward.type === 'station-stats') {
            const statIcons: JSX.Element[] = [];
            const stats = Object.entries(request.reward.stats)
                .map(([stat, value]) => {
                    const StatIcon = STATION_STAT_ICONS[stat as StationStat];
                    if (StatIcon) {
                        statIcons.push(
                            <StatIcon 
                                key={stat} 
                                style={{ fontSize: '1.2rem', color: '#00ff88' }} 
                            />
                        );
                    }
                    return `${stat} +${value}`;
                })
                .join(', ');
            return {
                text: stats,
                icons: statIcons
            };
        }
        return {
            text: 'Unknown reward',
            icons: []
        };
    };

    const requirementContent = getRequirementContent();
    const rewardContent = getRewardContent();

    return (
        <motion.div
            onClick={handleClick}
            whileHover={whileHover || defaultWhileHover}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            animate={{ 
                height: isExpanded ? 'auto' : 'fit-content',
                minHeight: isExpanded ? 'auto' : '200px'
            }}
            style={{
                border: `3px solid ${canFulfill ? '#00ff88' : '#ff6b6b'}`,
                borderRadius: '8px',
                background: 'rgba(0, 10, 20, 0.5)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: '12px',
                ...style
            }}
            className={className}
        >
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
                
                {/* Character image for specific-actor requirement */}
                {requirementContent.image && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '4px',
                    }}>
                        <img 
                            src={requirementContent.image}
                            alt="Required character"
                            style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'cover',
                                objectPosition: 'top center',
                                borderRadius: '8px',
                                border: '2px solid #00ff88',
                            }}
                        />
                    </div>
                )}
                
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
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
                    
                    {/* Stat icons */}
                    {requirementContent.icons.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            flexShrink: 0,
                        }}>
                            {requirementContent.icons}
                        </div>
                    )}
                    
                    <div style={{
                        fontSize: '0.85rem',
                        color: '#ffffff',
                        fontWeight: 600,
                        textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                        flex: 1,
                    }}>
                        {requirementContent.text}
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
                    {/* Stat icons */}
                    {rewardContent.icons.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            flexShrink: 0,
                        }}>
                            {rewardContent.icons}
                        </div>
                    )}
                    
                    <div style={{
                        fontSize: '0.85rem',
                        color: '#00ff88',
                        fontWeight: 700,
                        textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                    }}>
                        {rewardContent.text}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default RequestCard;
