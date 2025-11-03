export type ModuleType = 'command' | 'generator' | 'quarters' | 'common' | 'empty';

export interface ModuleIntrinsic {
    power: number;
    maintenance: number;
    capacity?: number;
    [key: string]: any;
}

export const MODULE_DEFAULTS: Record<ModuleType, ModuleIntrinsic> = {
    command: { power: 0, maintenance: 0 },
    generator: { power: 5, maintenance: 1 },
    quarters: { power: -1, maintenance: 2, capacity: 2 },
    common: { power: 0, maintenance: 1 },
    empty: { power: 0, maintenance: 0 },
};

export interface Module<T extends ModuleType = ModuleType> {
    id: string;
    type: T;
    connections?: string[];
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
    private onChange?: (grid: (Module | null)[][]) => void;

    constructor(gridSize: number = DEFAULT_GRID_SIZE, initial?: (Module | null)[][], onChange?: (grid: (Module | null)[][]) => void) {
        this.gridSize = gridSize;
        this.onChange = onChange;
        this.grid = initial || Array.from({ length: this.gridSize }, () =>
            Array.from({ length: this.gridSize }, () => null)
        );
    }

    getLayout(): (Module | null)[][] {
        return this.grid;
    }

    setLayout(layout: (Module | null)[][]) {
        this.grid = layout;
        this.onChange?.(this.grid);
    }

    getModuleAt(x: number, y: number): Module | null {
        return this.grid[y]?.[x] ?? null;
    }

    getModuleCoordinates(module: Module | null): { x: number; y: number } {
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]?.id === module?.id) {
                    return { x, y };
                }
            }
        }
        return {x: 0, y: 0};
    }

    setModuleAt(x: number, y: number, module: Module) {
        if (!this.grid[y]) return;
        this.grid[y][x] = module;
        this.onChange?.(this.grid);
    }

    countNonEmpty(): number {
        return this.grid.flat().filter(m => m?.type !== 'empty').length;
    }
}
