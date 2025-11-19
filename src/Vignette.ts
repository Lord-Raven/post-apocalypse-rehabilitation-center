import Actor, { getStatDescription, namesMatch, Stat } from "./actors/Actor";
import { Emotion, EMOTION_SYNONYMS } from "./Emotion";
import { Stage } from "./Stage";

export enum VignetteType {
    INTRO_CHARACTER = 'INTRO CHARACTER',
    VISIT_CHARACTER = 'VISIT CHARACTER',
    ROLE_ASSIGNMENT = 'ROLE ASSIGNMENT',
    NEW_MODULE = 'NEW MODULE',
    RANDOM_ENCOUNTER = 'RANDOM ENCOUNTER'
}

export interface ScriptEntry {
    speaker: string;
    message: string;
    actorEmotions?: {[key: string]: Emotion}; // actor name -> emotion string
}

export interface VignetteData {
    type: VignetteType;
    moduleId: string;
    actorId?: string;
    script: ScriptEntry[];
    generating?: boolean;
    context: any;
    endScene?: boolean;
    endProperties?: { [actorId: string]: { [stat: string]: number } };
}

export function generateVignettePrompt(vignette: VignetteData, stage: Stage, continuing: boolean): string {
    const actor = stage.getSave().actors[vignette.actorId || ''];
    const module = stage.getSave().layout.getModuleById(vignette.moduleId || '');
    switch (vignette.type) {
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
        case VignetteType.ROLE_ASSIGNMENT:
            return !continuing ?
                `This scene depicts an exchange between the player and ${actor.name}, following the player's decision to newly assign ${actor.name} to the role of ${vignette.context.role || 'something new'} in the ${module?.type || 'unknown'} module. ` +
                    `Bear in mind ${actor.name}'s personality, stats, and experience within this setting (or lack thereof) as you portray their reaction and to this new role. ` :
                `Continue this scene with ${actor.name}, potentially exploring their thoughts or feelings toward their new role.`;
        case VignetteType.NEW_MODULE:
            return !continuing ?
                `This scene depicts an exchange between the player and some of the patients regarding the opening of a new module, the ${module?.type || 'unknown'}. ` :
                `Continue this scene, exploring the crew's thoughts or feelings toward the new module, the ${module?.type || 'unknown'}.`;
        default:
            return '';
    }
}

