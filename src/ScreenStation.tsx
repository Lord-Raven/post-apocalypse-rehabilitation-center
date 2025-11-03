import React from 'react';
import { motion } from 'framer-motion';
import { ScreenBase } from './ScreenBase';

/*
 * This screen allows the player to manage their space station, including viewing resources, upgrading facilities, or visiting locations (transitioning to vignette scenes).
 * This React Vite component is primarily a large space station built from different modules. Probably 80% of the left side of the screen should be a space scene with a subtle grid.
 * The grid should house a couple of starter modules. Additional modules can be added by clicking "+" icons near modules with extendable sections.
 * It should be balanced and visually appealing, with a clear layout for each module.
 * The right side of the screen should have a vertical menu with buttons for different station management options: Resources, Crew, Upgrades, Missions.
 * Extends ScreenBase.
 */

interface Module {
    id: string;
    type: 'command' | 'power' | 'habitat' | 'research' | 'storage' | 'empty';
    x: number;
    y: number;
    connections?: string[];
}

interface StationScreenProps {
    // will implicitly accept ScreenBaseProps.stage
}

interface StationScreenState {
    modules: Module[];
    selectedMenu: string;
}

export default class ScreenStation extends ScreenBase {
    state: StationScreenState = {
        modules: [
            { id: 'command-1', type: 'command', x: 2, y: 2 },
            { id: 'power-1', type: 'power', x: 1, y: 2 },
            { id: 'habitat-1', type: 'habitat', x: 3, y: 2 },
        ],
        selectedMenu: 'resources',
    };

    private gridSize = 6;
    // increase cell size ~3x for a larger grid feel
    private cellSize = 240;

    constructor(props: StationScreenProps) {
        super(props as any);
        // this.stage is now available from ScreenBase (if provided by parent)
    }

    addModule = (x: number, y: number) => {
        const newModule: Module = {
            id: `module-${Date.now()}`,
            // temporary default type for added modules
            type: 'habitat',
            x,
            y,
        };
        this.setState((prev: StationScreenState) => ({ modules: [...prev.modules, newModule] }));
    };

    getModuleAt = (x: number, y: number) => {
        return this.state.modules.find(module => module.x === x && module.y === y);
    };

    canPlaceModule = (x: number, y: number) => {
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) return false;
        return !this.getModuleAt(x, y);
    };

    getAdjacentPositions = (module: Module) => {
        return [
            { x: module.x + 1, y: module.y },
            { x: module.x - 1, y: module.y },
            { x: module.x, y: module.y + 1 },
            { x: module.x, y: module.y - 1 },
        ].filter(pos => this.canPlaceModule(pos.x, pos.y));
    };

    renderGrid() {
        const cells: React.ReactNode[] = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const module = this.getModuleAt(x, y);
                cells.push(
                    <div
                        key={`${x}-${y}`}
                        className="grid-cell"
                        style={{
                            position: 'absolute',
                            left: x * this.cellSize,
                            top: y * this.cellSize,
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
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: '2px solid rgba(0, 255, 136, 0.9)',
                                    borderRadius: 10,
                                    background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.15))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#dfffe6',
                                    fontWeight: 700,
                                    fontSize: '18px',
                                    textTransform: 'capitalize',
                                    textShadow: '0 1px 0 rgba(0,0,0,0.6)'
                                }}
                            >
                                <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                                    {module.type === 'empty' ? 'empty' : module.type}
                                </div>
                            </motion.div>
                        ) : null}

                        {/* Render + placeholders for adjacent empty spaces as a full darkened dotted box */}
                        {this.state.modules.some(m => Math.abs(m.x - x) + Math.abs(m.y - y) === 1) && !module && (
                            <motion.div
                                className="add-module-placeholder"
                                onClick={() => this.addModule(x, y)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: 10,
                                    background: 'rgba(0,0,0,0.45)',
                                    border: '2px dotted rgba(255,255,255,0.18)',
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

        // Example use: this.stage (if the parent passed a stage prop into ScreenStation)
        // console.log('stage from ScreenBase:', this.stage);

        return (
            <div className="station-screen" style={{ display: 'flex', height: '100vh' }}>
                {/* Main Grid Area - 80% left side */}
                <div
                    className="station-grid-container"
                    style={{
                        flex: '0 0 80%',
                        background: 'linear-gradient(45deg, #001122 0%, #002244 100%)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Space background grid */}
                    <div
                        className="space-grid"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `
                                    linear-gradient(rgba(0, 255, 136, 0.08) 1px, transparent 1px),
                                    linear-gradient(90deg, rgba(0, 255, 136, 0.08) 1px, transparent 1px)
                                `,
                            // grid lines should match the station cell size so the background aligns
                            backgroundSize: `${this.cellSize}px ${this.cellSize}px`,
                        }}
                    />

                    {/* Station modules */}
                    <div
                        className="station-modules"
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: gridSize * cellSize,
                            height: gridSize * cellSize,
                        }}
                    >
                        {this.renderGrid()}
                    </div>
                </div>

                {/* Side Menu - 20% right side */}
                <div
                    className="station-menu"
                    style={{
                        flex: '0 0 20%',
                        background: 'rgba(0, 20, 40, 0.9)',
                        borderLeft: '2px solid #00ff88',
                        padding: '20px',
                    }}
                >
                    <h2 style={{ color: '#00ff88', marginBottom: '30px' }}>Station Control</h2>

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
                                border: '1px solid #00ff88',
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
                        <p>Modules: {this.state.modules.length}</p>
                    </div>
                </div>
            </div>
        );
    }
}