import { SkitType } from './Skit';
import { Stage } from "./Stage";
import { ScreenType } from './screens/BaseScreen';
import { Build, Hotel, Restaurant, Security, AttachMoney, Favorite } from '@mui/icons-material';

export type ModuleType = 'echo chamber' | 'comms' | 'generator' | 'quarters' | 'commons' | 'infirmary' | 'gym' | 'lounge' | 'armory' ;
    /*| 'hydroponics' | 'laboratory' | 'observatory' | 'security' | 'storage' | 'market' |
    'brig' | 'showers' | 'conservatory' |
    // Administration pack:
    'directors suite' | 'office' | 'vault' | 'archives' |
    // Tourism pack:
    'guest wing' | 'shuttle bay' | 'restaurant' | 'casino' | 'spa' |
    // Spirituality/arcana pack:
    'chapel' | 'arcanium' | 'meditation room' | 'ritual chamber' | 'reliquary' |
    // Recreation pack:
    'holodeck' | 'arcade' | 'arena' | 'disco' | 'theater' |
    // Spicy pack:
    'brothel' | 'dungeon' | 'black market' | 'harem' | 
    */
export enum StationStat {
    SYSTEMS = 'Systems',
    COMFORT = 'Comfort',
    PROVISION = 'Provision',
    SECURITY = 'Security',
    HARMONY = 'Harmony',
    WEALTH = 'Wealth'
}

// Icon mapping for station stats
export const STATION_STAT_ICONS: Record<StationStat, any> = {
    [StationStat.SYSTEMS]: Build,
    [StationStat.COMFORT]: Hotel,
    [StationStat.PROVISION]: Restaurant,
    [StationStat.SECURITY]: Security,
    [StationStat.HARMONY]: Favorite,
    [StationStat.WEALTH]: AttachMoney,
};

export const STATION_STAT_DESCRIPTIONS: Record<StationStat, string> = {
    'Systems': 'Mechanical and structural health of the station',
    'Comfort': 'Overall comfort and livability for inhabitants',
    'Provision': 'Availability of food, water, and essential supplies',
    'Security': 'Safety and defense against external and internal threats',
    'Harmony': 'Social cohesion and morale among inhabitants',
    'Wealth': 'Financial resources of the station and its Director'
};

export function getStatRating(score: number): StatRating {
    if (score <= 2) {
        return StatRating.POOR;
    } else if (score <= 4) {
        return StatRating.BELOW_AVERAGE;
    } else if (score <= 6) {
        return StatRating.AVERAGE;
    } else if (score <= 8) {
        return StatRating.GOOD;
    } else {
        return StatRating.EXCELLENT;
    }
}

