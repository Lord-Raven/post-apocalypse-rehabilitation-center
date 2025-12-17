export enum Emotion {
    neutral = 'neutral',
    approval = 'approval', // admiration, amusement
    anger = 'anger',
    confusion = 'confusion',
    desire = 'desire',
    disappointment = 'disappointment', // annoyance, disapproval
    disgust = 'disgust',
    embarrassment = 'embarrassment',
    ecstasy = 'ecstasy',
    fear = 'fear', // surprised (unpleasant)
    grief = 'grief',
    guilt = 'guilt', // remorse
    intrigue = 'intrigue', // curiosity
    joy = 'joy',
    kindness = 'kindness', // caring, gratitude
    love = 'love',
    nervousness = 'nervousness',
    pride = 'pride',
    sadness = 'sadness',
    wonder = 'wonder', // realization, optimism, excitement, surprised (pleasant)
}

export const EMOTION_SYNONYMS: {[key in Emotion]: string[]} = {
    neutral: ['calm', 'placid', 'serene', 'tranquil', 'stoic', 'neutrality', 'composed', 'composure', 'unemotional', 'impassive', 'impassivity'],
    approval: ['content', 'amusement', 'admiration', 'pleased', 'appreciative', 'appreciation', 'satisfaction', 'satisfied', 'enjoyment', 'enjoying', 'content', 'contentedness', 'cheerfulness', 'cheerful'],
    anger: ['angry', 'furious', 'fury', 'enraged', 'livid', 'wrathful', 'frustration', 'ire', 'rage'],
    confusion: ['confused', 'puzzled', 'baffled', 'stunned', 'confounded', 'perplexed', 'bewilderment', 'perplexity'],
    desire: ['seductive', 'sexy', 'desirous', 'longing', 'lust', 'yearning', 'passion', 'passionate'],
    disappointment: ['annoyed', 'disapproval', 'dismayed', 'suspicious', 'suspicion', 'distrust', 'resentment', 'defensiveness', 'mockery', 'mocking', 'skepticism'],
    disgust: ['disgusted', 'grossed_out', 'sickened', 'grossed out', 'sick', 'revulsion', 'disdain', 'contempt', 'rivulsion'],
    embarrassment: ['embarrassed', 'shame', 'ashamed', 'sheepish', 'chagrin', 'mortification', 'abashment', 'selfconsciousness', 'self-consciousness', 'bashfulness', 'bashful', 'flustered', 'fluster', 'awkwardness', 'awkward'],
    ecstasy: ['ecstasy', 'ecstatic', 'orgasm', 'orgasmic', 'finishing', 'coming', 'euphoria', 'euphoric', 'mania', 'manic'],
    fear: ['shocked', 'terrified', 'terror', 'panic', 'alarm', 'alarmed', 'frightened', 'horror', 'horrified'],
    grief: ['sad', 'upset', 'depressed', 'depression', 'sobbing', 'desperation', 'sorrow', 'despair'],
    guilt: ['remorseful', 'remorse', 'repentant', 'regretful', 'regretting', 'guiltridden', 'penitent', 'penitence', 'concern'],
    intrigue: ['intrigued', 'curious', 'curiosity', 'interest', 'absorbed', 'absorbing', 'engrossed', 'engrossing', 'mischief', 'mischievous', 'mischievousness'],
    joy: ['happy', 'happiness', 'joyfulness', 'thrilled', 'delighted', 'elated', 'jubilant', 'elation', 'humor', 'playfulness', 'playful', 'fun', 'delight', 'enthusiasm'],
    kindness: ['grateful', 'caring', 'thankful', 'sweet', 'affectionate', 'tenderness', 'care', 'fondness', 'warmth'],
    love: ['lovestruck', 'adoration', 'adoring', 'devotion', 'devoted', 'infatuated', 'infatuation', 'romantic', 'romance'],
    nervousness: ['anxious', 'uncertain', 'jittery', 'uneasy', 'unease', 'worry', 'worrying', 'vulnerability', 'vulnerable', 'hesitance', 'anxiety'],
    pride: ['proud', 'pridefulness', 'challenge', 'arrogance', 'arrogant', 'self-confidence', 'triumph', 'triumphant', 'confidence', 'confident', 'ego', 'egotism', 'egotistical', 'smug', 'smugness'],
    sadness: ['sad', 'upset', 'distress', 'sorrow', 'unhappiness', 'melancholy', 'gloom', 'dejection'],
    wonder: ['excited', 'optimistic', 'surprised', 'realization', 'excitement', 'shock', 'relief', 'hope', 'fascinated', 'fascination', 'awe', 'awe-struck'],
}

// Mapping from synonym to Emotion, built from EMOTION_SYNONYMS
export const EMOTION_MAPPING: {[key: string]: Emotion} = Object.entries(EMOTION_SYNONYMS).reduce((acc, [emotion, synonyms]) => {
    synonyms.forEach((synonym) => {
        acc[synonym] = emotion as Emotion;
    });
    return acc;
}, {} as {[key: string]: Emotion});

export const EMOTION_PROMPTS: {[emotion in Emotion]?: string} = {
    neutral: 'typical, neutral expression',
    approval: 'approving, pleased expression',
    anger: 'enraged, angry expression',
    confusion: 'stunned, confused expression',
    desire: 'sexy, seductive expression',
    disappointment: 'unhappy, annoyed expression',
    disgust: 'disgusted, grossed-out expression',
    embarrassment: 'embarrassed expression',
    ecstasy: 'flushed, euphoric expression',
    fear: 'shocked, terrified expression',
    grief: 'depressed, sobbing expression',
    guilt: 'remorseful, apologetic expression',
    intrigue: 'curious, intrigued expression',
    joy: 'happy, smiling expression',
    kindness: 'kind, grateful expression',
    love: 'adoring, lovestruck expression',
    nervousness: 'anxious, uncertain expression',
    pride: 'proud expression',
    sadness: 'sad, upset expression',
    wonder: 'inspired, wondrous expression',
}

export type EmotionPack = {[key: string]: string};
