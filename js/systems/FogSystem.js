// ═══════════════════════════════════════════════════════════════════════════════
// FOGSYSTEM.JS - Time-of-day Fog Color Management
// Dependencies: THREE.js, DayNightSystem
// Injected: scene, BiomeSystem (for currentBiome), InteriorSystem (for currentInterior)
// Consumers: BiomeSystem (for transitions), Main loop
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null,
    DayNightSystem: null,
    BiomeSystem: null,
    InteriorSystem: null
};

// Default fog color (rolling meadows)
const DEFAULT_FOG_COLOR = 0x9ecfb7;

const FogSystem = (function() {
    // Private state - reusable color objects to avoid GC pressure
    const _nightColor = new THREE.Color(0x0a1525);
    const _twilightColor = new THREE.Color(0x3a2a35);
    let _baseBiomeColor = new THREE.Color(DEFAULT_FOG_COLOR);
    const _targetColor = new THREE.Color();
    
    // Private helper
    function _easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
    
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
            
            const { scene, BiomeSystem } = _deps;
            if (scene && scene.fog && BiomeSystem) {
                const currentBiome = BiomeSystem.getCurrent();
                _baseBiomeColor.setHex(currentBiome.fogColor);
                scene.fog.color.copy(_baseBiomeColor);
                scene.fog.density = currentBiome.fogDensity;
            }
        },
        
        // Update base color when biome changes
        setBiomeColor(biome) {
            _baseBiomeColor.setHex(biome.fogColor);
        },
        
        // Main update function - call every frame
        update() {
            const { scene, DayNightSystem, InteriorSystem } = _deps;
            
            if (!scene || !scene.fog) return;
            if (InteriorSystem && InteriorSystem.isInInterior()) return;
            if (!DayNightSystem) return;
            
            const gameTime = DayNightSystem.getGameTime();
            
            // Time periods:
            // 0-5: Night (darkest)
            // 5-7: Dawn transition
            // 7-17: Day (biome color)
            // 17-19: Dusk transition
            // 19-24: Night
            
            if (gameTime >= 7 && gameTime < 17) {
                _targetColor.copy(_baseBiomeColor);
            } else if (gameTime >= 19 || gameTime < 5) {
                _targetColor.copy(_nightColor);
            } else if (gameTime >= 5 && gameTime < 7) {
                const t = (gameTime - 5) / 2;
                _targetColor.lerpColors(_nightColor, _baseBiomeColor, _easeInOutQuad(t));
            } else if (gameTime >= 17 && gameTime < 19) {
                const t = (gameTime - 17) / 2;
                _targetColor.lerpColors(_baseBiomeColor, _nightColor, _easeInOutQuad(t));
            }
            
            scene.fog.color.lerp(_targetColor, 0.02);
        },
        
        // Restore fog after exiting interior
        restore() {
            const { scene, BiomeSystem } = _deps;
            
            if (!scene || !scene.fog) return;
            
            const currentBiome = BiomeSystem ? BiomeSystem.getCurrent() : null;
            if (currentBiome) {
                _baseBiomeColor.setHex(currentBiome.fogColor);
                scene.fog.density = currentBiome.fogDensity;
            }
            this.forceUpdate();
        },
        
        // Force immediate update (no lerping)
        forceUpdate() {
            const { scene, DayNightSystem } = _deps;
            
            if (!scene || !scene.fog || !DayNightSystem) return;
            
            const gameTime = DayNightSystem.getGameTime();
            
            if (gameTime >= 7 && gameTime < 17) {
                scene.fog.color.copy(_baseBiomeColor);
            } else if (gameTime >= 19 || gameTime < 5) {
                scene.fog.color.copy(_nightColor);
            } else if (gameTime >= 5 && gameTime < 7) {
                const t = (gameTime - 5) / 2;
                scene.fog.color.lerpColors(_nightColor, _baseBiomeColor, _easeInOutQuad(t));
            } else if (gameTime >= 17 && gameTime < 19) {
                const t = (gameTime - 17) / 2;
                scene.fog.color.lerpColors(_baseBiomeColor, _nightColor, _easeInOutQuad(t));
            }
        },
        
        // Getters
        getNightColor() { return _nightColor; },
        getTwilightColor() { return _twilightColor; },
        getBaseBiomeColor() { return _baseBiomeColor; },
        
        // Direct reference for biome transition system
        get baseBiomeColor() { return _baseBiomeColor; },
        
        // Interpolate base color during biome transition
        lerpBaseBiomeColor(fromColor, toColor, t) {
            _baseBiomeColor.lerpColors(fromColor, toColor, t);
        }
    };
})();

export { FogSystem };
export default FogSystem;
