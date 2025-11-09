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
    vignetteContext: {
        type: VignetteType;
        moduleId: string;
        actorId?: string;
    };
}

interface VignetteScreenState {
    index: number; // current script index
    inputText: string;
    script: string[];
    loading: boolean;
}

// Script will be generated when the vignette opens and stored in component state.

// Need a little enum for Vignette types: 
enum VignetteType {
    INTRO_CHARACTER = 'INTRO CHARACTER', // Introducing a new de-cryoed character
    VISIT_CHARACTER = 'VISIT CHARACTER', // Visiting a character in their quarters
    RANDOM_ENCOUNTER = 'RANDOM ENCOUNTER' // A chance meeting with a character in another un-owned module
}

export default class VignetteScreen extends BaseScreen {
    state: VignetteScreenState = {
        index: 0,
        inputText: '',
        script: [],
        loading: true,
    };
    props: VignetteScreenProps;

    // Props that a Vignette should accept (module for background, actors present, and an intent string)
    constructor(props: VignetteScreenProps) {
        super(props as any);
        this.props = props;
    }

    async componentDidMount() {
        // Generate the vignette script when the screen opens. Use the provided vignetteContext.
        try {
            if (this.state.script.length == 0) {
                const ctx = this.props.vignetteContext || { type: VignetteType.INTRO_CHARACTER };
                console.log('Generating vignette script for context:', ctx);
                const script = await this.generateVignetteScript(ctx.type, ctx, false);
                console.log('Generated vignette script:', script);
                this.setState({ script: (script && script.length > 0) ? script : ["(No script could be generated.)"], index: 0, loading: false });
            }
        } catch (err) {
            console.error('Failed to generate vignette script on mount', err);
            this.setState({ script: ["(Failed to generate script.)"], loading: false });
        }
    }

    // Need a function for generating Vignette script prompts based on type and context. Shared history and character details will be provided via the stage; this function just needs to
    // supply some direction for what might happen in this segment of the script. The continuing flag indicates whether this prompt is extending an existing scene, which may alter the verbiage of this prompt.
    generateVignettePrompt(type: VignetteType, context: any, continuing: boolean): string {
        const actor = this.stage.getSave().actors[context.actorId || ''];
        const module = this.stage.getSave().layout.getModuleById(context.moduleId || '');
        switch (type) {
            case VignetteType.INTRO_CHARACTER:
                return !continuing ? 
                    `This scene will introduce a new character, fresh from their echo chamber: ${actor.name}. Establish their personality and possibly some motivations.` :
                    `Continue the introduction of ${actor.name}, expanding on their personality or motivations.`;
            case VignetteType.VISIT_CHARACTER:
                return !continuing ?
                    `This scene depicts the player's visit with ${actor.name} in ${actor.name}'s quarters. Potentially explore ${actor.name}'s thoughts, feelings, or troubles in this intimate setting.` :
                    `Continue this scene with ${actor.name}, potentially exploring their thoughts, feelings, or troubles in this intimate setting.`;
            case VignetteType.RANDOM_ENCOUNTER:
                return !continuing ?
                    `This scene depicts a chance encounter with ${actor.name} in the ${module?.type || 'unknown'} module. Explore the setting and what might arise from this unexpected meeting.` :
                    `Continue this chance encounter with ${actor.name} in the ${module?.type || 'unknown'} module, exploring what might arise from this unexpected meeting.`;
            default:
                return '';
        }
    }

