// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER.JS - Camera, Controls, and Movement System
// Dependencies: THREE.js
// Injected: scene, renderer, getHeight, inventory states, UI toggles
// Consumers: Main game loop, all systems needing player position
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null,
    renderer: null,
    getHeight: (x, z) => 0,
    inventoryOpen: false,
    shopOpen: false,
    loreBookOpen: false,
    currentDialogue: null,
    currentInterior: null,
    toggleInventory: null,
    toggleLoreBook: null,
    closeShop: null,
    closeDialogue: null,
    startSwing: null,
    selectSlot: null,
    handlePOIInteraction: null,
    handleNPCInteraction: null,
    dayNight: null,
    weather: null,
    InventorySystem: null
};

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA & PLAYER SETUP
// ═══════════════════════════════════════════════════════════════════════════════

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 15000);
const player = new THREE.Object3D();
player.add(camera);

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT CONSTANTS - BO3-Style Snappy Controller
// ═══════════════════════════════════════════════════════════════════════════════

const MOVE = {
    walkSpeed: 0.18,
    sprintSpeed: 0.55,
    jumpForce: 0.42,
    gravity: 0.022,
    slideSpeed: 1.8,
    slideDuration: 600,
    slideCooldown: 200,
    slideHeight: 0.9,
    slideTilt: 0.15,
    dashSpeed: 0.7,
    dashDuration: 120,
    dashCooldown: 500,
    // FOV settings
    baseFOV: 75,
    maxFOV: 95,
    fovSmoothness: 0.08,
    tiltSmoothness: 0.12
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT STATE
// ═══════════════════════════════════════════════════════════════════════════════

const pMove = {
    isGrounded: true,
    velY: 0,
    isSliding: false,
    slideTime: 0,
    slideCooldownTime: 0,
    slideDir: { x: 0, z: 0 },
    isDashing: false,
    dashTime: 0,
    dashCooldownTime: 0,
    dashDir: { x: 0, z: 0 },
    camHeight: 1.6,
    targetCamHeight: 1.6,
    camTilt: 0,
    targetCamTilt: 0,
    currentFOV: 75,
    targetFOV: 75,
    currentSpeed: 0,
    spaceJustPressed: false,
    ctrlJustPressed: false,
    shiftJustPressed: false
};

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT STATE
// ═══════════════════════════════════════════════════════════════════════════════

const keys = { w: false, a: false, s: false, d: false, space: false, shift: false, ctrl: false };
let pitch = 0;
let locked = false;

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════════

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
// PLAYER SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const PlayerSystem = {
    // Initialize with dependencies
    init(deps) {
        Object.assign(_deps, deps);
        
        if (_deps.scene) {
            _deps.scene.add(player);
        }
        
        // Set initial position
        const startY = _deps.getHeight(0, 5) + 1.6;
        player.position.set(0, startY, 5);
        
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        const { renderer } = _deps;
        if (!renderer) return;
        
        // Click to lock pointer / attack
        renderer.domElement.addEventListener('click', () => {
            if (_deps.inventoryOpen) return;
            if (!locked) {
                renderer.domElement.requestPointerLock();
            } else if (_deps.startSwing) {
                _deps.startSwing();
            }
        });
        
        // Pointer lock change
        document.addEventListener('pointerlockchange', () => {
            locked = document.pointerLockElement === renderer.domElement;
        });
        
        // Mouse look
        document.addEventListener('mousemove', e => {
            if (!locked || _deps.inventoryOpen) return;
            player.rotation.y -= e.movementX * 0.002;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch - e.movementY * 0.002));
            camera.rotation.x = pitch;
        });
        
        // Mouse wheel - hotbar selection
        document.addEventListener('wheel', e => {
            if (_deps.inventoryOpen) return;
            const s = _deps.InventorySystem ? _deps.InventorySystem.selectedSlot : 0;
            if (_deps.selectSlot) {
                if (e.deltaY > 0) _deps.selectSlot((s + 1) % 9);
                else _deps.selectSlot((s + 8) % 9);
            }
        });
        
        // Keyboard input
        document.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();
            
            // Tab - toggle inventory
            if (k === 'tab') {
                e.preventDefault();
                if (_deps.toggleInventory) _deps.toggleInventory();
                return;
            }
            
            // Escape - close menus or pause
            if (k === 'escape') {
                e.preventDefault();
                if (typeof window.isGamePaused === 'function' && window.isGamePaused()) {
                    if (typeof window.handlePauseEsc === 'function') window.handlePauseEsc();
                    return;
                }
                if (_deps.shopOpen && _deps.closeShop) { _deps.closeShop(); return; }
                if (_deps.currentDialogue && _deps.closeDialogue) { _deps.closeDialogue(); return; }
                if (_deps.inventoryOpen && _deps.toggleInventory) { _deps.toggleInventory(); return; }
                if (_deps.loreBookOpen && _deps.toggleLoreBook) { _deps.toggleLoreBook(); return; }
                if (typeof window.openPauseMenu === 'function') window.openPauseMenu();
                return;
            }
            
            // Skip movement if UI is open
            if (_deps.inventoryOpen || _deps.shopOpen || _deps.currentDialogue) return;
            if (typeof window.isGamePaused === 'function' && window.isGamePaused()) return;
            
            // Movement keys
            if (k === 'w') keys.w = true;
            if (k === 'a') keys.a = true;
            if (k === 's') keys.s = true;
            if (k === 'd') keys.d = true;
            if (k === ' ') {
                if (!keys.space) pMove.spaceJustPressed = true;
                keys.space = true;
                e.preventDefault();
            }
            if (k === 'shift') {
                if (!keys.shift) pMove.shiftJustPressed = true;
                keys.shift = true;
            }
            if (k === 'control' || k === 'c') {
                if (!keys.ctrl) pMove.ctrlJustPressed = true;
                keys.ctrl = true;
            }
            
            // Utility keys
            if (k === 'l') locked ? document.exitPointerLock() : renderer.domElement.requestPointerLock();
            if (k === 't' && _deps.dayNight) _deps.dayNight.gameTime = (_deps.dayNight.gameTime + 1) % 24;
            if (k === 'y' && _deps.weather) _deps.weather.cycle();
            if (k === 'e') {
                if (_deps.handlePOIInteraction) _deps.handlePOIInteraction();
                if (_deps.handleNPCInteraction) _deps.handleNPCInteraction();
            }
            if (k >= '1' && k <= '9' && _deps.selectSlot) _deps.selectSlot(parseInt(k) - 1);
        });
        
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
    },
    
    // Update movement state flags from external sources
    updateFlags(flags) {
        if (flags.inventoryOpen !== undefined) _deps.inventoryOpen = flags.inventoryOpen;
        if (flags.shopOpen !== undefined) _deps.shopOpen = flags.shopOpen;
        if (flags.loreBookOpen !== undefined) _deps.loreBookOpen = flags.loreBookOpen;
        if (flags.currentDialogue !== undefined) _deps.currentDialogue = flags.currentDialogue;
        if (flags.currentInterior !== undefined) _deps.currentInterior = flags.currentInterior;
    },
    
    // Get player position
    getPosition() {
        return player.position.clone();
    },
    
    // Set player position
    setPosition(x, y, z) {
        player.position.set(x, y, z);
    },
    
    // Get player rotation
    getRotation() {
        return player.rotation.y;
    },
    
    // Get camera pitch
    getPitch() {
        return pitch;
    },
    
    // Set camera pitch
    setPitch(value) {
        pitch = value;
        camera.rotation.x = pitch;
    },
    
    // Check if pointer is locked
    isLocked() {
        return locked;
    },
    
    // Request pointer lock
    requestPointerLock() {
        if (_deps.renderer) {
            _deps.renderer.domElement.requestPointerLock();
        }
    },
    
    // Get movement direction from keys
    getMovementDirection() {
        const dir = new THREE.Vector3();
        if (keys.w) dir.z -= 1;
        if (keys.s) dir.z += 1;
        if (keys.a) dir.x -= 1;
        if (keys.d) dir.x += 1;
        return dir.normalize();
    },
    
    // Check if player is moving
    isMoving() {
        return keys.w || keys.a || keys.s || keys.d;
    },
    
    // Check if sprinting
    isSprinting() {
        return keys.shift && this.isMoving();
    },
    
    // Reset just-pressed flags (call after processing)
    resetJustPressed() {
        pMove.spaceJustPressed = false;
        pMove.ctrlJustPressed = false;
        pMove.shiftJustPressed = false;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    PlayerSystem,
    camera,
    player,
    MOVE,
    pMove,
    keys,
    showMoveFeedback
};

export default PlayerSystem;
