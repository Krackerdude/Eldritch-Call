// ═══════════════════════════════════════════════════════════════════════════════
// TERRAIN.JS - Procedural Terrain Generation
// Dependencies: THREE.js
// Injected: scene, CONFIG, getBiomeAt
// Consumers: Everything that needs height data, world generation
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null,
    CONFIG: {
        terrainSize: 3000,
        terrainSegments: 180
    },
    getBiomeAt: null
};

// Terrain components
let terrain = null;
let terrainGeom = null;
let terrainMaterial = null;
let water = null;

// Terrain modifiers for buildings/POIs
const terrainModifiers = [];

// Object positions for collision checking
const objPositions = [];

// ═══════════════════════════════════════════════════════════════════════════════
// NOISE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 2D noise function with configurable scale and seed
 * Uses a hash-based approach for deterministic results
 */
function noise2D(x, z, scale, seed = 0) {
    const X = Math.floor(x / scale);
    const Z = Math.floor(z / scale);
    const fx = (x / scale) - X;
    const fz = (z / scale) - Z;
    
    // Hash function for pseudo-random values
    const hash = (a, b) => {
        const n = (((a * 374761393 + b * 668265263 + seed) ^ (a * 1274126177)) ^ 
                  ((a * 374761393 + b * 668265263 + seed) >> 13)) & 0x7fffffff;
        return n / 0x7fffffff;
    };
    
    // Smoothstep interpolation
    const sx = fx * fx * (3 - 2 * fx);
    const sz = fz * fz * (3 - 2 * fz);
    
    // Bilinear interpolation
    return (hash(X, Z) * (1 - sx) + hash(X + 1, Z) * sx) * (1 - sz) +
           (hash(X, Z + 1) * (1 - sx) + hash(X + 1, Z + 1) * sx) * sz;
}

/**
 * Get base terrain height without modifiers
 * Uses multiple octaves of noise for natural-looking terrain
 */
function getBaseHeight(x, z) {
    const dist = Math.sqrt(x * x + z * z);
    
    // Mountain influence increases with distance from center
    const mtn = Math.max(0, Math.min(1, (dist - 400) / 800));
    
    // Base terrain - multiple octaves
    let h = noise2D(x, z, 400, 1) * 30 +
            noise2D(x, z, 200, 2) * 15 +
            noise2D(x, z, 100, 3) * 7 +
            noise2D(x, z, 50, 4) * 3;
    
    // Mountain layers
    h += (noise2D(x, z, 600, 10) * 200 + noise2D(x, z, 300, 11) * 100) * mtn;
    
    return h - 50; // Offset to center around sea level
}

/**
 * Get terrain slope at a position
 * Useful for determining if ground is too steep for objects
 */
