import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { Paper, Typography, Box, Avatar } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import Actor from '../actors/Actor';

interface StatChange {
    statName: string;
    oldValue: number;
    newValue: number;
}

interface CharacterStatChanges {
    actor: Actor;
    statChanges: StatChange[];
}

interface StatChangeDisplayProps {
    characterChanges: CharacterStatChanges[];
}

const StatChangeDisplay: FC<StatChangeDisplayProps> = ({ characterChanges }) => {
    if (!characterChanges || characterChanges.length === 0) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
                position: 'absolute',
                top: '5%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '400px',
                maxHeight: '85vh',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                overflowY: 'auto',
                padding: '0 20px'
            }}
        >
            {/* Header */}
            <Paper
                elevation={8}
                sx={{
                    background: 'linear-gradient(135deg, rgba(0,255,136,0.25) 0%, rgba(0,180,100,0.35) 50%, rgba(0,120,80,0.25) 100%)',
                    border: '2px solid rgba(0,255,136,0.4)',
                    borderRadius: 2,
                    p: 2,
                    backdropFilter: 'blur(12px)',
                    textAlign: 'center'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <TrendingUp sx={{ color: '#00ff88', fontSize: '1.5rem' }} />
                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                        }}
                    >
                        Character Progress
                    </Typography>
                </Box>
            </Paper>

            {/* Character stat changes */}
            {characterChanges.map((charChange, charIndex) => (
                <motion.div
                    key={charChange.actor.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + charIndex * 0.2 }}
                >
                    <Paper
                        elevation={6}
                        sx={{
                            background: 'rgba(10,20,30,0.95)',
                            border: '2px solid rgba(0,255,136,0.15)',
                            borderRadius: 3,
                            p: 3,
                            backdropFilter: 'blur(8px)',
                            textAlign: 'center'
                        }}
                    >
                        {/* Large Character Portrait */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.6 + charIndex * 0.2 }}
                            style={{ marginBottom: '16px' }}
                        >
                            <Avatar
                                src={charChange.actor.emotionPack?.neutral || charChange.actor.avatarImageUrl}
                                sx={{
                                    width: 120,
                                    height: 120,
                                    margin: '0 auto',
                                    border: '3px solid rgba(0,255,136,0.4)',
                                    filter: 'brightness(1.1)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                                    '&:hover': {
                                        transform: 'scale(1.05)',
                                        transition: 'transform 0.2s ease-in-out'
                                    }
                                }}
                            />
                        </motion.div>

                        {/* Character Nameplate */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.7 + charIndex * 0.2 }}
                            style={{ marginBottom: '20px' }}
                        >
                            <Paper
                                elevation={4}
                                sx={{
                                    background: `linear-gradient(135deg, ${charChange.actor.themeColor}20, ${charChange.actor.themeColor}40)`,
                                    border: `2px solid ${charChange.actor.themeColor}60`,
                                    borderRadius: 2,
                                    py: 1.5,
                                    px: 2,
                                    backdropFilter: 'blur(6px)'
                                }}
                            >
                                <Typography
                                    variant="h5"
                                    sx={{
                                        color: '#fff',
                                        fontWeight: 800,
                                        letterSpacing: '1px',
                                        textShadow: '0 2px 6px rgba(0,0,0,0.8)',
                                        fontFamily: charChange.actor.themeFontFamily || 'inherit',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    {charChange.actor.name}
                                </Typography>
                            </Paper>
                        </motion.div>

                        {/* Stat changes */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {charChange.statChanges.map((statChange, statIndex) => (
                                <motion.div
                                    key={`${charChange.actor.id}-${statChange.statName}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.8 + charIndex * 0.2 + statIndex * 0.1 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    {/* Stat name */}
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            color: 'rgba(255,255,255,0.95)',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.8px',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {statChange.statName}
                                    </Typography>

                                    {/* Grade transition */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        {/* Old grade */}
                                        <span
                                            className="stat-grade"
                                            data-grade={charChange.actor.scoreToGrade(statChange.oldValue)}
                                            style={{
                                                fontSize: '2rem',
                                                opacity: 0.6,
                                                filter: 'grayscale(0.5)'
                                            }}
                                        >
                                            {charChange.actor.scoreToGrade(statChange.oldValue)}
                                        </span>

                                        {/* Arrow */}
                                        <Typography
                                            sx={{
                                                color: '#00ff88',
                                                fontWeight: 900,
                                                fontSize: '1.4rem',
                                                mx: 0.5,
                                                textShadow: '0 2px 4px rgba(0,0,0,0.6)'
                                            }}
                                        >
                                            →
                                        </Typography>

                                        {/* New grade */}
                                        <motion.span
                                            className="stat-grade"
                                            data-grade={charChange.actor.scoreToGrade(statChange.newValue)}
                                            style={{
                                                fontSize: '2rem'
                                            }}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.9 + charIndex * 0.2 + statIndex * 0.1 }}
                                        >
                                            {charChange.actor.scoreToGrade(statChange.newValue)}
                                        </motion.span>
                                    </Box>
                                </motion.div>
                            ))}
                        </Box>
                    </Paper>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default StatChangeDisplay;