import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage } from '../Stage';
import Actor, { getRole } from '../actors/Actor';
import Faction from '../factions/Faction';
import { ModuleIntrinsic } from '../Module';
import { GlassPanel, Title, Button } from '../components/UIComponents';
import { Close, Person, Groups, Domain } from '@mui/icons-material';
import { ActorDetailScreen } from './ActorDetailScreen';
import { FactionDetailScreen } from './FactionDetailScreen';
import { ModuleDetailScreen, ModuleSource } from './ModuleDetailScreen';

interface ContentManagementScreenProps {
    stage: () => Stage;
    onClose: () => void;
}

type TabType = 'actors' | 'factions' | 'modules';
type SelectedModule = {
    moduleId: string;
    source: ModuleSource;
};

export const ContentManagementScreen: FC<ContentManagementScreenProps> = ({ stage, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('actors');
    const [selectedActor, setSelectedActor] = useState<Actor | null>(null);
    const [selectedFaction, setSelectedFaction] = useState<Faction | null>(null);
    const [selectedModule, setSelectedModule] = useState<SelectedModule | null>(null);

    // Get all actors from the save
    const actors = Object.values(stage().getSave().actors);
    
    // Get all factions from the save
    const factions = Object.values(stage().getSave().factions);

    // Get all custom modules from the save
    const save = stage().getSave();
    const customModules = Object.entries(save.customModules || {});
    const directorModule: [string, ModuleIntrinsic] | null = save.directorModule
        ? [
            'director module',
            save.directorModule.module || {
                name: save.directorModule.name || 'Director\'s Cabin',
                skitPrompt: '',
                imagePrompt: '',
                role: save.directorModule.roleName || 'Maid',
                roleDescription: '',
                baseImageUrl: '',
                defaultImageUrl: '',
                cost: {},
            },
        ]
        : null;
    const factionModules = factions
        .filter((faction) => !!faction.module)
        .map((faction) => [faction.id, faction.module as ModuleIntrinsic, faction.name] as const);
    const allModulesCount = customModules.length + (directorModule ? 1 : 0) + factionModules.length;

    const handleActorClick = (actor: Actor) => {
        setSelectedActor(actor);
    };

    const handleFactionClick = (faction: Faction) => {
        setSelectedFaction(faction);
    };

    const handleModuleClick = (moduleId: string, source: ModuleSource) => {
        setSelectedModule({ moduleId, source });
    };

    const handleCloseDetail = () => {
        setSelectedActor(null);
        setSelectedFaction(null);
        setSelectedModule(null);
    };

    const selectedModuleIntrinsic = React.useMemo(() => {
        if (!selectedModule) {
            return null;
        }

        if (selectedModule.source.kind === 'custom') {
            return stage().getSave().customModules?.[selectedModule.moduleId] || null;
        }

        if (selectedModule.source.kind === 'director') {
            const currentSave = stage().getSave();
            return currentSave.directorModule?.module || {
                name: currentSave.directorModule?.name || 'Director\'s Cabin',
                skitPrompt: '',
                imagePrompt: '',
                role: currentSave.directorModule?.roleName || 'Maid',
                roleDescription: '',
                baseImageUrl: '',
                defaultImageUrl: '',
                cost: {},
            };
        }

        return stage().getSave().factions?.[selectedModule.source.factionId]?.module || null;
    }, [selectedModule, stage]);

    return (
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 10, 20, 0.85)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            onClose();
                        }
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 50 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '90vw',
                            maxWidth: '1400px',
                            maxHeight: '90vh',
                        }}
                    >
                        <GlassPanel 
                            variant="bright"
                            style={{
                                height: '90vh',
                                overflow: 'hidden',
                                position: 'relative',
                                padding: '30px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Header with close button */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '20px',
                            }}>
                                <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                    Content Management
                                </Title>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(0, 255, 136, 0.7)',
                                        cursor: 'pointer',
                                        fontSize: '24px',
                                        padding: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Close />
                                </motion.button>
                            </div>

                            {/* Tab Navigation */}
                            <div style={{
                                display: 'flex',
                                gap: '10px',
                                marginBottom: '20px',
                                borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                paddingBottom: '10px',
                            }}>
                                <Button
                                    onClick={() => setActiveTab('actors')}
                                    variant={activeTab === 'actors' ? 'primary' : 'secondary'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: activeTab === 'actors' ? 1 : 0.6,
                                    }}
                                >
                                    <Person />
                                    Actors ({actors.length})
                                </Button>
                                <Button
                                    onClick={() => setActiveTab('factions')}
                                    variant={activeTab === 'factions' ? 'primary' : 'secondary'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: activeTab === 'factions' ? 1 : 0.6,
                                    }}
                                >
                                    <Groups />
                                    Factions ({factions.length})
                                </Button>
                                <Button
                                    onClick={() => setActiveTab('modules')}
                                    variant={activeTab === 'modules' ? 'primary' : 'secondary'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        opacity: activeTab === 'modules' ? 1 : 0.6,
                                    }}
                                >
                                    <Domain />
                                    Modules ({allModulesCount})
                                </Button>
                            </div>

                            {/* Content Area */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                                paddingRight: '10px',
                            }}>
                                {/* Actors Tab */}
                                {activeTab === 'actors' && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: '15px',
                                        padding: '10px',
                                    }}>
                                        {actors.length === 0 ? (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                textAlign: 'center',
                                                padding: '40px',
                                                color: 'rgba(224, 240, 255, 0.6)',
                                                fontSize: '16px',
                                            }}>
                                                No actors found in the current save.
                                            </div>
                                        ) : (
                                            actors.map(actor => (
                                                <motion.div
                                                    key={actor.id}
                                                    whileHover={{ scale: 1.05, y: -5 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleActorClick(actor)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                        border: '2px solid rgba(0, 255, 136, 0.3)',
                                                        borderRadius: '8px',
                                                        padding: '15px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        transition: 'border-color 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.6)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                                                    }}
                                                >
                                                    {/* Actor Avatar */}
                                                    <div
                                                        style={{
                                                            width: '120px',
                                                            height: '120px',
                                                            borderRadius: '50%',
                                                            backgroundColor: 'rgba(0, 20, 40, 0.8)',
                                                            border: `3px solid ${actor.themeColor}`,
                                                            backgroundImage: actor.getEmotionImageUrl('neutral') || actor.getEmotionImageUrl('base') || actor.avatarImageUrl 
                                                                ? `url(${actor.getEmotionImageUrl('neutral') || actor.getEmotionImageUrl('base') || actor.avatarImageUrl})` 
                                                                : 'none',
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'top center',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                    >
                                                        {!actor.getEmotionImageUrl('neutral') && !actor.getEmotionImageUrl('base') && !actor.avatarImageUrl && (
                                                            <Person style={{ fontSize: '50px', color: 'rgba(0, 255, 136, 0.3)' }} />
                                                        )}
                                                    </div>
                                                    
                                                    {/* Actor Name */}
                                                    <div
                                                        style={{
                                                            color: '#00ff88',
                                                            fontSize: '16px',
                                                            fontWeight: 'bold',
                                                            textAlign: 'center',
                                                            fontFamily: actor.themeFontFamily,
                                                        }}
                                                    >
                                                        {actor.name}
                                                    </div>
                                                    
                                                    {/* Actor Role/Origin */}
                                                    <div
                                                        style={{
                                                            color: 'rgba(224, 240, 255, 0.6)',
                                                            fontSize: '12px',
                                                            textAlign: 'center',
                                                            textTransform: 'capitalize',
                                                        }}
                                                    >
                                                        {getRole(actor, stage().getSave()) || actor.origin}
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* Factions Tab */}
                                {activeTab === 'factions' && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                        gap: '15px',
                                        padding: '10px',
                                    }}>
                                        {factions.length === 0 ? (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                textAlign: 'center',
                                                padding: '40px',
                                                color: 'rgba(224, 240, 255, 0.6)',
                                                fontSize: '16px',
                                            }}>
                                                No factions found in the current save.
                                            </div>
                                        ) : (
                                            factions.map(faction => {
                                                const representative = faction.representativeId 
                                                    ? stage().getSave().actors[faction.representativeId]
                                                    : null;
                                                
                                                return (
                                                    <motion.div
                                                        key={faction.id}
                                                        whileHover={{ scale: 1.05, y: -5 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleFactionClick(faction)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '15px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '10px',
                                                            transition: 'border-color 0.2s',
                                                            minHeight: '200px',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.6)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                                                        }}
                                                    >
                                                        {/* Faction Background */}
                                                        {faction.backgroundImageUrl && (
                                                            <div
                                                                style={{
                                                                    width: '100%',
                                                                    height: '100px',
                                                                    borderRadius: '5px',
                                                                    backgroundColor: 'rgba(0, 20, 40, 0.8)',
                                                                    border: `2px solid ${faction.themeColor}`,
                                                                    backgroundImage: `url(${faction.backgroundImageUrl})`,
                                                                    backgroundSize: 'cover',
                                                                    backgroundPosition: 'center',
                                                                }}
                                                            />
                                                        )}
                                                        
                                                        {/* Faction Name */}
                                                        <div
                                                            style={{
                                                                color: faction.themeColor,
                                                                fontSize: '18px',
                                                                fontWeight: 'bold',
                                                                textAlign: 'center',
                                                                fontFamily: faction.themeFont,
                                                            }}
                                                        >
                                                            {faction.name}
                                                        </div>
                                                        
                                                        {/* Faction Status */}
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            fontSize: '12px',
                                                            color: 'rgba(224, 240, 255, 0.6)',
                                                        }}>
                                                            <span>Reputation: {faction.reputation}/10</span>
                                                            <span style={{ 
                                                                color: faction.active ? '#00ff88' : '#ff5555' 
                                                            }}>
                                                                {faction.active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Representative */}
                                                        {representative && (
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: 'rgba(224, 240, 255, 0.7)',
                                                                textAlign: 'center',
                                                            }}>
                                                                Rep: {representative.name}
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Modules Tab */}
                                {activeTab === 'modules' && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                                        gap: '15px',
                                        padding: '10px',
                                    }}>
                                        {allModulesCount === 0 ? (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                textAlign: 'center',
                                                padding: '40px',
                                                color: 'rgba(224, 240, 255, 0.6)',
                                                fontSize: '16px',
                                            }}>
                                                No editable modules found in the current save.
                                            </div>
                                        ) : (
                                            <>
                                                {directorModule && (() => {
                                                    const [moduleId, moduleIntrinsic] = directorModule;
                                                    return (
                                                        <motion.div
                                                            key={moduleId}
                                                            whileHover={{ scale: 1.05, y: -5 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleModuleClick(moduleId, { kind: 'director' })}
                                                            style={{
                                                                cursor: 'pointer',
                                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                                borderRadius: '8px',
                                                                padding: '15px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '10px',
                                                                transition: 'border-color 0.2s',
                                                                minHeight: '220px',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.6)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                                                            }}
                                                        >
                                                            {moduleIntrinsic.defaultImageUrl && (
                                                                <div
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '110px',
                                                                        borderRadius: '5px',
                                                                        backgroundColor: 'rgba(0, 20, 40, 0.8)',
                                                                        border: '2px solid rgba(0, 255, 136, 0.35)',
                                                                        backgroundImage: `url(${moduleIntrinsic.defaultImageUrl})`,
                                                                        backgroundSize: 'cover',
                                                                        backgroundPosition: 'center',
                                                                    }}
                                                                />
                                                            )}

                                                            <div
                                                                style={{
                                                                    color: '#00ff88',
                                                                    fontSize: '18px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                }}
                                                            >
                                                                {moduleIntrinsic.name || moduleId}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    color: 'rgba(224, 240, 255, 0.75)',
                                                                    fontSize: '12px',
                                                                    textAlign: 'center',
                                                                    lineHeight: 1.4,
                                                                }}
                                                            >
                                                                {moduleIntrinsic.role
                                                                    ? `${moduleIntrinsic.role}: ${moduleIntrinsic.roleDescription || 'No role description.'}`
                                                                    : (moduleIntrinsic.skitPrompt || 'No module details yet.')}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    marginTop: 'auto',
                                                                    color: 'rgba(224, 240, 255, 0.5)',
                                                                    fontSize: '11px',
                                                                    textAlign: 'center',
                                                                    fontFamily: 'monospace',
                                                                }}
                                                            >
                                                                Director Module
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })()}

                                                {factionModules.map(([moduleId, moduleIntrinsic, factionName]) => (
                                                    <motion.div
                                                        key={moduleId}
                                                        whileHover={{ scale: 1.05, y: -5 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => handleModuleClick(moduleId, { kind: 'faction', factionId: moduleId })}
                                                        style={{
                                                            cursor: 'pointer',
                                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                                            borderRadius: '8px',
                                                            padding: '15px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '10px',
                                                            transition: 'border-color 0.2s',
                                                            minHeight: '220px',
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.6)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                                                        }}
                                                    >
                                                        {moduleIntrinsic.defaultImageUrl && (
                                                            <div
                                                                style={{
                                                                    width: '100%',
                                                                    height: '110px',
                                                                    borderRadius: '5px',
                                                                    backgroundColor: 'rgba(0, 20, 40, 0.8)',
                                                                    border: '2px solid rgba(0, 255, 136, 0.35)',
                                                                    backgroundImage: `url(${moduleIntrinsic.defaultImageUrl})`,
                                                                    backgroundSize: 'cover',
                                                                    backgroundPosition: 'center',
                                                                }}
                                                            />
                                                        )}

                                                        <div
                                                            style={{
                                                                color: '#00ff88',
                                                                fontSize: '18px',
                                                                fontWeight: 'bold',
                                                                textAlign: 'center',
                                                            }}
                                                        >
                                                            {moduleIntrinsic.name || moduleId}
                                                        </div>

                                                        <div
                                                            style={{
                                                                color: 'rgba(224, 240, 255, 0.75)',
                                                                fontSize: '12px',
                                                                textAlign: 'center',
                                                                lineHeight: 1.4,
                                                            }}
                                                        >
                                                            {moduleIntrinsic.role
                                                                ? `${moduleIntrinsic.role}: ${moduleIntrinsic.roleDescription || 'No role description.'}`
                                                                : (moduleIntrinsic.skitPrompt || 'No module details yet.')}
                                                        </div>

                                                        <div
                                                            style={{
                                                                marginTop: 'auto',
                                                                color: 'rgba(224, 240, 255, 0.5)',
                                                                fontSize: '11px',
                                                                textAlign: 'center',
                                                                fontFamily: 'monospace',
                                                            }}
                                                        >
                                                            Faction: {factionName}
                                                        </div>
                                                    </motion.div>
                                                ))}

                                                {customModules.map(([moduleId, module]) => {
                                                    const moduleIntrinsic = module as ModuleIntrinsic;
                                                    return (
                                                        <motion.div
                                                            key={moduleId}
                                                            whileHover={{ scale: 1.05, y: -5 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => handleModuleClick(moduleId, { kind: 'custom' })}
                                                            style={{
                                                                cursor: 'pointer',
                                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                                borderRadius: '8px',
                                                                padding: '15px',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '10px',
                                                                transition: 'border-color 0.2s',
                                                                minHeight: '220px',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.6)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.3)';
                                                            }}
                                                        >
                                                            {moduleIntrinsic.defaultImageUrl && (
                                                                <div
                                                                    style={{
                                                                        width: '100%',
                                                                        height: '110px',
                                                                        borderRadius: '5px',
                                                                        backgroundColor: 'rgba(0, 20, 40, 0.8)',
                                                                        border: '2px solid rgba(0, 255, 136, 0.35)',
                                                                        backgroundImage: `url(${moduleIntrinsic.defaultImageUrl})`,
                                                                        backgroundSize: 'cover',
                                                                        backgroundPosition: 'center',
                                                                    }}
                                                                />
                                                            )}

                                                            <div
                                                                style={{
                                                                    color: '#00ff88',
                                                                    fontSize: '18px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                }}
                                                            >
                                                                {moduleIntrinsic.name || moduleId}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    color: 'rgba(224, 240, 255, 0.75)',
                                                                    fontSize: '12px',
                                                                    textAlign: 'center',
                                                                    lineHeight: 1.4,
                                                                }}
                                                            >
                                                                {moduleIntrinsic.role
                                                                    ? `${moduleIntrinsic.role}: ${moduleIntrinsic.roleDescription || 'No role description.'}`
                                                                    : (moduleIntrinsic.skitPrompt || 'No module details yet.')}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    marginTop: 'auto',
                                                                    color: 'rgba(224, 240, 255, 0.5)',
                                                                    fontSize: '11px',
                                                                    textAlign: 'center',
                                                                    fontFamily: 'monospace',
                                                                }}
                                                            >
                                                                Custom Module
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </GlassPanel>
                    </motion.div>
                </motion.div>
            </AnimatePresence>

            {/* Actor Detail Modal */}
            {selectedActor && (
                <ActorDetailScreen
                    actor={selectedActor}
                    stage={stage}
                    onClose={handleCloseDetail}
                />
            )}

            {/* Faction Detail Modal */}
            {selectedFaction && (
                <FactionDetailScreen
                    faction={selectedFaction}
                    stage={stage}
                    onClose={handleCloseDetail}
                />
            )}

            {/* Module Detail Modal */}
            {selectedModule && selectedModuleIntrinsic && (
                <ModuleDetailScreen
                    moduleId={selectedModule.moduleId}
                    module={selectedModuleIntrinsic}
                    moduleSource={selectedModule.source}
                    stage={stage}
                    onClose={handleCloseDetail}
                />
            )}
        </>
    );
};
