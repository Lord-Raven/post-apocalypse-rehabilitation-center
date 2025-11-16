import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ScreenType } from './BaseScreen';
import { Layout, Module, createModule } from '../Module';
import { Stage } from '../Stage';
import Nameplate from '../components/Nameplate';

// Styled components for the day/phase display
const StyledDayCard = styled(Card)(({ theme }) => ({
    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 200, 100, 0.08) 100%)',
    border: '2px solid #00ff88',
    borderRadius: '16px',
    marginBottom: '24px',
    overflow: 'visible',
    position: 'relative',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: '-2px',
        left: '-2px',
        right: '-2px',
        bottom: '-2px',
        background: 'linear-gradient(135deg, #00ff88 0%, rgba(0, 255, 136, 0.3) 100%)',
        borderRadius: '18px',
        zIndex: -1,
        filter: 'blur(4px)',
        opacity: 0.6,
    }
}));

const PhaseIndicator = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '4px',
    marginTop: '12px',
}));

const PhaseSegment = styled(motion.div)<{ isActive: boolean; isCompleted: boolean }>(({ isActive, isCompleted }) => ({
    flex: 1,
    height: '8px',
    borderRadius: '4px',
    border: '2px solid #00ff88',
    background: isCompleted 
        ? 'linear-gradient(90deg, #00ff88 0%, #00cc66 100%)'
        : isActive 
            ? 'linear-gradient(90deg, #00aa55 0%, rgba(0, 170, 85, 0.7) 100%)'
            : 'rgba(0, 255, 136, 0.1)',
    boxShadow: isActive || isCompleted ? '0 0 12px rgba(0, 255, 136, 0.6)' : 'none',
    position: 'relative',
    overflow: 'hidden',
    '&::after': isActive ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
        animation: 'shimmer 2s infinite',
    } : {},
}));

/*
 * This screen allows the player to manage their space station, including viewing resources, upgrading facilities, or visiting locations (transitioning to vignette scenes).
 * This React Vite component is primarily a large space station built from different modules. Probably 80% of the left side of the screen should be a space scene with a subtle grid.
 * The grid should house a couple of starter modules. Additional modules can be added by clicking "+" icons near modules with extendable sections.
 * It should be balanced and visually appealing, with a clear layout for each module.
 * The right side of the screen should have a vertical menu with buttons for different station management options: Patients, Crew, Modules, Requests.
 */

interface StationScreenProps {
    stage: () => Stage;
    setScreenType: (type: ScreenType) => void;
}

