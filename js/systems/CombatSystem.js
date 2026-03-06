// ═══════════════════════════════════════════════════════════════════════════════
// COMBATSYSTEM.JS - Combat Mechanics, Targeting, and Projectiles
// Dependencies: THREE.js (for projectiles)
// Injected: scene, player, creatures, harvestableResources, getHeight, inventory
// Consumers: Player input, Weapon system, Resource harvesting
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null,
    player: null,
    creatures: [],
    harvestableResources: [],
    getHeight: null,
    currentInterior: null,
    createMuzzleFlash: null,
    createImpactParticles: null,
    ParticleSystem: null
};

const CombatSystem = (function() {
    // Private state - swing mechanics
    let _isSwinging = false;
    let _swingProgress = 0;
    let _canSwing = true;
    let _projectileFiredThisSwing = false;
    
    // Private state - targeting
    let _targetedResource = null;
    
    // Private state - projectiles
    const _activeProjectiles = [];
    
    // Configuration
    const _config = {
        swingCooldown: 350,        // ms between swings
        interactRange: 5,          // range to detect targetable resources
        maxProjectileDistance: 500, // max distance before projectile despawns
        weaponSpeeds: {
            hand: 7, pickaxe: 7, axe: 7, sword: 10,
            mace: 6, flintlock: 5, lance: 7, longbow: 4, 
            katana: 12, staff: 5, broadsword: 5, dagger: 14
        }
    };
    
    // Harvest UI icons (SVG paths)
    const _harvestIcons = {
        tree: '<path d="M16 4l-8 12h4l-6 10h20l-6-10h4z" fill="currentColor"/><rect x="14" y="24" width="4" height="6" fill="currentColor"/>',
        rock: '<path d="M6 24l4-10 6 2 8-8 4 6-4 10-8 2z" fill="currentColor"/><path d="M10 14l4 1 4-4" stroke="currentColor" stroke-width="1" opacity="0.5"/>',
        groundcover: '<ellipse cx="16" cy="14" rx="10" ry="8" fill="currentColor"/><rect x="12" y="18" width="8" height="10" fill="currentColor" opacity="0.7"/>'
    };
    
    // Resource name mappings
    const _treeNames = {
        oak: 'Oak Tree', pine: 'Mountain Pine', birch: 'Silver Birch', branched: 'Branching Ash',
        cypress: 'Cypress', bushy: 'Elderwood', ancient: 'Ancient Greatwood', maple: 'Autumn Maple',
        golden: 'Golden Elm', dead: 'Deadwood', stacked: 'Cloud Tree', cactus: 'Desert Cactus',
        palm: 'Oasis Palm', frostedPine: 'Frost Pine', willow: 'Weeping Willow', mangrove: 'Swamp Mangrove',
        crystalTree: 'Crystal Spire Tree', alpine: 'Alpine Fir', twisted: 'Shadowtwist', thornTree: 'Blackthorn',
        mossyAncient: 'Moss-Shrouded Elder', gnarled: 'Gnarled Sentinel'
    };
    
    const _rockNames = {
        granite: 'Granite', slate: 'Slate', mossy: 'Mossy Stone', sandstone: 'Sandstone',
        crystal: 'Crystal Cluster', obsidian: 'Obsidian', boulder: 'Boulder'
    };
    
    // Easing functions for animations
    const _easing = {
        outBack(t) {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        },
        inQuad(t) { return t * t; },
        outQuad(t) { return 1 - (1 - t) * (1 - t); },
        inOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    };
    
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
        },
        
        // === State Getters (read-only access) ===
        isSwinging() { return _isSwinging; },
        getSwingProgress() { return _swingProgress; },
        canSwing() { return _canSwing; },
        getTargetedResource() { return _targetedResource; },
        getActiveProjectiles() { return _activeProjectiles; },
        projectileFiredThisSwing() { return _projectileFiredThisSwing; },
        
        // Backward compatibility - direct property access
        get swingProgress() { return _swingProgress; },
        set swingProgress(val) { _swingProgress = val; },
        
        // === Configuration ===
        getConfig() { return { ..._config }; },
        getHarvestIcons() { return { ..._harvestIcons }; },
        getEasing() { return _easing; },
        getWeaponSpeed(weaponId, weaponType) {
            return _config.weaponSpeeds[weaponId] || (weaponType === 'weapon' ? 10 : 7);
        },
        
        // === Resource Name Helpers ===
        getResourceDisplayName(res) {
            if (res.resourceType === 'tree') {
                return _treeNames[res.treeType] || 'Tree';
            } else if (res.resourceType === 'rock') {
                return _rockNames[res.rockType] || 'Rock';
            }
            return 'Resource';
        },
        
        getResourceLoreId(res) {
            if (res.resourceType === 'tree') return res.treeType;
            if (res.resourceType === 'rock') return res.rockType;
            return null;
        },
        
        // === Swing Actions ===
        startSwing(inventoryOpen) {
            if (_isSwinging || !_canSwing || inventoryOpen) return false;
            _isSwinging = true;
            _swingProgress = 0;
            _projectileFiredThisSwing = false;
            _canSwing = false;
            setTimeout(() => { _canSwing = true; }, _config.swingCooldown);
            return true;
        },
        
        updateSwingProgress(delta, weaponId, weaponType) {
            if (!_isSwinging) return 0;
            const speed = this.getWeaponSpeed(weaponId, weaponType);
            _swingProgress += delta * speed;
            return Math.min(_swingProgress, 1);
        },
        
        endSwing() {
            _isSwinging = false;
            _swingProgress = 0;
        },
        
        markProjectileFired() {
            _projectileFiredThisSwing = true;
        },
        
        // === Targeting ===
        setTargetedResource(resource) {
            _targetedResource = resource;
        },
        
        clearTarget() {
            _targetedResource = null;
        },
        
        hasTarget() {
            return _targetedResource !== null && !_targetedResource.isDestroyed;
        },
        
        // === Projectile Management ===
        addProjectile(projectile) {
            _activeProjectiles.push(projectile);
        },
        
        removeProjectile(index) {
            if (index >= 0 && index < _activeProjectiles.length) {
                _activeProjectiles.splice(index, 1);
            }
        },
        
        clearProjectiles() {
            _activeProjectiles.length = 0;
        },
        
        getProjectileCount() {
            return _activeProjectiles.length;
        },
        
        // === Projectile Creation ===
        createProjectile(type, startPos, direction) {
            const { scene } = _deps;
            if (!scene) return null;
            
            const isBullet = type === 'bullet';
            const group = new THREE.Group();
            
            if (isBullet) {
                // Bullet - small metallic sphere with trail
                const bullet = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08, 8, 8),
                    new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 })
                );
                group.add(bullet);
                // Muzzle flash at start
                this.createMuzzleFlash(startPos.clone());
            } else {
                // Arrow - shaft with fletching and head
                const shaft = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6),
                    new THREE.MeshStandardMaterial({ color: 0x8a5a30, roughness: 0.8 })
                );
                shaft.rotation.x = Math.PI / 2;
                group.add(shaft);
                
                // Arrow head
                const head = new THREE.Mesh(
                    new THREE.ConeGeometry(0.05, 0.15, 4),
                    new THREE.MeshStandardMaterial({ color: 0x606060, metalness: 0.7 })
                );
                head.rotation.x = -Math.PI / 2;
                head.position.z = -0.45;
                group.add(head);
                
                // Fletching
                const fletchMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
                for (let i = 0; i < 3; i++) {
                    const fletch = new THREE.Mesh(
                        new THREE.BoxGeometry(0.12, 0.01, 0.08),
                        fletchMat
                    );
                    fletch.position.z = 0.35;
                    fletch.rotation.z = (i / 3) * Math.PI * 2;
                    group.add(fletch);
                }
            }
            
            group.position.copy(startPos);
            group.lookAt(startPos.clone().add(direction));
            scene.add(group);
            
            const projectile = {
                group,
                type,
                velocity: direction.clone().multiplyScalar(isBullet ? 3.5 : 1.8),
                damage: isBullet ? 30 : 22,
                lifetime: isBullet ? 2.0 : 3.0,
                age: 0,
                hasHit: false
            };
            
            _activeProjectiles.push(projectile);
            return projectile;
        },
        
        createMuzzleFlash(pos) {
            const { scene } = _deps;
            if (!scene) return;
            
            const flash = new THREE.PointLight(0xffaa44, 3, 8);
            flash.position.copy(pos);
            scene.add(flash);
            setTimeout(() => scene.remove(flash), 80);
            
            // Smoke puff
            const smokeMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 });
            const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), smokeMat);
            smoke.position.copy(pos);
            scene.add(smoke);
            
            let smokeAge = 0;
            const smokeAnim = setInterval(() => {
                smokeAge += 0.05;
                smoke.scale.setScalar(1 + smokeAge * 3);
                smoke.material.opacity = 0.6 - smokeAge * 0.6;
                smoke.position.y += 0.02;
                if (smokeAge >= 1) {
                    clearInterval(smokeAnim);
                    scene.remove(smoke);
                }
            }, 16);
        },
        
        createImpactParticles(pos, type = 'bullet') {
            if (_deps.ParticleSystem) {
                _deps.ParticleSystem.spawnImpact(pos, type);
            }
        },
        
        // === Projectile Update ===
        updateProjectiles(delta) {
            const { scene, creatures, harvestableResources, getHeight, currentInterior, player } = _deps;
            if (!scene) return;
            
            for (let i = _activeProjectiles.length - 1; i >= 0; i--) {
                const proj = _activeProjectiles[i];
                proj.age += delta;
                
                if (proj.age >= proj.lifetime || proj.hasHit) {
                    scene.remove(proj.group);
                    _activeProjectiles.splice(i, 1);
                    continue;
                }
                
                // Move projectile
                const movement = proj.velocity.clone().multiplyScalar(delta * 60);
                proj.group.position.add(movement);
                
                // Arrow gravity/drop
                if (proj.type === 'arrow') {
                    proj.velocity.y -= 0.008;
                    proj.group.lookAt(proj.group.position.clone().add(proj.velocity));
                }
                
                // Check collision with ground
                const groundY = currentInterior ? currentInterior.scene.position.y : (getHeight ? getHeight(proj.group.position.x, proj.group.position.z) : 0);
                if (proj.group.position.y < groundY + 0.1) {
                    this.createImpactParticles(proj.group.position.clone(), proj.type);
                    proj.hasHit = true;
                    continue;
                }
                
                // Check collision with creatures
                if (!currentInterior && creatures) {
                    for (const creature of creatures) {
                        if (!creature.isAlive || !creature.group) continue;
                        const dx = proj.group.position.x - creature.group.position.x;
                        const dz = proj.group.position.z - creature.group.position.z;
                        const dy = proj.group.position.y - creature.group.position.y - 0.5;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        
                        if (dist < 1.5) {
                            this.createImpactParticles(proj.group.position.clone(), proj.type);
                            creature.takeDamage(proj.damage);
                            proj.hasHit = true;
                            break;
                        }
                    }
                }
                
                // Check collision with resources
                if (!currentInterior && harvestableResources && player) {
                    for (const resource of harvestableResources) {
                        if (resource.isDestroyed || !resource.group) continue;
                        const dx = proj.group.position.x - resource.group.position.x;
                        const dz = proj.group.position.z - resource.group.position.z;
                        const dy = proj.group.position.y - resource.group.position.y - 1.5;
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        
                        if (dist < 2) {
                            this.createImpactParticles(proj.group.position.clone(), proj.type);
                            resource.takeDamage(proj.damage, 0.3, player.position.clone());
                            proj.hasHit = true;
                            break;
                        }
                    }
                }
            }
        },
        
        // === Damage Calculation ===
        calculateDamage(baseDamage, effectiveness, targetType) {
            const eff = effectiveness[targetType] || 0.1;
            return baseDamage * eff;
        },
        
        // === State Reset ===
        reset() {
            _isSwinging = false;
            _swingProgress = 0;
            _canSwing = true;
            _projectileFiredThisSwing = false;
            _targetedResource = null;
            _activeProjectiles.length = 0;
        }
    };
})();

// Backward compatibility exports
const activeProjectiles = CombatSystem.getActiveProjectiles();

export { CombatSystem, activeProjectiles };
export default CombatSystem;
