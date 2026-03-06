// ═══════════════════════════════════════════════════════════════════════════════
// MAIN.JS - Game Initialization and Main Loop
// Dependencies: THREE.js, All game systems
// This is the entry point that wires everything together
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Config
import { 
    CONFIG, MOVE, SHADOW_CONFIG, RENDERER_CONFIG,
    SpatialGrid, createPlayerMoveState, createInputState, createGameTimeState
} from './config.js';

// Assets
import { sharedGeom, mats, itemIcons, weatherIcons, SHOP_ICONS } from './assets.js';

// Terrain & Sky
import { TerrainSystem, getHeight, getSlope } from './terrain.js';
import { SkySystem } from './sky.js';
import { LightingSystem } from './lighting.js';

// Core Systems
import { BiomeSystem } from './systems/BiomeSystem.js';
import { DayNightSystem } from './systems/DayNightSystem.js';
import { WeatherSystem } from './systems/WeatherSystem.js';
import { FogSystem } from './systems/FogSystem.js';

// Entity Systems
import { ResourceSystem } from './resources.js';
import { CreatureSystem } from './systems/CreatureSystem.js';
import { NPCSystem, NPC_APPEARANCES, npcList as npcListRef, biomeNPCList as biomeNPCListRef } from './npc.js';
import { POISystem } from './poi.js';

// Player Systems
import { PlayerSystem } from './player.js';
import { CombatSystem } from './systems/CombatSystem.js';
import { InventorySystem, craftingRecipes } from './systems/InventorySystem.js';

// UI Systems
import { UISystem } from './ui.js';
import { DialogueSystem } from './systems/DialogueSystem.js';
import { ShopSystem } from './systems/ShopSystem.js';
import { QuestSystem } from './systems/QuestSystem.js';
import { LoreBookSystem } from './systems/LoreBookSystem.js';
import { CompassSystem } from './systems/CompassSystem.js';
import { InteriorSystem } from './systems/InteriorSystem.js';
import { HeldItemSystem } from './systems/HeldItemSystem.js';

// ═══════════════════════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════════════════════

let scene, camera, renderer, player;
let clock, time = 0;
let frame = 0, fps = 0, lastFps = performance.now();
let lastFOV = 0;
let lastTimeUpdate = 0;
let lastDebugUpdate = 0;
let lastShadowUpdate = 0;

// Spatial grids
let treeGrid, rockGrid, groundGrid;

// Frustum culling
let frustum, frustumMatrix;

// Lights
let ambientLight, hemiLight, sunLight, rimLight;

// Sky material reference
let skyMat;

// Wind system
const wind = {
    dir: new THREE.Vector2(1, 0.3).normalize(),
    strength: 0.5,
    t: 0,
    update(d, w) {
        this.t += d;
        this.strength = (0.5 + (Math.sin(this.t * 0.5) * 0.5 + 0.5) * 0.8) * w;
        this.dir.set(Math.cos(this.t * 0.1), Math.sin(this.t * 0.1)).normalize();
    }
};

// Player state
let pMove, keys;
let pitch = 0, locked = false;

// Game time
let gameTime;

// UI state
let inventoryOpen = false;
let shopOpen = false;
let currentDialogue = null;
let loreBookOpen = false;
let currentInterior = null;

// Entity lists (particles and effects only - trees/rocks managed by ResourceSystem)
const particles = [];
const fallingLeaves = [];
const windParticles = [];
const poiList = [];
const npcList = [];
const biomeNPCList = [];
const interiorNPCList = [];
const villageBuildings = [];
const biomeTownBuildings = [];