function getSlope(x, z) {
    const h = getBaseHeight(x, z);
    const dx = getBaseHeight(x + 1, z) - h;
    const dz = getBaseHeight(x, z + 1) - h;
    return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Get final terrain height with building/POI modifiers applied
 */
function getHeight(x, z) {
    let baseH = getBaseHeight(x, z);
    
    // Check each terrain modifier - subtly raise terrain to match building level
    for (const mod of terrainModifiers) {
        const dx = x - mod.x;
        const dz = z - mod.z;
        
        // Rotate point to building's local space
        const cos = Math.cos(-mod.rotation);
        const sin = Math.sin(-mod.rotation);
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        
        // Distance from building edge
        const halfW = mod.width / 2;
        const halfD = mod.depth / 2;
        const distFromEdgeX = Math.abs(localX) - halfW;
        const distFromEdgeZ = Math.abs(localZ) - halfD;
        const distFromEdge = Math.max(distFromEdgeX, distFromEdgeZ);
        
        // Only affect area around building (within blendDist of edge)
        const blendDist = 8;
        if (distFromEdge < blendDist) {
            // Inside building footprint or within blend zone
            const t = Math.max(0, distFromEdge) / blendDist;
            const blend = 1 - (t * t); // Quadratic falloff
            
            // Only raise if base terrain is below target, blend smoothly
            if (baseH < mod.targetHeight) {
                const raise = (mod.targetHeight - baseH) * blend;
                baseH += raise;
            }
        }
    }
    
    return baseH;
}

/**
 * Register a building to subtly modify terrain
 */
function registerTerrainModifier(x, z, width, depth, rotation, targetHeight) {
    terrainModifiers.push({ x, z, width, depth, rotation, targetHeight });
}

/**
 * Check if position collides with existing objects
 */
function checkCollision(x, z, radius) {
    for (const pos of objPositions) {
        const dx = x - pos.x;
        const dz = z - pos.z;
        const minDist = radius + pos.radius;
        if (dx * dx + dz * dz < minDist * minDist) {
            return true;
        }
    }
    return false;
}

/**
 * Register an object position for collision checking
 */
function registerObjectPosition(x, z, radius) {
    objPositions.push({ x, z, radius });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERRAIN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const TerrainSystem = {
    init(deps) {
        Object.assign(_deps, deps);
        
        if (!_deps.scene) {
            console.warn('TerrainSystem: No scene provided');
            return;
        }
        
        this.createTerrain();
        
        console.log('Terrain system initialized');
    },
    
    createTerrain() {
        const { terrainSize, terrainSegments } = _deps.CONFIG;
        
        // Create terrain geometry
        terrainGeom = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
        const tPos = terrainGeom.attributes.position;
        
        // Add vertex colors for biome tinting
        const colors = new Float32Array(tPos.count * 3);
        
        for (let i = 0; i < tPos.count; i++) {
            const x = tPos.getX(i);
            const z = -tPos.getY(i);
            
            // Set height
            tPos.setZ(i, getHeight(x, z));
            
            // Get biome color at this position
            let color;
            if (_deps.getBiomeAt) {
                const biome = _deps.getBiomeAt(x, z);
                color = new THREE.Color(biome.grassColor);
            } else {
                color = new THREE.Color(0x4a8f4a); // Default grass green
            }
            
            // Add slight variation
            const variation = 0.9 + Math.random() * 0.2;
            colors[i * 3] = color.r * variation;
            colors[i * 3 + 1] = color.g * variation;
            colors[i * 3 + 2] = color.b * variation;
        }
        
        terrainGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        terrainGeom.computeVertexNormals();
        
        // Create terrain material with vertex colors
        terrainMaterial = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0
        });
        
        // Create terrain mesh
        terrain = new THREE.Mesh(terrainGeom, terrainMaterial);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        
        _deps.scene.add(terrain);
    },
    
    // Create water plane (optional)
    createWater(waterLevel = 0, size = 4000) {
        const waterGeom = new THREE.PlaneGeometry(size, size);
        const waterMat = new THREE.MeshStandardMaterial({
            color: 0x1a5a8a,
            transparent: true,
            opacity: 0.7,
            roughness: 0.1,
            metalness: 0.3
        });
        
        water = new THREE.Mesh(waterGeom, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = waterLevel;
        
        if (_deps.scene) {
            _deps.scene.add(water);
        }
        
        return water;
    },
    
    // Update terrain vertex colors for biome transitions
    updateVertexColors() {
        if (!terrainGeom || !_deps.getBiomeAt) return;
        
        const tPos = terrainGeom.attributes.position;
        const colors = terrainGeom.attributes.color.array;
        
        for (let i = 0; i < tPos.count; i++) {
            const x = tPos.getX(i);
            const z = -tPos.getY(i);
            
            const biome = _deps.getBiomeAt(x, z);
            const color = new THREE.Color(biome.grassColor);
            const variation = 0.9 + Math.random() * 0.2;
            
            colors[i * 3] = color.r * variation;
            colors[i * 3 + 1] = color.g * variation;
            colors[i * 3 + 2] = color.b * variation;
        }
        
        terrainGeom.attributes.color.needsUpdate = true;
    },
    
    // Get spawn area (slightly smaller than terrain)
    getSpawnArea() {
        return _deps.CONFIG.terrainSize * 0.85;
    },
    
    // Get terrain mesh
    getTerrain() {
        return terrain;
    },
    
    // Get water mesh
    getWater() {
        return water;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    TerrainSystem,
    noise2D,
    getBaseHeight,
    getHeight,
    getSlope,
    registerTerrainModifier,
    checkCollision,
    registerObjectPosition,
    terrainModifiers,
    objPositions,
    terrain,
    water
};

export default TerrainSystem;
