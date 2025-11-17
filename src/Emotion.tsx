export enum Emotion {
    neutral = 'neutral',
    approval = 'approval', // admiration, amusement
    anger = 'anger',
    confusion = 'confusion',
    desire = 'desire',
    disappointment = 'disappointment', // annoyance, disapproval
    disgust = 'disgust',
    embarrassment = 'embarrassment',
    fear = 'fear', // surprised (unpleasant)
    grief = 'grief',
    guilt = 'guilt', // remorse
    joy = 'joy',
    kindness = 'kindness', // caring, gratitude
    love = 'love',
    nervousness = 'nervousness',
    pride = 'pride',
    sadness = 'sadness',
    wonder = 'wonder', // realization, curiosity, optimism, excitement, surprised (pleasant)
}

export const EMOTION_PROMPTS: {[emotion in Emotion]?: string} = {
    neutral: 'calm expression',
    approval: 'approving, appreciative, pleased expression',
    anger: 'enraged, angry expression',
    confusion: 'stunned, baffled, confused expression',
    desire: 'sexy, alluring, seductive expression',
    disappointment: 'unhappy, mildly dismayed expression',
    disgust: 'disgusted, grossed-out expression',
    embarrassment: 'embarrassed, sheepish expression',
    fear: 'shocked, terrified expression',
    grief: 'depressed, sobbing expression',
    guilt: 'remorseful, repentant expression',
    joy: 'happy, smiling',
    kindness: 'kind, caring, grateful expression',
    love: 'adorable, grinning, lovestruck expression',
    nervousness: 'anxious, uncertain expression',
    pride: 'proud, haughty, puffed up expression',
    sadness: 'sad, upset expression',
    wonder: 'excitedly curious, intrigued expression',
}

export type EmotionPack = {[key: string]: string};
