import { Stage } from "../Stage";
import { v4 as generateUuid } from 'uuid';
import Actor, { generatePrimaryActorImage, loadReserveActor } from "../actors/Actor";
import { AspectRatio } from "@chub-ai/stages-ts";

class Faction {
    id: string;
    name: string;
    fullPath: string = '';
    roles: string[] = [];
    description: string;
    visualStyle: string;
    themeColor: string;
    themeFont: string;
    reputation: number = 3; // 1-10, starts at 3
    active: boolean = false; // Whether the faction is still doing business with PARC
    representativeId: string | null = null;
    backgroundImageUrl: string = '';

    /**
     * Rehydrate a Faction from saved data
     */
    static fromSave(savedFaction: any): Faction {
        const faction = Object.create(Faction.prototype);
        Object.assign(faction, savedFaction);
        // Ensure active property exists (for backwards compatibility with older saves)
        if (faction.active === undefined) {
            faction.active = true;
        }
        return faction;
    }

    constructor(
        id: string,
        name: string,
        fullPath: string,
        description: string,
        visualStyle: string,
        roles: string[],
        themeColor: string,
        themeFont: string,
        reputation: number = 1,
        active: boolean = false
    ) {
        this.id = id;
        this.name = name;
        this.fullPath = fullPath;
        this.description = description;
        this.visualStyle = visualStyle;
        this.roles = roles;
        this.themeColor = themeColor;
        this.themeFont = themeFont;
        this.reputation = Math.max(0, Math.min(10, reputation)); // Clamp between 0-10 (0 means cutting ties)
        this.active = active;
    }

    /**
     * Get a prompt-style description of the PARC's relationship with this faction based on reputation
     */
    getReputationDescription(): string {
        if (this.reputation <= 0) {
            return 'They have cut ties with the PARC.';
        } else if (this.reputation <= 2) {
            return 'They have a low opinion of the PARC and consider the relationship strained.';
        } else if (this.reputation <= 4) {
            return 'They view the PARC with caution and maintain only necessary interactions.';
        } else if (this.reputation <= 6) {
            return 'They have a neutral, professional relationship with the PARC.';
        } else if (this.reputation <= 8) {
            return 'They regard the PARC favorably and maintain a positive working relationship.';
        } else {
            return 'They hold the PARC in high esteem and consider them a trusted partner.';
        }
    }
}

