import { EmotionPack } from "./Emotion";
import { Stage } from "./Stage";
import { v4 as generateUuid } from 'uuid';

class Actor {
    id: string;
    name: string;
    locationId: string;
    avatarImageUrl: string;
    description: string;
    profile: string;
    emotionPack: EmotionPack;

    // Characters are candidates for a rehabilitation program; the are coming into the program from a vast range of past life situations.
    // They may have trauma, mental health challenges, or other issues that the program is designed to help with.
    // They will be prepped for completely new lives in a sci-fi, dystopian future setting where they may be valued for different traits.
    // Graded stats from 1-10; these get translated to a letter grade in the UI
    capability: number; // Skill grade 1-10
    intelligence: number; // Intelligence grade 1-10
    condition: number; // Condition grade 1-10
    resilience: number; // Resilience grade 1-10
    charisma: number; // Personality grade 1-10
    sexuality: number; // Sexuality grade 1-10
    compliance: number; // Compliance grade 1-10

    constructor(id: string, name: string, avatarImageUrl: string, description: string, profile: string, emotionPack: EmotionPack, 
            capability: number, intelligence: number, condition: number, resilience: number, charisma: number, sexuality: number, compliance: number) {
        this.id = id;
        this.name = name;
        this.avatarImageUrl = avatarImageUrl;
        this.description = description;
        this.profile = profile;
        this.emotionPack = emotionPack;
        this.capability = capability;
        this.intelligence = intelligence;
        this.condition = condition;
        this.resilience = resilience;
        this.charisma = charisma;
        this.sexuality = sexuality;
        this.compliance = compliance;
        this.locationId = '';
    }

    scoreToGrade(score: number): string {
        const scoreClamped = Math.max(1, Math.min(10, score));
        const scoreArray = ['F', 'D', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
        return scoreArray[scoreClamped - 1];
    }
}

export async function loadReserveActor(fullPath: string, stage: Stage): Promise<Actor|null> {
    const response = await fetch(stage.characterDetailQuery.replace('{fullPath}', fullPath));
    const item = await response.json();
    const dataName = item.node.definition.name.replaceAll('{{char}}', item.node.definition.name).replaceAll('{{user}}', 'Individual X');
    const data = {
        name: dataName,
        description: item.node.definition.description.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        personality: item.node.definition.personality.replaceAll('{{char}}', dataName).replaceAll('{{user}}', 'Individual X'),
        avatar: item.node.max_res_url
    };
    // Take this data and use text generation to get an updated distillation of this character, including a physical description.
    const generatedResponse = await stage.generator.textGen({
        prompt: `{{messages}}\n\nThis is a preparatory request for formatted content for a video game set in a futuristic multiverse setting that pulls characters from across eras and timelines and settings. ` +
            `The following is a description for a random character or scenario from this multiverse's past. This response must digest and distill this description to suit the game's narrative, ` +
            `in which this character has been rematerialized into a new timeline. The provided description may reference 'Individual X' who no longer exists in this timeline; ` +
            `you should give this individual a name if they are relevant to the distillation. ` +
            `In addition to name, physical description, and personality, you will score the character with a simple 1-10 for the following traits: CONDITION, RESILIENCE, BEAUTY, CHARISMA, CAPABILITY, INTELLIGENCE, and COMPLIANCE.\n` +
            `Bear in mind the character's current state and not necessarily their original potential when scoring these traits; some characters may not respond well to being essentially resurrected into a new timeline.\n\n` +
            `Original details about ${data.name}:\nDescription: ${data.description} ${data.personality}\n\n` +
            `After carefully considering this description, provide a concise breakdown in the following format:\n` +
            `NAME: The character's full, given name.\n` +
            `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
            `PROFILE: A brief summary of the character's key personality traits and behaviors.\n` +
            `CONDITION: 1-10 scoring of their relative physical condition, with 10 being peak condition and 1 being critically impaired.\n` +
            `RESILIENCE: 1-10 scoring of their mental resilience, with 10 being highly resilient and 1 being easily broken.\n` +
            `CAPABILITY: 1-10 scoring of their overall capability to contribute meaningfully to the crew, with 10 being highly skilled and 1 being a liability.\n` +
            `INTELLIGENCE: 1-10 scoring of their intelligence level, with 10 being genius-level intellect and 1 being dumb as rocks.\n` +
            `CHARISMA: 1-10 scoring of their personality appeal, with 10 being extremely charming and 1 being off-putting.\n` +
            `SEXUALITY: 1-10 scoring of their physical lustiness, with 10 being abjectly lewd and 1 being utterly assexual.\n` +
            `COMPLIANCE: 1-10 scoring of their willingness to comply with authority, with 10 being unquestioningly obedient and 1 being rebellious.\n` +
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
    for (const line of lines) {
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
    const DEFAULT_TRAIT_SCORE = 4;
    const newActor = new Actor(
        generateUuid(),
        parsedData['name'] || data.name,
        data.avatar || '',
        parsedData['description'] || '',
        parsedData['profile'] || '',
        {}, 
        parseInt(parsedData['capability']) || DEFAULT_TRAIT_SCORE,
        parseInt(parsedData['intelligence']) || DEFAULT_TRAIT_SCORE,
        parseInt(parsedData['condition']) || DEFAULT_TRAIT_SCORE,
        parseInt(parsedData['resilience']) || DEFAULT_TRAIT_SCORE,
        parseInt(parsedData['charisma']) || DEFAULT_TRAIT_SCORE,
        parseInt(parsedData['sexuality']) || DEFAULT_TRAIT_SCORE,
        parseInt(parsedData['compliance']) || DEFAULT_TRAIT_SCORE,
    );
    console.log(`Loaded new actor: ${newActor.name} (ID: ${newActor.id})`);
    console.log(newActor);
    // If name, description, or profile are missing, discard this actor by returning null
    if (newActor.name && newActor.description && newActor.profile) {
        return newActor;
    }
    return null;
}

export async function populateActorImages(actor: Actor, stage: Stage): Promise<void> {
    // If the actor has no neutral emotion image in their emotion pack, generate one based on their description or from the existing avatar image
    if (!actor.emotionPack['neutral']) {
        let imageUrl = '';
        if (!actor.avatarImageUrl) {
            // Use stage.makeImage to create a neutral expression based on the description
            imageUrl = await stage.makeImage({
                prompt: `A high-quality portrait of a character with the following description: ${actor.description}. The character should have a neutral expression.`,
                remove_background: true,
            }, '');
        }

        // Use stage.makeImageFromImage to create a neutral expression based on imageUrl or the avatar image
        imageUrl = await stage.makeImageFromImage({
            image: imageUrl || actor.avatarImageUrl,
            prompt: `Create a waist-up standing portrait of the character described as: ${actor.description}\nThey should have a calm and neutral (yet characteristic) expression. On a white background.`,
            remove_background: true,
        }, `actors/${actor.id}/neutral.png`, '');
        console.log(`Generated neutral emotion image for actor ${actor.name} from avatar image: ${imageUrl || ''}`);
        
        actor.emotionPack['neutral'] = imageUrl || '';
    }
}

export default Actor;