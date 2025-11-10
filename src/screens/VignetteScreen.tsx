/*
 * This screen displays Visual Novel vignette scenes, displaying dialogue and characters as they interact with the player and each other.
 * Extends ScreenBase.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { BaseScreen } from './BaseScreen';
import { Module } from '../Module';
import Actor, { getStatDescription, namesMatch, Stat } from '../actors/Actor';
import { Stage } from '../Stage';
import StationScreen from './StationScreen';
import ActorImage from '../actors/ActorImage';
import { Emotion } from '../Emotion';

// Cache generated scripts by a composite key so we don't re-run generation when the
// component is remounted or updated repeatedly. Key format: `${type}:${moduleId}:${actorId}`
// ScriptEntry stores the speaker name and the message body separately.
interface ScriptEntry {
    speaker: string;
    message: string;
}
const vignetteScriptCache: Map<string, ScriptEntry[]> = new Map();

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
    script: ScriptEntry[];
    loading: boolean;
    loadingDots: number;
    sceneEnded?: boolean;
    // Mapping of actorId -> { statName: delta }
    endProperties?: { [actorId: string]: { [stat: string]: number } };
}

// Script will be generated when the vignette opens and stored in component state.

// Need a little enum for Vignette types: 
enum VignetteType {
    INTRO_CHARACTER = 'INTRO CHARACTER', // Introducing a new candidate fresh from the echo chamber
    VISIT_CHARACTER = 'VISIT CHARACTER', // Visiting a character in their quarters
    RANDOM_ENCOUNTER = 'RANDOM ENCOUNTER' // A chance meeting with a character in another un-owned module
}

export default class VignetteScreen extends BaseScreen {
    state: VignetteScreenState = {
        index: 0,
        inputText: '',
        script: [],
        loading: true,
        loadingDots: 0,
        sceneEnded: false,
        endProperties: {},
    };
    props: VignetteScreenProps;

    // Props that a Vignette should accept (module for background, actors present, and an intent string)
    constructor(props: VignetteScreenProps) {
        super(props as any);
        this.props = props;
    }

    async componentDidMount() {
        // Kick off generation in a guarded way (ensureGeneration handles caching
        // and prevents loops if the component is remounted frequently).
        this.ensureGeneration();
    }

    componentDidUpdate(prevProps: VignetteScreenProps) {
        // If the vignette context changed, generate a new script for the new context.
        const prev = prevProps.vignetteContext || {} as any;
        const cur = this.props.vignetteContext || {} as any;
        if (prev.type !== cur.type || prev.moduleId !== cur.moduleId || prev.actorId !== cur.actorId) {
            this.ensureGeneration();
        }
    }

    componentWillUnmount() {
        // cleanup interval if present
        if ((this as any)._ellipsisTimer) {
            clearInterval((this as any)._ellipsisTimer);
            (this as any)._ellipsisTimer = undefined;
        }
    }

    // Build a stable cache key for a given vignette context
    private getContextKey(context: any, type?: VignetteType) {
        const t = type || (context && context.type) || VignetteType.INTRO_CHARACTER;
        const moduleId = (context && context.moduleId) || '';
        const actorId = (context && context.actorId) || '';
        return `${t}:${moduleId}:${actorId}`;
    }

    // Ensure generation runs once per context; uses module-level cache to survive remounts.
    private async ensureGeneration() {
        const ctx = this.props.vignetteContext || { type: VignetteType.INTRO_CHARACTER };
        const key = this.getContextKey(ctx, ctx.type);

        // If we already have a cached script for this context, use it and skip generation.
        if (vignetteScriptCache.has(key)) {
            const cached = vignetteScriptCache.get(key) || [{ speaker: 'NARRATOR', message: '(No script available.)' }];
            this.setState({ script: cached, index: 0, loading: false });
            return;
        }

        // If we're already loading for this instance, don't start another generation.
        if (this.state.loading && this.state.script.length > 0) return;

        // Start the ellipsis animation
        this.startEllipsis();
        this.setState({ loading: true });

        try {
            console.log('Generating vignette script for context:', ctx);
            const resp = await this.generateVignetteScript(ctx.type, ctx, false);
            const finalEntries = (resp && resp.entries && resp.entries.length > 0) ? resp.entries : [{ speaker: 'NARRATOR', message: '(No script could be generated.)' }];
            // cache for future mounts
            vignetteScriptCache.set(key, finalEntries);
            this.setState({ script: finalEntries, index: 0, loading: false, sceneEnded: !!resp.endScene, endProperties: resp.statChanges || {} });
        } catch (err) {
            console.error('Failed to generate vignette script', err);
            const fallback: ScriptEntry[] = [{ speaker: 'NARRATOR', message: '(Failed to generate script.)' }];
            vignetteScriptCache.set(key, fallback);
            this.setState({ script: fallback, loading: false, sceneEnded: false, endProperties: {} });
        } finally {
            this.stopEllipsis();
        }
    }

    private startEllipsis() {
        // If timer already exists, don't start another
        if ((this as any)._ellipsisTimer) return;
        (this as any)._ellipsisTimer = setInterval(() => {
            this.setState((s: VignetteScreenState) => ({ loadingDots: (s.loadingDots + 1) % 4 }));
        }, 400) as unknown as number;
    }

    private stopEllipsis() {
        if ((this as any)._ellipsisTimer) {
            clearInterval((this as any)._ellipsisTimer);
            (this as any)._ellipsisTimer = undefined;
            this.setState({ loadingDots: 0 });
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
                    `This scene will introduce a new character, ${actor.name}, fresh from their echo chamber. ${actor.name} will have no knowledge of this universe. Establish their personality and possibly some motivations.` :
                    `Continue the introduction of ${actor.name}, expanding on their personality or motivations.`;
            case VignetteType.VISIT_CHARACTER:
                return !continuing ?
                    `This scene depicts the player's visit with ${actor.name} in ${actor.name}'s quarters. Bear in mind that ${actor.name} is from another universe, and may be unaware of details of this one. ` +
                        `Potentially explore ${actor.name}'s thoughts, feelings, or troubles in this intimate setting.` :
                    `Continue this scene with ${actor.name}, potentially exploring their thoughts, feelings, or troubles in this intimate setting.`;
            case VignetteType.RANDOM_ENCOUNTER:
                return !continuing ?
                    `This scene depicts a chance encounter with ${actor.name} in the ${module?.type || 'unknown'} module. Bear in mind that ${actor.name} is from another universe, and may be unaware of details of this one. ` +
                        `Explore the setting and what might arise from this unexpected meeting.` :
                    `Continue this chance encounter with ${actor.name} in the ${module?.type || 'unknown'} module, exploring what might arise from this unexpected meeting.`;
            default:
                return '';
        }
    }

    async generateVignetteScript(type: VignetteType, context: any, continuing: boolean, userAction?: string): Promise<{ entries: ScriptEntry[]; endScene: boolean; statChanges: { [actorId: string]: { [stat: string]: number } } }> {
        // Build a scene log when continuing so the generator can see prior script entries
        const scriptLog = (continuing && this.state && this.state.script && this.state.script.length > 0)
            ? this.state.script.map(e => `${e.speaker}: ${e.message}`).join('\n')
            : '(None so far)';

        const targetActor = this.stage.getSave().actors[context.actorId || ''];

        let fullPrompt = `{{messages}}\nPremise:\nThis is a sci-fi visual novel game set on a space station that resurrects and rehabilitates patients who died in the multiverse-wide apocalypse: ` +
            `the Post-Apocalyptic Rehabilitation Center. ` +
            `The thrust of the game has the player character, ${this.stage.getSave().player.name}, managing this station and interacting with patients and crew, as they navigate this complex futuristic universe together. ` +
            `\n\nCrew:\nAt this point in the story, the player is running the operation on their own, with no fellow crew members. ` +
            // List patients who are here, along with full stat details:
            `\n\nPresent Characters:\n${Object.values(this.stage.getSave().actors).map(actor => 
                `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Stats:\n    ${Object.entries(actor.stats).map(([stat, value]) => `${stat}: ${value}`).join('\n    ')}`).join('\n')}` +
            // List non-present patients for reference; just need description and profile:
            `\n\nOther Patients:\n${Object.values(this.stage.getSave().actors).map(actor => `${actor.name}\n  ${actor.description}\n  ${actor.profile}`).join('\n')}` +
            // List stat meanings, for reference:
            `\n\nStats:\n${Object.values(Stat).map(stat => {getStatDescription(stat)}).join('\n')}` +
            `\n\nScene Prompt:\n${this.generateVignettePrompt(type, context, continuing)}` +
            `\n\nExample Script Format:\n` +
            'System: CHARACTER NAME: Action in pose. "Dialogue in quotation marks."\nANOTHER CHARACTER NAME: "Dialogue in quotation marks."\nNARRATOR: Descriptive content that is not attributed to a character.' +
            `\n[END]` +
            `\n[CHARACTER NAME: STAT + 1]` +
            `\n[END SCENE]` +
            `\n\nScript Log:\n${scriptLog}` +
            `\n\nInstruction:\nAt the "System:" prompt, generate a short scene script based upon this scenario, and the specified Scene Prompt. Follow the structure of the strict Example Script Format above. ` +
            `This segment of the scene can be concluded with [END], when it makes sense to give ${this.stage.getSave().player.name} a chance to respond, ` +
            `or, if the scene feels satisfactorily complete, the entire scene can be concluded with [END SCENE]. ` +
            `Before an [END] tag, a [CHARACTER NAME - STAT + x] tag can be used to apply a stat change to the specified Present Character. These changes should reflect an outcome of the scene; ` +
            `they should be small, typically (but not exclusively) positive, and applied sparingly (generally just before [END SCENE]).`;
        // If the player supplied a guiding action, add it as a non-script guidance block so the generator can steer the continuation.
        if (userAction !== undefined) {
            fullPrompt += `\n\nPlayer Guidance:\n${userAction && userAction.trim().length > 0 ? `The player directs the characters to: ${userAction.trim()}` : 'The player did not provide specific guidance; continue the scene as if the player acted on their own.'}`;
        }
        // Retry logic if response is null or response.result is empty
        let retries = 3;
        while (retries > 0) {
            try {
                const response = await this.stage.generator.textGen({
                    prompt: fullPrompt,
                    min_tokens: 100,
                    max_tokens: 600,
                    include_history: true,
                    stop: ['[END]', '[END SCENE]'] // Only _closed_ END tags are stopping strings; we want the generator to finish, if it determines to include stat changes.
                });
                if (response && response.result && response.result.trim().length > 0) {
                    // First, detect and parse any END tags and stat changes that may be embedded in the response.
                    let text = response.result;
                    let endScene = false;
                    // Map actorId -> { statName: delta }
                    const statChanges: { [actorId: string]: { [stat: string]: number } } = {};

                    // Detect [END SCENE: ...] (with optional stat list) or [END SCENE]
                    // Detect [END SCENE] or [END] to determine whether the scene ends here
                    const endSceneRegex = /\[END SCENE\]/i;
                    const endMatchRegex = /\[END\]/i;
                    if (endSceneRegex.test(text)) {
                        endScene = true;
                    }
                    // Remove END tags from the visible text
                    text = text.replace(/\[END SCENE(?:[^\]]*)\]/ig, '').replace(/\[END\]/ig, '');

                    // Now detect separate stat-change tags of the form:
                    // [Character Name: Stat +1 | AnotherStat -1]
                    // or [Character Name - Stat +1]
                    // We'll look for any bracketed tag and attempt to parse it as a stat-change if the left side matches a present character.
                    const bracketTagRegex = /\[([^\]]+)\]/g;
                    let tagMatch: RegExpExecArray | null;
                    // Prepare list of present actors (based on module/location)
                    const presentActors: Actor[] = Object.values(this.stage.getSave().actors).filter(a => a.locationId === (context.moduleId || ''));
                    while ((tagMatch = bracketTagRegex.exec(response.result || text || '')) !== null) {
                        const raw = tagMatch[1].trim();
                        if (!raw) continue;
                        const up = raw.toUpperCase();
                        if (up === 'END' || up.startsWith('END SCENE')) continue;

                        // Attempt to split into "name" and "stat payload" by first ':' or '-' delimiter
                        const split = raw.split(/[:\-]/);
                        if (split.length < 2) continue; // not in expected form
                        const candidateName = split[0].trim();
                        const payload = raw.substring(raw.indexOf(split[1])).trim();

                        // Find matching present actor using namesMatch
                        const matched = presentActors.find(a => namesMatch(a.name.toLowerCase(), candidateName.toLowerCase()));
                        if (!matched) continue;

                        // payload may contain multiple stat adjustments separated by '|' or ','
                        const adjustments = payload.split('|').flatMap(p => p.split(',')).map(p => p.trim()).filter(Boolean);
                        for (const adj of adjustments) {
                            // Capture stat name and signed number e.g. "Trust + 2"
                            const m = adj.match(/([A-Za-z\s]+)\s*([+-]\s*\d+)/i);
                            if (!m) continue;
                            const statNameRaw = m[1].trim();
                            const num = parseInt(m[2].replace(/\s+/g, ''), 10) || 0;

                            // Normalize stat name to possible Stat enum value if possible
                            let statKey = statNameRaw.toLowerCase().trim();
                            const enumMatch = Object.values(Stat).find(s => s.toLowerCase() === statKey || s.toLowerCase().includes(statKey) || statKey.includes(s.toLowerCase()));
                            if (enumMatch) statKey = enumMatch;

                            if (!statChanges[matched.id]) statChanges[matched.id] = {};
                            statChanges[matched.id][statKey] = (statChanges[matched.id][statKey] || 0) + num;
                        }
                        // Remove this tag from visible text
                        text = text.replace(tagMatch[0], '');
                    }

                    // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                    const lines = text.split('\n');
                    const combinedLines: string[] = [];
                    let currentLine = '';
                    for (const line of lines) {
                        // Skip any explicit END tags that might have survived splitting
                        const trimmed = line.trim();
                        if (!trimmed || /^\[END( SCENE)?/.test(trimmed)) continue;

                        if (line.includes(':')) {
                            // New line
                            if (currentLine) {
                                combinedLines.push(currentLine.trim());
                            }
                            currentLine = line;
                        } else {
                            // Continuation of previous line
                            currentLine += '\n' + line;
                        }
                    }
                    if (currentLine) {
                        combinedLines.push(currentLine.trim());
                    }

                    // Convert combined lines into ScriptEntry objects by splitting at first ':'
                    const scriptEntries: ScriptEntry[] = combinedLines.map(l => {
                        const idx = l.indexOf(':');
                        if (idx === -1) return { speaker: 'NARRATOR', message: l };
                        const sp = l.slice(0, idx).trim();
                        const msg = l.slice(idx + 1).trim();
                        return { speaker: sp, message: msg };
                    });
                    return { entries: scriptEntries, endScene: endScene, statChanges: statChanges };
                }
            } catch (error) {
                console.error('Error generating vignette script:', error);
            }
            retries--;
        }
        return { entries: [], endScene: false, statChanges: {} };
    }

    next = () => {
        this.setState((prevState: VignetteScreenState) => ({ index: Math.min(prevState.index + 1, prevState.script.length - 1) }));
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
        const actors = Object.values(this.stage.getSave().actors).filter(actor => actor.locationId === this.props.vignetteContext.moduleId) || [];

    const { index, inputText, script, loading, sceneEnded } = this.state;

        const module = this.stage.getSave().layout.getModuleById(this.props.vignetteContext.moduleId || '');

        const backgroundUrl = (module?.attributes?.defaultImageUrl || '');

    const isFinal = !loading && index === script.length - 1;
    const currentEntry = (!loading && script && script.length > 0) ? script[index] : undefined;
    const currentSpeaker = currentEntry ? currentEntry.speaker : undefined;

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
                            <div style={{ minWidth: 72, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#bfffd0', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>{loading ? <span>{'.'.repeat(this.state.loadingDots)}</span> : `${index + 1} / ${script.length}`}</div>

                            <button onClick={this.next} style={{ padding: '10px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#cfe', cursor: 'pointer', fontSize: 16, borderRadius: 8 }} disabled={index === this.state.script.length - 1}>{'⟩'}</button>

                            {/* Speaker name shown to the right of the navigation arrows when present and not NARRATOR */}
                            {(!loading && currentSpeaker && currentSpeaker.trim().toUpperCase() !== 'NARRATOR') ? (
                                <div style={{ marginLeft: 12, fontSize: 15, fontWeight: 800, color: '#eafff0', letterSpacing: '0.6px', textShadow: '0 1px 0 rgba(0,0,0,0.6)' }}>{currentSpeaker}</div>
                            ) : null}
                        </div>

                        {/* right side reserved for future controls; keep it visually quiet */}
                        <div style={{ fontSize: 12, opacity: 0.65, visibility: 'hidden' }}></div>
                    </div>

                            <div style={{ marginTop: 14, minHeight: '4rem', fontSize: '1.18rem', lineHeight: 1.55, fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', color: '#e9fff7' }}>
                        {!loading  && currentEntry ? currentEntry.message : ''}
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
    handleSubmit = async () => {
        const { index, script, inputText, loading } = this.state;
        if (loading) return; // avoid duplicate submissions

        const ctx = this.props.vignetteContext || { type: VignetteType.INTRO_CHARACTER } as any;
        const isFinal = index === script.length - 1;
        if (!isFinal) return; // only allow submission at final line

        const userAction = (inputText || '').trim();

        this.startEllipsis();
        this.setState({ loading: true });

        try {
            const resp = await this.generateVignetteScript(ctx.type, ctx, true, userAction);
            if (resp && resp.entries && resp.entries.length > 0) {
                const updated = [...(this.state.script || []), ...resp.entries];
                const key = this.getContextKey(ctx, ctx.type);
                vignetteScriptCache.set(key, updated);
                // move to the next line so the user sees the continuation immediately
                const nextIndex = Math.min(this.state.index + 1, updated.length - 1);
                this.setState({ script: updated, index: nextIndex, inputText: '', loading: false, sceneEnded: !!resp.endScene, endProperties: resp.statChanges || {} });
            } else {
                // nothing new generated; just clear input and stop loading
                this.setState({ inputText: '', loading: false });
            }
        } catch (err) {
            console.error('Failed to continue vignette script', err);
            this.setState({ loading: false });
        } finally {
            this.stopEllipsis();
        }
    }

    handleClose = () => {
        // When the scene is concluded, switch back to the Station screen
        try {
            // Output stat change for now:
            console.log('Vignette concluded with stat changes:', this.state.endProperties || {});
            this.stage.setScreen(StationScreen);
        } catch (err) {
            console.error('Failed to close vignette and return to StationScreen', err);
        }
    }
}
