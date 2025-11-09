import React from 'react';
import { motion } from 'framer-motion';
import { BaseScreen } from './BaseScreen';
import { Layout, MODULE_DEFAULTS, Module, createModule } from '../Module';

/*
 * This screen allows the player to manage their space station, including viewing resources, upgrading facilities, or visiting locations (transitioning to vignette scenes).
 * This React Vite component is primarily a large space station built from different modules. Probably 80% of the left side of the screen should be a space scene with a subtle grid.
 * The grid should house a couple of starter modules. Additional modules can be added by clicking "+" icons near modules with extendable sections.
 * It should be balanced and visually appealing, with a clear layout for each module.
 * The right side of the screen should have a vertical menu with buttons for different station management options: Resources, Crew, Upgrades, Missions.
 * Extends ScreenBase.
 */

interface StationScreenProps {
    // will implicitly accept ScreenBaseProps.stage
}

interface StationScreenState {
    selectedMenu: string;
}

export default class StationScreen extends BaseScreen {
    state: StationScreenState = {
        selectedMenu: 'resources',
    };

    private gridSize = 6;
    private cellSize = '10vmin';

    constructor(props: StationScreenProps) {
        super(props as any);
        // this.stage is now available from ScreenBase (if provided by parent)
    }

    addModule = (x: number, y: number) => {
        console.log(`Adding module at ${x}, ${y}`);
        const newModule: Module = createModule('quarters');
        // Write into the Stage's layout and force a re-render
        console.log(`this.stage.layout: `, this.stage?.getLayout());
        this.stage?.getLayout()?.setModuleAt(x, y, newModule);
        this.stage?.incPhase(1);
        this.forceUpdate();
    };

    renderPhaseCircles = (phase: number | undefined) => {
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

    renderGrid() {
        const cells: React.ReactNode[] = [];
        const layout: Layout = this.stage.getLayout();
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const module = layout.getModuleAt(x, y);
                const actorsPresent = Object.values(this.stage.getSave().actors).filter((actor, index) => actor.locationId === module?.id).length;
                cells.push(
                    <div
                        key={`cell_${x}-${y}`}
                        className="grid-cell"
                        style={{
                            position: 'absolute',
                            left: `calc(${x} * ${this.cellSize})`,
                            top: `calc(${y} * ${this.cellSize})`,
                            width: this.cellSize,
                            height: this.cellSize,
                            boxSizing: 'border-box',
                            padding: 6,
                        }}
                    >
                        {module ? (
                            <motion.div
                                className={`module module-${module.type}`}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.03 }}
                                onClick={() => {
                                    // Trigger module action if defined
                                    console.log(`Clicked module ${module.id} of type ${module.type}`);
                                    if (MODULE_DEFAULTS[module.type]?.action) {
                                        MODULE_DEFAULTS[module.type].action!(module, this.stage);
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
                                        const actors = Object.values(this.stage.getSave().actors).filter(a => a.locationId === module.id);
                                        const actorsPresent = actors.length;
                                        return (
                                            <>
                                                {/* Actor strip: spaced evenly across the tile, aligned to the bottom (slightly above the label) */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    display: 'flex',
                                                    justifyContent: actorsPresent <= 1 ? 'center' : 'space-evenly',
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
                                                                height: `calc(0.6 * ${this.cellSize})`,
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
                                onClick={() => this.addModule(x, y)}
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

    render() {
    const { selectedMenu } = this.state;
        const gridSize = this.gridSize;
        const cellSize = this.cellSize;

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
                        {this.renderGrid()}
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
                        <p>Day: {this.stage?.getSave().day}</p>
                        <p>Phase: {this.renderPhaseCircles(this.stage?.getSave().phase)}</p>
                    </div>

                    {['Resources', 'Crew', 'Upgrades', 'Missions'].map(item => (
                        <motion.button
                            key={item}
                            onClick={() => this.setState({ selectedMenu: item.toLowerCase() })}
                            whileHover={{ x: 10 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '15px',
                                margin: '10px 0',
                                background: selectedMenu === item.toLowerCase()
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
                            {item}
                        </motion.button>
                    ))}

                    <div style={{ marginTop: '40px', color: '#00ff88', fontSize: '14px' }}>
                        <p>Selected: {selectedMenu}</p>
                    </div>
                </div>
            </div>
        );
    }
}