// ═══════════════════════════════════════════════════════════════════════════════
// CREATURESYSTEM.JS - Creature Management and Entity Classes
// Dependencies: THREE.js
// Injected: scene, getHeight, spawnArea, CONFIG, sharedGeom, inventory, etc.
// Consumers: Main game loop, Combat system, Hunting
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null,
    getHeight: null,
    getSlope: null,
    getBaseHeight: null,
    spawnArea: 1200,
    CONFIG: { creatureCulling: 150, deerCount: 8, foxCount: 6, sheepCount: 8, rabbitCount: 12 },
    sharedGeom: null,
    inventory: null,
    ParticleSystem: null,
    updateQuestProgress: null,
    discoverEntry: null,
    showTransaction: null
};

// Colors for flying creatures
const butterflyColors = [0xff6b9d, 0xffd93d, 0x6bcfff, 0xc9ff6b, 0xff9d6b, 0xd96bff];
const birdColors = [0x4a3728, 0x2d5a35, 0x5a4a3a, 0x1a1a2e, 0x8b6914];

const CreatureSystem = (function() {
    // Private state
    const _creatures = [];
    const _flyingCreatures = [];
    
    // Private: Shared materials (created lazily)
    let _materials = null;
    function _getMaterials() {
        if (!_materials) {
            _materials = {
                deer: new THREE.MeshLambertMaterial({ color: 0x8B6914 }),
                deerLight: new THREE.MeshLambertMaterial({ color: 0xD2B48C }),
                fox: new THREE.MeshLambertMaterial({ color: 0xD2691E }),
                foxWhite: new THREE.MeshLambertMaterial({ color: 0xFFF8DC }),
                sheep: new THREE.MeshLambertMaterial({ color: 0xFFFFF0 }),
                sheepFace: new THREE.MeshLambertMaterial({ color: 0x2F2F2F }),
                rabbit: new THREE.MeshLambertMaterial({ color: 0xD2B48C }),
                rabbitWhite: new THREE.MeshLambertMaterial({ color: 0xFFFAFA })
            };
        }
        return _materials;
    }
    
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
        },
        
        // === List Accessors ===
        getCreatures() { return _creatures; },
        getFlyingCreatures() { return _flyingCreatures; },
        getMaterials() { return _getMaterials(); },
        
        // === List Management ===
        addCreature(creature) {
            _creatures.push(creature);
        },
        
        removeCreature(creature) {
            const idx = _creatures.indexOf(creature);
            if (idx !== -1) _creatures.splice(idx, 1);
        },
        
        addFlyingCreature(creature) {
            _flyingCreatures.push(creature);
        },
        
        removeFlyingCreature(creature) {
            const idx = _flyingCreatures.indexOf(creature);
            if (idx !== -1) _flyingCreatures.splice(idx, 1);
        },
        
        // === Visibility (for interior system) ===
        setAllVisible(visible) {
            _creatures.forEach(c => { if (c.group) c.group.visible = visible; });
            _flyingCreatures.forEach(c => { if (c.group) c.group.visible = visible; });
        },
        
        // === Update All ===
        updateAll(delta, time, playerPos) {
            // Update ground creatures
            for (const creature of _creatures) {
                if (creature.isAlive) {
                    creature.update(delta, playerPos);
                }
            }
            
            // Update flying creatures
            for (const fc of _flyingCreatures) {
                fc.update(delta, time, playerPos);
                fc.updateVis(playerPos.x, playerPos.z);
            }
        },
        
        // === Stats ===
        getStats() {
            return {
                ground: _creatures.length,
                flying: _flyingCreatures.length,
                alive: _creatures.filter(c => c.isAlive).length
            };
        },
        
        // === Spawning ===
        spawnInArea(getHeightFn) {
            const { spawnArea, CONFIG } = _deps;
            
            // Ground creatures - spawn in meadows
            for (let i = 0; i < 30; i++) {
                const x = (Math.random() - 0.5) * spawnArea * 0.5;
                const z = (Math.random() - 0.5) * spawnArea * 0.5;
                const y = getHeightFn(x, z);
                const r = Math.random();
                if (r < 0.25) new Deer(x, y, z);
                else if (r < 0.45) new Fox(x, y, z);
                else if (r < 0.7) new Sheep(x, y, z);
                else new Rabbit(x, y, z);
            }
            
            // Flying creatures
            for (let i = 0; i < 40; i++) {
                const x = (Math.random() - 0.5) * spawnArea * 0.6;
                const z = (Math.random() - 0.5) * spawnArea * 0.6;
                new Butterfly(x, getHeightFn(x, z), z);
            }
            
            for (let i = 0; i < 25; i++) {
                const x = (Math.random() - 0.5) * spawnArea * 0.8;
                const z = (Math.random() - 0.5) * spawnArea * 0.8;
                new Bird(x, getHeightFn(x, z), z);
            }
            
            console.log("Spawned " + _creatures.length + " ground creatures, " + _flyingCreatures.length + " flying creatures");
        },
        
        // Spawn specific creature type
        spawnCreature(CreatureClass, count, getHeightFn) {
            const { spawnArea, getSlope, getBaseHeight } = _deps;
            
            for (let i = 0; i < count; i++) {
                for (let attempt = 0; attempt < 30; attempt++) {
                    const x = (Math.random() - 0.5) * spawnArea * 0.8;
                    const z = (Math.random() - 0.5) * spawnArea * 0.8;
                    const slope = getSlope ? getSlope(x, z) : 0;
                    const height = getBaseHeight ? getBaseHeight(x, z) : 0;
                    
                    if (slope < 0.5 && height < 100 && height > -30) {
                        new CreatureClass(x, getHeightFn(x, z), z);
                        break;
                    }
                }
            }
        }
    };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// CREATURE BASE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class Creature {
    constructor(x, y, z, type) {
        this.type = type;
        this.posX = x;
        this.posZ = z;
        this.group = new THREE.Group();
        this.target = new THREE.Vector3(x, y, z);
        this.state = 'idle';
        this.stateTimer = Math.random() * 5;
        this.speed = 1.5;
        this.animTime = Math.random() * Math.PI * 2;
        this.isAlive = true;
        
        // Health system for hunting/killing
        this.maxHealth = 30;
        this.health = this.maxHealth;
        
        this.buildBody();
        this.group.position.set(x, y, z);
        
        if (_deps.scene) _deps.scene.add(this.group);
        CreatureSystem.addCreature(this);
    }
    
    buildBody() {
        // Override in subclasses
    }
    
    takeDamage(amount) {
        if (!this.isAlive) return;
        
        this.health -= amount;
        
        // Flash red
        this.group.traverse(child => {
            if (child.material) {
                child.material.emissive = new THREE.Color(0xff0000);
                setTimeout(() => {
                    if (child.material) child.material.emissive = new THREE.Color(0x000000);
                }, 100);
            }
        });
        
        // Flee when hit
        this.state = 'flee';
        this.stateTimer = 3;
        const angle = Math.random() * Math.PI * 2;
        this.target.set(
            this.group.position.x + Math.cos(angle) * 20,
            0,
            this.group.position.z + Math.sin(angle) * 20
        );
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    die() {
        this.isAlive = false;
        
        const { scene, ParticleSystem, inventory, updateQuestProgress, discoverEntry, showTransaction } = _deps;

        // Particles
        if (ParticleSystem) ParticleSystem.spawnImpact(this.group.position.clone(), 'creature');
        
        // Drop loot
        const lootTable = ['leather', 'fiber'];
        const loot = lootTable[Math.floor(Math.random() * lootTable.length)];
        if (inventory) inventory.add(loot, 1 + Math.floor(Math.random() * 2));
        
        // Update quest progress for kill objectives
        if (updateQuestProgress) updateQuestProgress('kill', { target: this.type });
        
        // Discover fauna
        if (discoverEntry) discoverEntry('fauna', this.type);
        
        // Remove from scene and system
        if (scene) scene.remove(this.group);
        CreatureSystem.removeCreature(this);
        
        if (showTransaction) showTransaction(`Hunted ${this.type}!`, 'buy');
    }
    
    update(delta, playerPos) {
        if (!this.isAlive || !this.group.visible) return;
        
        const { getHeight, spawnArea, CONFIG } = _deps;
        
        this.animTime += delta * 8;
        this.stateTimer -= delta;
        
        // State machine
        if (this.stateTimer <= 0) {
            const r = Math.random();
            if (r < 0.4) {
                this.state = 'idle';
                this.stateTimer = 2 + Math.random() * 4;
            } else if (r < 0.85) {
                this.state = 'wander';
                this.pickWanderTarget();
                this.stateTimer = 3 + Math.random() * 5;
            } else {
                this.state = 'graze';
                this.stateTimer = 2 + Math.random() * 3;
            }
        }
        
        // Flee from player if close
        const dx = playerPos.x - this.group.position.x;
        const dz = playerPos.z - this.group.position.z;
        const distToPlayer = Math.sqrt(dx * dx + dz * dz);
        
        if (distToPlayer < 8) {
            this.state = 'flee';
            this.stateTimer = 2;
            this.target.set(
                this.group.position.x - dx * 3,
                0,
                this.group.position.z - dz * 3
            );
        }
        
        // Movement
        if (this.state === 'wander' || this.state === 'flee') {
            const tdx = this.target.x - this.group.position.x;
            const tdz = this.target.z - this.group.position.z;
            const dist = Math.sqrt(tdx * tdx + tdz * tdz);
            
            if (dist > 0.5) {
                const spd = this.state === 'flee' ? this.speed * 2.5 : this.speed;
                this.group.position.x += (tdx / dist) * spd * delta;
                this.group.position.z += (tdz / dist) * spd * delta;
                if (getHeight) this.group.position.y = getHeight(this.group.position.x, this.group.position.z);
                this.group.rotation.y = Math.atan2(tdx, tdz);
                
                // Leg animation
                if (this.legs) {
                    const legSwing = Math.sin(this.animTime) * 0.4;
                    if (this.legs[0]) this.legs[0].rotation.x = legSwing;
                    if (this.legs[1]) this.legs[1].rotation.x = -legSwing;
                    if (this.legs[2]) this.legs[2].rotation.x = -legSwing;
                    if (this.legs[3]) this.legs[3].rotation.x = legSwing;
                }
            } else if (this.state === 'wander') {
                this.state = 'idle';
                this.stateTimer = 1 + Math.random() * 2;
            }
        }
        
        // Idle animation
        if (this.state === 'idle' || this.state === 'graze') {
            if (this.head) {
                this.head.rotation.x = this.state === 'graze' ? 0.4 : Math.sin(this.animTime * 0.3) * 0.1;
                this.head.rotation.y = Math.sin(this.animTime * 0.2) * 0.15;
            }
            // Reset legs
            if (this.legs) {
                this.legs.forEach(leg => { if (leg) leg.rotation.x *= 0.9; });
            }
        }
        
        this.posX = this.group.position.x;
        this.posZ = this.group.position.z;
    }
    
    pickWanderTarget() {
        const { spawnArea } = _deps;
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 15;
        this.target.set(
            this.group.position.x + Math.cos(angle) * dist,
            0,
            this.group.position.z + Math.sin(angle) * dist
        );
        // Keep in bounds
        const maxDist = spawnArea * 0.45;
        if (Math.abs(this.target.x) > maxDist) this.target.x = Math.sign(this.target.x) * maxDist;
        if (Math.abs(this.target.z) > maxDist) this.target.z = Math.sign(this.target.z) * maxDist;
    }
    
    updateVis(px, pz) {
        const { CONFIG } = _deps;
        const culling = CONFIG ? CONFIG.creatureCulling : 150;
        const dx = this.posX - px, dz = this.posZ - pz;
        this.group.visible = dx * dx + dz * dz < culling * culling;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATURE SUBCLASSES
// ═══════════════════════════════════════════════════════════════════════════════

class Deer extends Creature {
    constructor(x, y, z) {
        super(x, y, z, 'deer');
        this.speed = 2.5;
    }
    
    buildBody() {
        const mats = CreatureSystem.getMaterials();
        const geom = _deps.sharedGeom;
        if (!geom) return;
        
        this.legs = [];
        
        // Body
        const body = new THREE.Mesh(geom.sphere1, mats.deer);
        body.scale.set(0.5, 0.4, 0.8);
        body.position.y = 0.7;
        this.group.add(body);
        
        // Neck
        const neck = new THREE.Mesh(geom.cylinder1, mats.deer);
        neck.scale.set(0.12, 0.4, 0.12);
        neck.position.set(0, 1.0, 0.4);
        neck.rotation.x = -0.5;
        this.group.add(neck);
        
        // Head
        this.head = new THREE.Group();
        const headMesh = new THREE.Mesh(geom.sphere2, mats.deer);
        headMesh.scale.set(0.18, 0.15, 0.22);
        this.head.add(headMesh);
        
        // Snout
        const snout = new THREE.Mesh(geom.sphere2, mats.deerLight);
        snout.scale.set(0.08, 0.07, 0.1);
        snout.position.set(0, -0.03, 0.15);
        this.head.add(snout);
        
        // Ears
        for (let i = -1; i <= 1; i += 2) {
            const ear = new THREE.Mesh(geom.sphere2, mats.deer);
            ear.scale.set(0.06, 0.12, 0.03);
            ear.position.set(i * 0.12, 0.1, -0.05);
            this.head.add(ear);
        }
        
        // Antlers
        for (let i = -1; i <= 1; i += 2) {
            const antler = new THREE.Mesh(geom.cylinder1, mats.deerLight);
            antler.scale.set(0.02, 0.2, 0.02);
            antler.position.set(i * 0.1, 0.2, -0.05);
            antler.rotation.z = i * 0.3;
            this.head.add(antler);
        }
        
        this.head.position.set(0, 1.3, 0.6);
        this.group.add(this.head);
        
        // Legs
        const legPositions = [[0.2, 0, 0.35], [-0.2, 0, 0.35], [0.2, 0, -0.35], [-0.2, 0, -0.35]];
        for (const [lx, ly, lz] of legPositions) {
            const leg = new THREE.Mesh(geom.cylinder1, mats.deer);
            leg.scale.set(0.06, 0.5, 0.06);
            leg.position.set(lx, 0.25, lz);
            this.group.add(leg);
            this.legs.push(leg);
        }
        
        // Tail
        const tail = new THREE.Mesh(geom.sphere2, mats.deerLight);
        tail.scale.set(0.08, 0.08, 0.05);
        tail.position.set(0, 0.8, -0.45);
        this.group.add(tail);
    }
}

class Fox extends Creature {
    constructor(x, y, z) {
        super(x, y, z, 'fox');
        this.speed = 3;
    }
    
    buildBody() {
        const mats = CreatureSystem.getMaterials();
        const geom = _deps.sharedGeom;
        if (!geom) return;
        
        this.legs = [];
        
        // Body
        const body = new THREE.Mesh(geom.sphere1, mats.fox);
        body.scale.set(0.25, 0.2, 0.4);
        body.position.y = 0.3;
        this.group.add(body);
        
        // Head
        this.head = new THREE.Group();
        const headMesh = new THREE.Mesh(geom.sphere2, mats.fox);
        headMesh.scale.set(0.15, 0.12, 0.18);
        this.head.add(headMesh);
        
        // Snout
        const snout = new THREE.Mesh(geom.sphere2, mats.foxWhite);
        snout.scale.set(0.06, 0.05, 0.12);
        snout.position.set(0, -0.02, 0.12);
        this.head.add(snout);
        
        // Ears
        for (let i = -1; i <= 1; i += 2) {
            const ear = new THREE.Mesh(geom.sphere2, mats.fox);
            ear.scale.set(0.05, 0.1, 0.03);
            ear.position.set(i * 0.08, 0.1, 0);
            this.head.add(ear);
        }
        
        this.head.position.set(0, 0.45, 0.3);
        this.group.add(this.head);
        
        // Legs
        const legPositions = [[0.1, 0, 0.15], [-0.1, 0, 0.15], [0.1, 0, -0.15], [-0.1, 0, -0.15]];
        for (const [lx, ly, lz] of legPositions) {
            const leg = new THREE.Mesh(geom.cylinder1, mats.fox);
            leg.scale.set(0.04, 0.2, 0.04);
            leg.position.set(lx, 0.1, lz);
            this.group.add(leg);
            this.legs.push(leg);
        }
        
        // Fluffy tail
        const tail = new THREE.Mesh(geom.sphere1, mats.fox);
        tail.scale.set(0.1, 0.1, 0.25);
        tail.position.set(0, 0.35, -0.45);
        tail.rotation.x = -0.3;
        this.group.add(tail);
        
        const tailTip = new THREE.Mesh(geom.sphere2, mats.foxWhite);
        tailTip.scale.set(0.07, 0.07, 0.1);
        tailTip.position.set(0, 0.32, -0.6);
        this.group.add(tailTip);
    }
}

class Sheep extends Creature {
    constructor(x, y, z) {
        super(x, y, z, 'sheep');
        this.speed = 1.2;
    }
    
    buildBody() {
        const mats = CreatureSystem.getMaterials();
        const geom = _deps.sharedGeom;
        if (!geom) return;
        
        this.legs = [];
        
        // Fluffy body
        const body = new THREE.Mesh(geom.sphere1, mats.sheep);
        body.scale.set(0.45, 0.4, 0.5);
        body.position.y = 0.5;
        this.group.add(body);
        
        // Extra fluff
        for (let i = 0; i < 5; i++) {
            const fluff = new THREE.Mesh(geom.sphere2, mats.sheep);
            const angle = (i / 5) * Math.PI * 2;
            fluff.scale.set(0.15, 0.12, 0.15);
            fluff.position.set(Math.cos(angle) * 0.3, 0.55, Math.sin(angle) * 0.35);
            this.group.add(fluff);
        }
        
        // Head
        this.head = new THREE.Group();
        const headMesh = new THREE.Mesh(geom.sphere2, mats.sheepFace);
        headMesh.scale.set(0.12, 0.12, 0.15);
        this.head.add(headMesh);
        
        // Ears
        for (let i = -1; i <= 1; i += 2) {
            const ear = new THREE.Mesh(geom.sphere2, mats.sheepFace);
            ear.scale.set(0.08, 0.04, 0.03);
            ear.position.set(i * 0.12, 0, 0);
            this.head.add(ear);
        }
        
        this.head.position.set(0, 0.6, 0.45);
        this.group.add(this.head);
        
        // Legs
        const legPositions = [[0.15, 0, 0.2], [-0.15, 0, 0.2], [0.15, 0, -0.2], [-0.15, 0, -0.2]];
        for (const [lx, ly, lz] of legPositions) {
            const leg = new THREE.Mesh(geom.cylinder1, mats.sheepFace);
            leg.scale.set(0.05, 0.3, 0.05);
            leg.position.set(lx, 0.15, lz);
            this.group.add(leg);
            this.legs.push(leg);
        }
    }
}

class Rabbit extends Creature {
    constructor(x, y, z) {
        super(x, y, z, 'rabbit');
        this.speed = 4;
    }
    
    buildBody() {
        const mats = CreatureSystem.getMaterials();
        const geom = _deps.sharedGeom;
        if (!geom) return;
        
        this.legs = [];
        
        // Body
        const body = new THREE.Mesh(geom.sphere1, mats.rabbit);
        body.scale.set(0.12, 0.1, 0.15);
        body.position.y = 0.12;
        this.group.add(body);
        
        // Head
        this.head = new THREE.Group();
        const headMesh = new THREE.Mesh(geom.sphere2, mats.rabbit);
        headMesh.scale.set(0.08, 0.07, 0.09);
        this.head.add(headMesh);
        
        // Ears (long)
        for (let i = -1; i <= 1; i += 2) {
            const ear = new THREE.Mesh(geom.sphere2, mats.rabbit);
            ear.scale.set(0.025, 0.1, 0.015);
            ear.position.set(i * 0.04, 0.1, -0.02);
            this.head.add(ear);
            
            const earInner = new THREE.Mesh(geom.sphere2, mats.rabbitWhite);
            earInner.scale.set(0.015, 0.07, 0.01);
            earInner.position.set(i * 0.04, 0.1, -0.015);
            this.head.add(earInner);
        }
        
        this.head.position.set(0, 0.2, 0.1);
        this.group.add(this.head);
        
        // Front legs
        const frontLeg = new THREE.Mesh(geom.sphere2, mats.rabbit);
        frontLeg.scale.set(0.03, 0.06, 0.03);
        frontLeg.position.set(0.05, 0.03, 0.08);
        this.group.add(frontLeg);
        this.legs.push(frontLeg);
        
        const frontLeg2 = new THREE.Mesh(geom.sphere2, mats.rabbit);
        frontLeg2.scale.set(0.03, 0.06, 0.03);
        frontLeg2.position.set(-0.05, 0.03, 0.08);
        this.group.add(frontLeg2);
        this.legs.push(frontLeg2);
        
        // Back legs (bigger)
        const backLeg = new THREE.Mesh(geom.sphere2, mats.rabbit);
        backLeg.scale.set(0.04, 0.08, 0.05);
        backLeg.position.set(0.06, 0.04, -0.08);
        this.group.add(backLeg);
        this.legs.push(backLeg);
        
        const backLeg2 = new THREE.Mesh(geom.sphere2, mats.rabbit);
        backLeg2.scale.set(0.04, 0.08, 0.05);
        backLeg2.position.set(-0.06, 0.04, -0.08);
        this.group.add(backLeg2);
        this.legs.push(backLeg2);
        
        // Fluffy tail
        const tail = new THREE.Mesh(geom.sphere2, mats.rabbitWhite);
        tail.scale.set(0.04, 0.04, 0.04);
        tail.position.set(0, 0.12, -0.12);
        this.group.add(tail);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLYING CREATURES
// ═══════════════════════════════════════════════════════════════════════════════

class Butterfly {
    constructor(x, y, z) {
        this.posX = x;
        this.posZ = z;
        this.group = new THREE.Group();
        this.baseY = y + 1 + Math.random() * 3;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 0.3 + Math.random() * 0.3;
        this.target = new THREE.Vector3(x, this.baseY, z);
        this.wingAngle = 0;
        
        // Body
        const color = butterflyColors[Math.floor(Math.random() * butterflyColors.length)];
        const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
        
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.02, 0.1, 4),
            new THREE.MeshLambertMaterial({ color: 0x222222 })
        );
        body.rotation.x = Math.PI / 2;
        this.group.add(body);
        
        // Wings
        this.leftWing = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), mat);
        this.leftWing.position.set(-0.04, 0, 0);
        this.group.add(this.leftWing);
        
        this.rightWing = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), mat);
        this.rightWing.position.set(0.04, 0, 0);
        this.group.add(this.rightWing);
        
        this.group.position.set(x, this.baseY, z);
        if (_deps.scene) _deps.scene.add(this.group);
        CreatureSystem.addFlyingCreature(this);
    }
    
    update(delta, time, playerPos) {
        if (!this.group.visible) return;
        
        // Fluttering wings
        this.wingAngle = Math.sin(time * 20 + this.phase) * 0.8;
        this.leftWing.rotation.y = this.wingAngle;
        this.rightWing.rotation.y = -this.wingAngle;
        
        // Movement - erratic flutter
        const dx = this.target.x - this.group.position.x;
        const dz = this.target.z - this.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 0.5 || Math.random() < 0.02) {
            // Pick new target nearby
            this.target.set(
                this.group.position.x + (Math.random() - 0.5) * 8,
                this.baseY + Math.sin(time + this.phase) * 2,
                this.group.position.z + (Math.random() - 0.5) * 8
            );
        }
        
        this.group.position.x += dx * this.speed * delta;
        this.group.position.z += dz * this.speed * delta;
        this.group.position.y = this.baseY + Math.sin(time * 2 + this.phase) * 0.5;
        this.group.rotation.y = Math.atan2(dx, dz);
        
        // Flee from player
        const pdx = playerPos.x - this.group.position.x;
        const pdz = playerPos.z - this.group.position.z;
        if (pdx * pdx + pdz * pdz < 9) {
            this.group.position.x -= pdx * 0.1;
            this.group.position.z -= pdz * 0.1;
        }
        
        this.posX = this.group.position.x;
        this.posZ = this.group.position.z;
    }
    
    updateVis(px, pz) {
        const dx = this.posX - px, dz = this.posZ - pz;
        this.group.visible = dx * dx + dz * dz < 60 * 60;
    }
}

