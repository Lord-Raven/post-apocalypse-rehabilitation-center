import { VignetteType } from './Vignette';
import { Stage } from "./Stage";
import { ScreenType } from './screens/BaseScreen';

export type ModuleType = 'echo' | 'generator' | 'quarters' | 'common';

export interface ModuleIntrinsic {
    power: number;
    maintenance: number;
    capacity?: number;
    baseImageUrl: string; // Base image that is used for theming through image2image calls
    defaultImageUrl: string; // Default themed version of the module
    [key: string]: any; // Additional properties, if needed
    // Action method; each module has an action that will need to take the Module and Stage as contextual parameters:
    action?: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => void;
}

export const MODULE_DEFAULTS: Record<ModuleType, ModuleIntrinsic> = {
    echo: { 
        power: -1, 
        maintenance: -1,
        baseImageUrl: 'https://media.charhub.io/2f92a39f-02be-41fd-b61d-56de04a9ecc4/62d30715-01e1-4581-beb4-61cf31134955.png',
        defaultImageUrl: 'https://media.charhub.io/026ae01a-7dc8-472d-bfea-61548b87e6ef/84990780-8260-4833-ac0b-79c1a15ddb9e.png',
        action: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => {
            // Open the station management screen
            console.log("Opening echo screen from command module.");
            // Use Stage API so any mounted UI can react to the change
            setScreenType(ScreenType.ECHO);
        }
    },
    generator: {
        power: 5,
        maintenance: 1,
        baseImageUrl: 'https://media.charhub.io/e53eeeb3-81a9-4020-a336-070c65edbb8a/4141ed00-9ab7-47f5-a4ce-21983b013e46.png',
        defaultImageUrl: 'https://media.charhub.io/36c3c8b5-1abd-4766-8042-fa7a2af0ce42/6106d6ec-7746-4130-8e13-860c89a325c7.png' 
    },
    quarters: { 
        power: -1, 
        maintenance: 2, 
        capacity: 2, 
        baseImageUrl: 'https://media.charhub.io/5e39db53-9d66-459d-8926-281b3b089b36/8ff20bdb-b719-4cf7-bf53-3326d6f9fcaa.png', 
        defaultImageUrl: 'https://media.charhub.io/99ffcdf5-a01b-43cf-81e5-e7098d8058f5/d1ec2e67-9124-4b8b-82d9-9685cfb973d2.png',
        action: (module: Module, stage: Stage, setScreenType: (type: ScreenType) => void) => {
            // Open the vignette screen to manage occupants
            if (module.ownerId) {
                console.log("Opening vignette.");
                stage.setVignette({
                    type: VignetteType.VISIT_CHARACTER,
                    actorId: module.ownerId,
                    moduleId: module.id,
                    script: [],
                    generating: true,
                    context: {},
                    endScene: false
                });
                setScreenType(ScreenType.VIGNETTE);
            }
        }
    },
    common: { 
        power: -1, 
        maintenance: -1, 
        baseImageUrl: 'https://media.charhub.io/0cee625e-73e7-43b3-86b3-a06c082e73a9/7f958523-48b9-40a4-ae67-59b0cea199d3.png', 
        defaultImageUrl: 'https://media.charhub.io/041617bd-1cb3-424d-8e66-788e60edc80d/3a21ddd2-bd66-40b0-84ca-68b11d8218b2.png'
    }
};

export interface Module<T extends ModuleType = ModuleType> {
    id: string;
    type: T;
    connections?: string[];
    ownerId?: string;
    // merged intrinsic properties for this module (defaults from type + instance overrides)
    attributes?: Partial<ModuleIntrinsic> & { [key: string]: any };
}

export function createModule(type: ModuleType, opts?: { id?: string; connections?: string[]; attributes?: Partial<ModuleIntrinsic> & { [key: string]: any } }): Module {
    const id = opts?.id ?? `${type}-${Date.now()}`;
    const attributes = { ...MODULE_DEFAULTS[type], ...(opts?.attributes || {}) };
    return {
        id,
        type,
        connections: opts?.connections ?? [],
        attributes,
    };
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