// Reusable vectors
const _tempVec3 = new THREE.Vector3();
const dir = new THREE.Vector3();

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function init() {
    console.log('Game init starting...');
    
    // Create scene
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    
    // Create camera and player
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 15000);
    player = new THREE.Object3D();
    player.add(camera);
    scene.add(player);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({
        antialias: RENDERER_CONFIG.antialias,
        powerPreference: RENDERER_CONFIG.powerPreference,
        stencil: RENDERER_CONFIG.stencil,
        depth: RENDERER_CONFIG.depth
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER_CONFIG.pixelRatio));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = RENDERER_CONFIG.toneMappingExposure;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;z-index:0';
    renderer.info.autoReset = false;
    document.body.appendChild(renderer.domElement);
    
    // Expose renderer globally for pointer lock from menu
    window.renderer = renderer;
    
    console.log('Renderer created');
    
    // Initialize spatial grids
    treeGrid = new SpatialGrid(CONFIG.gridCellSize);
    rockGrid = new SpatialGrid(CONFIG.gridCellSize);
    groundGrid = new SpatialGrid(CONFIG.gridCellSize * 0.5);
    
    // Initialize frustum
    frustum = new THREE.Frustum();
    frustumMatrix = new THREE.Matrix4();
    
    // Initialize lighting
    initLighting();
    console.log('Lighting initialized');
    
    // Initialize sky
    initSky();
    
    // Initialize terrain
    initTerrain();
    console.log('Terrain initialized');
    
    // Initialize systems
    initSystems();
    console.log('Systems initialized');
    
    // Initialize player
    initPlayer();
    console.log('Player at:', player.position.x, player.position.y, player.position.z);
    
    // Initialize input
    initInput();
    
    // Spawn world
    spawnWorld();
    console.log('World spawned');
    
    // Initialize UI
    initUI();
    
    // Window resize handler
    window.addEventListener('resize', onWindowResize);
    
    console.log("Game init complete!");
    console.log("Press TAB to open inventory!");
    console.log("Press J to open Lore Book!");
}

function initLighting() {
    // Ambient light
    ambientLight = new THREE.AmbientLight(0x445566, 0.25);
    scene.add(ambientLight);
    
    // Hemisphere light for natural sky/ground color bleed
    hemiLight = new THREE.HemisphereLight(0x6699aa, 0x2d4a2d, 0.3);
    scene.add(hemiLight);
    
    // Directional sun light
    sunLight = new THREE.DirectionalLight(0xffeebb, 0.85);
    sunLight.castShadow = true;
    sunLight.shadow.camera.left = -SHADOW_CONFIG.cameraSize;
    sunLight.shadow.camera.right = SHADOW_CONFIG.cameraSize;
    sunLight.shadow.camera.top = SHADOW_CONFIG.cameraSize - 10;
    sunLight.shadow.camera.bottom = -SHADOW_CONFIG.cameraSize + 10;
    sunLight.shadow.camera.near = SHADOW_CONFIG.cameraNear;
    sunLight.shadow.camera.far = SHADOW_CONFIG.cameraFar;
    sunLight.shadow.mapSize.width = SHADOW_CONFIG.mapSize;
    sunLight.shadow.mapSize.height = SHADOW_CONFIG.mapSize;
    sunLight.shadow.bias = SHADOW_CONFIG.bias;
    sunLight.shadow.normalBias = SHADOW_CONFIG.normalBias;
    scene.add(sunLight);
    scene.add(sunLight.target);
    
    // Rim/back light for depth
    rimLight = new THREE.DirectionalLight(0x6688bb, 0.15);
    rimLight.position.set(-50, 30, 50);
    scene.add(rimLight);
}

function initSky() {
    // Set scene background color (fallback if sky fails)
    scene.background = new THREE.Color(0x87CEEB);
    
    // Sky system creates sky sphere with shader
    SkySystem.init({ scene });
    skyMat = SkySystem.getMaterial();  // Fixed: was getSkyMaterial
    
    // Initialize scene fog with default values (will be updated by BiomeSystem)
    scene.fog = new THREE.FogExp2(0x9ecfb7, 0.0045);
    
    console.log('Sky and fog initialized');
}

function initTerrain() {
    TerrainSystem.init({
        scene,
        CONFIG,
        BiomeSystem
    });
}