// Mapping of StationStat to a set of prompt additions based on the 1-10 rating of the stat
// 5 ratings: 1-2 (poor), 3-4 (below average), 5-6 (average), 7-8 (good), 9-10 (excellent)
export enum StatRating {
    POOR = 'poor',
    BELOW_AVERAGE = 'below average',
    AVERAGE = 'average',
    GOOD = 'good',
    EXCELLENT = 'excellent'
}
export const STATION_STAT_PROMPTS: Record<StationStat, Record<StatRating, string>> = {
    'Systems': {
        [StatRating.POOR]: 'The station is plagued by frequent mechanical failures, computer glitches, and structural issues, making it barely operational.',
        [StatRating.BELOW_AVERAGE]: 'The station experiences occasional mechanical and electronic problems and minor structural concerns that need attention.',
        [StatRating.AVERAGE]: 'The station is generally functional with standard maintenance keeping systems operational, if finicky.',
        [StatRating.GOOD]: 'The station runs smoothly with well-maintained systems and minimal issues.',
        [StatRating.EXCELLENT]: 'The station boasts state-of-the-art systems and impeccable structural integrity, operating flawlessly.'
    },
    'Comfort': {
        [StatRating.POOR]: 'Living conditions are harsh, filthy, and downright unhealthy, leading to widespread dissatisfaction among inhabitants.',
        [StatRating.BELOW_AVERAGE]: 'Living conditions are subpar, messy, and unpleasant, with many inhabitants feeling uneasy in their environment.',
        [StatRating.AVERAGE]: 'Living conditions and cleanliness are acceptable, providing a basic level of comfort for inhabitants.',
        [StatRating.GOOD]: 'The station offers a comfortable, clean, and pleasant living environment for its inhabitants.',
        [StatRating.EXCELLENT]: 'Inhabitants enjoy luxurious, impeccable, and healthful living conditions, enhancing their overall well-being.'
    },
    'Provision': {
        [StatRating.POOR]: 'Essential supplies are scarce, leading to frequent shortages and hardships for inhabitants.',
        [StatRating.BELOW_AVERAGE]: 'Provision levels are inconsistent, with occasional shortages of food, water, and supplies.',
        [StatRating.AVERAGE]: 'The station maintains a steady supply of essentials, meeting the basic needs of inhabitants.',
        [StatRating.GOOD]: 'Provision levels are reliable, ensuring inhabitants have access to necessary supplies without issue.',
        [StatRating.EXCELLENT]: 'The station is abundantly stocked with essentials, providing more than enough for all inhabitants.'
    },
    'Security': {
        [StatRating.POOR]: 'The station is vulnerable to threats, with inadequate defenses and frequent security concerns.',
        [StatRating.BELOW_AVERAGE]: 'Security measures are weak, leading to occasional malfeasance and safety concerns among inhabitants.',
        [StatRating.AVERAGE]: 'The station has standard security protocols in place; inhabitants may occasionally act out but are generally kept in check.',
        [StatRating.GOOD]: 'Security is robust, effectively protecting the station and its inhabitants from threats.',
        [StatRating.EXCELLENT]: 'The station boasts top-tier security systems, ensuring unparalleled safety and protection for all.'
    },
    'Harmony': {
        [StatRating.POOR]: 'Social tensions run high and morale is non-existent, leading to frequent conflicts and a toxic atmosphere among inhabitants.',
        [StatRating.BELOW_AVERAGE]: 'Harmony is lacking and morale is low, with noticeable divisions and occasional disputes among inhabitants.',
        [StatRating.AVERAGE]: 'The social environment is stable, with decent morale and generally peaceful coexistence.',
        [StatRating.GOOD]: 'A strong sense of community and high morale prevails, fostering good vibes and positive relationships among inhabitants.',
        [StatRating.EXCELLENT]: 'Inhabitants enjoy a harmonious and supportive social environment, thriving together in unity.'
    },
    'Wealth': { // Wealther is financial resources of the station and its Director and does not necessarily reflect the personal wealth of inhabitants nor the station's overall provision levels
        [StatRating.POOR]: 'Financial resources are critically low, potentially leading to severe budget cuts and creditor threats.',
        [StatRating.BELOW_AVERAGE]: 'Wealth levels are low, leading to budget constraints and creditor complaints.',
        [StatRating.AVERAGE]: 'The Director maintains a stable financial footing, covering operational costs and bills.',
        [StatRating.GOOD]: 'The Director is financially healthy, with ample resources in reserve.',
        [StatRating.EXCELLENT]: 'The Director enjoys significant wealth, capable of lavish spending.'
    }
};

export interface ModuleIntrinsic {
    skitPrompt?: string; // Additional prompt text to influence the script in skit generation
    imagePrompt?: string; // Additional prompt text to describe the module in decor image generation
    role?: string;
    roleDescription?: string;
    baseImageUrl: string; // Base image that is used for theming through image2image calls
    defaultImageUrl: string; // Default themed version of the module
    cost: {[key in StationStat]?: number}; // Cost to build the module (StationStat name to amount)
    [key: string]: any; // Additional properties, if needed
    // Action method; each module has an action that will need to take the Module and Stage as contextual parameters:
    action?: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => void;
    available: (stage: Stage) => boolean;
}

