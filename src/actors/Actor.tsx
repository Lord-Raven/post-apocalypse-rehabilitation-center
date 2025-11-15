import { Emotion, EMOTION_PROMPTS, EmotionPack } from "../Emotion";
import { Stage } from "../Stage";
import { v4 as generateUuid } from 'uuid';

// Core character stats as an enum so other parts of the app can reference them safely
// Using single-syllable words, each starting with a different letter
export enum Stat {
    Brawn = 'brawn', // Physical condition and strength
    Wits = 'wits', // Intelligence and awareness
    Nerve = 'nerve', // Courage and confidence
    Skill = 'skill', // Capability and finesse
    Charm = 'charm', // Charisma and tact
    Lust = 'lust', // Sexuality and physical desire
    Joy = 'joy', // Happiness and positivity
    Trust = 'trust' // Compliance and faith in the player
}

class Actor {
    id: string;
    name: string;
    locationId: string = '';
    avatarImageUrl: string;
    description: string;
    profile: string;
    emotionPack: EmotionPack;
    themeColor: string;
    themeFontFamily: string;
    birthDay: number = -1; // Day they were "born" into the game world
    participations: number = 0; // Number of vignettes they've participated in

    // Characters are candidates for a rehabilitation program; the are coming into the program from a vast range of past life situations.
    // They may have trauma, mental health challenges, or other issues that the program is designed to help with.
    // They will be prepped for completely new lives in a sci-fi, dystopian future setting where they may be valued for different traits.
    // Graded stats from 1-10; these get translated to a letter grade in the UI
    stats: Record<Stat, number>;

