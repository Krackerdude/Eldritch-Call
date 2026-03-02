// ═══════════════════════════════════════════════════════════════════════════════
// INTERIORSYSTEM.JS - Interior/Exterior Scene Management and Transitions
// Dependencies: FogSystem
// Injected: scene, player, terrain, water, skySphere, clouds, various object lists
// Consumers: POI interaction, Player movement, Scene rendering
// ═══════════════════════════════════════════════════════════════════════════════

// Injected dependencies
let _deps = {
    scene: null,
    player: null,
    terrain: null,
    water: null,
    skySphere: null,
    clouds: [],
    swayingTrees: [],
    harvestableResources: [],
    groundCover: [],
    poiList: [],
    villageBuildings: [],
    biomeTownBuildings: [],
    npcList: [],
    biomeNPCList: [],
    interiorNPCList: [],
    fallingLeaves: [],
    windParticles: [],
    CreatureSystem: null,
    FogSystem: null,
    getPitch: null,
    setPitch: null
};

const InteriorSystem = (function() {
    // Private state
    let _currentInterior = null;
    let _exteriorPlayerPos = null;
    let _exteriorCameraRot = null;
    const _interiorScenes = {};
    const _generatedDungeons = {};
    const _colliders = {};
    let _savedFogDensity = 0;
    
    // Private: Add collider box for interior type
    function _addCollider(type, x, y, z, w, h, d) {
        if (!_colliders[type]) _colliders[type] = [];
        _colliders[type].push({
            minX: x - w/2, maxX: x + w/2,
            minY: y, maxY: y + h,
            minZ: z - d/2, maxZ: z + d/2
        });
    }
    
    // Private: Hide exterior objects
    function _hideExterior() {
        const { 
            swayingTrees, harvestableResources, groundCover, poiList, 
            terrain, water, skySphere, clouds, CreatureSystem,
            fallingLeaves, windParticles 
        } = _deps;
        
        if (swayingTrees) swayingTrees.forEach(t => { if (t.group) t.group.visible = false; });
        if (harvestableResources) harvestableResources.forEach(r => { if (r.group) r.group.visible = false; });
        if (groundCover) groundCover.forEach(g => { if (g.mesh) g.mesh.visible = false; });
        if (poiList) poiList.forEach(p => { if (p.group) p.group.visible = false; });
        if (terrain) terrain.visible = false;
        if (water) water.visible = false;
        if (skySphere) skySphere.visible = false;
        if (clouds) clouds.forEach(c => { if (c.group) c.group.visible = false; });
        if (CreatureSystem) CreatureSystem.setAllVisible(false);
        if (fallingLeaves) fallingLeaves.forEach(l => { if (l.mesh) l.mesh.visible = false; });
        if (windParticles) windParticles.forEach(p => { if (p.mesh) p.mesh.visible = false; });
    }
    
    // Private: Show exterior objects
    function _showExterior() {
        const { 
            swayingTrees, harvestableResources, groundCover, poiList,
            villageBuildings, biomeTownBuildings, terrain, water,
            npcList, biomeNPCList, skySphere, clouds, CreatureSystem,
            fallingLeaves, windParticles
        } = _deps;
        
        if (swayingTrees) swayingTrees.forEach(t => { if (t.group) t.group.visible = true; });
        if (harvestableResources) harvestableResources.forEach(r => { if (r.group) r.group.visible = true; });
        if (groundCover) groundCover.forEach(g => { if (g.mesh) g.mesh.visible = true; });
        if (poiList) poiList.forEach(p => { if (p.group) p.group.visible = true; });
        if (villageBuildings) villageBuildings.forEach(b => { if (b.group) b.group.visible = true; });
        if (biomeTownBuildings) biomeTownBuildings.forEach(b => { if (b.group) b.group.visible = true; });
        if (terrain) terrain.visible = true;
        if (water) water.visible = true;
        if (npcList) npcList.forEach(n => { if (n.group) n.group.visible = true; });
        if (biomeNPCList) biomeNPCList.forEach(n => { if (n.group) n.group.visible = true; });
        if (skySphere) skySphere.visible = true;
        if (clouds) clouds.forEach(c => { if (c.group) c.group.visible = true; });
        if (CreatureSystem) CreatureSystem.setAllVisible(true);
        if (fallingLeaves) fallingLeaves.forEach(l => { if (l.mesh) l.mesh.visible = true; });
        if (windParticles) windParticles.forEach(p => { if (p.mesh) p.mesh.visible = true; });
    }
    
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
        },
        
        // === State Accessors ===
        isInInterior() { return _currentInterior !== null; },
        getCurrent() { return _currentInterior; },
        getType() { return _currentInterior ? _currentInterior.type : null; },
        getScene() { return _currentInterior ? _currentInterior.scene : null; },
        getScenes() { return _interiorScenes; },
        getDungeons() { return _generatedDungeons; },
        
        // === Collider Management ===
        addCollider(type, x, y, z, w, h, d) {
            _addCollider(type, x, y, z, w, h, d);
        },
        
        getColliders(type) {
            return _colliders[type] || [];
        },
        
        checkCollision(newX, newZ, playerRadius = 0.4) {
            if (!_currentInterior) return false;
            const colliders = _colliders[_currentInterior.type];
            if (!colliders) return false;
            
            const { player } = _deps;
            if (!player) return false;
            
            const offset = _currentInterior.scene.position;
            const localX = newX - offset.x;
            const localZ = newZ - offset.z;
            const playerY = player.position.y - offset.y;
            
            for (const box of colliders) {
                const closestX = Math.max(box.minX, Math.min(localX, box.maxX));
                const closestZ = Math.max(box.minZ, Math.min(localZ, box.maxZ));
                const distX = localX - closestX;
                const distZ = localZ - closestZ;
                const distSq = distX * distX + distZ * distZ;
                
                const playerMinY = playerY - 0.5;
                const playerMaxY = playerY + 1.1;
                const yOverlap = playerMinY < box.maxY && playerMaxY > box.minY;
                
                if (distSq < playerRadius * playerRadius && yOverlap) {
                    return true;
                }
            }
            return false;
        },
        
        resolveCollision(oldX, oldZ, newX, newZ, playerRadius = 0.4) {
            if (!this.checkCollision(newX, oldZ, playerRadius)) {
                return { x: newX, z: oldZ };
            }
            if (!this.checkCollision(oldX, newZ, playerRadius)) {
                return { x: oldX, z: newZ };
            }
            return { x: oldX, z: oldZ };
        },
        
        // === Scene Management ===
        getOrCreateScene(type) {
            if (_interiorScenes[type]) return _interiorScenes[type];
            return null;
        },
        
        registerScene(type, sceneObj) {
            _interiorScenes[type] = sceneObj;
        },
        
        registerDungeon(type, dungeon) {
            _generatedDungeons[type] = dungeon;
        },
        
        // === Enter/Exit ===
        enter(poi, createSceneFn) {
            const { scene, player, getPitch } = _deps;
            
            const transition = document.getElementById('location-transition');
            if (transition) {
                const nameEl = transition.querySelector('.location-name');
                const subEl = transition.querySelector('.location-subtitle');
                if (nameEl) nameEl.textContent = poi.config.name;
                if (subEl) subEl.textContent = poi.config.subtitle;
            }
            
            if (player) {
                _exteriorPlayerPos = player.position.clone();
                _exteriorCameraRot = { 
                    x: getPitch ? getPitch() : 0, 
                    y: player.rotation.y 
                };
            }
            
            if (transition) transition.classList.add('active');
            
            setTimeout(() => {
                let interior = _interiorScenes[poi.config.interiorType];
                if (!interior && createSceneFn) {
                    interior = createSceneFn(poi.config.interiorType);
                }
                
                _hideExterior();
                
                if (scene && scene.fog) {
                    _savedFogDensity = scene.fog.density;
                    scene.fog.density = 0;
                }
                
                if (interior) {
                    interior.visible = true;
                    _currentInterior = { poi, scene: interior, type: poi.config.interiorType };
                    
                    const interiorOffset = interior.position;
                    const startZ = interior.exitPosition ? interior.exitPosition.z - 8 : 0;
                    const startX = interior.exitPosition ? interior.exitPosition.x : 0;
                    
                    if (player) {
                        player.position.set(interiorOffset.x + startX, 1.6, interiorOffset.z + startZ);
                        player.rotation.y = 0;
                    }
                    
                    const indicator = document.getElementById('interior-indicator');
                    if (indicator) {
                        indicator.classList.add('show');
                        const nameEl = indicator.querySelector('.interior-name');
                        if (nameEl) {
                            nameEl.textContent = interior.dungeonName || poi.config.name;
                        }
                    }
                }
                
                setTimeout(() => { 
                    if (transition) transition.classList.remove('active'); 
                }, 1000);
            }, 800);
        },
        
        exit() {
            if (!_currentInterior) return;
            
            const { scene, player, FogSystem, interiorNPCList, setPitch } = _deps;
            
            const transition = document.getElementById('location-transition');
            if (transition) {
                const nameEl = transition.querySelector('.location-name');
                const subEl = transition.querySelector('.location-subtitle');
                if (nameEl) nameEl.textContent = 'Surface';
                if (subEl) subEl.textContent = 'Returning...';
                transition.classList.add('active');
            }
            
            setTimeout(() => {
                if (_currentInterior.scene) {
                    _currentInterior.scene.visible = false;
                }
                
                if (interiorNPCList) {
                    interiorNPCList.length = 0;
                }
                
                _showExterior();
                
                if (scene && scene.fog) {
                    scene.fog.density = _savedFogDensity;
                }
                if (FogSystem) FogSystem.restore();
                
                if (player && _exteriorPlayerPos) {
                    player.position.copy(_exteriorPlayerPos);
                }
                if (_exteriorCameraRot) {
                    if (setPitch) setPitch(_exteriorCameraRot.x);
                    if (player) player.rotation.y = _exteriorCameraRot.y;
                }
                
                _currentInterior = null;
                
                const indicator = document.getElementById('interior-indicator');
                if (indicator) indicator.classList.remove('show');
                
                setTimeout(() => { 
                    if (transition) transition.classList.remove('active'); 
                }, 1000);
            }, 800);
        }
    };
})();

// Legacy function wrappers
function enterInterior(poi, createSceneFn) { 
    InteriorSystem.enter(poi, createSceneFn); 
}
function exitInterior() { 
    InteriorSystem.exit(); 
}
function checkInteriorCollision(newX, newZ, playerRadius = 0.4) {
    return InteriorSystem.checkCollision(newX, newZ, playerRadius);
}
function resolveInteriorCollision(oldX, oldZ, newX, newZ, playerRadius = 0.4) {
    return InteriorSystem.resolveCollision(oldX, oldZ, newX, newZ, playerRadius);
}
function addCollider(type, x, y, z, w, h, d) {
    InteriorSystem.addCollider(type, x, y, z, w, h, d);
}

export { 
    InteriorSystem,
    enterInterior,
    exitInterior,
    checkInteriorCollision,
    resolveInteriorCollision,
    addCollider
};
export default InteriorSystem;
