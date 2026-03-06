// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLESYSTEM.JS - Centralized Particle Impact Effects
// Dependencies: THREE.js
// Injected: scene
// Consumers: ResourceSystem, CombatSystem, CreatureSystem, HeldItemSystem
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null
};

const ParticleSystem = (function() {
    // === Private State ===
    const _activeParticles = [];  // All live particle groups
    const _particlePool = [];     // Recycled meshes
    const MAX_POOL_SIZE = 200;

    // Reusable geometry (shared across all particles)
    const _boxGeo = new THREE.BoxGeometry(1, 1, 1);

    // Material cache keyed by hex color
    const _materialCache = {};

    // === Material Presets ===
    // Maps resource/material types to particle color palettes
    const _materialPresets = {
        // Wood / Trees
        wood:       { colors: [0x8B4513, 0x6B3410, 0xA0522D], size: 0.06, count: 8, spread: 0.25, gravity: 0.012 },
        oak:        { colors: [0x8B4513, 0x654321, 0x5C4033], size: 0.06, count: 8, spread: 0.25, gravity: 0.012 },
        pine:       { colors: [0x4A3728, 0x3B2F2F, 0x228B22], size: 0.05, count: 8, spread: 0.2, gravity: 0.012 },
        birch:      { colors: [0xD2C6B2, 0xFAF0E6, 0x8B7D6B], size: 0.05, count: 8, spread: 0.2, gravity: 0.012 },
        maple:      { colors: [0xB5651D, 0xCC5500, 0x8B4513], size: 0.06, count: 8, spread: 0.25, gravity: 0.012 },
        palm:       { colors: [0x8B7355, 0x6B4226, 0x228B22], size: 0.05, count: 8, spread: 0.2, gravity: 0.012 },
        willow:     { colors: [0x556B2F, 0x6B8E23, 0x8B7D6B], size: 0.05, count: 8, spread: 0.2, gravity: 0.012 },
        ancient:    { colors: [0x4A3728, 0x2F4F4F, 0x8B4513], size: 0.07, count: 10, spread: 0.3, gravity: 0.012 },

        // Stone / Rocks
        stone:      { colors: [0x808080, 0x696969, 0xA9A9A9], size: 0.05, count: 10, spread: 0.3, gravity: 0.018 },
        granite:    { colors: [0x808080, 0x696969, 0x778899], size: 0.05, count: 10, spread: 0.3, gravity: 0.018 },
        slate:      { colors: [0x708090, 0x2F4F4F, 0x778899], size: 0.05, count: 10, spread: 0.3, gravity: 0.018 },
        mossy:      { colors: [0x808080, 0x556B2F, 0x6B8E23], size: 0.05, count: 10, spread: 0.3, gravity: 0.018 },
        sandstone:  { colors: [0xC2B280, 0xD2B48C, 0xDEB887], size: 0.05, count: 10, spread: 0.25, gravity: 0.015 },
        crystal:    { colors: [0x9AB8D5, 0xADD8E6, 0xB0E0E6], size: 0.04, count: 12, spread: 0.2, gravity: 0.010 },
        obsidian:   { colors: [0x1C1C1C, 0x2F2F2F, 0x4B0082], size: 0.05, count: 10, spread: 0.3, gravity: 0.018 },
        boulder:    { colors: [0x808080, 0x696969, 0x5A5A5A], size: 0.06, count: 10, spread: 0.3, gravity: 0.018 },

        // Combat
        bullet:     { colors: [0xFFCC44, 0xFFAA22, 0xFF8800], size: 0.04, count: 12, spread: 0.3, gravity: 0.015, flash: true },
        arrow:      { colors: [0x8A5A30, 0x6B4226, 0xA0522D], size: 0.05, count: 8, spread: 0.25, gravity: 0.015 },
        melee:      { colors: [0xCCCCCC, 0xAAAAAA, 0xFFCC44], size: 0.04, count: 6, spread: 0.2, gravity: 0.015 },

        // Creature death
        creature:   { colors: [0x8B4513, 0x654321, 0xA0522D], size: 0.06, count: 15, spread: 0.35, gravity: 0.012 },

        // Tree/rock destruction (bigger burst)
        destroy_tree:  { colors: [0x228B22, 0x8B4513, 0x556B2F], size: 0.07, count: 25, spread: 0.5, gravity: 0.010 },
        destroy_rock:  { colors: [0x808080, 0x696969, 0xA9A9A9], size: 0.06, count: 30, spread: 0.5, gravity: 0.015 }
    };

    // === Private Helpers ===

    function _getMaterial(color) {
        if (!_materialCache[color]) {
            _materialCache[color] = new THREE.MeshBasicMaterial({ color });
        }
        return _materialCache[color];
    }

    function _getParticleMesh(color, size) {
        let mesh = _particlePool.pop();
        if (mesh) {
            mesh.material = _getMaterial(color);
            mesh.scale.setScalar(size);
            mesh.visible = true;
        } else {
            mesh = new THREE.Mesh(_boxGeo, _getMaterial(color));
            mesh.scale.setScalar(size);
        }
        return mesh;
    }

    function _recycleParticleMesh(mesh) {
        mesh.visible = false;
        if (_deps.scene) _deps.scene.remove(mesh);
        if (_particlePool.length < MAX_POOL_SIZE) {
            _particlePool.push(mesh);
        } else {
            mesh.geometry = undefined;
            mesh.material = undefined;
        }
    }

    // === Core Spawn Logic ===

    function _spawnBurst(position, preset) {
        const scene = _deps.scene;
        if (!scene) return;

        const { colors, size, count, spread, gravity, flash } = preset;
        const particles = [];

        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const sizeVariance = size * (0.7 + Math.random() * 0.6);
            const mesh = _getParticleMesh(color, sizeVariance);

            mesh.position.copy(position);
            scene.add(mesh);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * spread,
                Math.random() * 0.2 + 0.1,
                (Math.random() - 0.5) * spread
            );

            particles.push({ mesh, vel, age: 0, gravity, baseSize: sizeVariance });
        }

        // Impact flash for bullet/energy types
        if (flash) {
            const spark = new THREE.PointLight(colors[0], 2, 4);
            spark.position.copy(position);
            scene.add(spark);
            setTimeout(() => scene.remove(spark), 60);
        }

        _activeParticles.push({ particles, maxAge: 1.0 });
    }

    // === Public API ===
    return {
        init(deps) {
            Object.assign(_deps, deps);
        },

        /**
         * Spawn impact particles at a position.
         * @param {THREE.Vector3} position - World position for the burst
         * @param {string|number} materialType - Preset name (e.g. 'oak', 'granite', 'bullet') OR a hex color
         * @param {number} [countOverride] - Optional particle count override
         */
        spawnImpact(position, materialType, countOverride) {
            let preset;

            if (typeof materialType === 'string' && _materialPresets[materialType]) {
                preset = { ..._materialPresets[materialType] };
            } else if (typeof materialType === 'number') {
                // Raw hex color fallback
                preset = { colors: [materialType], size: 0.05, count: 8, spread: 0.25, gravity: 0.015 };
            } else {
                // Unknown string - use generic stone
                preset = { ..._materialPresets.stone };
            }

            if (countOverride !== undefined) {
                preset.count = countOverride;
            }

            _spawnBurst(position, preset);
        },

        /**
         * Spawn destruction burst (bigger, more particles).
         * @param {THREE.Vector3} position - World position
         * @param {string} resourceType - 'tree' or 'rock'
         */
        spawnDestruction(position, resourceType) {
            const key = 'destroy_' + resourceType;
            const preset = _materialPresets[key] || _materialPresets.destroy_rock;
            _spawnBurst(position, { ...preset });
        },

        /**
         * Update all active particles. Call once per frame.
         * @param {number} delta - Frame delta time in seconds
         */
        update(delta) {
            const step = delta * 60; // Normalize to ~60fps baseline

            for (let g = _activeParticles.length - 1; g >= 0; g--) {
                const group = _activeParticles[g];
                let allDone = true;

                for (let i = group.particles.length - 1; i >= 0; i--) {
                    const p = group.particles[i];
                    p.age += 0.05 * step;

                    if (p.age < group.maxAge) {
                        allDone = false;
                        p.mesh.position.x += p.vel.x * step;
                        p.mesh.position.y += p.vel.y * step;
                        p.mesh.position.z += p.vel.z * step;
                        p.vel.y -= p.gravity * step;
                        const scale = (1 - p.age) * p.baseSize;
                        p.mesh.scale.setScalar(scale);
                    } else if (p.mesh.visible) {
                        _recycleParticleMesh(p.mesh);
                    }
                }

                if (allDone) {
                    _activeParticles.splice(g, 1);
                }
            }
        },

        // Expose for systems that need the legacy color+count API
        spawnSimple(position, color, count) {
            this.spawnImpact(position, color, count);
        },

        // Getters for debugging
        get activeCount() {
            return _activeParticles.reduce((sum, g) => sum + g.particles.length, 0);
        },

        get poolSize() {
            return _particlePool.length;
        }
    };
})();

export { ParticleSystem };
export default ParticleSystem;
