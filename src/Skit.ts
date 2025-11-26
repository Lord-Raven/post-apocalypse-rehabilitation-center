import Actor, { getStatDescription, namesMatch, Stat } from "./actors/Actor";
import { Emotion, EMOTION_SYNONYMS } from "./actors/Emotion";
import { getStatRating, STATION_STAT_PROMPTS, StationStat } from "./Module";
import { Stage } from "./Stage";
import { Request } from "./factions/Request";

export enum SkitType {
    INTRO_CHARACTER = 'INTRO CHARACTER',
    VISIT_CHARACTER = 'VISIT CHARACTER',
    ROLE_ASSIGNMENT = 'ROLE ASSIGNMENT',
    FACTION_INTRODUCTION = 'FACTION INTRODUCTION',
    FACTION_INTERACTION = 'FACTION INTERACTION',
    NEW_MODULE = 'NEW MODULE',
    RANDOM_ENCOUNTER = 'RANDOM ENCOUNTER'
}

export interface ScriptEntry {
    speaker: string;
    message: string;
    speechUrl: string; // URL of TTS audio
    actorEmotions?: {[key: string]: Emotion}; // actor name -> emotion string
    endScene?: boolean; // Whether this entry marks the end of the scene
}

export interface SkitData {
    type: SkitType;
    moduleId: string;
    actorId?: string;
    script: ScriptEntry[];
    generating?: boolean;
    context: any;
    requests?: Request[];
    endProperties?: { [actorId: string]: { [stat: string]: number } }; // Stat changes to apply when scene ends
}

export function generateSkitTypePrompt(skit: SkitData, stage: Stage, continuing: boolean): string {
    const actor = stage.getSave().actors[skit.actorId || ''];
    const module = stage.getSave().layout.getModuleById(skit.moduleId || '');
    const faction = stage.getSave().factions[skit.context.factionId || ''];
    const factionRepresentative = faction ? stage.getSave().actors[faction.representativeId || ''] : null;
    const notHereText = 'This communication is being conducted via remote video link; no representative is physically present on the station. ';
    switch (skit.type) {
        case SkitType.INTRO_CHARACTER:
            return !continuing ? 
                `This scene will introduce a new character, ${actor.name}, fresh from their echo chamber. ${actor.name} will have no knowledge of this universe. Establish their personality and possibly some motivations.` :
                `Continue the introduction of ${actor.name}, expanding on their personality or motivations.`;
        case SkitType.VISIT_CHARACTER:
            return !continuing ?
                `This scene depicts the player's visit with ${actor.name} in ${actor.name}'s quarters, which have been redecorated to match ${actor.name}'s style (${actor.style}). Bear in mind that ${actor.name} is from another universe, and may be unaware of details of this one. ` +
                    `Potentially explore ${actor.name}'s thoughts, feelings, or troubles in this intimate setting.` :
                `Continue this scene with ${actor.name}, potentially exploring their thoughts, feelings, or troubles in this intimate setting.`;
        case SkitType.RANDOM_ENCOUNTER:
            return !continuing ?
                `This scene depicts a chance encounter in the ${module?.type || 'unknown'} module${module?.ownerId ? ` which has been redecorated to suit ${stage.getSave().actors[module.ownerId]?.name || 'its owner'}'s style (${stage.getSave().actors[module.ownerId]?.style})` : ''}. ` +
                `Bear in mind that patients are from another universe, and may be unaware of details of this one. ` +
                    `Explore the setting and what might arise from this unexpected meeting.` :
                `Continue this chance encounter in the ${module?.type || 'unknown'} module, exploring what might arise from this unexpected meeting.`;
        case SkitType.ROLE_ASSIGNMENT:
            return !continuing ?
                `This scene depicts an exchange between the player and ${actor.name}, following the player's decision to newly assign ${actor.name} to the role of ${skit.context.role || 'something new'} in the ${module?.type || 'unknown'} module. ` +
                    `Bear in mind ${actor.name}'s personality, stats, and experience within this setting (or lack thereof) as you portray their reaction and to this new role. ` :
                `Continue this scene with ${actor.name}, potentially exploring their thoughts or feelings toward their new role.`;
        case SkitType.NEW_MODULE:
            return !continuing ?
                `This scene depicts an exchange between the player and some of the patients regarding the opening of a new module, the ${module?.type || 'unknown'}. ` :
                `Continue this scene, exploring the crew's thoughts or feelings toward this latest addition to the PARC.`;
        case SkitType.FACTION_INTRODUCTION:
            return (!continuing ?
                `This scene introduces a new faction that would like to do business with the Director and PARC: ${faction?.name || 'a secret organization'}. ` +
                notHereText +
                `Describe this new faction's appearance, motivations, and initial interactions with the player Director and other characters present in the Comms module (if any). ` :
                `This is an introductory scene for ${faction?.name || 'a secret organization'}. ` +
                notHereText);
        case SkitType.FACTION_INTERACTION:
            return (!continuing ?
                `This scene depicts an interaction between the Director and a faction that does business with the PARC: ${faction?.name || 'a secret organization'}. ` +
                notHereText :
                `Continue this scene between the Director and a representative for ${faction?.name || 'a secret organization'}'s. ` + 
                notHereText);
        default:
            return '';
    }
}