export const StationScreen: FC<StationScreenProps> = ({stage, setScreenType}) => {
    const [expandedMenu, setExpandedMenu] = React.useState<string | null>('patients');
    const [previousExpandedMenu, setPreviousExpandedMenu] = React.useState<string | null>(null);
    const [day, setDay] = React.useState<number>(stage().getSave().day);
    const [phase, setPhase] = React.useState<number>(stage().getSave().phase);

    const [layout, setLayout] = React.useState<Layout>(stage()?.getLayout());

    const gridSize = 6;
    const cellSize = '10vmin';

    const addModule = (x: number, y: number) => {
        console.log(`Adding module at ${x}, ${y}`);
        const newModule: Module = createModule('quarters');
        // Write into the Stage's layout
        console.log(`this.stage.layout: `, stage().getLayout());
        stage().getLayout().setModuleAt(x, y, newModule);
        stage().incPhase(1);
        // update local layout state so this component re-renders with the new module
        setLayout(stage().getLayout());
        setDay(stage().getSave().day);
        setPhase(stage().getSave().phase);
    };

    // Need to make sure re-renders when layout is updated.
    React.useEffect(() => {
        setLayout(stage().getLayout());
    }, [stage().getLayout()]);

    const renderDayPhaseDisplay = () => {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOutBack" }}
            >
                <StyledDayCard elevation={4}>
                    <CardContent sx={{ textAlign: 'center', padding: '20px !important' }}>
                        {/* Day Number */}
                        <motion.div
                            key={day} // Re-animate when day changes
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4, ease: "easeOutBack" }}
                        >
                            <Typography
                                variant="h4"
                                component="div"
                                sx={{
                                    fontWeight: 900,
                                    fontSize: '2.2rem',
                                    color: '#00ff88',
                                    textShadow: '0 0 20px rgba(0, 255, 136, 0.5)',
                                    letterSpacing: '0.05em',
                                    marginBottom: '4px',
                                }}
                            >
                                DAY {day}
                            </Typography>
                        </motion.div>
                        
                        {/* Phase Indicator */}
                        <PhaseIndicator>
                            {[0, 1, 2, 3].map((segmentIndex) => (
                                <PhaseSegment
                                    key={segmentIndex}
                                    isActive={segmentIndex === phase}
                                    isCompleted={segmentIndex < phase}
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ 
                                        duration: 0.3, 
                                        delay: segmentIndex * 0.1,
                                        ease: "easeOut"
                                    }}
                                    whileHover={{ 
                                        scaleY: 1.3,
                                        transition: { duration: 0.2 }
                                    }}
                                />
                            ))}
                        </PhaseIndicator>
                    </CardContent>
                </StyledDayCard>
            </motion.div>
        );
    };

    const renderGrid = () => {
        const cells: React.ReactNode[] = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const module = layout.getModuleAt(x, y);
                cells.push(
                    <div
                        key={`cell_${x}-${y}`}
                        className="grid-cell"
                        style={{
                            position: 'absolute',
                            left: `calc(${x} * ${cellSize})`,
                            top: `calc(${y} * ${cellSize})`,
                            width: cellSize,
                            height: cellSize,
                            boxSizing: 'border-box',
                            padding: 6,
                        }}
                    >
                        {module ? (
                            <motion.div
                                key={`cell_motion_${x}-${y}`}
                                className={`module module-${module.type}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.03 }}
                                onClick={() => {
                                    // Trigger module action if defined
                                    console.log(`Clicked module ${module.id} of type ${module.type}`);
                                    const action = module.getAction();
                                    if (action) {
                                        action(module, stage(), setScreenType);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: '3px solid rgba(0, 255, 136, 0.9)',
                                    borderRadius: 10,
                                    background: `url(${module.getAttribute('defaultImageUrl')}) center center / contain no-repeat`,
                                    cursor: 'pointer',
                                    color: '#dfffe6',
                                    fontWeight: 700,
                                    fontSize: '18px',
                                    textTransform: 'capitalize',
                                    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                                    overflow: 'hidden',
                                }}
                            >
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    {/* Compute actors once for this module */}
                                    {(() => {
                                        const actors = Object.values(stage()?.getSave().actors).filter(a => a.locationId === module.id);
                                        const actorCount = actors.length;
                                        return (
                                            <>
                                                {/* Actor strip: spaced evenly across the tile, aligned to the bottom (slightly above the label) */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    display: 'flex',
                                                    justifyContent: actorCount <= 1 ? 'center' : 'space-evenly',
                                                    alignItems: 'flex-end',
                                                    padding: '0 6px',
                                                    pointerEvents: 'none',
                                                }}>
                                                    {actors.map((actor) => (
                                                        <img
                                                            key={actor.id}
                                                            src={actor.emotionPack?.neutral}
                                                            alt={actor.name}
                                                            style={{
                                                                height: `calc(0.6 * ${cellSize})`,
                                                                userSelect: 'none',
                                                                pointerEvents: 'none',
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Label bar: shaded, spans full width, overlays above actors (z-index) and is bottom-aligned */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    right: 0,
                                                    bottom: '6px',
                                                    width: '100%',
                                                    background: 'rgba(0,0,0,0.6)',
                                                    color: '#dfffe6',
                                                    padding: '6px 8px',
                                                    textAlign: 'center',
                                                    fontWeight: 700,
                                                    textTransform: 'capitalize',
                                                    pointerEvents: 'none',
                                                    zIndex: 2,
                                                }}>{module.type}</div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        ) : null}

                        {/* Render + placeholders for adjacent empty spaces as a full darkened dotted box. Test that there is a neighboring module */}
                        {layout.getLayout().flat().some(m => {
                            const {x: mx, y: my} = layout.getModuleCoordinates(m);
                            return Math.abs(mx - x) + Math.abs(my - y) === 1;
                        }) && !module && (
                            <motion.div
                                className="add-module-placeholder"
                                onClick={() => addModule(x, y)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 10,
                                    background: 'rgba(0,0,0,0.45)',
                                    border: '3px dashed rgba(0, 255, 136, 0.9)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.95)',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 800 }}>+</div>
                                <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>Add module</div>
                            </motion.div>
                        )}
                    </div>
                );
            }
        }
        return cells;
    }

    return (
        <div className="station-screen" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {/* Main Grid Area - 80% left side */}
            <div
                className="station-grid-container"
                style={{
                    width: '80vw',
                    boxSizing: 'border-box',
                    background: 'linear-gradient(45deg, #001122 0%, #002244 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Station modules (background grid moved onto this element so it moves with the centered content) */}
                <div
                    className="station-modules"
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: `calc(${gridSize} * ${cellSize})`,
                        height: `calc(${gridSize} * ${cellSize})`,
                        // move the subtle grid onto the centered modules container so lines align with cells
                        backgroundImage: `
                            linear-gradient(rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px)
                        `,
                        backgroundPosition: '0 0',
                        backgroundRepeat: 'repeat',
                    }}
                >
                    {renderGrid()}
                </div>
            </div>

            {/* Side Menu - 20vw right side */}
            <div
                className="station-menu"
                style={{
                    width: '20vw',
                    boxSizing: 'border-box',
                    background: 'rgba(0, 20, 40, 0.9)',
                    borderLeft: '2px solid #00ff88',
                    padding: '20px',
                }}
            >
                <h2 style={{ color: '#00ff88', marginBottom: '30px' }}>Station Control</h2>
                
                {/* Enhanced Day and Phase Display */}
                {renderDayPhaseDisplay()}

                {['Patients', 'Crew', 'Modules', 'Requests'].map(item => {
                    const itemKey = item.toLowerCase();
                    const isExpanded = expandedMenu === itemKey;
                    const isContracting = previousExpandedMenu === itemKey && !isExpanded;
                    
                    return (
                        <motion.div 
                            key={item} 
                            layout
                            style={{ margin: '10px 0' }}
                            whileHover={{ x: 10 }}
                            transition={{ 
                                layout: { duration: 0.3, ease: 'easeInOut' }
                            }}
                        >
                            <motion.button
                                onClick={() => {
                                    setPreviousExpandedMenu(expandedMenu);
                                    setExpandedMenu(isExpanded ? null : itemKey);
                                }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '15px',
                                    background: isExpanded
                                        ? 'rgba(0, 255, 136, 0.2)'
                                        : 'transparent',
                                    border: '3px solid #00ff88',
                                    borderRadius: '5px',
                                    color: '#00ff88',
                                    fontSize: '16px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <span>{item}</span>
                                <span style={{ 
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease'
                                }}>▼</span>
                            </motion.button>
                            
                            {/* Expandable content */}
                            <motion.div
                                layout
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ 
                                    height: isExpanded ? 'auto' : 0,
                                    opacity: isExpanded ? 1 : 0
                                }}
                                transition={{ 
                                    height: { duration: 0.3, ease: 'easeInOut' },
                                    opacity: { duration: 0.2, ease: 'easeInOut' },
                                    layout: { duration: 0.3, ease: 'easeInOut' }
                                }}
                                style={{ 
                                    overflow: 'hidden',
                                    background: 'rgba(0, 20, 40, 0.7)',
                                    border: isExpanded ? '2px solid rgba(0, 255, 136, 0.3)' : 'none',
                                    borderTop: 'none',
                                    borderRadius: '0 0 5px 5px',
                                }}
                                onAnimationComplete={() => {
                                    // Clear previous expanded state once animation is complete
                                    if (isContracting) {
                                        setPreviousExpandedMenu(null);
                                    }
                                }}
                            >
                                {/* Always render content, but with conditional styling for visibility */}
                                {itemKey === 'patients' && (
                                    <div style={{ padding: '15px', maxHeight: '50vh', overflowY: 'auto' }}>
                                        {Object.values(stage().getSave().actors).length === 0 ? (
                                            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '12px' }}>No patients currently on station</p>
                                        ) : (
                                            Object.values(stage().getSave().actors).map((actor: any) => (
                                                <motion.div
                                                    key={actor.id}
                                                    whileHover={{ backgroundColor: 'rgba(0, 255, 136, 0.1)' }}
                                                    style={{
                                                        padding: '12px',
                                                        marginBottom: '15px',
                                                        border: '2px solid rgba(0, 255, 136, 0.2)',
                                                        borderRadius: '8px',
                                                        background: 'rgba(0, 10, 20, 0.5)',
                                                    }}
                                                >
                                                    {/* Nameplate at the top */}
                                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                                        <Nameplate 
                                                            actor={actor} 
                                                            size="small"
                                                        />
                                                    </div>
                                                    
                                                    {/* Two-column layout below */}
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                                                        {/* Left column: Stats with letter grades */}
                                                        <div className="stat-list" style={{ 
                                                            flex: '2', 
                                                            background: 'rgba(0,0,0,0.8)', 
                                                            borderRadius: '6px',
                                                            padding: '8px 10px',
                                                            overflow: 'hidden',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            justifyContent: 'space-around'
                                                        }}>
                                                            {[
                                                                ['Brawn', actor.stats.brawn],
                                                                ['Wits', actor.stats.wits],
                                                                ['Nerve', actor.stats.nerve],
                                                                ['Skill', actor.stats.skill],
                                                                ['Charm', actor.stats.charm],
                                                                ['Lust', actor.stats.lust],
                                                                ['Joy', actor.stats.joy],
                                                                ['Trust', actor.stats.trust],
                                                            ].map(([label, value]) => {
                                                                const grade = actor.scoreToGrade(value);
                                                                return (
                                                                    <div className="stat-row" key={`${actor.id}_${label}`} style={{
                                                                        padding: '3px 0px',
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
                                                        
                                                        {/* Right column: Tall character portrait */}
                                                        <div style={{ 
                                                            flex: '1',
                                                            height: '100%',
                                                            borderRadius: '6px',
                                                            overflow: 'hidden',
                                                            border: '2px solid #00ff88'
                                                        }}>
                                                            <img
                                                                src={actor.emotionPack?.neutral || actor.avatarImageUrl}
                                                                alt={actor.name}
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                )}
                                {itemKey !== 'patients' && (
                                    <div style={{ padding: '15px', color: '#888', fontSize: '12px' }}>
                                        {itemKey === 'crew' && 'Crew management coming soon...'}
                                        {itemKey === 'modules' && 'Module management coming soon...'}
                                        {itemKey === 'requests' && 'Request management coming soon...'}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    );
                })}

                
            </div>
        </div>
    );
}
