import { Emotion, EMOTION_PROMPTS, EmotionPack } from "../Emotion";
import { Module, ModuleType } from "../Module";
import { Stage } from "../Stage";
import { v4 as generateUuid } from 'uuid';

// Core character stats as an enum so other parts of the app can reference them safely
// Using single-syllable words, each starting with a different letter
export enum Stat {
    Brawn = 'brawn', // Physical condition and strength
    Skill = 'skill', // Capability and finesse
    Nerve = 'nerve', // Courage and confidence
    Wits = 'wits', // Intelligence and awareness
    Charm = 'charm', // Charisma and tact
    Lust = 'lust', // Sexuality and physical desire
    Joy = 'joy', // Happiness and positivity
    Trust = 'trust' // Compliance and faith in the player
}

class Actor {
    id: string;
    name: string;
    fullPath: string = '';
    locationId: string = '';
    avatarImageUrl: string;
    description: string;
    profile: string;
    style: string;
    emotionPack: EmotionPack;
    themeColor: string;
    themeFontFamily: string;
    birthDay: number = -1; // Day they were "born" into the game world
    participations: number = 0; // Number of vignettes they've participated in
    isImageLoadingComplete: boolean = false; // Whether all emotion pack images have been generated
    heldRoles: { [key: string]: number } = {}; // Roles ever held by this actor and the number of days spent in each
    decorImageUrls: {[key: string]: string} = {}; // ModuleType to decor image URL mapping
    stats: Record<Stat, number>;

    /**
     * Rehydrate an Actor from saved data
     */
    static fromSave(savedActor: any): Actor {
        const actor = Object.create(Actor.prototype);
        Object.assign(actor, savedActor);
        if (actor.decorImageUrls === undefined) {
            actor.decorImageUrls = {};
        }
        return actor;
    }

    constructor(id: string, name: string, fullPath: string, avatarImageUrl: string, description: string, profile: string, style: string, emotionPack: EmotionPack, stats: Record<Stat, number>, themeColor: string, themeFontFamily: string) {
        this.id = id;
        this.name = name;
        this.fullPath = fullPath;
        this.avatarImageUrl = avatarImageUrl;
        this.description = description;
        this.profile = profile;
        this.style = style;
        this.emotionPack = emotionPack;
        // populate the consolidated mapping for easier, enum-based lookups
        this.stats = stats;
        this.themeColor = themeColor;
        this.themeFontFamily = themeFontFamily;
    }

