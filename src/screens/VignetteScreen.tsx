/*
 * This screen displays Visual Novel vignette scenes, displaying dialogue and characters as they interact with the player and each other.
 * Extends ScreenBase.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { BaseScreen } from './BaseScreen';
import { Module } from '../Module';
import Actor from '../Actor';
import { Stage } from '../Stage';
import StationScreen from './StationScreen';

interface VignetteScreenProps {
    stage: Stage;
    module: Module;
    intent: string; // Intent or context for the vignette
}

interface VignetteScreenState {
    index: number; // current script index
    inputText: string;
}

// Hard-coded script for now
const SCRIPT: string[] = [
    "You arrive at the dimly lit module. The hum of the life support is the only sound.",
    "An occupant stands in the doorway, face unreadable. They watch you without moving.",
    "A silence stretches — then a question that feels heavier than it should.",
    "The moment feels like a hinge; whatever you say next may change everything."
];

export default class VignetteScreen extends BaseScreen {
    state: VignetteScreenState = {
        index: 0,
        inputText: '',
    };
    props: VignetteScreenProps;

    // Props that a Vignette should accept (module for background, actors present, and an intent string)
    constructor(props: VignetteScreenProps) {
        super(props as any);
        this.props = props;
    }

    next = () => {
        if (this.state.index >= SCRIPT.length - 1) {
            this.stage.setScreen(StationScreen);
            return;
        }
        this.setState((prevState: VignetteScreenState) => ({ index: Math.min(prevState.index + 1, SCRIPT.length - 1) }));
    };

    prev = () => {
        this.setState((prevState: VignetteScreenState) => ({ index: Math.max(prevState.index - 1, 0) }));
    };

    renderActors(module: Module | null, actors: Actor[]) {
        // Display actors centered across the scene bottom. Use neutral emotion image where possible
        const visibleActors = actors || [];
        return visibleActors.map((actor, i) => {
            const src = (actor as any)?.emotionPack?.neutral || (actor as any)?.avatarImageUrl || '';
            const percent = visibleActors.length > 1 ? (i / (visibleActors.length - 1)) : 0.5;
            const left = `${Math.round(percent * 80) + 10}%`; // 10%..90%
            return (
                <motion.img
                    key={actor.id}
                    src={src}
                    alt={actor.name}
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.08 }}
                    style={{
                        position: 'absolute',
                        bottom: '14vh',
                        left,
                        transform: 'translateX(-50%)',
                        maxHeight: '45vh',
                        maxWidth: '28vw',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                        borderRadius: 8,
                        objectFit: 'contain',
                    }}
                />
            );
        });
    }

    render() {
        // Pull actors from save if available
        const actors = Object.values(this.stage.getSave().actors).filter(actor => actor.locationId === this.props.module.id) || [];

        const { index, inputText } = this.state;

        const backgroundUrl = (this.props.module as any)?.attributes?.defaultImageUrl || '';

        const isFinal = index === SCRIPT.length - 1;

        return (
            <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
                {/* Background image (module) with slight blur */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundImage: `url(${backgroundUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'blur(6px) brightness(0.6) contrast(1.05)',
                    transform: 'scale(1.03)'
                }} />

                {/* A subtle overlay to tint the scene and provide readable contrast */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 60%)' }} />

                {/* Actors */}
                <div style={{ position: 'absolute', inset: 0 }}>
                    {this.renderActors(this.props.module, actors as Actor[])}
                </div>

                {/* Bottom text window */}
                <div style={{ position: 'absolute', left: '5%', right: '5%', bottom: '4%', background: 'rgba(10,20,30,0.9)', border: '2px solid rgba(0,255,136,0.12)', borderRadius: 12, padding: '18px', boxSizing: 'border-box', color: '#e8fff0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button onClick={this.prev} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#cfe', cursor: 'pointer' }} disabled={index === 0}>{'⟨'}</button>
                            <button onClick={this.next} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#cfe', cursor: 'pointer' }} disabled={index === SCRIPT.length - 1}>{'⟩'}</button>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.8 }}>{`${index + 1} / ${SCRIPT.length}`}</div>
                    </div>

                    <div style={{ marginTop: 12, minHeight: '3.5rem', fontSize: '1.05rem', lineHeight: 1.4 }}>{SCRIPT[index]}</div>

                    {/* Chat input shown (enabled) only when at final message */}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            value={inputText}
                            onChange={(e) => this.setState({ inputText: e.target.value })}
                            placeholder={isFinal ? 'Type your message...' : 'Advance to the final line to chat'}
                            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#dfffe6' }}
                            disabled={!isFinal}
                        />
                        <button
                            onClick={() => { /* We will handle the chat behavior later; for now just clear */ this.setState({ inputText: '' }); }}
                            disabled={!isFinal || inputText.trim().length === 0}
                            style={{ padding: '10px 14px', borderRadius: 8, background: isFinal ? 'linear-gradient(90deg,#00ff88,#00b38f)' : 'rgba(255,255,255,0.04)', border: 'none', color: '#00221a', cursor: isFinal ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                        >Send</button>
                    </div>
                </div>
            </div>
        );
    }
}
