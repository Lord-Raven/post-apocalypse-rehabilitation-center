import { EmotionPack } from "./Emotion";

class Actor {
    id: string;
    name: string;
    physicalDescription: string;
    emotionPack: EmotionPack;

    // Characters are candidates for a rehabilitation program; the are coming into the program from a vast range of past life situations.
    // They may have trauma, mental health challenges, or other issues that the program is designed to help with.
    // They will be prepped for completely new lives in a sci-fi, dystopian future setting where they may be valued for different traits.
    // Graded stats from 1-10; these get translated to a letter grade in the UI
    capability: number; // Skill grade 1-10
    health: number; // Health grade 1-10
    resilience: number; // Resilience grade 1-10
    sociability: number; // Sociability grade 1-10
    sexuality: number; // Sexuality grade 1-10
    compliance: number; // Compliance grade 1-10

    constructor(id: string, name: string, physicalDescription: string, emotionPack: EmotionPack, capability: number, health: number, resilience: number, sociability: number, sexuality: number, compliance: number) {
        this.id = id;
        this.name = name;
        this.physicalDescription = physicalDescription;
        this.emotionPack = emotionPack;
        this.capability = capability;
        this.health = health;
        this.resilience = resilience;
        this.sociability = sociability;
        this.sexuality = sexuality;
        this.compliance = compliance;
    }
}

export default Actor;