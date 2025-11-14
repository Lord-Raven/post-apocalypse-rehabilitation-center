import React, { FC } from 'react';
import { Chip, Paper, Typography } from '@mui/material';
import Actor from '../actors/Actor';

export interface NameplateProps {
    actor: Actor;
    variant?: 'speaker' | 'card' | 'simple' | 'compact';
    size?: 'small' | 'medium' | 'large';
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Reusable character nameplate component that displays character names
 * with consistent styling based on their theme colors and fonts.
 */
export const Nameplate: FC<NameplateProps> = ({ 
    actor, 
    variant = 'simple', 
    size = 'medium',
    className,
    style 
}) => {
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return {
                    fontSize: '0.9rem',
                    padding: '6px 12px',
                    borderWidth: '2px',
                };
            case 'large':
                return {
                    fontSize: '1.6rem',
                    padding: '16px 32px',
                    borderWidth: '4px',
                };
            default: // medium
                return {
                    fontSize: '1.2rem',
                    padding: '12px 24px',
                    borderWidth: '3px',
                };
        }
    };

    const sizeStyles = getSizeStyles();

    if (variant === 'speaker') {
        // Advanced speaker nameplate for VignetteScreen
        return (
            <Chip
                label={actor.name}
                variant="filled"
                className={className}
                sx={{ 
                    ml: 2,
                    px: 2,
                    py: 0.5,
                    fontSize: sizeStyles.fontSize,
                    fontWeight: 900, 
                    color: '#fff', 
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    background: actor.themeColor || '#4a5568',
                    border: actor.themeColor ? `${sizeStyles.borderWidth} solid ${actor.themeColor}CC` : `${sizeStyles.borderWidth} solid #718096`,
                    borderRadius: '25px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 1px 0 rgba(0,0,0,0.9)',
                    boxShadow: `0 6px 20px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2)`,
                    backdropFilter: 'blur(6px)',
                    position: 'relative',
                    overflow: 'visible',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: '-2px',
                        left: '-2px',
                        right: '-2px',
                        bottom: '-2px',
                        background: actor.themeColor ? `${actor.themeColor}33` : 'rgba(113, 128, 150, 0.2)',
                        borderRadius: '27px',
                        zIndex: -1,
                        filter: 'blur(3px)',
                    },
                    '& .MuiChip-label': {
                        padding: sizeStyles.padding,
                        fontFamily: actor.themeFontFamily || '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                        position: 'relative',
                        zIndex: 1
                    },
                    ...style
                }}
            />
        );
    }

    if (variant === 'card') {
        // Card-style nameplate for StatChangeDisplay
        return (
            <Paper
                elevation={4}
                className={className}
                sx={{
                    background: `linear-gradient(135deg, ${actor.themeColor}20, ${actor.themeColor}40)`,
                    border: `2px solid ${actor.themeColor}60`,
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    backdropFilter: 'blur(6px)',
                    ...style
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        color: '#fff',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                        fontFamily: actor.themeFontFamily || 'inherit',
                        textTransform: 'uppercase',
                        fontSize: sizeStyles.fontSize
                    }}
                >
                    {actor.name}
                </Typography>
            </Paper>
        );
    }

    if (variant === 'compact') {
        // Compact nameplate for grid/list views
        return (
            <div
                className={className}
                style={{
                    fontWeight: 700,
                    fontSize: sizeStyles.fontSize,
                    fontFamily: actor.themeFontFamily || 'inherit',
                    color: actor.themeColor || '#00ff88',
                    textAlign: 'center',
                    ...style
                }}
            >
                {actor.name}
            </div>
        );
    }

    // Default 'simple' variant
    return (
        <div
            className={className}
            style={{ 
                padding: sizeStyles.padding, 
                background: actor.themeColor ? `linear-gradient(180deg, ${actor.themeColor}99 0%, ${actor.themeColor}CC 100%)` : 'rgba(0,0,0,0.6)', 
                color: '#fff', 
                textAlign: 'center', 
                fontWeight: 600, 
                fontSize: sizeStyles.fontSize,
                fontFamily: actor.themeFontFamily || 'inherit',
                borderRadius: '4px',
                ...style
            }}
        >
            {actor.name}
        </div>
    );
};

export default Nameplate;