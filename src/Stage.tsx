import {ReactElement, useEffect, useState} from "react";
import {StageBase, StageResponse, InitialData, Message} from "@chub-ai/stages-ts";
import {LoadResponse} from "@chub-ai/stages-ts/dist/types/load";
import ScreenStation from "./ScreenStation";
import Actor from "./Actor";
import { DEFAULT_GRID_SIZE, Layout, createModule } from './Module';
import { ScreenBase } from "./ScreenBase";
import ScreenCryo from "./ScreenCryo";


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
}

export class Stage extends StageBase<InitStateType, ChatStateType, MessageStateType, ConfigType> {

    private saves: SaveType[];
    readonly FETCH_AT_TIME = 3;
    readonly characterSearchQuery = `https://inference.chub.ai/search?first=${this.FETCH_AT_TIME}&exclude_tags=child%2Cteenager%2Cnarrator&page=1&sort=random&asc=false&include_forks=false&nsfw=true&nsfl=false&nsfw_only=false&require_images=false&require_example_dialogues=false&require_alternate_greetings=false&require_custom_prompt=false&exclude_mine=false&min_tokens=200&max_tokens=10000&require_expressions=false&require_lore=false&mine_first=false&require_lore_embedded=false&require_lore_linked=false&my_favorites=false&username=bananabot&inclusive_or=true&recommended_verified=false&count=false`;
    readonly characterDetailQuery = 'https://inference.chub.ai/api/characters/{fullPath}?full=true';

    // Expose a simple grid size (can be tuned)
    public gridSize = DEFAULT_GRID_SIZE;

    // screen should be a type that extends ScreenBase; not an instance but a class reference to allow instantiation. For instance, screen should be ScreenStation by default.
    screen: typeof ScreenBase = ScreenStation;

    potentialActors: Actor[] = [];

    // Internal render callback registered by the UI wrapper so the Stage can request re-renders when internal state (like `screen`) changes.
    private renderCallback?: () => void;

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
            this.saves.push({ messageTree: null as any, currentMessageId: '', actors: {}, layout: layout });
        }

        // initialize Layout manager for the active save (index 0)
        const initial = this.saves[0].layout;
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

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

        // Populate potentialActors; this is loaded with data from a service, calling the characterServiceQuery URL:
        const response = await fetch(this.characterSearchQuery);
        const searchResults = await response.json();
        console.log(searchResults);
        // Need to do a secondary lookup for each character in searchResults, to get the details we actually care about:
        const basicCharacterData = searchResults.data?.nodes.map((item: any) => item.fullPath) || [];
        console.log(basicCharacterData);

        const newActors: Actor[] = await Promise.all(basicCharacterData.map(async (fullPath: string) => {
            const response = await fetch(this.characterDetailQuery.replace('{fullPath}', fullPath));
            const item = await response.json();
            const data = {
                name: item.node.definition.name,
                description: item.node.definition.description,
                personality: item.node.definition.personality,
                avatar: item.node.definition.avatar
            };
            // Take this data and use text generation to get an updated distillation of this character, including a physical description.
            const generatedResponse = await this.generator.textGen({
                prompt: `This is a preparatory request for formatted content for a video game set in a futuristic multiverse setting that pulls characters from across eras and timelines and settings. ` +
                    `The following is a description for a random character or scenario from this multiverse's past. This response must digest and distill this description to suit the game's narrative, ` +
                    `in which this character has been rematerialized into a new timeline. The provided description may reference 'Individual X' who no longer exists in this timeline; ` +
                    `you should give this individual a name if they are relevant to the distillation. ` +
                    `In addition to name, physical description, and personality, you will score the character between 1 and 10 on the following traits: CONDITION, RESILIENCE, BEAUTY, PERSONALITY, CAPABILITY, and INTELLIGENCE.\n` +
                    `Bear in mind the character's current state and not necessarily their original potential when scoring these traits; some characters may not respond well to being essentially resurrected into a new timeline.\n\n` +
                    `Original details about ${data.name}:\nDescription: ${data.description} ${data.personality}\n\n` +
                    `After carefully considering this description, provide a concise breakdown in the following format:\n` +
                    `NAME: The character's full, given name.\n` +
                    `DESCRIPTION: A vivid description of the character's physical appearance, attire, and any distinguishing features.\n` +
                    `PERSONALITY: A brief summary of the character's key personality traits and behaviors.\n` +
                    `CONDITION: 1-10 scoring of their relative physical condition, with 10 being peak condition and 1 being critically impaired.\n` +
                    `RESILIENCE: 1-10 scoring of their mental resilience, with 10 being highly resilient and 1 being easily broken.\n` +
                    `SEXUALITY: 1-10 scoring of their physical lustiness, with 10 being abjectly lewd and 1 being utterly assexual.\n` +
                    `PERSONALITY: 1-10 scoring of their personality appeal, with 10 being extremely charming and 1 being off-putting.\n` +
                    `CAPABILITY: 1-10 scoring of their overall capability to contribute meaningfully to the crew, with 10 being highly capable and 1 being a liability.\n` +
                    `INTELLIGENCE: 1-10 scoring of their intelligence level, with 10 being genius-level intellect and 1 being below average intelligence.\n` +
                    `#END#`,
                    stop: ['#END'],
                    max_tokens: 700,
            });
            const lines = generatedResponse?.result.split('\n').map((line: string) => line.trim()) || [];
            const parsedData: any = {};
            for (const line of lines) {
                const [key, ...rest] = line.split(':');
                if (key && rest.length) {
                    parsedData[key.toLowerCase()] = rest.join(':').trim();
                }
            }
            // Create an Actor instance from the parsed data; ID should be generated uniquely
            const newActor = new Actor(
                `actor-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                parsedData['name'] || data.name,
                data.avatar || '',
                parsedData['description'] || data.description,
                parsedData['personality'] || data.personality,
                {},
                parsedData['condition'] || 4,
                parsedData['resilience'] || 4,
                parsedData['sexuality'] || 4,
                parsedData['personality'] || 4,
                parsedData['capability'] || 4,
                parsedData['intelligence'] || 4
            );
            console.log(`Loaded new actor: ${newActor.name} (ID: ${newActor.id})`);
            console.log(newActor);
            return newActor;
        }));

        this.potentialActors = [...this.potentialActors, ...newActors];

        return {
            success: true,
            error: null,
            initState: null,
            chatState: null,
        };
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
                        pods={this.potentialActors.map(actor => actor.name)}
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
