import { Emotion, EMOTION_PROMPTS, EmotionPack } from "./Emotion";
import { Module } from "../Module";
import { Stage } from "../Stage";
import { v4 as generateUuid } from 'uuid';
import { AspectRatio } from "@chub-ai/stages-ts";
import { FlashOn, Forum, 
    FitnessCenter, Construction, Lightbulb, 
    Whatshot, SentimentVerySatisfied, Handshake 
} from '@mui/icons-material';

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

// Icon mapping for actor stats
export const ACTOR_STAT_ICONS: Record<Stat, any> = {
    [Stat.Brawn]: FitnessCenter,
    [Stat.Skill]: Construction,
    [Stat.Nerve]: FlashOn,
    [Stat.Wits]: Lightbulb,
    [Stat.Charm]: Forum,
    [Stat.Lust]: Whatshot,
    [Stat.Joy]: SentimentVerySatisfied,
    [Stat.Trust]: Handshake,
};

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
    voiceId: string;
    birthDay: number = -1; // Day they were "born" into the game world
    participations: number = 0; // Number of skits they've participated in
    isImageLoadingComplete: boolean = false; // Whether all emotion pack images have been generated
    heldRoles: { [key: string]: number } = {}; // Roles ever held by this actor and the number of days spent in each
    decorImageUrls: {[key: string]: string} = {}; // ModuleType to decor image URL mapping
    stats: Record<Stat, number>;
    remote: boolean = false; // Whether this actor is not present on the station.

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

    constructor(id: string, name: string, fullPath: string, avatarImageUrl: string, description: string, profile: string, style: string, voiceId: string, emotionPack: EmotionPack, stats: Record<Stat, number>, themeColor: string, themeFontFamily: string) {
        this.id = id;
        this.name = name;
        this.fullPath = fullPath;
        this.avatarImageUrl = avatarImageUrl;
        this.description = description;
        this.profile = profile;
        this.style = style;
        this.voiceId = voiceId;
        this.emotionPack = emotionPack;
        // populate the consolidated mapping for easier, enum-based lookups
        this.stats = stats;
        this.themeColor = themeColor;
        this.themeFontFamily = themeFontFamily;
    }

    get isPrimaryImageReady(): boolean {
        return !!this.emotionPack['neutral'];
    }

    /**
     * Get the default emotion for this actor based on their Joy stat.
     * Returns joy (>8), approval (>5), neutral (>2), or disappointment (<=2).
     * @returns The default emotion for this actor
     */
    getDefaultEmotion(): Emotion {
        const joyValue = this.stats[Stat.Joy];
        if (joyValue > 8) return Emotion.joy;
        if (joyValue > 5) return Emotion.approval;
        if (joyValue > 2) return Emotion.neutral;
        return Emotion.disappointment;
    }

    /**
     * Get the emotion image for this actor, falling back to neutral if not available.
     * If the emotion is not defined or matches the base/neutral image, kick off generation
     * in the background (don't wait for it).
     * @param emotion The emotion to get the image for
     * @param stage Optional stage instance to use for image generation
     * @returns The URL of the emotion image
     */
    getEmotionImage(emotion: Emotion | string, stage?: Stage): string {
        const emotionKey = typeof emotion === 'string' ? emotion : emotion;
        const emotionUrl = this.emotionPack[emotionKey];
        const neutralUrl = this.emotionPack['neutral'] || this.emotionPack['base'];
        const fallbackUrl = neutralUrl || this.avatarImageUrl || '';

        // Check if we need to generate the image
        if (stage && (emotion === 'neutral' || !stage.getSave().disableEmotionImages) && (!emotionUrl || emotionUrl === this.avatarImageUrl || emotionUrl === this.emotionPack['base'] || (emotionKey !== 'neutral' && emotionUrl === neutralUrl))) {
            // Kick off generation in the background (don't wait)
            generateEmotionImage(this, emotion as Emotion, stage);
        }

        // Return the emotion image or fallback
        return emotionUrl || fallbackUrl;
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

export async function loadReserveActorFromFullPath(fullPath: string, stage: Stage): Promise<Actor|null> {
    const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', fullPath));
    const item = await response.json();
    const dataName = item.node.definition.name.replaceAll('{{char}}', item.node.definition.name).replaceAll('{{user}}', 'Individual X');

    const data = {
        name: dataName,
        fullPath: item.node.fullPath,
        description: item.node.definition.description.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        personality: item.node.definition.personality.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        avatar: item.node.max_res_url,
    };
    return loadReserveActor(data, stage);
}


export async function loadReserveActor(data: any, stage: Stage): Promise<Actor|null> {

    // Attempt to substitute words to avert bad content into something more agreeable (if the distillation still has these, then drop the card).
    const bannedWordSubstitutes: {[key: string]: string} = {
        // Try to age up some terms in the hopes that the character can be salvaged.
        'underage': 'young adult',
        'adolescent': 'young adult',
        'youngster': 'young adult',
        'teen': 'young adult',
        'highschooler': 'young adult',
        // Don't bother with these; just set it to the same word so it gets discarded.
        'child': 'child',
        'toddler': 'toddler',
        'infant': 'infant',
        // Assume that these words are being used in an innocuous way, unless they come back in the distillation.
        'kid': 'joke',
        'baby': 'honey',
        'minor': 'trivial',
        'old-school': 'retro',
        'high school': 'college',
        'school': 'college'};
    // Mapping of voice IDs to a description of the voice, so the AI can choose an ID based on the character profile.
    const voiceMap: {[key: string]: string} = {
        '03a438b7-ebfa-4f72-9061-f086d8f1fca6': 'feminine - calm and soothing', // HQ Female Lowrange
        'a2533977-83cb-4c10-9955-0277e047538f': 'feminine - energetic and lively', // LQ Female Midrange
        '057d53b3-bb28-47f1-9c19-a85a79851863': 'feminine - low and warm', // HQ Female Midrange
        '6e6619ba-4880-4cf3-a5df-d0697ba46656': 'feminine - high and soft', // LQ Female Highrange
        'd6e05564-eea9-4181-aee9-fa0d7315f67d': 'masculine - cool and confident', // HQ Male Lowrange
        'dc42cdc0-3f05-43a9-b843-7920e2e041aa': 'masculine - low and murmuring', // HQ Male Highrange
        'e6b74abb-f4b2-4a84-b9ef-c390512f2f47': 'masculine - posh and articulate', // HQ Male Midrange
        'bright_female_20s': 'feminine - bright and cheerful',
        'resonant_male_40s': 'masculine - resonant and mature',
        'gentle_female_30s': 'feminine - gentle and caring',
        'whispery_female_40s': 'feminine - whispery and mysterious',
        'formal_female_30s': 'feminine - formal and refined',
        'professional_female_30s': 'feminine - professional and direct',
        'calm_female_20s': 'feminine - calm and soothing',
        'light_male_20s': 'masculine - light and thoughtful',
        'animated_male_20s': 'masculine - hip and lively',
    };

    // Preserve content while removing JSON-like structures.
    data.name = data.name.replace(/{/g, '(').replace(/}/g, ')');
    data.description = data.description.replace(/{/g, '(').replace(/}/g, ')');
    data.personality = data.personality.replace(/{/g, '(').replace(/}/g, ')');

    // Apply banned word substitutions:
    for (const [bannedWord, substitute] of Object.entries(bannedWordSubstitutes)) {
        // Need to do a case-insensitive replacement for each occurrence:
        const regex = new RegExp(bannedWord, 'gi');
        data.name = data.name.replace(regex, substitute);
        data.description = data.description.replace(regex, substitute);
        data.personality = data.personality.replace(regex, substitute);
    }

    if (Object.keys(bannedWordSubstitutes).some(word => data.description.toLowerCase().includes(word) || data.personality.toLowerCase().includes(word) || data.name.toLowerCase().includes(word))) {
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
            `The player of this game, ${stage.getSave().player.name}, manages a space station called the Post-Apocalypse Rehabilitation Center, or PARC, which resurrects victims of a multiversal calamity and helps them adapt to a new life, ` +
            `with the goal of placing these characters into a new role in this universe. These new roles are offered by external factions, generally in exchange for a finder's fee or reputation boost. ` +
            `Some roles are above board, while others may involve morally ambiguous or covert activities; some may even be illicit or compulsary. ` +
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
            `Available Voices:\n` +
            Object.entries(voiceMap).map(([voiceId, voiceDesc]) => '  - ' + voiceId + ': ' + voiceDesc).join('\n') +
            `Instructions: After carefully considering this description and the rules provided, generate a concise breakdown for a character based upon these details in the following strict format:\n` +
            `System: NAME: Their simple name\n` +
            `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
            `PROFILE: A brief summary of the character's key personality traits and behaviors.\n` +
            `STYLE: A concise description of the character's sense of overall style, mood, interests, or aesthetic, to be applied to the way they decorate their space.\n` +
            `VOICE: Output the specific voice ID from the Available Voices section that best matches the character's apparent gender and personality\n` +
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
            `VOICE: 03a438b7-ebfa-4f72-9061-f086d8f1fca6\n` +
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
        max_tokens: 400,
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
        parsedData['voice'] || '',
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
    } else if (Object.keys(bannedWordSubstitutes).some(word => newActor.description.toLowerCase().includes(word))) {
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
            console.log(`Generating new image for actor ${actor.name} from description`);
            // Use stage.makeImage to create a neutral expression based on the description
            imageUrl = await stage.makeImage({
                prompt: `A professional upper-body portrait of an anime character with the following description: ${actor.description}\nThe character should have a neutral expression Maintain a margin of negative space over their head/hair.`,
                aspect_ratio: AspectRatio.PHOTO_VERTICAL
            }, '');
            actor.avatarImageUrl = imageUrl || '';
        }

        // Use stage.makeImageFromImage to create a base image.
        imageUrl = await stage.makeImageFromImage({
            image: imageUrl || actor.avatarImageUrl,
            prompt: `Create a waist-up portrait of this character (${actor.description}) with a neutral expression and pose. Maintain a margin of negative space over their head/hair.`,
            remove_background: true,
            transfer_type: 'edit'
        }, '');
        
        console.log(`Generated base emotion image for actor ${actor.name} from avatar image: ${imageUrl || ''}`);
        
        actor.emotionPack['base'] = imageUrl || '';

        // Now create the neutral expression from the base image
        await generateEmotionImage(actor, Emotion.neutral, stage);
    }
}

