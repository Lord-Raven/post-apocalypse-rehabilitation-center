import { Stat } from "../actors/Actor";
import { StationStat } from "../Module";
import { Stage } from "../Stage";
import { v4 as generateUuid } from 'uuid';

/**
 * Represents what the faction is requesting in exchange for rewards
 */
export type RequestRequirement =
    | ActorWithStatsRequirement
    | SpecificActorRequirement
    | StationStatsRequirement;

/**
 * Request for an actor with minimum/maximum stat scores
 */
export interface ActorWithStatsRequirement {
    type: 'actor-with-stats';
    minStats?: Partial<Record<Stat, number>>;
    maxStats?: Partial<Record<Stat, number>>;
}

/**
 * Request for a specific actor by their ID
 */
export interface SpecificActorRequirement {
    type: 'specific-actor';
    actorId: string;
}

/**
 * Request for station stats with specific amounts
 */
export interface StationStatsRequirement {
    type: 'station-stats';
    stats: Partial<Record<StationStat, number>>;
}

/**
 * Represents what the faction offers in exchange
 */
export type RequestReward = StationStatsReward;
// Future reward types could be added here: | ItemReward | CurrencyReward | etc.

/**
 * Reward of station stat bonuses
 */
export interface StationStatsReward {
    type: 'station-stats';
    stats: Partial<Record<StationStat, number>>;
}

/**
 * Represents an offer/exchange from a faction
 */
export class Request {
    id: string;
    factionId: string;
    description: string;
    requirement: RequestRequirement;
    reward: RequestReward;

    constructor(
        id: string,
        factionId: string,
        briefDescription: string,
        requirement: RequestRequirement,
        reward: RequestReward
    ) {
        this.id = id;
        this.factionId = factionId;
        this.description = briefDescription;
        this.requirement = requirement;
        this.reward = reward;
    }

    /**
     * Rehydrate a Request from saved data
     */
    static fromSave(savedRequest: any): Request {
        const request = Object.create(Request.prototype);
        Object.assign(request, savedRequest);
        return request;
    }

    /**
     * Evaluates whether the current game state can fulfill this request
     * @param stage The game stage containing all game state
     * @returns true if the request can be fulfilled, false otherwise
     */
    canFulfill(stage: Stage): boolean {
        const save = stage.getSave();

        switch (this.requirement.type) {
            case 'actor-with-stats':
                return this.canFulfillActorWithStats(stage);

            case 'specific-actor':
                return this.canFulfillSpecificActor(stage);

            case 'station-stats':
                return this.canFulfillStationStats(stage);

            default:
                console.warn(`Unknown requirement type: ${(this.requirement as any).type}`);
                return false;
        }
    }

