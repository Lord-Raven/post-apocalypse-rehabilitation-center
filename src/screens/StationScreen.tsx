import React, { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Typography, Card, CardContent } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ScreenType } from './BaseScreen';
import { Layout, Module, createModule, ModuleType, MODULE_DEFAULTS, StationStat, STATION_STAT_DESCRIPTIONS } from '../Module';
import { Stage } from '../Stage';
import ActorCard from '../components/ActorCard';
import ModuleCard from '../components/ModuleCard';
import { PhaseIndicator as SharedPhaseIndicator } from '../components/UIComponents';
import { useTooltip } from '../contexts/TooltipContext';
import { SwapHoriz, Home, Work, Menu, Build, Hotel, Restaurant, Security, Favorite } from '@mui/icons-material';
import { SkitType } from '../Skit';
import { generateActorDecor } from '../actors/Actor';
import { scoreToGrade } from '../utils';

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

/*
 * This screen allows the player to manage their space station, including viewing resources, upgrading facilities, or visiting locations (transitioning to skit scenes).
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
    
    // Module selection state
    const [showModuleSelector, setShowModuleSelector] = React.useState(false);
    const [selectedPosition, setSelectedPosition] = React.useState<{x: number, y: number} | null>(null);
    
    // Drag and drop state
    const [draggedModule, setDraggedModule] = React.useState<{module: Module, fromX: number, fromY: number} | null>(null);
    const [draggedActor, setDraggedActor] = React.useState<any | null>(null);
    const [hoveredModuleId, setHoveredModuleId] = React.useState<string | null>(null);
    const [justDroppedModuleId, setJustDroppedModuleId] = React.useState<string | null>(null);
    const [hoveredActorId, setHoveredActorId] = React.useState<string | null>(null);

    // Tooltip context
    const { setTooltip, clearTooltip } = useTooltip();

    const gridSize = 6;
    const cellSize = '12vh';

    const openModuleSelector = (x: number, y: number) => {
        setSelectedPosition({x, y});
        setShowModuleSelector(true);
    };

    const addModule = (moduleType: ModuleType, x: number, y: number) => {
        console.log(`Adding module of type ${moduleType} at ${x}, ${y}`);
        const newModule: Module = createModule(moduleType);
        // Write into the Stage's layout
        stage().getLayout().setModuleAt(x, y, newModule);
        // update local layout state so this component re-renders with the new module
        setLayout(stage().getLayout());
        setShowModuleSelector(false);
        setSelectedPosition(null);
        // Possibly kick off a skit about the new module, if no others exist in layout:
        const existingModules = stage().getLayout().getModulesWhere(m => m.type === moduleType);
        if (existingModules.length === 1 && Object.keys(stage().getSave().actors).length > 0) { // New module is the only one of its type
            // Grab a few random patients to pull to the new module for a skit:
            const randomPatients = Object.values(stage().getSave().actors)
                .filter(a => a.locationId !== newModule.id)
                .sort(() => 0.5 - Math.random()) // shuffle, then randomly grab 1-3 patients:
                .slice(0, Math.min(Math.random() * 3 + 1, Object.keys(stage().getSave().actors).length));
            randomPatients.forEach(p => {
                p.locationId = newModule.id;
            });

            stage().setSkit({
                type: SkitType.NEW_MODULE,
                moduleId: newModule.id,
                script: [],
                context: { moduleType }
            });
            setScreenType(ScreenType.SKIT);
        } else {
            stage().incPhase(1);
        }
    };

    const getAvailableModules = (): ModuleType[] => {
        return Object.keys(MODULE_DEFAULTS).filter(moduleType => {
            const available = MODULE_DEFAULTS[moduleType as ModuleType].available;
            return available ? available(stage()) : true;
        }) as ModuleType[];
    };

    const handleModuleDragStart = (module: Module, x: number, y: number) => {
        setDraggedModule({module, fromX: x, fromY: y});
        setTooltip(`Moving ${module.type} module`, SwapHoriz);
    };

    const handleModuleDrop = (toX: number, toY: number) => {
        if (!draggedModule) return;
        
        const {fromX, fromY, module} = draggedModule;
        
        // Don't do anything if dropped on same position
        if (fromX === toX && fromY === toY) {
            setDraggedModule(null);
            clearTooltip();
            return;
        }
        
        const targetModule = layout.getModuleAt(toX, toY);
        
        // Swap modules if target has a module
        if (targetModule) {
            stage().getLayout().setModuleAt(fromX, fromY, targetModule);
            stage().getLayout().setModuleAt(toX, toY, module);
        } else {
            // Move to empty space
            stage().getLayout().setModuleAt(fromX, fromY, null as any);
            stage().getLayout().setModuleAt(toX, toY, module);
        }
        
        setLayout(stage().getLayout());
        setDraggedModule(null);
        clearTooltip();
    };

    const handleActorDropOnModule = (actorId: string, targetModule: Module) => {
        const actor = stage().getSave().actors[actorId];
        if (!actor) return;
        let phaseCost = 0;

        if (targetModule.type === 'quarters') {
            // Handle quarters assignment with swapping
            const currentQuartersId = actor.locationId;
            const targetOwnerId = targetModule.ownerId;

            if (targetOwnerId !== actorId) {
                phaseCost = 1;
            }

            // If target quarters has an owner, swap them
            if (targetOwnerId && targetOwnerId !== actorId) {
                const otherActor = stage().getSave().actors[targetOwnerId];
                if (otherActor && currentQuartersId) {
                    // Find current quarters module
                    const currentQuarters = layout.getModuleById(currentQuartersId);
                    if (currentQuarters && currentQuarters.type === 'quarters') {
                        // Swap: other actor gets current quarters
                        currentQuarters.ownerId = targetOwnerId;
                        otherActor.locationId = currentQuartersId;
                    }
                }
            } else {
                // If the new quarters was unoccupied, then no one was swapped and we need to clear this character's current quarters before assigning them here.
                layout.getLayout().flat().forEach(module => {
                    if (module && module.type === 'quarters' && module.ownerId === actorId) {
                        module.ownerId = undefined;
                    }
                });
            }

            // Assign actor to target quarters
            targetModule.ownerId = actorId;
            actor.locationId = targetModule.id;
            generateActorDecor(actor, targetModule, stage());

        } else {
            if (targetModule.ownerId !== actorId) {
                phaseCost = 1;
            }

            // Clear any previous role assignment for this actor (non-quarters modules)
            layout.getLayout().flat().forEach(module => {
                if (module && module.type !== 'quarters' && module.ownerId === actorId) {
                    module.ownerId = undefined;
                }
            });

            // Assign the actor to this module as their role
            targetModule.ownerId = actorId;
            actor.locationId = targetModule.id;
            generateActorDecor(actor, targetModule, stage());
            const roleName: string = targetModule.getAttribute('role') || '';
            if (roleName && Object.keys(actor.heldRoles).indexOf(roleName) === -1) {
                // This character has never held this role before; initialize counter and also kick off a little skit about it.
                actor.heldRoles[roleName] = 0;
                phaseCost = 0; // The skit will advance the phase.
                stage().setSkit({
                    type: SkitType.ROLE_ASSIGNMENT,
                    moduleId: targetModule.id,
                    actorId: actorId,
                    script: [],
                    context: { role: roleName }
                });
                setScreenType(ScreenType.SKIT);
            }
        }

        // Show drop animation feedback
        setJustDroppedModuleId(targetModule.id);
        setTimeout(() => setJustDroppedModuleId(null), 500);

        // Update layout to trigger re-render
        setLayout(stage().getLayout());
        setDraggedActor(null);
        setHoveredModuleId(null);
        if (phaseCost > 0) {
            stage().incPhase(phaseCost);
        }
    };

    // Need to make sure re-renders when layout is updated.
    React.useEffect(() => {
        setLayout(stage().getLayout());
    }, [stage().getLayout()]);

    // Handle Escape key to open menu
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setScreenType(ScreenType.MENU);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setScreenType]);

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
                        <SharedPhaseIndicator currentPhase={phase} totalPhases={4} />
                    </CardContent>
                </StyledDayCard>
            </motion.div>
        );
    };

    // Helper function to get relevant modules for an actor
    const getActorRelatedModules = (actorId: string | null) => {
        if (!actorId) return { locationId: null, homeId: null, workId: null };
        
        const actor = stage().getSave().actors[actorId];
        if (!actor) return { locationId: null, homeId: null, workId: null };
        
        // Current location
        const locationId = actor.locationId;
        
        // Home quarters (quarters type with ownerId matching actor)
        const homeModule = layout.getModulesWhere(m => 
            m.type === 'quarters' && m.ownerId === actorId
        )[0];
        const homeId = homeModule?.id || null;
        
        // Work assignment (non-quarters type with ownerId matching actor)
        const workModule = layout.getModulesWhere(m => 
            m.type !== 'quarters' && m.ownerId === actorId
        )[0];
        const workId = workModule?.id || null;
        
        return { locationId, homeId, workId };
    };

    const renderGrid = () => {
        const cells: React.ReactNode[] = [];
        
        // Get related modules for the hovered/dragged actor
        const activeActorId = draggedActor?.id || hoveredActorId;
        const { locationId, homeId, workId } = getActorRelatedModules(activeActorId);
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const module = layout.getModuleAt(x, y);
                
                // Check if this module should be highlighted
                const isHighlighted = module && (
                    module.id === locationId ||
                    module.id === homeId ||
                    module.id === workId
                );
                const isHome = module && module.id === homeId;
                const isWork = module && module.id === workId;
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
                            zIndex: draggedModule?.module.id === module?.id ? 1000 : 1,
                        }}
                    >
                        {module ? (
                            <motion.div
                                key={module.id}
                                layoutId={module.id}
                                className={`module module-${module.type}`}
                                initial={{ scale: 0 }}
                                animate={{ 
                                    scale: justDroppedModuleId === module.id ? 1.15 : 1,
                                    boxShadow: hoveredModuleId === module.id && draggedActor 
                                        ? `0 0 40px rgba(0, 255, 136, 0.8), inset 0 0 30px rgba(0, 255, 136, 0.3)`
                                        : justDroppedModuleId === module.id
                                            ? `0 0 50px rgba(0, 255, 136, 1), inset 0 0 40px rgba(0, 255, 136, 0.5)`
                                            : isHighlighted
                                                ? `0 0 25px rgba(255, 200, 0, 0.8), inset 0 0 20px rgba(255, 200, 0, 0.2)`
                                                : undefined,
                                    x: 0,
                                    y: 0
                                }}
                                transition={{
                                    scale: { duration: 0.2 },
                                    boxShadow: { duration: 0.2 },
                                    layout: { duration: 0.3, ease: "easeInOut" },
                                    x: { duration: 0.3, ease: "easeOut" },
                                    y: { duration: 0.3, ease: "easeOut" }
                                }}
                                whileHover={{ scale: draggedActor ? 1.08 : 1.03 }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: isHighlighted 
                                        ? '3px solid rgba(255, 200, 0, 0.9)' 
                                        : '3px solid rgba(0, 255, 136, 0.9)',
                                    borderRadius: 10,
                                    background: `url(${stage().getSave().actors[module.ownerId || '']?.decorImageUrls[module.type] || module.getAttribute('defaultImageUrl')}) center center / contain no-repeat`,
                                    cursor: 'pointer',
                                    color: '#dfffe6',
                                    fontWeight: 700,
                                    fontSize: '18px',
                                    textTransform: 'capitalize',
                                    textShadow: '0 1px 0 rgba(0,0,0,0.6)',
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                                drag={!draggedActor}
                                dragMomentum={false}
                                dragElastic={0}
                                dragSnapToOrigin={true}
                                onDragStart={() => handleModuleDragStart(module, x, y)}
                                onDragOver={(e) => {
                                    if (draggedActor) {
                                        e.preventDefault();
                                        setHoveredModuleId(module.id);
                                        
                                        // Update tooltip with assignment message
                                        const actor = draggedActor;
                                        if (module.type === 'quarters') {
                                            if (module.ownerId === actor.id) {
                                                setTooltip(`${actor.name} is already assigned here.`, Home);
                                            } else if (!module.ownerId) {
                                                setTooltip(`Assign ${actor.name} to new quarters.`, Home);
                                            } else {
                                                const otherActor = stage().getSave().actors[module.ownerId]?.name || 'occupant';
                                                setTooltip(`Swap ${actor.name}'s assignment with ${otherActor}.`, SwapHoriz);
                                            }
                                        } else {
                                            const role = module.getAttribute('role') || module.type;
                                            if (module.ownerId === actor.id) {
                                                setTooltip(`${actor.name} is already assigned as ${role}.`, Work);
                                            } else if (!module.ownerId) {
                                                setTooltip(`Assign ${actor.name} to ${role}.`, Work);
                                            } else {
                                                const otherActor = stage().getSave().actors[module.ownerId]?.name || 'occupant';
                                                setTooltip(`Swap ${actor.name} with current ${role}, ${otherActor}.`, SwapHoriz);
                                            }
                                        }
                                    } else if (draggedModule && draggedModule.module.id !== module.id) {
                                        // Show swap tooltip when dragging one module over another
                                        e.preventDefault();
                                        setTooltip(`Swap ${draggedModule.module.type} with ${module.type}`, SwapHoriz);
                                    }
                                }}
                                onDragLeave={() => {
                                    if (draggedActor) {
                                        setHoveredModuleId(null);
                                        clearTooltip();
                                    } else if (draggedModule) {
                                        // Restore the "Moving module" tooltip when leaving another module
                                        setTooltip(`Moving ${draggedModule.module.type} module`, SwapHoriz);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedActor) {
                                        handleActorDropOnModule(draggedActor.id, module);
                                        clearTooltip();
                                    }
                                }}
                                onDragEnd={(event, info) => {
                                    // Calculate which cell we're over based on drag position
                                    const gridContainer = document.querySelector('.station-modules');
                                    if (!gridContainer) {
                                        clearTooltip();
                                        return;
                                    }
                                    
                                    const rect = gridContainer.getBoundingClientRect();
                                    const cellSizeNum = rect.width / gridSize;
                                    
                                    // Get pointer position relative to grid
                                    const relX = info.point.x - rect.left;
                                    const relY = info.point.y - rect.top;
                                    
                                    const dropX = Math.floor(relX / cellSizeNum);
                                    const dropY = Math.floor(relY / cellSizeNum);
                                    
                                    // Validate drop position
                                    if (dropX >= 0 && dropX < gridSize && dropY >= 0 && dropY < gridSize) {
                                        handleModuleDrop(dropX, dropY);
                                    } else {
                                        setDraggedModule(null);
                                        clearTooltip();
                                    }
                                }}
                                onClick={(e) => {
                                    // Only trigger action if not dragging
                                    if (draggedModule) return;
                                    
                                    // Trigger module action if defined
                                    console.log(`Clicked module ${module.id} of type ${module.type}`);
                                    const action = module.getAction();
                                    if (action) {
                                        action(module, stage(), setScreenType);
                                    }
                                }}
                            >
                                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                    {/* Icon overlays for home and work modules */}
                                    {isHome && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            background: 'rgba(0, 0, 0, 0.7)',
                                            borderRadius: '50%',
                                            padding: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 10,
                                            border: '2px solid rgba(255, 200, 0, 0.8)',
                                        }}>
                                            <Home style={{ color: '#ffc800', fontSize: '24px' }} />
                                        </div>
                                    )}
                                    {isWork && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            background: 'rgba(0, 0, 0, 0.7)',
                                            borderRadius: '50%',
                                            padding: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 10,
                                            border: '2px solid rgba(255, 200, 0, 0.8)',
                                        }}>
                                            <Work style={{ color: '#ffc800', fontSize: '24px' }} />
                                        </div>
                                    )}
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
                                                            src={actor.getEmotionImage(actor.getDefaultEmotion(), stage())}
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
                                                <div 
                                                    className="module-label"
                                                    style={{
                                                        position: 'absolute',
                                                        left: 0,
                                                        right: 0,
                                                        bottom: '6px',
                                                        width: '100%',
                                                        background: 'rgba(0,0,0,0.6)',
                                                        padding: '6px 8px',
                                                        textAlign: 'center',
                                                        pointerEvents: 'none',
                                                        zIndex: 2,
                                                        fontSize: '14px',
                                                    }}
                                                >{module.type}</div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        ) : null}

                        {/* Render + placeholders for adjacent empty spaces as a full darkened dotted box. Test that there is a neighboring module */}
                        {layout.getLayout().flat().some(m => {
                            const {x: mx, y: my} = layout.getModuleCoordinates(m);
                            // Check if adjacent and not the dragged module's original position
                            const isAdjacent = Math.abs(mx - x) + Math.abs(my - y) === 1;
                            const isDraggedOrigin = draggedModule && draggedModule.fromX === x && draggedModule.fromY === y;
                            return isAdjacent && !isDraggedOrigin;
                        }) && !module && (
                            <motion.div
                                className="add-module-placeholder"
                                onClick={() => openModuleSelector(x, y)}
                                onDragOver={(e) => e.preventDefault()}
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
                {/* Station Stats Display - Top Bar */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        right: '80px', // Leave space for menu button
                        display: 'flex',
                        gap: '20px',
                        padding: '15px 25px',
                        background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.85) 0%, rgba(0, 20, 40, 0.85) 100%)',
                        border: '2px solid #00ff88',
                        borderRadius: '12px',
                        boxShadow: '0 0 30px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 90,
                    }}
                >
                    {(['Systems', 'Comfort', 'Provision', 'Security', 'Harmony'] as StationStat[]).map((statName) => {
                        const statValue = stage().getSave().stationStats?.[statName] || 5;
                        const grade = scoreToGrade(statValue);
                        // Map stat names to appropriate icons
                        const statIcons: Record<StationStat, any> = {
                            'Systems': Build,
                            'Comfort': Hotel,
                            'Provision': Restaurant,
                            'Security': Security,
                            'Harmony': Favorite
                        };
                        const StatIcon = statIcons[statName];
                        return (
                            <motion.div
                                key={statName}
                                whileHover={{ scale: 1.05, y: -3 }}
                                onMouseEnter={() => setTooltip(STATION_STAT_DESCRIPTIONS[statName], StatIcon)}
                                onMouseLeave={() => clearTooltip()}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flex: 1,
                                }}
                            >
                                {/* Stat Name and Grade - Inline */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <span
                                        className="stat-label"
                                        style={{
                                            fontSize: '0.9rem',
                                        }}
                                    >
                                        {statName}
                                    </span>
                                    
                                    {/* Grade Display */}
                                    <span
                                        className="stat-grade"
                                        data-grade={grade}
                                        style={{
                                            fontSize: '1.8rem',
                                            fontWeight: 900,
                                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px currentColor',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {grade}
                                    </span>
                                </div>
                                
                                {/* Ten-pip bar */}
                                <div style={{
                                    display: 'flex',
                                    gap: '2px',
                                    width: '100%',
                                }}>
                                    {Array.from({ length: 10 }, (_, i) => {
                                        const isLit = i < statValue;
                                        // Get color based on grade
                                        let pipColor = '#00ff88';
                                        if (grade.startsWith('F')) pipColor = '#ff6b6b';
                                        else if (grade.startsWith('D')) pipColor = '#ffb47a';
                                        else if (grade.startsWith('C')) pipColor = '#d0d0d0';
                                        else if (grade.startsWith('B')) pipColor = '#3bd3ff';
                                        else if (grade.startsWith('A')) pipColor = '#ffdd2f';
                                        
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ scaleY: 0 }}
                                                animate={{ scaleY: 1 }}
                                                transition={{ delay: 0.5 + (i * 0.05) }}
                                                style={{
                                                    flex: 1,
                                                    height: '4px',
                                                    borderRadius: '2px',
                                                    background: isLit 
                                                        ? pipColor
                                                        : 'rgba(255, 255, 255, 0.1)',
                                                    boxShadow: isLit 
                                                        ? `0 0 8px ${pipColor}, inset 0 1px 2px rgba(255, 255, 255, 0.3)`
                                                        : 'none',
                                                    border: isLit 
                                                        ? `1px solid ${pipColor}`
                                                        : '1px solid rgba(255, 255, 255, 0.2)',
                                                    transition: 'all 0.3s ease',
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Menu Button - Top Right */}
                <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {setScreenType(ScreenType.MENU)}}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        zIndex: 100,
                        background: 'rgba(0, 20, 40, 0.9)',
                        border: '3px solid #00ff88',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#00ff88',
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                    }}
                    onMouseEnter={() => setTooltip('Open Menu', Menu)}
                    onMouseLeave={() => clearTooltip()}
                >
                    <Menu style={{ fontSize: '28px' }} />
                </motion.button>
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
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    overflow: 'hidden',
                }}
            >
                {/* Enhanced Day and Phase Display */}
                {renderDayPhaseDisplay()}

                {['Patients', 'Modules', 'Requests'].map(item => {
                    const itemKey = item.toLowerCase();
                    const isExpanded = expandedMenu === itemKey;
                    const isContracting = previousExpandedMenu === itemKey && !isExpanded;
                    const [isHeaderHovered, setIsHeaderHovered] = React.useState(false);
                    
                    return (
                        <motion.div 
                            key={item} 
                            layout
                            style={{ 
                                margin: '10px 0',
                                flex: isExpanded ? '1 1 auto' : '0 0 auto',
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: 0,
                            }}
                            animate={{ x: isHeaderHovered ? 10 : 0 }}
                            transition={{ 
                                layout: { duration: 0.3, ease: 'easeInOut' },
                                x: { duration: 0.2, ease: 'easeOut' }
                            }}
                        >
                            <motion.button
                                onClick={() => {
                                    setPreviousExpandedMenu(expandedMenu);
                                    setExpandedMenu(isExpanded ? null : itemKey);
                                }}
                                onMouseEnter={() => setIsHeaderHovered(true)}
                                onMouseLeave={() => setIsHeaderHovered(false)}
                                whileTap={{ scale: 0.95 }}
                                className="section-header"
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
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '1rem',
                                }}
                            >
                                <span style={{ fontWeight: 700, letterSpacing: '0.08em' }}>{item}</span>
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
                                    flex: isExpanded ? '1 1 auto' : '0 0 auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    minHeight: 0,
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
                                    <div style={{ padding: '15px', flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
                                        {Object.values(stage().getSave().actors).length === 0 ? (
                                            <p style={{ color: '#00ff88', opacity: 0.5, fontStyle: 'italic', fontSize: '0.85rem', fontWeight: 700 }}>No patients currently on station</p>
                                        ) : (
                                            Object.values(stage().getSave().actors).map((actor: any) => (
                                                <div 
                                                    key={actor.id}
                                                    onMouseEnter={() => setHoveredActorId(actor.id)}
                                                    onMouseLeave={() => setHoveredActorId(null)}
                                                >
                                                    <ActorCard
                                                        actor={actor}
                                                        role={(() => {
                                                            const roleModules = layout.getModulesWhere((m: Module) => 
                                                                m && m.type !== 'quarters' && m.ownerId === actor.id
                                                            );
                                                            return roleModules.length > 0 ? roleModules[0].getAttribute('role') : undefined;
                                                        })()}
                                                        isDragging={draggedActor?.id === actor.id}
                                                        draggable={true}
                                                        onDragStart={(e: React.DragEvent) => {
                                                            setDraggedActor(actor);
                                                            setHoveredActorId(null);
                                                            e.dataTransfer.effectAllowed = 'move';
                                                        }}
                                                        onDragEnd={() => {
                                                            setDraggedActor(null);
                                                            setHoveredModuleId(null);
                                                            setHoveredActorId(null);
                                                            clearTooltip();
                                                        }}
                                                        whileHover={{
                                                            backgroundColor: 'rgba(0, 255, 136, 0.15)',
                                                            borderColor: 'rgba(0, 255, 136, 0.5)',
                                                            x: 10
                                                        }}
                                                        style={{
                                                            marginBottom: '15px',
                                                        }}
                                                    />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                                {itemKey === 'modules' && (
                                    <div style={{ 
                                        padding: '15px', 
                                        flex: '1 1 auto', 
                                        overflowY: 'auto', 
                                        minHeight: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                    }}>
                                        {layout.getModulesWhere(m => true).length === 0 ? (
                                            <p style={{ 
                                                color: '#00ff88', 
                                                opacity: 0.5, 
                                                fontStyle: 'italic', 
                                                fontSize: '0.85rem', 
                                                fontWeight: 700,
                                                gridColumn: '1 / -1'
                                            }}>No modules currently on station</p>
                                        ) : (
                                            layout.getModulesWhere(m => true).map((module: Module) => (
                                                <ModuleCard
                                                    key={module.id}
                                                    module={module}
                                                    stage={stage()}
                                                    onClick={() => {
                                                        console.log(`Clicked module ${module.id} of type ${module.type}`);
                                                        const action = module.getAction();
                                                        if (action) {
                                                            action(module, stage(), setScreenType);
                                                        }
                                                    }}
                                                />
                                            ))
                                        )}
                                    </div>
                                )}
                                {itemKey === 'requests' && (
                                    <div style={{ padding: '15px', color: '#00ff88', opacity: 0.5, fontSize: '0.85rem', fontWeight: 700, fontStyle: 'italic' }}>
                                        Request management coming soon...
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    );
                })}

                
            </div>

            {/* Module Selection Modal */}
            <AnimatePresence>
                {showModuleSelector && selectedPosition && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowModuleSelector(false)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'linear-gradient(135deg, rgba(0, 30, 60, 0.95) 0%, rgba(0, 20, 40, 0.95) 100%)',
                                border: '3px solid #00ff88',
                                borderRadius: '20px',
                                padding: '30px',
                                maxWidth: '80vw',
                                maxHeight: '80vh',
                                overflow: 'auto',
                                boxShadow: '0 0 40px rgba(0, 255, 136, 0.3)',
                            }}
                        >
                            <Typography
                                variant="h4"
                                style={{
                                    color: '#00ff88',
                                    marginBottom: '20px',
                                    textAlign: 'center',
                                    textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                                    fontWeight: 900,
                                }}
                            >
                                Select Module Type
                            </Typography>
                            
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '20px',
                                marginTop: '20px',
                            }}>
                                {getAvailableModules().map((moduleType) => {
                                    const moduleDefaults = MODULE_DEFAULTS[moduleType];
                                    return (
                                        <motion.div
                                            key={moduleType}
                                            whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0, 255, 136, 0.5)' }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => addModule(moduleType, selectedPosition.x, selectedPosition.y)}
                                            style={{
                                                background: `url(${moduleDefaults.defaultImageUrl}) center center / cover`,
                                                border: '2px solid #00ff88',
                                                borderRadius: '10px',
                                                padding: '15px',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                minHeight: '150px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-end',
                                            }}
                                        >
                                            <div style={{
                                                background: 'rgba(0, 0, 0, 0.8)',
                                                padding: '10px',
                                                borderRadius: '5px',
                                                textAlign: 'center',
                                            }}>
                                                <Typography
                                                    variant="h6"
                                                    style={{
                                                        color: '#00ff88',
                                                        textTransform: 'capitalize',
                                                        fontWeight: 700,
                                                        fontSize: '1rem',
                                                    }}
                                                >
                                                    {moduleType}
                                                </Typography>
                                                {moduleDefaults.role && (
                                                    <Typography
                                                        variant="body2"
                                                        style={{
                                                            color: '#00ff88',
                                                            opacity: 0.7,
                                                            fontSize: '0.85rem',
                                                            marginTop: '4px',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {moduleDefaults.role}
                                                    </Typography>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowModuleSelector(false)}
                                style={{
                                    marginTop: '30px',
                                    padding: '12px 30px',
                                    background: 'transparent',
                                    border: '2px solid #00ff88',
                                    borderRadius: '8px',
                                    color: '#00ff88',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'block',
                                    marginLeft: 'auto',
                                    marginRight: 'auto',
                                }}
                            >
                                Cancel
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
