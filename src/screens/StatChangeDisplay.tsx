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
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
                position: 'absolute',
                right: '2%',
                top: '10%',
                bottom: '20%',
                width: '300px',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto'
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + charIndex * 0.2 }}
                >
                    <Paper
                        elevation={6}
                        sx={{
                            background: 'rgba(10,20,30,0.95)',
                            border: '2px solid rgba(0,255,136,0.15)',
                            borderRadius: 2,
                            p: 2,
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        {/* Character header with portrait and name */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                            <Avatar
                                src={charChange.actor.emotionPack?.neutral || charChange.actor.avatarImageUrl}
                                sx={{
                                    width: 48,
                                    height: 48,
                                    border: '2px solid rgba(0,255,136,0.3)',
                                    filter: 'brightness(1.1)'
                                }}
                            />
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    color: '#fff',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                    fontFamily: charChange.actor.themeFontFamily || 'inherit'
                                }}
                            >
                                {charChange.actor.name}
                            </Typography>
                        </Box>

                        {/* Stat changes */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {charChange.statChanges.map((statChange, statIndex) => (
                                <motion.div
                                    key={`${charChange.actor.id}-${statChange.statName}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.7 + charIndex * 0.2 + statIndex * 0.1 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                    }}
                                >
                                    {/* Stat name */}
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'rgba(255,255,255,0.9)',
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            fontSize: '0.75rem'
                                        }}
                                    >
                                        {statChange.statName}
                                    </Typography>

                                    {/* Grade transition */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {/* Old grade */}
                                        <span
                                            className="stat-grade"
                                            data-grade={charChange.actor.scoreToGrade(statChange.oldValue)}
                                            style={{
                                                fontSize: '1.8rem',
                                                opacity: 0.7,
                                                filter: 'grayscale(0.3)'
                                            }}
                                        >
                                            {charChange.actor.scoreToGrade(statChange.oldValue)}
                                        </span>

                                        {/* Arrow */}
                                        <Typography
                                            sx={{
                                                color: '#00ff88',
                                                fontWeight: 800,
                                                fontSize: '1.2rem',
                                                mx: 0.5
                                            }}
                                        >
                                            →
                                        </Typography>

                                        {/* New grade */}
                                        <motion.span
                                            className="stat-grade"
                                            data-grade={charChange.actor.scoreToGrade(statChange.newValue)}
                                            style={{
                                                fontSize: '1.8rem'
                                            }}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.8 + charIndex * 0.2 + statIndex * 0.1 }}
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