import React, { FC } from 'react';
import { motion } from 'framer-motion';
import { Stage, SaveType } from '../Stage';
import { BlurredBackground } from '../components/BlurredBackground';
import { Title, Button } from '../components/UIComponents';
import { useTooltip } from '../contexts/TooltipContext';
import { scoreToGrade } from '../utils';
import { Save, FolderOpen, Close, Delete } from '@mui/icons-material';
import { ScreenType } from './BaseScreen';

interface SaveLoadScreenProps {
    stage: () => Stage;
    mode: 'save' | 'load';
    onClose: () => void;
    setScreenType?: (type: ScreenType) => void;
}

export const SaveLoadScreen: FC<SaveLoadScreenProps> = ({ stage, mode, onClose, setScreenType }) => {
    const { setTooltip, clearTooltip } = useTooltip();
    const [hoveredSlot, setHoveredSlot] = React.useState<number | null>(null);
    const [deleteConfirmSlot, setDeleteConfirmSlot] = React.useState<number | null>(null);

    const handleSlotClick = (slotIndex: number) => {
        if (mode === 'save') {
            // Save to this slot
            stage().saveToSlot(slotIndex);
            setTooltip('Game saved!', Save, undefined, 2000);
            onClose();
        } else {
            // Load from this slot
            stage().loadSave(slotIndex);
            setTooltip('Game loaded!', FolderOpen, undefined, 2000);
            onClose();
            // Navigate to station screen
            if (setScreenType) {
                setScreenType(ScreenType.STATION);
            }
        }
    };

    const handleDelete = (slotIndex: number) => {
        stage().deleteSave(slotIndex);
        setDeleteConfirmSlot(null);
        setTooltip('Save deleted', Delete, undefined, 2000);
    };

    const formatTimestamp = (timestamp?: number): string => {
        if (!timestamp) return 'No Date';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const renderSaveSlot = (slotIndex: number) => {

        const save = stage().getAllSaves()[slotIndex];
        const isEmpty = !save;
        const isCurrentSlot = stage().getCurrentSlot() === slotIndex;

        // Get non-remote actors
        const actors = !isEmpty ? Object.values(save.actors).filter(actor => !actor.remote) : [];

        return (
            <motion.div
                key={slotIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                    opacity: 1, 
                    x: hoveredSlot === slotIndex ? 5 : 0 
                }}
                transition={{ 
                    delay: slotIndex * 0.05,
                    x: { duration: 0.2 }
                }}
                style={{ width: '100%' }}
            >
                <Button
                    variant="menu"
                    onMouseEnter={() => {
                        setHoveredSlot(slotIndex);
                        setTooltip(
                            mode === 'save' 
                                ? `Save game to slot ${slotIndex + 1}` 
                                : isEmpty 
                                    ? 'Empty slot' 
                                    : `Load game from slot ${slotIndex + 1}`,
                            mode === 'save' ? Save : FolderOpen
                        );
                    }}
                    onMouseLeave={() => {
                        setHoveredSlot(null);
                        clearTooltip();
                    }}
                    onClick={() => handleSlotClick(slotIndex)}
                    disabled={mode === 'load' && isEmpty}
                    style={{
                        width: '100%',
                        height: '120px',
                        padding: '15px',
                        paddingRight: isEmpty ? '15px' : '50px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'space-between',
                        background: isCurrentSlot 
                            ? 'rgba(0, 255, 136, 0.15)' 
                            : hoveredSlot === slotIndex && !(mode === 'load' && isEmpty)
                                ? 'rgba(0, 255, 136, 0.1)' 
                                : 'rgba(0, 20, 40, 0.5)',
                        border: isCurrentSlot ? '2px solid rgba(0, 255, 136, 0.5)' : undefined,
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Delete button for filled slots */}
                    {!isEmpty && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmSlot(slotIndex);
                            }}
                            onMouseEnter={(e) => {
                                e.stopPropagation();
                                setTooltip('Delete save', Delete);
                            }}
                            onMouseLeave={(e) => {
                                e.stopPropagation();
                                clearTooltip();
                            }}
                            style={{
                                position: 'absolute',
                                top: '50%',
                                right: '10px',
                                transform: 'translateY(-50%)',
                                background: 'rgba(255, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 0, 0, 0.4)',
                                borderRadius: '4px',
                                color: 'rgba(255, 100, 100, 0.9)',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                fontSize: '18px'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.3)';
                                e.currentTarget.style.color = 'rgba(255, 150, 150, 1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
                                e.currentTarget.style.color = 'rgba(255, 100, 100, 0.9)';
                            }}
                        >
                            <Delete fontSize="small" />
                        </button>
                    )}

                    {isEmpty ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'rgba(0, 255, 136, 0.3)',
                            fontSize: '14px',
                            fontStyle: 'italic'
                        }}>
                            Empty Slot
                        </div>
                    ) : (
                        <>
                            {/* Top row: timestamp and day */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start'
                            }}>
                                <div style={{
                                    fontSize: '12px',
                                    color: 'rgba(0, 255, 136, 0.7)'
                                }}>
                                    {formatTimestamp(save.timestamp)}
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    color: 'rgba(0, 255, 136, 0.9)'
                                }}>
                                    Day {save.day}
                                </div>
                            </div>

                            {/* Middle row: player name and station stats */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '5px'
                            }}>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    color: 'rgba(0, 255, 136, 1)'
                                }}>
                                    {save.player.name}
                                </div>
                                
                                {/* Station stats */}
                                {save.stationStats && (
                                    <div style={{
                                        display: 'flex',
                                        gap: '8px',
                                        fontSize: '11px'
                                    }}>
                                        {Object.entries(save.stationStats).map(([stat, value]) => (
                                            <div
                                                key={stat}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    color: 'rgba(0, 255, 136, 0.8)'
                                                }}
                                            >
                                                <div style={{ fontWeight: 'bold' }}>{scoreToGrade(value)}</div>
                                                <div style={{ 
                                                    fontSize: '9px',
                                                    color: 'rgba(0, 255, 136, 0.5)'
                                                }}>
                                                    {stat.slice(0, 3).toUpperCase()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bottom row: actor images */}
                            <div style={{
                                display: 'flex',
                                gap: '5px',
                                marginTop: '5px',
                                justifyContent: 'flex-start',
                                flexWrap: 'wrap'
                            }}>
                                {actors.slice(0, 10).map((actor) => (
                                    <div
                                        key={actor.id}
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            border: '1px solid rgba(0, 255, 136, 0.3)',
                                            background: 'rgba(0, 20, 40, 0.8)'
                                        }}
                                        title={actor.name}
                                    >
                                        <img
                                            src={actor.getEmotionImage(actor.getDefaultEmotion())}
                                            alt={actor.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                objectPosition: 'top center'
                                            }}
                                        />
                                    </div>
                                ))}
                                {actors.length > 10 && (
                                    <div style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(0, 255, 136, 0.2)',
                                        fontSize: '10px',
                                        color: 'rgba(0, 255, 136, 0.8)'
                                    }}>
                                        +{actors.length - 10}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </motion.div>
        );
    };

    return (
        <div
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
                zIndex: 1000
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="glass-panel-bright"
                style={{
                    padding: '30px',
                    maxWidth: '800px',
                    width: '90%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    onMouseEnter={() => setTooltip('Close', Close)}
                    onMouseLeave={() => clearTooltip()}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
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
                </button>

                {/* Title */}
                <Title variant="glow" style={{ textAlign: 'center', marginBottom: '25px', fontSize: '24px' }}>
                    {mode === 'save' ? 'Save Game' : 'Load Game'}
                </Title>

                {/* Save slots container */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    overflowY: 'auto',
                    paddingRight: '10px'
                }}>
                    {Array.from({ length: 10 }, (_, i) => renderSaveSlot(i))}
                </div>
            </motion.div>

            {/* Delete confirmation modal */}
            {deleteConfirmSlot !== null && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1001
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDeleteConfirmSlot(null);
                        }
                    }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="glass-panel-bright"
                        style={{
                            padding: '30px',
                            maxWidth: '400px',
                            width: '90%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                        }}
                    >
                        <Title variant="glow" style={{ textAlign: 'center', fontSize: '20px' }}>
                            Delete Save?
                        </Title>
                        <div style={{
                            color: 'rgba(0, 255, 136, 0.8)',
                            textAlign: 'center',
                            fontSize: '14px'
                        }}>
                            Are you sure you want to delete this save? This action cannot be undone.
                        </div>
                        <div style={{
                            display: 'flex',
                            gap: '10px',
                            justifyContent: 'center'
                        }}>
                            <Button
                                variant="menu"
                                onClick={() => setDeleteConfirmSlot(null)}
                                onMouseEnter={() => setTooltip('Cancel', Close)}
                                onMouseLeave={() => clearTooltip()}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(0, 255, 136, 0.1)'
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="menu"
                                onClick={() => handleDelete(deleteConfirmSlot)}
                                onMouseEnter={() => setTooltip('Confirm deletion', Delete)}
                                onMouseLeave={() => clearTooltip()}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(255, 0, 0, 0.2)',
                                    border: '2px solid rgba(255, 0, 0, 0.4)',
                                    color: 'rgba(255, 150, 150, 1)'
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
};
