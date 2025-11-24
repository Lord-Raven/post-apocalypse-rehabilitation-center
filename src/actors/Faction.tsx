import { Stage } from "../Stage";
import { v4 as generateUuid } from 'uuid';

class Faction {
    id: string;
    name: string;
    fullPath: string = '';
    description: string;
    visualStyle: string;
    themeColor: string;
    themeFont: string;
    reputation: number = 1; // 1-10, starts at 1

    /**
     * Rehydrate a Faction from saved data
     */
    static fromSave(savedFaction: any): Faction {
        const faction = Object.create(Faction.prototype);
        Object.assign(faction, savedFaction);
        return faction;
    }

    constructor(
        id: string,
        name: string,
        fullPath: string,
        description: string,
        visualStyle: string,
        themeColor: string,
        themeFont: string,
        reputation: number = 1
    ) {
        this.id = id;
        this.name = name;
        this.fullPath = fullPath;
        this.description = description;
        this.visualStyle = visualStyle;
        this.themeColor = themeColor;
        this.themeFont = themeFont;
        this.reputation = Math.max(1, Math.min(10, reputation)); // Clamp between 1-10
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
            `Some roles are above board, while others may involve morally ambiguous or covert activities; some may even be illicit or compulsary. ` +
            `The player's motives and ethics are open-ended; they may be benevolent or self-serving, and the characters they interact with may respond accordingly. ` +
            `\n\nThe Original Details below describe a character, faction, organization, or setting (${data.name}) from another universe. ` +
            `This request and response must digest and distill these details into a new faction that suits the game's narrative scenario, ` +
            `crafting a complex and intriguing organization that fits seamlessly into the game's expansive and varied sci-fi setting. ` +
            `The Original Details may not lend itself directly to a faction, so creative interpretation is encouraged; pull from and lean into the dominant themes found in the details. ` +
            `\n\nOriginal Details about ${data.name}:\n${data.description} ${data.personality}` +
            `\n\nInstructions: After carefully considering this description, generate a concise breakdown for a faction based upon these details in the following strict format:\n` +
            `System: NAME: The faction's simple name\n` +
            `DESCRIPTION: A vivid description of the faction's purpose, values, and role in the galaxy.\n` +
            `DESIRES: A list of job roles that this faction may offer to recruit from the PARC.\n` +
            `VISUALSTYLE: A concise description of the faction's aesthetic, architectural style, uniform/clothing design, and overall visual identity.\n` +
            `COLOR: A hex color that reflects the faction's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A web-safe font family that reflects the faction's personality or style.\n` +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: The Stellar Concord\n` +
            `DESCRIPTION: A diplomatic federation of peaceful worlds dedicated to preserving knowledge and fostering cooperation across the galaxy. They value education, cultural exchange, and peaceful resolution of conflicts.\n` +
            `DESIRES: Ambassador, Researcher, Bodyguard, Negotiator\n` +
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

    return newFaction;
}

export default Faction;