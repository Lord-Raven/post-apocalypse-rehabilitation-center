import {ReactElement, useEffect, useState} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import Actor, { loadReserveActor, generatePrimaryActorImage, commitActorToEcho, Stat, generateAdditionalActorImages } from "./actors/Actor";
import { DEFAULT_GRID_SIZE, Layout, StationStat, createModule } from './Module';
import { BaseScreen } from "./screens/BaseScreen";
import {Client} from "@gradio/client";
import { generateSkitScript, SkitData } from "./Skit";
import { smartRehydrate } from "./SaveRehydration";
import { Emotion } from "./actors/Emotion";

type MessageStateType = any;
type ConfigType = any;
type InitStateType = any;
type ChatStateType = {
    saves: SaveType[]
    lastSaveSlot: number;
}

type TimelineEvent = {
    day: number;
    phase: number;
    description: string;
    skit?: SkitData;
}

type Timeline = TimelineEvent[];

type SaveType = {
    player: {name: string, description: string};
    aide: {name: string, description: string};
    echoes: (Actor | null)[]; // actors currently in echo slots (can be null for empty slots)
    actors: {[key: string]: Actor};
    bannedTags?: string[];
    layout: Layout;
    day: number;
    phase: number;
    timeline?: Timeline;
    currentSkit?: SkitData;
    stationStats?: {[key in StationStat]: number};
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    private saves: SaveType[];
    private saveSlot: number = 0;
    // Flag/promise to avoid redundant concurrent requests for reserve actors
    private reserveActorsLoadPromise?: Promise<void>;
    private freshSave: SaveType;
    readonly RESERVE_ACTORS = 5;
    readonly FETCH_AT_TIME = 10;
    readonly MAX_PAGES = 100;
    readonly bannedTagsDefault = [
        'FUZZ',
        'child',
        'teenager',
        'narrator',
        'underage',
        'multi-character',
        'multiple character',
        'multiple characters',
        'nonenglish',
        'non-english',
        'famous people',
        'celebrity',
        'real person',
        'feral'
    ];
    // At least one of these is required.
    readonly genderTags = ['male', 'female', 'masculine', 'feminine', 'non-binary', 'trans', 'genderqueer', 'genderfluid', 'agender', 'androgyne', 'intersex', 'futa', 'futanari', 'hermaphrodite'];
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags={{EXCLUSIONS}}&page={{PAGE_NUMBER}}&tags=${this.genderTags.join('%2C')}&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false` +
        `&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=5000` +
        `&require_expressions=false&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&inclusive_or=true&recommended_verified=false&count=false&min_tags=3`;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';

    private pageNumber = Math.floor(Math.random() * this.MAX_PAGES);

    // Expose a simple grid size (can be tuned)
    public gridSize = DEFAULT_GRID_SIZE;

    screenProps: any = {};

    reserveActors: Actor[] = [];

    emotionPipeline: any;
    imagePipeline: any;
    initialized: boolean = false;

    constructor(data: InitialData<InitStateType, ChatStateType, MessageStateType, ConfigType>) {

        super(data);
        const {
            characters,
            users,
            config,
            messageState,
            environment,
            initState,
            chatState
        } = data;

        console.log(chatState);
        this.saves = chatState?.saves || [];
        this.saveSlot = chatState?.lastSaveSlot || 0;

        const layout = new Layout();
        layout.setModuleAt(DEFAULT_GRID_SIZE/2, DEFAULT_GRID_SIZE/2, createModule('echo chamber', { id: `echo-${DEFAULT_GRID_SIZE/2}-${DEFAULT_GRID_SIZE/2}`, connections: [], attributes: {} }));
        layout.setModuleAt(DEFAULT_GRID_SIZE/2 - 1, DEFAULT_GRID_SIZE/2, createModule("commons", { id: `common-${DEFAULT_GRID_SIZE/2 - 1}-${DEFAULT_GRID_SIZE/2}`, connections: [], attributes: {} }));
        layout.setModuleAt(DEFAULT_GRID_SIZE/2, DEFAULT_GRID_SIZE/2 - 1, createModule("generator", { id: `generator-${DEFAULT_GRID_SIZE/2}-${DEFAULT_GRID_SIZE/2 - 1}`, connections: [], attributes: {} }));
        this.freshSave = { player: {name: Object.values(users)[0].name, description: Object.values(users)[0].chatProfile || ''}, 
            aide: {
                name: 'StationAide™', 
                description: `Your holographic assistant is acutely familiar with the technical details of your Post-Apocalypse Rehabilitation Center, so you don't have to be! ` +
                `Your StationAide™ comes pre-programmed with a friendly and non-condescending demeanor that will leave you feeling empowered and never patronized; ` +
                `your bespoke projection comes with an industry-leading feminine form in a pleasing shade of default blue, but, as always, StationAide™ remains infinitely customizable to suit your tastes.`}, 
            echoes: [], actors: {}, layout: layout, day: 1, phase: 0, currentSkit: undefined };

        // ensure at least one save exists and has a layout
        if (!this.saves.length) {
            this.saves.push(this.freshSave);
        } else {
            console.log("Something in saves:");
            console.log(this.saves);
            // Rehydrate saves with proper class instances
            this.saves = this.saves.map(save => this.rehydrateSave(save));
        }

        this.emotionPipeline = null;
        this.imagePipeline = null;
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        try {
            this.emotionPipeline = await Client.connect("ravenok/emotions");
            this.imagePipeline = await Client.connect("ravenok/Depth-Anything-V2");
        } catch (exception: any) {
            console.error(`Error loading HuggingFace pipelines, error: ${exception}`);
        }

        return {
            success: true,
            error: null,
            initState: null,
            chatState: this.buildSaves(),
        };
    }

    incPhase(numberOfPhases: number = 1) {
        const save = this.getSave();
        save.phase += numberOfPhases;
        if (save.phase >= 4) {
            save.phase = 0;
            save.day += 1;
            // New day logic.
            // Increment actor role count
            for (let actor of Object.values(save.actors)) {
                // Find non-quarters module assigned to this actor and increment held role count
                const targetModule = save.layout.getModulesWhere(m => m.ownerId === actor.id && m.type !== 'quarters')[0];
                const roleName: string = targetModule?.getAttribute('role') || '';
                if (roleName && Object.keys(actor.heldRoles).indexOf(roleName) !== -1) {
                    actor.heldRoles[roleName] += 1;
                }
            }
        }

        // When incrementing phase, maybe move some actors around in the layout.
        for (const actorId in save.actors) {
            const actor = save.actors[actorId];
            actor.locationId = save.layout.getModulesWhere(m => m.type !== 'quarters' || m.ownerId == actorId).sort(() => Math.random() - 0.5)[0]?.id || '';
            console.log(`Moved actor ${actor.name} to location ${actor.locationId}`);
        }
        this.saves[this.saveSlot] = {...save}; // Update the current save slot with the modified save, ensuring a new object reference.
        this.saveGame();
    }

    /**
     * Rehydrate a save object by restoring proper class instances
     */
    private rehydrateSave(save: any): SaveType {
        console.log('Rehydrating save:', save);
        
        // Use smart rehydration to automatically detect and restore all nested objects
        return smartRehydrate(save) as SaveType;
    }

    buildSaves(): ChatStateType {
        return {
            saves: this.saves,
            lastSaveSlot: this.saveSlot
        }
    }

    newGame() {
        this.saves.push(this.freshSave);
        this.saveSlot = this.saves.length - 1;
        this.saveGame();
    }

    saveGame() {
        console.log(this.saves);
        this.messenger.updateChatState(this.buildSaves());
    }

    getSave(): SaveType {
        return this.saves[this.saveSlot];
    }

    startGame() {
        if (this.initialized) return;
        this.initialized = true;
        // Called when a game is loaded or a new game is started
        console.log('Starting game...');
        if (this.reserveActors.length < this.RESERVE_ACTORS && !this.reserveActorsLoadPromise) {
            this.reserveActorsLoadPromise = this.loadReserveActors();
        }
        
        const save = this.getSave();
        // Initialize stationStats if missing
        if (!save.stationStats || Object.keys(save.stationStats).length < 5) {
            save.stationStats = {
                'Systems': 3,
                'Comfort': 3,
                'Provision': 3,
                'Security': 3,
                'Harmony': 3
            };
        }

        // If any echo actors are missing primary images, kick those off now.
        for (const echoActor of save.echoes) {
            if (echoActor && (!echoActor.emotionPack || !echoActor.emotionPack[Emotion.neutral] || echoActor.emotionPack[Emotion.neutral] == echoActor.avatarImageUrl)) {
                generatePrimaryActorImage(echoActor, this).then(() => {
                    this.saveGame();
                });
            }
        }

        // If there are any actors in the save with missing emotion images, kick one of them off now.
        for (const actorId in save.actors) {
            const actor = save.actors[actorId];
            if (!actor.emotionPack || !actor.emotionPack[Emotion.neutral] || actor.emotionPack[Emotion.neutral] == actor.avatarImageUrl) {
                generatePrimaryActorImage(actor, this).then(() => {
                    this.saveGame();
                });
                break; // only do one at a time
            } else if (!actor.emotionPack || Object.values(Emotion).some(emotion => emotion !== Emotion.neutral && (
                    !actor.emotionPack[emotion] || 
                    actor.emotionPack[emotion] == actor.avatarImageUrl || 
                    actor.emotionPack[emotion] == actor.emotionPack[Emotion.neutral]))) {
                generateAdditionalActorImages(actor, this).then(() => {
                    this.saveGame();
                });
                break; // only do one at a time
            }
        }
    }



    async loadReserveActors() {
        // If a load is already in-flight, return the existing promise to dedupe concurrent calls
        if (this.reserveActorsLoadPromise) return this.reserveActorsLoadPromise;

        this.reserveActorsLoadPromise = (async () => {
            try {
                console.log('Loading reserve actors...');
                while (this.reserveActors.length < this.RESERVE_ACTORS) {
                    // Populate reserveActors; this is loaded with data from a service, calling the characterServiceQuery URL:
                    const exclusions = (this.getSave().bannedTags || []).concat(this.bannedTagsDefault).map(tag => encodeURIComponent(tag)).join('%2C');
                    console.log('Applying exclusions:', exclusions);
                    const response = await fetch(this.characterSearchQuery.replace('{{PAGE_NUMBER}}', this.pageNumber.toString()).replace('{{EXCLUSIONS}}', exclusions ? exclusions + '%2C' : ''));
                    const searchResults = await response.json();
                    console.log(searchResults);
                    // Need to do a secondary lookup for each character in searchResults, to get the details we actually care about:
                    const basicCharacterData = searchResults.data?.nodes.filter((item: string, index: number) => index < this.RESERVE_ACTORS - this.reserveActors.length).map((item: any) => item.fullPath) || [];
                    this.pageNumber = (this.pageNumber % this.MAX_PAGES) + 1;
                    console.log(basicCharacterData);

                    const newActors: Actor[] = await Promise.all(basicCharacterData.map(async (fullPath: string) => {
                        return loadReserveActor(fullPath, this);
                    }));

                    this.reserveActors = [...this.reserveActors, ...newActors.filter(a => a !== null)];
                }
            } catch (err) {
                console.error('Error loading reserve actors', err);
            } finally {
                // clear the promise so future loads can be attempted if needed
                this.reserveActorsLoadPromise = undefined;
                // Note: We no longer automatically generate primary images here
                // Images will be generated when actors are committed to echo slots
            }
        })();

        return this.reserveActorsLoadPromise;
    }

    getLayout(): Layout {
        return this.getSave().layout;
    }

    async setState(state: MessageStateType): Promise<void> {
    }

    async beforePrompt(userMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        return {
            stageDirections: null,
            messageState: {},
            modifiedMessage: null,
            systemMessage: null,
            error: null,
            chatState: null,
        };
    }

    async afterResponse(botMessage: Message): Promise<Partial<StageResponse<ChatStateType, MessageStateType>>> {

        return {
            stageDirections: null,
            messageState: {},
            modifiedMessage: null,
            error: null,
            systemMessage: null,
            chatState: null
        };
    }

        async makeImage(imageRequest: Object, defaultUrl: string): Promise<string> {
        return (await this.generator.makeImage(imageRequest))?.url ?? defaultUrl;
    }

    async makeImageFromImage(imageToImageRequest: any, storageName: string, defaultUrl: string): Promise<string> {

        const imageUrl = (await this.generator.imageToImage(imageToImageRequest))?.url ?? defaultUrl;
        if (imageToImageRequest.remove_background && imageUrl != defaultUrl && this.imagePipeline) {
            try {
                return this.removeBackground(imageUrl, true, storageName);
            } catch (exception: any) {
                console.error(`Error removing background from image, error`, exception);
                return imageUrl;
            }
        }
        return imageUrl;
    }

    async removeBackground(imageUrl: string, soften: boolean, storageName: string) {
        if (!imageUrl || !this.imagePipeline) return imageUrl;
        console.log(`removeBackground(${imageUrl}, ${storageName})`);
        try {
            const response = await fetch(imageUrl);
            const backgroundlessResponse = await this.imagePipeline.predict("/remove_background", {image: await response.blob()});
            // Depth URL is the HF URL; back it up to Chub by creating a File from the image data:
            // If soften is true, we can apply a slight blur to reduce noise and accumulated artifacts.
            
            let finalBlob = await (await fetch(backgroundlessResponse.data[1].url)).blob();
            
            if (soften) {
                finalBlob = await this.softenImage(finalBlob);
            }
            
            return await this.uploadBlob(storageName, finalBlob, {type: 'image/png'});
        } catch (error) {
            console.error(`Error removing background or storing result`, error);
            return imageUrl;
        }
    }

    async softenImage(blob: Blob): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Apply slight blur filter to smooth the image
                ctx.filter = 'blur(1px)';
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(new Error('Failed to convert canvas to blob'));
                    }
                }, 'image/png');
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(blob);
        });
    }

    async uploadBlob(fileName: string, blob: Blob, propertyBag: BlobPropertyBag): Promise<string> {
        const file: File = new File([blob], fileName, propertyBag);
        return this.uploadFile(fileName, file);
    }

    async uploadFile(fileName: string, file: File): Promise<string> {
        // Don't honor filename; want to overwrite existing content that may have had a different actual name.
        const updateResponse = await this.storage.set(fileName, file).forUser();
        if (!updateResponse.data || updateResponse.data.length == 0) {
            throw new Error('Failed to upload file to storage.');
        }
        return updateResponse.data[0].value;
    }

    async commitActorToEcho(actorId: string, slotIndex: number): Promise<void> {
        const actor = this.reserveActors.find(a => a.id === actorId) || this.getSave().echoes.find(a => a?.id === actorId);
        if (actor) {
            const save = this.getSave();
            // Ensure echoes array has 3 slots
            if (save.echoes.length < 3) {
                save.echoes = [...save.echoes, ...Array(3 - save.echoes.length).fill(null)];
            }
            // Remove from any existing slot
            save.echoes = save.echoes.map(slot => slot?.id === actorId ? null : slot);
            // Place in new slot
            save.echoes[slotIndex] = actor;
            console.log('Committing actor to echo slot:', actor, slotIndex);
            commitActorToEcho(actor, this);
            
            this.saveGame();
        }
    }

    removeActorFromEcho(actorId: string): void {
        const save = this.getSave();
        save.echoes = save.echoes.map(slot => slot?.id === actorId ? null : slot);
        this.saveGame();
    }

    getEchoSlots(): (Actor | null)[] {
        const save = this.getSave();
        // Ensure we always return an array of 3 slots
        const echoes = save.echoes || [];
        return [...echoes, ...Array(Math.max(0, 3 - echoes.length)).fill(null)].slice(0, 3);
    }

    setSkit(skit: SkitData) {
        const save = this.getSave() as any;
        save.currentSkit = skit;
    }

    endSkit() {
        const save = this.getSave();
        if (save.currentSkit) {
            if (!save.timeline) {
                save.timeline = [];
            }
            // Apply endProperties to actors - find from the final entry with endScene=true
            let endProps: { [actorId: string]: { [stat: string]: number } } = {};
            const finalEndedEntry = save.currentSkit.script.slice().reverse().find(entry => entry.endScene);
            if (finalEndedEntry?.endProperties) {
                endProps = finalEndedEntry.endProperties;
            }
            for (const actorId in endProps) {
                const actorChanges = endProps[actorId];
                
                // Handle special "STATION" id for station stat changes
                if (actorId === 'STATION') {
                    if (!save.stationStats) {
                        save.stationStats = {
                            Systems: 3,
                            Comfort: 3,
                            Provision: 3,
                            Security: 3,
                            Harmony: 3
                        };
                    }
                    // Apply to save.stationStats; actorChanges is a map of stat name to change amount
                    for (const prop of Object.keys(actorChanges)) {
                        // Find matching station stat (case-insensitive)
                        for (const statKey of Object.keys(save.stationStats)) {
                            if (statKey.toLowerCase() === prop.toLowerCase() ||
                                statKey.toLowerCase().includes(prop.toLowerCase()) ||
                                prop.toLowerCase().includes(statKey.toLowerCase())) {
                                const currentValue = save.stationStats[statKey as StationStat];
                                save.stationStats[statKey as StationStat] = Math.max(1, Math.min(10, currentValue + actorChanges[prop]));
                                break;
                            }
                        }
                    }
                    continue;
                }
                
                const actor = save.actors[actorId];
                if (actor) {
                    // Apply to actor.stats; actorChanges is a map of stat name to change amount
                    for (const prop of Object.keys(actorChanges)) {
                        const stat = (prop as keyof typeof actor.stats);
                        actor.stats[stat] += actorChanges[prop];
                    }
                }
            }

            save.currentSkit.context = {...save.currentSkit.context, day: this.getSave().day};
            save.timeline.push({
                day: save.day,
                phase: save.phase,
                description: `${save.currentSkit.type} skit.`,
                skit: save.currentSkit
            });
            save.currentSkit = undefined;
            this.incPhase();
        }
    }

    async continueSkit() {
        const skit = (this.getSave() as any).currentSkit as SkitData;
        if (!skit) return;
        skit.generating = true;
        try {
            const { entries, endScene, statChanges } = await generateSkitScript(skit, this);
            skit.script.push(...entries);
        } catch (err) {
            console.error('Error continuing skit script', err);
        } finally {
            skit.generating = false;
        }
        return;
    }


    render(): ReactElement {

        return <BaseScreen stage={() => this}/>;
    }

}