class Bird {
    constructor(x, y, z) {
        this.posX = x;
        this.posZ = z;
        this.group = new THREE.Group();
        this.baseY = y + 8 + Math.random() * 15;
        this.phase = Math.random() * Math.PI * 2;
        this.speed = 3 + Math.random() * 2;
        this.circleRadius = 10 + Math.random() * 20;
        this.circleCenter = new THREE.Vector3(x, this.baseY, z);
        this.angle = Math.random() * Math.PI * 2;
        this.wingAngle = 0;
        this.soaring = Math.random() > 0.5;
        
        const color = birdColors[Math.floor(Math.random() * birdColors.length)];
        const mat = new THREE.MeshLambertMaterial({ color });
        
        // Body
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 4), mat);
        body.rotation.x = Math.PI / 2;
        this.group.add(body);
        
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 4, 4), mat);
        head.position.z = -0.18;
        this.group.add(head);
        
        // Beak
        const beak = new THREE.Mesh(
            new THREE.ConeGeometry(0.02, 0.06, 3),
            new THREE.MeshLambertMaterial({ color: 0xffa500 })
        );
        beak.rotation.x = -Math.PI / 2;
        beak.position.z = -0.26;
        this.group.add(beak);
        
        // Wings
        const wingGeo = new THREE.PlaneGeometry(0.25, 0.1);
        this.leftWing = new THREE.Mesh(wingGeo, mat);
        this.leftWing.position.set(-0.12, 0.02, 0);
        this.leftWing.rotation.z = 0.3;
        this.group.add(this.leftWing);
        
        this.rightWing = new THREE.Mesh(wingGeo, mat);
        this.rightWing.position.set(0.12, 0.02, 0);
        this.rightWing.rotation.z = -0.3;
        this.group.add(this.rightWing);
        
        // Tail
        const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), mat);
        tail.position.z = 0.18;
        tail.rotation.x = 0.3;
        this.group.add(tail);
        
        this.group.position.set(x, this.baseY, z);
        if (_deps.scene) _deps.scene.add(this.group);
        CreatureSystem.addFlyingCreature(this);
    }
    
    update(delta, time, playerPos) {
        if (!this.group.visible) return;
        
        // Wing flapping (faster when not soaring)
        const flapSpeed = this.soaring ? 3 : 12;
        this.wingAngle = Math.sin(time * flapSpeed + this.phase) * (this.soaring ? 0.15 : 0.5);
        this.leftWing.rotation.z = 0.3 + this.wingAngle;
        this.rightWing.rotation.z = -0.3 - this.wingAngle;
        
        // Circular flight pattern
        this.angle += this.speed * delta * 0.1;
        
        // Occasionally change behavior
        if (Math.random() < 0.005) {
            this.soaring = !this.soaring;
            if (Math.random() < 0.3) {
                this.circleCenter.set(
                    this.group.position.x + (Math.random() - 0.5) * 50,
                    this.baseY + (Math.random() - 0.5) * 5,
                    this.group.position.z + (Math.random() - 0.5) * 50
                );
            }
        }
        
        const targetX = this.circleCenter.x + Math.cos(this.angle) * this.circleRadius;
        const targetZ = this.circleCenter.z + Math.sin(this.angle) * this.circleRadius;
        const targetY = this.baseY + Math.sin(time * 0.5 + this.phase) * 3;
        
        // Smooth movement toward target
        this.group.position.x += (targetX - this.group.position.x) * delta * 2;
        this.group.position.z += (targetZ - this.group.position.z) * delta * 2;
        this.group.position.y += (targetY - this.group.position.y) * delta;
        
        // Face direction of movement
        this.group.rotation.y = this.angle + Math.PI / 2;
        this.group.rotation.z = Math.sin(this.angle) * 0.2; // Banking
        
        this.posX = this.group.position.x;
        this.posZ = this.group.position.z;
    }
    
    updateVis(px, pz) {
        const dx = this.posX - px, dz = this.posZ - pz;
        this.group.visible = dx * dx + dz * dz < 100 * 100;
    }
}

// Backward compatibility exports
const creatures = CreatureSystem.getCreatures();
const flyingCreatures = CreatureSystem.getFlyingCreatures();
const creatureMats = CreatureSystem.getMaterials();

export { 
    CreatureSystem,
    Creature,
    Deer,
    Fox,
    Sheep,
    Rabbit,
    Butterfly,
    Bird,
    creatures,
    flyingCreatures,
    creatureMats
};
export default CreatureSystem;