function initSystems() {
    // Initialize biome system
    BiomeSystem.init({
        scene,
        skyMat,
        ambientLight,
        hemiLight,
        FogSystem
    });
    
    // DayNightSystem is auto-initialized (IIFE) - no init needed
    
    // Initialize weather
    WeatherSystem.init({
        scene,
        skyMat
    });
    
    // Initialize fog
    FogSystem.init({
        scene,
        BiomeSystem,
        DayNightSystem
    });
    
    // Initialize resources
    ResourceSystem.init({
        scene,
        sharedGeom,
        mats,
        CONFIG,
        inventory: InventorySystem,
        spawnParticles,
        showPickupNotification: UISystem.showPickupNotification,
        discoverMaterial: (resourceType, resourceSubType) => {
            const category = resourceType === 'rock' ? 'minerals' : 'flora';
            LoreBookSystem.discoverEntry(category, resourceSubType);
        },
        treeGrid,
        rockGrid
    });
    
    // Initialize creatures
    CreatureSystem.init({
        scene,
        CONFIG,
        getHeight,
        BiomeSystem
    });
    
    // Initialize combat
    CombatSystem.init({
        scene,
        player,
        camera,
        CONFIG,
        InventorySystem
    });
    
    // Initialize inventory
    InventorySystem.init({
        itemIcons,
        SHOP_ICONS
    });
    
    // Initialize dialogue
    DialogueSystem.init({
        UISystem,
        npcList: npcListRef,
        biomeNPCList: biomeNPCListRef,
        interiorNPCList,
        NPC_APPEARANCES,
        renderer
    });
    
    // Initialize shop
    ShopSystem.init({
        InventorySystem,
        UISystem,
        SHOP_ICONS
    });
    
    // Initialize quests
    QuestSystem.init({
        InventorySystem,
        UISystem
    });
    
    // LoreBookSystem DOM event binding
    LoreBookSystem.init();
    
    // Initialize compass (finds DOM element automatically)
    CompassSystem.init();
    
    // Initialize interiors
    InteriorSystem.init({
        scene,
        player,
        camera
    });

    // Initialize held item (first-person weapon/tool)
    HeldItemSystem.init({
        camera,
        InventorySystem,
        CombatSystem,
        getPMove: () => pMove
    });
}

function initPlayer() {
    // Set initial position
    player.position.set(0, getHeight(0, 5) + 1.6, 5);
    
    // Initialize movement state
    pMove = createPlayerMoveState();
    keys = createInputState();
    gameTime = createGameTimeState();
}

function initInput() {
    // Pointer lock on click
    renderer.domElement.addEventListener('click', () => {
        if (inventoryOpen) return;
        if (!locked) {
            renderer.domElement.requestPointerLock();
        } else {
            CombatSystem.startSwing();
        }
    });
    
    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
        locked = document.pointerLockElement === renderer.domElement;
    });
    
    // Mouse move
    document.addEventListener('mousemove', e => {
        if (!locked || inventoryOpen) return;
        player.rotation.y -= e.movementX * 0.002;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch - e.movementY * 0.002));
        camera.rotation.x = pitch;
    });
    
    // Scroll wheel for hotbar
    document.addEventListener('wheel', e => {
        if (inventoryOpen) return;
        const s = InventorySystem.selectedSlot;
        if (e.deltaY > 0) {
            InventorySystem.selectedSlot = (s + 1) % 9;  // Fixed: use setter
        } else {
            InventorySystem.selectedSlot = (s + 8) % 9;  // Fixed: use setter
        }
    });
    
    // Keydown
    document.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        
        if (k === 'tab') {
            e.preventDefault();
            UISystem.toggleInventory();
            inventoryOpen = UISystem.isInventoryOpen();
            HeldItemSystem.setVisible(!inventoryOpen);
            return;
        }
        
        if (k === 'escape') {
            e.preventDefault();
            if (typeof window.isGamePaused === 'function' && window.isGamePaused()) {
                if (typeof window.handlePauseEsc === 'function') {
                    window.handlePauseEsc();
                }
                return;
            }
            if (shopOpen) { ShopSystem.close(); shopOpen = false; return; }
            if (currentDialogue) { DialogueSystem.closeDialogue(); currentDialogue = null; return; }  // Fixed
            if (inventoryOpen) { UISystem.toggleInventory(); inventoryOpen = false; HeldItemSystem.setVisible(true); return; }
            if (loreBookOpen) { LoreBookSystem.toggle(); loreBookOpen = false; return; }
            if (typeof window.openPauseMenu === 'function') {
                window.openPauseMenu();
            }
            return;
        }
        
        if (inventoryOpen || shopOpen || currentDialogue) return;
        if (typeof window.isGamePaused === 'function' && window.isGamePaused()) return;
        
        if (k === 'w') keys.w = true;
        if (k === 'a') keys.a = true;
        if (k === 's') keys.s = true;
        if (k === 'd') keys.d = true;
        if (k === ' ') { if (!keys.space) pMove.spaceJustPressed = true; keys.space = true; e.preventDefault(); }
        if (k === 'shift') { if (!keys.shift) pMove.shiftJustPressed = true; keys.shift = true; }
        if (k === 'control' || k === 'c') { if (!keys.ctrl) pMove.ctrlJustPressed = true; keys.ctrl = true; }
        if (k === 'l') locked ? document.exitPointerLock() : renderer.domElement.requestPointerLock();
        if (k === 't') DayNightSystem.advanceTime(1);  // Fixed: was advanceHour
        if (k === 'y') WeatherSystem.cycle();
        if (k === 'e') handleInteraction();
        if (k === 'j') { LoreBookSystem.toggle(); loreBookOpen = LoreBookSystem.isOpen(); }
        if (k >= '1' && k <= '9') InventorySystem.selectedSlot = parseInt(k) - 1;  // Fixed: use setter
    });
    
    // Keyup
    document.addEventListener('keyup', e => {
        const k = e.key.toLowerCase();
        if (k === 'w') keys.w = false;
        if (k === 'a') keys.a = false;
        if (k === 's') keys.s = false;
        if (k === 'd') keys.d = false;
        if (k === ' ') keys.space = false;
        if (k === 'shift') keys.shift = false;
        if (k === 'control' || k === 'c') keys.ctrl = false;
    });
}

