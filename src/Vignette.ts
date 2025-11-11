import Actor, { getStatDescription, namesMatch, Stat } from "./actors/Actor";
import { Stage } from "./Stage";

export enum VignetteType {
    INTRO_CHARACTER = 'INTRO CHARACTER',
    VISIT_CHARACTER = 'VISIT CHARACTER',
    RANDOM_ENCOUNTER = 'RANDOM ENCOUNTER'
}

export interface ScriptEntry {
    speaker: string;
    message: string;
}

export interface VignetteData {
    type: VignetteType;
    moduleId: string;
    actorId?: string;
    script: ScriptEntry[];
    generating: boolean;
    context: any;
    endScene: boolean;
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
        default:
            return '';
    }
}

export async function generateVignetteScript(vignette: VignetteData, stage: Stage): Promise<{ entries: ScriptEntry[]; endScene: boolean; statChanges: { [actorId: string]: { [stat: string]: number } } }> {
    // Build a scene log when continuing so the generator can see prior script entries
    const scriptLog = (vignette.generating && vignette.script && vignette.script.length > 0)
        ? vignette.script.map(e => `${e.speaker}: ${e.message}`).join('\n')
        : '(None so far)';

    const targetActor = stage.getSave().actors[vignette.actorId || ''];
    const playerName = stage.getSave().player.name;

    let fullPrompt = `{{messages}}\nPremise:\nThis is a sci-fi visual novel game set on a space station that resurrects and rehabilitates patients who died in the multiverse-wide apocalypse: ` +
        `the Post-Apocalyptic Rehabilitation Center. ` +
        `The thrust of the game has the player character, ${playerName}, managing this station and interacting with patients and crew, as they navigate this complex futuristic universe together. ` +
        `\n\nCrew:\nAt this point in the story, the player is running the operation on their own, with no fellow crew members. ` +
        // List patients who are here, along with full stat details:
        `\n\nPresent Characters:\n${Object.values(stage.getSave().actors).filter(actor => actor.locationId == module.id).map(actor => 
            `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Stats:\n    ${Object.entries(actor.stats).map(([stat, value]) => `${stat}: ${value}`).join('\n    ')}`).join('\n')}` +
        // List non-present patients for reference; just need description and profile:
        `\n\nOther Patients:\n${Object.values(stage.getSave().actors).filter(actor => actor.locationId != module.id).map(actor => `${actor.name}\n  ${actor.description}\n  ${actor.profile}`).join('\n')}` +
        // List stat meanings, for reference:
        `\n\nStats:\n${Object.values(Stat).map(stat => `${stat.toUpperCase()}: ${getStatDescription(stat)}`).join('\n')}` +
        `\n\nScene Prompt:\n${generateVignettePrompt(vignette, stage, vignette.script.length > 0)}` +
        `\n\nExample Mid Script Format:\n` +
        'System: CHARACTER NAME: Action in pose. "Dialogue in quotation marks."\nANOTHER CHARACTER NAME: "Dialogue in quotation marks."\nNARRATOR: Descriptive content that is not attributed to a character.' +
        `\n\nExample End Script Format:\n` +
        'System: CHARACTER NAME: Action in pose. "Dialogue in quotation marks."\nNARRATOR: Conclusive ending to the scene in prose.' +
        `\n[CHARACTER NAME: RELEVANT STAT + 1]` +
        `\n[END SCENE]` +
        `\n\nScript Log:\nSystem: ${scriptLog}` +
        `\n\nInstruction:\nAt the "System:" prompt, generate a short scene script based upon this scenario, and the specified Scene Prompt. Follow the structure of the strict Example Script Format above. ` +
        `This response should end when it makes sense to give ${playerName} a chance to respond, ` +
        `or, if the scene feels satisfactorily complete, the entire scene can be concluded with and "[END SCENE]" tag. ` +
        `Before an "[END SCENE]" tag, a "[CHARACTER NAME: RELEVANT STAT + x]" tag can be used to apply a stat change to the specified Present Character. These changes should reflect an outcome of the scene; ` +
        `they should be small, typically (but not exclusively) positive, and applied sparingly (generally just before [END SCENE]).`;

    // Retry logic if response is null or response.result is empty
    let retries = 3;
    while (retries > 0) {
        try {
            const response = await stage.generator.textGen({
                prompt: fullPrompt,
                min_tokens: 100,
                max_tokens: 700,
                include_history: true,
                stop: ['[END]', '[END SCENE]', '[DONE]']
            });
            if (response && response.result && response.result.trim().length > 0) {
                // First, detect and parse any END tags and stat changes that may be embedded in the response.
                let text = response.result;
                let endScene = false;
                // Map actorId -> { statName: delta }
                const statChanges: { [actorId: string]: { [stat: string]: number } } = {};

                // Detect [END SCENE] or [END] to determine whether the scene ends here
                const endSceneRegex = /\[(END|END SCENE|DONE)\]/i;
                if (endSceneRegex.test(text)) {
                    endScene = true;
                }

                // Now detect separate stat-change tags of the form:
                // [Character Name: Stat +1]
                // or [Character Name - Stat +1]
                // We'll look for any bracketed tag and attempt to parse it as a stat-change if the left side matches a present character.
                const bracketTagRegex = /\[([^\]]+)\]/g;
                let tagMatch: RegExpExecArray | null;
                // Prepare list of present actors (based on module/location)
                const presentActors: Actor[] = Object.values(stage.getSave().actors).filter(a => a.locationId === (vignette.moduleId || ''));
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

                // Remove all tags ([]) from visible text:
                text = text.replace(/\[([^\]]+)\]/g, '');

                // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                const lines = text.split('\n');
                const combinedLines: string[] = [];
                let currentLine = '';
                for (const line of lines) {
                    // Skip any explicit END tags that might have survived splitting
                    const trimmed = line.trim();
                    if (!trimmed) continue;

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


export default {
    VignetteType
};

