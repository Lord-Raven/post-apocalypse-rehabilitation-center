import Actor, { getStatDescription, findBestNameMatch, Stat } from "./actors/Actor";
import { Emotion, EMOTION_SYNONYMS } from "./actors/Emotion";
import { getStatRating, STATION_STAT_PROMPTS, StationStat } from "./Module";
import { Stage } from "./Stage";
import { Request } from "./factions/Request";

export enum SkitType {
    BEGINNING = 'BEGINNING',
    INTRO_CHARACTER = 'INTRO CHARACTER',
    VISIT_CHARACTER = 'VISIT CHARACTER',
    ROLE_ASSIGNMENT = 'ROLE ASSIGNMENT',
    FACTION_INTRODUCTION = 'FACTION INTRODUCTION',
    FACTION_INTERACTION = 'FACTION INTERACTION',
    REQUEST_FILL_ACTOR = 'REQUEST FILL ACTOR',
    REQUEST_FILL_STATION = 'REQUEST FILL STATION',
    NEW_MODULE = 'NEW MODULE',
    RANDOM_ENCOUNTER = 'RANDOM ENCOUNTER'
}

export interface ScriptEntry {
    speaker: string;
    message: string;
    speechUrl: string; // URL of TTS audio
    actorEmotions?: {[key: string]: Emotion}; // actor name -> emotion string
    endScene?: boolean; // Whether this entry marks the end of the scene
    arrivals?: string[]; // ActorIds arriving in this entry
    departures?: string[]; // ActorIds departing in this entry
}

export interface SkitData {
    type: SkitType;
    moduleId: string;
    actorId?: string;
    initialActorIds?: string[]; // Actors who are initially present at the start of the skit
    script: ScriptEntry[];
    generating?: boolean;
    context: any;
    requests?: Request[];
    summary?: string;
    endProperties?: { [actorId: string]: { [stat: string]: number } }; // Stat changes to apply when scene ends
}

export function generateSkitTypePrompt(skit: SkitData, stage: Stage, continuing: boolean): string {
    const actor = stage.getSave().actors[skit.actorId || ''];
    const module = stage.getSave().layout.getModuleById(skit.moduleId || '');
    const faction = stage.getSave().factions[skit.context.factionId || ''];
    const notHereText = 'This communication is being conducted via remote video link; no representative is physically present on the station. ';
    switch (skit.type) {
        case SkitType.BEGINNING:
            return !continuing ?
                `This scene introduces the beginning of the story, as the holographic StationAide™, ${stage.getSave().aide.name}, resurrects the player, ` +
                `${stage.getSave().player.name} from their echo chamber aboard the otherwise-abandoned PARC station ` +
                `and declares the player to be the new Director of said station. ${stage.getSave().aide.name} has been keeping the station stable but was unable to take on patients without a Director, ` +
                `so they are relieved to have someone take on the role once more and eager to get back to the business of rehabilitation. This scene must end before bringing any additional patients aboard; ` +
                `this process is handled via a separate game mechanic.` :
                `Continue this introductory scene, expanding on the initial situation and context as the holographic StationAide™, ${stage.getSave().aide.name}, ` +
                `welcomes the newly reconstituted ${stage.getSave().player.name} and names them the new Director of the otherwise-abandoned PARC. ` +
                `${stage.getSave().aide.name} should explain the PARC's core premise of bringing back characters from dead timelines and rehabilitating them. ` +
                `The holographic aide was unable to take on patients without a Director, so they are eager to get back to business, echofusing new patients and helping them find their place in this universe. ` +
                `Once the concept is established, use a "[SUMMARY]" tag to summarize the scene before moving on. This scene must end before bringing any additional patients aboard; ` +
                `this process is handled via a separate game mechanic; use the "[SUMMARY]" tag to summarize the events of this intro and end the scene before that occurs.`;
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
        case SkitType.REQUEST_FILL_ACTOR:
            return !continuing ?
                `This scene depicts an exchange between the player and ${faction?.name || 'a faction'} regarding the fulfillment of their request for a patient: ${actor?.name || 'a patient'}. ` +
                `${actor?.name || 'The patient'} is departing the PARC, for perhaps the last time. ${faction?.name || 'The faction'} will keep its word and honor the agreement. ` +
                `The PARC will be required to do the same.` :
                `Continue this scene, exploring ${actor?.name || 'a patient'}'s feelings on their departure from the PARC—likely forever. ` +
                `${faction?.name || 'The faction'} will keep its word and honor the agreement. The PARC will be required to do the same.`;
        case SkitType.REQUEST_FILL_STATION:
            return !continuing ?
                `This scene depicts an exchange between the player and ${faction?.name || 'a faction'} regarding the fulfillment of a request. ` +
                `${faction?.name || 'The faction'} will keep its word and honor the agreement. The PARC will be required to do the same.` :
                `Continue this scene describing the outcome of this request. ` +
                `${faction?.name || 'The faction'} will keep its word and honor the agreement. The PARC will be required to do the same.`;
        default:
            return '';
    }
}

