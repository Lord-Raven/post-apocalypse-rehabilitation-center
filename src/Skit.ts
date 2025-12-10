import Actor, { getStatDescription, findBestNameMatch, Stat, namesMatch } from "./actors/Actor";
import { Emotion, EMOTION_SYNONYMS } from "./actors/Emotion";
import { getStatRating, STATION_STAT_PROMPTS, StationStat } from "./Module";
import { Stage } from "./Stage";

export enum SkitType {
    BEGINNING = 'BEGINNING',
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
    movements?: {[actorId: string]: string}; // actor ID -> new module ID
}

export interface SkitData {
    type: SkitType;
    moduleId: string;
    actorId?: string;
    initialActorLocations?: {[actorId: string]: string}; // Initial actor locations at the start of the skit.
    script: ScriptEntry[];
    generating?: boolean;
    context: any;
    summary?: string;
    endProperties?: { [actorId: string]: { [stat: string]: number } }; // Stat changes to apply when scene ends
    endFactionChanges?: { [actorId: string]: string }; // Faction ID changes to apply when scene ends ('' for PARC)
    endRoleChanges?: { [actorId: string]: string }; // Role changes to apply when scene ends (role name or '' for None)
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
 * Helper function to determine the current set of actors present in a module at a given script index.
 * Walks through the script from the beginning, applying movement changes.
 * @param skit - The skit data
 * @param moduleId - The module to check presence in (defaults to skit.moduleId)
 * @param upToIndex - Process script entries up to (but not including) this index. -1 means process all.
 * @returns Set of actor IDs currently present in the module
 */
function getCurrentActorsInScene(skit: SkitData, moduleId?: string, upToIndex: number = -1): Set<string> {
    const targetModuleId = moduleId || skit.moduleId;
    // Start with initial actor locations
    const currentLocations = {...(skit.initialActorLocations || {})};
    const endIndex = Math.min(skit.script.length, upToIndex === -1 ? skit.script.length : upToIndex);
    
    // Apply movements from script entries
    for (let i = 0; i < endIndex; i++) {
        const entry = skit.script[i];
        if (entry?.movements) {
            Object.entries(entry.movements).forEach(([actorId, newLocationId]) => {
                currentLocations[actorId] = newLocationId;
            });
        }
    }
    
    // Return actors at the target module
    const presentActors = new Set<string>();
    Object.entries(currentLocations).forEach(([actorId, locationId]) => {
        if (locationId === targetModuleId) {
            presentActors.add(actorId);
        }
    });
    
    return presentActors;
}

/**
 * Process a movement tag and return the destination module/faction ID if valid.
 * @param rawTag - The raw tag content (without brackets)
 * @param stage - The Stage object for accessing save data and layout
 * @param skit - The current skit data
 * @returns An object with actorId and destinationId, or null if invalid
 */
function processMovementTag(rawTag: string, stage: Stage, skit: SkitData): { actorId: string; destinationId: string } | null {
    // Look for movement tags: [Character Name moves to Module Name]
    const movementRegex = /^([^[\]]+?)\s+moves\s+to\s+(.+)$/i;
    const movementMatch = movementRegex.exec(rawTag);
    if (!movementMatch) return null;
    
    const characterName = movementMatch[1].trim();
    const destinationName = movementMatch[2].trim();
    
    // Find matching actor using findBestNameMatch
    const allActors: Actor[] = Object.values(stage.getSave().actors);
    const matched = findBestNameMatch(characterName, allActors);
    if (!matched) {
        console.warn(`Could not find actor matching: ${characterName}`);
        return null;
    }
    
    // Resolve destination module
    let destinationModuleId = '';
    
    // Check if it's a quarters reference (e.g., "Susan's quarters" or "quarters")
    const quartersMatch = /^(.+?)'s\s+quarters$/i.exec(destinationName);
    if (quartersMatch) {
        // Specific character's quarters
        const quartersOwnerName = quartersMatch[1].trim();
        const quartersOwner = findBestNameMatch(quartersOwnerName, allActors);
        if (quartersOwner) {
            // Find the quarters module owned by this actor
            const quartersModule = stage.getLayout().getModulesWhere(m => 
                m.type === 'quarters' && m.ownerId === quartersOwner.id
            )[0];
            if (quartersModule) {
                destinationModuleId = quartersModule.id;
            } else {
                console.warn(`${quartersOwner.name} has no quarters assigned`);
            }
        } else {
            console.warn(`Could not find quarters owner: ${quartersOwnerName}`);
        }
    } else if (destinationName.toLowerCase().endsWith('quarters')) {
        // Character's own quarters (if they have any)
        const ownQuarters = stage.getLayout().getModulesWhere(m => 
            m.type === 'quarters' && m.ownerId === matched.id
        )[0];
        if (ownQuarters) {
            destinationModuleId = ownQuarters.id;
        } else {
            console.warn(`${matched.name} has no quarters assigned`);
        }
    } else if (['here', 'this module', 'this location', 'this area', 'current module'].includes(destinationName.toLowerCase())) {
        // Move to current skit module
        destinationModuleId = skit.moduleId || '';
    } else {
        // Try to find a module by type name
        const targetModule = stage.getLayout().getModulesWhere(m => namesMatch(destinationName, m.type))[0];
        if (targetModule) {
            destinationModuleId = targetModule.id;
        } else {
            // If no module found, check if it matches a faction name
            const matchingFaction = Object.values(stage.getSave().factions).find(faction =>
                namesMatch(destinationName, faction.name)
            );
            if (matchingFaction) {
                destinationModuleId = matchingFaction.id;
                console.log(`Movement detected: ${matched.name} moves to faction ${matchingFaction.name} (${matchingFaction.id})`);
            } else {
                console.warn(`Could not find module or faction matching: ${destinationName}`);
            }
        }
    }
    
    // Return movement data if valid destination found
    if (destinationModuleId) {
        if (!stage.getSave().factions[destinationModuleId]) {
            // Only log for modules, not factions (already logged above)
            console.log(`Movement detected: ${matched.name} moves to ${destinationName} (${destinationModuleId})`);
        }
        return { actorId: matched.id, destinationId: destinationModuleId };
    }
    
    return null;
}

export function generateSkitPrompt(skit: SkitData, stage: Stage, historyLength: number, instruction: string): string {
    const playerName = stage.getSave().player.name;
    const save = stage.getSave();

    // Initialize skit with all actor locations if this is the first generation
    if (skit.script.length === 0) {
        skit.initialActorLocations = {};
        Object.values(save.actors).forEach(a => {
            skit.initialActorLocations![a.id] = a.locationId;
        });
    }

    // Determine present and absent actors for this moment in the skit (as of the last entry in skit.script):
    const presentActorIds = getCurrentActorsInScene(skit, skit.moduleId, -1);
    const presentPatients = Object.values(save.actors).filter(a => presentActorIds.has(a.id) && !a.factionId);
    const absentPatients = Object.values(save.actors).filter(a => !presentActorIds.has(a.id) && !a.factionId && save.aide.actorId != a.id);
    const awayPatients = Object.values(save.actors).filter(a => !a.factionId && a.isOffSite(save));

    // Update participation counts if this is the start of the skit
    if (skit.script.length === 0) {
        // Increment participation count for present actors
        presentPatients.forEach(a => {
            a.participations = (a.participations || 0) + 1;
        });
    }

    let pastSkits = save.timeline?.filter(event => event.skit).map(event => event.skit as SkitData) || []
    pastSkits = pastSkits.filter((v, index) => index > (pastSkits.length || 0) - historyLength);
    const module = save.layout.getModuleById(skit.moduleId || '');
    const moduleOwner = module?.ownerId ? save.actors[module.ownerId] : null;
    const faction = skit.context.factionId ? save.factions[skit.context.factionId] : null;
    const factionRepresentative = faction ? save.actors[faction.representativeId || ''] : null;
    const stationAide = save.actors[save.aide.actorId || ''];

    let fullPrompt = `{{messages}}\nPremise:\nThis is a sci-fi visual novel game set on a space station that resurrects and rehabilitates patients who died in other universes' apocalypses: ` +
        `the Post-Apocalypse Rehabilitation Center. ` +
        `The thrust of the game positions the player character, ${playerName}, as the Director of the PARC station, interacting with patients and crew as they navigate this complex futuristic universe together. ` +
        `The PARC is an isolated station near a black hole, from which it pulls and reconsitutes the echoes of apocalypse victims. It serves as both sanctuary and containment for its diverse inhabitants, who hail from various alternate realities. ` +
        `${playerName} is the only non-patient aboard the station (although they may hire patients on as crew or staff); as a result, the station may feel a bit lonely or alienating at times. ` +
        `Much of the day-to-day maintenance and operation of the station is automated by the station's AI, ${save.aide.name || 'StationAide™'}, and various drones, enabling ${playerName} to focus on patient care and rehabilitation.` +
        (save.stationStats ? (
            `\n\nThe PARC's current stats and impacts:\n` +
            Object.values(StationStat).map(stat => `  ${stat.toUpperCase()} (${save.stationStats?.[stat] || 3}): ${STATION_STAT_PROMPTS[stat][getStatRating(save.stationStats?.[stat] || 3)]}`).join('\n')
        ) : '') +
        (
            // If module is a quarters, present it as "Owner's quarters" or "vacant quarters": module type otherwise.
            `\n\nThe PARC's Current Modules (Rooms) and associated crew roles:\n` +
            save.layout.getModulesWhere(module => true).map(module => module.type == 'quarters' ? 
                (module.ownerId ? `${save.actors[module.ownerId]?.name || 'Unknown'}'s quarters` : 'vacant quarters') : 
                `${module.type} (Role: ${module.getAttribute('role') || 'None'})`).join(', ')
        ) +
        `\n\n${playerName}'s profile: ${save.player.description}` +
        (stationAide ? (presentActorIds.has(stationAide.id) ? `\n\nThe holographic StationAide™ ${stationAide.name} is active in the scene. Profile: ${stationAide.profile}` : '\n\nThe holographic StationAide™ ${stationAide.name} remains absent from the scene unless summoned by the Director.') : '') +
        // List characters who are here, along with full stat details:
        `\n\nPresent Characters:\n${presentPatients.map(actor => {
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Days Aboard: ${save.day - actor.birthDay}\n  Scene Participation: ${actor.participations}\n` +
            (roleModule ? `  Role: ${roleModule.getAttribute('role') || 'Patient'} (${actor.heldRoles[roleModule.getAttribute('role') || 'Patient'] || 0} days)\n` : '') +
            `  Role Description: ${roleModule?.getAttribute('roleDescription') || 'This character has no assigned role aboard the PARC. They are to focus upon their own needs.'}\n` +
            `  Stats:\n    ${Object.entries(actor.stats).map(([stat, value]) => `${stat}: ${value}`).join('\n    ')}`}).join('\n')}` +
        // List non-present characters for reference; just need description and profile:
        `\n\nAbsent Characters:\n${absentPatients.map(actor => {
            // Roll name and current location
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            const module = save.layout.getModuleById(actor.locationId);
            const locationString = module ? (module.type === 'quarters' ? (module.ownerId === actor.id ? ' Their Quarters' : (`${save.actors[module.ownerId || ''] || 'Someone'}'s Quarters`)) : module.type) : 'Unknown'
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Role: ${roleModule?.getAttribute('role') || 'Patient'}\n  Location: ${locationString}`;
        }).join('\n')}` +
        // List away characters for reference; just need description and profile:
        `\n\nOff-Station Characters:\n${awayPatients.map(actor => {
            // Just role name and faction on loan to
            const roleModule = stage.getLayout().getModulesWhere((m: any) => 
                m && m.type !== 'quarters' && m.ownerId === actor.id
            )[0];
            const atFaction = save.factions[actor.locationId];
            return `${actor.name}\n  Description: ${actor.description}\n  Profile: ${actor.profile}\n  Role: ${roleModule?.getAttribute('role') || 'Patient'}\n  On Assignment to: ${atFaction?.name || 'Unknown Faction'}`;
        }).join('\n')}` +
        // List stat meanings, for reference:
        `\n\nStats:\n${Object.values(Stat).map(stat => `${stat.toUpperCase()}: ${getStatDescription(stat)}`).join('\n')}` +
        `\n\nScene Prompt:\n${generateSkitTypePrompt(skit, stage, skit.script.length > 0)}` +
        (faction ? `\n\n${faction.name} Details: ${faction.description}\n${faction.name} Aesthetic: ${faction.visualStyle}` : '') +
        (factionRepresentative ? `\n${faction?.name || 'The faction'}'s representative, ${factionRepresentative.name}, appears on-screen. Their description: ${factionRepresentative.description}` : 'They have no designated liaison for this communication; any characters introduced during this scene will be transient.') +
        (faction ? `\nThis skit may explore the nature of this faction's relationship with an intentions for the Director, the PARC, or its patients. ` +
            `Typically, this and other faction contact the PARC to express interest in making offers for resources, information, or patients. ` +
            `The faction could have a temporary job to offer a patient, or suggest an exchange of resources or favors. Or they could have a permanent role in mind for an ideal candidate patient. ` +
            `If a patient is already on-loan to this faction, use this opportunity to update the Director on their status, depict the patient's return, or convert them to a permanent placement with the faction. ` +
            `Remember to use appropriate tags when moving characters on- or off-station. ` : '') +
        `\n\nKnown Factions: \n${Object.values(stage.getSave().factions).map(faction => `${faction.name}: ${faction.getReputationDescription()}`).join('\n')}` +
        (module ? (`\n\nModule Details:\n  This scene is set in ` +
            `${module.type === 'quarters' ? `${moduleOwner ? `${moduleOwner.name}'s` : 'a vacant'} quarters` : 
            `the ${module.type || 'Unknown'}`}. ${module.getAttribute('skitPrompt') || 'No description available.'}\n`) : '') +

        ((historyLength > 0 && pastSkits.length) ? 
            // Include last few skit scripts for context and style reference; use summary except for most recent skit or if no summary.
            '\n\nRecent Scenes for additional context:' + pastSkits.map((v, index) =>  {
            const module = stage.getSave().layout.getModuleById(v.moduleId || '');
            const moduleOwner = module?.ownerId ? stage.getSave().actors[module.ownerId] : null;
            const moduleDescription = module ? (module.type === 'quarters' && moduleOwner ? `${moduleOwner.name}'s quarters` : `the ${module.type}`) : 'an unknown location';
            return ((!v.summary || index == pastSkits.length - 1) ?
                (`\n\n  Script of Scene in ${moduleDescription} (${stage.getSave().day - v.context.day}) days ago:\n` +
                `System: ${buildScriptLog(v)}`) :
                (`\n\n  Summary of scene in ${moduleDescription} (${stage.getSave().day - v.context.day}) days ago:\n` + v.summary)
                )}).join('') :
            '') +
        `\n\n${instruction}`;
    return fullPrompt;
}

export async function generateSkitScript(skit: SkitData, stage: Stage): Promise<{ entries: ScriptEntry[]; endScene: boolean; statChanges: { [actorId: string]: { [stat: string]: number } } }> {

    // There are two optional phrases for gently/more firmly prodding the model toward wrapping up the scene, and then we calculate one to show based on the skit.script.length and some randomness:
    const wrapUpPhrases = [
        `\n\nPriority Instruction: Consider whether the scene can reach a natural stopping point or suspended moment where it might employ a "[SUMMARY]" tag.`, // Gently prod toward and ending.
        `\n\nCritical Instruction: This scene is running long and needs a summary. Finish the immediate beat and include a "[SUMMARY]" tag.` // Firmer prod
    ];

    // Use script length + random(1, 8) > 16 for gentle or > 26 for firm.
    const scriptLengthFactor = skit.script.length > 0 ? (skit.script.length + Math.floor(Math.random() * 8) + 1) : 0;
    const wrapupPrompt = scriptLengthFactor > 26 ? wrapUpPhrases[1] : (scriptLengthFactor > 16 ? wrapUpPhrases[0] : '');


    // Retry logic if response is null or response.result is empty
    let retries = 3;
    while (retries > 0) {
        try {
            const fullPrompt = generateSkitPrompt(skit, stage, 2 + retries * 2, // 8 history entries on first try, reducing by two each iteration.
                `Example Script Format:\n` +
                    `System: CHARACTER NAME: Character Name does some actions in prose. They say, "My dialogue is in quotation marks."\n` +
                    `ANOTHER CHARACTER NAME: [ANOTHER CHARACTER NAME EXPRESSES JOY][CHARACTER NAME EXPRESSES SURPRISE] "Even if my entire input is dialogue, it should be in quotation marks."\n` +
                    `NARRATOR: [CHARACTER NAME EXPRESSES RELIEF] Descriptive content or other scene events occurring around you, the user, can be attributed to a narrator.\n` +
                    `${stage.getSave().player.name.toUpperCase()}: I'm the player, and my entries use first-person narrative voice, while other skit narration uses second-person to refer to me.\n[PAUSE]\n` +
                `Example Character Movement Format:\n` +
                    `System: NARRATOR: [CHARACTER NAME moves to THIS MODULE NAME] Character Name enters the room.\n` +
                    `CHARACTER NAME: Character Name waves, "Hey; just checking in. I'll be next door if you need anything."\n` +
                    `NARRATOR: [CHARACTER NAME moves to OTHER CHARACTER\'s QUARTERS] Character Name ducks out with a smile. You hear their boots fade away down the corridor beyond.\n[PAUSE]\n` +
                `Example Character Departure from PARC Format:\n` +
                    `System: CHARACTER NAME: They sigh profoundly. "Well, I suppose this is goodbye for now." They wave as they somberly step through the bulkhead.\n` +
                    `NARRATOR: [CHARACTER NAME moves to FACTION NAME] You watch on-screen as Character Name's shuttle detaches from the PARC and disappears into the stars.\n` +
                    `[SUMMARY: Character Name has departed the PARC, on loan to FACTION NAME for (mission description here).]\n` +
                (skit.script.length > 0 ? (`Example Summary Script Format:\n` +
                    `System: CHARACTER NAME: [CHARACTER NAME EXPRESSES OPTIMISM] Character Name smiles at you. "I think we made real progress here today. Thanks!"\n` +
                    `NARRATOR: There's a moment of real connection there. Something the PARC could use more of.\n` +
                    `[SUMMARY: This moment of shared commaraderie has left Character Name hopeful about their future aboard the PARC.]\n`) : '') +
                `\nCurrent Scene Script Log to Continue:\nSystem: ${buildScriptLog(skit)}` +
                `\n\nPrimary Instruction:\n` +
                `At the "System:" prompt, ${skit.script.length == 0 ? 'produce the initial moments of a scene (perhaps implied in medias res)' : 'extend or conclude the current scene script'} with three or four entries, ` +
                `based upon the Premise and the specified Scene Prompt. Primarily involve the Present Characters, although Absent Characters may be moved to this location using appropriate tags. ` +
                `The script should consider characters' stats, relationships, past events, and the station's stats—among other factors—to craft a compelling scene. ` +
                `\nFollow the structure of the strict Example Script formatting above: ` +
                `actions are depicted in prose and character dialogue in quotation marks. Character's present their own actions and dialogue, while events within the scene are attributed to a NARRATOR. ` +
                `While a loose script format is employed, the actual content should be professionally edited narrative prose.\n` +
                `Embedded within this script, you may employ special tags to trigger various game mechanics. ` +
                `Emotion tags (e.g., "[CHARACTER NAME EXPRESSES JOY]") should be used to indicate visible emotional shifts in a character's appearance. ` +
                `A [PAUSE] tag can be used to signal a suspension of this excerpt without fully ending the scene, in case the three- or four-entry quota has already been met. ` +
                `Character movement tags (e.g., "[CHARACTER NAME moves to MODULE NAME]" or "[CHARACTER NAME moves to FACTION NAME]") should be used to indicate when a character moves to a different module on the station OR to a different faction (this is done by faction name, without further granularity). ` +
                `MODULE NAME should be the name of a module type (e.g., 'comms', 'infirmary', 'lounge'), a character's quarters (e.g., 'Susan's quarters' or just 'quarters' for their own), or simply "Here" to move to the scene's location or "Another module" to leave this area. ` +
                `A faction move is a more significant event, indicating a departure from the PARC itself. ` +
                `The game engine uses these tags to update character locations and visually display character presence in scenes. The scene itself cannot transition to a new area, but individual characters may come and go. ` +
                (skit.script.length > 0 ? (`If a scene transition is desired, the current scene must first be summarized. ` +
                    `A "[SUMMARY]" tag (e.g., "[SUMMARY: Brief summary of the scene's events with key details.]") should be included when the scene has fulfilled the current Scene Prompt or reached a conclusive moment. `) : '') +
                `\nThis scene is a brief visual novel skit within a video game; as such, the scene avoids major developments which would fundamentally alter the mechanics or nature of the game, ` +
                `instead developing content within the existing rules. ` +
                `Generally, focus upon interpersonal dynamics, character growth, faction relationships, and the state of the Station and its inhabitants.` +
                (skit.script.length > 0 ? (`\nWhen the script completes a full story beat, indicates a scene change, or includes an implied closure, ` +
                `remember to insert a "[SUMMARY: A brief synopsis of this scene's key events.]" tag, so the game engine can store the summary.${wrapupPrompt}`) : '')
            );

            const response = await stage.generator.textGen({
                prompt: fullPrompt,
                min_tokens: 10,
                max_tokens: 500,
                include_history: true,
                stop: ['[PAUSE]']
            });
            if (response && response.result && response.result.trim().length > 0) {
                // First, detect and parse any tags that may be embedded in the response.
                let text = response.result;
                let endScene = false;
                let summary = undefined;

                // Remove any initial "System:" prefix
                if (text.toLowerCase().startsWith('system:')) {
                    text = text.slice(7).trim();
                }

                // Parse response based on format "NAME: content"; content could be multi-line. We want to ensure that lines that don't start with a name are appended to the previous line.
                const lines = text.split('\n');
                const combinedLines: string[] = [];
                const combinedEmotionTags: {emotions: {[key: string]: Emotion}, movements: {[actorId: string]: string}}[] = [];
                let currentLine = '';
                let currentEmotionTags: {[key: string]: Emotion} = {};
                let currentMovements: {[actorId: string]: string} = {};
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
                    const newMovements: {[actorId: string]: string} = {};

                    // Prepare list of all actors (not just present)
                    const allActors: Actor[] = Object.values(stage.getSave().actors);
                    
                    // Process tags in the line
                    for (const tag of trimmed.match(/\[[^\]]+\]/g) || []) {
                        const raw = tag.slice(1, -1).trim();
                        if (!raw) continue;

                        console.log(`Processing tag: ${raw}`);
                        
                        // Process movement tags using the shared function
                        const movementResult = processMovementTag(raw, stage, skit);
                        if (movementResult) {
                            newMovements[movementResult.actorId] = movementResult.destinationId;
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
                                movements: currentMovements
                            });
                        }
                        currentLine = trimmed;
                        currentEmotionTags = newEmotionTags;
                        currentMovements = newMovements;
                    } else {
                        // Continuation of previous line
                        currentLine += '\n' + trimmed;
                        currentEmotionTags = {...currentEmotionTags, ...newEmotionTags};
                        currentMovements = {...currentMovements, ...newMovements};
                    }
                }
                if (currentLine) {
                    combinedLines.push(currentLine.trim());
                    combinedEmotionTags.push({
                        emotions: currentEmotionTags,
                        movements: currentMovements
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
                    if (tagData.movements && Object.keys(tagData.movements).length > 0) {
                        entry.movements = tagData.movements;
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
                    if (!actor || !entry.message.includes('"') || stage.getSave().disableTextToSpeech) {
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
                const factionChanges: { [actorId: string]: string } = {};
                const roleChanges: { [actorId: string]: string } = {};
                // If this response contains an endScene, we will analyze the script for stat changes or other game mechanics to be applied. Add this to the ttsPromises to run in parallel.
                if (endScene) {
                    console.log('Scene end predicted; preparing to analyze for stat changes.');

                    ttsPromises.push((async () => {
                        const analysisPrompt = generateSkitPrompt(skit, stage, 0,
                            `Scene Script:\nSystem: ${buildScriptLog(skit)}` +
                            `\n\nPrimary Instruction:\nAnalyze the preceding scene script and output formatted tags in brackets, identifying the following categorical changes to be inorporated into the game. ` +
                            `\n\n---` +
                            `\nCharacter Stat Changes:\nIdentify any changes to character stats implied by the scene. For each change, output a line in the following format:\n` +
                            `[CHARACTER NAME: <stat> +<value>(, ...)]` +
                            `Where <stat> is the name of the stat to be changed, and <value> is the amount to increase or decrease the stat by (positive or negative). ` +
                            `Multiple stat changes can be included in a single tag, separated by commas. Similarly, multiple character tags can be provided in the output.` +
                            `Full Examples:\n` +
                            `[${Object.values(stage.getSave().actors)[0].name}: brawn +1, charm +2]\n` +
                            `[${Object.values(stage.getSave().actors)[0].name}: lust -1]\n` +
                            `\n\nStation Stat Changes:\nIdentify any changes to PARC station stats implied by the scene. For each change, output a line in the following format:\n` +
                            `[STATION: <stat> +<value>(, ...)]` +
                            `Where <stat> is the name of the station stat to be changed, and <value> is the amount to increase or decrease the stat by (positive or negative). ` +
                            `Multiple stat changes can be included in a single tag, separated by commas.` +
                            `Full Examples:\n` +
                            `[STATION: Systems +2, Comfort +1]\n` +
                            `[STATION: Security -1]` +

                            `\n---` +
                            `\nFaction Reputation Changes:\n` +
                            `Identify any changes to faction reputations implied by the scene. For each change, output a line in the following format:\n` +
                            `[FACTION: <factionName> +<value>]\n` +
                            `Where <factionName> is the name of the faction whose reputation is changing, and <value> is the amount to increase or decrease the reputation by (positive or negative). ` +
                            `Reputation is a value between 1 and 10, and changes are incremental. If the faction is cutting ties, provide a large negative value. ` +
                            `Multiple faction tags can be provided in the output if, for instance, improving the esteem of one faction inherently reduces the opinion of a rival.` +
                            `Full Examples:\n` +
                            `[FACTION: Stellar Concord +1]\n` +
                            `[FACTION: Shadow Syndicate -2]\n` +

                            `\n---` +
                            `\nCharacter Faction Change:\n` +
                            `If a character has changed faction affiliations in the scene, output a line in the following format:\n` +
                            `[CHARACTER NAME: JOINED <factionName or PARC>]\n` +
                            `Where <factionName or PARC> is the name of the faction the character has joined, or "PARC" if they have left a faction to join the station itself. ` +
                            `Full Examples:\n` +
                            `[${Object.values(stage.getSave().actors)[0].name}: JOINED Stellar Concord]\n` +
                            `[${Object.values(stage.getSave().actors)[0].name}: JOINED PARC]` +
                            `\n\nThis tag indicates an official change in allegiance or ownership/possession of the named character. ` +
                            `Consider this tag when the script depicts: ` +
                            `\n - A patient taking a permanent position with a faction.` +
                            `\n - A faction representative defecting to the PARC.` +
                            `\n - A character being formally recruited or dismissed.` +
                            `\n - A character being sold to or imprisoned by a faction.` +

                            `\n---\nCharacter Role Change:\n` +
                            `If a character's role on the station changes as a result of this scene (e.g., a patient has been assigned to a staff position), output a line in the following format:\n` +
                            `[CHARACTER NAME: ROLE <roleName>]\n` +
                            `Where <roleName> is the name of the new role assigned to the character. ` +
                            `Full Example:\n` +
                            `[${Object.values(stage.getSave().actors)[0].name}: ROLE Liaison]\n` +
                            `[${Object.values(stage.getSave().actors)[0].name}: ROLE None]\n` +
                            `The role name must directly match an existing role defined by the station's current modules (or "None," if a character's role is being removed by this tag).` +

                            `\n---\nCharacter Movement/Departure:\n` +
                            `If the scene depicts or implies that a character has departed the PARC or moved to a different faction (or such department is imminent), include any missing movement tags here.` +
                            `[CHARACTER NAME moves to <module name|FACTION NAME>]\n` +
                            `Full Example:\n` +
                            `[${Object.values(stage.getSave().actors)[0].name} moves to Stellar Concord]\n` +
                            `[${Object.values(stage.getSave().actors)[0].name} moves to Comms]\n` +
                            `These tags ensure that the gamestate location data reflects the scene's events; it is especially important to include movement tags for any characters leaving on or returning from missions; ` +
                            `remember that moving 'to' a faction is an abstract location representing a task on that faction's behalf.` +

                            (!summary ? 
                                `\n---\nSummarize Scene:\n` +
                                `"[SUMMARY: A brief synopsis of this scene's key events.]"` +
                                `The essential Summary tag must be used to describe the scene's key events.`
                                : ''
                            ) +

                            `\n\nFinal Instruction:\n` +
                            `Closely analyze the scene and output all suitable tags in this response. Stat changes should be a fair reflection of the scene's direct or implied events. ` +
                            `Bear in mind the somewhat abstract nature of character and station stats when determining reasonable changes. ` +
                            `All stats (station and character) exist on a scale of 1-10, with 1 being the lowest and 10 being the highest possible value; ` +
                            `typically, these changes should be minor (+/- 1 or 2) at a time, unless something incredibly dramatic occurs. ` +
                            `If there is little or no change, or all relevant tags have been presented, the response may be ended early with [END]. \n\n`
                        );
                        const requestAnalysis = await stage.generator.textGen({
                            prompt: analysisPrompt,
                            min_tokens: 50,
                            max_tokens: summary ? 300 : 500,
                            include_history: true,
                            stop: ['[END]']
                        });
                        console.log('Request analysis response:', requestAnalysis?.result);
                        if (requestAnalysis && requestAnalysis.result) {
                            const analysisText = requestAnalysis.result;

                            // Process analysisText for stat changes
                            const lines = analysisText.split('\n');
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || !trimmed.startsWith('[')) continue;

                                if (trimmed.toUpperCase().startsWith('[SUMMARY:')) {
                                    const summaryMatch = /\[SUMMARY:\s*([^\]]+)\]/i.exec(trimmed);
                                    summary = summaryMatch ? summaryMatch[1].trim() : undefined;
                                    console.log('Extracted summary from analysis:', summary);
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
                                            console.log(`Adding faction reputation change for ${matchedFaction.name}: ${reputationChange > 0 ? '+' : ''}${reputationChange}`);
                                        }
                                    }
                                    continue;
                                }

                                // Process character faction change tags: [CHARACTER NAME: JOINED <factionName or PARC>]
                                const joinedRegex = /\[(.+?):\s*JOINED\s+(.+?)\]/i;
                                const joinedMatch = joinedRegex.exec(trimmed);
                                if (joinedMatch) {
                                    console.log('Processing JOINED tag:', trimmed);
                                    const characterNameRaw = joinedMatch[1].trim();
                                    const factionNameRaw = joinedMatch[2].trim();
                                    
                                    // Find matching actor using findBestNameMatch
                                    const allActors = Object.values(stage.getSave().actors);
                                    const matchedActor = findBestNameMatch(characterNameRaw, allActors);
                                    
                                    if (matchedActor) {
                                        let newFactionId = '';
                                        
                                        // Check if joining PARC (empty factionId) or a specific faction
                                        if (factionNameRaw.toUpperCase() === 'PARC') {
                                            newFactionId = '';
                                        } else {
                                            // Find matching faction using findBestNameMatch
                                            const allFactions = Object.values(stage.getSave().factions);
                                            const matchedFaction = findBestNameMatch(factionNameRaw, allFactions);
                                            
                                            if (matchedFaction) {
                                                newFactionId = matchedFaction.id;
                                            }
                                        }
                                        
                                        // Store the faction change in factionChanges
                                        factionChanges[matchedActor.id] = newFactionId;
                                        console.log(`Adding faction change for ${matchedActor?.name}: ${newFactionId}`);
                                    }
                                    continue;
                                }

                                // Process character role change tags: [CHARACTER NAME: ROLE <roleName>]
                                const roleRegex = /\[(.+?):\s*ROLE\s+(.+?)\]/i;
                                const roleMatch = roleRegex.exec(trimmed);
                                if (roleMatch) {
                                    console.log('Processing ROLE tag:', trimmed);
                                    const characterNameRaw = roleMatch[1].trim();
                                    const roleNameRaw = roleMatch[2].trim();
                                    
                                    // Find matching actor using findBestNameMatch
                                    const allActors = Object.values(stage.getSave().actors);
                                    const matchedActor = findBestNameMatch(characterNameRaw, allActors);
                                    
                                    if (matchedActor) {
                                        // Store the role name (or empty string for 'None')
                                        const newRole = roleNameRaw.toUpperCase() === 'NONE' ? '' : roleNameRaw;
                                        console.log(`Adding role change for ${matchedActor?.name}: ${newRole}`);
                                        roleChanges[matchedActor.id] = newRole;
                                    }
                                    continue;
                                }

                                // Process movement tags using the shared function
                                const movementResult = processMovementTag(trimmed.slice(1, -1), stage, skit);
                                if (movementResult) {
                                    console.log('Processing movement tag from analysis:', trimmed);
                                    // Apply movement to the last script entry
                                    if (scriptEntries.length > 0) {
                                        const lastEntry = scriptEntries[scriptEntries.length - 1];
                                        if (!lastEntry.movements) {
                                            lastEntry.movements = {};
                                        }
                                        lastEntry.movements[movementResult.actorId] = movementResult.destinationId;
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
                                            console.log(`Normalizing station stat name for matching:${statKey}.`);
                                            const enumMatch = Object.values(StationStat).find(s => s.toLowerCase() === statKey || s.toLowerCase().includes(statKey) || statKey.includes(s.toLowerCase()));
                                            if (enumMatch) statKey = enumMatch;
                                            else continue; // Invalid station stat

                                            if (!statChanges['STATION']) statChanges['STATION'] = {};
                                            console.log(`Adding station stat change: ${statKey} ${num > 0 ? '+' : ''}${num}`);
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
                                            else continue; // Invalid character stat

                                            if (!statChanges[matched.id]) statChanges[matched.id] = {};
                                            console.log(`Adding stat change for ${matched.name}: ${statKey} ${num > 0 ? '+' : ''}${num}`);
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
                skit.endFactionChanges = factionChanges;
                skit.endRoleChanges = roleChanges;
                skit.summary = summary;

                return { entries: scriptEntries, endScene: endScene, statChanges: statChanges };
            }
        } catch (error) {
            console.error('Error generating skit script:', error);
        }
        retries--;
    }
    return { entries: [], endScene: false, statChanges: {} };
}


export default {
    SkitType: SkitType
};