function spawnWorld() {
    // Spawn trees
    for (let i = 0; i < CONFIG.treeCount; i++) {
        const x = (Math.random() - 0.5) * CONFIG.terrainSize * 0.9;
        const z = (Math.random() - 0.5) * CONFIG.terrainSize * 0.9;
        const y = getHeight(x, z);
        if (y > 0.5) { // Above water
            const biome = BiomeSystem.getBiomeAt(x, z);
            const types = ResourceSystem.getTreeTypesForBiome(biome.id);
            const typeIdx = types[Math.floor(Math.random() * types.length)];
            ResourceSystem.createTree(x, y, z, 1.0 + Math.random() * 2.0, typeIdx);
        }
    }
    
    // Spawn rocks
    for (let i = 0; i < CONFIG.rockCount; i++) {
        const x = (Math.random() - 0.5) * CONFIG.terrainSize * 0.9;
        const z = (Math.random() - 0.5) * CONFIG.terrainSize * 0.9;
        const y = getHeight(x, z);
        if (y > 0.3) {
            const typeIdx = Math.floor(Math.random() * 7);
            ResourceSystem.createRock(x, y, z, 0.8 + Math.random() * 1.5, typeIdx);
        }
    }
    
    // Spawn ground cover
    for (let i = 0; i < CONFIG.grassInstances; i++) {
        const x = (Math.random() - 0.5) * CONFIG.terrainSize * 0.8;
        const z = (Math.random() - 0.5) * CONFIG.terrainSize * 0.8;
        const y = getHeight(x, z);
        if (y > 0.5 && y < 50) {
            ResourceSystem.createGrassTuft(x, y, z);
        }
    }
    
    for (let i = 0; i < CONFIG.flowerInstances; i++) {
        const x = (Math.random() - 0.5) * CONFIG.terrainSize * 0.7;
        const z = (Math.random() - 0.5) * CONFIG.terrainSize * 0.7;
        const y = getHeight(x, z);
        if (y > 0.5 && y < 40) {
            ResourceSystem.createFlower(x, y, z);
        }
    }
    
    // Spawn creatures
    CreatureSystem.spawnInArea(getHeight);
    
    // Initialize POI system and spawn POIs
    POISystem.init({ scene, getHeight, CONFIG });
    spawnPOIs();
    
    // Initialize NPC system and spawn NPCs
    NPCSystem.init({ scene, getHeight, CONFIG, DialogueSystem, ShopSystem });
    spawnNPCs();
    
    console.log('World spawned');
}

