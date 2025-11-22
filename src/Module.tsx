import { SkitType } from './Skit';
import { Stage } from "./Stage";
import { ScreenType } from './screens/BaseScreen';

export type ModuleType = 'echo chamber' | 'generator' | 'quarters' | 'commons' | 'medbay' | 'gym' | 'lounge' | 'armory';
    /*| 'hydroponics' | 'laboratory' | 'observatory' | 'security' | 'storage' | 'market' |
    'brig' | 'showers' | 'conservatory' |
    // Administration pack:
    'directors suite' | 'communications' | 'office' | 'vault' | 'archives' |
    // Tourism pack:
    'guest wing' | 'shuttle bay' | 'restaurant' | 'casino' | 'spa' |
    // Spirituality/arcana pack:
    'chapel' | 'arcanium' | 'meditation room' | 'ritual chamber' | 'reliquary' |
    // Recreation pack:
    'holodeck' | 'arcade' | 'arena' | 'disco' | 'theater' |
    // Spicy pack:
    'brothel' | 'dungeon' | 'black market' | 'harem' | 
    */

export interface ModuleIntrinsic {
    maintenance: number; // Additional workload for engineering
    mess: number; // Additional mess for the custodian
    entertainment: number; // Entertainment value for the crew or penalty for boring, workaday modules
    role?: string;
    roleDescription?: string;
    baseImageUrl: string; // Base image that is used for theming through image2image calls
    defaultImageUrl: string; // Default themed version of the module
    [key: string]: any; // Additional properties, if needed
    // Action method; each module has an action that will need to take the Module and Stage as contextual parameters:
    action?: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => void;
    available: (stage: Stage) => boolean;
}

