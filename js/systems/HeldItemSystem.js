// =============================================================================
// HELDITEMSYSTEM.JS - First-person held item rendering with bobbing/sway
// Dependencies: THREE (global), camera, InventorySystem, CombatSystem
// Consumers: Main game loop (animate)
// =============================================================================

let _deps = {
    camera: null,
    InventorySystem: null,
    CombatSystem: null,
    getPMove: null
};

const HeldItemSystem = (function() {
    // Private state
    let _container = null;     // THREE.Group attached to camera
    let _currentItemId = null; // Track which item model is shown
    let _itemMesh = null;      // Current item mesh

    // Bobbing state
    let _bobTime = 0;
    let _bobAmount = 0;        // Smoothed bobbing intensity
    let _swayTime = 0;         // Idle sway timer

    // Materials (created once)
    let _mats = null;
    function _getMats() {
        if (_mats) return _mats;
        _mats = {
            skin:  new THREE.MeshStandardMaterial({ color: 0xe8b898, roughness: 0.8, metalness: 0 }),
            wood:  new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9, metalness: 0 }),
            metal: new THREE.MeshStandardMaterial({ color: 0xa8a8b0, roughness: 0.4, metalness: 0.7 }),
            blade: new THREE.MeshStandardMaterial({ color: 0xd0d8e0, roughness: 0.25, metalness: 0.85 }),
            guard: new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.5, metalness: 0.6 }),
            grip:  new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.95, metalness: 0 }),
            iron:  new THREE.MeshStandardMaterial({ color: 0x708090, roughness: 0.5, metalness: 0.6 })
        };
        return _mats;
    }

    // Shared geometries
    let _geom = null;
    function _getGeom() {
        if (_geom) return _geom;
        _geom = {
            box: new THREE.BoxGeometry(1, 1, 1),
            cyl: new THREE.CylinderGeometry(1, 1, 1, 6),
            cylTaper: new THREE.CylinderGeometry(0.7, 1, 1, 6),
            sphere: new THREE.SphereGeometry(1, 6, 5)
        };
        return _geom;
    }

    // Build hand model
    function _buildHand() {
        const m = _getMats();
        const g = _getGeom();
        const hand = new THREE.Group();

        // Palm
        const palm = new THREE.Mesh(g.box, m.skin);
        palm.scale.set(0.12, 0.06, 0.14);
        palm.position.set(0, 0, 0);
        hand.add(palm);

        // Fingers (4)
        for (let i = 0; i < 4; i++) {
            const finger = new THREE.Mesh(g.box, m.skin);
            finger.scale.set(0.025, 0.04, 0.08);
            finger.position.set(-0.04 + i * 0.027, 0.01, -0.1);
            finger.rotation.x = -0.2;
            hand.add(finger);
        }

        // Thumb
        const thumb = new THREE.Mesh(g.box, m.skin);
        thumb.scale.set(0.03, 0.04, 0.06);
        thumb.position.set(0.07, 0.01, -0.04);
        thumb.rotation.z = -0.5;
        thumb.rotation.y = -0.3;
        hand.add(thumb);

        // Position hand in view
        hand.position.set(0.35, -0.35, -0.5);
        hand.rotation.set(0.3, -0.2, 0.1);

        return hand;
    }

    // Build pickaxe model
    function _buildPickaxe() {
        const m = _getMats();
        const g = _getGeom();
        const pick = new THREE.Group();

        // Handle
        const handle = new THREE.Mesh(g.cyl, m.wood);
        handle.scale.set(0.02, 0.45, 0.02);
        handle.position.set(0, 0, 0);
        pick.add(handle);

        // Head - horizontal bar
        const headBar = new THREE.Mesh(g.box, m.iron);
        headBar.scale.set(0.22, 0.035, 0.035);
        headBar.position.set(0, 0.22, 0);
        pick.add(headBar);

        // Pick point (right side)
        const point = new THREE.Mesh(g.cylTaper, m.iron);
        point.scale.set(0.02, 0.1, 0.025);
        point.rotation.z = Math.PI / 2;
        point.position.set(0.15, 0.22, 0);
        pick.add(point);

        // Flat end (left side)
        const flat = new THREE.Mesh(g.box, m.iron);
        flat.scale.set(0.04, 0.06, 0.03);
        flat.position.set(-0.13, 0.22, 0);
        pick.add(flat);

        // Grip hand (small fist on handle)
        const grip = new THREE.Mesh(g.sphere, m.skin);
        grip.scale.set(0.035, 0.03, 0.04);
        grip.position.set(0, -0.08, 0.02);
        pick.add(grip);

        // Position in view
        pick.position.set(0.35, -0.45, -0.55);
        pick.rotation.set(0.4, -0.3, -0.6);

        return pick;
    }

    // Build axe model
    function _buildAxe() {
        const m = _getMats();
        const g = _getGeom();
        const axe = new THREE.Group();

        // Handle
        const handle = new THREE.Mesh(g.cyl, m.wood);
        handle.scale.set(0.02, 0.42, 0.02);
        handle.position.set(0, 0, 0);
        axe.add(handle);

        // Axe head - wedge shape using box
        const head = new THREE.Mesh(g.box, m.metal);
        head.scale.set(0.14, 0.12, 0.03);
        head.position.set(0.06, 0.2, 0);
        axe.add(head);

        // Axe blade edge (thinner, shinier)
        const edge = new THREE.Mesh(g.box, m.blade);
        edge.scale.set(0.005, 0.14, 0.035);
        edge.position.set(0.135, 0.2, 0);
        axe.add(edge);

        // Grip hand
        const grip = new THREE.Mesh(g.sphere, m.skin);
        grip.scale.set(0.035, 0.03, 0.04);
        grip.position.set(0, -0.08, 0.02);
        axe.add(grip);

        // Position in view
        axe.position.set(0.35, -0.45, -0.55);
        axe.rotation.set(0.3, -0.3, -0.5);

        return axe;
    }

    // Build sword model
    function _buildSword() {
        const m = _getMats();
        const g = _getGeom();
        const sword = new THREE.Group();

        // Blade
        const blade = new THREE.Mesh(g.box, m.blade);
        blade.scale.set(0.04, 0.35, 0.012);
        blade.position.set(0, 0.22, 0);
        sword.add(blade);

        // Blade center line (fuller)
        const fuller = new THREE.Mesh(g.box, m.metal);
        fuller.scale.set(0.015, 0.28, 0.014);
        fuller.position.set(0, 0.2, 0);
        sword.add(fuller);

        // Blade tip
        const tip = new THREE.Mesh(g.cylTaper, m.blade);
        tip.scale.set(0.02, 0.06, 0.006);
        tip.position.set(0, 0.42, 0);
        sword.add(tip);

        // Cross guard
        const guard = new THREE.Mesh(g.box, m.guard);
        guard.scale.set(0.12, 0.02, 0.025);
        guard.position.set(0, 0.04, 0);
        sword.add(guard);

        // Grip
        const grip = new THREE.Mesh(g.cyl, m.grip);
        grip.scale.set(0.018, 0.1, 0.018);
        grip.position.set(0, -0.02, 0);
        sword.add(grip);

        // Pommel
        const pommel = new THREE.Mesh(g.sphere, m.guard);
        pommel.scale.set(0.02, 0.02, 0.02);
        pommel.position.set(0, -0.08, 0);
        sword.add(pommel);

        // Grip hand
        const hand = new THREE.Mesh(g.sphere, m.skin);
        hand.scale.set(0.035, 0.03, 0.04);
        hand.position.set(0, -0.02, 0.025);
        sword.add(hand);

        // Position in view
        sword.position.set(0.35, -0.4, -0.5);
        sword.rotation.set(0.2, -0.3, -0.3);

        return sword;
    }

    // Item builders map
    const _builders = {
        hand: _buildHand,
        pickaxe: _buildPickaxe,
        axe: _buildAxe,
        sword: _buildSword
    };

    // Base positions for each item (rest position)
    const _basePositions = {
        hand:    { x: 0.35, y: -0.35, z: -0.5 },
        pickaxe: { x: 0.35, y: -0.45, z: -0.55 },
        axe:     { x: 0.35, y: -0.45, z: -0.55 },
        sword:   { x: 0.35, y: -0.4,  z: -0.5 }
    };

    const _baseRotations = {
        hand:    { x: 0.3,  y: -0.2, z: 0.1 },
        pickaxe: { x: 0.4,  y: -0.3, z: -0.6 },
        axe:     { x: 0.3,  y: -0.3, z: -0.5 },
        sword:   { x: 0.2,  y: -0.3, z: -0.3 }
    };

    return {
        init(deps) {
            Object.assign(_deps, deps);

            // Create container group and add to camera
            _container = new THREE.Group();
            _container.renderOrder = 999;
            _deps.camera.add(_container);

            // Show initial item
            this.updateItem();
        },

        updateItem() {
            const { InventorySystem } = _deps;
            if (!InventorySystem) return;

            const item = InventorySystem.getSelectedItem();
            const itemId = item ? item.id : 'hand';

            if (itemId === _currentItemId) return;

            // Remove old mesh
            if (_itemMesh) {
                _container.remove(_itemMesh);
                _itemMesh = null;
            }

            // Build new mesh
            const builder = _builders[itemId] || _builders.hand;
            _itemMesh = builder();
            _container.add(_itemMesh);
            _currentItemId = itemId;
        },

        setVisible(visible) {
            if (_container) _container.visible = visible;
        },

        update(delta) {
            // Check for slot change
            this.updateItem();
            if (!_itemMesh || !_currentItemId) return;

            const { CombatSystem, getPMove } = _deps;
            const pMove = getPMove ? getPMove() : null;
            const basePos = _basePositions[_currentItemId] || _basePositions.hand;
            const baseRot = _baseRotations[_currentItemId] || _baseRotations.hand;

            // Calculate movement speed for bobbing intensity
            let moveSpeed = 0;
            if (pMove) {
                moveSpeed = pMove.currentSpeed || 0;
            }

            // Smooth bob amount
            const targetBob = Math.min(moveSpeed * 0.15, 1.0);
            _bobAmount += (targetBob - _bobAmount) * 4 * delta;

            // Bob time advances with movement
            if (_bobAmount > 0.01) {
                _bobTime += delta * (6 + moveSpeed * 0.8);
            }

            // Idle sway (always)
            _swayTime += delta;

            // Calculate bob offsets
            const bobX = Math.sin(_bobTime) * 0.012 * _bobAmount;
            const bobY = Math.abs(Math.sin(_bobTime * 2)) * 0.018 * _bobAmount;

            // Idle sway offsets
            const swayX = Math.sin(_swayTime * 1.2) * 0.003;
            const swayY = Math.sin(_swayTime * 0.8) * 0.002;
            const swayRot = Math.sin(_swayTime * 1.0) * 0.015;

            // Swing animation
            let swingRotX = 0;
            let swingRotZ = 0;
            let swingPosY = 0;

            if (CombatSystem && CombatSystem.isSwinging()) {
                const progress = CombatSystem.getSwingProgress();
                // Swing arc: wind up -> strike -> recover
                if (progress < 0.3) {
                    // Wind up
                    const t = progress / 0.3;
                    swingRotX = -0.8 * t;
                    swingPosY = 0.05 * t;
                } else if (progress < 0.6) {
                    // Strike
                    const t = (progress - 0.3) / 0.3;
                    swingRotX = -0.8 + 1.6 * t;
                    swingRotZ = -0.4 * t;
                    swingPosY = 0.05 - 0.1 * t;
                } else {
                    // Recover
                    const t = (progress - 0.6) / 0.4;
                    swingRotX = 0.8 * (1 - t);
                    swingRotZ = -0.4 * (1 - t);
                    swingPosY = -0.05 * (1 - t);
                }
            }

            // Apply position
            _itemMesh.position.set(
                basePos.x + bobX + swayX,
                basePos.y + bobY + swayY + swingPosY,
                basePos.z
            );

            // Apply rotation
            _itemMesh.rotation.set(
                baseRot.x + swingRotX,
                baseRot.y + swayRot,
                baseRot.z + swingRotZ
            );
        },

        getContainer() { return _container; }
    };
})();

export { HeldItemSystem };
export default HeldItemSystem;