    async generateVignetteScript(type: VignetteType, context: any, continuing: boolean) {
        const fullPrompt = `Premise:\nThis is a sci-fi visual novel game set on a space station that resurrects and rehabilitates patients who died in the multiverse-wide apocalypse. ` +
            `The thrust of the game has the player, ${this.stage.getSave().player.name}, managing this station and interacting with various patients and crew, as they navigate this complex future scenario.` +
            `{{messages}}` +
            `\n\nScene Prompt:\n${this.generateVignettePrompt(type, context, continuing)}` +
            `\n\nInstruction:\nGenerate a short script based upon this scenario and scene prompt. Use the formatting guide below.` +
            `\n\nResponse Format:\nCHARACTER NAME: Action in pose. "Dialogue in quotation marks."\nANOTHER CHARACTER NAME: "Dialogue in quotation marks."\nNARRATOR: Descriptive content that is not attributed to a character.`; 

        // Retry logic if response is null or response.result is empty
        let retries = 3;
        while (retries > 0) {
            try {
                const response = await this.stage.generator.textGen({
                    prompt: fullPrompt,
                    min_tokens: 100,
                    max_tokens: 500,
                    include_history: true
                });
                if (response && response.result && response.result.trim().length > 0) {
                    // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                    const lines = response.result.split('\n');
                    const script: string[] = [];
                    let currentLine = '';
                    for (const line of lines) {
                        if (line.includes(':')) {
                            // New line
                            if (currentLine) {
                                script.push(currentLine.trim());
                            }
                            currentLine = line;
                        } else {
                            // Continuation of previous line
                            currentLine += '\n' + line;
                        } 
                    }
                    if (currentLine) {
                        script.push(currentLine.trim());
                    }
                    return script;
                }
            } catch (error) {
                console.error('Error generating vignette script:', error);
            }
            retries--;
        }
        return [];
    }

    next = () => {
        this.setState((prevState: VignetteScreenState) => ({ index: Math.min(prevState.index + 1, prevState.script.length - 1) }));
    };

    prev = () => {
        this.setState((prevState: VignetteScreenState) => ({ index: Math.max(prevState.index - 1, 0) }));
    };

    renderActors(module: Module | null, actors: Actor[]) {
        // Display actors centered across the scene bottom. Use neutral emotion image where possible
        const visibleActors = actors || [];
        return visibleActors.map((actor, i) => {
            const src = actor.emotionPack?.neutral || actor.avatarImageUrl || '';
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
                        bottom: 0,
                        left,
                        transform: 'translateX(-50%)',
                        maxHeight: '70vh',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        borderRadius: 8,
                        objectFit: 'contain',
                    }}
                />
            );
        });
    }

    render() {
        // Pull actors from save if available
        const actors = Object.values(this.stage.getSave().actors).filter(actor => actor.locationId === this.props.vignetteContext.moduleId) || [];

        const { index, inputText, script, loading } = this.state;

        const module = this.stage.getSave().layout.getModuleById(this.props.vignetteContext.moduleId || '');

        const backgroundUrl = (module?.attributes?.defaultImageUrl || '');

        const isFinal = !loading && index === script.length - 1;

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
                    {this.renderActors(module, actors as Actor[])}
                </div>

                {/* Bottom text window */}
                <div style={{ position: 'absolute', left: '5%', right: '5%', bottom: '4%', background: 'rgba(10,20,30,0.9)', border: '2px solid rgba(0,255,136,0.12)', borderRadius: 12, padding: '18px', boxSizing: 'border-box', color: '#e8fff0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <button onClick={this.prev} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#cfe', cursor: 'pointer' }} disabled={index === 0}>{'⟨'}</button>
                            <button onClick={this.next} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#cfe', cursor: 'pointer' }} disabled={index === this.state.script.length - 1}>{'⟩'}</button>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.8 }}>{loading ? 'Loading...' : `${index + 1} / ${script.length}`}</div>
                    </div>

                    <div style={{ marginTop: 12, minHeight: '3.5rem', fontSize: '1.05rem', lineHeight: 1.4 }}>
                        {loading ? '(Generating scene...)' : (script[index] || '')}
                    </div>

                    {/* Chat input shown (enabled) only when at final message */}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            value={inputText}
                            onChange={(e) => this.setState({ inputText: e.target.value })}
                            placeholder={isFinal ? 'Type your course of action...' : (loading ? 'Generating...' : 'Advance to the final line to chat')}
                            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', color: '#dfffe6' }}
                            disabled={!isFinal}
                        />
                        <button
                            onClick={() => {
                                this.setState({ inputText: '' });
                                // For now, just go back to the station screen.
                                this.stage.setScreen(StationScreen);
                                return;
                            }}
                            disabled={!isFinal || inputText.trim().length === 0}
                            style={{ padding: '10px 14px', borderRadius: 8, background: isFinal ? 'linear-gradient(90deg,#00ff88,#00b38f)' : 'rgba(255,255,255,0.04)', border: 'none', color: '#00221a', cursor: isFinal ? 'pointer' : 'not-allowed', fontWeight: 700 }}
                        >Send</button>
                    </div>
                </div>
            </div>
        );
    }
}
