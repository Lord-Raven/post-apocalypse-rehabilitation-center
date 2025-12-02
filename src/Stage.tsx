import {ReactElement, useEffect, useState} from "react";
import {StageBase, StageResponse, InitialData, Message, UpdateBuilder} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import Actor, { loadReserveActor, generatePrimaryActorImage, commitActorToEcho, Stat, generateAdditionalActorImages, loadReserveActorFromFullPath } from "./actors/Actor";
import Faction, { loadReserveFaction } from "./factions/Faction";
import { DEFAULT_GRID_SIZE, Layout, StationStat, createModule } from './Module';
import { BaseScreen } from "./screens/BaseScreen";
import { generateSkitScript, SkitData, SkitType } from "./Skit";
import { smartRehydrate } from "./SaveRehydration";
import { Emotion } from "./actors/Emotion";
import { Request } from "./factions/Request";

type MessageStateType = any;
type ConfigType = any;
type InitStateType = any;
type ChatStateType = {
    saves: (SaveType | undefined)[]
    lastSaveSlot: number;
}

type TimelineEvent = {
    day: number;
    phase: number;
    description: string;
    skit?: SkitData;
}

type Timeline = TimelineEvent[];

export type SaveType = {
    player: {name: string, description: string};
    aide: {name: string, description: string, actorId?: string};
    echoes: (Actor | null)[]; // actors currently in echo slots (can be null for empty slots)
    actors: {[key: string]: Actor};
    factions: {[key: string]: Faction};
    requests: {[key: string]: Request};
    bannedTags?: string[];
    layout: Layout;
    day: number;
    phase: number;
    timeline?: Timeline;
    currentSkit?: SkitData;
    stationStats?: {[key in StationStat]: number};
    timestamp?: number; // Unix timestamp (milliseconds) when save was last updated
    disableTextToSpeech?: boolean;
    disableEmotionImages?: boolean;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    private currentSave: SaveType;
    private saves: (SaveType | undefined)[];
    private saveSlot: number = 0;
    // Flag/promise to avoid redundant concurrent requests for reserve actors
    private reserveActorsLoadPromise?: Promise<void>;
    private reserveFactionsLoadPromise?: Promise<void>;
    private generateAidePromise?: Promise<void>;
    public imageGenerationPromises: {[key: string]: Promise<string>} = {};
    private freshSave: SaveType;
    readonly SAVE_SLOTS = 10;
    readonly RESERVE_ACTORS = 5;
    readonly PREGEN_FACTION_COUNT = 3;
    readonly MAX_FACTIONS = 5;
    readonly FETCH_AT_TIME = 10;
    readonly MAX_PAGES = 100;
    readonly bannedTagsDefault = [
        'FUZZ',
        'child',
        'teenager',
        'narrator',
        'underage',
        'multi-character',
        'multiple characters',
        'nonenglish',
        'non-english',
        'famous people',
        'celebrity',
        'real person',
        'feral'
    ];
    // At least one of these is required for a character search; some sort of gender helps indicate that the card represents a singular person.
    readonly actorTags = ['male', 'female', 'masculine', 'feminine', 'non-binary', 'trans', 'genderqueer', 'genderfluid', 'agender', 'androgyne', 'intersex', 'futa', 'futanari', 'hermaphrodite'];
    // At least one of these is required for a faction search; helps indicate that the card has a focus on setting or tone.
    readonly factionTags = ['sci-fi', 'cyberpunk', 'post-apocalyptic', 'dystopian', 'space', 'alien', 'robot', 'setting', 'world', 'narrator', 'scenario'];
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags={{EXCLUSIONS}}&page={{PAGE_NUMBER}}&tags={{SEARCH_TAGS}}&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false` +
        `&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=5000` +
        `&require_expressions=false&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&inclusive_or=true&recommended_verified=false&count=false&min_tags=3`;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';


    private actorPageNumber = Math.floor(Math.random() * this.MAX_PAGES);
    private factionPageNumber = Math.floor(Math.random() * this.MAX_PAGES);

    private userId: string;

    // Expose a simple grid size (can be tuned)
    public gridSize = DEFAULT_GRID_SIZE;

    screenProps: any = {};

    reserveActors: Actor[] = [];

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
        layout.setModuleAt(DEFAULT_GRID_SIZE/2, DEFAULT_GRID_SIZE/2, createModule('echo chamber', { id: `echo-${DEFAULT_GRID_SIZE/2}-${DEFAULT_GRID_SIZE/2}`, attributes: {} }));
        layout.setModuleAt(DEFAULT_GRID_SIZE/2 - 1, DEFAULT_GRID_SIZE/2, createModule("quarters", { id: `quarters-${DEFAULT_GRID_SIZE/2 - 1}-${DEFAULT_GRID_SIZE/2}`, attributes: {} }));
        layout.setModuleAt(DEFAULT_GRID_SIZE/2, DEFAULT_GRID_SIZE/2 - 1, createModule("generator", { id: `generator-${DEFAULT_GRID_SIZE/2}-${DEFAULT_GRID_SIZE/2 - 1}`, attributes: {} }));
        layout.setModuleAt(DEFAULT_GRID_SIZE/2 - 1, DEFAULT_GRID_SIZE/2 - 1, createModule("comms", { id: `comms-${DEFAULT_GRID_SIZE/2}-${DEFAULT_GRID_SIZE/2}`, attributes: {} }));
        this.userId = Object.values(users)[0].anonymizedId;
        this.freshSave = { player: {name: Object.values(users)[0].name, description: Object.values(users)[0].chatProfile || ''}, 
            aide: {
                name: 'Soji', 
                description: `Your holographic assistant is acutely familiar with the technical details of your Post-Apocalypse Rehabilitation Center, so you don't have to be! ` +
                `Your StationAide™ comes pre-programmed with a friendly and non-condescending demeanor that will leave you feeling empowered and never patronized; ` +
                `your bespoke projection comes with an industry-leading feminine form in a pleasing shade of default blue, but, as always, StationAide™ remains infinitely customizable to suit your tastes.`}, 
            echoes: [], actors: {}, factions: {}, requests: {}, layout: layout, day: 1, phase: 0, currentSkit: undefined };

        // ensure at least one save exists and has a layout
        if (!this.saves.length) {
            this.saves.push(this.getFreshSave());
        } else {
            console.log("Something in saves:");
            console.log(this.saves);
            // Rehydrate saves with proper class instances
            this.saves = this.saves.map(save => this.rehydrateSave(save));
        }
        if (this.saves.length < this.SAVE_SLOTS) {
            // Fill out to SAVE_SLOTS with fresh saves
            for (let i = this.saves.length; i < this.SAVE_SLOTS; i++) {
                this.saves.push(undefined);
            }
        }
        this.currentSave = this.saves[this.saveSlot] || this.getFreshSave();