function buildScriptLog(skit: SkitData): string {
        return skit.script && skit.script.length > 0 ?
        skit.script.map(e => `${e.speaker}:${e.message}${Object.keys(e.actorEmotions || {}).filter(feeler => namesMatch(feeler, e.speaker)).map(feeler => ` [${feeler} EXPRESSES ${e.actorEmotions?.[feeler]}]`).join('\n')} `).join('\n')
        : '(None so far)';
}

export function generateSkitPrompt(skit: SkitData, stage: Stage, includeHistory: boolean, instruction: string): string {
    const playerName = stage.getSave().player.name;

    const presentActors = Object.values(stage.getSave().actors).filter(a => a.locationId === (skit.moduleId || '') && !a.remote);
    const absentActors = Object.values(stage.getSave().actors).filter(a => a.locationId !== (skit.moduleId || '') && !a.remote);

    // Update participation counts if this is the start of the skit
    if (skit.script.length === 0) {
        // Increment participation count for present actors
        presentActors.forEach(a => {
            a.participations = (a.participations || 0) + 1;
        });
    }

    let pastSkits = stage.getSave().timeline?.filter(event => event.skit).map(event => event.skit as SkitData) || []
    pastSkits = pastSkits.filter((v, index) => index > (pastSkits.length || 0) - 4);
    const module = stage.getSave().layout.getModuleById(skit.moduleId || '');
    const moduleOwner = module?.ownerId ? stage.getSave().actors[module.ownerId] : null;
    const faction = skit.context.factionId ? stage.getSave().factions[skit.context.factionId] : null;
    const factionRepresentative = faction ? stage.getSave().actors[faction.representativeId || ''] : null;

    let fullPrompt = `{{messages}}\nPremise:\nThis is a sci-fi visual novel game set on a space station that resurrects and rehabilitates patients who died in a multiverse-wide apocalypse: ` +
        `the Post-Apocalypse Rehabilitation Center. ` +
        `The thrust of the game positions the player character, ${playerName}, as the Director of the PARC station, interacting with patients and crew as they navigate this complex futuristic universe together. ` +
        `The PARC is an isolated station near a black hole. It serves as both sanctuary and containment for its diverse inhabitants, who hail from various alternate realities. ` +
        `${playerName} is the only non-patient aboard the station (although they may hire patients on as crew or staff); as a result, the station may feel a bit lonely or alienating at times. ` +
        `Much of the day-to-day maintenance and operation of the station is automated by the station's AI systems and various drones, enabling ${playerName} to focus on patient care and rehabilitation.` +
        (stage.getSave().stationStats ? (
            `\n\nThe PARC's current stats and impacts:\n` +
            Object.values(StationStat).map(stat => `  ${stat.toUpperCase()} (${stage.getSave().stationStats?.[stat] || 3}): ${STATION_STAT_PROMPTS[stat][getStatRating(stage.getSave().stationStats?.[stat] || 3)]}`).join('\n')
        ) : '') +
        (Object.values(stage.getSave().requests).length > 0 ? (
            `\n\nActive Requests:\n` +
            Object.values(stage.getSave().requests).map(request => `-${stage.getSave().factions[request.factionId]?.name || 'Unknown Faction'}: ${request.description} \n  Requirement: ${request.getRequirementText()} \n  Reward: ${request.getRewardText()}`).join('\n')
        ) : '') +
        `\n\n${playerName}'s profile: ${stage.getSave().player.description}` +
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
        `\n\nAbsent Characters:\n${absentActors.map(actor => {
            // Just role name and not full details.
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Role: ${roleModule?.getAttribute('role') || 'Patient'}`;
        }).join('\n')}` +
        // List stat meanings, for reference:
        `\n\nStats:\n${Object.values(Stat).map(stat => `${stat.toUpperCase()}: ${getStatDescription(stat)}`).join('\n')}` +
        `\n\nEmotions:\n${Object.values(Emotion).map(emotion => `${emotion.toUpperCase()}`).join(', ')}` +
        `\n\nScene Prompt:\n${generateSkitTypePrompt(skit, stage, skit.script.length > 0)}` +
        (faction ? `\n\n${faction.name} Details: ${faction.description}\n${faction.name} Aesthetic: ${faction.visualStyle}\nThe PARC's current reputation with this faction is ${faction.reputation} / 10.` : '') +
        (factionRepresentative ? `\n${faction?.name || 'The faction'}'s representative, ${factionRepresentative.name}, appears on-screen. Their description: ${factionRepresentative.description}` : 'They have no designated liaison for this communication; any characters introduced during this scene will be transient.') +
        (faction ? `\nThis skit may explore the nature of this faction's relationship with and intentions for the Director, the PARC, or other characters present in the Comms module (if any). ` +
            `However, this and other factions generally contact the PARC to express interest or make offers: ` +
            `\n1) Most commonly, these are 'job' openings with certain character qualities (or limitations) in mind.` +
            `\n2) Sometimes, these 'job' offers target a specific patient of the PARC.` +
            `\n3) Finally, some offers are for other Station resources or exchanges; these are informed by the PARC's core stats, but typically presented in a narrative or abstract fashion.` +
            `\nAll requests come with some offer of compensation. Remember that a 'job' in this context may be something the Director can compel a patient into—not necessarily gainful employment. ` +
            `Although deals and offers are discussed in this skit, they can only be finalized through a separate game mechanic, so the skit should leave the offer open without confirming anything.` : '') +
        (module ? (`\n\nModule Details:\n  This scene is set in ` +
            `${module.type === 'quarters' ? `${moduleOwner ? `${moduleOwner.name}'s` : 'a vacant'} quarters` : 
            `the ${module.type || 'Unknown'}`}. ${module.getAttribute('skitPrompt') || 'No description available.'}\n`) : '') +

        ((includeHistory && pastSkits.length) ? 
            // Include last few skit scripts for context and style reference
            '\n\nRecent Scene Scripts for additional context:' + pastSkits.map((v, index) => 
                `\n\n  Scene in ${stage.getSave().layout.getModuleById(v.moduleId || '')?.type || 'Unknown'} (${stage.getSave().day - v.context.day}) days ago:\n` +
                `System: ${buildScriptLog(v)}\n[SUMMARY: Scene in ${stage.getSave().layout.getModuleById(v.moduleId || '')?.type || 'Unknown'}]`).join('') :
            '') +
        `\n\n${instruction}`;
    return fullPrompt;
}

