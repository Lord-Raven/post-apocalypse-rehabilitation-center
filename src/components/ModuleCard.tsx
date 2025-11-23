import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { Module } from '../Module';
import { Stage } from '../Stage';

interface ModuleCardProps {
    module: Module;
    stage: Stage;
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
 * Reusable module card component that displays module information.
 * Shows the module's background image with the assigned actor's portrait overlaid.
 */
export const ModuleCard: FC<ModuleCardProps> = ({
    module,
    stage,
    whileHover,
    style,
    className,
    onClick
}) => {
    const actor = module.ownerId ? stage.getSave().actors[module.ownerId] : null;
    const role = module.getAttribute('role') || module.type;
    
    // Default hover behavior
    const defaultWhileHover = {
        scale: 1.03,
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
    };

    return (
        <motion.div
            onClick={onClick}
            whileHover={whileHover || defaultWhileHover}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                border: '3px solid #00ff88',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: onClick ? 'pointer' : 'default',
                ...style
            }}
            className={className}
        >
            {/* Module background image */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${actor?.decorImageUrls?.[module.type] || module.getAttribute('defaultImageUrl')})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            />

            {/* Actor portrait overlay (if assigned) */}
            {actor && actor.emotionPack?.neutral && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${actor.emotionPack.neutral})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'bottom center',
                        backgroundRepeat: 'no-repeat',
                        opacity: 0.9,
                    }}
                />
            )}

            {/* Module name label */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '6px 8px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: '#00ff88',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    textTransform: 'capitalize',
                    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                }}
            >
                {module.type}
            </div>

            {/* Role label (bottom) */}
            {role && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '6px 8px',
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: actor ? '#ffc800' : '#00ff88',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                        borderTop: '2px solid rgba(0, 255, 136, 0.3)',
                    }}
                >
                    {actor ? `${role}: ${actor.name}` : `${role}: Unassigned`}
                </div>
            )}
        </motion.div>
    );
};

export default ModuleCard;
