import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { Paper, Typography, Box, Avatar } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import Actor, { Stat, ACTOR_STAT_ICONS } from '../actors/Actor';
import { StationStat, STATION_STAT_ICONS } from '../Module';
import Nameplate from '../components/Nameplate';
import { scoreToGrade } from '../utils';

interface StatChange {
    statName: string;
    oldValue: number;
    newValue: number;
}

interface CharacterStatChanges {
    actor: Actor | undefined;
    statChanges: StatChange[];
}

interface StatChangeDisplayProps {
    characterChanges: CharacterStatChanges[];
    layout?: any;
}

const StatChangeDisplay: FC<StatChangeDisplayProps> = ({ characterChanges, layout }) => {
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
                top: '3%',
                right: '3%',
                width: '400px',
                maxHeight: '85vh',
                zIndex: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                overflow: 'hidden',
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
                        Progress!
                    </Typography>
                </Box>
            </Paper>

            {/* Character stat changes */}
            {characterChanges.map((charChange, charIndex) => (
                <motion.div
                    key={charChange.actor ? `stat_${charChange.actor.id}` : `stat_PARC`}
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
                            <Box
                                sx={{
                                    width: '100%',
                                    height: '200px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '3px solid rgba(0,255,136,0.4)',
                                    backgroundImage: `url(${charChange.actor == undefined ? "https://media.charhub.io/41b7b65d-839b-4d31-8c11-64ee50e817df/0fc1e223-ad07-41c4-bdae-c9545d5c5e34.png" : 
                                        charChange.actor.getEmotionImage(charChange.actor.getDefaultEmotion())})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'top center',
                                    backgroundRepeat: 'no-repeat',
                                    filter: 'brightness(1.1)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                                    '&:hover': {
                                        transform: 'scale(1.02)',
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
                            {!charChange.actor ? (
                                <Nameplate 
                                    name="PARC"
                                    size="large"
                                    layout="inline"
                                />
                            ) : (
                                <Nameplate 
                                    actor={charChange.actor} 
                                    size="large"
                                    role={layout ? (() => {
                                        const roleModules = layout.getModulesWhere((m: any) => 
                                            m && m.type !== 'quarters' && m.ownerId === charChange.actor?.id
                                        );
                                        return roleModules.length > 0 ? roleModules[0].getAttribute('role') : undefined;
                                    })() : undefined}
                                    layout="inline"
                                />
                            )}
                        </motion.div>

                        {/* Stat changes */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {charChange.statChanges.map((statChange, statIndex) => {
                                const isIncrease = statChange.newValue > statChange.oldValue;
                                const isDecrease = statChange.newValue < statChange.oldValue;
                                
                                return (
                                <motion.div
                                    key={`${charChange.actor ? charChange.actor.id : 'PARC'}-${statChange.statName}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.8 + charIndex * 0.2 + statIndex * 0.1 }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 4px',
                                        background: isDecrease 
                                            ? 'rgba(255,80,80,0.08)' 
                                            : isIncrease 
                                                ? 'rgba(0,255,136,0.08)' 
                                                : 'rgba(255,255,255,0.05)',
                                        borderRadius: '8px',
                                        border: isDecrease 
                                            ? '1px solid rgba(255,80,80,0.3)' 
                                            : isIncrease 
                                                ? '1px solid rgba(0,255,136,0.3)' 
                                                : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    {/* Stat name with icon */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {(() => {
                                            // Determine if this is an actor stat or station stat
                                            const isActorStat = charChange.actor !== undefined;
                                            const statIcon = isActorStat 
                                                ? ACTOR_STAT_ICONS[statChange.statName as Stat]
                                                : STATION_STAT_ICONS[statChange.statName as StationStat];
                                            const StatIconComponent = statIcon;
                                            
                                            return StatIconComponent ? (
                                                <StatIconComponent 
                                                    sx={{ 
                                                        fontSize: '1.2rem', 
                                                        color: isIncrease ? '#00ff88' : isDecrease ? '#ff6b6b' : '#ffffff',
                                                        opacity: 0.9 
                                                    }} 
                                                />
                                            ) : null;
                                        })()}
                                        <Typography
                                            variant="body1"
                                            className="stat-label"
                                            sx={{
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            {statChange.statName}
                                        </Typography>
                                    </Box>

                                    {/* Grade transition */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        {/* Old grade */}
                                        <span
                                            className="stat-grade"
                                            data-grade={scoreToGrade(statChange.oldValue)}
                                            style={{
                                                fontSize: '2rem',
                                                opacity: 0.6,
                                                filter: 'grayscale(0.5)'
                                            }}
                                        >
                                            {scoreToGrade(statChange.oldValue)}
                                        </span>

                                        {/* Arrow */}
                                        <Typography
                                            sx={{
                                                color: isDecrease 
                                                    ? '#ff5050' 
                                                    : isIncrease 
                                                        ? '#00ff88' 
                                                        : '#ffffff',
                                                fontWeight: 900,
                                                fontSize: '1.4rem',
                                                mx: 0.5,
                                                textShadow: isDecrease 
                                                    ? '0 2px 4px rgba(255,0,0,0.6)' 
                                                    : isIncrease 
                                                        ? '0 2px 4px rgba(0,255,0,0.6)' 
                                                        : '0 2px 4px rgba(0,0,0,0.6)'
                                            }}
                                        >
                                            {isDecrease ? '↓' : isIncrease ? '↑' : '→'}
                                        </Typography>

                                        {/* New grade */}
                                        <motion.span
                                            className="stat-grade"
                                            data-grade={scoreToGrade(statChange.newValue)}
                                            style={{
                                                fontSize: '2rem'
                                            }}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.5, delay: 0.9 + charIndex * 0.2 + statIndex * 0.1 }}
                                        >
                                            {scoreToGrade(statChange.newValue)}
                                        </motion.span>
                                    </Box>
                                </motion.div>
                                );
                            })}
                        </Box>
                    </Paper>
                </motion.div>
            ))}
        </motion.div>
    );
};

export default StatChangeDisplay;