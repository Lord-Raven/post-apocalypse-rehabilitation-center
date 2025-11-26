import React, { FC, useState } from 'react';
import { motion } from 'framer-motion';
import Request, { ActorWithStatsRequirement, SpecificActorRequirement, StationStatsRequirement } from '../factions/Request';
import { Stat } from '../actors/Actor';
import { StationStat } from '../Module';
import { Stage } from '../Stage';

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

    // Format requirement text
    const getRequirementText = (): string => {
        switch (request.requirement.type) {
            case 'actor-with-stats': {
                const req = request.requirement as ActorWithStatsRequirement;
                const constraints: string[] = [];
                
                if (req.minStats) {
                    Object.entries(req.minStats).forEach(([stat, value]) => {
                        constraints.push(`${stat} ≥ ${value}`);
                    });
                }
                
                if (req.maxStats) {
                    Object.entries(req.maxStats).forEach(([stat, value]) => {
                        constraints.push(`${stat} ≤ ${value}`);
                    });
                }
                
                return `Actor: ${constraints.join(', ')}`;
            }
            
            case 'specific-actor': {
                const req = request.requirement as SpecificActorRequirement;
                const actor = stage.getSave().actors[req.actorId];
                return `Specific Actor: ${actor?.name || 'Unknown'}`;
            }
            
            case 'station-stats': {
                const req = request.requirement as StationStatsRequirement;
                const stats = Object.entries(req.stats)
                    .map(([stat, value]) => `${stat} -${value}`)
                    .join(', ');
                return `Station: ${stats}`;
            }
            
            default:
                return 'Unknown requirement';
        }
    };

    // Format reward text
    const getRewardText = (): string => {
        if (request.reward.type === 'station-stats') {
            const stats = Object.entries(request.reward.stats)
                .map(([stat, value]) => `${stat} +${value}`)
                .join(', ');
            return stats;
        }
        return 'Unknown reward';
    };

    return (
        <motion.div
            onClick={handleClick}
            whileHover={whileHover || defaultWhileHover}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            animate={{ height: isExpanded ? 'auto' : '120px' }}
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
            {/* Can fulfill indicator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
            }}>
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: canFulfill ? '#00ff88' : '#ff6b6b',
                    boxShadow: canFulfill 
                        ? '0 0 8px #00ff88'
                        : '0 0 8px #ff6b6b',
                    flexShrink: 0,
                }} />
                <span style={{
                    fontSize: '0.85rem',
                    color: canFulfill ? '#00ff88' : '#ff6b6b',
                    fontWeight: 700,
                    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                }}>
                    {canFulfill ? 'Available' : 'Unavailable'}
                </span>
                {faction && (
                    <span style={{
                        fontSize: '0.75rem',
                        color: faction.themeColor || '#00ff88',
                        marginLeft: 'auto',
                        fontFamily: faction.themeFont || 'Arial, sans-serif',
                        textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                    }}>
                        {faction.name}
                    </span>
                )}
            </div>

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
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: '#888',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                }}>
                    Requires
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    color: '#ffffff',
                    fontWeight: 600,
                    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                }}>
                    {getRequirementText()}
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
                    fontSize: '0.85rem',
                    color: '#00ff88',
                    fontWeight: 700,
                    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                }}>
                    {getRewardText()}
                </div>
            </div>
        </motion.div>
    );
};

export default RequestCard;