    constructor(id: string, name: string, avatarImageUrl: string, description: string, profile: string, emotionPack: EmotionPack, stats: Record<Stat, number>, themeColor: string, themeFontFamily: string) {
        this.id = id;
        this.name = name;
        this.avatarImageUrl = avatarImageUrl;
        this.description = description;
        this.profile = profile;
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

    birth(day: number) {
        this.birthDay = day;
    }
}

export function getStatDescription(stat: Stat | string): string {
    const key = typeof stat === 'string' ? stat : stat;
    switch (key) {
        case Stat.Brawn:
            return 'physical condition and strength, with 10 being peak condition and 1 being critically impaired.';
        case Stat.Wits:
            return 'intelligence and awareness, with 10 being a genius and 1 being utterly oblivious.';
        case Stat.Nerve:
            return 'courage and mental resilience, with 10 being indefatigably fearless and 1 being easily overwhelmed.';
        case Stat.Skill:
            return 'capability and ability to contribute meaningfully, with 10 being highly competent and 1 being a liability.';
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
        description: item.node.definition.description.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        personality: item.node.definition.personality.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        avatar: item.node.max_res_url
    };
    // if data.name, data.description, or data.personality contain any "{" or "}" at this point, discard this actor by returning null
    if (data.name.includes('{') || data.name.includes('}') || data.description.includes('{') || data.description.includes('}') || data.personality.includes('{') || data.personality.includes('}')) {
        return null;
    }
    // Take this data and use text generation to get an updated distillation of this character, including a physical description.
    const generatedResponse = await stage.generator.textGen({
        prompt: `{{messages}}This is a preparatory request for formatted content for a video game set in a futuristic multiverse setting that pulls characters from across eras and timelines and settings. ` +
            `The player of this game ${stage.getSave().player.name} manages a space station and rehabilitiation center that resurrects victims of a multiversal calamity and helps them adapt to a new life. ` +
            `The player's motives and ethics are open-ended; they may be benevolent or self-serving, and the characters they interact with may respond accordingly. ` +
            `\n\nThe following is a description for a random character or scenario from another universe. This response must digest and distill this description to suit the game's narrative, ` +
            `crafting a character who has been rematerialized into this universe through an "echo chamber," their essence reconstituted from the whispers of a black hole. ` +
            `As a result of this process, many of this character's traits may have changed, including the loss of most supernatural or arcane abilities, which functioned only within the rules of their former universe. ` +
            `Their new description and profile should reflect these possible changes and their impact.\n\n` +
            `The provided character description may reference 'Individual X' who no longer exists in this timeline; ` +
            `if Individual X remains relevant to this character, you should give Individual X an appropriate name in the distillation.\n\n` +
            `In addition to a simple name, physical description, and personality, you will score the character with a simple 1-10 for the following traits: BRAWN, WITS, NERVE, SKILL, CHARM, LUST, JOY, and TRUST.\n` +
            `Bear in mind the character's current, diminished state—as a newly reconstituted and relatively powerless individual—and not their original potential when scoring these traits; some characters may not respond well to being essentially resurrected into a new timeline.\n\n` +
            `Original details:\nDescription: ${data.description} ${data.personality}\n\n` +
            `After carefully considering this description, provide a concise breakdown in the following format:\n` +
            `NAME: The character's name.\n` +
            `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
            `PROFILE: A brief summary of the character's key personality traits and behaviors.\n` +
            `THEME COLOR: A hex code representing a color that encapsulates the character's overall theme or mood—use darker or richer colors that will contrast with white text.\n` +
            `THEME FONT FAMILY: A web-safe font family that reflects the character's personality.\n` +
            Object.entries(Stat).map(([key, value]) => {
                return `${key.toUpperCase()}: 1-10 scoring of ${getStatDescription(value).toLowerCase()}\n`;
            }).join('\n') +
            `#END#`,
        stop: ['#END'],
        include_history: true, // There won't be any history, but if this is true, the front-end doesn't automatically apply pre-/post-history prompts.
        max_tokens: 700,
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
    const newActor = new Actor(
        generateUuid(),
        parsedData['name'] || data.name,
        data.avatar || '',
        parsedData['description'] || '',
        parsedData['profile'] || '',
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
        parsedData['theme color'] || ['#788ebdff', '#d3aa68ff', '#75c275ff', '#c28891ff', '#55bbb2ff'][Math.floor(Math.random() * 5)],
        parsedData['theme font family'] || 'Arial, sans-serif'
    );
    console.log(`Loaded new actor: ${newActor.name} (ID: ${newActor.id})`);
    console.log(newActor);
    // If name, description, or profile are missing, or banned words are present or the attributes are all defaults (unlikely to have been set at all) or description is non-english, discard this actor by returning null
    if (newActor.name && newActor.description && newActor.profile && 
            bannedWords.every(word => !newActor.description.toLowerCase().includes(word)) && 
            Object.entries(newActor.stats).some(([key, value]) => value !== DEFAULT_TRAIT_MAP[key as Stat]) &&
            newActor.name.length < 30 &&
            !/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(`${newActor.name}${newActor.description}${newActor.profile}`) // Try to rule out Chinese/Japanese/Korean characters. Sorry. I should consider a toggle to allow this later.
        ) {
        return newActor;
    } else {
        console.log(`Discarding actor due to insufficient or inappropriate data: ${newActor.name}`);
    }
    return null;
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

        // Use stage.makeImageFromImage to create a neutral expression based on imageUrl or the avatar image
        imageUrl = await stage.makeImageFromImage({
            image: imageUrl || actor.avatarImageUrl,
            prompt: `Create a waist-up, solo portrait of this character (${actor.description}) with a calm, neutral expression. Maintain a margin of negative space over their head/hair.`,
            remove_background: true,
            transfer_type: 'edit'
        }, `actors/${actor.id}/neutral.png`, '');
        console.log(`Generated neutral emotion image for actor ${actor.name} from avatar image: ${imageUrl || ''}`);
        
        actor.emotionPack['neutral'] = imageUrl || '';
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
                    prompt: `This character now has a ${EMOTION_PROMPTS[emotion]}.`,
                    remove_background: true,
                    transfer_type: 'edit'
                }, `actors/${actor.id}/${emotion}.png`, '');
                console.log(`Generated ${emotion} emotion image for actor ${actor.name}: ${imageUrl || ''}`);
                
                actor.emotionPack[emotion] = imageUrl || '';
            }
        }
    }
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