export async function generateVignetteScript(vignette: VignetteData, stage: Stage): Promise<{ entries: ScriptEntry[]; endScene: boolean; statChanges: { [actorId: string]: { [stat: string]: number } } }> {
    // Build a scene log when continuing so the generator can see prior script entries
    // Insert [Character EXPRESSES Emotion] tags as needed
    const scriptLog = (vignette.generating && vignette.script && vignette.script.length > 0)
        ? vignette.script.map(e => `${e.speaker}: ${Object.keys(e.actorEmotions || {}).map(emotion => `[${e.speaker} EXPRESSES ${emotion.toUpperCase()}]`).join(' ')} ${e.message}`).join('\n')
        : '(None so far)';

    const playerName = stage.getSave().player.name;

    // There are two optional phrases for gently/more firmly prodding the model toward wrapping up the scene, and then we calculate one to show based on the vignette.script.length and some randomness:
    const wrapUpPhrases = [
        ` Consider whether the scene can reach a natural stopping point in this response, but don't force it; if more development feels needed, allow the scene to continue.`, // Gently prod toward and ending.
        ` The scene is getting long and this response should try to aim for a satisfactory conclusion, potentially ending with stat boosts ([CHARACTER NAME: RELEVANT STAT + 1]) and/or an [END SCENE] tag.` // Firmer prod
    ];

    // Use script length + random(1, 10) > 12 for gentle or > 24 for firm.
    const scriptLengthFactor = vignette.script.length + Math.floor(Math.random() * 10) + 1;
    const wrapupPrompt = scriptLengthFactor > 24 ? wrapUpPhrases[1] : (scriptLengthFactor > 12 ? wrapUpPhrases[0] : '');
    const presentActors = Object.values(stage.getSave().actors).filter(a => a.locationId === (vignette.moduleId || ''));
    const absentActors = Object.values(stage.getSave().actors).filter(a => a.locationId !== (vignette.moduleId || ''));

    // Update participation counts if this is the start of the vignette
    if (vignette.script.length === 0) {
        // Increment participation count for present actors
        presentActors.forEach(a => {
            a.participations = (a.participations || 0) + 1;
        });
    }

    let fullPrompt = `{{messages}}\nPremise:\nThis is a sci-fi visual novel game set on a space station that resurrects and rehabilitates patients who died in the multiverse-wide apocalypse: ` +
        `the Post-Apocalyptic Rehabilitation Center. ` +
        `The thrust of the game has the player character, ${playerName}, managing this station and interacting with patients and crew, as they navigate this complex futuristic universe together. ` +
        `\n\nCrew:\nAt this point in the story, the player is running the operation on their own, with no fellow crew members. ` +
        // List characters who are here, along with full stat details:
        `\n\nPresent Characters:\n${presentActors.map(actor => {
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Days Aboard: ${stage.getSave().day - actor.birthDay}\n  Scene Participation: ${actor.participations}\n` +
            (roleModule ? `  Role: ${roleModule.getAttribute('role') || 'Patient'} (${actor.heldRoles[roleModule.getAttribute('role') || 'Patient'] || 0} days)\n` : '') +
            `  Role Description: ${roleModule?.getAttribute('roleDescription') || 'This character has no assigned role aboard the PARC. They are to focus upon their own needs.'}\n` +
            `  Stats:\n    ${Object.entries(actor.stats).map(([stat, value]) => `${stat}: ${value}`).join('\n    ')}`}).join('\n')}` +
        // List non-present characters for reference; just need description and profile:
        `\n\nOther Characters:\n${absentActors.map(actor => {
            // Just role name and not full details.
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Role: ${roleModule?.getAttribute('role') || 'Patient'}`;
        }).join('\n')}` +
        // List stat meanings, for reference:
        `\n\nStats:\n${Object.values(Stat).map(stat => `${stat.toUpperCase()}: ${getStatDescription(stat)}`).join('\n')}` +
        `\n\nEmotions:\n${Object.values(Emotion).map(emotion => `${emotion.toUpperCase()}`).join(', ')}` +
        `\n\nScene Prompt:\n${generateVignettePrompt(vignette, stage, vignette.script.length > 0)}` +
        `\n\nExample Script Format:\n` +
        'System: CHARACTER NAME: They do actions in prose. "Their dialogue is in quotation marks."\nANOTHER CHARACTER NAME: [ANOTHER CHARACTER EXPRESSES JOY][CHARACTER NAME EXPRESSES SURPRISE] "Dialogue in quotation marks."\nNARRATOR: [CHARACTER NAME EXPRESSES RELIEF] Descriptive content that is not attributed to a character.' +
        `\n\nExample Ending Script Format:\n` +
        'System: CHARACTER NAME: [CHARACTER NAME EXPRESSES OPTIMISM] Action in prose. "Dialogue in quotation marks."\nNARRATOR: Conclusive ending to the scene in prose.' +
        `\n[CHARACTER NAME: RELEVANT STAT + 1]` +
        `\n[END SCENE]` +
        `\n\nScript Log:\nSystem: ${scriptLog}` +
        `\n\nInstruction:\nAt the "System:" prompt, generate a short scene script based upon this scenario, and the specified Scene Prompt. Follow the structure of the strict Example Script formatting above. ` +
        `Actions are depicted in prose and character dialogue in quotation marks. Emotion tags (e.g. [CHARACTER NAME EXPRESSES JOY]) should be used to indicate significant emotional shifts—` +
        `these cues will be utilized by the game engine to visually display appropriate character emotions; only the known, listed emotions can be used here.\n` +
        `This response should end when it makes sense to give ${playerName} a chance to respond or contribute, ` +
        `or, if the scene feels satisfactorily complete, the entire scene can be concluded with an "[END SCENE]" or ` +
        `"[CHARACTER NAME: RELEVANT STAT + x]" tag(s), which can be used to apply stat changes to the specified Present Character(s). These changes should reflect an outcome of the scene; ` +
        `they should be incremental, typically (but not exclusively) positive, and applied only when the scene is complete.${wrapupPrompt}`;

    // Retry logic if response is null or response.result is empty
    let retries = 3;
    while (retries > 0) {
        try {
            const response = await stage.generator.textGen({
                prompt: fullPrompt,
                min_tokens: 100,
                max_tokens: 700,
                include_history: true
            });
            if (response && response.result && response.result.trim().length > 0) {
                // First, detect and parse any END tags and stat changes that may be embedded in the response.
                let text = response.result;
                let endScene = false;
                // Map actorId -> { statName: delta }
                const statChanges: { [actorId: string]: { [stat: string]: number } } = {};

                // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                const lines = text.split('\n');
                const combinedLines: string[] = [];
                const combinedEmotionTags: {[key: string]: Emotion}[] = [];
                let currentLine = '';
                let currentEmotionTags: {[key: string]: Emotion} = {};
                for (const line of lines) {
                    // Skip any explicit END tags that might have survived splitting
                    let trimmed = line.trim();
                    if (!trimmed) continue;

                    const newEmotionTags: {[key: string]: Emotion} = {};

                    // Process tags in the line:
                    // Detect [END SCENE] or [END] to determine whether the scene ends here
                    // Detect separate stat-change tags of the form:
                    // [Character Name: Stat +1]
                    // or [Character Name - Stat +1]
                    // Also look for expression tags:
                    // [Character Name EXPRESSES Emotion]
                    // Look at all bracketed tags in the response
                    const bracketTagRegex = /\[([^\]]+)\]/g;
                    let tagMatch: RegExpExecArray | null;
                    // Prepare list of present actors (based on module/location)
                    const presentActors: Actor[] = Object.values(stage.getSave().actors).filter(a => a.locationId === (vignette.moduleId || ''));
                    
                    // Lookp through all tags:
                    for (const tag of trimmed.match(/\[[^\]]+\]/g) || []) {
                        const raw = tag.slice(1, -1).trim();
                        if (!raw) continue;

                        console.log(`Processing tag: ${raw}`);
                        
                        const endSceneRegex = /(END|END SCENE|DONE)/i;
                        if (endSceneRegex.test(raw)) {
                            console.log("Detected end scene tag.");
                            endScene = true;
                            continue;
                        }

                        // Attempt to split into "name" and "stat +/-1" by first ':' or '-' delimiter
                        const split = raw.split(":");
                        if (split.length >= 2) {
                            console.log(`Processing stat change tag: ${raw}`);
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
                            endScene = true;
                        }

                        // Look for expresses tags here, too:
                        const emotionTagRegex = /([^[\]]+)\s+EXPRESSES\s+([^[\]]+)/gi;
                        let emotionMatch = emotionTagRegex.exec(raw);
                        if (emotionMatch) {
                            const characterName = emotionMatch[1].trim();
                            const emotionName = emotionMatch[2].trim().toLowerCase();
                            // Find matching present actor using namesMatch
                            const matched = presentActors.find(a => namesMatch(a.name.toLowerCase(), characterName.toLowerCase()));
                            if (!matched) continue;
                            
                            // Try to map emotion using EMOTION_SYNONYMS if not a standard emotion
                            let finalEmotion: Emotion | undefined;
                            if (emotionName in Emotion) {
                                finalEmotion = emotionName as Emotion;
                            } else if (emotionName in EMOTION_SYNONYMS) {
                                finalEmotion = EMOTION_SYNONYMS[emotionName];
                                console.log(`Mapped non-standard emotion "${emotionName}" to "${finalEmotion}" for ${matched.name}`);
                            }
                            
                            if (!finalEmotion) continue;
                            console.log(`Detected emotion tag for ${matched.name}: ${finalEmotion}`);
                            newEmotionTags[matched.name] = finalEmotion;
                        }
                    }

                    // Remove all tags:
                    trimmed = trimmed.replace(/\[([^\]]+)\]/g, '').trim();

                    if (line.includes(':')) {
                        // New line
                        if (currentLine) {
                            combinedLines.push(currentLine.trim());
                            combinedEmotionTags.push(currentEmotionTags);
                        }
                        currentLine = trimmed;
                        currentEmotionTags = newEmotionTags;
                    } else {
                        // Continuation of previous line
                        currentLine += '\n' + trimmed;
                        currentEmotionTags = {...currentEmotionTags, ...newEmotionTags};
                    }
                }
                if (currentLine) {
                    combinedLines.push(currentLine.trim());
                    combinedEmotionTags.push(currentEmotionTags);
                }

                // Convert combined lines into ScriptEntry objects by splitting at first ':'
                const scriptEntries: ScriptEntry[] = combinedLines.map((l, index) => {
                    const idx = l.indexOf(':');
                    let speaker = 'NARRATOR';
                    let message = l;
                    
                    if (idx !== -1) {
                        speaker = l.slice(0, idx).trim();
                        message = l.slice(idx + 1).trim();
                    }
                    
                    // Remove any remaining non-emotion tags
                    message = message.replace(/\[([^\]]+)\]/g, '').trim();
                    
                    const entry: ScriptEntry = { speaker, message };
                    if (Object.keys(combinedEmotionTags[index]).length > 0) {
                        entry.actorEmotions = combinedEmotionTags[index];
                    }
                    
                    return entry;
                });

                // Drop empty entries from scriptEntries and adjust speaker to any matching actor's name:
                for (const entry of scriptEntries) {
                    if (!entry.message || entry.message.trim().length === 0) {
                        scriptEntries.splice(scriptEntries.indexOf(entry), 1);
                        continue;
                    }
                    // Adjust speaker name to match actor name if possible
                    const presentActors = Object.values(stage.getSave().actors).filter(a => a.locationId === (vignette.moduleId || ''));
                    const matched = presentActors.find(a => namesMatch(a.name.toLowerCase(), entry.speaker.toLowerCase()));
                    if (matched) {
                        entry.speaker = matched.name;
                    }
                }
                

                return { entries: scriptEntries, endScene: endScene, statChanges: statChanges };
            }
        } catch (error) {
            console.error('Error generating vignette script:', error);
        }
        retries--;
    }
    return { entries: [], endScene: false, statChanges: {} };
}


export default {
    VignetteType
};