export async function generateSkitScript(skit: SkitData, stage: Stage): Promise<{ entries: ScriptEntry[]; endScene: boolean; statChanges: { [actorId: string]: { [stat: string]: number } }; requests: Request[] }> {
    const playerName = stage.getSave().player.name;
    
    // There are two optional phrases for gently/more firmly prodding the model toward wrapping up the scene, and then we calculate one to show based on the skit.script.length and some randomness:
    const wrapUpPhrases = [
        ` Consider whether the scene has reached or can reach a natural stopping point in this response; if not, work toward a conclusion and include the "[SUMMARY]" tag.`, // Gently prod toward and ending.
        ` This scene is getting long; craft a conclusion and output the "[SUMMARY]" tag.` // Firmer prod
    ];

    // Use script length + random(1, 10) > 12 for gentle or > 24 for firm.
    const scriptLengthFactor = skit.script.length + Math.floor(Math.random() * 10) + 1;
    const wrapupPrompt = scriptLengthFactor > 24 ? wrapUpPhrases[1] : (scriptLengthFactor > 12 ? wrapUpPhrases[0] : '');

    const fullPrompt = generateSkitPrompt(skit, stage, true, 
        `Example Script Format:\n` +
        'System: CHARACTER NAME: They do actions in prose. "Their dialogue is in quotation marks."\nANOTHER CHARACTER NAME: [ANOTHER CHARACTER EXPRESSES JOY][CHARACTER NAME EXPRESSES SURPRISE] "Dialogue in quotation marks."\nNARRATOR: [CHARACTER NAME EXPRESSES RELIEF] Descriptive content that is not attributed to a character.' +
        `\n\nExample Ending Script Format:\n` +
        'System: CHARACTER NAME: [CHARACTER NAME EXPRESSES OPTIMISM] Action in prose. "Dialogue in quotation marks."\nNARRATOR: A moment of prose describing events.' +
        `\n[SUMMARY: Two characters interacted as a demonstration.]` +
        `\n\nCurrent Scene Script Log to Continue:\nSystem: ${buildScriptLog(skit)}` +
        `\n\nPrimary Instruction:\nAt the "System:" prompt, ${skit.script.length == 0 ? 'generate a short scene script' : 'extend or conclude the current scene script'} based upon the Premise and the specified Scene Prompt, ` +
        `involving the Present Characters (Absent Characters are listed for reference only). ` +
        `The script should consider characters' stats, relationships, past events, and the station's stats—among other factors—to craft a compelling scene. ` +
        `\nFollow the structure of the strict Example Script formatting above: ` +
        `actions are depicted in prose and character dialogue in quotation marks. Emotion tags (e.g. "[CHARACTER NAME EXPRESSES JOY]") should be used to indicate significant emotional shifts—` +
        `these cues will be utilized by the game engine to visually display appropriate character emotions. ` +
        `An end tag (e.g., "[SUMMARY: Brief summary of the scenes events.]") should be employed when the scene reaches an explicit or _implicit_ stopping point or suspendable moment. ` +
        `\nThis scene is a brief narrative moment within the context of a game; the scene should avoid major developments which would fundamentally change the mechanics or nature of the game, ` +
        `instead developing content within the existing framework. ` +
        `Generally, focus upon interpersonal dynamics, character growth, faction relationships, and the state of the Station and its inhabitants.` +
        `\nWhen the scene encounters a sensible moment or implicit closure—or if the current script already feels complete—, output the critical "[SUMMARY: A brief synopsis]" tag. ` +
        `It should provide a brief description of the scene's events and allow the game to proceed. Scripts favor implied endings that get the player back to the game without belaboring the narrative beat; ` +
        `a suspended ending is enough to prompt a "[SUMMARY]" tag.${wrapupPrompt}`
    );

    // Retry logic if response is null or response.result is empty
    let retries = 3;
    while (retries > 0) {
        try {
            const response = await stage.generator.textGen({
                prompt: fullPrompt,
                min_tokens: 100,
                max_tokens: 500,
                include_history: true
            });
            if (response && response.result && response.result.trim().length > 0) {
                // First, detect and parse any END tags and stat changes that may be embedded in the response.
                let text = response.result;
                let endScene = false;

                // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                const lines = text.split('\n');
                const combinedLines: string[] = [];
                const combinedEmotionTags: {[key: string]: Emotion}[] = [];
                let currentLine = '';
                let currentEmotionTags: {[key: string]: Emotion} = {};
                for (const line of lines) {
                    // Skip empty lines
                    let trimmed = line.trim();

                    // First, look for an ending tag.
                    if (trimmed.startsWith('[SUMMARY')) {
                        console.log("Detected end scene tag.");
                        endScene = true;
                        continue;
                    }

                    // If a line doesn't end with ], ., !, ?, or ", then it's likely incomplete and we should drop it.
                    if (!trimmed || ![']', '*', '_', ')', '.', '!', '?', '"', '\''].some(end => trimmed.endsWith(end))) continue;

                    const newEmotionTags: {[key: string]: Emotion} = {};

                    // Prepare list of present actors (based on module/location)
                    const presentActors: Actor[] = Object.values(stage.getSave().actors).filter(a => a.locationId === (skit.moduleId || ''));
                    
                    // Process tags in the line (just expresses at the moment):
                    // [Character Name EXPRESSES Emotion]
                    for (const tag of trimmed.match(/\[[^\]]+\]/g) || []) {
                        const raw = tag.slice(1, -1).trim();
                        if (!raw) continue;

                        console.log(`Processing tag: ${raw}`);
                        // Look for expresses tags:
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
                    
                    const entry: ScriptEntry = { speaker, message, speechUrl: '' };
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
                    const presentActors = Object.values(stage.getSave().actors).filter(a => a.locationId === (skit.moduleId || ''));
                    const matched = presentActors.find(a => namesMatch(a.name.toLowerCase(), entry.speaker.toLowerCase()));
                    if (matched) {
                        entry.speaker = matched.name;
                    }
                }

                // TTS for each entry's dialogue
                const ttsPromises = scriptEntries.map(async (entry) => {
                    const actor = Object.values(stage.getSave().actors).find(a => namesMatch(a.name.toLowerCase(), entry.speaker.toLowerCase()));
                    // Only TTS if entry.speaker matches an actor from stage().getSave().actors and entry.message includes dialogue in quotes.
                    if (!actor || !entry.message.includes('"')) {
                        entry.speechUrl = '';
                        return;
                    }
                    let transcript = entry.message.split('"').filter((_, i) => i % 2 === 1).join('.........').trim();
                    // Strip asterisks or other markdown-like emphasis characters
                    transcript = transcript.replace(/[\*_~`]+/g, '');
                    try {
                        const ttsResponse = await stage.generator.speak({
                            transcript: transcript,
                            voice_id: actor.voiceId ?? undefined
                        });
                        if (ttsResponse && ttsResponse.url) {
                            entry.speechUrl = ttsResponse.url;
                        } else {
                            entry.speechUrl = '';
                        }
                    } catch (err) {
                        console.error('Error generating TTS:', err);
                        entry.speechUrl = '';
                    }
                });
                
                // Run an experimental tooling prompt here to see if any tools are invoked in the script entries. Doesn't look like tooling information is passed to stage-originated textGen requests at this time.
                /*stage.mcp.
                const toolTest = await stage.generator.textGen({
                    prompt: `{{messages}}Analyze the following skit script for any tool invocations (e.g. stat changes).\n\nSkit Script:\n${scriptEntries.map(e => `${e.speaker}: ${e.message}`).join('\n')}\n\n`,
                    min_tokens: 50,
                    max_tokens: 500,
                    include_history: true,

                })
                console.log('Tool analysis response:', toolTest?.result);*/

                const statChanges: { [actorId: string]: { [stat: string]: number } } = {};
                const requests: Request[] = [];
                // If this response contains an endScene, we will analyze the script for requests, stat changes, or other game mechanics to be applied. Add this to the ttsPromises to run in parallel.
                if (endScene) {
                    console.log('Scene end predicted; preparing to analyze for requests and stat changes.');

                    ttsPromises.push((async () => {
                        const analysisPrompt = generateSkitPrompt(skit, stage, true,
                            `Scene Script:\nSystem: ${buildScriptLog(skit)}` +
                            `\n\nPrimary Instruction:\nAnalyze the preceding scene script and output formatted tags in brackets, identifying the following categorical changes to be inorporated into the game. ` +
                            `\n\nCharacter Stat Changes:\nIdentify any changes to character stats implied by the scene. For each change, output a line in the following format:\n` +
                            `"[CHARACTER NAME: <stat> +<value>(, ...)]"` +
                            `Where <stat> is the name of the stat to be changed, and <value> is the amount to increase or decrease the stat by (positive or negative). ` +
                            `Multiple stat changes can be included in a single tag, separated by commas. Similarly, multiple character tags can be provided in the output.\n\n` +
                            `Station Stat Changes:\nIdentify any changes to station stats implied by the scene. For each change, output a line in the following format:\n` +
                            `"[STATION: <stat> +<value>(, ...)]"` +
                            `Where <stat> is the name of the station stat to be changed, and <value> is the amount to increase or decrease the stat by (positive or negative). ` +
                            `Multiple stat changes can be included in a single tag, separated by commas.\n\n` +
                            `Faction Requests:\n` +
                            `Identify any requests made by factions or faction representatives toward the player or station. ` +
                            `For each request identified, output a line in the following format:\n` +
                            `"[REQUEST: <factionName> | <description> | <requirement> -> <reward>]"` +
                            `Where <factionName> is the name of the faction making the request, <description> is a brief summary of the request, ` +
                            `<requirement> is what the player must do to fulfill the request, and <reward> is what the player will receive upon completion.\n` +
                            `Valid <requirement> formats:\n` +
                            `"  ACTOR <stat><op><value>[, <stat><op><value>]" // Actor with one or more stat constraints\n` +
                            `   - op can be: >= (min), <= (max)\n` +
                            `   - Example: ACTOR brawn>=7, charm>=5, lust<=3\n` +
                            `"  ACTOR-NAME <actorName>" // Specific actor by name\n` +
                            `   - Example: ACTOR-NAME Jane Doe\n` +
                            `"  STATION <stat>-<value>[, <stat>-<value>]" // Station stats to be reduced\n` +
                            `   - Stats will be reduced by the specified amounts\n` +
                            `   - Example: STATION Security-2, Harmony-1\n` +
                            `Valid <reward> formats:\n` +
                            `"  <stat>+<value>[, <stat>+<value>]" // Station stat bonuses\n` +
                            `   - Example: Systems+2, Comfort+1, Security+3\n` +
                            `Full Examples:\n` +
                            `"[REQUEST: Stellar Concord | We need a strong laborer | ACTOR brawn>=7, charm>=6 -> Systems+2, Comfort+1]"\n` +
                            `"[REQUEST: Shadow Syndicate | Return our missing operative | ACTOR-NAME Jane Doe -> Harmony+3]"\n` +
                            `"[REQUEST: Defense Coalition | Help us bolster our defenses | STATION Security-2, Harmony-1 -> Systems+2, Provision+2]"\n\n` +
                            `All relevant tags should be output in this response. Stat changes should be a fair reflection of the scene's direct or implied events. ` +
                            `Bear in mind the somewhat abstract meaning of character and station stats when determining reasonable changes and goals. ` +
                            `All stats (station and character) exist on a scale of 1-10, with 1 being the lowest and 10 being the highest possible value; ` +
                            `typically, these changes should be incremental (+/- 1 or 2) at a time, unless something incredibly dramatic occurs. ` +
                            `If there is little or no change, the response may be ended early with [END]. \n\n`
                        );
                        const requestAnalysis = await stage.generator.textGen({
                            prompt: analysisPrompt,
                            min_tokens: 5,
                            max_tokens: 250,
                            include_history: true,
                            stop: ['[END]']
                        });
                        console.log('Request analysis response:', requestAnalysis?.result);
                        if (requestAnalysis && requestAnalysis.result) {
                            const analysisText = requestAnalysis.result;

                            // Process analysisText for stat changes and requests
                            const lines = analysisText.split('\n');
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || !trimmed.startsWith('[')) continue;

                                // If it's a request tag (starts with REQUEST:), call Request.createFromTag and add to stage.requests
                                if (trimmed.toUpperCase().startsWith('[REQUEST:')) {
                                    console.log('Processing request tag:', trimmed);
                                    const request = Request.parseFromTag(trimmed, stage);
                                    if (request) {
                                        console.log('Added new request from tag:', request);
                                        requests.push(request);
                                    }
                                    continue;
                                }

                                // Process stat change tags
                                const statChangeRegex = /\[(.+?):\s*([^\]]+)\]/i;
                                const match = statChangeRegex.exec(trimmed);
                                if (match) {
                                    const target = match[1].trim();
                                    const payload = match[2].trim();

                                    if (target.toUpperCase() === 'STATION') {
                                        // Station stat changes
                                        const adjustments = payload.split(',').map(p => p.trim());
                                        for (const adj of adjustments) {
                                            const m = adj.match(/([A-Za-z\s]+)\s*([+-]\s*\d+)/i);
                                            if (!m) continue;
                                            const statNameRaw = m[1].trim();
                                            const num = parseInt(m[2].replace(/\s+/g, ''), 10) || 0;

                                            // Normalize stat name to possible Stat enum value if possible
                                            let statKey = statNameRaw.toLowerCase().trim();
                                            const enumMatch = Object.values(Stat).find(s => s.toLowerCase() === statKey || s.toLowerCase().includes(statKey) || statKey.includes(s.toLowerCase()));
                                            if (enumMatch) statKey = enumMatch;

                                            if (!statChanges['STATION']) statChanges['STATION'] = {};
                                            statChanges['STATION'][statKey] = (statChanges['STATION'][statKey] || 0) + num;
                                        }
                                    } else {
                                        // Character stat changes
                                        // Find matching present actor using namesMatch
                                        const presentActors: Actor[] = Object.values(stage.getSave().actors).filter(a => a.locationId === (skit.moduleId || ''));
                                        const matched = presentActors.find(a => namesMatch(a.name.toLowerCase(), target.toLowerCase()));
                                        if (!matched) continue;

                                        const adjustments = payload.split(',').map(p => p.trim());
                                        for (const adj of adjustments) {
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
                                    }
                                }
                            }
                        }
                    })());
                }
                
                // Wait for all TTS generation to complete
                await Promise.all(ttsPromises);

                // Attach endScene and endProperties to the final entry if the scene ended
                if (endScene && scriptEntries.length > 0) {
                    const finalEntry = scriptEntries[scriptEntries.length - 1];
                    finalEntry.endScene = true;
                }

                skit.endProperties = statChanges;
                skit.requests = requests;

                return { entries: scriptEntries, endScene: endScene, statChanges: statChanges, requests: requests };
            }
        } catch (error) {
            console.error('Error generating skit script:', error);
        }
        retries--;
    }
    return { entries: [], endScene: false, statChanges: {}, requests: [] };
}


export default {
    SkitType: SkitType
};