export async function loadReserveFaction(fullPath: string, stage: Stage): Promise<Faction|null> {
    const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', fullPath));
    const item = await response.json();
    const dataName = item.node.definition.name.replaceAll('{{char}}', item.node.definition.name).replaceAll('{{user}}', 'Individual X');
    
    // Similar banned word substitutes as Actor
    const bannedWordSubstitutes: {[key: string]: string} = {
        'underage': 'young adult',
        'adolescent': 'young adult',
        'youngster': 'young adult',
        'teen': 'young adult',
        'highschooler': 'young adult',
        'child': 'child',
        'toddler': 'toddler',
        'infant': 'infant',
        'kid': 'joke',
        'baby': 'honey',
        'minor': 'trivial',
        'old-school': 'retro',
        'high school': 'college',
        'school': 'college'
    };
    
    const data = {
        name: dataName,
        fullPath: item.node.fullPath,
        description: item.node.definition.description.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        personality: item.node.definition.personality.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
    };

    // Replace curly braces with parentheses
    data.name = data.name.replace(/{/g, '(').replace(/}/g, ')');
    data.description = data.description.replace(/{/g, '(').replace(/}/g, ')');
    data.personality = data.personality.replace(/{/g, '(').replace(/}/g, ')');

    // Apply banned word substitutions
    for (const [bannedWord, substitute] of Object.entries(bannedWordSubstitutes)) {
        const regex = new RegExp(bannedWord, 'gi');
        data.name = data.name.replace(regex, substitute);
        data.description = data.description.replace(regex, substitute);
        data.personality = data.personality.replace(regex, substitute);
    }

    // Check for banned words and non-english characters
    if (Object.keys(bannedWordSubstitutes).some(word => data.description.toLowerCase().includes(word) || data.personality.toLowerCase().includes(word) || data.name.toLowerCase().includes(word))) {
        console.log(`Immediately discarding faction due to banned words: ${data.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${data.name}${data.description}${data.personality}`)) {
        console.log(`Immediately discarding faction due to non-english characters: ${data.name}`);
        return null;
    }

    // Generate faction distillation using AI
    const generatedResponse = await stage.generator.textGen({
        prompt: `{{messages}}This is preparatory request for structured and formatted game content.` +
            `\n\nBackground: This game is a futuristic multiverse setting that pulls characters from across eras and timelines and settings. ` +
            `The player of this game, ${stage.getSave().player.name}, manages a space station called the Post-Apocalypse Rehabilitation Center, or PARC, which resurrects victims of a multiversal calamity and helps them adapt to a new life, ` +
            `with the goal of placing these characters into a new role in this universe. These new roles are offered by external factions, generally in exchange for a finder's fee or reputation boost. ` +
            `Some roles are above board, while others may involve morally ambiguous or covert activities; many may even be illicit, sexual, or compulsory (essentially human trafficking). ` +
            `The player's motives and ethics are open-ended; they may be benevolent or self-serving, and the characters they interact with may respond accordingly. ` +
            (Object.values(stage.getSave().factions).length > 0 ? `\n\nEstablished Factions:\n${Object.values(stage.getSave().factions).map(faction => `- ${faction.name}: ${faction.description}. Representative: ${stage.getSave().actors[faction.representativeId || '']}`).join('\n')}` : '') +
            `\n\nThe Original Details below describe a character, faction, organization, or setting (${data.name}) from another universe. ` +
            `This request and response must digest and distill these details into a new faction that suits the game's narrative scenario, ` +
            `crafting a complex and intriguing organization that fits seamlessly into the game's expansive, flavorful, and varied sci-fi setting. ` +
            (Object.values(stage.getSave().factions).length > 0 ? `Ensure that this new faction feels distinct from or complementary to the Established Factions, as the primary goal is engaging diversity.` : '') +
            `The Original Details may not lend themselves directly to a faction, so creative interpretation is encouraged; pull from and lean into the dominant themes found in the details. ` +
            `\n\nOriginal Details about ${data.name}:\n${data.description} ${data.personality}` +
            `\n\nInstructions: After carefully considering this description, generate a concise breakdown for a faction based upon these details in the following strict format:\n` +
            `System: NAME: The faction's simple name\n` +
            `DESCRIPTION: A vivid description of the faction's purpose, values, and role in the galaxy.\n` +
            `ROLES: A list of simple job roles that this faction may offer to recruit or purchase from the PARC.\n` +
            `VISUALSTYLE: A concise description of the faction's aesthetic, architectural style, uniform/clothing design, and overall visual identity.\n` +
            `COLOR: A hex color that reflects the faction's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A web-safe font family that reflects the faction's personality or style.\n` +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: The Stellar Concord\n` +
            `DESCRIPTION: A diplomatic federation of peaceful worlds dedicated to preserving knowledge and fostering cooperation across the galaxy. They value education, cultural exchange, and peaceful resolution of conflicts.\n` +
            `ROLES: Ambassador, Researcher, Bodyguard, Negotiator\n` +
            `VISUALSTYLE: Clean, elegant architecture with flowing curves and abundant natural light. Members wear formal robes in soft pastels with subtle geometric patterns. Spaces feature living plants and water features.\n` +
            `COLOR: #2a4a7c\n` +
            `FONT: Georgia, serif\n` +
            `#END#`,
        stop: ['#END'],
        include_history: true,
        max_tokens: 400,
    });
    
    console.log('Generated faction distillation:');
    console.log(generatedResponse);
    
    // Parse the generated response
    const lines = generatedResponse?.result.split('\n').map((line: string) => line.trim()) || [];
    const parsedData: any = {};
    
    for (let line of lines) {
        line = line.replace(/\*\*/g, '');
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const keyMatch = line.substring(0, colonIndex).trim().match(/(\w+)$/);
            if (!keyMatch) continue;
            const key = keyMatch[1].toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            parsedData[key] = value;
        }
    }
    
    // Validate hex color
    const themeColor = /^#([0-9A-F]{6}|[0-9A-F]{8})$/i.test(parsedData['color']) ?
            parsedData['color'] :
            ['#788ebdff', '#d3aa68ff', '#75c275ff', '#c28891ff', '#55bbb2ff'][Math.floor(Math.random() * 5)];
    
    const newFaction = new Faction(
        generateUuid(),
        parsedData['name'] || data.name,
        data.fullPath || '',
        parsedData['description'] || '',
        parsedData['visualstyle'] || '',
        parsedData['roles'] ? parsedData['roles'].split(',').map((role: string) => role.trim()) : [],
        themeColor,
        parsedData['font'] || 'Arial, sans-serif',
        1 // Start with reputation of 1
    );
    
    console.log(`Loaded new faction: ${newFaction.name} (ID: ${newFaction.id})`);
    console.log(newFaction);
    
    // Validation checks
    if (!newFaction.name) {
        console.log(`Discarding faction due to missing name: ${newFaction.name}`);
        return null;
    } else if (!newFaction.description) {
        console.log(`Discarding faction due to missing description: ${newFaction.name}`);
        return null;
    } else if (!newFaction.visualStyle) {
        console.log(`Discarding faction due to missing visual style: ${newFaction.name}`);
        return null;
    } else if (newFaction.name.length <= 2 || newFaction.name.length >= 50) {
        console.log(`Discarding faction due to extreme name length: ${newFaction.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${newFaction.name}${newFaction.description}${newFaction.visualStyle}`)) {
        console.log(`Discarding faction due to non-english characters in name/description/visualStyle: ${newFaction.name}`);
        return null;
    }

    // Generate a background image for the faction:
    stage.generator.makeImage({
        prompt: `An evocative visual novel background from a futuristic sci-fi universe. ` +
            `The scene should encapsulate the essence of this description: ${newFaction.description}. ` +
            `Include suitable design elements: ${newFaction.visualStyle}. `,
        aspect_ratio: AspectRatio.SQUARE
    }).then((bgResponse) => {newFaction.backgroundImageUrl = bgResponse?.url || ''});

    // Generate a representative Actor:
    await generateFactionRepresentative(newFaction, stage);

    return newFaction;
}

export async function generateFactionRepresentative(faction: Faction, stage: Stage): Promise<Actor|null> {

    const currentRep = stage.getSave().actors[faction.representativeId || ''];
    if (currentRep) {
        return currentRep;
    }

    const actorData = {
        name: faction.name,
        fullPath: faction.fullPath,
        description: `This is a representative for the ${faction.name}. ${faction.description}. ${faction.visualStyle}. The character should embody the values and style of the faction they represent. ` +
            `They will be the primary contact for the PARC when dealing with this faction. Give them a suitable name, avoiding similarity to the following established character names: ${Object.values(stage.getSave().actors).map(a => a.name).join(', ')}.`,
        personality: ''
    }
    // retry a few times if it fails (or returns null):
    for (let attempt = 0; attempt < 3; attempt++) {
        const repActor = await loadReserveActor(actorData, stage);
        if (repActor) {
            repActor.factionId = faction.id;
            repActor.locationId = faction.id; // place them "in" the faction for now
            faction.representativeId = repActor.id;
            await generatePrimaryActorImage(repActor, stage);
            stage.getSave().actors[repActor.id] = repActor;
            break;
        }
    }
    return faction.representativeId ? stage.getSave().actors[faction.representativeId] : null;
}

export default Faction;