const randomAction = (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => {
            // If there are actors here, open a skit with them:
            if (Object.values(stage.getSave().actors).some(a => a.locationId === module.id)) {
                // Maybe move the module's owner (if any) here:
                if (module.ownerId && stage.getSave().actors[module.ownerId] && Math.random() < 0.5) {
                    stage.getSave().actors[module.ownerId].locationId = module.id;
                }
                console.log("Opening skit.");

                stage.setSkit({
                    type: SkitType.RANDOM_ENCOUNTER,
                    moduleId: module.id,
                    script: [],
                    generating: true,
                    context: {},
                });
                setScreenType(ScreenType.SKIT);
            }
        };

export const MODULE_DEFAULTS: Record<ModuleType, ModuleIntrinsic> = {
    'echo chamber': {
        skitPrompt: 'The echo chamber is where the player fuses echoes from the nearby black hole. Scenes in this room typically involve newly echofused patients as they get their bearings.',
        imagePrompt: 'A futuristic lab with a bank of cryo pods along the left wall and some advanced computer systems against the right wall.',
        role: 'Assistant',
        roleDescription: `Manage station operations, monitoring the crew and supplementing their needs as the director's right hand.`,
        baseImageUrl: 'https://media.charhub.io/2f92a39f-02be-41fd-b61d-56de04a9ecc4/62d30715-01e1-4581-beb4-61cf31134955.png',
        defaultImageUrl: 'https://media.charhub.io/026ae01a-7dc8-472d-bfea-61548b87e6ef/84990780-8260-4833-ac0b-79c1a15ddb9e.png',
        cost: {}, // Free; starter module
        action: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => {
            // Open the station management screen
            console.log("Opening echo screen from command module.");
            // Use Stage API so any mounted UI can react to the change
            setScreenType(ScreenType.ECHO);
        },
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'echo chamber').length === 0;
        }
    },
    comms: {
        skitPrompt: 'The comms room is the hub for all external and internal station communications. This room is critical for communicating with external factions, with whom the PARC fulfills contracts to supply patients "jobs." ' +
            `Scenes here often involve receiving important messages, coordinating among the crew, or managing station-wide announcements.`,
        imagePrompt: 'A sci-fi communications room dominated by a massive screen and associated computers and equipment, as well as some seating.',
        role: 'Liaison',
        roleDescription: `Handle all communications for the station, liaising with external entities and managing internal announcements.`,
        baseImageUrl: 'https://media.charhub.io/e13c7784-9f5f-4ec2-a179-5bab52973b3a/f5e69e63-88bf-4f7d-919b-41c8a2adcc6c.png',
        defaultImageUrl: 'https://media.charhub.io/9293912a-ebf4-4a0f-bac6-b9bfc82115f1/2ce9899c-a8cb-4186-9abb-fb8192ced8bd.png',
        cost: {}, // Free; starter module
        action: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => {
            // If there is a rep from a faction here, open a faction interaction skit
            if (Object.values(stage.getSave().factions).some(a => a.representativeId && stage.getSave().actors[a.representativeId]?.locationId === module.id)) {
                const faction = Object.values(stage.getSave().factions).find(a => a.representativeId && stage.getSave().actors[a.representativeId]?.locationId === module.id);
                if (faction) {
                    // Move the module's owner (if any) here:
                    if (module.ownerId && stage.getSave().actors[module.ownerId]) {
                        stage.getSave().actors[module.ownerId].locationId = module.id;
                    }
                    // Introduce a new faction:
                    if (!faction.active && faction?.reputation > 0) {
                        // Activate a new faction:
                        faction.active = true;
                        stage.setSkit({
                            type: SkitType.FACTION_INTRODUCTION,
                            moduleId: module.id,
                            script: [],
                            generating: true,
                            context: {factionId: faction.id,}
                        });
                    } else {
                        stage.setSkit({
                            type: SkitType.FACTION_INTERACTION,
                            moduleId: module.id,
                            script: [],
                            generating: true,
                            context: {factionId: faction.id}
                        });
                    }
                    setScreenType(ScreenType.SKIT);
                }
            } else if (Object.values(stage.getSave().actors).some(a => a.locationId === module.id)) {
                console.log("Opening skit.");
                stage.setSkit({
                    type: SkitType.RANDOM_ENCOUNTER,
                    moduleId: module.id,
                    script: [],
                    generating: true,
                    context: {}
                });
                setScreenType(ScreenType.SKIT);
            }
        },
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'comms').length === 0;
        }
    },
    generator: {
        skitPrompt: 'The generator room serves as an engineering hub of sorts, where many of the station\'s mechanical systems can be managed. Scenes here often involve the station\'s overall systems health and stability.',
        imagePrompt: 'A sci-fi chamber dominated by a large, glowing generator, filled with humming machinery, control panels, and energy conduits.',
        role: 'Engineer',
        roleDescription: `Oversee the station's mechanical systems, ensuring all modules receive adequate energy and maintenance to function optimally.`,
        baseImageUrl: 'https://media.charhub.io/e53eeeb3-81a9-4020-a336-070c65edbb8a/4141ed00-9ab7-47f5-a4ce-21983b013e46.png',
        defaultImageUrl: 'https://media.charhub.io/36c3c8b5-1abd-4766-8042-fa7a2af0ce42/6106d6ec-7746-4130-8e13-860c89a325c7.png',
        cost: {}, // Free; starter module
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'generator').length === 0;
        }
    },
    quarters: {
        skitPrompt: 'Crew quarters are personal living spaces for station inhabitants. Scenes here often involve personal interactions:  revelations, troubles, interests, or relaxation.',
        imagePrompt: 'A sci-fi living quarters with a bed, personal storage, and ambient lighting, reflecting the occupant\'s personality.',
        baseImageUrl: 'https://media.charhub.io/5e39db53-9d66-459d-8926-281b3b089b36/8ff20bdb-b719-4cf7-bf53-3326d6f9fcaa.png', 
        defaultImageUrl: 'https://media.charhub.io/99ffcdf5-a01b-43cf-81e5-e7098d8058f5/d1ec2e67-9124-4b8b-82d9-9685cfb973d2.png',
        cost: {Provision: 1},
        action: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => {
            // Open the skit screen to speak to occupants
            if (module.ownerId) {
                console.log("Opening skit.");
                stage.getSave().actors[module.ownerId].locationId = module.id; // Ensure actor is in the module
                stage.setSkit({
                    type: SkitType.VISIT_CHARACTER,
                    actorId: module.ownerId,
                    moduleId: module.id,
                    script: [],
                    generating: true,
                    context: {}
                });
                setScreenType(ScreenType.SKIT);
            }
        },
        available: (stage: Stage) => {
            // Can have multiple quarters; no restriction
            return true;
        }
    },
    commons: {
        skitPrompt: 'The commons area is a social hub for the station crew, where they gather to relax, eat, and interact. Scenes here often involve camaraderie, conflicts, and leisure activities among the crew.',
        imagePrompt: 'A sci-fi common area with a large table, seating, and storage and kitchen facilities along the far wall.',
        // Maybe need a better term for this than "keeper"; this role is essentially cook/maid for the station:
        role: 'Custodian',
        roleDescription: `Maintain the station's communal areas, ensuring they remain inviting and well-stocked for crew relaxation and socialization.`,
        baseImageUrl: 'https://media.charhub.io/0cee625e-73e7-43b3-86b3-a06c082e73a9/7f958523-48b9-40a4-ae67-59b0cea199d3.png', 
        defaultImageUrl: 'https://media.charhub.io/041617bd-1cb3-424d-8e66-788e60edc80d/3a21ddd2-bd66-40b0-84ca-68b11d8218b2.png',
        cost: {Provision: 1},
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'commons').length === 0;
        }
    },
    infirmary: {
        skitPrompt: 'The infirmary is the station\'s medical facility, where crew members receive treatment and care. Scenes here often involve medical incidents, health concerns, or ways to improve the crew\'s health and well-being.',
        imagePrompt: 'A futuristic medical bay with treatment beds and advanced diagnostic equipment.',
        role: 'Medic',
        roleDescription: `Provide medical care and emergency response for the crew, ensuring their health and well-being.`,
        baseImageUrl: 'https://media.charhub.io/b62f09a0-7a42-47e7-b0be-f54dfac00f33/fe73db8c-2cb6-4744-9464-6d26ecf776c0.png',
        defaultImageUrl: 'https://media.charhub.io/5e9c6119-51b4-4a2c-a06c-bb8f1c20aea1/c471f9ba-ea5f-495b-8e44-e02723a04938.png',
        cost: {Provision: 1, Comfort: 1},
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'infirmary').length === 0;
        }
    },
    gym: {
        skitPrompt: 'The gym is the station\'s fitness center, where crew members work out and maintain their physical health. Scenes here often involve training sessions, fitness challenges, or ways to boost crew morale through physical activity.',
        imagePrompt: 'A sci-fi gym with advanced exercise equipment and weightlifting stations.',
        role: 'Trainer',
        roleDescription: `Oversee the physical fitness and training of the crew, ensuring they remain in peak condition for their duties aboard the station.`,
        baseImageUrl: 'https://media.charhub.io/349ca504-7b7e-4afd-8a52-43dd7b166bc7/d91d37e1-eb9d-4211-a28f-16b8d4d341d1.png',
        defaultImageUrl: 'https://media.charhub.io/7f6bd636-804e-493c-8442-e691856a6703/589a3768-f0da-43c0-ab70-8b7d403f5a62.png',
        cost: {Comfort: 1, Wealth: 1},
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'gym').length === 0;
        }
    },
    lounge: {
        skitPrompt: 'The lounge is a recreational area for the station crew, where they can unwind with a drink and socialize. Scenes here often involve leisure activities, social interactions, and ways to boost crew morale through relaxation and entertainment.',
        imagePrompt: 'A sci-fi lounge with comfortable seating, a wet bar, and entertainment systems.',
        role: 'Concierge',
        roleDescription: `Oversee the station's leisure facilities, ensuring crew members have a comfortable and enjoyable environment to relax and socialize.`,
        baseImageUrl: 'https://media.charhub.io/323b12cf-8687-4475-851b-7c1bdeff447a/0b71cb51-c160-47c9-848e-fab183eb9314.png',
        defaultImageUrl: 'https://media.charhub.io/2e8bf9fc-67a8-499d-85ec-8198efafeb14/1da73912-d19e-4f4e-aeda-19688e16e474.png',
        cost: {Comfort: 2, Wealth: 1},
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'lounge').length === 0;
        }
    },
    armory: {
        skitPrompt: 'The armory is the station\'s defense hub, where weapons and security systems are managed. Scenes here often involve security protocols, incident reports, or ways to enhance the station\'s safety and defense capabilities.',
        imagePrompt: 'A sci-fi armory with weapon lockers, equipment racks, and security equipment.',
        role: 'Officer',
        roleDescription: `Manage the station's defenses and ensure the safety of the crew against external and internal threats.`,
        baseImageUrl: 'https://media.charhub.io/7ccddb81-bed6-4395-80c6-912fe2932e53/c58a4f32-270d-4b62-b2b4-bcc1a3dedc94.png',
        defaultImageUrl: 'https://media.charhub.io/090e6a42-62f9-46da-9a29-09de8b469f05/eedf310f-af7a-40b4-ac56-686f4daa5c07.png',
        cost: {Systems: 1, Wealth: 1},
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'armory').length === 0;
        }
    }
};

