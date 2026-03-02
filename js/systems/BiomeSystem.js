// ═══════════════════════════════════════════════════════════════════════════════
// BIOMESYSTEM.JS - Biome Definitions, Layout, and Environment Transitions
// Dependencies: THREE.js, FogSystem (for color transitions)
// Injected: scene, skyMat, ambientLight, hemiLight, loreBookData, addThought
// Consumers: Terrain generation, Tree spawning, NPC spawning, Player update
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies (set via init)
let _deps = {
    scene: null,
    skyMat: null,
    ambientLight: null,
    hemiLight: null,
    FogSystem: null,
    loreBookData: null,
    addThought: null
};

const BiomeSystem = (function() {
    // Private: Biome definitions
    const _BIOMES = {
        rolling_meadows: {
            id: 'rolling_meadows',
            name: 'Rolling Meadows',
            subtitle: 'Land of Gentle Hills',
            grassColor: 0x4a7045,
            grassColorAlt: 0x5a8055,
            skyColorTop: 0x87CEEB,
            skyColorBottom: 0xE0F6FF,
            fogColor: 0x9ecfb7,
            fogDensity: 0.0045,
            treeTypes: ['oak', 'birch', 'maple'],
            treeColors: [0x2d5a35, 0x3d6a45, 0x4d7a55, 0x8B4513],
            treeDensity: 0.7,
            flowerColors: [0xff6b9d, 0xffd93d, 0x6bcfff, 0xffffff, 0xff9ff3],
            grassHeight: 0.5,
            ambientLight: 0x6688aa,
            ambientIntensity: 0.6
        },
        ancient_woodlands: {
            id: 'ancient_woodlands',
            name: 'Ancient Woodlands',
            subtitle: 'Where Giants Sleep',
            grassColor: 0x2a4a2a,
            grassColorAlt: 0x1a3a1a,
            skyColorTop: 0x3a5a4a,
            skyColorBottom: 0x5a7a6a,
            fogColor: 0x2d4a3a,
            fogDensity: 0.008,
            treeTypes: ['ancient', 'gnarled', 'towering'],
            treeColors: [0x1a3020, 0x0a2010, 0x2a4030, 0x3d2817],
            treeDensity: 1.8,
            flowerColors: [0x8a9a7a, 0x6a8a6a, 0x4a6a4a],
            grassHeight: 0.35,
            ambientLight: 0x4a6a5a,
            ambientIntensity: 0.4
        },
        crimson_dunes: {
            id: 'crimson_dunes',
            name: 'Crimson Dunes',
            subtitle: 'The Scorched Expanse',
            grassColor: 0xc4a35a,
            grassColorAlt: 0xd4b36a,
            skyColorTop: 0xffaa66,
            skyColorBottom: 0xffe4b5,
            fogColor: 0xe8b87a,
            fogDensity: 0.005,
            treeTypes: ['cactus', 'deadTree', 'palm'],
            treeColors: [0x6b8e23, 0x8b7355, 0xc19a6b, 0xdaa520],
            treeDensity: 0.2,
            flowerColors: [0xff4500, 0xff6347, 0xffa500],
            grassHeight: 0.15,
            ambientLight: 0xffaa77,
            ambientIntensity: 0.9
        },
        frozen_peaks: {
            id: 'frozen_peaks',
            name: 'Frozen Peaks',
            subtitle: 'Realm of Eternal Winter',
            grassColor: 0xd8e8f0,
            grassColorAlt: 0xe8f8ff,
            skyColorTop: 0xaaccee,
            skyColorBottom: 0xe8f4ff,
            fogColor: 0xc8e0f8,
            fogDensity: 0.006,
            treeTypes: ['pine', 'frostedPine', 'snowyRock'],
            treeColors: [0x1a4a3a, 0x2a5a4a, 0xaabbcc, 0xffffff],
            treeDensity: 0.5,
            flowerColors: [0xaaddff, 0xffffff, 0xcceeFF],
            grassHeight: 0.2,
            ambientLight: 0xaabbcc,
            ambientIntensity: 0.8
        },
        murky_swamp: {
            id: 'murky_swamp',
            name: 'Murky Swamp',
            subtitle: 'The Festering Bog',
            grassColor: 0x3a4a2a,
            grassColorAlt: 0x4a5a3a,
            skyColorTop: 0x5a6a4a,
            skyColorBottom: 0x7a8a6a,
            fogColor: 0x4a5a38,
            fogDensity: 0.012,
            treeTypes: ['willow', 'mangrove', 'deadTree'],
            treeColors: [0x3a4a2a, 0x4a5a3a, 0x2a3a1a, 0x5a4a3a],
            treeDensity: 1.3,
            flowerColors: [0x88ff88, 0x44ff88, 0xaaff44],
            grassHeight: 0.7,
            ambientLight: 0x6a8a5a,
            ambientIntensity: 0.35
        },
        crystal_heights: {
            id: 'crystal_heights',
            name: 'Crystal Heights',
            subtitle: 'The Shimmering Summit',
            grassColor: 0x7a8a9a,
            grassColorAlt: 0x8a9aaa,
            skyColorTop: 0xaa99ff,
            skyColorBottom: 0xeeddff,
            fogColor: 0xc8b8e8,
            fogDensity: 0.005,
            treeTypes: ['crystalTree', 'alpine', 'stonePine'],
            treeColors: [0x7788aa, 0x99aacc, 0xbbccee, 0xeeddff],
            treeDensity: 0.4,
            flowerColors: [0xff88ff, 0x88ffff, 0xffff88, 0xffffff],
            grassHeight: 0.3,
            ambientLight: 0xaa99dd,
            ambientIntensity: 0.75
        },
        shadow_vale: {
            id: 'shadow_vale',
            name: 'Shadow Vale',
            subtitle: 'Where Light Fears to Tread',
            grassColor: 0x2a2a3a,
            grassColorAlt: 0x3a3a4a,
            skyColorTop: 0x1a1a2a,
            skyColorBottom: 0x3a3a4a,
            fogColor: 0x1a1828,
            fogDensity: 0.01,
            treeTypes: ['deadTree', 'twisted', 'thornTree'],
            treeColors: [0x1a1a1a, 0x2a2a2a, 0x3a2a3a, 0x4a3a4a],
            treeDensity: 0.9,
            flowerColors: [0x6a4a6a, 0x8a5a8a, 0x4a2a4a],
            grassHeight: 0.4,
            ambientLight: 0x4a4a6a,
            ambientIntensity: 0.25
        }
    };
    
    // Private: Biome layout (angular sectors)
    const _LAYOUT = [
        { biome: 'rolling_meadows', minDist: 0, maxDist: 250, angleStart: 0, angleEnd: 360 },
        { biome: 'ancient_woodlands', minDist: 200, maxDist: 1200, angleStart: 330, angleEnd: 30 },
        { biome: 'crimson_dunes', minDist: 200, maxDist: 1200, angleStart: 30, angleEnd: 90 },
        { biome: 'frozen_peaks', minDist: 200, maxDist: 1200, angleStart: 90, angleEnd: 150 },
        { biome: 'murky_swamp', minDist: 200, maxDist: 1200, angleStart: 150, angleEnd: 210 },
        { biome: 'crystal_heights', minDist: 200, maxDist: 1200, angleStart: 210, angleEnd: 270 },
        { biome: 'shadow_vale', minDist: 200, maxDist: 1200, angleStart: 270, angleEnd: 330 }
    ];
    
    // Private state
    let _currentBiome = _BIOMES.rolling_meadows;
    let _lastBiomeId = 'rolling_meadows';
    
    // Private: Transition state (pre-allocated colors to avoid GC)
    const _transition = {
        active: false,
        progress: 0,
        duration: 2.0,
        fromFog: new THREE.Color(),
        toFog: new THREE.Color(),
        fromFogDensity: 0,
        toFogDensity: 0,
        fromSkyTop: new THREE.Color(),
        toSkyTop: new THREE.Color(),
        fromSkyBottom: new THREE.Color(),
        toSkyBottom: new THREE.Color(),
        fromAmbient: new THREE.Color(),
        toAmbient: new THREE.Color(),
        fromGround: new THREE.Color(),
        toGround: new THREE.Color()
    };
    
    // Private: Get biome at world coordinates
    function _getBiomeAt(x, z) {
        const dist = Math.sqrt(x * x + z * z);
        let angle = Math.atan2(z, x) * (180 / Math.PI) + 90;
        angle = ((angle % 360) + 360) % 360;
        
        for (let i = _LAYOUT.length - 1; i >= 0; i--) {
            const layout = _LAYOUT[i];
            if (dist >= layout.minDist && dist < layout.maxDist) {
                let inAngle = false;
                if (layout.angleStart < layout.angleEnd) {
                    inAngle = angle >= layout.angleStart && angle < layout.angleEnd;
                } else {
                    inAngle = angle >= layout.angleStart || angle < layout.angleEnd;
                }
                if (inAngle) return _BIOMES[layout.biome];
            }
        }
        return _BIOMES.rolling_meadows;
    }
    
    // Private: Show biome discovery notification
    function _showDiscovery(biome, isFirstDiscovery) {
        const notification = document.getElementById('biome-notification');
        const nameEl = document.getElementById('biome-name-text');
        const subtitleEl = document.getElementById('biome-subtitle-text');
        const labelEl = document.querySelector('.biome-discovered-label');
        
        if (nameEl) nameEl.textContent = biome.name;
        if (subtitleEl) subtitleEl.textContent = biome.subtitle;
        if (labelEl) labelEl.textContent = isFirstDiscovery ? 'Discovered' : 'Entering';
        
        if (notification) {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 2500);
        }
    }
    
    // Private: Start biome transition
    function _startTransition(toBiome) {
        const bt = _transition;
        const { scene, skyMat, ambientLight, hemiLight } = _deps;
        
        bt.active = true;
        bt.progress = 0;
        
        if (scene && scene.fog) {
            bt.fromFog.copy(scene.fog.color);
            bt.fromFogDensity = scene.fog.density;
        } else {
            bt.fromFog.setHex(0xC4A882);
            bt.fromFogDensity = 0.0015;
        }
        bt.toFog.setHex(toBiome.fogColor);
        bt.toFogDensity = toBiome.fogDensity;
        
        if (skyMat && skyMat.uniforms) {
            bt.fromSkyTop.copy(skyMat.uniforms.biomeTint.value);
            bt.fromSkyBottom.copy(skyMat.uniforms.biomeFog.value);
        }
        bt.toSkyTop.setHex(toBiome.skyColorTop);
        bt.toSkyBottom.setHex(toBiome.skyColorBottom);
        
        if (ambientLight) bt.fromAmbient.copy(ambientLight.color);
        bt.toAmbient.setHex(toBiome.ambientLight);
        
        if (hemiLight) bt.fromGround.copy(hemiLight.groundColor);
        bt.toGround.setHex(toBiome.grassColor);
    }
    
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
        },
        
        // === Data Access ===
        getBiomes() { return _BIOMES; },
        getBiome(id) { return _BIOMES[id] || _BIOMES.rolling_meadows; },
        getLayout() { return _LAYOUT; },
        
        // === State ===
        getCurrent() { return _currentBiome; },
        getCurrentId() { return _currentBiome.id; },
        isTransitioning() { return _transition.active; },
        
        // === Core Functions ===
        getBiomeAt(x, z) {
            return _getBiomeAt(x, z);
        },
        
        // Update player biome based on position
        updatePlayerBiome(px, pz) {
            const newBiome = _getBiomeAt(px, pz);
            
            if (newBiome.id !== _lastBiomeId) {
                _lastBiomeId = newBiome.id;
                _currentBiome = newBiome;
                
                // Start visual transition immediately
                _startTransition(newBiome);
                
                // Defer non-critical operations
                requestAnimationFrame(() => {
                    let isFirstDiscovery = false;
                    if (_deps.loreBookData) {
                        const biomeEntry = _deps.loreBookData.discoveries.biomes.find(b => b.id === newBiome.id);
                        if (biomeEntry && !biomeEntry.discovered) {
                            biomeEntry.discovered = true;
                            isFirstDiscovery = true;
                            if (_deps.addThought) {
                                _deps.addThought(`Discovered a new region: ${newBiome.name}!`);
                            }
                        }
                    }
                    _showDiscovery(newBiome, isFirstDiscovery);
                });
            }
        },
        
        // Update transition (call each frame)
        updateTransition(delta) {
            const bt = _transition;
            const { scene, skyMat, ambientLight, hemiLight, FogSystem } = _deps;
            
            if (!bt.active) return;
            
            bt.progress += delta / bt.duration;
            if (bt.progress >= 1) {
                bt.progress = 1;
                bt.active = false;
                if (FogSystem) FogSystem.setBiomeColor(_currentBiome);
            }
            
            // Smoothstep easing
            const t = bt.progress * bt.progress * (3 - 2 * bt.progress);
            
            // Lerp fog
            if (scene && scene.fog && FogSystem) {
                FogSystem.baseBiomeColor.lerpColors(bt.fromFog, bt.toFog, t);
                scene.fog.density = bt.fromFogDensity + (bt.toFogDensity - bt.fromFogDensity) * t;
            }
            
            // Lerp sky
            if (skyMat && skyMat.uniforms) {
                skyMat.uniforms.biomeTint.value.lerpColors(bt.fromSkyTop, bt.toSkyTop, t);
                skyMat.uniforms.biomeFog.value.lerpColors(bt.fromSkyBottom, bt.toSkyBottom, t);
            }
            
            // Lerp ambient
            if (ambientLight) {
                ambientLight.color.lerpColors(bt.fromAmbient, bt.toAmbient, t);
            }
            
            // Lerp hemisphere ground
            if (hemiLight) {
                hemiLight.groundColor.lerpColors(bt.fromGround, bt.toGround, t);
            }
        },
        
        // Instant environment update (used for initialization)
        setEnvironment(biome) {
            const { scene, skyMat, ambientLight, hemiLight, FogSystem } = _deps;
            
            if (scene && scene.fog) {
                scene.fog.color.setHex(biome.fogColor);
                scene.fog.density = biome.fogDensity;
            }
            if (FogSystem) FogSystem.setBiomeColor(biome);
            
            if (skyMat && skyMat.uniforms) {
                skyMat.uniforms.biomeTint.value.setHex(biome.skyColorTop);
                skyMat.uniforms.biomeFog.value.setHex(biome.skyColorBottom);
            }
            
            if (ambientLight) {
                ambientLight.color.setHex(biome.ambientLight);
            }
            
            if (hemiLight) {
                hemiLight.groundColor.setHex(biome.grassColor);
            }
        }
    };
})();

// Backward compatibility exports
const BIOMES = BiomeSystem.getBiomes();
const BIOME_LAYOUT = BiomeSystem.getLayout();

// Legacy function wrappers
function getBiomeAt(x, z) { return BiomeSystem.getBiomeAt(x, z); }
function updatePlayerBiome(px, pz) { BiomeSystem.updatePlayerBiome(px, pz); }
function updateBiomeTransition(delta) { BiomeSystem.updateTransition(delta); }
function updateBiomeEnvironment(biome) { BiomeSystem.setEnvironment(biome); }

export { 
    BiomeSystem, 
    BIOMES, 
    BIOME_LAYOUT,
    getBiomeAt,
    updatePlayerBiome,
    updateBiomeTransition,
    updateBiomeEnvironment
};
export default BiomeSystem;