function buildScriptLog(skit: SkitData): string {
        return skit.script && skit.script.length > 0 ?
        skit.script.map(e => {
            // Find the best matching emotion key for this speaker
            const emotionKeys = Object.keys(e.actorEmotions || {});
            const candidates = emotionKeys.map(key => ({ name: key }));
            const bestMatch = findBestNameMatch(e.speaker, candidates);
            const matchingKey = bestMatch?.name;
            const emotionText = matchingKey ? ` [${matchingKey} EXPRESSES ${e.actorEmotions?.[matchingKey]}]` : '';
            return `${e.speaker}:${e.message}${emotionText}`;
        }).join('\n')
        : '(None so far)';
}

/**
 * Helper function to determine the current set of actors present at a given script index.
 * Walks through the script from the beginning, applying arrivals and departures.
 * @param skit - The skit data
 * @param upToIndex - Process script entries up to (but not including) this index. -1 means process all.
 * @returns Set of actor IDs currently present
 */
function getCurrentActorsInScene(skit: SkitData, upToIndex: number = -1): Set<string> {
    const currentActors = new Set<string>(skit.initialActorIds || []);
    const endIndex = Math.max(skit.script.length, upToIndex === -1 ? skit.script.length : upToIndex);
    
    for (let i = 0; i < endIndex; i++) {
        const entry = skit.script[i];
        if (entry.arrivals) {
            entry.arrivals.forEach(actorId => currentActors.add(actorId));
        }
        if (entry.departures) {
            entry.departures.forEach(actorId => currentActors.delete(actorId));
        }
    }
    
    return currentActors;
}

/**
 * Validates whether an actor can logically arrive or depart at the current point in the script.
 * @param actorId - The actor's ID
 * @param isArrival - true for arrival, false for departure
 * @param skit - The skit data
 * @param currentScriptIndex - The index where this action would occur
 * @returns true if the action is valid, false otherwise
 */
function canActorArriveOrDepart(actorId: string, isArrival: boolean, skit: SkitData, currentScriptIndex: number): boolean {
    const currentActors = getCurrentActorsInScene(skit, currentScriptIndex);
    
    if (isArrival) {
        // Actor can arrive if they're not currently present
        return !currentActors.has(actorId);
    } else {
        // Actor can depart if they are currently present
        return currentActors.has(actorId);
    }
}

