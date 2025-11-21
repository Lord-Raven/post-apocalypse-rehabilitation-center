import {ReactElement, useEffect, useState} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import Actor, { loadReserveActor, generatePrimaryActorImage, commitActorToEcho } from "./actors/Actor";
import { DEFAULT_GRID_SIZE, Layout, createModule } from './Module';
import { BaseScreen } from "./screens/BaseScreen";
import {Client} from "@gradio/client";
import { generateVignetteScript, VignetteData } from "./Vignette";
import { smartRehydrate } from "./SaveRehydration";

type MessageStateType = any;
type ConfigType = any;
type InitStateType = any;
type ChatStateType = {
    saves: SaveType[]
    lastSaveSlot: number;
}

type SaveType = {
    player: {name: string};
    echoes: (Actor | null)[]; // actors currently in echo slots (can be null for empty slots)
    actors: {[key: string]: Actor};
    bannedTags?: string[];
    layout: Layout;
    day: number;
    phase: number;
    vignetteSummaries?: [];
    pastVignettes?: VignetteData[];
    currentVignette?: VignetteData;
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
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags={{ADDITIONAL_EXCLUSIONS}}FUZZ%2Cchild%2Cteenager%2Cnarrator%2Cunderage%2CMultiple%20Character%2CNonEnglish%2CFamous%20People%2CFeral&page={pageNumber}&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=10000&require_expressions=false&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&inclusive_or=true&recommended_verified=false&count=false`;
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
        this.freshSave = { player: {name: Object.values(users)[0].name}, echoes: [], actors: {}, layout: layout, day: 1, phase: 0, currentVignette: undefined };

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
                const targetModule = save.layout.getModulesWhere(m => m.ownerId === actor.id && !['quarters', 'echo', 'common', 'generator'].includes(m.type))[0];
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
        }
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
    }



    async loadReserveActors() {
        // If a load is already in-flight, return the existing promise to dedupe concurrent calls
        if (this.reserveActorsLoadPromise) return this.reserveActorsLoadPromise;

        this.reserveActorsLoadPromise = (async () => {
            try {
                console.log('Loading reserve actors...');
                while (this.reserveActors.length < this.RESERVE_ACTORS) {
                    // Populate reserveActors; this is loaded with data from a service, calling the characterServiceQuery URL:
                    const additionalExclusions = (this.getSave().bannedTags || []).map(tag => encodeURIComponent(tag)).join('%2C');
                    console.log('Applying additionalExclusions:', additionalExclusions);
                    const response = await fetch(this.characterSearchQuery.replace('{pageNumber}', this.pageNumber.toString()).replace('{{ADDITIONAL_EXCLUSIONS}}', additionalExclusions ? additionalExclusions + '%2C' : ''));
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

    setVignette(vignette: VignetteData) {
        const save = this.getSave() as any;
        save.currentVignette = vignette;
    }

    endVignette() {
        const save = this.getSave() as any;
        if (save.currentVignette) {
            if (!save.pastVignette) {
                save.pastVignette = [];
            }
            // Apply endProperties to actors
            const endProps = save.currentVignette.endProperties || {};
            for (const actorId in endProps) {
                const actorChanges = endProps[actorId];
                const actor = save.actors[actorId];
                if (actor) {
                    for (const prop in actorChanges) {
                        if (prop in actor) {
                            (actor as any)[prop] += actorChanges[prop];
                        }
                    }
                }
            }

            save.currentVignette.context = {...save.currentVignette.context, day: this.getSave().day};
            save.pastVignette.push(save.currentVignette);
            save.currentVignette = undefined;
        }
    }

    async continueVignette() {
        const vignette = (this.getSave() as any).currentVignette as VignetteData;
        if (!vignette) return;
        vignette.generating = true;
        try {
            const { entries, endScene, statChanges } = await generateVignetteScript(vignette, this);
            vignette.script.push(...entries);
            vignette.endScene = endScene;
            vignette.endProperties = statChanges;
        } catch (err) {
            console.error('Error continuing vignette script', err);
        } finally {
            vignette.generating = false;
        }
        return;
    }


    render(): ReactElement {

        return <BaseScreen stage={() => this}/>;
    }

}
