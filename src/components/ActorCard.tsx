import React, { FC } from 'react';
import { motion } from 'framer-motion';
import Actor from '../actors/Actor';
import Nameplate from './Nameplate';
import AuthorLink from './AuthorLink';

export enum ActorCardSection {
    STATS = 'stats',
    PORTRAIT = 'portrait',
}

interface ActorCardProps {
    actor: Actor;
    role?: string;
    collapsedSections?: ActorCardSection[];
    expandedSections?: ActorCardSection[];
    layout?: 'horizontal' | 'vertical';
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
    collapsedSections = [ActorCardSection.STATS, ActorCardSection.PORTRAIT],
    expandedSections = [],
    layout = 'horizontal',
    isExpanded = false,
    onClick,
    isDragging = false,
    draggable = false,
    onDragStart,
    onDragEnd,
    whileHover,
    style,
    className
}) => {
    const currentSections = (isExpanded && expandedSections?.length === 0) ? expandedSections : collapsedSections;
    const clickable = !!onClick;

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
            {/* Nameplate at the top */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
                <Nameplate 
                    actor={actor} 
                    size="small"
                    role={role}
                    layout="stacked"
                />
            </div>
            
            {/* Columnar format. */}
            {currentSections.map(section => {
                if (section === ActorCardSection.STATS) {
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                        {/* Tall character portrait */}
                        <div style={{ 
                            flex: '1',
                            minHeight: '100%',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: `2px solid ${actor.themeColor || '#00ff88'}`,
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

                        {/* Stats with letter grades. Each row here should be 1/8th of the container height. */}
                        <div className="stat-list" style={{ 
                            flex: '2', 
                            background: 'rgba(0,0,0,0.8)', 
                            borderRadius: '6px',
                            padding: '8px 10px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start'
                        }}>
                            {STATS_LIST.map(([label, key]) => {
                                const grade = actor.scoreToGrade(actor.stats[key as keyof typeof actor.stats]);
                                return (
                                    <div className="stat-row" key={`${actor.id}_${label}`} style={{
                                        height: '12.5%',
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
                        </div>
                    </div>
                } else if (section === ActorCardSection.PORTRAIT) {
                /* Collapsed state: Just the portrait with nameplate overlaid at bottom */
                    <div style={{ 
                        width: '100%',
                        height: '100%',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        border: `2px solid ${actor.themeColor || '#00ff88'}`,
                        backgroundImage: `url(${actor.emotionPack?.neutral || actor.avatarImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'top center',
                        backgroundRepeat: 'no-repeat',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center'
                    }}>
                    </div>
                }
            })}
            {/* Author link in bottom */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <AuthorLink actor={actor} />
            </div>
        </motion.div>
    );
};

export default ActorCard;