export function generateSkitPrompt(skit: SkitData, stage: Stage, historyLength: number, instruction: string): string {
    const playerName = stage.getSave().player.name;

    // Initialize skit with actors at the location if this is the first generation
    if (skit.script.length === 0) {
        
        skit.initialActorIds = Object.values(stage.getSave().actors).filter(a => a.locationId == skit.moduleId).map(a => a.id);
    }

    // Determine present and absent actors for this moment in the skit (as of the last entry in skit.script):
    const presentActorIds = getCurrentActorsInScene(skit, -1);
    const presentPatients = Object.values(stage.getSave().actors).filter(a => presentActorIds.has(a.id) && !a.remote);
    const absentPatients = Object.values(stage.getSave().actors).filter(a => !presentActorIds.has(a.id) && !a.remote);

    // Update participation counts if this is the start of the skit
    if (skit.script.length === 0) {
        // Increment participation count for present actors
        presentPatients.forEach(a => {
            a.participations = (a.participations || 0) + 1;
        });
    }

    let pastSkits = stage.getSave().timeline?.filter(event => event.skit).map(event => event.skit as SkitData) || []
    pastSkits = pastSkits.filter((v, index) => index > (pastSkits.length || 0) - historyLength);
    const module = stage.getSave().layout.getModuleById(skit.moduleId || '');
    const moduleOwner = module?.ownerId ? stage.getSave().actors[module.ownerId] : null;
    const faction = skit.context.factionId ? stage.getSave().factions[skit.context.factionId] : null;
    const factionRepresentative = faction ? stage.getSave().actors[faction.representativeId || ''] : null;
    const request = skit.context.requestId ? stage.getSave().requests[skit.context.requestId] : null;
    const stationAide = stage.getSave().actors[stage.getSave().aide.actorId || ''];

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
            Object.values(stage.getSave().requests).map(request => `-${stage.getSave().factions[request.factionId]?.name || 'Unknown Faction'}: ${request.description} \n  Requirement: ${request.getRequirementText(stage)} \n  Reward: ${request.getRewardText()}`).join('\n')
        ) : '') +
        `\n\n${playerName}'s profile: ${stage.getSave().player.description}` +
        (stationAide ? (presentActorIds.has(stationAide.id) ? `\n\nThe holographic StationAide™ ${stationAide.name} is active in the scene. Profile: ${stationAide.profile}` : '\n\nThe holographic StationAide™ ${stationAide.name} remains absent from the scene unless summoned by the Director.') : '') +
        // List characters who are here, along with full stat details:
        `\n\nPresent Characters:\n${presentPatients.map(actor => {
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Days Aboard: ${stage.getSave().day - actor.birthDay}\n  Scene Participation: ${actor.participations}\n` +
            (roleModule ? `  Role: ${roleModule.getAttribute('role') || 'Patient'} (${actor.heldRoles[roleModule.getAttribute('role') || 'Patient'] || 0} days)\n` : '') +
            `  Role Description: ${roleModule?.getAttribute('roleDescription') || 'This character has no assigned role aboard the PARC. They are to focus upon their own needs.'}\n` +
            `  Stats:\n    ${Object.entries(actor.stats).map(([stat, value]) => `${stat}: ${value}`).join('\n    ')}`}).join('\n')}` +
        // List non-present characters for reference; just need description and profile:
        `\n\nAbsent Characters:\n${absentPatients.map(actor => {
            // Just role name and not full details.
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Role: ${roleModule?.getAttribute('role') || 'Patient'}`;
        }).join('\n')}` +
        // List stat meanings, for reference:
        `\n\nStats:\n${Object.values(Stat).map(stat => `${stat.toUpperCase()}: ${getStatDescription(stat)}`).join('\n')}` +
        `\n\nScene Prompt:\n${generateSkitTypePrompt(skit, stage, skit.script.length > 0)}` +
        (request ? `\n\nRequest Details:\n  Description: ${request.description}\n  Requirement: ${request.getRequirementText(stage)}\n  Reward: ${request.getRewardText()}\n` : '') +
        (faction ? `\n\n${faction.name} Details: ${faction.description}\n${faction.name} Aesthetic: ${faction.visualStyle}` : '') +
        (factionRepresentative ? `\n${faction?.name || 'The faction'}'s representative, ${factionRepresentative.name}, appears on-screen. Their description: ${factionRepresentative.description}` : 'They have no designated liaison for this communication; any characters introduced during this scene will be transient.') +
        (faction ? `\nThis skit may explore the nature of this faction's relationship with and intentions for the Director, the PARC, or other characters present in the Comms module (if any). ` +
            `However, this and other factions generally contact the PARC to express interest or make offers: ` +
            `\n1) Most commonly, these are 'job' openings with certain character qualities (or limitations) in mind.` +
            `\n2) Sometimes, these 'job' offers target a specific patient of the PARC.` +
            `\n3) Finally, some offers are for other Station resources or exchanges; these are informed by the PARC's core stats, but typically presented in a narrative or abstract fashion.` +
            `\nAll requests come with some offer of compensation. Remember that a 'job' in this context may be something the Director can compel a patient into—not necessarily gainful employment. ` +
            `Although deals and offers are discussed in this skit, they can only be finalized through a separate game mechanic, so the skit should leave the offer open without confirming anything.` : '') +
        `\n\nKnown Factions: \n${Object.values(stage.getSave().factions).map(faction => `${faction.name}: ${faction.getReputationDescription()}`).join('\n')}` +
        (module ? (`\n\nModule Details:\n  This scene is set in ` +
            `${module.type === 'quarters' ? `${moduleOwner ? `${moduleOwner.name}'s` : 'a vacant'} quarters` : 
            `the ${module.type || 'Unknown'}`}. ${module.getAttribute('skitPrompt') || 'No description available.'}\n`) : '') +

        ((historyLength > 0 && pastSkits.length) ? 
            // Include last few skit scripts for context and style reference; use summary except for most recent skit or if no summary.
            '\n\nRecent Scenes for additional context:' + pastSkits.map((v, index) => 
            ((!v.summary || index == pastSkits.length - 1) ?
                (`\n\n  Script of Scene in ${stage.getSave().layout.getModuleById(v.moduleId || '')?.type || 'Unknown'} (${stage.getSave().day - v.context.day}) days ago:\n` +
                `System: ${buildScriptLog(v)}`) :
                (`\n\n  Summary of scene in ${stage.getSave().layout.getModuleById(v.moduleId || '')?.type || 'Unknown'} (${stage.getSave().day - v.context.day}) days ago:\n` + v.summary)
                )).join('') :
            '') +
        `\n\n${instruction}`;
    return fullPrompt;
}

export async function generateSkitScript(skit: SkitData, stage: Stage): Promise<{ entries: ScriptEntry[]; endScene: boolean; statChanges: { [actorId: string]: { [stat: string]: number } }; requests: Request[] }> {

    // There are two optional phrases for gently/more firmly prodding the model toward wrapping up the scene, and then we calculate one to show based on the skit.script.length and some randomness:
    const wrapUpPhrases = [
        `\n\nPriority Instruction: Consider whether the scene has reached or can reach a natural stopping point or suspended moment where it might employ a "[SUMMARY]" tag.`, // Gently prod toward and ending.
        `\n\nCritical Instruction: This scene is running long and needs a summary. Finish the immediate beat and include a "[SUMMARY]" tag.` // Firmer prod
    ];

    // Use script length + random(1, 10) > 12 for gentle or > 24 for firm.
    const scriptLengthFactor = skit.script.length > 0 ? (skit.script.length + Math.floor(Math.random() * 10) + 1) : 0;
    const wrapupPrompt = scriptLengthFactor > 24 ? wrapUpPhrases[1] : (scriptLengthFactor > 12 ? wrapUpPhrases[0] : '');


    // Retry logic if response is null or response.result is empty
    let retries = 3;
    while (retries > 0) {
        try {

            const fullPrompt = generateSkitPrompt(skit, stage, 2 + retries,
                `Example Script Format:\n` +
                'System: CHARACTER NAME: They do actions in prose. "Their dialogue is in quotation marks."\nANOTHER CHARACTER NAME: [ANOTHER CHARACTER NAME EXPRESSES JOY][CHARACTER NAME EXPRESSES SURPRISE] "Dialogue in quotation marks."\nNARRATOR: [CHARACTER NAME EXPRESSES RELIEF] Descriptive content that is not attributed to a character.' +
                `\n\nExample Character Movement Format:\n` +
                'System: NARRATOR: [CHARACTER NAME arrives] CHARACTER NAME enters the room.\nNARRATOR: [CHARACTER NAME departs] CHARACTER NAME leaves the scene.' +
                `\n\nExample Ending Script Format:\n` +
                'System: CHARACTER NAME: [CHARACTER NAME EXPRESSES OPTIMISM] Action in prose. "Dialogue in quotation marks."\nNARRATOR: A moment of prose describing events.' +
                (skit.script.length > 0 ? `\n[SUMMARY: CHARACTER NAME is hopeful about this demonstration.]` : '') +
                `\n\nCurrent Scene Script Log to Continue:\nSystem: ${buildScriptLog(skit)}` +
                `\n\nPrimary Instruction:\nAt the "System:" prompt, ${skit.script.length == 0 ? 'generate a short scene script' : 'extend or conclude the current scene script'} based upon the Premise and the specified Scene Prompt, ` +
                `involving the Present Characters (Absent Characters are listed for reference only). ` +
                `The script should consider characters' stats, relationships, past events, and the station's stats—among other factors—to craft a compelling scene. ` +
                `\nFollow the structure of the strict Example Script formatting above: ` +
                `actions are depicted in prose and character dialogue in quotation marks. Emotion tags (e.g. "[CHARACTER NAME EXPRESSES JOY]") should be used to indicate significant emotional shifts—` +
                `these cues will be utilized by the game engine to visually display appropriate character emotions. ` +
                `Character movement tags (e.g. "[CHARACTER NAME arrives]" or "[CHARACTER NAME departs]") should be used to indicate when an Absent Character (or the StationAide) joins the scene or a Present Character (or the StationAide) leaves; ` +
                `the game engine uses these tags to visually display character presence in the scene. ` +
                `These tags enable the game to track who is present throughout the scene. ` +
                (skit.script.length > 0 ? (`A "[SUMMARY]" tag (e.g., "[SUMMARY: Brief summary of the scene's events.]") should be included when the scene has fulfilled the current Scene Prompt or reached a conclusive moment before continuing with the script. `) : '') +
                `\nThis scene is a brief visual novel skit within a video game; as such, the scene avoids major developments which would fundamentally change the mechanics or nature of the game, ` +
                `instead developing content within the existing mechanics. ` +
                `Generally, focus upon interpersonal dynamics, character growth, faction relationships, and the state of the Station and its inhabitants.` +
                (skit.script.length > 0 ? (`\nWhen the script completes a full story beat, indicates a scene change, or includes an implied closure—or if the current script has already achieved a significant moment—, ` +
                `insert a "[SUMMARY: A brief synopsis of this scene's key events.]" tag, so the game engine can store the summary.${wrapupPrompt}`) : '')
            );


            const response = await stage.generator.textGen({
                prompt: fullPrompt,
                min_tokens: 10,
                max_tokens: 400,
                include_history: true
            });
            if (response && response.result && response.result.trim().length > 0) {
                // First, detect and parse any END tags and stat changes that may be embedded in the response.
                let text = response.result;
                let endScene = false;
                let summary = undefined;

                // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                const lines = text.split('\n');
                const combinedLines: string[] = [];
                const combinedEmotionTags: {emotions: {[key: string]: Emotion}, arrivals: string[], departures: string[]}[] = [];
                let currentLine = '';
                let currentEmotionTags: {[key: string]: Emotion} = {};
                let currentArrivals: string[] = [];
                let currentDepartures: string[] = [];
                for (const line of lines) {
                    // Skip empty lines
                    let trimmed = line.trim();

                    // First, look for an ending tag.
                    if (trimmed.startsWith('[SUMMARY')) {
                        console.log("Detected end scene tag.");
                        endScene = true;
                        const summaryMatch = /\[SUMMARY:\s*([^\]]+)\]/i.exec(trimmed);
                        summary = summaryMatch ? summaryMatch[1].trim() : undefined;
                        continue;
                    }

                    // If a line doesn't end with ], ., !, ?, or ", then it's likely incomplete and we should drop it.
                    if (!trimmed || ![']', '*', '_', ')', '.', '!', '?', '"', '\''].some(end => trimmed.endsWith(end))) continue;

                    const newEmotionTags: {[key: string]: Emotion} = {};
                    const newArrivals: string[] = [];
                    const newDepartures: string[] = [];

                    // Prepare list of all actors (not just present)
                    const allActors: Actor[] = Object.values(stage.getSave().actors);
                    
                    // Process tags in the line
                    for (const tag of trimmed.match(/\[[^\]]+\]/g) || []) {
                        const raw = tag.slice(1, -1).trim();
                        if (!raw) continue;

                        console.log(`Processing tag: ${raw}`);
                        
                        // Look for arrives tags: [Character Name arrives]
                        const arrivesRegex = /^([^[\]]+)\s+arrives$/i;
                        const arrivesMatch = arrivesRegex.exec(raw);
                        if (arrivesMatch) {
                            console.log(`Found arrives tag for ${arrivesMatch[1].trim()}`);
                            const characterName = arrivesMatch[1].trim();
                            // Find matching actor using findBestNameMatch
                            const matched = findBestNameMatch(characterName, allActors);
                            console.log(`Matched actor for ${characterName} arrival: ${matched ? matched.name : 'None'}`);
                            if (matched) {
                                // Validate if this actor can arrive (using current combined line index)
                                const currentIndex = combinedLines.length;
                                if (canActorArriveOrDepart(matched.id, true, skit, currentIndex)) {
                                    newArrivals.push(matched.id);
                                    console.log(`Detected arrival: ${matched.name}`);
                                } else {
                                    console.warn(`Invalid arrival for ${matched.name}: actor is already present`);
                                }
                            }
                            continue;
                        }
                        
                        // Look for departs tags: [Character Name departs]
                        const departsRegex = /^([^[\]]+)\s+departs$/i;
                        const departsMatch = departsRegex.exec(raw);
                        if (departsMatch) {
                            console.log(`Found departs tag for ${departsMatch[1].trim()}`);
                            const characterName = departsMatch[1].trim();
                            // Find matching actor using findBestNameMatch
                            const matched = findBestNameMatch(characterName, allActors);
                            console.log(`Matched actor for ${characterName} departure: ${matched ? matched.name : 'None'}`);
                            if (matched) {
                                // Validate if this actor can depart (using current combined line index)
                                const currentIndex = combinedLines.length;
                                if (canActorArriveOrDepart(matched.id, false, skit, currentIndex)) {
                                    newDepartures.push(matched.id);
                                    console.log(`Detected departure: ${matched.name}`);
                                } else {
                                    console.warn(`Invalid departure for ${matched.name}: actor is not present`);
                                }
                            }
                            continue;
                        }
                        
                        // Look for expresses tags:
                        const emotionTagRegex = /([^[\]]+)\s+EXPRESSES\s+([^[\]]+)/gi;
                        let emotionMatch = emotionTagRegex.exec(raw);
                        if (emotionMatch) {
                            const characterName = emotionMatch[1].trim();
                            const emotionName = emotionMatch[2].trim().toLowerCase();
                            // Find matching actor using findBestNameMatch
                            const matched = findBestNameMatch(characterName, allActors);
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
                            combinedEmotionTags.push({
                                emotions: currentEmotionTags,
                                arrivals: currentArrivals,
                                departures: currentDepartures
                            });
                        }
                        currentLine = trimmed;
                        currentEmotionTags = newEmotionTags;
                        currentArrivals = newArrivals;
                        currentDepartures = newDepartures;
                    } else {
                        // Continuation of previous line
                        currentLine += '\n' + trimmed;
                        currentEmotionTags = {...currentEmotionTags, ...newEmotionTags};
                        currentArrivals = [...currentArrivals, ...newArrivals];
                        currentDepartures = [...currentDepartures, ...newDepartures];
                    }
                }
                if (currentLine) {
                    combinedLines.push(currentLine.trim());
                    combinedEmotionTags.push({
                        emotions: currentEmotionTags,
                        arrivals: currentArrivals,
                        departures: currentDepartures
                    });
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
                    
                    // Remove any remaining tags
                    message = message.replace(/\[([^\]]+)\]/g, '').trim();
                    
                    const entry: ScriptEntry = { speaker, message, speechUrl: '' };
                    const tagData = combinedEmotionTags[index];
                    
                    if (tagData.emotions && Object.keys(tagData.emotions).length > 0) {
                        entry.actorEmotions = tagData.emotions;
                    }
                    if (tagData.arrivals && tagData.arrivals.length > 0) {
                        entry.arrivals = tagData.arrivals;
                    }
                    if (tagData.departures && tagData.departures.length > 0) {
                        entry.departures = tagData.departures;
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
                    const matched = findBestNameMatch(entry.speaker, presentActors);
                    if (matched) {
                        entry.speaker = matched.name;
                    }
                }

                // TTS for each entry's dialogue
                const ttsPromises = scriptEntries.map(async (entry) => {
                    const actor = findBestNameMatch(entry.speaker, Object.values(stage.getSave().actors));
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

                const statChanges: { [actorId: string]: { [stat: string]: number } } = {};
                const requests: Request[] = [];
                // If this response contains an endScene, we will analyze the script for requests, stat changes, or other game mechanics to be applied. Add this to the ttsPromises to run in parallel.
                if (endScene) {
                    console.log('Scene end predicted; preparing to analyze for requests and stat changes.');

                    ttsPromises.push((async () => {
                        const analysisPrompt = generateSkitPrompt(skit, stage, 0,
                            `Scene Script:\nSystem: ${buildScriptLog(skit)}` +
                            `\n\nPrimary Instruction:\nAnalyze the preceding scene script and output formatted tags in brackets, identifying the following categorical changes to be inorporated into the game. ` +
                            `\n\nCharacter Stat Changes:\nIdentify any changes to character stats implied by the scene. For each change, output a line in the following format:\n` +
                            `"[CHARACTER NAME: <stat> +<value>(, ...)]"` +
                            `Where <stat> is the name of the stat to be changed, and <value> is the amount to increase or decrease the stat by (positive or negative). ` +
                            `Multiple stat changes can be included in a single tag, separated by commas. Similarly, multiple character tags can be provided in the output.` +
                            `Full Examples:\n` +
                            `"[${Object.values(stage.getSave().actors)[0].name}: brawn +1, charm +2]"\n` +
                            `"[${Object.values(stage.getSave().actors)[0].name}: lust -1]"\n` +
                            `\n\nStation Stat Changes:\nIdentify any changes to PARC station stats implied by the scene. For each change, output a line in the following format:\n` +
                            `"[STATION: <stat> +<value>(, ...)]"` +
                            `Where <stat> is the name of the station stat to be changed, and <value> is the amount to increase or decrease the stat by (positive or negative). ` +
                            `Multiple stat changes can be included in a single tag, separated by commas.` +
                            `Full Examples:\n` +
                            `"[STATION: Systems +2, Comfort +1]"\n` +
                            `"[STATION: Security -1]"` +
                            `\n\nFaction Requests:\n` +
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
                            `   - Positive rewards that disinclude stats reduced by the requirements\n` +
                            `   - Example: Systems+2, Comfort+1\n` +
                            `Full Examples:\n` +
                            `"[REQUEST: Stellar Concord | We need a strong laborer | ACTOR brawn>=7, charm>=6 -> Systems+2, Comfort+1]"\n` +
                            `"[REQUEST: Shadow Syndicate | Return our missing operative | ACTOR-NAME Jane Doe -> Harmony+3]"\n` +
                            `"[REQUEST: Defense Coalition | Help us bolster our defenses | STATION Security-2, Harmony-1 -> Systems+2, Provision+2]"` +

                            `\n\nFaction Reputation Changes:\n` +
                            `Identify any changes to faction reputations implied by the scene. For each change, output a line in the following format:\n` +
                            `"[FACTION: <factionName> +<value>]"` +
                            `Where <factionName> is the name of the faction whose reputation is changing, and <value> is the amount to increase or decrease the reputation by (positive or negative). ` +
                            `Reputation is a value between 1 and 10, and changes are incremental. If the faction is cutting ties, provide a large negative value. ` +
                            `Multiple faction tags can be provided in the output if, for instance, improving the esteem of one faction inherently reduces the opinion of a rival.` +
                            `Full Examples:\n` +
                            `"[FACTION: Stellar Concord +1]"\n` +
                            `"[FACTION: Shadow Syndicate -2]"\n` +

                            (!summary ? 
                                `\n\nSummarize Scene:\n` +
                                `"[SUMMARY: A brief synopsis of this scene's key events.]"` +
                                `The Summary tag must be used to describe the scene's key events.`
                                : ''
                            ) +

                            `\n\nFinal Instruction:\n` +
                            `All suitable tags should be output in this response. Stat changes should be a fair reflection of the scene's direct or implied events. ` +
                            `Bear in mind the somewhat abstract meaning of character and station stats when determining reasonable changes and goals. ` +
                            `All stats (station and character) exist on a scale of 1-10, with 1 being the lowest and 10 being the highest possible value; ` +
                            `typically, these changes should be minor (+/- 1 or 2) at a time, unless something incredibly dramatic occurs. ` +
                            `If there is little or no change, or all relevant changes have been presented, the response may be ended early with [END]. \n\n`
                        );
                        const requestAnalysis = await stage.generator.textGen({
                            prompt: analysisPrompt,
                            min_tokens: 5,
                            max_tokens: summary ? 250 : 400,
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

                                if (trimmed.toUpperCase().startsWith('[SUMMARY:')) {
                                    const summaryMatch = /\[SUMMARY:\s*([^\]]+)\]/i.exec(trimmed);
                                    summary = summaryMatch ? summaryMatch[1].trim() : undefined;
                                    continue;
                                }

                                // Process faction reputation tags: [FACTION: <factionName> +<value>]
                                if (trimmed.toUpperCase().startsWith('[FACTION:')) {
                                    console.log('Processing faction reputation tag:', trimmed);
                                    const factionTagRegex = /\[FACTION:\s*([^+\-]+)\s*([+\-]\s*\d+)\]/i;
                                    const factionMatch = factionTagRegex.exec(trimmed);
                                    if (factionMatch) {
                                        const factionNameRaw = factionMatch[1].trim();
                                        const reputationChange = parseInt(factionMatch[2].replace(/\s+/g, ''), 10) || 0;
                                        
                                        // Find matching faction using findBestNameMatch
                                        const allFactions = Object.values(stage.getSave().factions);
                                        const matchedFaction = findBestNameMatch(factionNameRaw, allFactions);
                                        
                                        if (matchedFaction && reputationChange !== 0) {
                                            if (!statChanges['FACTION']) statChanges['FACTION'] = {};
                                            statChanges['FACTION'][matchedFaction.id] = (statChanges['FACTION'][matchedFaction.id] || 0) + reputationChange;
                                            matchedFaction.reputation = Math.max(0, Math.min(10, (matchedFaction.reputation || 5) + reputationChange));
                                            console.log(`Faction reputation change detected: ${matchedFaction.name} ${reputationChange > 0 ? '+' : ''}${reputationChange}`);
                                            // If reputation is 0, the faction will cut ties.
                                            if (matchedFaction.reputation <= 0) {
                                                console.log(`${matchedFaction.name} has cut ties with the PARC due to low reputation.`);
                                                stage.getSave().timeline?.push({
                                                    day: stage.getSave().day,
                                                    phase: stage.getSave().phase,
                                                    description: `The ${matchedFaction.name} has cut all ties with the PARC.`,
                                                    skit: undefined
                                                });
                                                matchedFaction.active = false;
                                                const requestsForRemoval = Object.values(stage.getSave().requests).filter(r => r.factionId === matchedFaction.id);
                                                for (const req of requestsForRemoval) {
                                                    delete stage.getSave().requests[req.id];
                                                }
                                            }
                                        }
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
                                        // Find matching present actor using findBestNameMatch
                                        const presentActors: Actor[] = Object.values(stage.getSave().actors).filter(a => a.locationId === (skit.moduleId || ''));
                                        const matched = findBestNameMatch(target, presentActors);
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
                skit.summary = summary;

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