export class Module<T extends ModuleType = ModuleType> {
    public id: string;
    public type: T;
    public ownerId?: string; // For quarters, this is the occupant, for other modules, it is the character assigned to the associated role
    public attributes?: Partial<ModuleIntrinsic> & { [key: string]: any };

    /**
     * Rehydrate a Module from saved data
     */
    static fromSave(savedModule: any): Module {
        let type = savedModule.type === 'medbay' ? 'infirmary' : savedModule.type; // Backwards compatibility
        type = type === 'communications' ? 'comms' : type; // Backwards compatibility
        return createModule(type as ModuleType, {
            id: savedModule.id,
            attributes: savedModule.attributes,
            ownerId: savedModule.ownerId
        });
    }

    constructor(type: T, opts?: { id?: string; attributes?: Partial<ModuleIntrinsic> & { [key: string]: any }; ownerId?: string }) {
        this.id = opts?.id ?? `${type}-${Date.now()}`;
        this.type = type;
        this.ownerId = opts?.ownerId;
        this.attributes = opts?.attributes || {};
    }

    /**
     * Get all attributes with intrinsic defaults applied
     */
    getAttributes(): ModuleIntrinsic & { [key: string]: any } {
        return { ...MODULE_DEFAULTS[this.type], ...(this.attributes || {}) };
    }

