import {ReactElement, useEffect, useState} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import ScreenStation from "./ScreenStation";
import Actor, { loadReserveActor, populateActorImages } from "./Actor";
import { DEFAULT_GRID_SIZE, Layout, createModule } from './Module';
import { ScreenBase } from "./ScreenBase";
import ScreenCryo from "./ScreenCryo";
import {Client} from "@gradio/client";



type MessageStateType = any;
type ConfigType = any;
type InitStateType = any;
type ChatStateType = {
    saves: SaveType[]
}

type SaveType = {
    messageTree: MessageTree;
    currentMessageId: string;
    actors: {[key: string]: Actor};
    layout: Layout;
    day: number;
    phase: number;
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    private saves: SaveType[];
    // Flag/promise to avoid redundant concurrent requests for reserve actors
    private reserveActorsLoadPromise?: Promise<void>;
    readonly RESERVE_ACTORS = 3;
    readonly FETCH_AT_TIME = 10;
    readonly MAX_PAGES = 100;
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags=child%2Cteenager%2Cnarrator%2Cunderage%2CMultiple%20Character&page={pageNumber}&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=10000&require_expressions=false&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&inclusive_or=true&recommended_verified=false&count=false`;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';

    private pageNumber = Math.floor(Math.random() * this.MAX_PAGES);

    // Expose a simple grid size (can be tuned)
    public gridSize = DEFAULT_GRID_SIZE;

    // screen should be a type that extends ScreenBase; not an instance but a class reference to allow instantiation. For instance, screen should be ScreenStation by default.
    screen: typeof ScreenBase = ScreenStation;

    reserveActors: Actor[] = [];

    // Internal render callback registered by the UI wrapper so the Stage can request re-renders when internal state (like `screen`) changes.
    private renderCallback?: () => void;

    emotionPipeline: any;
    imagePipeline: any;

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

        this.saves = chatState?.saves || [];
        // ensure at least one save exists and has a layout
        if (!this.saves.length) {
            const layout = new Layout();
            layout.setModuleAt(DEFAULT_GRID_SIZE/2, DEFAULT_GRID_SIZE/2, createModule('command', { id: `command-${DEFAULT_GRID_SIZE/2}-${DEFAULT_GRID_SIZE/2}`, connections: [], attributes: {} }));
            layout.setModuleAt(DEFAULT_GRID_SIZE/2 - 1, DEFAULT_GRID_SIZE/2, createModule("common", { id: `common-${DEFAULT_GRID_SIZE/2 - 1}-${DEFAULT_GRID_SIZE/2}`, connections: [], attributes: {} }));
            layout.setModuleAt(DEFAULT_GRID_SIZE/2, DEFAULT_GRID_SIZE/2 - 1, createModule("generator", { id: `generator-${DEFAULT_GRID_SIZE/2}-${DEFAULT_GRID_SIZE/2 - 1}`, connections: [], attributes: {} }));
            this.saves.push({ messageTree: null as any, currentMessageId: '', actors: {}, layout: layout, day: 1, phase: 0 });
        }

        this.emotionPipeline = null;
        this.imagePipeline = null;
    }

    /**
     * Called by the UI wrapper to register a callback that will cause the mounted React view to re-render.
     */
    setRenderCallback(cb?: () => void) {
        this.renderCallback = cb;
    }

    /**
     * Request the UI wrapper to update. Safe to call from screens when they mutate the stage.
     */
    requestUpdate() {
        if (this.renderCallback) this.renderCallback();
    }

    /**
     * Change the active screen and request a UI update.
     */
    setScreen(screenClass: typeof ScreenBase) {
        this.screen = screenClass;
        this.requestUpdate();
    }

    incPhase(numberOfPhases: number = 1) {
        const save = this.getSave();
        save.phase += numberOfPhases;
        if (save.phase >= 4) {
            save.phase = 0;
            save.day += 1;
        }

        // When incrementing phase, maybe move some actors around in the layout.
        for (const actorId in save.actors) {
            const actor = save.actors[actorId];
            actor.locationId = save.layout.getModulesWhere(m => ['command', 'common', 'generator'].includes(m.type) || m.ownerId == actorId)![0]?.id || '';
        }
    }

    getSave(): SaveType {
        return this.saves[0];
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
            chatState: null,
        };
    }



    async loadReserveActors() {
        // If a load is already in-flight, return the existing promise to dedupe concurrent calls
        if (this.reserveActorsLoadPromise) return this.reserveActorsLoadPromise;

        this.reserveActorsLoadPromise = (async () => {
            try {
                while (this.reserveActors.length < this.RESERVE_ACTORS) {
                    // Populate reserveActors; this is loaded with data from a service, calling the characterServiceQuery URL:
                    const response = await fetch(this.characterSearchQuery.replace('{pageNumber}', this.pageNumber.toString()));
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
                // Notify the UI wrapper that actors are now loaded so it can re-render
                // this.requestUpdate();
            } catch (err) {
                console.error('Error loading reserve actors', err);
            } finally {
                // clear the promise so future loads can be attempted if needed
                this.reserveActorsLoadPromise = undefined;
                for (const actor of this.reserveActors) {
                    // Don't await. Just kick these off.
                    populateActorImages(actor, this);
                }
            }
        })();

        return this.reserveActorsLoadPromise;
    }

    getLayout(): Layout {
        return this.saves[0].layout;
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
                return this.removeBackground(imageUrl, storageName);
            } catch (exception: any) {
                console.error(`Error removing background from image, error: ${exception}`);
                return imageUrl;
            }
        }
        return imageUrl;
    }

    async removeBackground(imageUrl: string, storageName: string) {
        if (!imageUrl || !this.imagePipeline) return imageUrl;
        console.log(`removeBackground(${imageUrl}, ${storageName})`);
        try {
            const response = await fetch(imageUrl);
            const backgroundlessResponse = await this.imagePipeline.predict("/remove_background", {image: await response.blob()});
            // Depth URL is the HF URL; back it up to Chub by creating a File from the image data:
            return await this.uploadBlob(storageName, await (await fetch(backgroundlessResponse.data[1].url)).blob(), {type: 'image/png'});
        } catch (error) {
            console.error(`Error removing background or storing result: ${error}`);
            return imageUrl;
        }
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


    render(): ReactElement {

        // Render a small functional wrapper component that can register a render callback
        // with this Stage instance. Screens may change `this.screen` and then call
        // `stage.requestUpdate()` or `stage.setScreen(...)` to cause this wrapper to re-render.
        const StageView: React.FC<{stage: Stage}> = ({stage}) => {
            const [, setTick] = useState(0);
            useEffect(() => {
                // register a callback that bumps local state to force a re-render
                stage.setRenderCallback(() => setTick(t => t + 1));
                return () => {
                    stage.setRenderCallback(undefined);
                };
            }, [stage]);

            // If there are no potential actors, kick off a load — but only if a load is not already in progress.
            useEffect(() => {
                let cancelled = false;
                if (stage.reserveActors.length === 0 && !(stage as any).potentialActorsLoading) {
                    // call but don't block render
                    (async () => {
                        try {
                            await stage.loadReserveActors();
                        } catch (err) {
                            // swallow — loadPotentialActors already logs errors
                            if (!cancelled) console.debug('loadPotentialActors failed', err);
                        }
                    })();
                }
                return () => { cancelled = true; };
            }, [stage, stage.reserveActors.length]);

            return <div style={{
                width: '100vw',
                height: '100vh',
                display: 'grid',
                alignItems: 'stretch'
            }}>
                {stage.screen == ScreenStation &&
                    <ScreenStation stage={stage} />
                }
                {stage.screen == ScreenCryo && 
                    <ScreenCryo
                        stage={stage}
                        candidates={this.reserveActors}
                        onAccept={(selected, s) => {
                            console.log(`onAccept(${selected})`);
                            // use stage API so UI will update
                            s.setScreen(ScreenStation);
                        }}
                        onCancel={(s) => {
                            console.log(`onCancel()`);
                            s.setScreen(ScreenStation);
                        }}
                    />
                }
            </div>;
        };

        return <StageView stage={this} />;
    }

}
