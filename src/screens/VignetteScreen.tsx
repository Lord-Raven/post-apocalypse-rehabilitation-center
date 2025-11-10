/*
 * This screen displays Visual Novel vignette scenes, displaying dialogue and characters as they interact with the player and each other.
 * Extends ScreenBase.
 */
import React from 'react';
import { BaseScreen } from './BaseScreen';
import { Module } from '../Module';
import Actor, { getStatDescription, namesMatch, Stat } from '../actors/Actor';
import { Stage } from '../Stage';
import StationScreen from './StationScreen';
import { VignetteType, VignetteData } from '../Vignette';
import ActorImage from '../actors/ActorImage';
import { Emotion } from '../Emotion';

// Small component that animates an ellipsis without forcing the parent
// component to update on every tick. This prevents the parent class's
// frequent loading-dot updates from triggering re-renders that can reset
// other animations in the scene.
const LoadingEllipsis: React.FC<{ active?: boolean }> = ({ active }) => {
    const [dots, setDots] = React.useState<number>(1);
    React.useEffect(() => {
        if (!active) {
            setDots(1);
            return;
        }
        const t = window.setInterval(() => setDots(d => ((d + 1) % 3) + 1), 400);
        return () => clearInterval(t);
    }, [active]);
    return <span>{' ' + '.'.repeat(dots) + ' '}</span>;
};

interface VignetteScreenProps {
    stage: Stage;
    vignette: VignetteData;
}

interface VignetteScreenState {
    index: number; // current script index
    inputText: string;
    sceneEnded?: boolean;
}

export default class VignetteScreen extends BaseScreen {
    state: VignetteScreenState = {
        index: 0,
        inputText: '',
        sceneEnded: false,
    };
    props: VignetteScreenProps;

    vignette: VignetteData;

    // Props that a Vignette should accept (module for background, actors present, and an intent string)
    constructor(props: VignetteScreenProps) {
        super(props as any);
        this.props = props;
        this.vignette = props.vignette;
    }

    next = () => {
        this.setState((prevState: VignetteScreenState) => ({ index: Math.min(prevState.index + 1, this.vignette.script.length - 1) }));
    };

    prev = () => {
        this.setState((prevState: VignetteScreenState) => ({ index: Math.max(prevState.index - 1, 0) }));
    };

    renderActors(module: Module | null, actors: Actor[], currentSpeaker?: string) {
        // Display actors centered across the scene bottom. Use neutral emotion image where possible
        return actors.map((actor, i) => {
            const imageUrl = actor.emotionPack?.neutral || actor.avatarImageUrl || '';
            const increment = actors.length > 1 ? (i / (actors.length - 1)) : 0.5;
            const xPosition = Math.round(increment * 80) + 10;
            // Determine if this actor should be rendered as speaking. Compare names case-insensitively.
            // Need some sort of 'close enough' name comparison because there can be significant variations (like only showing a first name or nickname).

            const isSpeaking = !!currentSpeaker && !!actor.name && namesMatch(actor.name.trim().toLowerCase(), currentSpeaker.trim().toLowerCase());
            return (
                <ActorImage
                    key={actor.id}
                    actor={actor}
                    emotion={Emotion.neutral}
                    imageUrl={imageUrl}
                    xPosition={xPosition}
                    yPosition={0}
                    zIndex={1}
                    speaker={isSpeaking}
                    highlightColor="rgba(255,255,255,0)"
                    panX={0}
                    panY={0}
                />
            );
        });
    }

