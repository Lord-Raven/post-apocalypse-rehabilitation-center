import { findBestNameMatch, Stat } from "../actors/Actor";
import { StationStat } from "../Module";
import { ScreenType } from "../screens/BaseScreen";
import { SkitType } from "../Skit";
import { Stage } from "../Stage";
import { scoreToGrade, gradeToScore } from "../utils";
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
    timeInTurns?: number; // Optional duration in turns (temporary assignment/loan)
}

/**
 * Request for a specific actor by their ID
 */
export interface SpecificActorRequirement {
    type: 'specific-actor';
    actorId: string;
    timeInTurns?: number; // Optional duration in turns (temporary assignment/loan)
}

/**
 * Request for station stats to be reduced by specific amounts
 */
export interface StationStatsRequirement {
    type: 'station-stats';
    stats: Partial<Record<StationStat, number>>;
    timeInTurns?: number; // Optional and unused by this type.
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
    inProgressActorId: string = ''; // Set to the fulfilling ID of an actor, when the request is being fulfilled—applies to temporary assignments
    startDay: number = -1; // Day when the request was started (for timed requests)
    startTurn: number = -1; // Turn when the request was started (for timed requests)

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
     * Check if this request is currently in progress (for timed requests)
     * @returns true if the request has an actor assigned and is in progress
     */
    isInProgress(): boolean {
        return this.inProgressActorId !== '' && this.startDay >= 0;
    }

    /**
     * Calculate remaining turns for a timed request
     * @param currentDay Current game day
     * @param currentTurn Current game turn
     * @returns Number of turns remaining, or -1 if not applicable
     */
    getRemainingTurns(currentDay: number, currentTurn: number): number {
        if (!this.isInProgress()) return -1;
        
        const timeInTurns = (this.requirement.type === 'actor-with-stats' || this.requirement.type === 'specific-actor')
            ? (this.requirement as ActorWithStatsRequirement | SpecificActorRequirement).timeInTurns
            : undefined;
        
        if (!timeInTurns) return -1;
        
        const elapsedTurns = (currentDay - this.startDay) * 4 + (currentTurn - this.startTurn);
        return Math.max(0, timeInTurns - elapsedTurns);
    }

    /**
     * Check if this request matches the criteria of another request
     * Two requests match if they have similar criterion types, even if amounts differ
     * @param other The other request to compare against
     * @returns true if the requests have matching criteria types
     */
    matchesCriteria(other: Request): boolean {
        // Must be same requirement type
        if (this.requirement.type !== other.requirement.type) {
            return false;
        }

        switch (this.requirement.type) {
            case 'actor-with-stats':
                return this.matchesActorWithStatsCriteria(other.requirement as ActorWithStatsRequirement);

            case 'specific-actor':
                return this.matchesSpecificActorCriteria(other.requirement as SpecificActorRequirement);

            case 'station-stats':
                return this.matchesStationStatsCriteria(other.requirement as StationStatsRequirement);

            default:
                return false;
        }
    }

