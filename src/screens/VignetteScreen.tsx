/*
 * This screen displays Visual Novel vignette scenes, displaying dialogue and characters as they interact with the player and each other.
 * Extends ScreenBase.
 */
import React, { FC } from 'react';
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

export const VignetteScreen: FC<VignetteScreenProps> = ({ stage, vignette }) => {
    const [index, setIndex] = React.useState<number>(0);
    const [inputText, setInputText] = React.useState<string>('');
    const [sceneEnded, setSceneEnded] = React.useState<boolean>(false);

    // Props that a Vignette should accept (module for background, actors present, and an intent string)
    const currentVignette = vignette;

    const next = () => {
        setIndex(prevIndex => Math.min(prevIndex + 1, currentVignette.script.length - 1));
    };

    const prev = () => {
        setIndex(prevIndex => Math.max(prevIndex - 1, 0));
    };

    const renderActors = (module: Module | null, actors: Actor[], currentSpeaker?: string) => {
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

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            {/* Background image (module) with slight blur */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `url(${(stage.getSave().layout.getModuleById(currentVignette.moduleId || '')?.attributes?.defaultImageUrl || '')})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(6px) brightness(0.6) contrast(1.05)',
                transform: 'scale(1.03)'
            }} />

            {/* A subtle overlay to tint the scene and provide readable contrast */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 60%)' }} />

            {/* Actors */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
                {renderActors(stage.getSave().layout.getModuleById(currentVignette.moduleId || ''), Object.values(stage.getSave().actors).filter(actor => actor.locationId === (currentVignette.moduleId || '')) || [], currentVignette.script && currentVignette.script.length > 0 ? currentVignette.script[index]?.speaker : undefined)}
            </div>

            {/* Bottom text window */}
            <div style={{ position: 'absolute', left: '5%', right: '5%', bottom: '4%', background: 'rgba(10,20,30,0.9)', border: '2px solid rgba(0,255,136,0.12)', borderRadius: 12, padding: '18px', boxSizing: 'border-box', color: '#e8fff0', zIndex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={prev} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#cfe', cursor: 'pointer', fontSize: 16, borderRadius: 8 }} disabled={index === 0}>{'⟨'}</button>

                        {/* Move the X/Y indicator between the left/right arrows */}
                        <div style={{ minWidth: 72, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#bfffd0', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>{currentVignette.generating ? <LoadingEllipsis active={currentVignette.generating} /> : `${index + 1} / ${currentVignette.script.length}`}</div>

                        <button onClick={next} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#cfe', cursor: 'pointer', fontSize: 16, borderRadius: 8 }} disabled={index === currentVignette.script.length - 1}>{'⟩'}</button>

                        {/* Speaker name shown to the right of the navigation arrows when present and not NARRATOR */}
                        {(currentVignette.script && !currentVignette.generating && currentVignette.script.length > 0 && currentVignette.script[index]?.speaker && currentVignette.script[index]?.speaker.trim().toUpperCase() !== 'NARRATOR') ? (
                            <div style={{ marginLeft: 12, fontSize: 15, fontWeight: 800, color: '#eafff0', letterSpacing: '0.6px', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}>{currentVignette.script[index]?.speaker}</div>
                        ) : null}
                    </div>

                    {/* right side reserved for future controls; keep it visually quiet */}
                    <div style={{ fontSize: 12, opacity: 0.65, visibility: 'hidden' }}></div>
                </div>

                        <div style={{ marginTop: 14, minHeight: '4rem', fontSize: '1.18rem', lineHeight: 1.55, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', color: '#e9fff7' }}>
                    {!currentVignette.generating && currentVignette.script && currentVignette.script.length > 0 ? currentVignette.script[index].message : ''}
                </div>

                {/* Chat input shown (enabled) only when at final message */}
                <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (index === currentVignette.script.length - 1 && !sceneEnded) handleSubmit();
                                else if (sceneEnded) handleClose();
                            }
                        }}
                        placeholder={index === currentVignette.script.length - 1 ? (sceneEnded ? 'Scene concluded' : 'Type your course of action...') : (currentVignette.generating ? 'Generating...' : 'Advance to the final line...')}
                        style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))', color: '#eafff2', fontSize: 15 }}
                        disabled={!(index === currentVignette.script.length - 1) || !!sceneEnded}
                    />
                    <button
                        onClick={() => { if (sceneEnded) handleClose(); else handleSubmit(); }}
                        disabled={!(index === currentVignette.script.length - 1 || sceneEnded)}
                        style={{ padding: '10px 16px', borderRadius: 10, background: (index === currentVignette.script.length - 1 && !sceneEnded) ? 'linear-gradient(90deg,#00ff88,#00b38f)' : (sceneEnded ? 'linear-gradient(90deg,#ff8c66,#ff5a3b)' : 'rgba(255,255,255,0.04)'), border: 'none', color: '#00221a', cursor: (index === currentVignette.script.length - 1 || sceneEnded) ? 'pointer' : 'not-allowed', fontWeight: 800, fontSize: 15 }}
                    >{sceneEnded ? 'Close' : 'Send'}</button>
                </div>
            </div>
        </div>
    );
    
    // Handle submission of player's guidance (or blank submit to continue the scene autonomously)
    function handleSubmit() {
        stage.continueVignette(inputText);
    }

    function handleClose() {
        // When the scene is concluded, switch back to the Station screen
        try {
            // Output stat change for now:
            console.log('Vignette concluded with stat changes:', currentVignette.endProperties || {});
            stage.setScreen(StationScreen);
        } catch (err) {
            console.error('Failed to close vignette and return to StationScreen', err);
        }
    }
}

export default VignetteScreen;
