import React, { FC } from 'react';
import { motion } from 'framer-motion';
import Actor from '../actors/Actor';
import Nameplate from './Nameplate';
import AuthorLink from './AuthorLink';

interface ActorCardProps {
    actor: Actor;
    role?: string;
    /** If true, the card is always expanded. If false, it can be toggled. */
    forceExpanded?: boolean;
    /** Whether the card is currently expanded (only used when forceExpanded is false) */
    isExpanded?: boolean;
    /** Callback when the card is clicked (only used when forceExpanded is false) */
    onClick?: () => void;
    /** Whether the card is being dragged */
    isDragging?: boolean;
    /** Whether the card is draggable */
    draggable?: boolean;
    /** Drag handlers */
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: () => void;
    /** Layout direction when expanded: 'vertical' (portrait on right, default) or 'horizontal' (portrait on left) */
    layout?: 'vertical' | 'horizontal';
    /** Custom hover animation properties */
    whileHover?: any;
    /** Additional styles */
    style?: React.CSSProperties;
    /** Additional class name */
    className?: string;
}

const STATS_LIST = [
    ['Brawn', 'brawn'],
    ['Wits', 'wits'],
    ['Nerve', 'nerve'],
    ['Skill', 'skill'],
    ['Charm', 'charm'],
    ['Lust', 'lust'],
    ['Joy', 'joy'],
    ['Trust', 'trust'],
] as const;

/**
 * Reusable actor card component that displays actor information.
 * Can be in collapsed state (portrait + nameplate) or expanded state (adds stats).
 */
export const ActorCard: FC<ActorCardProps> = ({
    actor,
    role,
    forceExpanded = false,
    isExpanded = false,
    onClick,
    isDragging = false,
    draggable = false,
    onDragStart,
    onDragEnd,
    layout = 'vertical',
    whileHover,
    style,
    className
}) => {
    const expanded = forceExpanded || isExpanded;
    const clickable = !forceExpanded && onClick;

    // Default hover behavior
    const defaultWhileHover = {
        backgroundColor: (clickable || draggable) ? 'rgba(0, 255, 136, 0.15)' : undefined,
        borderColor: (clickable || draggable) ? 'rgba(0, 255, 136, 0.5)' : undefined,
    };

    // Create the wrapper element conditionally based on whether draggable or not
    const wrapperProps: any = {
        onClick: clickable ? onClick : undefined,
        animate: {
            opacity: isDragging ? 0.4 : 1,
            scale: isDragging ? 0.95 : 1,
        },
        whileHover: whileHover || defaultWhileHover,
        transition: {
            duration: 0.2
        },
        style: {
            padding: '12px',
            border: `2px solid ${actor.themeColor || '#00ff88'}`,
            borderRadius: '8px',
            background: 'rgba(0, 10, 20, 0.5)',
            cursor: isDragging ? 'grabbing' : (draggable ? 'grab' : (clickable ? 'pointer' : 'default')),
            ...style
        },
        className
    };

    // Add HTML5 drag attributes if draggable
    if (draggable) {
        wrapperProps.draggable = true;
        wrapperProps.onDragStart = onDragStart;
        wrapperProps.onDragEnd = onDragEnd;
    }

    return (
        <motion.div {...wrapperProps}>
            {expanded && (
                /* Nameplate at the top when expanded */
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                    <Nameplate 
                        actor={actor} 
                        size="small"
                        role={role}
                        layout="stacked"
                    />
                </div>
            )}
            
            {/* Two-column layout when expanded, portrait only when collapsed */}
            {expanded ? (
                layout === 'horizontal' ? (
                    // Horizontal layout: portrait on left, stats on right
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch', flexDirection: 'row' }}>
                        {/* Left: Portrait */}
                        <div style={{ 
                            width: '160px',
                            flexShrink: 0,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: `2px solid ${actor.themeColor || '#00ff88'}`,
                            backgroundImage: `url(${actor.emotionPack?.neutral || actor.avatarImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'top center',
                            backgroundRepeat: 'no-repeat',
                            position: 'relative'
                        }} />
                        
                        {/* Right: Stats in a grid */}
                        <div style={{ 
                            flex: 1,
                            background: 'rgba(0,0,0,0.85)', 
                            borderRadius: '6px',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            <div className="stat-list" style={{ 
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '4px',
                                fontSize: '11px'
                            }}>
                                {STATS_LIST.map(([label, key]) => {
                                    const grade = actor.scoreToGrade(actor.stats[key as keyof typeof actor.stats]);
                                    return (
                                        <div className="stat-row" key={`${actor.id}_${label}`} style={{
                                            padding: '2px 0px',
                                            gap: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}>
                                            <span className="stat-label" style={{
                                                fontSize: '9px',
                                                letterSpacing: '0.3px',
                                                flex: '1'
                                            }}>{label}</span>
                                            <span className="stat-grade" data-grade={grade} style={{
                                                fontSize: '1.2rem',
                                                textShadow: '2px 2px 0 rgba(0,0,0,0.88)',
                                                transform: 'skewX(-8deg) rotate(-4deg)'
                                            }}>{grade}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                                <AuthorLink actor={actor} />
                            </div>
                        </div>
                    </div>
                ) : (
                    // Vertical layout: stats on left, portrait on right (default)
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                        {/* Left column: Stats with letter grades */}
                        <div className="stat-list" style={{ 
                            flex: '2', 
                            background: 'rgba(0,0,0,0.8)', 
                            borderRadius: '6px',
                            padding: '8px 10px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-around'
                        }}>
                            {STATS_LIST.map(([label, key]) => {
                                const grade = actor.scoreToGrade(actor.stats[key as keyof typeof actor.stats]);
                                return (
                                    <div className="stat-row" key={`${actor.id}_${label}`} style={{
                                        padding: '3px 0px',
                                        gap: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span className="stat-label" style={{
                                            fontSize: '10px',
                                            letterSpacing: '0.5px',
                                            flex: '1'
                                        }}>{label}</span>
                                        <span className="stat-grade" data-grade={grade} style={{
                                            fontSize: '1.6rem',
                                            textShadow: '3px 3px 0 rgba(0,0,0,0.88)',
                                            transform: 'skewX(-8deg) rotate(-4deg)'
                                        }}>{grade}</span>
                                    </div>
                                );
                            })}
                            {/* Author link in bottom */}
                            <AuthorLink actor={actor} />
                        </div>
                        
                        {/* Right column: Tall character portrait */}
                        <div style={{ 
                            flex: '1',
                            minHeight: '100%',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '2px solid #00ff88',
                            backgroundImage: `url(${actor.emotionPack?.neutral || actor.avatarImageUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'top center',
                            backgroundRepeat: 'no-repeat',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'flex-end',
                            padding: '8px'
                        }}/>
                    </div>
                )
            ) : (
                /* Collapsed state: Just the portrait with nameplate overlaid at bottom */
                <div style={{ 
                    width: '100%',
                    height: '100%',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '2px solid #00ff88',
                    backgroundImage: `url(${actor.emotionPack?.neutral || actor.avatarImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                    backgroundRepeat: 'no-repeat',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                }}>
                    {/* Nameplate at bottom */}
                    <div style={{ padding: '8px' }}>
                        <Nameplate 
                            actor={actor} 
                            size="small"
                            style={{
                                transform: 'scale(0.8)'
                            }}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default ActorCard;
