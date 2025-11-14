import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { ScreenType } from './BaseScreen';
import { Layout, MODULE_DEFAULTS, Module, createModule } from '../Module';
import { Stage } from '../Stage';
import Nameplate from '../components/Nameplate';

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

    const renderPhaseCircles = (phase: number | undefined) => {
        const circles = [];
        for (let i = 0; i < 4; i++) {
            circles.push(
                <span
                    key={`phase_circle_${i}`}
                    style={{
                        display: 'inline-block',
                        width: i == phase ? '0.5rem' :'1rem',
                        height: i == phase ? '0.5rem' :'1rem',
                        marginRight: i == phase ? '0.5rem' :'0.25rem',
                        marginLeft: i == phase ? '0.5rem' :'0.25rem',
                        marginBottom: i == phase ? '0.25rem' : '0rem',
                        borderRadius: '50%',
                        backgroundColor: i <= (phase || 0) ? '#00ff88' : 'rgba(0, 255, 136, 0.3)',
                    }}
                ></span>
            );
        }
        return circles;
    }

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
                                    if (MODULE_DEFAULTS[module.type]?.action) {
                                        MODULE_DEFAULTS[module.type].action!(module, stage(), setScreenType);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: '3px solid rgba(0, 255, 136, 0.9)',
                                    borderRadius: 10,
                                    background: `url(${module.attributes?.defaultImageUrl}) center center / contain no-repeat`,
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
                {/* Display stage.getSave().day and stage.getSave().phase (day is displayed as a number, phase is a set of four of filled/unfilled circles) */}
                <div style={{ color: '#00ff88', fontSize: '14px' }}>
                    <p>Day: {stage().getSave().day}</p>
                    <p>Phase: {renderPhaseCircles(stage().getSave().phase)}</p>
                </div>

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
                                    opacity: { duration: 0.3, ease: 'easeInOut' },
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
                                {isExpanded && itemKey === 'patients' && (
                                    <div style={{ padding: '15px', maxHeight: '50vh', overflowY: 'auto' }}>
                                        {Object.values(stage().getSave().actors).length === 0 ? (
                                            <p style={{ color: '#888', fontStyle: 'italic', fontSize: '12px' }}>No patients currently on station</p>
                                        ) : (
                                            Object.values(stage().getSave().actors).map((actor: any) => (
                                                <motion.div
                                                    key={actor.id}
                                                    whileHover={{ backgroundColor: 'rgba(0, 255, 136, 0.1)' }}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        padding: '12px',
                                                        marginBottom: '10px',
                                                        border: '2px solid rgba(0, 255, 136, 0.2)',
                                                        borderRadius: '8px',
                                                        background: 'rgba(0, 10, 20, 0.5)',
                                                    }}
                                                >
                                                    {/* Portrait - larger and centered at top */}
                                                    <img
                                                        src={actor.emotionPack?.neutral || actor.avatarImageUrl}
                                                        alt={actor.name}
                                                        style={{
                                                            width: '64px',
                                                            height: '64px',
                                                            borderRadius: '50%',
                                                            marginBottom: '8px',
                                                            border: '3px solid #00ff88',
                                                            objectFit: 'cover',
                                                        }}
                                                    />
                                                    
                                                    {/* Name centered below portrait */}
                                                    <Nameplate 
                                                        actor={actor} 
                                                        variant="compact" 
                                                        size="small"
                                                        style={{
                                                            marginBottom: '6px',
                                                            fontSize: '14px',
                                                            fontWeight: 'bold'
                                                        }}
                                                    />
                                                    
                                                    {/* Stats in a grid layout below name */}
                                                    <div style={{ 
                                                        display: 'grid', 
                                                        gridTemplateColumns: 'repeat(4, 1fr)', 
                                                        gap: '3px', 
                                                        fontSize: '10px',
                                                        width: '100%'
                                                    }}>
                                                        {[
                                                            ['B', actor.stats.brawn],
                                                            ['W', actor.stats.wits],
                                                            ['N', actor.stats.nerve],
                                                            ['S', actor.stats.skill],
                                                            ['C', actor.stats.charm],
                                                            ['L', actor.stats.lust],
                                                            ['J', actor.stats.joy],
                                                            ['T', actor.stats.trust],
                                                        ].map(([label, value]) => {
                                                            const grade = actor.scoreToGrade(value);
                                                            return (
                                                                <span
                                                                    key={label}
                                                                    style={{
                                                                        display: 'flex',
                                                                        flexDirection: 'column',
                                                                        alignItems: 'center',
                                                                        textAlign: 'center',
                                                                        padding: '2px',
                                                                        borderRadius: '3px',
                                                                        background: grade.startsWith('A') ? 'rgba(0, 255, 0, 0.2)' :
                                                                                  grade.startsWith('B') ? 'rgba(0, 150, 255, 0.2)' :
                                                                                  grade.startsWith('C') ? 'rgba(255, 255, 0, 0.2)' :
                                                                                  grade.startsWith('D') ? 'rgba(255, 150, 0, 0.2)' :
                                                                                  'rgba(255, 0, 0, 0.2)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                        fontSize: '8px',
                                                                    }}
                                                                    title={`${label === 'B' ? 'Brawn' : label === 'W' ? 'Wits' : label === 'N' ? 'Nerve' : label === 'S' ? 'Skill' : label === 'C' ? 'Charm' : label === 'L' ? 'Lust' : label === 'J' ? 'Joy' : 'Trust'}: ${grade}`}
                                                                >
                                                                    <div style={{ fontSize: '7px', opacity: 0.7, marginBottom: '1px' }}>
                                                                        {label === 'B' ? 'BRW' : label === 'W' ? 'WIT' : label === 'N' ? 'NRV' : label === 'S' ? 'SKL' : label === 'C' ? 'CHM' : label === 'L' ? 'LST' : label === 'J' ? 'JOY' : 'TST'}
                                                                    </div>
                                                                    <div style={{ fontWeight: 'bold' }}>{grade}</div>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                )}
                                {isExpanded && itemKey !== 'patients' && (
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
