// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG.JS - Game Configuration and Constants
// Dependencies: None
// Consumers: All game systems
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// GAME CONFIG - Spawn counts, culling distances, damage values
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Terrain
    terrainSize: 3000,
    terrainSegments: 180,
    
    // LOD & Culling distances (fog-of-war style)
    treeCulling: 350,       // Full cull beyond this
    treeLOD: 120,           // Switch to billboard at this distance
    rockCulling: 280,
    rockLOD: 100,
    groundCulling: 120,
    creatureCulling: 200,
    
    // Spawn counts
    treeCount: 2500,
    rockCount: 600,
    grassInstances: 3000,
    flowerInstances: 800,
    mushroomCount: 180,
    fernCount: 280,
    fallingLeafCount: 40,
    
    // Creatures (set to 0 by default, spawned by CreatureSystem)
    deerCount: 0,
    foxCount: 0,
    sheepCount: 0,
    rabbitCount: 0,
    
    // Particles
    precipCount: 1000,
    
    // Resource health
    treeHealth: 100,
    rockHealth: 80,
    
    // Tool damage
    axeDamage: 25,
    pickaxeDamage: 20,
    handDamage: 5,
    swordDamage: 15,
    
    // Interaction
    interactRange: 5,
    
    // Spatial grid
    gridCellSize: 80
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT CONFIG - BO3-style snappy movement
// ═══════════════════════════════════════════════════════════════════════════════

const MOVE = {
    // Base movement
    walkSpeed: 0.18,
    sprintSpeed: 0.55,
    
    // Jump
    jumpForce: 0.42,
    gravity: 0.022,
    
    // Slide (tuned for grounded weight feel)
    slideSpeed: 1.35,
    slideDuration: 420,     // ms
    slideCooldown: 250,     // ms
    slideHeight: 0.9,       // Camera height during slide
    slideTilt: 0.15,        // Camera tilt in radians
    
    // Dash
    dashSpeed: 0.7,
    dashDuration: 120,      // ms
    dashCooldown: 500,      // ms
    
    // FOV effects
    baseFOV: 75,
    maxFOV: 95,
    fovSmoothness: 0.08,
    tiltSmoothness: 0.12
};

// ═══════════════════════════════════════════════════════════════════════════════
// DUNGEON CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const DUNGEON_CONFIG = {
    roomCount: { min: 5, max: 8 },
    roomSize: { min: 15, max: 25 },
    corridorWidth: 6,
    wallHeight: 8,
    enemiesPerRoom: { min: 1, max: 3 },
    treasureChance: 0.3,
    trapChance: 0.2
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOW CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const SHADOW_CONFIG = {
    updateInterval: 200,    // ms between shadow map updates
    mapSize: 512,
    bias: -0.002,
    normalBias: 0.03,
    cameraSize: 60,
    cameraNear: 1,
    cameraFar: 150
};

// ═══════════════════════════════════════════════════════════════════════════════
// RENDERER CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const RENDERER_CONFIG = {
    antialias: false,
    powerPreference: "high-performance",
    stencil: false,
    depth: true,
    pixelRatio: 1.0,
    toneMapping: 'ACESFilmic',
    toneMappingExposure: 0.85
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPATIAL GRID - Fast spatial partitioning for object culling
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * SpatialGrid - Fast spatial partitioning for object culling
 * 
 * Usage:
 *   const grid = new SpatialGrid(cellSize);
 *   grid.add(obj);           // obj must have posX, posZ properties
 *   grid.getNearby(x, z, r); // Returns objects within radius
 *   grid.remove(obj);        // Remove object from grid
 *   grid.clear();            // Remove all objects
 *   grid.getStats();         // Get cell count and object count
 */