    /**
     * Check if there's an actor that meets the stat requirements
     */
    private canFulfillActorWithStats(stage: Stage): boolean {
        const requirement = this.requirement as ActorWithStatsRequirement;
        const save = stage.getSave();

        // Check all actors (including those in echo chambers and already placed)
        const allActors = Object.values(save.actors);

        return allActors.some(actor => {
            // Skip remote actors (not physically present on the station)
            if (actor.remote) {
                return false;
            }

            // Check minimum stats
            if (requirement.minStats) {
                for (const [stat, minValue] of Object.entries(requirement.minStats)) {
                    if (actor.stats[stat as Stat] < minValue) {
                        return false;
                    }
                }
            }

            // Check maximum stats
            if (requirement.maxStats) {
                for (const [stat, maxValue] of Object.entries(requirement.maxStats)) {
                    if (actor.stats[stat as Stat] > maxValue) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    /**
     * Check if the specific actor exists and is available
     */
    private canFulfillSpecificActor(stage: Stage): boolean {
        const requirement = this.requirement as SpecificActorRequirement;
        const save = stage.getSave();

        const actor = save.actors[requirement.actorId];
        
        // Actor must exist and not be remote
        return actor !== undefined && !actor.remote;
    }

    /**
     * Check if the station has enough of the required stats
     */
    private canFulfillStationStats(stage: Stage): boolean {
        const requirement = this.requirement as StationStatsRequirement;
        const save = stage.getSave();

        // Ensure stationStats exists
        if (!save.stationStats) {
            return false;
        }

        // Check each required stat
        for (const [stat, requiredAmount] of Object.entries(requirement.stats)) {
            const currentAmount = save.stationStats[stat as StationStat] || 0;
            
            // Station must have at least the required amount
            if (currentAmount < requiredAmount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Parse a REQUEST tag into a Request object
     * 
     * Format: [REQUEST: <factionId> | <description> | <requirement> -> <reward>]
     * 
     * Requirements:
     * - ACTOR <stat><op><value>[, <stat><op><value>]* - Actor with stat constraints
     *   - op can be: >= (min), <= (max)
     *   - Example: ACTOR brawn>=7, charm>=5, lust<=3
     * - ACTOR-ID <actorId> - Specific actor by ID
     *   - Example: ACTOR-ID abc-123-def-456
     * - STATION <stat><op><value>[, <stat><op><value>]* - Station stats required
     *   - op is >= for minimum required
     *   - Example: STATION Security>=8, Harmony>=6
     * 
     * Rewards:
     * - <stat>+<value>[, <stat>+<value>]* - Station stat bonuses
     *   - Example: Systems+2, Comfort+1, Security+3
     * 
     * Full Examples:
     * - [REQUEST: faction-123 | We need a strong laborer | ACTOR brawn>=7, charm>=6 -> Systems+2, Comfort+1]
     * - [REQUEST: faction-456 | Return our missing operative | ACTOR-ID abc-123 -> Harmony+3]
     * - [REQUEST: faction-789 | Help us bolster our defenses | STATION Security>=8 -> Systems+1, Provision+2]
     * 
     * @param tag The request tag string to parse
     * @returns A Request object, or null if parsing fails
     */
    static parseFromTag(tag: string): Request | null {
        try {
            // Extract content between [REQUEST: and ]
            const match = tag.match(/\[REQUEST:\s*(.+?)\s*\]/i);
            if (!match) {
                console.warn(`Invalid REQUEST tag format: ${tag}`);
                return null;
            }

            const content = match[1];
            
            // Split by | to separate factionId, description, and requirement->reward
            const pipeParts = content.split('|').map(p => p.trim());
            if (pipeParts.length !== 3) {
                console.warn(`REQUEST tag must have format: factionId | description | requirement -> reward: ${tag}`);
                return null;
            }

            const [factionId, description, requirementRewardStr] = pipeParts;

            if (!factionId || !description) {
                console.warn(`REQUEST tag must have non-empty factionId and description: ${tag}`);
                return null;
            }
            
            // Split by -> to separate requirement from reward
            const parts = requirementRewardStr.split('->').map(p => p.trim());
            if (parts.length !== 2) {
                console.warn(`REQUEST tag must have requirement -> reward format: ${tag}`);
                return null;
            }

            const [requirementStr, rewardStr] = parts;

            // Parse requirement
            const requirement = this.parseRequirement(requirementStr);
            if (!requirement) {
                console.warn(`Failed to parse requirement: ${requirementStr}`);
                return null;
            }

            // Parse reward
            const reward = this.parseReward(rewardStr);
            if (!reward) {
                console.warn(`Failed to parse reward: ${rewardStr}`);
                return null;
            }

            return new Request(
                generateUuid(),
                factionId,
                description,
                requirement,
                reward
            );
        } catch (error) {
            console.error(`Error parsing REQUEST tag: ${tag}`, error);
            return null;
        }
    }

    /**
     * Parse the requirement portion of a REQUEST tag
     */
    private static parseRequirement(requirementStr: string): RequestRequirement | null {
        const trimmed = requirementStr.trim();

        // Check for ACTOR-ID format
        if (trimmed.startsWith('ACTOR-ID')) {
            const actorId = trimmed.substring('ACTOR-ID'.length).trim();
            if (!actorId) {
                return null;
            }
            return {
                type: 'specific-actor',
                actorId
            };
        }

        // Check for ACTOR format (with stats)
        if (trimmed.startsWith('ACTOR')) {
            const statsStr = trimmed.substring('ACTOR'.length).trim();
            return this.parseActorStatsRequirement(statsStr);
        }

        // Check for STATION format
        if (trimmed.startsWith('STATION')) {
            const statsStr = trimmed.substring('STATION'.length).trim();
            return this.parseStationStatsRequirement(statsStr);
        }

        return null;
    }

    /**
     * Parse actor stat requirements (e.g., "brawn>=7, charm>=5, lust<=3")
     */
    private static parseActorStatsRequirement(statsStr: string): ActorWithStatsRequirement | null {
        const minStats: Partial<Record<Stat, number>> = {};
        const maxStats: Partial<Record<Stat, number>> = {};

        if (!statsStr) {
            return null;
        }

        // Split by comma and process each constraint
        const constraints = statsStr.split(',').map(s => s.trim());
        
        for (const constraint of constraints) {
            // Match pattern: <stat><op><value>
            const match = constraint.match(/^(\w+)\s*(>=|<=)\s*(\d+)$/);
            if (!match) {
                console.warn(`Invalid actor stat constraint: ${constraint}`);
                return null;
            }

            const [, statName, operator, valueStr] = match;
            const value = parseInt(valueStr, 10);

            // Validate stat name
            const stat = statName.toLowerCase() as Stat;
            if (!Object.values(Stat).includes(stat)) {
                console.warn(`Unknown stat: ${statName}`);
                return null;
            }

            // Add to appropriate stats object
            if (operator === '>=') {
                minStats[stat] = value;
            } else if (operator === '<=') {
                maxStats[stat] = value;
            }
        }

        return {
            type: 'actor-with-stats',
            minStats: Object.keys(minStats).length > 0 ? minStats : undefined,
            maxStats: Object.keys(maxStats).length > 0 ? maxStats : undefined
        };
    }

    /**
     * Parse station stat requirements (e.g., "Security>=8, Harmony>=6")
     */
    private static parseStationStatsRequirement(statsStr: string): StationStatsRequirement | null {
        const stats: Partial<Record<StationStat, number>> = {};

        if (!statsStr) {
            return null;
        }

        // Split by comma and process each constraint
        const constraints = statsStr.split(',').map(s => s.trim());
        
        for (const constraint of constraints) {
            // Match pattern: <stat>>=<value>
            const match = constraint.match(/^(\w+)\s*>=\s*(\d+)$/);
            if (!match) {
                console.warn(`Invalid station stat constraint: ${constraint}`);
                return null;
            }

            const [, statName, valueStr] = match;
            const value = parseInt(valueStr, 10);

            // Validate stat name (case-insensitive)
            const stat = Object.values(StationStat).find(
                s => s.toLowerCase() === statName.toLowerCase()
            );
            
            if (!stat) {
                console.warn(`Unknown station stat: ${statName}`);
                return null;
            }

            stats[stat] = value;
        }

        return {
            type: 'station-stats',
            stats
        };
    }

    /**
     * Parse the reward portion of a REQUEST tag (e.g., "Systems+2, Comfort+1")
     */
    private static parseReward(rewardStr: string): RequestReward | null {
        const stats: Partial<Record<StationStat, number>> = {};

        // Split by comma and process each bonus
        const bonuses = rewardStr.split(',').map(s => s.trim());
        
        for (const bonus of bonuses) {
            // Match pattern: <stat>+<value>
            const match = bonus.match(/^(\w+)\s*\+\s*(\d+)$/);
            if (!match) {
                console.warn(`Invalid reward bonus: ${bonus}`);
                return null;
            }

            const [, statName, valueStr] = match;
            const value = parseInt(valueStr, 10);

            // Validate stat name (case-insensitive)
            const stat = Object.values(StationStat).find(
                s => s.toLowerCase() === statName.toLowerCase()
            );
            
            if (!stat) {
                console.warn(`Unknown station stat in reward: ${statName}`);
                return null;
            }

            stats[stat] = value;
        }

        if (Object.keys(stats).length === 0) {
            return null;
        }

        return {
            type: 'station-stats',
            stats
        };
    }
}

export default Request;