export async function generateAdditionalActorImages(actor: Actor, stage: Stage): Promise<void> {

    console.log(`Generating additional emotion images for actor ${actor.name} (ID: ${actor.id})`);
    if (actor.emotionPack['neutral']) {
        // Generate in serial and not parallel as below:
        for (const emotion of Object.values(Emotion)) {
            // Only generate if the emotion image is missing, and only if the actor is in the save or currently in an echo slot
            if (!actor.emotionPack[emotion] && (Object.keys(stage.getSave().actors).includes(actor.id) || stage.getEchoSlots().some(slot => slot?.id || '' === actor.id))) {
                await generateEmotionImage(actor, emotion, stage);
            }
        }
    }
    actor.isImageLoadingComplete = true;
}

async function generateEmotionImage(actor: Actor, emotion: Emotion, stage: Stage): Promise<string> {
    if (actor.emotionPack['base'] && !stage.imageGenerationPromises[`actor/${actor.id}`]) {
        console.log(`Generating ${emotion} emotion image for actor ${actor.name}`);
        stage.imageGenerationPromises[`actor/${actor.id}`] = stage.makeImageFromImage({
            image: actor.emotionPack['base'] || '',
            prompt: `Give this character a ${EMOTION_PROMPTS[emotion]}, gesture, or pose.`,
            remove_background: true,
            transfer_type: 'edit'
        }, '');
        const imageUrl = await stage.imageGenerationPromises[`actor/${actor.id}`];
        delete stage.imageGenerationPromises[`actor/${actor.id}`];
        console.log(`Generated ${emotion} emotion image for actor ${actor.name}: ${imageUrl || ''}`);
        actor.emotionPack[emotion] = imageUrl || '';
        return imageUrl || '';
    }
    return '';
}

