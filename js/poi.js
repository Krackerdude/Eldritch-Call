// ═══════════════════════════════════════════════════════════════════════════════
// POI.JS - Points of Interest, Structures, and Procedural Dungeons
// Dependencies: THREE.js
// Injected: scene, getHeight, inventory, characterStats, enterInterior
// Consumers: World generation, player interaction, interior system
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null,
    getHeight: (x, z) => 0,
    inventory: null,
    characterStats: null,
    enterInterior: null,
    showMaterialNotif: null
};

// POI list (populated when POIs are created)
const poiList = [];

// ═══════════════════════════════════════════════════════════════════════════════
// POI TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const POI_TYPES = {
    mineshaft: { 
        name: 'Abandoned Mineshaft', 
        subtitle: 'Descending into darkness...', 
        interactionRadius: 8, 
        hasInterior: true, 
        interiorType: 'mine' 
    },
    cabin: { 
        name: 'Old Cabin', 
        subtitle: 'A weathered shelter', 
        interactionRadius: 6, 
        hasInterior: true, 
        interiorType: 'cabin' 
    },
    shrine: { 
        name: 'Ancient Shrine', 
        subtitle: 'A place of power', 
        interactionRadius: 5, 
        hasInterior: false, 
        effect: 'restore' 
    },
    cave: { 
        name: 'Cave Entrance', 
        subtitle: 'Echoes from within...', 
        interactionRadius: 7, 
        hasInterior: true, 
        interiorType: 'cave' 
    },
    ruins: { 
        name: 'Forgotten Ruins', 
        subtitle: 'Remnants of the old world', 
        interactionRadius: 10, 
        hasInterior: true, 
        interiorType: 'ruins' 
    },
    watchtower: { 
        name: 'Watchtower', 
        subtitle: 'A vantage point', 
        interactionRadius: 6, 
        hasInterior: true, 
        interiorType: 'tower' 
    },
    well: { 
        name: 'Old Well', 
        subtitle: 'Something glimmers below...', 
        interactionRadius: 4, 
        hasInterior: false, 
        effect: 'loot' 
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POI CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class POI {
    constructor(type, x, z) {
        this.type = type;
        this.config = POI_TYPES[type];
        this.x = x;
        this.z = z;
        this.y = _deps.getHeight(x, z);
        this.group = new THREE.Group();
        this.interactable = true;
        this.visited = false;
        
        this.createStructure();
        this.group.position.set(x, this.y, z);
        
        if (_deps.scene) {
            _deps.scene.add(this.group);
        }
        poiList.push(this);
    }
    
    createStructure() {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.9 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const metalMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.4 });
        
        if (this.type === 'mineshaft') {
            // Frame
            const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.8), woodMat);
            leftPost.position.set(-2.5, 2.5, 0);
            leftPost.castShadow = false;
            this.group.add(leftPost);
            
            const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.8), woodMat);
            rightPost.position.set(2.5, 2.5, 0);
            rightPost.castShadow = false;
            this.group.add(rightPost);
            
            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.6, 0.8), woodMat);
            topBeam.position.set(0, 5.2, 0);
            this.group.add(topBeam);
            
            // Entrance
            const hole = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.5, 3), darkMat);
            hole.position.set(0, 2, 1);
            this.group.add(hole);
            
            // Rails
            const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 8), metalMat);
            leftRail.position.set(-0.8, 0.05, -2);
            this.group.add(leftRail);
            
            const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 8), metalMat);
            rightRail.position.set(0.8, 0.05, -2);
            this.group.add(rightRail);
            
            for (let i = 0; i < 8; i++) {
                const tie = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.4), woodMat);
                tie.position.set(0, 0.02, -5 + i * 1.2);
                this.group.add(tie);
            }
            
            // Lantern
            const lanternLight = new THREE.PointLight(0xffaa33, 0.8, 10);
            lanternLight.position.set(-2.3, 4, 0.5);
            this.group.add(lanternLight);
        }
        else if (this.type === 'cabin') {
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
            const walls = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6), woodMat);
            walls.position.y = 2;
            walls.castShadow = false;
            this.group.add(walls);
            
            const roof = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), roofMat);
            roof.position.y = 5.5;
            roof.rotation.y = Math.PI / 4;
            this.group.add(roof);
            
            const door = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 2.8, 0.2), 
                new THREE.MeshStandardMaterial({ color: 0x3d2817 })
            );
            door.position.set(0, 1.4, 3.1);
            this.group.add(door);
            
            const light = new THREE.PointLight(0xffcc88, 0.6, 15);
            light.position.set(0, 2, 0);
            this.group.add(light);
        }
        else if (this.type === 'shrine') {
            const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
            const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.5, 8), stoneMat);
            base.position.y = 0.25;
            this.group.add(base);
            
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 6), stoneMat);
                pillar.position.set(Math.cos(angle) * 2, 2, Math.sin(angle) * 2);
                this.group.add(pillar);
            }
            
            const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), glowMat);
            orb.position.y = 2;
            this.group.add(orb);
            this.glowOrb = orb;
            
            const light = new THREE.PointLight(0x00ffaa, 1, 15);
            light.position.y = 2;
            this.group.add(light);
            this.shrineLight = light;
        }
        else if (this.type === 'cave') {
            for (let i = 0; i < 8; i++) {
                const size = 1.5 + Math.random() * 2;
                const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), stoneMat);
                const angle = (i / 8) * Math.PI - Math.PI / 2;
                rock.position.set(Math.cos(angle) * (4 + Math.random()), size * 0.3, Math.sin(angle) * 2);
                rock.rotation.set(Math.random(), Math.random(), Math.random());
                this.group.add(rock);
            }
            
            const caveHole = new THREE.Mesh(
                new THREE.SphereGeometry(3, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), 
                darkMat
            );
            caveHole.rotation.x = Math.PI / 2;
            caveHole.position.set(0, 1.5, 2);
            this.group.add(caveHole);
        }
        else if (this.type === 'ruins') {
            for (let i = 0; i < 4; i++) {
                const height = 2 + Math.random() * 4;
                const wall = new THREE.Mesh(
                    new THREE.BoxGeometry(4 + Math.random() * 2, height, 0.8), 
                    stoneMat
                );
                const angle = (i / 4) * Math.PI * 2;
                wall.position.set(Math.cos(angle) * 6, height / 2, Math.sin(angle) * 6);
                wall.rotation.y = angle + Math.PI / 2;
                this.group.add(wall);
            }
            
            const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 8), stoneMat);
            floor.position.y = 0.15;
            this.group.add(floor);
        }
        else if (this.type === 'watchtower') {
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 12, 8), woodMat);
            tower.position.y = 6;
            tower.castShadow = false;
            this.group.add(tower);
            
            const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.5, 8), woodMat);
            platform.position.y = 12.25;
            this.group.add(platform);
            
            const roof = new THREE.Mesh(new THREE.ConeGeometry(4, 3, 8), roofMat);
            roof.position.y = 14;
            this.group.add(roof);
            
            const light = new THREE.PointLight(0xffaa44, 0.8, 12);
            light.position.set(3.5, 2, 0);
            this.group.add(light);
        }
        else if (this.type === 'well') {
            const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 1.2, 12), stoneMat);
            base.position.y = 0.6;
            this.group.add(base);
            
            const hole = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 1.3, 12), darkMat);
            hole.position.y = 0.6;
            this.group.add(hole);
            
            for (let i = 0; i < 2; i++) {
                const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 0.3), woodMat);
                post.position.set(i === 0 ? -1.5 : 1.5, 2, 0);
                this.group.add(post);
            }
            
            const beam = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 0.3), woodMat);
            beam.position.y = 3.7;
            this.group.add(beam);
        }
    }
    
    update(time) {
        if (this.type === 'shrine' && this.glowOrb) {
            this.glowOrb.position.y = 2 + Math.sin(time * 2) * 0.2;
            this.shrineLight.intensity = 0.8 + Math.sin(time * 3) * 0.3;
        }
    }
    
    getDistance(px, pz) {
        const dx = this.x - px;
        const dz = this.z - pz;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    interact() {
        if (!this.interactable) return;
        
        if (this.config.hasInterior && _deps.enterInterior) {
            _deps.enterInterior(this);
        }
        else if (this.config.effect === 'restore') {
            if (_deps.characterStats) {
                _deps.characterStats.combat.hp = _deps.characterStats.combat.maxHp;
                _deps.characterStats.combat.mp = _deps.characterStats.combat.maxMp;
            }
            if (_deps.showMaterialNotif) {
                _deps.showMaterialNotif('heal', 'Restored!', 1);
            }
            this.interactable = false;
            setTimeout(() => { this.interactable = true; }, 30000);
        }
        else if (this.config.effect === 'loot' && _deps.inventory) {
            const loot = ['iron', 'coal', 'stone'][Math.floor(Math.random() * 3)];
            _deps.inventory.add(loot, 1 + Math.floor(Math.random() * 3));
            this.interactable = false;
            setTimeout(() => { this.interactable = true; }, 60000);
        }
        
        this.visited = true;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUNGEON CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DUNGEON_CONFIG = {
    mine: {
        name: 'Abandoned Mineshaft',
        roomCount: { min: 12, max: 20 },
        hallwayLength: { min: 15, max: 35 },
        roomSize: { min: 12, max: 25 },
        ceilingHeight: { min: 6, max: 10 },
        floorColor: 0x3a2a1a,
        wallColor: 0x2d2418,
        accentColor: 0x5a4a3a,
        ambientColor: 0x221100,
        ambientIntensity: 0.15,
        features: ['rails', 'carts', 'supports', 'oreVeins', 'crystals', 'lanterns'],
        enemies: ['bat', 'spider', 'skeleton'],
        bossName: 'Mine Golem'
    },
    cave: {
        name: 'Ancient Caverns',
        roomCount: { min: 15, max: 25 },
        hallwayLength: { min: 20, max: 45 },
        roomSize: { min: 18, max: 35 },
        ceilingHeight: { min: 8, max: 18 },
        floorColor: 0x2a2a3a,
        wallColor: 0x1a1a2a,
        accentColor: 0x3a3a4a,
        ambientColor: 0x112233,
        ambientIntensity: 0.12,
        features: ['stalactites', 'stalagmites', 'pools', 'mushrooms', 'crystals', 'bioluminescence'],
        enemies: ['bat', 'spider', 'slime', 'caveFish'],
        bossName: 'Crystal Wyrm'
    },
    ruins: {
        name: 'Forgotten Ruins',
        roomCount: { min: 10, max: 18 },
        hallwayLength: { min: 12, max: 30 },
        roomSize: { min: 15, max: 30 },
        ceilingHeight: { min: 8, max: 14 },
        floorColor: 0x4a4a3a,
        wallColor: 0x3a3a2a,
        accentColor: 0x6a6a5a,
        ambientColor: 0x221100,
        ambientIntensity: 0.18,
        features: ['pillars', 'altars', 'statues', 'runes', 'torches', 'debris'],
        enemies: ['skeleton', 'ghost', 'golem'],
        bossName: 'Ancient Guardian'
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROCEDURAL DUNGEON CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ProceduralDungeon {
    constructor(type) {
        this.type = type;
        this.config = DUNGEON_CONFIG[type] || DUNGEON_CONFIG.cave;
        this.group = new THREE.Group();
        this.rooms = [];
        this.hallways = [];
        this.grid = new Map();
        this.cellSize = 10;
        this.entranceRoom = null;
        this.bossRoom = null;
        this.exitDoor = null;
        this.materials = this.createMaterials();
        
        this.generate();
    }
    
    createMaterials() {
        return {
            floor: new THREE.MeshStandardMaterial({ color: this.config.floorColor, roughness: 0.95 }),
            wall: new THREE.MeshStandardMaterial({ color: this.config.wallColor, roughness: 0.98 }),
            ceiling: new THREE.MeshStandardMaterial({ color: this.config.wallColor, roughness: 0.95 }),
            accent: new THREE.MeshStandardMaterial({ color: this.config.accentColor, roughness: 0.85 }),
            stone: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 }),
            wood: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }),
            metal: new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.6, metalness: 0.4 }),
            crystal: new THREE.MeshStandardMaterial({ 
                color: this.type === 'mine' ? 0x4488aa : 0x44aaff, 
                emissive: this.type === 'mine' ? 0x224466 : 0x2266aa, 
                emissiveIntensity: 0.5, 
                roughness: 0.2 
            }),
            gold: new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.3, metalness: 0.8 }),
            glow: new THREE.MeshBasicMaterial({ color: 0xffaa00 }),
            moss: new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.95 }),
            water: new THREE.MeshStandardMaterial({ color: 0x1a3a5a, transparent: true, opacity: 0.7, roughness: 0.1 })
        };
    }
    
    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    randFloat(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    getRandomDirection() {
        const dirs = ['north', 'south', 'east', 'west'];
        return dirs[Math.floor(Math.random() * dirs.length)];
    }
    
    oppositeDirection(dir) {
        return { north: 'south', south: 'north', east: 'west', west: 'east' }[dir];
    }
    
    generate() {
        // Sky dome
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.BackSide });
        const sky = new THREE.Mesh(new THREE.SphereGeometry(800, 16, 16), skyMat);
        this.group.add(sky);
        
        // Ambient light
        const ambient = new THREE.AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
        this.group.add(ambient);
        
        // Generate dungeon layout
        const roomCount = this.randInt(this.config.roomCount.min, this.config.roomCount.max);
        
        // Create entrance room
        this.entranceRoom = this.createRoom(0, 0, 'entrance');
        this.rooms.push(this.entranceRoom);
        this.markOccupied(0, 0, this.entranceRoom.gridWidth, this.entranceRoom.gridHeight);
        
        // Generate branching paths
        let attempts = 0;
        const maxAttempts = roomCount * 10;
        
        while (this.rooms.length < roomCount && attempts < maxAttempts) {
            attempts++;
            const sourceRoom = this.rooms[Math.floor(Math.random() * this.rooms.length)];
            const direction = this.getRandomDirection();
            const result = this.tryCreateBranch(sourceRoom, direction);
            if (result) {
                this.hallways.push(result.hallway);
                this.rooms.push(result.room);
            }
        }
        
        this.createBossRoom();
        this.buildGeometry();
        this.addThemeFeatures();
        
        // Set exit position
        this.group.exitPosition = new THREE.Vector3(
            this.entranceRoom.worldX,
            0,
            this.entranceRoom.worldZ + this.entranceRoom.depth / 2 - 2
        );
        
        // Add entrance door marker
        const exitLight = new THREE.PointLight(0x44ff44, 2, 20);
        exitLight.position.set(
            this.entranceRoom.worldX,
            2,
            this.entranceRoom.worldZ + this.entranceRoom.depth / 2 - 3
        );
        this.group.add(exitLight);
    }
    
    createRoom(gridX, gridZ, roomType = 'normal') {
        const width = this.randInt(this.config.roomSize.min, this.config.roomSize.max);
        const depth = this.randInt(this.config.roomSize.min, this.config.roomSize.max);
        const height = this.randFloat(this.config.ceilingHeight.min, this.config.ceilingHeight.max);
        
        return {
            gridX,
            gridZ,
            gridWidth: Math.ceil(width / this.cellSize),
            gridHeight: Math.ceil(depth / this.cellSize),
            width,
            depth,
            height,
            worldX: gridX * this.cellSize * 3,
            worldZ: gridZ * this.cellSize * 3,
            type: roomType,
            connections: [],
            features: []
        };
    }
    
    markOccupied(gx, gz, w, h) {
        for (let x = gx; x < gx + w; x++) {
            for (let z = gz; z < gz + h; z++) {
                this.grid.set(`${x},${z}`, true);
            }
        }
    }
    
    isOccupied(gx, gz, w, h) {
        for (let x = gx; x < gx + w; x++) {
            for (let z = gz; z < gz + h; z++) {
                if (this.grid.has(`${x},${z}`)) return true;
            }
        }
        return false;
    }
    
    tryCreateBranch(sourceRoom, direction) {
        const hallLength = this.randInt(this.config.hallwayLength.min, this.config.hallwayLength.max);
        const hallWidth = this.randInt(4, 8);
        
        let newGridX, newGridZ;
        let hallStartX, hallStartZ, hallEndZ;
        
        const offset = Math.ceil(hallLength / this.cellSize) + 3;
        
        switch (direction) {
            case 'north':
                newGridX = sourceRoom.gridX + this.randInt(-2, 2);
                newGridZ = sourceRoom.gridZ - offset;
                hallStartX = sourceRoom.worldX;
                hallStartZ = sourceRoom.worldZ - sourceRoom.depth / 2;
                hallEndZ = newGridZ * this.cellSize * 3 + this.config.roomSize.min / 2;
                break;
            case 'south':
                newGridX = sourceRoom.gridX + this.randInt(-2, 2);
                newGridZ = sourceRoom.gridZ + offset;
                hallStartX = sourceRoom.worldX;
                hallStartZ = sourceRoom.worldZ + sourceRoom.depth / 2;
                hallEndZ = newGridZ * this.cellSize * 3 - this.config.roomSize.min / 2;
                break;
            case 'east':
                newGridX = sourceRoom.gridX + offset;
                newGridZ = sourceRoom.gridZ + this.randInt(-2, 2);
                hallStartX = sourceRoom.worldX + sourceRoom.width / 2;
                hallStartZ = sourceRoom.worldZ;
                break;
            case 'west':
                newGridX = sourceRoom.gridX - offset;
                newGridZ = sourceRoom.gridZ + this.randInt(-2, 2);
                hallStartX = sourceRoom.worldX - sourceRoom.width / 2;
                hallStartZ = sourceRoom.worldZ;
                break;
        }
        
        // Check if new room location is free
        const testRoom = this.createRoom(newGridX, newGridZ);
        if (this.isOccupied(newGridX, newGridZ, testRoom.gridWidth, testRoom.gridHeight)) {
            return null;
        }
        
        // Create the room and hallway
        const newRoom = this.createRoom(newGridX, newGridZ);
        this.markOccupied(newGridX, newGridZ, newRoom.gridWidth, newRoom.gridHeight);
        
        const hallway = {
            startX: hallStartX,
            startZ: hallStartZ,
            endX: newRoom.worldX,
            endZ: direction === 'north' || direction === 'south' ? 
                (direction === 'north' ? newRoom.worldZ + newRoom.depth / 2 : newRoom.worldZ - newRoom.depth / 2) :
                newRoom.worldZ,
            width: hallWidth,
            height: this.randFloat(4, 7),
            direction,
            sourceRoom,
            targetRoom: newRoom
        };
        
        sourceRoom.connections.push({ direction, hallway, room: newRoom });
        newRoom.connections.push({ 
            direction: this.oppositeDirection(direction), 
            hallway, 
            room: sourceRoom 
        });
        
        return { hallway, room: newRoom };
    }
    
    createBossRoom() {
        let furthestRoom = this.rooms[0];
        let maxDist = 0;
        
        this.rooms.forEach(room => {
            const dist = Math.abs(room.gridX) + Math.abs(room.gridZ);
            if (dist > maxDist && room.type !== 'entrance') {
                maxDist = dist;
                furthestRoom = room;
            }
        });
        
        furthestRoom.type = 'boss';
        furthestRoom.width = Math.max(furthestRoom.width, 35);
        furthestRoom.depth = Math.max(furthestRoom.depth, 35);
        furthestRoom.height = Math.max(furthestRoom.height, 12);
        this.bossRoom = furthestRoom;
    }
    
    buildGeometry() {
        this.rooms.forEach(room => this.buildRoom(room));
        this.hallways.forEach(hall => this.buildHallway(hall));
    }
    
    buildRoom(room) {
        const { width, depth, height, worldX, worldZ, type } = room;
        
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(width + 2, 1, depth + 2),
            this.materials.floor
        );
        floor.position.set(worldX, -0.5, worldZ);
        floor.receiveShadow = true;
        this.group.add(floor);
        
        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(width + 2, 1, depth + 2),
            this.materials.ceiling
        );
        ceiling.position.set(worldX, height + 0.5, worldZ);
        this.group.add(ceiling);
        
        // Walls
        this.buildRoomWalls(room);
        
        // Room-specific features
        if (type === 'entrance') {
            this.buildEntranceFeatures(room);
        } else if (type === 'boss') {
            this.buildBossRoomFeatures(room);
        } else {
            this.buildNormalRoomFeatures(room);
        }
        
        this.addRoomLighting(room);
    }
    
    buildRoomWalls(room) {
        const { width, depth, height, worldX, worldZ, connections } = room;
        const wallThickness = 2;
        const doorWidth = 6;
        const doorHeight = 5;
        
        const hasNorthDoor = connections.some(c => c.direction === 'north');
        const hasSouthDoor = connections.some(c => c.direction === 'south');
        const hasEastDoor = connections.some(c => c.direction === 'east');
        const hasWestDoor = connections.some(c => c.direction === 'west');
        
        // Build walls with doorways as needed (simplified version)
        const walls = [
            { has: hasNorthDoor, pos: [worldX, height/2, worldZ - depth/2 - wallThickness/2], size: [width + wallThickness*2, height, wallThickness] },
            { has: hasSouthDoor || room.type === 'entrance', pos: [worldX, height/2, worldZ + depth/2 + wallThickness/2], size: [width + wallThickness*2, height, wallThickness] },
            { has: hasEastDoor, pos: [worldX + width/2 + wallThickness/2, height/2, worldZ], size: [wallThickness, height, depth] },
            { has: hasWestDoor, pos: [worldX - width/2 - wallThickness/2, height/2, worldZ], size: [wallThickness, height, depth] }
        ];
        
        walls.forEach(w => {
            if (!w.has) {
                const wall = new THREE.Mesh(new THREE.BoxGeometry(...w.size), this.materials.wall);
                wall.position.set(...w.pos);
                this.group.add(wall);
            }
        });
    }
    
    buildHallway(hall) {
        const { startX, startZ, endX, endZ, width, height, direction } = hall;
        const isVertical = direction === 'north' || direction === 'south';
        const length = isVertical ? Math.abs(endZ - startZ) : Math.abs(endX - startX);
        const midX = (startX + endX) / 2;
        const midZ = (startZ + endZ) / 2;
        
        // Floor
        const floorGeo = isVertical ? 
            new THREE.BoxGeometry(width, 0.5, length) :
            new THREE.BoxGeometry(length, 0.5, width);
        const floor = new THREE.Mesh(floorGeo, this.materials.floor);
        floor.position.set(midX, -0.25, midZ);
        floor.receiveShadow = true;
        this.group.add(floor);
        
        // Ceiling
        const ceiling = new THREE.Mesh(floorGeo.clone(), this.materials.ceiling);
        ceiling.position.set(midX, height + 0.25, midZ);
        this.group.add(ceiling);
        
        // Walls
        if (isVertical) {
            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, height, length), this.materials.wall);
            leftWall.position.set(midX - width/2 - 0.5, height/2, midZ);
            this.group.add(leftWall);
            
            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(1, height, length), this.materials.wall);
            rightWall.position.set(midX + width/2 + 0.5, height/2, midZ);
            this.group.add(rightWall);
        } else {
            const frontWall = new THREE.Mesh(new THREE.BoxGeometry(length, height, 1), this.materials.wall);
            frontWall.position.set(midX, height/2, midZ - width/2 - 0.5);
            this.group.add(frontWall);
            
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(length, height, 1), this.materials.wall);
            backWall.position.set(midX, height/2, midZ + width/2 + 0.5);
            this.group.add(backWall);
        }
        
        // Hallway lighting
        const lightCount = Math.floor(length / 15);
        for (let i = 0; i <= lightCount; i++) {
            const t = lightCount > 0 ? i / lightCount : 0.5;
            const lx = startX + (endX - startX) * t;
            const lz = startZ + (endZ - startZ) * t;
            
            const light = new THREE.PointLight(
                this.type === 'cave' ? 0x4488ff : 0xffaa44,
                0.5,
                15
            );
            light.position.set(lx, height - 1, lz);
            this.group.add(light);
        }
    }
    
    buildEntranceFeatures(room) {
        const { worldX, worldZ, depth } = room;
        const archMat = this.materials.accent;
        
        const archLeft = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), archMat);
        archLeft.position.set(worldX - 3.5, 3, worldZ + depth/2);
        this.group.add(archLeft);
        
        const archRight = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), archMat);
        archRight.position.set(worldX + 3.5, 3, worldZ + depth/2);
        this.group.add(archRight);
        
        const archTop = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 1), archMat);
        archTop.position.set(worldX, 5.5, worldZ + depth/2);
        this.group.add(archTop);
    }
    
    buildBossRoomFeatures(room) {
        const { worldX, worldZ, width, depth, height } = room;
        
        // Central platform
        const platform = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1.5, 8), this.materials.accent);
        platform.position.set(worldX, 0.75, worldZ);
        this.group.add(platform);
        
        // Pillars in circle
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = Math.min(width, depth) / 2 - 4;
            
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, height - 1, 8), this.materials.stone);
            pillar.position.set(worldX + Math.cos(angle) * radius, (height - 1) / 2, worldZ + Math.sin(angle) * radius);
            this.group.add(pillar);
            
            const pillarLight = new THREE.PointLight(
                this.type === 'ruins' ? 0xffaa00 : (this.type === 'cave' ? 0x4488ff : 0xff6622),
                0.8, 12
            );
            pillarLight.position.set(worldX + Math.cos(angle) * radius, height - 2, worldZ + Math.sin(angle) * radius);
            this.group.add(pillarLight);
        }
        
        // Boss marker
        const bossMarker = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), this.materials.gold);
        bossMarker.position.set(worldX, 5, worldZ);
        this.group.add(bossMarker);
        room.bossMarker = bossMarker;
        
        const bossLight = new THREE.PointLight(0xff4400, 2, 25);
        bossLight.position.set(worldX, 4, worldZ);
        this.group.add(bossLight);
    }
    
    buildNormalRoomFeatures(room) {
        const { worldX, worldZ, width, depth } = room;
        const featureRoll = Math.random();
        
        if (featureRoll < 0.3) {
            // Debris
            for (let i = 0; i < 8; i++) {
                const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.5, 0), this.materials.stone);
                debris.position.set(
                    worldX + (Math.random() - 0.5) * width * 0.8,
                    0.2 + Math.random() * 0.3,
                    worldZ + (Math.random() - 0.5) * depth * 0.8
                );
                debris.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                this.group.add(debris);
            }
        } else if (featureRoll < 0.5) {
            // Central feature
            const centerFeature = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 3, 6), this.materials.accent);
            centerFeature.position.set(worldX, 1.5, worldZ);
            this.group.add(centerFeature);
        }
    }
    
    addRoomLighting(room) {
        const { worldX, worldZ, width, depth, height } = room;
        
        const mainLight = new THREE.PointLight(
            this.type === 'cave' ? 0x3366aa : (this.type === 'ruins' ? 0xffaa44 : 0xff8833),
            room.type === 'boss' ? 1.5 : 0.8,
            room.type === 'boss' ? 40 : 25
        );
        mainLight.position.set(worldX, height - 2, worldZ);
        this.group.add(mainLight);
        
        // Corner lights
        [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([cx, cz]) => {
            const cornerLight = new THREE.PointLight(this.type === 'cave' ? 0x4488ff : 0xffaa44, 0.4, 12);
            cornerLight.position.set(worldX + cx * (width/2 - 2), 3, worldZ + cz * (depth/2 - 2));
            this.group.add(cornerLight);
        });
    }
    
    addThemeFeatures() {
        this.rooms.forEach(room => {
            if (room.type === 'boss' || room.type === 'entrance') return;
            // Add theme-specific features based on dungeon type
            // Simplified - full implementation would add mine rails, cave stalactites, ruins pillars etc.
        });
    }
    
    update(time) {
        if (this.bossRoom && this.bossRoom.bossMarker) {
            this.bossRoom.bossMarker.rotation.y = time;
            this.bossRoom.bossMarker.position.y = 5 + Math.sin(time * 2) * 0.5;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POI SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const POISystem = {
    init(deps) {
        Object.assign(_deps, deps);
    },
    
    createPOI(type, x, z) {
        return new POI(type, x, z);
    },
    
    createDungeon(type) {
        return new ProceduralDungeon(type);
    },
    
    getList() {
        return poiList;
    },
    
    updateAll(time) {
        poiList.forEach(poi => poi.update(time));
    },
    
    findNearest(px, pz, maxDist = Infinity) {
        let nearest = null;
        let nearestDist = maxDist;
        
        for (const poi of poiList) {
            const dist = poi.getDistance(px, pz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = poi;
            }
        }
        
        return nearest;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    POISystem,
    POI,
    POI_TYPES,
    DUNGEON_CONFIG,
    ProceduralDungeon,
    poiList
};

export default POISystem;
