import React, { FC } from 'react';
import { Chip, Box } from '@mui/material';
import Actor from '../actors/Actor';

export interface NameplateProps {
    actor?: Actor;
    name?: string;
    role?: string;
    size?: 'small' | 'medium' | 'large';
    layout?: 'inline' | 'stacked';
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Reusable character nameplate component that displays character names
 * with consistent styling based on their theme colors and fonts.
 * Can optionally display a role below or inline with the name.
 */
export const Nameplate: FC<NameplateProps> = ({ 
    actor,
    name,
    role,
    size = 'medium',
    layout = 'stacked',
    className,
    style 
}) => {
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return {
                    fontSize: '0.9rem',
                    roleFontSize: '0.7rem',
                    borderWidth: '2px',
                };
            case 'large':
                return {
                    fontSize: '1.6rem',
                    roleFontSize: '1.1rem',
                    borderWidth: '4px',
                };
            default: // medium
                return {
                    fontSize: '1.2rem',
                    roleFontSize: '0.9rem',
                    borderWidth: '3px',
                };
        }
    };

    const sizeStyles = getSizeStyles();
    const displayName = actor?.name || name || '';
    const displayRole = role || 'Patient';

    const renderLabel = () => {
        if (!role) {
            return displayName;
        }

        if (layout === 'inline') {
            return (
                <span>
                    {displayName}
                    <span style={{ 
                        fontSize: sizeStyles.roleFontSize,
                        opacity: 0.75,
                        marginLeft: '0.5em',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                    }}>
                        ({displayRole})
                    </span>
                </span>
            );
        } else {
            return (
                <Box sx={{ textAlign: 'center', lineHeight: 1.2 }}>
                    <div>{displayName}</div>
                    <div style={{ 
                        fontSize: sizeStyles.roleFontSize,
                        opacity: 0.75,
                        marginTop: '0.15em',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                    }}>
                        {displayRole}
                    </div>
                </Box>
            );
        }
    };

    return (
        <Chip
            label={renderLabel()}
            variant="filled"
            className={className}
            sx={{ 
                px: 2,
                py: 0.5,
                fontSize: sizeStyles.fontSize,
                fontWeight: 900, 
                color: '#fff', 
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                background: actor?.themeColor || '#4a5568',
                border: actor?.themeColor ? `${sizeStyles.borderWidth} solid ${actor.themeColor}CC` : `${sizeStyles.borderWidth} solid #718096`,
                borderRadius: '25px',
                textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 1px 0 rgba(0,0,0,0.9)',
                boxShadow: `0 6px 20px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.2)`,
                backdropFilter: 'blur(6px)',
                position: 'relative',
                overflow: 'visible',
                // Width should be content-based by default, but respect parent constraints
                width: 'fit-content',
                maxWidth: '100%',
                // Center the nameplate when not in a flex container
                mx: 'auto',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-2px',
                    left: '-2px',
                    right: '-2px',
                    bottom: '-2px',
                    background: actor?.themeColor ? `${actor.themeColor}33` : 'rgba(113, 128, 150, 0.2)',
                    borderRadius: '27px',
                    zIndex: -1,
                    filter: 'blur(3px)',
                },
                '& .MuiChip-label': {
                    padding: role ? (layout === 'stacked' ? '0.2em 0' : 0) : 0,
                    fontFamily: actor?.themeFontFamily || '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                    position: 'relative',
                    zIndex: 1
                },
                ...style
            }}
        />
    );
};

/**
 * Helper function to get an actor's role from the layout.
 * Returns the role name from their assigned role module, or 'Patient' if none.
 */
export const getActorRole = (actorId: string, layout: any): string => {
    const roleModules = layout.getModulesWhere((m: any) => 
        m && m.type !== 'quarters' && m.ownerId === actorId
    );
    
    if (roleModules.length > 0) {
        const roleModule = roleModules[0];
        // Get the role from MODULE_DEFAULTS
        return roleModule.getAttribute('role') || 'Patient';
    }
    
    return 'Patient';
};

export default Nameplate;