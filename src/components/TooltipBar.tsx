import React, { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { SvgIconComponent, HourglassEmpty } from '@mui/icons-material';

interface TooltipBarProps {
    message: string | null;
    Icon?: SvgIconComponent;
    visible?: boolean;
    actionCost?: number; // Number of phases this action costs
}

/**
 * A unified tooltip/message bar that appears at the bottom center of the screen.
 * Displays a message with an optional Material UI icon.
 */
export const TooltipBar: FC<TooltipBarProps> = ({ message, Icon, visible = true, actionCost }) => {
    return (
        <AnimatePresence>
            {message && visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        bottom: '40px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px 24px',
                            background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.95) 0%, rgba(0, 20, 40, 0.95) 100%)',
                            border: '2px solid #00ff88',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0, 255, 136, 0.3), 0 0 20px rgba(0, 255, 136, 0.2)',
                            backdropFilter: 'blur(10px)',
                            maxWidth: '600px',
                            minWidth: 'fit-content',
                        }}
                    >
                        {Icon && (
                            <Icon
                                sx={{
                                    color: '#00ff88',
                                    fontSize: '28px',
                                    filter: 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.5))',
                                    flexShrink: 0,
                                }}
                            />
                        )}
                        <Typography
                            variant="body1"
                            sx={{
                                color: '#00ff88',
                                fontSize: '16px',
                                fontWeight: 600,
                                textShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
                                textAlign: 'center',
                            }}
                        >
                            {message}
                        </Typography>
                        {actionCost && actionCost > 0 && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    marginLeft: '8px',
                                    paddingLeft: '12px',
                                    borderLeft: '2px solid rgba(0, 255, 136, 0.3)',
                                }}
                            >
                                {Array.from({ length: actionCost }).map((_, i) => (
                                    <HourglassEmpty
                                        key={i}
                                        sx={{
                                            color: '#00ff88',
                                            fontSize: '20px',
                                            filter: 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.4))',
                                        }}
                                    />
                                ))}
                            </Box>
                        )}
                    </Box>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TooltipBar;