function spawnPOIs() {
    const area = CONFIG.terrainSize * 0.7;
    const configs = [
        { type: 'mineshaft', count: 2 }, { type: 'cabin', count: 3 },
        { type: 'shrine', count: 4 }, { type: 'cave', count: 2 },
        { type: 'ruins', count: 2 }, { type: 'watchtower', count: 2 }, { type: 'well', count: 3 }
    ];
    const placed = [];
    
    for (const cfg of configs) {
        for (let i = 0; i < cfg.count; i++) {
            for (let attempt = 0; attempt < 50; attempt++) {
                const x = (Math.random() - 0.5) * area;
                const z = (Math.random() - 0.5) * area;
                
                // Skip if slope too steep or too close to center
                if (getSlope(x, z) > 0.4 || Math.sqrt(x*x + z*z) < 50) continue;
                
                // Check distance from other POIs
                let valid = true;
                for (const p of placed) {
                    if (Math.sqrt((x - p.x)**2 + (z - p.z)**2) < 80) {
                        valid = false;
                        break;
                    }
                }
                
                if (valid) {
                    POISystem.createPOI(cfg.type, x, z);
                    placed.push({ x, z });
                    break;
                }
            }
        }
    }
    
    console.log('Spawned ' + POISystem.getList().length + ' Points of Interest');
}

function spawnNPCs() {
    const npcKeys = ['wanderer', 'herbalist', 'weaponsmith', 'armorsmith', 'scholar'];
    const spawnRadius = 25;
    
    npcKeys.forEach((key, i) => {
        const angle = (i / npcKeys.length) * Math.PI * 2;
        const dist = spawnRadius + Math.random() * 10;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        NPCSystem.createNPC(x, z, key);
    });
    
    console.log('Spawned ' + NPCSystem.getList().length + ' NPCs');
}