const randomAction = (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => {
            // If there are actors here, open a skit with them:
            if (Object.values(stage.getSave().actors).some(a => a.locationId === module.id)) {
                console.log("Opening skit.");
                stage.setSkit({
                    type: SkitType.RANDOM_ENCOUNTER,
                    moduleId: module.id,
                    script: [],
                    generating: true,
                    context: {},
                    endScene: false
                });
                setScreenType(ScreenType.SKIT);
            }
        };

export const MODULE_DEFAULTS: Record<ModuleType, ModuleIntrinsic> = {
    'echo chamber': {
        maintenance: 1,
        mess: 0,
        entertainment: 0,
        role: 'Assistant',
        roleDescription: `Manage station operations, monitoring the crew and supplementing their needs as the director's right hand.`,
        baseImageUrl: 'https://media.charhub.io/2f92a39f-02be-41fd-b61d-56de04a9ecc4/62d30715-01e1-4581-beb4-61cf31134955.png',
        defaultImageUrl: 'https://media.charhub.io/026ae01a-7dc8-472d-bfea-61548b87e6ef/84990780-8260-4833-ac0b-79c1a15ddb9e.png',
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
    generator: {
        maintenance: 1,
        mess: 0,
        entertainment: -1,
        role: 'Engineer',
        roleDescription: `Oversee the station's mechanical systems, ensuring all modules receive adequate energy and maintenance to function optimally.`,
        baseImageUrl: 'https://media.charhub.io/e53eeeb3-81a9-4020-a336-070c65edbb8a/4141ed00-9ab7-47f5-a4ce-21983b013e46.png',
        defaultImageUrl: 'https://media.charhub.io/36c3c8b5-1abd-4766-8042-fa7a2af0ce42/6106d6ec-7746-4130-8e13-860c89a325c7.png',
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'generator').length === 0;
        }
    },
    quarters: {
        maintenance: 2,
        mess: 1,
        entertainment: -1,
        baseImageUrl: 'https://media.charhub.io/5e39db53-9d66-459d-8926-281b3b089b36/8ff20bdb-b719-4cf7-bf53-3326d6f9fcaa.png', 
        defaultImageUrl: 'https://media.charhub.io/99ffcdf5-a01b-43cf-81e5-e7098d8058f5/d1ec2e67-9124-4b8b-82d9-9685cfb973d2.png',
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
                    context: {},
                    endScene: false
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
        maintenance: -1,
        mess: 2,
        entertainment: 3,
        // Maybe need a better term for this than "keeper"; this role is essentially cook/maid for the station:
        role: 'Custodian',
        roleDescription: `Maintain the station's communal areas, ensuring they remain inviting and well-stocked for crew relaxation and socialization.`,
        baseImageUrl: 'https://media.charhub.io/0cee625e-73e7-43b3-86b3-a06c082e73a9/7f958523-48b9-40a4-ae67-59b0cea199d3.png', 
        defaultImageUrl: 'https://media.charhub.io/041617bd-1cb3-424d-8e66-788e60edc80d/3a21ddd2-bd66-40b0-84ca-68b11d8218b2.png',
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'commons').length === 0;
        }
    },
    medbay: {
        maintenance: 3,
        mess: 1,
        entertainment: -1,
        role: 'Medic',
        roleDescription: `Provide medical care and emergency response for the crew, ensuring their health and well-being.`,
        baseImageUrl: 'https://media.charhub.io/b62f09a0-7a42-47e7-b0be-f54dfac00f33/fe73db8c-2cb6-4744-9464-6d26ecf776c0.png',
        defaultImageUrl: 'https://media.charhub.io/5e9c6119-51b4-4a2c-a06c-bb8f1c20aea1/c471f9ba-ea5f-495b-8e44-e02723a04938.png',
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'medbay').length === 0;
        }
    },
    gym: {
        maintenance: 1,
        mess: 1,
        entertainment: 2,
        role: 'Trainer',
        roleDescription: `Oversee the physical fitness and training of the crew, ensuring they remain in peak condition for their duties aboard the station.`,
        baseImageUrl: 'https://media.charhub.io/349ca504-7b7e-4afd-8a52-43dd7b166bc7/d91d37e1-eb9d-4211-a28f-16b8d4d341d1.png',
        defaultImageUrl: 'https://media.charhub.io/7f6bd636-804e-493c-8442-e691856a6703/589a3768-f0da-43c0-ab70-8b7d403f5a62.png',
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'gym').length === 0;
        }
    },
    lounge: {
        maintenance: 1,
        mess: 2,
        entertainment: 4,
        role: 'Concierge',
        roleDescription: `Oversee the station's leisure facilities, ensuring crew members have a comfortable and enjoyable environment to relax and socialize.`,
        baseImageUrl: 'https://media.charhub.io/323b12cf-8687-4475-851b-7c1bdeff447a/0b71cb51-c160-47c9-848e-fab183eb9314.png',
        defaultImageUrl: 'https://media.charhub.io/2e8bf9fc-67a8-499d-85ec-8198efafeb14/1da73912-d19e-4f4e-aeda-19688e16e474.png',
        action: randomAction,
        available: (stage: Stage) => {
            // Can have only one in stage.getSave().layout:
            return stage.getLayout().getModulesWhere(m => m.type === 'lounge').length === 0;
        }
    },
    armory: {
        maintenance: 2,
        mess: 1,
        entertainment: -2,
        role: 'Officer',
        roleDescription: `Manage the station's defenses and ensure the safety of the crew against external and internal threats.`,
        baseImageUrl: 'https://media.charhub.io/7ccddb81-bed6-4395-80c6-912fe2932e53/c58a4f32-270d-4b62-b2b4-bcc1a3dedc94.png',
        defaultImageUrl: 'https://media.charhub.io/090e6a42-62f9-46da-9a29-09de8b469f05/eedf310f-af7a-40b4-ac56-686f4daa5c07.png',
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
    public connections?: string[];
    public ownerId?: string; // For quarters, this is the occupant, for other modules, it is the character assigned to the associated role
    public attributes?: Partial<ModuleIntrinsic> & { [key: string]: any };

    /**
     * Rehydrate a Module from saved data
     */
    static fromSave(savedModule: any): Module {
        return createModule(savedModule.type, {
            id: savedModule.id,
            connections: savedModule.connections,
            attributes: savedModule.attributes,
            ownerId: savedModule.ownerId
        });
    }

    constructor(type: T, opts?: { id?: string; connections?: string[]; attributes?: Partial<ModuleIntrinsic> & { [key: string]: any }; ownerId?: string }) {
        this.id = opts?.id ?? `${type}-${Date.now()}`;
        this.type = type;
        this.connections = opts?.connections ?? [];
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

export function createModule(type: ModuleType, opts?: { id?: string; connections?: string[]; attributes?: Partial<ModuleIntrinsic> & { [key: string]: any }; ownerId?: string }): Module {
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
