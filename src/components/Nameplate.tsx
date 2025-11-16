import React, { FC } from 'react';
import { Chip } from '@mui/material';
import Actor from '../actors/Actor';

export interface NameplateProps {
    actor: Actor;
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
    size = 'medium',
    className,
    style 
}) => {
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return {
                    fontSize: '0.9rem',
                    borderWidth: '2px',
                };
            case 'large':
                return {
                    fontSize: '1.6rem',
                    borderWidth: '4px',
                };
            default: // medium
                return {
                    fontSize: '1.2rem',
                    borderWidth: '3px',
                };
        }
    };

    const sizeStyles = getSizeStyles();

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
                    padding: 0,
                    fontFamily: actor.themeFontFamily || '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                    position: 'relative',
                    zIndex: 1
                },
                ...style
            }}
        />
    );
};

export default Nameplate;