    /**
     * Get a specific attribute with intrinsic default fallback
     */
    getAttribute<K extends keyof ModuleIntrinsic>(key: K): ModuleIntrinsic[K];
    getAttribute(key: string): any;
    getAttribute(key: string): any {
        const instanceValue = this.attributes?.[key];
        if (instanceValue !== undefined) {
            return instanceValue;
        }
        return MODULE_DEFAULTS[this.type]?.[key];
    }

    /**
     * Get the action method for this module type
     */
    getAction(): ((module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => void) | undefined {
        return MODULE_DEFAULTS[this.type]?.action;
    }
}

export function createModule(type: ModuleType, opts?: { id?: string; attributes?: Partial<ModuleIntrinsic> & { [key: string]: any }; ownerId?: string }): Module {
    return new Module(type, opts);
}

export const DEFAULT_GRID_SIZE = 6;

export type LayoutChangeHandler = (grid: Module[]) => void;

export class Layout {
    public grid: (Module | null)[][];
    public gridSize: number;

    constructor(gridSize: number = DEFAULT_GRID_SIZE, initial?: (Module | null)[][]) {
        this.gridSize = gridSize;
        this.grid = initial || Array.from({ length: this.gridSize }, () =>
            Array.from({ length: this.gridSize }, () => null)
        );
    }

