import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stage } from '../Stage';
import Faction from '../factions/Faction';
import { GlassPanel, Title, Button, TextInput, Chip } from '../components/UIComponents';
import { Close, Save, Image as ImageIcon, Domain } from '@mui/icons-material';

interface FactionDetailScreenProps {
    faction: Faction;
    stage: () => Stage;
    onClose: () => void;
}

export const FactionDetailScreen: FC<FactionDetailScreenProps> = ({ faction, stage, onClose }) => {
    // Local state for editable fields
    const [editedFaction, setEditedFaction] = useState<{
        name: string;
        description: string;
        visualStyle: string;
        roles: string[];
        themeColor: string;
        themeFont: string;
        reputation: number;
        active: boolean;
        backgroundImageUrl: string;
        // Module fields (if exists)
        moduleName: string;
        moduleSkitPrompt: string;
        moduleImagePrompt: string;
        moduleRole: string;
        moduleRoleDescription: string;
        moduleBaseImageUrl: string;
        moduleDefaultImageUrl: string;
    }>({
        name: faction.name,
        description: faction.description,
        visualStyle: faction.visualStyle,
        roles: [...faction.roles],
        themeColor: faction.themeColor,
        themeFont: faction.themeFont,
        reputation: faction.reputation,
        active: faction.active,
        backgroundImageUrl: faction.backgroundImageUrl,
        // Module data
        moduleName: faction.module?.name || '',
        moduleSkitPrompt: faction.module?.skitPrompt || '',
        moduleImagePrompt: faction.module?.imagePrompt || '',
        moduleRole: faction.module?.role || '',
        moduleRoleDescription: faction.module?.roleDescription || '',
        moduleBaseImageUrl: faction.module?.baseImageUrl || '',
        moduleDefaultImageUrl: faction.module?.defaultImageUrl || '',
    });

    const [isSaving, setIsSaving] = useState(false);
    const [newRole, setNewRole] = useState('');

    const handleSave = () => {
        setIsSaving(true);
        
        // Update the faction in the save
        faction.name = editedFaction.name;
        faction.description = editedFaction.description;
        faction.visualStyle = editedFaction.visualStyle;
        faction.roles = [...editedFaction.roles];
        faction.themeColor = editedFaction.themeColor;
        faction.themeFont = editedFaction.themeFont;
        faction.reputation = editedFaction.reputation;
        faction.active = editedFaction.active;
        faction.backgroundImageUrl = editedFaction.backgroundImageUrl;

        // Update module if it exists
        if (faction.module) {
            faction.module.name = editedFaction.moduleName;
            faction.module.skitPrompt = editedFaction.moduleSkitPrompt;
            faction.module.imagePrompt = editedFaction.moduleImagePrompt;
            faction.module.role = editedFaction.moduleRole;
            faction.module.roleDescription = editedFaction.moduleRoleDescription;
            faction.module.baseImageUrl = editedFaction.moduleBaseImageUrl;
            faction.module.defaultImageUrl = editedFaction.moduleDefaultImageUrl;
        }

        // Save the game
        stage().saveGame();
        
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleInputChange = (field: string, value: string | number | boolean) => {
        setEditedFaction(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddRole = () => {
        if (newRole.trim() && !editedFaction.roles.includes(newRole.trim())) {
            setEditedFaction(prev => ({
                ...prev,
                roles: [...prev.roles, newRole.trim()]
            }));
            setNewRole('');
        }
    };

    const handleRemoveRole = (roleToRemove: string) => {
        setEditedFaction(prev => ({
            ...prev,
            roles: prev.roles.filter(role => role !== roleToRemove)
        }));
    };

    const representative = faction.representativeId 
        ? stage().getSave().actors[faction.representativeId]
        : null;

    return (
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
                    background: 'rgba(0, 10, 20, 0.9)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1100,
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
                            overflow: 'auto',
                            position: 'relative',
                            padding: '30px',
                        }}
                    >
                        {/* Header with close button */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px',
                            position: 'sticky',
                            top: 0,
                            background: 'rgba(0, 20, 40, 0.95)',
                            backdropFilter: 'blur(8px)',
                            padding: '10px 0',
                            zIndex: 10,
                        }}>
                            <Title variant="glow" style={{ fontSize: '24px', margin: 0 }}>
                                Faction Details: {faction.name}
                            </Title>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Save style={{ fontSize: '20px' }} />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </Button>
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
                        </div>

                        {/* Form Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                            
                            {/* Basic Info Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Basic Information
                                </h2>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {/* Name */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Name
                                        </label>
                                        <TextInput
                                            fullWidth
                                            value={editedFaction.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            placeholder="Faction name"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Description
                                        </label>
                                        <textarea
                                            value={editedFaction.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            placeholder="Faction's purpose, values, and role in the galaxy"
                                            style={{
                                                width: '100%',
                                                minHeight: '100px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>

                                    {/* Visual Style */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Visual Style & Aesthetic
                                        </label>
                                        <textarea
                                            value={editedFaction.visualStyle}
                                            onChange={(e) => handleInputChange('visualStyle', e.target.value)}
                                            placeholder="Architectural style, uniforms, colors, and overall visual identity"
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '12px',
                                                fontSize: '14px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                                fontFamily: 'inherit',
                                                resize: 'vertical',
                                            }}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Roles Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Available Roles
                                </h2>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* Role chips */}
                                    <div style={{ 
                                        display: 'flex', 
                                        flexWrap: 'wrap', 
                                        gap: '8px',
                                        minHeight: '40px',
                                        padding: '10px',
                                        backgroundColor: 'rgba(0, 20, 40, 0.4)',
                                        borderRadius: '5px',
                                        border: '1px solid rgba(0, 255, 136, 0.2)',
                                    }}>
                                        {editedFaction.roles.length === 0 ? (
                                            <span style={{ color: 'rgba(224, 240, 255, 0.5)', fontSize: '14px' }}>
                                                No roles defined
                                            </span>
                                        ) : (
                                            editedFaction.roles.map(role => (
                                                <Chip
                                                    key={role}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => handleRemoveRole(role)}
                                                >
                                                    {role}
                                                    <span style={{ marginLeft: '3px', fontWeight: 'bold' }}>×</span>
                                                </Chip>
                                            ))
                                        )}
                                    </div>
                                    
                                    {/* Add new role */}
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <TextInput
                                            value={newRole}
                                            onChange={(e) => setNewRole(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAddRole();
                                                }
                                            }}
                                            placeholder="Add a new role..."
                                            style={{ flex: 1 }}
                                        />
                                        <Button
                                            onClick={handleAddRole}
                                            disabled={!newRole.trim()}
                                        >
                                            Add Role
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            {/* Theme & Status Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Theme & Status
                                </h2>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    {/* Theme Color */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Theme Color
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <TextInput
                                                value={editedFaction.themeColor}
                                                onChange={(e) => handleInputChange('themeColor', e.target.value)}
                                                placeholder="#RRGGBB"
                                                style={{ flex: 1 }}
                                            />
                                            <div
                                                style={{
                                                    width: '50px',
                                                    height: '38px',
                                                    backgroundColor: editedFaction.themeColor,
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Font Family */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Font Family
                                        </label>
                                        <TextInput
                                            fullWidth
                                            value={editedFaction.themeFont}
                                            onChange={(e) => handleInputChange('themeFont', e.target.value)}
                                            placeholder="Font stack (e.g., Georgia, serif)"
                                        />
                                    </div>

                                    {/* Reputation */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Reputation (0-10)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            value={editedFaction.reputation}
                                            onChange={(e) => handleInputChange('reputation', Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                borderRadius: '5px',
                                                color: '#e0f0ff',
                                            }}
                                        />
                                        <div style={{
                                            marginTop: '5px',
                                            fontSize: '12px',
                                            color: 'rgba(224, 240, 255, 0.6)',
                                        }}>
                                            {faction.getReputationDescription()}
                                        </div>
                                    </div>

                                    {/* Active Status */}
                                    <div>
                                        <label 
                                            style={{
                                                display: 'block',
                                                color: '#00ff88',
                                                fontSize: '14px',
                                                fontWeight: 'bold',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            Status
                                        </label>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', height: '38px' }}>
                                            <label style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px',
                                                cursor: 'pointer',
                                                color: '#e0f0ff',
                                                fontSize: '14px',
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editedFaction.active}
                                                    onChange={(e) => handleInputChange('active', e.target.checked)}
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                                Active (conducting business with PARC)
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Background Image Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <ImageIcon />
                                    Background Image
                                </h2>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <TextInput
                                        fullWidth
                                        value={editedFaction.backgroundImageUrl}
                                        onChange={(e) => handleInputChange('backgroundImageUrl', e.target.value)}
                                        placeholder="Background image URL"
                                    />
                                    
                                    {editedFaction.backgroundImageUrl && (
                                        <div
                                            style={{
                                                width: '100%',
                                                height: '200px',
                                                borderRadius: '8px',
                                                backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                border: '2px solid rgba(0, 255, 136, 0.3)',
                                                backgroundImage: `url(${editedFaction.backgroundImageUrl})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                            }}
                                        />
                                    )}
                                </div>
                            </section>

                            {/* Custom Module Section */}
                            {faction.module && (
                                <section>
                                    <h2 style={{ 
                                        color: '#00ff88', 
                                        fontSize: '18px', 
                                        fontWeight: 'bold',
                                        marginBottom: '15px',
                                        borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                        paddingBottom: '5px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <Domain />
                                        Custom Module
                                    </h2>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        {/* Module Name */}
                                        <div>
                                            <label 
                                                style={{
                                                    display: 'block',
                                                    color: '#00ff88',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Module Name
                                            </label>
                                            <TextInput
                                                fullWidth
                                                value={editedFaction.moduleName}
                                                onChange={(e) => handleInputChange('moduleName', e.target.value)}
                                                placeholder="Module name"
                                            />
                                        </div>

                                        {/* Skit Prompt */}
                                        <div>
                                            <label 
                                                style={{
                                                    display: 'block',
                                                    color: '#00ff88',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Skit/Purpose Prompt
                                            </label>
                                            <textarea
                                                value={editedFaction.moduleSkitPrompt}
                                                onChange={(e) => handleInputChange('moduleSkitPrompt', e.target.value)}
                                                placeholder="Module's function and role on the station"
                                                style={{
                                                    width: '100%',
                                                    minHeight: '80px',
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                    color: '#e0f0ff',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical',
                                                }}
                                            />
                                        </div>

                                        {/* Image Prompt */}
                                        <div>
                                            <label 
                                                style={{
                                                    display: 'block',
                                                    color: '#00ff88',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Visual Description
                                            </label>
                                            <textarea
                                                value={editedFaction.moduleImagePrompt}
                                                onChange={(e) => handleInputChange('moduleImagePrompt', e.target.value)}
                                                placeholder="Visual description for image generation"
                                                style={{
                                                    width: '100%',
                                                    minHeight: '60px',
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                    color: '#e0f0ff',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical',
                                                }}
                                            />
                                        </div>

                                        {/* Role Name */}
                                        <div>
                                            <label 
                                                style={{
                                                    display: 'block',
                                                    color: '#00ff88',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Role Name
                                            </label>
                                            <TextInput
                                                fullWidth
                                                value={editedFaction.moduleRole}
                                                onChange={(e) => handleInputChange('moduleRole', e.target.value)}
                                                placeholder="Role title"
                                            />
                                        </div>

                                        {/* Role Description */}
                                        <div>
                                            <label 
                                                style={{
                                                    display: 'block',
                                                    color: '#00ff88',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Role Description
                                            </label>
                                            <textarea
                                                value={editedFaction.moduleRoleDescription}
                                                onChange={(e) => handleInputChange('moduleRoleDescription', e.target.value)}
                                                placeholder="Responsibilities and duties"
                                                style={{
                                                    width: '100%',
                                                    minHeight: '60px',
                                                    padding: '12px',
                                                    fontSize: '14px',
                                                    backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                    border: '2px solid rgba(0, 255, 136, 0.3)',
                                                    borderRadius: '5px',
                                                    color: '#e0f0ff',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical',
                                                }}
                                            />
                                        </div>

                                        {/* Module Images */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            {/* Base Image */}
                                            <div>
                                                <label 
                                                    style={{
                                                        display: 'block',
                                                        color: '#00ff88',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    Base Image URL
                                                </label>
                                                <TextInput
                                                    fullWidth
                                                    value={editedFaction.moduleBaseImageUrl}
                                                    onChange={(e) => handleInputChange('moduleBaseImageUrl', e.target.value)}
                                                    placeholder="Base image URL"
                                                />
                                                {editedFaction.moduleBaseImageUrl && (
                                                    <div
                                                        style={{
                                                            marginTop: '10px',
                                                            width: '100%',
                                                            height: '150px',
                                                            borderRadius: '5px',
                                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                                            backgroundImage: `url(${editedFaction.moduleBaseImageUrl})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                        }}
                                                    />
                                                )}
                                            </div>

                                            {/* Default Image */}
                                            <div>
                                                <label 
                                                    style={{
                                                        display: 'block',
                                                        color: '#00ff88',
                                                        fontSize: '14px',
                                                        fontWeight: 'bold',
                                                        marginBottom: '8px',
                                                    }}
                                                >
                                                    Default Image URL
                                                </label>
                                                <TextInput
                                                    fullWidth
                                                    value={editedFaction.moduleDefaultImageUrl}
                                                    onChange={(e) => handleInputChange('moduleDefaultImageUrl', e.target.value)}
                                                    placeholder="Default themed image URL"
                                                />
                                                {editedFaction.moduleDefaultImageUrl && (
                                                    <div
                                                        style={{
                                                            marginTop: '10px',
                                                            width: '100%',
                                                            height: '150px',
                                                            borderRadius: '5px',
                                                            backgroundColor: 'rgba(0, 20, 40, 0.6)',
                                                            border: '2px solid rgba(0, 255, 136, 0.3)',
                                                            backgroundImage: `url(${editedFaction.moduleDefaultImageUrl})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center',
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Read-only Info Section */}
                            <section>
                                <h2 style={{ 
                                    color: '#00ff88', 
                                    fontSize: '18px', 
                                    fontWeight: 'bold',
                                    marginBottom: '15px',
                                    borderBottom: '2px solid rgba(0, 255, 136, 0.3)',
                                    paddingBottom: '5px'
                                }}>
                                    Additional Information
                                </h2>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '15px',
                                    backgroundColor: 'rgba(0, 20, 40, 0.4)',
                                    padding: '15px',
                                    borderRadius: '5px',
                                    border: '1px solid rgba(0, 255, 136, 0.2)',
                                }}>
                                    <div>
                                        <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                            Faction ID
                                        </div>
                                        <div style={{ color: '#e0f0ff', fontSize: '14px', fontFamily: 'monospace' }}>
                                            {faction.id}
                                        </div>
                                    </div>
                                    {representative && (
                                        <div>
                                            <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                                Representative
                                            </div>
                                            <div style={{ color: '#e0f0ff', fontSize: '14px' }}>
                                                {representative.name}
                                            </div>
                                        </div>
                                    )}
                                    {faction.fullPath && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: 'rgba(0, 255, 136, 0.7)', fontSize: '12px', marginBottom: '4px' }}>
                                                Source Path
                                            </div>
                                            <div style={{ 
                                                color: '#e0f0ff', 
                                                fontSize: '12px', 
                                                fontFamily: 'monospace',
                                                wordBreak: 'break-all'
                                            }}>
                                                {faction.fullPath}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                        </div>
                    </GlassPanel>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