export async function generateActorDecor(actor: Actor, module: Module, stage: Stage): Promise<string> {
    if (actor.decorImageUrls[module.type] && actor.decorImageUrls[module.type].length > 0 && actor.decorImageUrls[module.type] !== module.getAttribute('baseImageUrl')) {
        return actor.decorImageUrls[module.type];
    }
    if (stage.getSave().disableEmotionImages) {
        return '';
    }
    console.log(`Generating decor image for actor ${actor.name} in module ${module.type}`);
    // Generate a decor image based on the module's description and the actor's description
    const decorImageUrl = await stage.makeImageFromImage({
        image: module.getAttribute('baseImageUrl') || '',
        prompt: `This is sci-fi ${module.type}: ${module.getAttribute('imagePrompt') || ''}. Give this image a clean, visual novel look, ` +
                `redecorating the space with furnishings or details to suit this style: ${actor.style}`,
        remove_background: false,
        transfer_type: 'edit'
    }, module.getAttribute('baseImageUrl') || '');
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

/**
 * Calculate a similarity score between two names. Higher scores indicate better matches.
 * Returns a value between 0 and 1, where 1 is a perfect match.
 * @param name The reference name
 * @param possibleName The name to compare against
 * @returns A similarity score between 0 and 1
 */
export function getNameSimilarity(name: string, possibleName: string): number {
    name = name.toLowerCase();
    possibleName = possibleName.toLowerCase();

    // Exact match gets perfect score
    if (name === possibleName) {
        return 1.0;
    }

    // Check word-based matching first (higher priority)
    const names = name.split(' ');
    const possibleNames = possibleName.split(' ');
    
    // Count matching words
    let matchingWords = 0;
    for (const namePart of names) {
        if (possibleName.includes(namePart)) {
            matchingWords++;
        }
    }
    
    // If we have good word matches, prioritize that
    const wordMatchRatio = matchingWords / names.length;
    if (wordMatchRatio >= 0.5) {
        // Boost score for word matches, scaled by the ratio
        return 0.7 + (wordMatchRatio * 0.3);
    }

    // Use Levenshtein distance for fuzzy matching
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
    
    const distance = matrix[name.length][possibleName.length];
    const maxLength = Math.max(name.length, possibleName.length);
    
    // Convert distance to similarity (0 to 1)
    return Math.max(0, 1 - (distance / maxLength));
}

/**
 * Find the best matching name from a list of candidates.
 * @param searchName The name to search for
 * @param candidates An array of objects with name properties
 * @returns The best matching candidate, or null if no good match is found
 */
export function findBestNameMatch<T extends { name: string }>(
    searchName: string,
    candidates: T[]
): T | null {
    if (!searchName || candidates.length === 0) {
        return null;
    }

    let bestMatch: T | null = null;
    let bestScore = 0;
    const threshold = 0.4; // Minimum similarity threshold

    for (const candidate of candidates) {
        const score = getNameSimilarity(candidate.name, searchName);
        // Only consider matches above threshold
        if (score > threshold && score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
        }
    }

    return bestMatch;
}

export default Actor;