    /**
     * Rehydrate a Layout from saved data
     */
    static fromSave(savedLayout: any): Layout {
        const layout = Object.create(Layout.prototype);
        layout.gridSize = savedLayout.gridSize || DEFAULT_GRID_SIZE;
        
        // Rehydrate grid with proper Module instances
        layout.grid = savedLayout.grid?.map((row: any[]) => 
            row?.map((savedModule: any) => 
                savedModule ? Module.fromSave(savedModule) : null
            ) || Array(layout.gridSize).fill(null)
        ) || Array.from({ length: layout.gridSize }, () => Array(layout.gridSize).fill(null));
        
        return layout;
    }

    getLayout(): (Module | null)[][] {
        return this.grid;
    }

    setLayout(layout: (Module | null)[][]) {
        this.grid = layout;
    }

    getModulesWhere(predicate: (module: Module) => boolean): Module[] {
        const modules: Module[] = [];
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const module = this.grid[y][x];
                if (module && predicate(module)) {
                    modules.push(module);
                }
            }
        }
        return modules;
    }

    getModuleById(id: string): Module | null {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                const module = this.grid[y][x];
                if (module && module.id === id) {
                    return module;
                }
            }
        }
        return null;
    }

    getModuleAt(x: number, y: number): Module | null {
        return this.grid[y]?.[x] ?? null;
    }

    getModuleCoordinates(module: Module | null): { x: number; y: number } {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (module && this.grid[y][x]?.id === module?.id) {
                    return { x, y };
                }
            }
        }
        return {x: -1000, y: -1000};
    }

    setModuleAt(x: number, y: number, module: Module) {
        console.log(`Setting module at (${x}, ${y}):`, module);
        if (!this.grid[y]) return;
        this.grid[y][x] = module;
        console.log(`Module set. Current module at (${x}, ${y}):`, this.grid[y][x]);
    }
}
