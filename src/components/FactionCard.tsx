import React, { FC } from 'react';
import { motion } from 'framer-motion';
import Faction from '../actors/Faction';
import Nameplate from './Nameplate';
import { scoreToGrade } from '../utils';

interface FactionCardProps {
    faction: Faction;
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
 * Reusable faction card component that displays faction information.
 * Shows the faction's background image with the representative's portrait overlaid,
 * a nameplate for the faction, and a reputation meter styled like station stat pips.
 */
export const FactionCard: FC<FactionCardProps> = ({
    faction,
    whileHover,
    style,
    className,
    onClick
}) => {
    const representative = faction.representative;
    const reputation = faction.reputation || 1;
    const grade = scoreToGrade(reputation);

    // Default hover behavior
    const defaultWhileHover = {
        scale: 1.02,
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
    };

    return (
        <motion.div
            onClick={onClick}
            whileHover={whileHover || defaultWhileHover}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{
                border: '3px solid #00ff88',
                borderRadius: '8px',
                background: 'rgba(0, 10, 20, 0.5)',
                cursor: onClick ? 'pointer' : 'default',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                ...style
            }}
            className={className}
        >
            {/* Nameplate at the top */}
            <div style={{ 
                padding: '8px 12px', 
                display: 'flex', 
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.7)',
                borderBottom: '2px solid rgba(0, 255, 136, 0.3)'
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

            {/* Portrait area with background image */}
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '120px',
                    overflow: 'hidden',
                }}
            >
                {/* Faction background image */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: faction.backgroundImageUrl ? `url(${faction.backgroundImageUrl})` : undefined,
                        backgroundColor: faction.backgroundImageUrl ? undefined : 'rgba(0, 0, 0, 0.5)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        filter: 'brightness(0.7)',
                    }}
                />

                {/* Representative portrait overlay (if available) */}
                {representative && representative.isPrimaryImageReady && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `url(${representative.getEmotionImage(representative.getDefaultEmotion())})`,
                            backgroundSize: 'contain',
                            backgroundPosition: 'bottom center',
                            backgroundRepeat: 'no-repeat',
                            opacity: 0.95,
                        }}
                    />
                )}
            </div>

            {/* Reputation meter at the bottom */}
            <div
                style={{
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    borderTop: '2px solid rgba(0, 255, 136, 0.3)',
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '6px',
                }}>
                    <span
                        style={{
                            fontSize: '0.85rem',
                            color: '#00ff88',
                            fontWeight: 700,
                            textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                        }}
                    >
                        Reputation
                    </span>
                    
                    {/* Grade Display */}
                    <span
                        className="stat-grade"
                        data-grade={grade}
                        style={{
                            fontSize: '1.4rem',
                            fontWeight: 900,
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px currentColor',
                            lineHeight: 1,
                            marginLeft: 'auto',
                        }}
                    >
                        {grade}
                    </span>
                </div>
                
                {/* Ten-pip bar styled like station stats */}
                <div style={{
                    display: 'flex',
                    gap: '2px',
                    width: '100%',
                }}>
                    {Array.from({ length: 10 }, (_, i) => {
                        const isLit = i < reputation;
                        // Get color based on grade
                        let pipColor = '#00ff88';
                        if (grade.startsWith('F')) pipColor = '#ff6b6b';
                        else if (grade.startsWith('D')) pipColor = '#ffb47a';
                        else if (grade.startsWith('C')) pipColor = '#d0d0d0';
                        else if (grade.startsWith('B')) pipColor = '#3bd3ff';
                        else if (grade.startsWith('A')) pipColor = '#ffdd2f';
                        
                        return (
                            <motion.div
                                key={i}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ delay: 0.05 * i }}
                                style={{
                                    flex: 1,
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: isLit 
                                        ? pipColor
                                        : 'rgba(255, 255, 255, 0.1)',
                                    boxShadow: isLit 
                                        ? `0 0 8px ${pipColor}, inset 0 1px 2px rgba(255, 255, 255, 0.3)`
                                        : 'none',
                                    border: isLit 
                                        ? `1px solid ${pipColor}`
                                        : '1px solid rgba(255, 255, 255, 0.2)',
                                    transition: 'all 0.3s ease',
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
};

export default FactionCard;
