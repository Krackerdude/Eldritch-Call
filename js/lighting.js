// ═══════════════════════════════════════════════════════════════════════════════
// LIGHTING.JS - Scene Lighting, Shadows, and Wind System
// Dependencies: THREE.js
// Injected: scene
// Consumers: Main game loop, day/night system, weather system
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null
};

// Light components
let ambientLight = null;
let hemiLight = null;
let sunLight = null;
let rimLight = null;

// Shadow update tracking
let lastShadowUpdate = 0;
const SHADOW_UPDATE_INTERVAL = 200; // ms between shadow map updates

// ═══════════════════════════════════════════════════════════════════════════════
// WIND SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const wind = {
    dir: new THREE.Vector2(1, 0.3).normalize(),
    strength: 0.5,
    t: 0,
    
    update(delta, weatherWindMultiplier = 1) {
        this.t += delta;
        this.strength = (0.5 + (Math.sin(this.t * 0.5) * 0.5 + 0.5) * 0.8) * weatherWindMultiplier;
        this.dir.set(Math.cos(this.t * 0.1), Math.sin(this.t * 0.1)).normalize();
    },
    
    getDirection() {
        return this.dir.clone();
    },
    
    getStrength() {
        return this.strength;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHTING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const LightingSystem = {
    init(deps) {
        Object.assign(_deps, deps);
        
        if (!_deps.scene) {
            console.warn('LightingSystem: No scene provided');
            return;
        }
        
        // Ambient light - toned down for deep rich colors
        ambientLight = new THREE.AmbientLight(0x445566, 0.25);
        _deps.scene.add(ambientLight);
        
        // Hemisphere light for natural sky/ground color bleed
        hemiLight = new THREE.HemisphereLight(0x6699aa, 0x2d4a2d, 0.3);
        _deps.scene.add(hemiLight);
        
        // Main sun/directional light
        sunLight = new THREE.DirectionalLight(0xffeebb, 0.85);
        sunLight.castShadow = true;
        
        // Shadow camera setup
        sunLight.shadow.camera.left = -60;
        sunLight.shadow.camera.right = 60;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 150;
        
        // Shadow map settings
        sunLight.shadow.mapSize.width = 512;
        sunLight.shadow.mapSize.height = 512;
        sunLight.shadow.bias = -0.002;
        sunLight.shadow.normalBias = 0.03;
        
        _deps.scene.add(sunLight);
        _deps.scene.add(sunLight.target);
        
        // Rim/back light for depth
        rimLight = new THREE.DirectionalLight(0x6688bb, 0.15);
        rimLight.position.set(-50, 30, 50);
        _deps.scene.add(rimLight);
        
        console.log('Lighting system initialized');
    },
    
    // Update sun position based on time of day
    updateSunPosition(playerPos, sunAngle) {
        if (!sunLight) return;
        
        const sunY = Math.sin(sunAngle);
        const sunX = Math.cos(sunAngle);
        
        // Position sun light relative to player
        sunLight.position.set(
            playerPos.x + sunX * 60,
            Math.max(sunY * 60, 10),
            playerPos.z - 30
        );
        sunLight.target.position.copy(playerPos);
        
        return { sunX, sunY };
    },
    
    // Update light intensities based on time of day and weather
    updateIntensities(sunIntensity, lightningActive = false) {
        if (!sunLight || !ambientLight) return;
        
        const lightningBoost = lightningActive ? 1.5 : 0;
        
        sunLight.intensity = Math.max(0.08, sunIntensity * 0.75) + lightningBoost;
        ambientLight.intensity = Math.max(0.1, 0.15 + sunIntensity * 0.12) + lightningBoost * 0.3;
    },
    
    // Update shadows (call periodically, not every frame)
    updateShadows(renderer, now) {
        if (!renderer) return false;
        
        if (now - lastShadowUpdate >= SHADOW_UPDATE_INTERVAL) {
            renderer.shadowMap.needsUpdate = true;
            lastShadowUpdate = now;
            return true;
        }
        return false;
    },
    
    // Set hemisphere light colors (for biome transitions)
    setHemisphereColors(skyColor, groundColor) {
        if (hemiLight) {
            hemiLight.color.set(skyColor);
            hemiLight.groundColor.set(groundColor);
        }
    },
    
    // Set ambient light color and intensity
    setAmbientLight(color, intensity) {
        if (ambientLight) {
            if (color !== undefined) ambientLight.color.set(color);
            if (intensity !== undefined) ambientLight.intensity = intensity;
        }
    },
    
    // Set sun light color and intensity
    setSunLight(color, intensity) {
        if (sunLight) {
            if (color !== undefined) sunLight.color.set(color);
            if (intensity !== undefined) sunLight.intensity = intensity;
        }
    },
    
    // Get light references for external use
    getLights() {
        return {
            ambient: ambientLight,
            hemisphere: hemiLight,
            sun: sunLight,
            rim: rimLight
        };
    },
    
    // Get wind system
    getWind() {
        return wind;
    },
    
    // Update wind
    updateWind(delta, weatherMultiplier) {
        wind.update(delta, weatherMultiplier);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    LightingSystem,
    wind,
    ambientLight,
    hemiLight,
    sunLight,
    rimLight,
    SHADOW_UPDATE_INTERVAL
};

export default LightingSystem;