    render() {
        // Pull actors from save if available
        const actors = Object.values(this.stage.getSave().actors).filter(actor => actor.locationId === (this.vignette.moduleId || '')) || [];

        const { index, inputText, sceneEnded } = this.state;

        const module = this.stage.getSave().layout.getModuleById(this.vignette.moduleId || '');

        const backgroundUrl = (module?.attributes?.defaultImageUrl || '');

        const loading = this.vignette.generating;
        const currentEntry = (!loading && this.vignette.script && this.vignette.script.length > 0) ? this.vignette.script[index] : undefined;
        const currentSpeaker = currentEntry ? currentEntry.speaker : undefined;
        const isFinal = !loading && index === this.vignette.script.length - 1;

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
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                    {this.renderActors(module, actors as Actor[], currentSpeaker)}
                </div>

                {/* Bottom text window */}
                <div style={{ position: 'absolute', left: '5%', right: '5%', bottom: '4%', background: 'rgba(10,20,30,0.9)', border: '2px solid rgba(0,255,136,0.12)', borderRadius: 12, padding: '18px', boxSizing: 'border-box', color: '#e8fff0', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button onClick={this.prev} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#cfe', cursor: 'pointer', fontSize: 16, borderRadius: 8 }} disabled={index === 0}>{'⟨'}</button>

                            {/* Move the X/Y indicator between the left/right arrows */}
                            <div style={{ minWidth: 72, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#bfffd0', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>{loading ? <LoadingEllipsis active={loading} /> : `${index + 1} / ${this.vignette.script.length}`}</div>

                            <button onClick={this.next} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#cfe', cursor: 'pointer', fontSize: 16, borderRadius: 8 }} disabled={index === this.vignette.script.length - 1}>{'⟩'}</button>

                            {/* Speaker name shown to the right of the navigation arrows when present and not NARRATOR */}
                            {(!this.vignette.generating && currentSpeaker && currentSpeaker.trim().toUpperCase() !== 'NARRATOR') ? (
                                <div style={{ marginLeft: 12, fontSize: 15, fontWeight: 800, color: '#eafff0', letterSpacing: '0.6px', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}>{currentSpeaker}</div>
                            ) : null}
                        </div>

                        {/* right side reserved for future controls; keep it visually quiet */}
                        <div style={{ fontSize: 12, opacity: 0.65, visibility: 'hidden' }}></div>
                    </div>

                            <div style={{ marginTop: 14, minHeight: '4rem', fontSize: '1.18rem', lineHeight: 1.55, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', color: '#e9fff7' }}>
                        {!this.vignette.generating && currentEntry ? currentEntry.message : ''}
                    </div>

                    {/* Chat input shown (enabled) only when at final message */}
                    <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input
                            value={inputText}
                            onChange={(e) => this.setState({ inputText: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (isFinal && !sceneEnded) this.handleSubmit();
                                    else if (sceneEnded) this.handleClose();
                                }
                            }}
                            placeholder={isFinal ? (sceneEnded ? 'Scene concluded' : 'Type your course of action...') : (loading ? 'Generating...' : 'Advance to the final line...')}
                            style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', color: '#eafff2', fontSize: 15 }}
                            disabled={!isFinal || !!sceneEnded}
                        />
                        <button
                            onClick={() => { if (sceneEnded) this.handleClose(); else this.handleSubmit(); }}
                            disabled={(!isFinal && !sceneEnded)}
                            style={{ padding: '10px 16px', borderRadius: 10, background: (isFinal && !sceneEnded) ? 'linear-gradient(90deg,#00ff88,#00b38f)' : (sceneEnded ? 'linear-gradient(90deg,#ff8c66,#ff5a3b)' : 'rgba(255,255,255,0.04)'), border: 'none', color: '#00221a', cursor: (isFinal || sceneEnded) ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 15 }}
                        >{sceneEnded ? 'Close' : 'Send'}</button>
                    </div>
                </div>
            </div>
        );
    }

    // Handle submission of player's guidance (or blank submit to continue the scene autonomously)
    handleSubmit = () => {this.stage.continueVignette(this.state.inputText)}

    handleClose = () => {
        // When the scene is concluded, switch back to the Station screen
        try {
            // Output stat change for now:
            console.log('Vignette concluded with stat changes:', this.vignette.endProperties || {});
            this.stage.setScreen(StationScreen);
        } catch (err) {
            console.error('Failed to close vignette and return to StationScreen', err);
        }
    }
}
