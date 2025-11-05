import {ReactElement} from "react";
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

    // Expose a simple grid size (can be tuned)
    public gridSize = DEFAULT_GRID_SIZE;

    // screen should be a type that extends ScreenBase; not an instance but a class reference to allow instantiation. For instance, screen should be ScreenStation by default.
    screen: typeof ScreenBase = ScreenStation;

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

    async load(): Promise<Partial<LoadResponse<InitStateType, ChatStateType, MessageStateType>>> {

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

        return <div style={{
            width: '100vw',
            height: '100vh',
            display: 'grid',
            alignItems: 'stretch'
        }}>
            {this.screen == ScreenStation &&
                <ScreenStation stage={this} />
            }
            {this.screen == ScreenCryo && 
                <ScreenCryo stage={this} pods={['Cryo Pod A', 'Cryo Pod B', 'Cryo Pod C']} 
                    onAccept={(selected, stage) => {console.log(`onAccept(${selected})`); stage.screen = ScreenStation}} 
                    onCancel={(stage) => {console.log(`onCancel()`); stage.screen = ScreenStation}} />
            }
        </div>;
    }

}