/*
        this.mcp.registerTool('stationStatChange',
            {
                title: 'Modify a Station Stat',
                description: 'Register a station stat change.',
                inputSchema: {
                    stat: z.enum(Object.values(StationStat) as [string, ...string[]]),
                    change: z.number().min(-10).max(10),
                },
            },
            async ({ stat, change }): Promise<CallToolResult> => {
                // Eventually, we will attach this to some sort of resolution content for the current skit, to be displayed in SkitScreen before the "Close" button becomes available, and executed when the skit ends.
                // this.getSave().currentSkit ...
                // For now, we're just testing that it works.
                console.log(`Tool called: stationStatChange(${stat}, ${change})`);
                return { content: [{type: 'text', text: `Station stat ${stat} changed by ${change}.` }] };
            }
        );

        this.mcp.registerTool('actorStatChange',
            {
                title: 'Modify an Actor Stat',
                description: 'Register an actor stat change.',
                inputSchema: {
                    actor: z.string().min(1),
                    stat: z.enum(Object.values(Stat) as [string, ...string[]]),
                    change: z.number().min(-10).max(10),
                },
            },
            async ({ actor, stat, change }): Promise<CallToolResult> => {
                // Eventually, we will attach this to some sort of resolution content for the current skit, to be displayed in SkitScreen before the "Close" button becomes available, and executed when the skit ends.
                // this.getSave().currentSkit ...
                // For now, we're just testing that it works.
                console.log(`Tool called: actorStatChange(${actor}, ${stat}, ${change})`);
                return { content: [{type: 'text', text: `Actor ${actor}'s stat ${stat} changed by ${change}.` }] };
            }
        );

        this.mcp.registerTool('createRequest',
            {
                title: 'Create a Request',
                description: 'Create a request for resources or actions on the station.',
                inputSchema: {
                    requestDescription: z.string().min(10).max(500),
                },
            },
            async ({ requestDescription }): Promise<CallToolResult> => {
                // Eventually, we will attach this to some sort of resolution content for the current skit, to be displayed in SkitScreen before the "Close" button becomes available, and executed when the skit ends.
                // this.getSave().currentSkit ...
                // For now, we're just testing that it works.
                console.log(`Tool called: createRequest(${requestDescription})`);
                return { content: [{type: 'text', text: `Request created: ${requestDescription}` }] };
            }
        )*/
    }

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        // Attempt to load data from storage API; ten parallel requests for each save slot:
        const promises = [];
        const saves: (SaveType | undefined)[] = Array(this.SAVE_SLOTS).fill(undefined);
        for (let slot = 0; slot < this.SAVE_SLOTS; slot++) {
            promises.push(async () => {
                const response = await this.storage.get(`saveData_${slot}`).forUser(this.userId);
                console.log('Fetched save slot data from storage API:', response);

                if (response && response.data && response.data.length > 0 && response.data[0].value && Object.keys(response.data[0].value).length > 0) {
                    saves[slot] = this.rehydrateSave(response.data[0].value);
                } else if (response && response.status !== 200) {
                    console.log(`Falling back to chatstate save for slot ${slot} due to error response:`, response);
                    saves[slot] = this.saves[slot]; // fall back to existing save data if available
                } else {
                    console.log(`No save data found for slot ${slot}.`);
                }
            });
        }
        await Promise.all(promises);
        
        // If any saves were loaded, use them:
        if (saves.some(save => save !== undefined)) {
            this.saves = saves;
        } else {
            console.log('No saves loaded from storage API; using existing saves.');
            this.saveAllGames()
        }
        this.currentSave = this.saves[this.saveSlot] || this.getFreshSave();

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
            for (let actor of Object.values(save.actors).filter(a => !a.remote)) {
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
            // Move remote actors to no location:
            if (actor.remote) {
                actor.locationId = '';
            } else {
                // If actor didn't move anywhere in the last skit, put them in a random non-quarters module:
                const previousSkit = (save.timeline && save.timeline.length > 0) ? save.timeline[save.timeline.length - 1].skit : undefined;
                if (!previousSkit || previousSkit.script.every(entry => !entry.movements || !Object.keys(entry.movements).some(moverId => moverId === actor.id)) ) {
                    actor.locationId = save.layout.getModulesWhere(m => m.type !== 'quarters' || m.ownerId == actorId).sort(() => Math.random() - 0.5)[0]?.id || '';
                }
            }
            console.log(`Moved actor ${actor.name} to location ${actor.locationId}`);
            // If no patients exist, put the aide in the echo chamber:
            if (actor.id === save.aide.actorId && Object.values(save.actors).filter(a => !a.remote && a.id !== save.aide.actorId).length === 0) {
                const echoModule = save.layout.getModulesWhere(m => m.type === 'echo chamber')[0];
                if (echoModule) {
                    actor.locationId = echoModule.id;
                }
            }
        }

        // Move a random faction rep to comms room, if any factions exist:
        const commsModule = save.layout.getModulesWhere(m => m.type === 'comms')[0];
        const eligibleFactions = Object.values(save.factions).filter(faction => faction.reputation > 0 && faction.representativeId && save.actors[faction.representativeId]);
        // If there are eligible factions and a comms module, and there is at least one non-remote actor other than the aide:
        if (eligibleFactions.length > 0 && commsModule && Object.values(save.actors).filter(a => !a.remote && a.id !== save.aide.actorId).length > 0) {
            const randomFaction = eligibleFactions.sort(() => Math.random() - 0.5)[0];
            
            // Move the faction rep to the comms room, if available:
            const factionRep = save.actors[randomFaction.representativeId || ''];
            factionRep.locationId = commsModule.id;
        }
        this.currentSave = {...save}; // Update the current save slot with the modified save, ensuring a new object reference.
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
        // find first undefined save slot:
        this.saveSlot = this.saves.findIndex(save => !save);
        if (this.saveSlot === -1) {
            // Yikes, overwrite the last one. Should avoid this in the UI.
            this.saveSlot = Math.min(this.SAVE_SLOTS - 1, this.saves.length - 1);
        }
        this.currentSave = this.getFreshSave();
        this.saveGame();
    }

    saveGame() {
        // Update timestamp on current save
        this.currentSave.timestamp = Date.now();
        this.saves[this.saveSlot] = this.currentSave;
        const chatState = this.buildSaves();
        this.messenger.updateChatState(chatState);
        // Persist to storage API
        this.storage.set(`saveData_${this.saveSlot}`, this.currentSave).forUser().then(() => {
            console.log(`Saved game to slot ${this.saveSlot} in storage API.`)
        });
    }

    saveAllGames() {
        let updateBuilder: UpdateBuilder | undefined = undefined;
        for (let slot = 0; slot < this.SAVE_SLOTS; slot++) {
            if (updateBuilder === undefined) {
                updateBuilder = this.storage.set(`saveData_${slot}`, this.saves[slot]).forUser();
            } else {
                updateBuilder = updateBuilder.set(`saveData_${slot}`, this.saves[slot]).forUser();
            }
        }
        
        if (updateBuilder) {
            void updateBuilder.then(() => {
                console.log('All saves completed');
            }, (err) => {
                console.error('Save failed:', err);
            });
        }
    }

    deleteSave(slotIndex: number) {
        this.saves[slotIndex] = undefined;
        this.saveAllGames();
    }

    getSave(): SaveType {
        return this.currentSave;
    }

    getAllSaves(): (SaveType | undefined)[] {
        return this.saves;
    }

    getCurrentSlot(): number {
        return this.saveSlot;
    }

    getFreshSave(): SaveType {
        return this.rehydrateSave(JSON.parse(JSON.stringify(this.freshSave)));
    }

    loadSave(slotIndex: number) {
        this.saveSlot = slotIndex;
        this.currentSave = this.saves[this.saveSlot] || this.getFreshSave();
        this.initialized = false;
        this.startGame();
    }

    saveToSlot(slotIndex: number) {
        // Copy current save to target slot
        this.saves[slotIndex] = JSON.parse(JSON.stringify(this.currentSave));
        this.saveSlot = slotIndex;
        this.saveGame();
    }

    startGame() {
        if (this.initialized) return;
        this.initialized = true;
        // Called when a game is loaded or a new game is started
        console.log('Starting game...');

        if (!this.getSave().actors[this.getSave().aide.actorId || '']) {
            this.getSave().aide.actorId = undefined;
        }

        this.loadReserveActors();
        this.loadReserveFactions();
        this.generateAide();

        const save = this.getSave();
        // Initialize stationStats if missing
        if (!save.stationStats || Object.keys(save.stationStats).length < 6) {
            save.stationStats = {
                'Systems': 3,
                'Comfort': 3,
                'Provision': 3,
                'Security': 3,
                'Harmony': 3,
                'Wealth': 3
            };
        }
        if (!save.factions) {
            save.factions = {};
        }

        if (!save.requests) {
            save.requests = {};
        }

        // Clean out remote actors that aren't supported by current factions
        const idsToRemove: string[] = [];
        Object.values(save.actors).filter(actor => actor.remote && (save.aide?.actorId || '') !== actor.id && (!save.factions || !Object.values(save.factions).some(faction => faction.representativeId === actor.id))).forEach(actor => {
            idsToRemove.push(actor.id);
        });
        idsToRemove.forEach(id => {
            delete save.actors[id];
        });

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
            } else if (!actor.remote && (!actor.emotionPack || Object.values(Emotion).some(emotion => emotion !== Emotion.neutral && (
                    !actor.emotionPack[emotion] || 
                    actor.emotionPack[emotion] == actor.avatarImageUrl || 
                    actor.emotionPack[emotion] == actor.emotionPack[Emotion.neutral])))) {
                generateAdditionalActorImages(actor, this).then(() => {
                    this.saveGame();
                });
                break; // only do one at a time
            }
        }
    }

    getGenerateAidePromise(): Promise<void> | undefined {
        return this.generateAidePromise;
    }

    async generateAide() {
        if (this.generateAidePromise) return this.generateAidePromise;

        let save = this.getSave();
        if (!save.aide || !save.aide.actorId) {
            // If aide already exists, do nothing

            this.generateAidePromise = (async () => {
                // Generate a new aide
                const actorData = {
                    name: save.aide.name,
                    fullPath: '',
                    description: `The PARC's StationAide™ holographic assistant: ${save.aide.description}`,
                    personality: ''
                }
                // Retry a few times if it fails (or returns null):
                for (let attempt = 0; attempt < 3; attempt++) {
                    const aideActor = await loadReserveActor(actorData, this);
                    if (aideActor) {
                        save = this.getSave();
                        save.actors[aideActor.id] = aideActor;
                        aideActor.name = save.aide.name;
                        aideActor.profile = save.aide.description;
                        aideActor.remote = true;
                        save.aide.actorId = aideActor.id;
                        save.actors[aideActor.id] = aideActor;
                        await generatePrimaryActorImage(aideActor, this);
                        break;
                    }
                }
                this.generateAidePromise = undefined;
            })();
        }
        return this.generateAidePromise;
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
                    const response = await fetch(this.characterSearchQuery
                        .replace('{{PAGE_NUMBER}}', this.actorPageNumber.toString())
                        .replace('{{EXCLUSIONS}}', exclusions ? exclusions + '%2C' : '')
                        .replace('{{SEARCH_TAGS}}', this.actorTags.concat(this.actorTags).join('%2C')));
                    const searchResults = await response.json();
                    console.log(searchResults);
                    // Need to do a secondary lookup for each character in searchResults, to get the details we actually care about:
                    const basicCharacterData = searchResults.data?.nodes.filter((item: string, index: number) => index < this.RESERVE_ACTORS - this.reserveActors.length).map((item: any) => item.fullPath) || [];
                    this.actorPageNumber = (this.actorPageNumber % this.MAX_PAGES) + 1;
                    console.log(basicCharacterData);

                    const newActors: Actor[] = await Promise.all(basicCharacterData.map(async (fullPath: string) => {
                        return loadReserveActorFromFullPath(fullPath, this);
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

    async loadReserveFactions() {
        // If a load is already in-flight, return the existing promise to dedupe concurrent calls
        if (this.reserveFactionsLoadPromise) return this.reserveFactionsLoadPromise;

        this.reserveFactionsLoadPromise = (async () => {
            try {
                console.log('Loading additional factions...');
                const eligibleFactions = Object.values(this.getSave().factions).filter(faction => faction.reputation > 0);
                while (eligibleFactions.length < this.MAX_FACTIONS) {
                    const needed = this.MAX_FACTIONS - eligibleFactions.length;
                    // Populate reserveFactions; this is loaded with data from a service, calling the characterSearchQuery URL:
                    const exclusions = (this.getSave().bannedTags || []).concat(this.bannedTagsDefault).map(tag => encodeURIComponent(tag)).join('%2C');
                    console.log('Applying exclusions:', exclusions);
                    const response = await fetch(this.characterSearchQuery
                        .replace('{{PAGE_NUMBER}}', this.factionPageNumber.toString())
                        .replace('{{EXCLUSIONS}}', exclusions ? exclusions + '%2C' : '')
                        .replace('{{SEARCH_TAGS}}', this.factionTags.concat(this.factionTags).join('%2C')));
                    const searchResults = await response.json();
                    console.log(searchResults);
                    // Need to do a secondary lookup for each faction in searchResults, to get the details we actually care about:
                    const basicFactionData = searchResults.data?.nodes.filter((item: string, index: number) => index < needed).map((item: any) => item.fullPath) || [];
                    this.factionPageNumber = (this.factionPageNumber % this.MAX_PAGES) + 1;
                    console.log(basicFactionData);
                    // Do these in series instead of parallel to reduce load on the service:
                    const newFactions: Faction[] = [];
                    for (const fullPath of basicFactionData) {
                        const faction = await loadReserveFaction(fullPath, this);
                        if (faction !== null) {
                            newFactions.push(faction);
                        }
                    }
                    newFactions.forEach(faction => {if (faction != null) {eligibleFactions.push(faction); this.getSave().factions[faction.id] = faction;}});
                }
            } catch (err) {
                console.error('Error loading reserve factions', err);
            } finally {
                // clear the promise so future loads can be attempted if needed
                this.reserveFactionsLoadPromise = undefined;
            }
        })();

        return this.reserveFactionsLoadPromise;
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

    async makeImageFromImage(imageToImageRequest: any, defaultUrl: string): Promise<string> {

        const imageUrl = (await this.generator.imageToImage(imageToImageRequest))?.url ?? defaultUrl;
        if (imageToImageRequest.remove_background && imageUrl != defaultUrl) {
            try {
                return this.removeBackground(imageUrl);
            } catch (exception: any) {
                console.error(`Error removing background from image, error`, exception);
                return imageUrl;
            }
        }
        return imageUrl;
    }

    async removeBackground(imageUrl: string) {
        if (!imageUrl) return imageUrl;
        try {
            const response = await this.generator.removeBackground({image: imageUrl});
            return response?.url ?? imageUrl;
        } catch (error) {
            console.error(`Error removing background`, error);
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

    removeActorFromEcho(actorId: string, thenSave: boolean): void {
        const save = this.getSave();
        save.echoes = save.echoes.map(slot => slot?.id === actorId ? null : slot);
        if (thenSave) {
            this.saveGame();
        }
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
            let endProps: { [actorId: string]: { [stat: string]: number } } = save.currentSkit.endProperties || {};

            for (const actorId in endProps) {
                const actorChanges = endProps[actorId];
                
                // Handle Faction reputation changes
                if (actorId === 'FACTION') {
                    Object.entries(endProps[actorId]).forEach(([factionId, change]) => {
                        const faction = this.getSave().factions[factionId];
                        if (!faction) return;

                        const newReputation = Math.max(0, Math.min(10, faction.reputation + change));

                        faction.reputation = newReputation;
                        const hasCutTies = newReputation === 0;
                    
                        // If reputation reaches 0, deactivate faction and remove all their requests
                        if (hasCutTies) {
                            faction.active = false;
                            
                            // Remove all requests from this faction
                            const requestsToRemove = Object.keys(this.getSave().requests).filter(
                                requestId => this.getSave().requests[requestId].factionId === factionId
                            );
                            requestsToRemove.forEach(requestId => {
                                delete this.getSave().requests[requestId];
                            });
                            
                            console.log(`Faction ${faction.name} has cut ties with PARC. Removed ${requestsToRemove.length} requests.`);
                        }
                    });
                // Handle special "STATION" id for station stat changes
                } else if (actorId === 'STATION') {
                    if (!save.stationStats) {
                        continue;
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

            // Process requests from skit
            if (save.currentSkit.requests) {
                // Look through existing requests and remove any with the same description or initial criteria:
                for (const existingRequest of Object.values(save.requests)) {
                    if (existingRequest && save.currentSkit.requests.some(request => request.description === existingRequest.description || request.matchesCriteria(existingRequest))) {
                        // Remove the existing request
                        delete save.requests[existingRequest.id];
                    }
                }

                for (const request of save.currentSkit.requests) {
                    let factionRequestIds: string[] = [];
                    for (const existingRequest of Object.values(save.requests)) {
                        if (existingRequest && existingRequest.factionId === request.factionId) {
                            factionRequestIds.push(existingRequest.id);
                        }
                    }
                    // If there are already three requests from this faction, skip adding this one
                    if (factionRequestIds.length >= 3) {
                        // delete a random request 
                        const randomIndex = Math.floor(Math.random() * factionRequestIds.length);
                        delete save.requests[factionRequestIds[randomIndex]];
                    }
                    // Add new request
                    save.requests[request.id] = request;
                    // If faction wasn't met before, they should be now:
                    const faction = save.factions[request.factionId];
                    if (faction) {
                        // Re-establish ties, I guess.
                        if (faction.reputation <= 0) {
                            faction.reputation = 1;
                        }
                        faction.active = true;
                    }
                }
            }

            // If skit was an actor request fulfillment, remove the actor from the station (mark remote for now):
            if (save.currentSkit.type === SkitType.REQUEST_FILL_ACTOR && save.currentSkit.actorId) {
                const actor = save.actors[save.currentSkit.actorId];
                if (actor) {
                    actor.remote = true;
                    actor.locationId = '';
                    // Remove from quarters or other modules
                    save.layout.getModulesWhere(m => m.ownerId === actor.id).forEach(module => {
                        module.ownerId = '';
                    });
                }
            }

            // Save skit to timeline
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