    /**
     * Check if actor-with-stats requirements target the same stats
     */
    private matchesActorWithStatsCriteria(otherRequirement: ActorWithStatsRequirement): boolean {
        const thisReq = this.requirement as ActorWithStatsRequirement;
        
        // Get all stats mentioned in min/max for both requests
        const thisStats = new Set([
            ...Object.keys(thisReq.minStats || {}),
            ...Object.keys(thisReq.maxStats || {})
        ]);
        
        const otherStats = new Set([
            ...Object.keys(otherRequirement.minStats || {}),
            ...Object.keys(otherRequirement.maxStats || {})
        ]);

        // Must have at least one stat in common, or both be empty
        if (thisStats.size === 0 && otherStats.size === 0) {
            return true;
        }

        // Check for any overlapping stats
        for (const stat of thisStats) {
            if (otherStats.has(stat)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if specific-actor requirements target the same actor
     */
    private matchesSpecificActorCriteria(otherRequirement: SpecificActorRequirement): boolean {
        const thisReq = this.requirement as SpecificActorRequirement;
        return thisReq.actorId === otherRequirement.actorId;
    }

    /**
     * Check if station-stats requirements target the same stats
     */
    private matchesStationStatsCriteria(otherRequirement: StationStatsRequirement): boolean {
        const thisReq = this.requirement as StationStatsRequirement;
        
        const thisStats = new Set(Object.keys(thisReq.stats || {}));
        const otherStats = new Set(Object.keys(otherRequirement.stats || {}));

        // Must have at least one stat in common
        if (thisStats.size === 0 && otherStats.size === 0) {
            return true;
        }

        // Check for any overlapping stats
        for (const stat of thisStats) {
            if (otherStats.has(stat)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Evaluates whether the current game state can fulfill this request
     * @param stage The game stage containing all game state
     * @returns true if the request can be fulfilled, false otherwise
     */
    canFulfill(stage: Stage): boolean {
        const save = stage.getSave();

        // Cannot fulfill a request that is already in progress
        if (this.isInProgress()) {
            return false;
        }

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
            // Skip remote actors (not physically present on the station) or occupied actors
            if (actor.remote || actor.inProgressRequestId) {
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

        // Find actor by ID
        const actor = save.actors[requirement.actorId];
        
        // Actor must exist and not be remote or occupied
        return actor !== undefined && !actor.remote && !actor.inProgressRequestId;
    }

    /**
     * Check if the station has enough of the required stats to fulfill the reduction
     * Stats cannot be reduced to 0, so current value must be at least deduction + 1
     */
    private canFulfillStationStats(stage: Stage): boolean {
        const requirement = this.requirement as StationStatsRequirement;
        const save = stage.getSave();

        // Ensure stationStats exists
        if (!save.stationStats) {
            return false;
        }

        // Check each stat deduction
        for (const [stat, deductionAmount] of Object.entries(requirement.stats)) {
            const currentAmount = save.stationStats[stat as StationStat] || 0;
            
            // Station must have at least deduction + 1 (cannot reduce to 0)
            if (currentAmount <= deductionAmount) {
                return false;
            }
        }

        return true;
    }

    /**
     * Fulfill this request by applying its requirements and rewards
     * @param stage The game stage containing all game state
     * @param actorId Optional actor ID for actor-based requirements
     * @returns true if the request was successfully fulfilled, false otherwise
     */
    fulfill(stage: Stage, setScreenType: (type: ScreenType) => void, actorId?: string): boolean {
        // Verify the request can be fulfilled
        if (!this.canFulfill(stage)) {
            console.warn('Cannot fulfill request - requirements not met');
            return false;
        }

        const save = stage.getSave();
        const faction = save.factions[this.factionId];

        // Check if this is a timed request
        const isTimedRequest = (this.requirement.type === 'actor-with-stats' || this.requirement.type === 'specific-actor') &&
            (this.requirement as ActorWithStatsRequirement | SpecificActorRequirement).timeInTurns !== undefined;

        // Process requirement
        switch (this.requirement.type) {
            case 'actor-with-stats':
                if (!actorId) {
                    console.warn('Actor ID required for actor-with-stats request');
                    return false;
                }
                if (isTimedRequest) {
                    // Set up timed request - don't complete yet
                    this.inProgressActorId = actorId;
                    this.startDay = save.day;
                    this.startTurn = save.phase;
                    const actor = save.actors[actorId];
                    if (actor) {
                        actor.inProgressRequestId = this.id;
                    }
                    console.log(`Started timed request ${this.id} with actor ${actorId} at day ${this.startDay}, turn ${this.startTurn}`);
                } else {
                    // Permanent transfer - complete immediately
                    console.log(`Fulfilling permanent actor-with-stats request with actor ${actorId}`);
                }
                break;

            case 'specific-actor':
                if (!actorId) {
                    console.warn('Actor ID required for specific-actor request');
                    return false;
                }
                if (isTimedRequest) {
                    // Set up timed request - don't complete yet
                    this.inProgressActorId = actorId;
                    this.startDay = save.day;
                    this.startTurn = save.phase;
                    const actor = save.actors[actorId];
                    if (actor) {
                        actor.inProgressRequestId = this.id;
                    }
                    console.log(`Started timed request ${this.id} with actor ${actorId} at day ${this.startDay}, turn ${this.startTurn}`);
                } else {
                    // Permanent transfer - complete immediately
                    console.log(`Fulfilling permanent specific-actor request with actor ${actorId}`);
                }
                break;

            case 'station-stats':
                // Deduct station stats immediately
                const req = this.requirement as StationStatsRequirement;
                if (save.stationStats) {
                    for (const [stat, value] of Object.entries(req.stats)) {
                        save.stationStats[stat as StationStat] = Math.max(1, (save.stationStats[stat as StationStat] || 0) - value);
                    }
                }
                console.log(`Deducted station stats for request:`, req.stats);
                break;

            default:
                console.warn(`Unknown requirement type for fulfillment`);
                return false;
        }

        // For timed requests, only kick off the skit and don't apply rewards yet
        if (isTimedRequest) {
            // Just kick off the skit for the temporary assignment
            if (this.requirement.type === 'actor-with-stats' || this.requirement.type === 'specific-actor') {
                const module = stage.getSave().layout.getModulesWhere(m => m.type === 'comms')[0];
                // Remove other actors from comms:
                Object.values(stage.getSave().actors).forEach(actor => {
                    if (actor.locationId === module.id) {
                        actor.locationId = '';
                    }
                });
                const actor = stage.getSave().actors[actorId || ''];
                if (actor) {
                    actor.locationId = module.id;
                }
                const liaison = stage.getSave().actors[stage.getSave().layout.getModulesWhere(m => m.type === 'comms')[0].ownerId || ''];
                if (liaison) {
                    liaison.locationId = module.id;
                }
                const factionRep = faction ? stage.getSave().actors[faction.representativeId || ''] : null;
                if (factionRep) {
                    factionRep.locationId = module.id;
                }
                stage.setSkit({
                    type: SkitType.REQUEST_FILL_ACTOR,
                    moduleId: module.id,
                    script: [],
                    generating: true,
                    context: {
                        factionId: this.factionId,
                        requestId: this.id
                    },
                    actorId: actorId || ''
                });
                setScreenType(ScreenType.SKIT);
            }
            return true;
        }

        // For non-timed requests (permanent or station-stats), apply rewards immediately
        if (this.reward.type === 'station-stats' && save.stationStats) {
            const rew = this.reward as StationStatsReward;
            for (const [stat, value] of Object.entries(rew.stats)) {
                save.stationStats[stat as StationStat] = Math.max(1, Math.min(10, (save.stationStats[stat as StationStat] || 0) + value));
            }
        }
        
        delete save.requests[this.id];

        // Increase faction reputation
        if (faction) {
            faction.reputation = Math.max(1, Math.min(10, faction.reputation + 1));
        }

        console.log(`Request ${this.id} fulfilled successfully`);

        if (this.requirement.type === 'actor-with-stats' || this.requirement.type === 'specific-actor') {
            const module = stage.getSave().layout.getModulesWhere(m => m.type === 'comms')[0];
            // Kick off a farewell skit.
            // Remove other actors from comms:
            Object.values(stage.getSave().actors).forEach(actor => {
                if (actor.locationId === module.id) {
                    actor.locationId = '';
                }
            });
            
            // Move transferred actor to comms
            const actor = stage.getSave().actors[actorId || ''];
            if (actor) {
                actor.locationId = module.id;
            }
            // Get liaison to move to comms
            const liaison = stage.getSave().actors[stage.getSave().layout.getModulesWhere(m => m.type === 'comms')[0].ownerId || ''];
            if (liaison) {
                liaison.locationId = module.id;
            }
            // Get faction representative to move to comms
            const factionRep = faction ? stage.getSave().actors[faction.representativeId || ''] : null;
            if (factionRep) {
                factionRep.locationId = module.id;
            }
            stage.setSkit({
                type: SkitType.REQUEST_FILL_ACTOR,
                moduleId: module.id,
                script: [],
                generating: true,
                context: {
                    factionId: this.factionId,
                    requestId: this.id
                },
                actorId: actorId || ''
            });
            setScreenType(ScreenType.SKIT);
        } else if (this.requirement.type === 'station-stats') {
            const module = stage.getSave().layout.getModulesWhere(m => m.type === 'comms')[0];
            // Kick off a request completion skit.
            // Get liaison to move to comms
            const liaison = stage.getSave().actors[stage.getSave().layout.getModulesWhere(m => m.type === 'comms')[0].ownerId || ''];
            // Get faction representative to move to comms
            const factionRep = faction ? stage.getSave().actors[faction.representativeId || ''] : null;
            if (factionRep) {
                factionRep.locationId = module.id;
            }
            if (liaison) {
                liaison.locationId = module.id;
            }
            stage.setSkit({
                type: SkitType.REQUEST_FILL_STATION,
                moduleId: module.id,
                script: [],
                generating: true,
                context: {
                    factionId: this.factionId,
                    requestId: this.id
                }
            });
            setScreenType(ScreenType.SKIT);
        }

        return true;
    }

    /**
     * Get a human-readable text description of the requirement
     * @returns A text description of what is required to fulfill this request
     */
    getRequirementText(stage: Stage): string {
        switch (this.requirement.type) {
            case 'actor-with-stats': {
                const req = this.requirement as ActorWithStatsRequirement;
                const parts: string[] = [];
                
                if (req.minStats) {
                    const minParts = Object.entries(req.minStats)
                        .map(([stat, value]) => `${stat} ≥ ${scoreToGrade(value)}`);
                    parts.push(...minParts);
                }
                
                if (req.maxStats) {
                    const maxParts = Object.entries(req.maxStats)
                        .map(([stat, value]) => `${stat} ≤ ${scoreToGrade(value)}`);
                    parts.push(...maxParts);
                }
                
                let text = `Patient with ${parts.join(', ')}`;
                if (req.timeInTurns !== undefined) {
                    text += ` (${req.timeInTurns} turn${req.timeInTurns !== 1 ? 's' : ''})`;
                }
                return text;
            }
            
            case 'specific-actor': {
                const req = this.requirement as SpecificActorRequirement;
                let text = `Specific patient: ${stage.getSave().actors[req.actorId]?.name || req.actorId})`;
                if (req.timeInTurns !== undefined) {
                    text += ` (${req.timeInTurns} turn${req.timeInTurns !== 1 ? 's' : ''})`;
                }
                return text;
            }
            
            case 'station-stats': {
                const req = this.requirement as StationStatsRequirement;
                const parts = Object.entries(req.stats)
                    .map(([stat, value]) => `${stat} -${value}`);
                return parts.join(', ');
            }
            
            default:
                return 'Unknown requirement';
        }
    }

    /**
     * Get a human-readable text description of the reward
     * @returns A text description of what will be rewarded for fulfilling this request
     */
    getRewardText(): string {
        switch (this.reward.type) {
            case 'station-stats': {
                const rew = this.reward as StationStatsReward;
                const parts = Object.entries(rew.stats)
                    .map(([stat, value]) => `${stat} +${value}`);
                return parts.join(', ');
            }
            
            default:
                return 'Unknown reward';
        }
    }

    /**
     * Parse a REQUEST tag into a Request object
     * 
     * Format: [REQUEST: <factionName> | <description> | <requirement> -> <reward>]
     * 
     * Requirements:
     * - ACTOR <stat><op><value>[, <stat><op><value>]* - Actor with stat constraints
     *   - op can be: >= (min), <= (max)
     *   - Example: ACTOR brawn>=7, charm>=5, lust<=3
     * - ACTOR-NAME <actorName> - Specific actor by name
     *   - Example: ACTOR-NAME Jane Doe
     * - STATION <stat>-<value>[, <stat>-<value>]* - Station stats to be reduced
     *   - Stats will be reduced by the specified amounts (cannot reduce to 0)
     *   - Example: STATION Security-2, Harmony-1
     * 
     * Rewards:
     * - <stat>+<value>[, <stat>+<value>]* - Station stat bonuses
     *   - Example: Systems+2, Comfort+1, Security+3
     * 
     * Full Examples:
     * - [REQUEST: Stellar Concord | We need a strong laborer | ACTOR brawn>=7, charm>=6 -> Systems+2, Comfort+1]
     * - [REQUEST: Shadow Syndicate | Return our missing operative | ACTOR-NAME Jane Doe -> Harmony+3]
     * - [REQUEST: Defense Coalition | Trade resources for upgrades | STATION Provision-2, Comfort-1 -> Systems+3, Security+2]
     * 
     * @param tag The request tag string to parse
     * @param stage The game stage to resolve faction and actor names to IDs
     * @returns A Request object, or null if parsing fails
     */
    static parseFromTag(tag: string, stage: Stage): Request | null {
        try {
            // Extract content between [REQUEST: and ]
            const match = tag.match(/\[REQUEST:\s*(.+?)\s*\]/i);
            if (!match) {
                console.warn(`Invalid REQUEST tag format: ${tag}`);
                return null;
            }

            const content = match[1];
            
            // Split by | to separate factionName, description, and requirement->reward
            const pipeParts = content.split('|').map(p => p.trim());
            if (pipeParts.length !== 3) {
                console.warn(`REQUEST tag must have format: factionName | description | requirement -> reward: ${tag}`);
                return null;
            }

            const [factionName, description, requirementRewardStr] = pipeParts;

            if (!factionName || !description) {
                console.warn(`REQUEST tag must have non-empty factionName and description: ${tag}`);
                return null;
            }

            // Resolve faction name to faction ID using findBestNameMatch
            const save = stage.getSave();
            const faction = findBestNameMatch(factionName, Object.values(save.factions));
            
            if (!faction) {
                console.warn(`Failed to find faction matching name: ${factionName}`);
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
            const requirement = this.parseRequirement(requirementStr, stage);
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
                faction.id,
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
    private static parseRequirement(requirementStr: string, stage: Stage): RequestRequirement | null {
        const trimmed = requirementStr.trim();

        // Check for optional TIME component at the end
        let timeInTurns: number | undefined = undefined;
        let requirementWithoutTime = trimmed;
        const timeMatch = trimmed.match(/\s+TIME:(\d+)$/i);
        if (timeMatch) {
            timeInTurns = parseInt(timeMatch[1], 10);
            requirementWithoutTime = trimmed.substring(0, trimmed.length - timeMatch[0].length).trim();
        }

        // Check for ACTOR-NAME format
        if (requirementWithoutTime.startsWith('ACTOR-NAME')) {
            const actorName = requirementWithoutTime.substring('ACTOR-NAME'.length).trim();
            if (!actorName) {
                return null;
            }
            
            // Resolve actor name to actor ID using findBestNameMatch
            const save = stage.getSave();
            const actor = findBestNameMatch(actorName, Object.values(save.actors));
            
            if (!actor) {
                console.warn(`Failed to find actor matching name: ${actorName}`);
                return null;
            }
            
            return {
                type: 'specific-actor',
                actorId: actor.id,
                timeInTurns: timeInTurns
            };
        }

        // Check for ACTOR format (with stats)
        if (requirementWithoutTime.startsWith('ACTOR')) {
            const statsStr = requirementWithoutTime.substring('ACTOR'.length).trim();
            const actorStatsReq = this.parseActorStatsRequirement(statsStr);
            if (actorStatsReq && timeInTurns !== undefined) {
                actorStatsReq.timeInTurns = timeInTurns;
            }
            return actorStatsReq;
        }

        // Check for STATION format
        if (requirementWithoutTime.startsWith('STATION')) {
            const statsStr = requirementWithoutTime.substring('STATION'.length).trim();
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
            // Match pattern: <stat><op><value> where value can be a number or letter grade
            // First try to match with a number
            let match = constraint.match(/^(\w+)\s*(>=|<=)\s*(\d+)$/);
            let value: number;
            
            if (match) {
                // Numeric value found
                const [, statName, operator, valueStr] = match;
                value = parseInt(valueStr, 10);
                
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
            } else {
                // Try to match with a letter grade (e.g., "B-", "A+", "C")
                match = constraint.match(/^(\w+)\s*(>=|<=)\s*([A-F][+-]?)$/i);
                if (!match) {
                    console.warn(`Invalid actor stat constraint: ${constraint}`);
                    return null;
                }
                
                const [, statName, operator, grade] = match;
                value = gradeToScore(grade.toUpperCase());
                
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
        }

        return {
            type: 'actor-with-stats',
            minStats: Object.keys(minStats).length > 0 ? minStats : undefined,
            maxStats: Object.keys(maxStats).length > 0 ? maxStats : undefined
        };
    }

    /**
     * Parse station stat requirements (e.g., "Security-2, Harmony-1")
     * Stats represent the amount to be deducted from the station
     */
    private static parseStationStatsRequirement(statsStr: string): StationStatsRequirement | null {
        const stats: Partial<Record<StationStat, number>> = {};

        if (!statsStr) {
            return null;
        }

        // Split by comma and process each deduction
        const constraints = statsStr.split(',').map(s => s.trim());
        
        for (const constraint of constraints) {
            // Match pattern: <stat>-<value>
            const match = constraint.match(/^(\w+)\s*-\s*(\d+)$/);
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