    scoreToGrade(score: number): string {
        const scoreClamped = Math.max(1, Math.min(10, score));
        const scoreArray = ['F', 'D', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
        return scoreArray[scoreClamped - 1];
    }

    get isPrimaryImageReady(): boolean {
        return !!this.emotionPack['neutral'];
    }

    birth(day: number) {
        this.birthDay = day;
    }
}

export function getStatDescription(stat: Stat | string): string {
    const key = typeof stat === 'string' ? stat : stat;
    switch (key) {
        case Stat.Brawn:
            return 'physical condition and strength, with 10 being peak condition and 1 being critically impaired.';
        case Stat.Skill:
            return 'capability and ability to contribute meaningfully, with 10 being highly competent and 1 being a liability.';
        case Stat.Nerve:
            return 'courage and mental resilience, with 10 being indefatigably fearless and 1 being easily overwhelmed.';
        case Stat.Wits:
            return 'intelligence and awareness, with 10 being a genius and 1 being utterly oblivious.';
        case Stat.Charm:
            return 'personality appeal and tact, with 10 being extremely charismatic and 1 being socially inept.';
        case Stat.Lust:
            return 'physical lustiness and sexual confidence, with 10 being abjectly lewd and 1 being utterly asexual.';
        case Stat.Joy:
            return 'happiness and positivity, with 10 being eternally optimistic and 1 being deeply depressed.';
        case Stat.Trust:
            return 'level of trust in the player character, with 10 being fully trusting and 1 being completely suspicious.';
        default:
            return '';
    }
}

export async function loadReserveActor(fullPath: string, stage: Stage): Promise<Actor|null> {
    const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', fullPath));
    const item = await response.json();
    const dataName = item.node.definition.name.replaceAll('{{char}}', item.node.definition.name).replaceAll('{{user}}', 'Individual X');
    const bannedWords = ['underage', 'minor', 'child', 'infant', 'baby', 'toddler', 'youngster', 'highschool', 'teen', 'adolescent', 'school'];
    const data = {
        name: dataName,
        fullPath: item.node.fullPath,
        description: item.node.definition.description.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        personality: item.node.definition.personality.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        avatar: item.node.max_res_url
    };

    // I was discarding curly braces, but instead, let's swap "{" and "}" for "(" and ")" to preserve content while removing JSON-like structures.
    data.name = data.name.replace(/{/g, '(').replace(/}/g, ')');
    data.description = data.description.replace(/{/g, '(').replace(/}/g, ')');
    data.personality = data.personality.replace(/{/g, '(').replace(/}/g, ')');
    
    if (bannedWords.some(word => data.description.toLowerCase().includes(word) || data.personality.toLowerCase().includes(word) || data.name.toLowerCase().includes(word))) {
        console.log(`Immediately discarding actor due to banned words: ${data.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${data.name}${data.description}${data.personality}`)) {
        console.log(`Immediately discarding actor due to non-english characters: ${data.name}`);
        return null;
    }
    // Take this data and use text generation to get an updated distillation of this character, including a physical description.
    const generatedResponse = await stage.generator.textGen({
        prompt: `{{messages}}This is preparatory request for structured and formatted game content.` +
            `\n\nBackground: This game is a futuristic multiverse setting that pulls characters from across eras and timelines and settings. ` +
            `The player of this game ${stage.getSave().player.name} manages a space station and rehabilitiation center that resurrects victims of a multiversal calamity and helps them adapt to a new life. ` +
            `The player's motives and ethics are open-ended; they may be benevolent or self-serving, and the characters they interact with may respond accordingly. ` +
            `\n\nThe Original Details below describe a character or scenario (${data.name}) from another universe. This request and response must digest and distill these details to suit the game's narrative scenario, ` +
            `crafting a character who has been rematerialized into this universe through an "echo chamber," their essence reconstituted from the whispers of a black hole. ` +
            `As a result of this process, many of this character's traits may have changed, including the loss of most supernatural or arcane abilities, which functioned only within the rules of their former universe. ` +
            `Their new description and profile should reflect these possible changes and their impact.\n\n` +
            `The provided Original Details reference 'Individual X' who no longer exists in this timeline; ` +
            `if Individual X remains relevant to this character, Individual X should be replaced with an appropriate name in the distillation.\n\n` +
            `In addition to the simple display name, physical description, and personality profile, ` +
            `score the character on a scale of 1-10 for the following traits: BRAWN, SKILL, NERVE, WITS, CHARM, LUST, JOY, and TRUST.\n` +
            `Bear in mind the character's current, diminished state—as a newly reconstituted and relatively powerless individual—and not their original potential when scoring these traits (but omit your reasons from the response structure); ` +
            `some characters may not respond well to being essentially resurrected into a new timeline, losing much of what they once had. Others may be grateful for a new beginning.\n\n` +
            `Original Details about ${data.name}:\n${data.description} ${data.personality}\n\n` +
            `Instructions: After carefully considering this description and the rules provided, generate a concise breakdown for a character based upon these details in the following strict format:\n` +
            `System: NAME: Their simple name\n` +
            `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
            `PROFILE: A brief summary of the character's key personality traits and behaviors.\n` +
            `STYLE: A concise description of the character's sense of overall style, mood, interests, or aesthetic, to be applied to the way they decorate their space.\n` +
            `COLOR: A hex color that reflects the character's theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `FONT: A web-safe font family that reflects the character's personality.\n` +
            Object.entries(Stat).map(([key, value]) => {
                return `${key.toUpperCase()}: 1-10 scoring of ${getStatDescription(value).toLowerCase()}\n`;
            }).join('\n') +
            `#END#\n\n` +
            `Example Response:\n` +
            `NAME: Jane Doe\n` +
            `DESCRIPTION: A tall, athletic woman with short, dark hair and piercing blue eyes. She wears a simple, utilitarian outfit made from durable materials.\n` +
            `PROFILE: Jane is confident and determined, with a strong sense of justice. She is quick to anger but also quick to forgive. She is fiercely independent and will do whatever it takes to protect those she cares about.\n` +
            `STYLE: Practical and no-nonsense, favoring functionality over fashion. Prefers muted colors and simple designs that allow freedom and comfort.\n` +
            `COLOR: #333333\n` +
            `FONT: Arial\n` +
            `BRAWN: 5\n` +
            `SKILL: 5\n` +
            `NERVE: 7\n` +
            `WITS: 6\n` +
            `CHARM: 4\n` +
            `LUST: 2\n` +
            `JOY: 3\n` +
            `TRUST: 2\n` +
            `#END#`,
        stop: ['#END'],
        include_history: true, // There won't be any history, but if this is true, the front-end doesn't automatically apply pre-/post-history prompts.
        max_tokens: 500,
    });
    console.log('Generated character distillation:');
    console.log(generatedResponse);
    // Parse the generated response into components:
    const lines = generatedResponse?.result.split('\n').map((line: string) => line.trim()) || [];
    const parsedData: any = {};
    // data could be erroneously formatted (for instance, "1. Name:" or "-Description:"), so be resilient:
    for (let line of lines) {
        // strip ** from line:
        line = line.replace(/\*\*/g, '');
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            // Find last word before : and use that as the key. Ignore 1., -, *. There might not be a space before the word:
            const keyMatch = line.substring(0, colonIndex).trim().match(/(\w+)$/);
            if (!keyMatch) continue;
            const key = keyMatch[1].toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            // console.log(`Parsed line - Key: ${key}, Value: ${value}`);
            parsedData[key] = value;
        }
    }
    // Create an Actor instance from the parsed data; ID should be generated uniquely
    const DEFAULT_TRAIT_MAP: Record<Stat, number> = {
        [Stat.Brawn]: 3,
        [Stat.Wits]: 4,
        [Stat.Nerve]: 3,
        [Stat.Skill]: 4,
        [Stat.Charm]: 4,
        [Stat.Lust]: 4,
        [Stat.Joy]: 3,
        [Stat.Trust]: 1
    };
    // Validate that parsedData['color'] is a valid hex color, otherwise assign a random default:
    const themeColor = /^#([0-9A-F]{6}|[0-9A-F]{8})$/i.test(parsedData['color']) ?
            parsedData['color'] :
            ['#788ebdff', '#d3aa68ff', '#75c275ff', '#c28891ff', '#55bbb2ff'][Math.floor(Math.random() * 5)];
    const newActor = new Actor(
        generateUuid(),
        parsedData['name'] || data.name,
        data.fullPath || '',
        data.avatar || '',
        parsedData['description'] || '',
        parsedData['profile'] || '',
        parsedData['style'] || '',
        {}, 
        {
            [Stat.Brawn]: parseInt(parsedData['brawn']) || DEFAULT_TRAIT_MAP[Stat.Brawn],
            [Stat.Wits]: parseInt(parsedData['wits']) || DEFAULT_TRAIT_MAP[Stat.Wits],
            [Stat.Nerve]: parseInt(parsedData['nerve']) || DEFAULT_TRAIT_MAP[Stat.Nerve],
            [Stat.Skill]: parseInt(parsedData['skill']) || DEFAULT_TRAIT_MAP[Stat.Skill],
            [Stat.Charm]: parseInt(parsedData['charm']) || DEFAULT_TRAIT_MAP[Stat.Charm],
            [Stat.Lust]: parseInt(parsedData['lust']) || DEFAULT_TRAIT_MAP[Stat.Lust],
            [Stat.Joy]: parseInt(parsedData['joy']) || DEFAULT_TRAIT_MAP[Stat.Joy],
            [Stat.Trust]: parseInt(parsedData['trust']) || DEFAULT_TRAIT_MAP[Stat.Trust]
        },
        // Default to a random color from a small preset list of relatively neutral colors:
        // validate that parsedData is a valid hex color:
        themeColor,
        parsedData['font'] || 'Arial, sans-serif'
    );
    console.log(`Loaded new actor: ${newActor.name} (ID: ${newActor.id})`);
    console.log(newActor);
    // If name, description, or profile are missing, or banned words are present or the attributes are all defaults (unlikely to have been set at all) or description is non-english, discard this actor by returning null
    // Rewrite discard reasons to log which reason applied:
    if (!newActor.name) {
        console.log(`Discarding actor due to missing name: ${newActor.name}`);
        return null;
    } else if (!newActor.description) {
        console.log(`Discarding actor due to missing description: ${newActor.name}`);
        return null;
    } else if (!newActor.profile) {
        console.log(`Discarding actor due to missing profile: ${newActor.name}`);
        return null;
    } else if (bannedWords.some(word => newActor.description.toLowerCase().includes(word))) {
        console.log(`Discarding actor due to banned words in description: ${newActor.name}`);
        return null;
    } else if (Object.entries(newActor.stats).every(([key, value]) => value === DEFAULT_TRAIT_MAP[key as Stat])) {
        console.log(`Discarding actor due to all default stats: ${newActor.name}`);
        return null;
    } else if (newActor.name.length <= 2 || newActor.name.length >= 30) {
        console.log(`Discarding actor due to extreme name length: ${newActor.name}`);
        return null;
    } else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${newActor.name}${newActor.description}${newActor.profile}`)) {
        console.log(`Discarding actor due to non-english characters in name/description/profile: ${newActor.name}`);
        return null;
    } else if (Object.values(newActor.stats).some(value => value < 1 || value > 10)) {
        console.log(`Discarding actor due to out-of-bounds stats: ${newActor.name}`);
        return null;
    }

    return newActor;
}

export async function generatePrimaryActorImage(actor: Actor, stage: Stage): Promise<void> {
    console.log(`Populating images for actor ${actor.name} (ID: ${actor.id})`);
    // If the actor has no neutral emotion image in their emotion pack, generate one based on their description or from the existing avatar image
    if (!actor.emotionPack['neutral']) {
        console.log(`Generating neutral emotion image for actor ${actor.name}`);
        let imageUrl = '';
        if (!actor.avatarImageUrl) {
            console.log(`Generating neutral emotion image for actor ${actor.name} from description`);
            // Use stage.makeImage to create a neutral expression based on the description
            imageUrl = await stage.makeImage({
                prompt: `A high-quality visual-novel-style waist-up, upper-body portrait of a character with the following description: ${actor.description}\nThe character should have a neutral expression.`
            }, '');
        }

        // Use stage.makeImageFromImage to create a base image.
        imageUrl = await stage.makeImageFromImage({
            image: imageUrl || actor.avatarImageUrl,
            prompt: `Create a waist-up portrait of this character (${actor.description}) with a neutral expression and pose. Maintain a margin of negative space over their head/hair.`,
            remove_background: true,
            transfer_type: 'edit'
        }, `actors/${actor.id}/base.png`, '');
        
        console.log(`Generated base emotion image for actor ${actor.name} from avatar image: ${imageUrl || ''}`);
        
        actor.emotionPack['base'] = imageUrl || '';

        // Now create the neutral expression from the base image
        const neutralImageUrl = await stage.makeImageFromImage({
            image: actor.emotionPack['base'],
            prompt: `Give this character a neutral expression and pose. Maintain the original style.`,
            remove_background: true,
            transfer_type: 'edit'
        }, `actors/${actor.id}/neutral.png`, '');
        console.log(`Generated neutral emotion image for actor ${actor.name}: ${neutralImageUrl || ''}`);
        actor.emotionPack['neutral'] = neutralImageUrl || '';
    }
}

export async function generateAdditionalActorImages(actor: Actor, stage: Stage): Promise<void> {

    console.log(`Generating additional emotion images for actor ${actor.name} (ID: ${actor.id})`);
    if (actor.emotionPack['neutral']) {
        // Generate in serial and not parallel as below:
        for (const emotion of Object.values(Emotion)) {
            if (!actor.emotionPack[emotion]) {
                console.log(`Generating ${emotion} emotion image for actor ${actor.name}`);
                const imageUrl = await stage.makeImageFromImage({
                    image: actor.emotionPack['neutral'],
                    prompt: `Give this character a ${EMOTION_PROMPTS[emotion]}, gesture, or pose.`,
                    remove_background: true,
                    transfer_type: 'edit'
                }, `actors/${actor.id}/${emotion}.png`, '');
                console.log(`Generated ${emotion} emotion image for actor ${actor.name}: ${imageUrl || ''}`);
                
                actor.emotionPack[emotion] = imageUrl || '';
            }
        }
    }
    actor.isImageLoadingComplete = true;
}

export async function generateActorDecor(actor: Actor, module: Module, stage: Stage): Promise<string> {
    if (actor.decorImageUrls[module.type] && actor.decorImageUrls[module.type].length > 0 && actor.decorImageUrls[module.type] !== module.getAttribute('baseImageUrl')) {
        return actor.decorImageUrls[module.type];
    }
    console.log(`Generating decor image for actor ${actor.name} in module ${module.type}`);
    // Generate a decor image based on the module's description and the actor's description
    const decorImageUrl = await stage.makeImageFromImage({
        image: module.getAttribute('baseImageUrl') || '',
        prompt: `Go over this sterile sci-fi ${module.type} with a clean visual novel look. ` +
                `Redecorate this space, updating furnishings or details to suit this style: ${actor.style}`,
        remove_background: false,
        transfer_type: 'edit'
    }, `actors/${actor.id}/${module.type}/decor.png`, module.getAttribute('baseImageUrl') || '');
    console.log(`Generated decor image for actor ${actor.name} and ${module.type}: ${decorImageUrl || ''}`);
    actor.decorImageUrls[module.type] = decorImageUrl || '';
    return decorImageUrl || '';
}

/**
 * Commits an actor to the echo process by generating their primary image
 * Additional images are generated in the background
 */
export async function commitActorToEcho(actor: Actor, stage: Stage): Promise<void> {
    if (actor.emotionPack['neutral']) {
        // If neutral image exists, start background generation of additional images if not complete
        if (!actor.isImageLoadingComplete) {
            generateAdditionalActorImages(actor, stage).catch(console.error);
        }
        return; // Neutral image already exists, actor is ready
    }
    
    console.log(`Committing actor ${actor.name} to echo process`);
    
    // Generate the primary image (this makes the character ready)
    await generatePrimaryActorImage(actor, stage);
    
    // Start generating additional emotion images in the background
    generateAdditionalActorImages(actor, stage).catch(console.error);
}

export function namesMatch(name: string, possibleName: string): boolean {

    name = name.toLowerCase();
    possibleName = possibleName.toLowerCase();

    const names = name.split(' ');
    // If the possible name contains at least half of the parts of the character name, then close enough.
    if (names.filter(namePart => !possibleName.includes(namePart)).length <= Math.floor(names.length / 2)) {
        return true;
    }

    // Otherwise, use Levenshtein distance to determine if an input string is referring to this character's name
    const matrix = Array.from({ length: name.length + 1 }, () => Array(possibleName.length + 1).fill(0));
    for (let i = 0; i <= name.length; i++) {
        for (let j = 0; j <= possibleName.length; j++) {
            if (i === 0) {
                matrix[i][j] = j;
            } else if (j === 0) {
                matrix[i][j] = i;
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + (name[i - 1] === possibleName[j - 1] ? 0 : 1)
                );
            }
        }
    }
    return matrix[name.length][possibleName.length] < Math.min(name.length / 1.5, possibleName.length / 1.5);
}

export default Actor;