function initUI() {
    UISystem.init({
        inventory: InventorySystem,
        equipment: InventorySystem.getEquipment(),  // Fixed: use getter
        hotbarItems: InventorySystem.getHotbarItems(),  // Fixed: use getter
        characterStats: InventorySystem.getStats(),  // Fixed: use getter
        knownSpells: InventorySystem.getKnownSpells(),  // Fixed: use getter
        craftingRecipes,  // This is imported from InventorySystem
        itemIcons,
        SHOP_ICONS,
        spellIcons: {},
        updateQuestProgress: QuestSystem.updateProgress,
        camera,
        MOVE,
        pMove
    });
    
    // Initialize HUD
    UISystem.updatePlayerHUD();
    UISystem.updateHotbarUI();
    
    // Update weather widget
    const wCfg = WeatherSystem.getConfig();
    const weatherIcon = document.querySelector('#weather-widget .weather-icon');
    const weatherName = document.querySelector('#weather-widget .weather-name');
    if (weatherIcon) weatherIcon.innerHTML = weatherIcons[wCfg.icon] || wCfg.icon;
    if (weatherName) weatherName.textContent = wCfg.name;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function handleInteraction() {
    // Find nearest interactable POI
    const nearestPOI = POISystem.findNearest(player.position.x, player.position.z, 10);
    if (nearestPOI) {
        console.log('Interacting with POI:', nearestPOI);
        // Handle POI interaction
    }

    // Handle NPC interaction via DialogueSystem (uses proximity-tracked nearbyNPC)
    DialogueSystem.handleInteraction();
}

function spawnParticles(pos, color, count = 8) {
    // Particle spawning implementation
    for (let i = 0; i < count; i++) {
        // Create particle at position with color
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function showMoveFeedback(text, color = '#4ade80') {
    let el = document.getElementById('move-feedback');
    if (!el) {
        el = document.createElement('div');
        el.id = 'move-feedback';
        el.style.cssText = 'position:fixed;bottom:140px;left:50%;transform:translateX(-50%);font-family:Orbitron,sans-serif;font-size:13px;pointer-events:none;z-index:100;transition:opacity 0.2s;text-shadow:0 0 8px currentColor;';
        document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.color = color;
    el.style.opacity = '1';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.style.opacity = '0', 250);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════════════════

function animate() {
    requestAnimationFrame(animate);
    
    // Check if game is paused
    if (typeof window.isGamePaused === 'function' && window.isGamePaused()) {
        renderer.render(scene, camera);
        return;
    }
    
    const delta = Math.min(clock.getDelta(), 0.1);
    time += delta;
    frame++;
    const now = performance.now();
    if (now - lastFps >= 1000) { fps = frame; frame = 0; lastFps = now; }
    
    if (!inventoryOpen) {
        // Update day/night
        DayNightSystem.update(delta);
        
        // Update weather and wind
        const wCfg = WeatherSystem.getConfig();
        wind.update(delta, wCfg.wind);
        WeatherSystem.updateLightning(delta);
        
        // Update lighting
        const sa = DayNightSystem.getSunAngle();
        const sunY = Math.sin(sa), sunX = Math.cos(sa);
        _tempVec3.set(sunX * 60, Math.max(sunY * 60, 10), -30);
        sunLight.position.copy(player.position).add(_tempVec3);
        sunLight.target.position.copy(player.position);
        
        // Update sky shader
        skyMat.uniforms.sunPos.value.set(sunX, sunY, -0.3).normalize();
        skyMat.uniforms.tod.value = DayNightSystem.gameTime / 24;
        skyMat.uniforms.cloud.value = wCfg.cloud;
        skyMat.uniforms.time.value = time;
        
        // Update light intensity
        const si = DayNightSystem.getSunIntensity();
        const lb = WeatherSystem.lightningActive ? 1.5 : 0;
        sunLight.intensity = Math.max(0.08, si * 0.75) + lb;
        ambientLight.intensity = Math.max(0.1, 0.15 + si * 0.12) + lb * 0.3;
        
        // Update player biome
        if (!currentInterior) {
            BiomeSystem.updatePlayerBiome(player.position.x, player.position.z);
        }
        
        // Update fog
        if (!currentInterior) {
            FogSystem.update();
        }
        
        // Update player movement
        updatePlayerMovement(delta);

        // Update NPC proximity prompt
        DialogueSystem.update(player.position, currentInterior);

        // Update entities
        updateEntities(delta);
        
        // Update visibility (LOD)
        updateVisibility();
        
        // Update combat
        CombatSystem.updateProjectiles(delta);  // Fixed: was update(delta, time)

        // Update held item (bobbing, swing animation)
        HeldItemSystem.update(delta);

        // Update quests
        QuestSystem.animateMarkers(time);
        
        // Update compass
        CompassSystem.updateFromPlayer(player, []);
    }
    
    // UI updates (time-based)
    if (now - lastTimeUpdate >= 500) {
        lastTimeUpdate = now;
        const timeDisplay = document.querySelector('#time-widget .time-display');
        const timePeriod = document.querySelector('#time-widget .time-period');
        if (timeDisplay) timeDisplay.textContent = DayNightSystem.getTimeString();
        if (timePeriod) timePeriod.textContent = DayNightSystem.getTimePeriod();
    }
    
    // Debug update
    if (now - lastDebugUpdate >= 250) {
        lastDebugUpdate = now;
        updateDebugDisplay();
    }
    
    // Shadow update
    if (now - lastShadowUpdate > SHADOW_CONFIG.updateInterval) {
        renderer.shadowMap.needsUpdate = true;
        lastShadowUpdate = now;
    }
    
    renderer.render(scene, camera);
    renderer.info.reset();
}

function updatePlayerMovement(delta) {
    const m = pMove;
    const px = player.position.x, pz = player.position.z;
    
    // Get ground height
    let gh;
    if (currentInterior) {
        gh = currentInterior.scene.position.y;
    } else {
        gh = getHeight(px, pz);
    }
    
    // Check grounded state
    const groundLevel = gh + m.camHeight;
    m.isGrounded = player.position.y <= groundLevel + 0.05;
    
    // Get input direction
    const inputX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const inputZ = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    const hasInput = inputX !== 0 || inputZ !== 0;
    
    // Calculate world direction
    let worldDirX = 0, worldDirZ = 0;
    if (hasInput) {
        const sin = Math.sin(player.rotation.y), cos = Math.cos(player.rotation.y);
        worldDirX = inputX * cos + inputZ * sin;
        worldDirZ = inputZ * cos - inputX * sin;
        const len = Math.sqrt(worldDirX * worldDirX + worldDirZ * worldDirZ);
        if (len > 0) { worldDirX /= len; worldDirZ /= len; }
    }
    
    // Update cooldowns
    if (m.slideCooldownTime > 0) m.slideCooldownTime -= delta * 1000;
    if (m.dashCooldownTime > 0) m.dashCooldownTime -= delta * 1000;
    
    let frameSpeedX = 0, frameSpeedZ = 0;
    
    // Dash
    if (m.isDashing) {
        m.dashTime -= delta * 1000;
        if (m.dashTime <= 0) {
            m.isDashing = false;
            m.dashCooldownTime = MOVE.dashCooldown;
        } else {
            frameSpeedX = m.dashDir.x * MOVE.dashSpeed;
            frameSpeedZ = m.dashDir.z * MOVE.dashSpeed;
            player.position.x += frameSpeedX * delta * 60;
            player.position.z += frameSpeedZ * delta * 60;
        }
    } else if (m.shiftJustPressed && hasInput && m.isGrounded && m.dashCooldownTime <= 0 && !m.isSliding) {
        m.isDashing = true;
        m.dashTime = MOVE.dashDuration;
        m.dashDir.x = worldDirX;
        m.dashDir.z = worldDirZ;
        showMoveFeedback('DASH', '#60a5fa');
    }
    
    // Slide
    if (m.isSliding) {
        m.slideTime -= delta * 1000;
        if (m.slideTime <= 0 || m.spaceJustPressed || !m.isGrounded) {
            m.isSliding = false;
            m.slideCooldownTime = MOVE.slideCooldown;
            m.targetCamHeight = 1.6;
            m.targetCamTilt = 0;
            if (m.spaceJustPressed && m.isGrounded) {
                m.velY = MOVE.jumpForce * 1.15;
                m.isGrounded = false;
                showMoveFeedback('SLIDE CANCEL', '#a78bfa');
            }
        } else {
            const slideProgress = 1 - (m.slideTime / MOVE.slideDuration);
            const slideFalloff = 1 - (slideProgress * slideProgress * 0.6);
            const currentSlideSpeed = MOVE.slideSpeed * slideFalloff;
            frameSpeedX = m.slideDir.x * currentSlideSpeed;
            frameSpeedZ = m.slideDir.z * currentSlideSpeed;
            player.position.x += frameSpeedX * delta * 60;
            player.position.z += frameSpeedZ * delta * 60;
            m.targetCamHeight = MOVE.slideHeight;
            m.targetCamTilt = MOVE.slideTilt * (1 - slideProgress * 0.5);
        }
    } else if (m.ctrlJustPressed && hasInput && m.isGrounded && m.slideCooldownTime <= 0 && !m.isDashing) {
        m.isSliding = true;
        m.slideTime = MOVE.slideDuration;
        m.slideDir.x = worldDirX;
        m.slideDir.z = worldDirZ;
        m.targetCamTilt = MOVE.slideTilt;
        showMoveFeedback('SLIDE', '#f472b6');
    }
    
    // Jump
    if (m.spaceJustPressed && m.isGrounded && !m.isSliding) {
        m.velY = MOVE.jumpForce;
        m.isGrounded = false;
    }
    
    // Normal movement
    if (!m.isSliding && !m.isDashing) {
        const isSprinting = keys.shift && hasInput;
        const moveSpeed = isSprinting ? MOVE.sprintSpeed : MOVE.walkSpeed;
        
        if (hasInput) {
            frameSpeedX = worldDirX * moveSpeed;
            frameSpeedZ = worldDirZ * moveSpeed;
            player.position.x += frameSpeedX * delta * 60;
            player.position.z += frameSpeedZ * delta * 60;
        }
        
        m.targetCamTilt = 0;
    }
    
    // Gravity
    const physicsScale = delta * 60;
    if (!m.isGrounded) {
        m.velY -= MOVE.gravity * physicsScale;
    }
    player.position.y += m.velY * physicsScale;
    
    // Ground collision
    if (player.position.y < groundLevel) {
        player.position.y = groundLevel;
        m.velY = 0;
        m.isGrounded = true;
    }
    
    // Calculate current speed
    m.currentSpeed = Math.sqrt(frameSpeedX * frameSpeedX + frameSpeedZ * frameSpeedZ);
    
    // Dynamic FOV
    const fovSpeedRef = MOVE.sprintSpeed * 1.2;
    const speedRatio = Math.min(m.currentSpeed / fovSpeedRef, 1);
    m.targetFOV = MOVE.baseFOV + (MOVE.maxFOV - MOVE.baseFOV) * speedRatio;
    
    m.currentFOV += (m.targetFOV - m.currentFOV) * MOVE.fovSmoothness;
    if (Math.abs(m.currentFOV - lastFOV) > 0.1) {
        camera.fov = m.currentFOV;
        camera.updateProjectionMatrix();
        lastFOV = m.currentFOV;
    }
    
    // Smooth camera height and tilt
    m.camHeight += (m.targetCamHeight - m.camHeight) * 0.15;
    m.camTilt += (m.targetCamTilt - m.camTilt) * MOVE.tiltSmoothness;
    camera.rotation.z = m.camTilt;
    
    // Clear just-pressed flags
    m.spaceJustPressed = false;
    m.ctrlJustPressed = false;
    m.shiftJustPressed = false;
}

function updateEntities(delta) {
    // Update POIs
    POISystem.updateAll(time);  // Fixed: was update(time, player.position)
    
    // Update NPCs
    NPCSystem.updateAll(time, player.position);  // Fixed: was update
    
    // Update creatures
    CreatureSystem.updateAll(delta, time, player.position);  // Fixed: was update
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(delta);
    }
    
    // Update falling leaves
    fallingLeaves.forEach(leaf => leaf.update(delta, time, wind.strength, wind.dir));
    
    // Update wind particles
    windParticles.forEach(p => p.update(delta, time, wind.strength, wind.dir));
    
    // Update clouds via SkySystem
    SkySystem.updateClouds(delta, wind.dir, wind.strength, player.position);
}

function updateVisibility() {
    const px = player.position.x, pz = player.position.z;
    
    if (currentInterior) return; // Skip exterior updates when in interior
    
    // Update frustum
    if (frame % 2 === 0) {
        frustumMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(frustumMatrix);
    }
    
    // Trees - use ResourceSystem's arrays
    if (frame % 3 === 0) {
        ResourceSystem.getSwayingTrees().forEach(t => {
            if (!t.isDestroyed) t.updateVis(px, pz);
        });
    }
    
    // Rocks
    if (frame % 4 === 2) {
        ResourceSystem.getHarvestableResources().forEach(r => {
            if (r.updateVis) r.updateVis(px, pz);
        });
    }
    
    // Ground cover
    if (frame % 4 === 0) {
        const gc = ResourceSystem.getGroundCover();
        const batchSize = Math.ceil(gc.length / 4);
        const batchIdx = Math.floor((frame / 4) % 4);
        const start = batchIdx * batchSize;
        const end = Math.min(start + batchSize, gc.length);
        for (let i = start; i < end; i++) {
            if (gc[i] && gc[i].updateVis) gc[i].updateVis(px, pz);
        }
    }
}

function updateDebugDisplay() {
    const debugEl = document.getElementById('debug');
    if (!debugEl) return;
    
    let visTrees = 0, lodTrees = 0;
    ResourceSystem.getSwayingTrees().forEach(t => {
        if (t.group && t.group.visible && !t.isDestroyed) {
            visTrees++;
            if (t.lodLevel > 0) lodTrees++;
        }
    });
    
    debugEl.innerHTML = `FPS: ${fps} | View: ${CONFIG.treeCulling}m<br>Trees: ${visTrees} (LOD: ${lodTrees})<br>Pos: (${player.position.x.toFixed(0)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(0)})`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// START GAME
// ═══════════════════════════════════════════════════════════════════════════════

function startGame() {
    init();
    animate();
}

// Export for menu to call
window.initializeGame = startGame;
window.startGame = startGame;

// Expose renderer globally for pointer lock
window.renderer = null;

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    startGame,
    scene,
    camera,
    player,
    renderer,
    CONFIG,
    getHeight
};