class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
        this._resultCache = []; // Reusable array to avoid allocations
    }
    
    // Get cell key for coordinates
    getKey(x, z) {
        const cx = Math.floor(x / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx},${cz}`;
    }
    
    // Add object to grid (obj must have posX, posZ properties)
    add(obj) {
        const key = this.getKey(obj.posX, obj.posZ);
        if (!this.cells.has(key)) this.cells.set(key, []);
        this.cells.get(key).push(obj);
        obj._gridKey = key;
    }
    
    // Remove object from grid
    remove(obj) {
        if (obj._gridKey && this.cells.has(obj._gridKey)) {
            const arr = this.cells.get(obj._gridKey);
            const idx = arr.indexOf(obj);
            if (idx !== -1) arr.splice(idx, 1);
        }
    }
    
    // Clear all objects from grid
    clear() {
        this.cells.clear();
        this._resultCache.length = 0;
    }
    
    // Get all objects near a point (optimized: reuses result array)
    getNearby(px, pz, radius) {
        this._resultCache.length = 0;
        const cellRadius = Math.ceil(radius / this.cellSize);
        const cx = Math.floor(px / this.cellSize);
        const cz = Math.floor(pz / this.cellSize);
        
        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                const key = `${cx + dx},${cz + dz}`;
                const cell = this.cells.get(key);
                if (cell) {
                    for (let i = 0, len = cell.length; i < len; i++) {
                        this._resultCache.push(cell[i]);
                    }
                }
            }
        }
        return this._resultCache;
    }
    
    // Get objects with actual distance filtering (more precise than getNearby)
    getNearbyFiltered(px, pz, radius) {
        const nearby = this.getNearby(px, pz, radius);
        const radiusSq = radius * radius;
        return nearby.filter(obj => {
            const dx = obj.posX - px;
            const dz = obj.posZ - pz;
            return (dx * dx + dz * dz) <= radiusSq;
        });
    }
    
    // Get statistics about the grid
    getStats() {
        let totalObjects = 0;
        this.cells.forEach(cell => { totalObjects += cell.length; });
        return {
            cellCount: this.cells.size,
            objectCount: totalObjects,
            cellSize: this.cellSize
        };
    }
    
    // Check if a position is in a populated cell
    hasObjectsAt(x, z) {
        const key = this.getKey(x, z);
        const cell = this.cells.get(key);
        return cell && cell.length > 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER MOVEMENT STATE - Runtime state for player physics
// ═══════════════════════════════════════════════════════════════════════════════

function createPlayerMoveState() {
    return {
        isGrounded: true,
        velY: 0,
        
        // Slide state
        isSliding: false,
        slideTime: 0,
        slideCooldownTime: 0,
        slideDir: { x: 0, z: 0 },
        
        // Dash state
        isDashing: false,
        dashTime: 0,
        dashCooldownTime: 0,
        dashDir: { x: 0, z: 0 },
        
        // Camera state
        camHeight: 1.6,
        targetCamHeight: 1.6,
        camTilt: 0,
        targetCamTilt: 0,
        
        // FOV state
        currentFOV: MOVE.baseFOV,
        targetFOV: MOVE.baseFOV,
        
        // Speed tracking
        currentSpeed: 0,
        
        // Input flags (just pressed)
        spaceJustPressed: false,
        ctrlJustPressed: false,
        shiftJustPressed: false
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT STATE - Keyboard state tracking
// ═══════════════════════════════════════════════════════════════════════════════

function createInputState() {
    return {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        shift: false,
        ctrl: false
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME TIME STATE
// ═══════════════════════════════════════════════════════════════════════════════

function createGameTimeState() {
    return {
        day: 1,
        hour: 8,
        minute: 0
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VILLAGE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const VILLAGE_CONFIG = {
    center: { x: 0, z: 0 },
    radius: 120   // Clear zone for village buildings
};

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

const BUILDING_TYPES = {
    castle: {
        name: 'Valdris Keep',
        width: 45, depth: 50, height: 18,
        interiorType: 'castle',
        hasShop: false,
        npcCount: 3
    },
    temple: {
        name: 'Temple of the Ancients',
        width: 24, depth: 30, height: 14,
        interiorType: 'temple',
        hasShop: false,
        npcCount: 2
    },
    mageGuild: {
        name: 'Arcane Sanctum',
        width: 20, depth: 22, height: 12,
        interiorType: 'mageGuild',
        hasShop: true,
        shopType: 'magic',
        npcCount: 2
    },
    fighterGuild: {
        name: 'Iron Wolf Hall',
        width: 22, depth: 24, height: 10,
        interiorType: 'fighterGuild',
        hasShop: true,
        shopType: 'weapons',
        npcCount: 2
    },
    tavern: {
        name: 'The Golden Flagon',
        width: 18, depth: 20, height: 9,
        interiorType: 'tavern',
        hasShop: true,
        shopType: 'food',
        npcCount: 3
    },
    shop: {
        name: 'General Store',
        width: 14, depth: 16, height: 8,
        interiorType: 'shop',
        hasShop: true,
        shopType: 'general',
        npcCount: 1
    },
    house: {
        name: 'House',
        width: 10, depth: 12, height: 7,
        interiorType: 'house',
        hasShop: false,
        npcCount: 1
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    CONFIG,
    MOVE,
    DUNGEON_CONFIG,
    SHADOW_CONFIG,
    RENDERER_CONFIG,
    VILLAGE_CONFIG,
    BUILDING_TYPES,
    SpatialGrid,
    createPlayerMoveState,
    createInputState,
    createGameTimeState
};

export default CONFIG;
