// =============================================================================
// HELDITEMSYSTEM.JS - First-person held item rendering with bobbing/sway
// Direct port from Original_HTML_Build/game-windwaker-inventory.html
// Dependencies: THREE, camera, InventorySystem, CombatSystem
// Consumers: Main game loop (animate)
// =============================================================================

import * as THREE from 'three';

let _deps = {
    camera: null,
    InventorySystem: null,
    CombatSystem: null,
    getKeys: null,
    getTime: null,
    getPlayer: null
};

const HeldItemSystem = (function() {
    // Private state
    let _heldItemGroup = null;
    let _currentHeldMesh = null;
    let _toolMeshes = null;
    let _toolMats = null;

    // Rest position for held item (from HTML build)
    const _restPosition = new THREE.Vector3(0.38, -0.32, -0.55);
    const _restRotation = new THREE.Euler(0, 0, 0);

    // === TOOL MATERIALS - exact port from HTML build ===
    function _getToolMats() {
        if (_toolMats) return _toolMats;
        _toolMats = {
            // Hand - warm cartoon skin tones
            hand: new THREE.MeshStandardMaterial({ color: 0xe8b898, flatShading: true, roughness: 0.8 }),
            handShadow: new THREE.MeshStandardMaterial({ color: 0xc49878, flatShading: true, roughness: 0.8 }),
            handNail: new THREE.MeshStandardMaterial({ color: 0xf5d0b8, flatShading: true, roughness: 0.7 }),

            // Wood - rich warm browns
            wood: new THREE.MeshStandardMaterial({ color: 0x8a5a30, flatShading: true, roughness: 0.9 }),
            woodDark: new THREE.MeshStandardMaterial({ color: 0x5a3820, flatShading: true, roughness: 0.9 }),
            woodLight: new THREE.MeshStandardMaterial({ color: 0xb87a48, flatShading: true, roughness: 0.85 }),

            // Metal - stylized steel with slight blue tint
            metal: new THREE.MeshStandardMaterial({ color: 0x8898a8, flatShading: true, roughness: 0.4, metalness: 0.6 }),
            metalShine: new THREE.MeshStandardMaterial({ color: 0xb8c8d8, flatShading: true, roughness: 0.3, metalness: 0.7 }),
            metalDark: new THREE.MeshStandardMaterial({ color: 0x606878, flatShading: true, roughness: 0.5, metalness: 0.5 }),

            // Blade - bright polished steel
            blade: new THREE.MeshStandardMaterial({ color: 0xd0d8e0, flatShading: true, emissive: 0x404858, emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.8 }),
            bladeEdge: new THREE.MeshStandardMaterial({ color: 0xf0f4f8, flatShading: true, emissive: 0x606878, emissiveIntensity: 0.2, roughness: 0.15, metalness: 0.85 }),

            // Gold - warm saturated yellow
            gold: new THREE.MeshStandardMaterial({ color: 0xe8c040, flatShading: true, emissive: 0x805010, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.8 }),

            // Leather - rich dark brown
            leather: new THREE.MeshStandardMaterial({ color: 0x6a4028, flatShading: true, roughness: 0.95 }),
            leatherWrap: new THREE.MeshStandardMaterial({ color: 0x483020, flatShading: true, roughness: 0.95 }),

            // Gem - for sword pommel
            ruby: new THREE.MeshStandardMaterial({ color: 0xc03040, flatShading: true, emissive: 0x801020, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.3 })
        };
        return _toolMats;
    }

    // === HAND - exact port from HTML build ===
    function createHand() {
        const m = _getToolMats();
        const hand = new THREE.Group();

        // Wrist/forearm section
        const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 6), m.hand);
        wrist.position.set(0, -0.12, 0);
        hand.add(wrist);

        // Wrist cuff - decorative bracer
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 6), m.leather);
        cuff.position.set(0, -0.08, 0);
        hand.add(cuff);

        // Cuff trim top
        const cuffTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 6), m.gold);
        cuffTrim.position.set(0, -0.055, 0);
        hand.add(cuffTrim);

        // Cuff trim bottom
        const cuffTrim2 = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 6), m.gold);
        cuffTrim2.position.set(0, -0.105, 0);
        hand.add(cuffTrim2);

        // Palm - chunky box
        const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.055), m.hand);
        palm.position.set(0, 0.01, 0);
        hand.add(palm);

        // Palm back side (darker)
        const palmBack = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 0.02), m.handShadow);
        palmBack.position.set(0, 0.01, -0.025);
        hand.add(palmBack);

        // Palm heel pad
        const palmHeel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), m.hand);
        palmHeel.scale.set(1.2, 0.6, 0.8);
        palmHeel.position.set(0, -0.04, 0.02);
        hand.add(palmHeel);

        // Chunky cartoon fingers - 3 segments each
        const fingerLengths = [0.055, 0.065, 0.06, 0.05];
        const fingerWidths = [0.022, 0.024, 0.024, 0.022];
        for (let i = 0; i < 4; i++) {
            const xPos = -0.038 + i * 0.026;
            const len = fingerLengths[i];
            const wid = fingerWidths[i];

            // Knuckle bump
            const knuckle = new THREE.Mesh(new THREE.SphereGeometry(wid * 0.6, 4, 3), m.hand);
            knuckle.position.set(xPos, 0.065, 0.01);
            hand.add(knuckle);

            // Finger base (proximal)
            const fingerBase = new THREE.Mesh(new THREE.BoxGeometry(wid, len, wid * 0.9), m.hand);
            fingerBase.position.set(xPos, 0.065 + len/2, 0);
            hand.add(fingerBase);

            // Finger middle joint
            const midJoint = new THREE.Mesh(new THREE.SphereGeometry(wid * 0.45, 4, 3), m.hand);
            midJoint.position.set(xPos, 0.065 + len, 0);
            hand.add(midJoint);

            // Finger middle (medial)
            const fingerMid = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.9, len * 0.65, wid * 0.85), m.hand);
            fingerMid.position.set(xPos, 0.065 + len + len * 0.32, 0);
            hand.add(fingerMid);

            // Finger tip (distal)
            const fingerTip = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.8, len * 0.45, wid * 0.8), m.hand);
            fingerTip.position.set(xPos, 0.065 + len + len * 0.65 + len * 0.22, 0);
            hand.add(fingerTip);

            // Fingernail
            const nail = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.65, 0.012, wid * 0.5), m.handNail);
            nail.position.set(xPos, 0.065 + len + len * 0.65 + len * 0.4, 0.01);
            hand.add(nail);
        }

        // Chunky thumb with 3 segments
        const thumbMeta = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.035, 0.025), m.hand);
        thumbMeta.position.set(0.058, 0.005, 0.018);
        thumbMeta.rotation.z = -0.4;
        hand.add(thumbMeta);

        const thumbBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.04, 0.024), m.hand);
        thumbBase.position.set(0.075, 0.035, 0.02);
        thumbBase.rotation.z = -0.5;
        hand.add(thumbBase);

        const thumbJoint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), m.hand);
        thumbJoint.position.set(0.088, 0.058, 0.02);
        hand.add(thumbJoint);

        const thumbTip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.022), m.hand);
        thumbTip.position.set(0.095, 0.08, 0.02);
        thumbTip.rotation.z = -0.6;
        hand.add(thumbTip);

        const thumbNail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.01, 0.012), m.handNail);
        thumbNail.position.set(0.102, 0.095, 0.028);
        thumbNail.rotation.z = -0.6;
        hand.add(thumbNail);

        hand.rotation.set(-0.25, 0, 0.08);
        return hand;
    }

    // === PICKAXE - exact port from HTML build ===
    function createPickaxe() {
        const m = _getToolMats();
        const pick = new THREE.Group();

        // Handle - octagonal chunky wood with taper
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.034, 0.6, 6), m.wood);
        handle.rotation.x = Math.PI/2;
        handle.position.z = 0.12;
        pick.add(handle);

        // Handle end cap (pommel)
        const pommelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.025, 6), m.woodDark);
        pommelCap.rotation.x = Math.PI/2;
        pommelCap.position.z = 0.42;
        pick.add(pommelCap);

        // Pommel decoration
        const pommelDeco = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), m.metal);
        pommelDeco.position.z = 0.44;
        pick.add(pommelDeco);

        // Wood grain rings
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.027 + i*0.002, 0.027 + i*0.002, 0.012, 6), m.woodDark);
            ring.rotation.x = Math.PI/2;
            ring.position.z = 0.08 + i * 0.12;
            pick.add(ring);
        }

        // Leather grip wrap
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.16, 6), m.leather);
        grip.rotation.x = Math.PI/2;
        grip.position.z = 0.30;
        pick.add(grip);

        // Grip wrap bands
        for (let i = 0; i < 5; i++) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.01, 6), m.leatherWrap);
            band.rotation.x = Math.PI/2;
            band.position.z = 0.23 + i * 0.035;
            pick.add(band);
        }

        // Metal head collar
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.065, 6), m.metal);
        collar.rotation.x = Math.PI/2;
        collar.position.z = -0.14;
        pick.add(collar);

        // Collar rivets
        for (let i = 0; i < 4; i++) {
            const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), m.metalShine);
            const angle = (i / 4) * Math.PI * 2;
            rivet.position.set(Math.cos(angle) * 0.045, Math.sin(angle) * 0.045, -0.14);
            pick.add(rivet);
        }

        // Main head - chunky T-block
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.05), m.metal);
        head.position.set(0, 0, -0.15);
        pick.add(head);

        // Head top bevel
        const headTop = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.018, 0.045), m.metalShine);
        headTop.position.set(0, 0.035, -0.15);
        pick.add(headTop);

        // Head bottom shadow
        const headBottom = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.015, 0.045), m.metalDark);
        headBottom.position.set(0, -0.032, -0.15);
        pick.add(headBottom);

        // Pick point - sharper cone with detail
        const pointBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.045), m.metal);
        pointBase.position.set(0.16, 0, -0.15);
        pick.add(pointBase);

        const point = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 4), m.blade);
        point.rotation.z = -Math.PI/2;
        point.position.set(0.26, 0, -0.15);
        pick.add(point);

        // Point edge shine
        const pointShine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.008), m.bladeEdge);
        pointShine.position.set(0.24, 0.025, -0.15);
        pointShine.rotation.z = -0.12;
        pick.add(pointShine);

        // Back hammer
        const hammerBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055, 0.048), m.metal);
        hammerBase.position.set(-0.16, 0, -0.15);
        pick.add(hammerBase);

        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.06), m.metal);
        hammer.position.set(-0.20, 0, -0.15);
        pick.add(hammer);

        // Hammer striking face
        const hammerFace = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.05), m.metalDark);
        hammerFace.position.set(-0.235, 0, -0.15);
        pick.add(hammerFace);

        // Hammer top bevel
        const hammerTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.055), m.metalShine);
        hammerTop.position.set(-0.20, 0.038, -0.15);
        pick.add(hammerTop);

        pick.rotation.set(0.35, -0.25, 0.45);
        return pick;
    }

    // === AXE - exact port from HTML build ===
    function createAxe() {
        const m = _getToolMats();
        const axe = new THREE.Group();

        // Handle - tapered chunky wood
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.038, 0.68, 6), m.wood);
        handle.rotation.x = Math.PI/2;
        handle.position.z = 0.2;
        axe.add(handle);

        // Handle pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), m.woodDark);
        pommel.scale.set(1, 0.8, 1);
        pommel.position.z = 0.55;
        axe.add(pommel);

        // Pommel ring
        const pommelRing = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.015, 6), m.metal);
        pommelRing.rotation.x = Math.PI/2;
        pommelRing.position.z = 0.52;
        axe.add(pommelRing);

        // Wood grain rings
        for (let i = 0; i < 4; i++) {
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.026 + i*0.003, 0.026 + i*0.003, 0.014, 6), m.woodDark);
            ring.rotation.x = Math.PI/2;
            ring.position.z = 0.02 + i * 0.14;
            axe.add(ring);
        }

        // Leather grip wrap
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.18, 6), m.leather);
        grip.rotation.x = Math.PI/2;
        grip.position.z = 0.42;
        axe.add(grip);

        // Grip cross-wrap bands
        for (let i = 0; i < 6; i++) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.008, 6), m.leatherWrap);
            band.rotation.x = Math.PI/2;
            band.position.z = 0.34 + i * 0.03;
            axe.add(band);
        }

        // Metal head collar
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.075, 6), m.metal);
        collar.rotation.x = Math.PI/2;
        collar.position.z = -0.12;
        axe.add(collar);

        // Collar decorative band
        const collarBand = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.018, 6), m.metalShine);
        collarBand.rotation.x = Math.PI/2;
        collarBand.position.z = -0.10;
        axe.add(collarBand);

        // Collar rivets
        for (let i = 0; i < 4; i++) {
            const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), m.gold);
            const angle = (i / 4) * Math.PI * 2 + Math.PI/4;
            rivet.position.set(Math.cos(angle) * 0.052, Math.sin(angle) * 0.052, -0.12);
            axe.add(rivet);
        }

        // Axe blade back
        const bladeBack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.065), m.metal);
        bladeBack.position.set(0.025, 0, -0.12);
        axe.add(bladeBack);

        // Main blade - wedge shape
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.075), m.blade);
        blade.position.set(0.055, 0, -0.12);
        axe.add(blade);

        // Blade cutting edge
        const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.24, 0.055), m.bladeEdge);
        bladeEdge.position.set(0.09, 0, -0.12);
        axe.add(bladeEdge);

        // Blade bevel top
        const bladeBevelTop = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.015, 0.06), m.metalShine);
        bladeBevelTop.position.set(0.05, 0.115, -0.12);
        axe.add(bladeBevelTop);

        // Blade bevel bottom
        const bladeBevelBottom = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.015, 0.06), m.metalDark);
        bladeBevelBottom.position.set(0.05, -0.115, -0.12);
        axe.add(bladeBevelBottom);

        // Blade decorative notch/beard
        const notch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.018), m.metalDark);
        notch.position.set(0.035, -0.085, -0.12);
        axe.add(notch);

        // Blade spine
        const spineTop = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.07), m.metal);
        spineTop.position.set(0.02, 0.09, -0.12);
        axe.add(spineTop);

        // Eye hole decoration
        const eyeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 6), m.metalDark);
        eyeRing.rotation.x = Math.PI/2;
        eyeRing.position.z = -0.12;
        axe.add(eyeRing);

        axe.rotation.set(0.45, -0.35, 0.35);
        return axe;
    }

    // === SWORD - exact port from HTML build ===
    function createSword() {
        const m = _getToolMats();
        const sword = new THREE.Group();

        // Pommel - ornate decorative end cap
        const pommelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.03, 6), m.gold);
        pommelBase.rotation.x = Math.PI/2;
        pommelBase.position.z = 0.25;
        sword.add(pommelBase);

        const pommelGeo = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), m.gold);
        pommelGeo.position.z = 0.28;
        sword.add(pommelGeo);

        // Pommel gem (ruby)
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), m.ruby);
        gem.position.z = 0.30;
        sword.add(gem);

        // Pommel decorative rings
        const pommelRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 4, 8), m.gold);
        pommelRing.position.z = 0.26;
        sword.add(pommelRing);

        // Grip - leather wrapped
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.17, 6), m.leather);
        grip.rotation.x = Math.PI/2;
        grip.position.z = 0.145;
        sword.add(grip);

        // Grip spiral wrap pattern
        for (let i = 0; i < 7; i++) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.007, 6), m.leatherWrap);
            band.rotation.x = Math.PI/2;
            band.position.z = 0.065 + i * 0.025;
            sword.add(band);
        }

        // Grip ferrule
        const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.030, 0.02, 6), m.gold);
        ferrule.rotation.x = Math.PI/2;
        ferrule.position.z = 0.055;
        sword.add(ferrule);

        // Crossguard base block
        const guardBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.05), m.gold);
        guardBase.position.z = 0.035;
        sword.add(guardBase);

        // Crossguard
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.035), m.gold);
        guard.position.z = 0.04;
        sword.add(guard);

        // Guard wing curves (left)
        const guardWingL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.03), m.gold);
        guardWingL.position.set(-0.085, 0.01, 0.04);
        guardWingL.rotation.z = 0.3;
        sword.add(guardWingL);

        // Guard wing curves (right)
        const guardWingR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.03), m.gold);
        guardWingR.position.set(0.085, 0.01, 0.04);
        guardWingR.rotation.z = -0.3;
        sword.add(guardWingR);

        // Guard end spheres
        const guardEnd1 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), m.gold);
        guardEnd1.position.set(0.105, 0.02, 0.04);
        sword.add(guardEnd1);

        const guardEnd2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), m.gold);
        guardEnd2.position.set(-0.105, 0.02, 0.04);
        sword.add(guardEnd2);

        // Guard center decorative gem holder
        const guardCenter = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), m.gold);
        guardCenter.position.z = 0.025;
        sword.add(guardCenter);

        // Guard center gem
        const guardGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), m.ruby);
        guardGem.position.set(0, 0.025, 0.025);
        sword.add(guardGem);

        // Blade ricasso
        const ricasso = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.016, 0.08), m.metal);
        ricasso.position.z = -0.025;
        sword.add(ricasso);

        // Main blade
        const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.015, 0.42), m.blade);
        bladeMesh.position.z = -0.23;
        sword.add(bladeMesh);

        // Blade center fuller/ridge
        const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.35), m.metalShine);
        fuller.position.set(0, 0, -0.19);
        sword.add(fuller);

        // Blade edges
        const edge1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.40), m.bladeEdge);
        edge1.position.set(0.028, 0, -0.21);
        sword.add(edge1);

        const edge2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.40), m.bladeEdge);
        edge2.position.set(-0.028, 0, -0.21);
        sword.add(edge2);

        // Blade spine top highlight
        const spineTopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.38), m.metalShine);
        spineTopMesh.position.set(0, 0.01, -0.20);
        sword.add(spineTopMesh);

        // Blade decorative engravings
        for (let i = 0; i < 3; i++) {
            const engraving = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.04), m.metalDark);
            engraving.position.set(0, 0.005, -0.08 - i * 0.12);
            sword.add(engraving);
        }

        // Blade tip - pointed diamond shape
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 4), m.blade);
        tip.rotation.x = -Math.PI/2;
        tip.position.z = -0.50;
        sword.add(tip);

        // Tip edge shine
        const tipShine = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.08, 4), m.bladeEdge);
        tipShine.rotation.x = -Math.PI/2;
        tipShine.position.z = -0.52;
        sword.add(tipShine);

        sword.rotation.set(0.15, -0.15, 0.25);
        return sword;
    }

    // === EASING FUNCTIONS - exact port from HTML build ===
    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    function easeInQuad(t) { return t * t; }
    function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }

    // === SWING ANIMATION - exact port from HTML build updateSwing() ===
    function _updateSwing(delta) {
        const { CombatSystem, InventorySystem } = _deps;
        if (!CombatSystem || !CombatSystem.isSwinging()) return;

        const item = InventorySystem ? InventorySystem.getSelectedItem() : null;
        const itemId = item ? item.id : 'hand';
        const itemType = item ? item.type : 'hand';

        // Use CombatSystem for swing speed calculation
        const swingProgress = CombatSystem.updateSwingProgress(delta, itemId, itemType);
        const p = Math.min(swingProgress, 1);
        const g = _heldItemGroup;
        const rp = _restPosition;

        if (itemType === 'hand') {
            // HAND - Punch animation
            if (p < 0.3) {
                const t = easeOutQuad(p / 0.3);
                g.rotation.x = -0.25 - t * 0.4;
                g.rotation.z = t * 0.15;
                g.position.z = rp.z + t * 0.08;
            } else if (p < 0.6) {
                const t = easeOutBack((p - 0.3) / 0.3);
                g.rotation.x = -0.65 + t * 0.8;
                g.rotation.z = 0.15 - t * 0.15;
                g.position.z = rp.z + 0.08 - t * 0.18;
                g.position.y = rp.y + t * 0.05;
            } else {
                const t = easeOutQuad((p - 0.6) / 0.4);
                g.rotation.x = 0.15 - t * 0.15;
                g.rotation.z = 0;
                g.position.z = rp.z - 0.10 + t * 0.10;
                g.position.y = rp.y + 0.05 - t * 0.05;
            }
        } else if (itemId === 'mace') {
            // MACE - Holy overhead smash (Paladin)
            if (p < 0.35) {
                const t = easeOutQuad(p / 0.35);
                g.rotation.x = 0.2 + t * 1.8;
                g.rotation.z = 0.25 - t * 0.1;
                g.position.y = rp.y + t * 0.35;
                g.position.z = rp.z + t * 0.1;
            } else if (p < 0.55) {
                const t = easeInQuad((p - 0.35) / 0.2);
                g.rotation.x = 2.0 - t * 2.5;
                g.position.y = rp.y + 0.35 - t * 0.6;
                g.position.z = rp.z + 0.1 - t * 0.25;
            } else {
                const t = easeOutQuad((p - 0.55) / 0.45);
                const holy = Math.sin(t * Math.PI * 2) * (1 - t) * 0.1;
                g.rotation.x = -0.5 + t * 0.7 + holy;
                g.position.y = rp.y - 0.25 + t * 0.25 + holy;
                g.position.z = rp.z - 0.15 + t * 0.15;
            }
        } else if (itemId === 'flintlock') {
            // FLINTLOCK - Aim, fire, recoil (Machinist)
            if (p < 0.4) {
                const t = easeOutQuad(p / 0.4);
                g.rotation.x = 0.15 - t * 0.4;
                g.rotation.y = t * 0.1;
                g.position.y = rp.y + t * 0.15;
                g.position.z = rp.z - t * 0.1;
                g.position.x = rp.x - t * 0.1;
            } else if (p < 0.5) {
                const t = easeOutBack((p - 0.4) / 0.1);
                g.rotation.x = -0.25 + t * 0.6;
                g.position.z = rp.z - 0.1 + t * 0.15;
                g.position.y = rp.y + 0.15 + t * 0.1;
            } else {
                const t = easeOutQuad((p - 0.5) / 0.5);
                g.rotation.x = 0.35 - t * 0.35;
                g.rotation.y = 0.1 - t * 0.1;
                g.position.y = rp.y + 0.25 - t * 0.25;
                g.position.z = rp.z + 0.05 - t * 0.05;
                g.position.x = rp.x - 0.1 + t * 0.1;
            }
        } else if (itemId === 'lance') {
            // LANCE - Charging thrust (Dragoon)
            if (p < 0.25) {
                const t = easeOutQuad(p / 0.25);
                g.rotation.x = 0.1 - t * 0.2;
                g.position.z = rp.z + t * 0.2;
                g.position.y = rp.y - t * 0.05;
            } else if (p < 0.5) {
                const t = easeOutBack((p - 0.25) / 0.25);
                g.rotation.x = -0.1 + t * 0.15;
                g.position.z = rp.z + 0.2 - t * 0.45;
                g.position.y = rp.y - 0.05 + t * 0.1;
            } else if (p < 0.7) {
                g.position.z = rp.z - 0.25;
                g.rotation.x = 0.05;
            } else {
                const t = easeOutQuad((p - 0.7) / 0.3);
                g.position.z = rp.z - 0.25 + t * 0.25;
                g.rotation.x = 0.05 - t * 0.05;
                g.position.y = rp.y + 0.05 - t * 0.05;
            }
        } else if (itemId === 'longbow') {
            // LONGBOW - Draw, aim, release (Ranger)
            if (p < 0.45) {
                const t = easeOutQuad(p / 0.45);
                g.rotation.y = t * 0.3;
                g.rotation.z = 0.1 - t * 0.15;
                g.position.x = rp.x - t * 0.15;
                g.position.z = rp.z + t * 0.08;
            } else if (p < 0.55) {
                const t = easeOutBack((p - 0.45) / 0.1);
                g.rotation.y = 0.3 - t * 0.2;
                g.position.x = rp.x - 0.15 + t * 0.08;
                g.rotation.z = -0.05 + t * 0.1;
            } else {
                const t = easeOutQuad((p - 0.55) / 0.45);
                g.rotation.y = 0.1 - t * 0.1;
                g.rotation.z = 0.05 + t * 0.05;
                g.position.x = rp.x - 0.07 + t * 0.07;
                g.position.z = rp.z + 0.08 - t * 0.08;
            }
        } else if (itemId === 'katana') {
            // KATANA - Lightning-fast iaijutsu slash (Samurai)
            if (p < 0.15) {
                const t = easeOutQuad(p / 0.15);
                g.rotation.y = t * 0.8;
                g.rotation.z = 0.15 + t * 0.3;
                g.position.x = rp.x + t * 0.2;
            } else if (p < 0.35) {
                const t = easeOutBack((p - 0.15) / 0.2);
                g.rotation.y = 0.8 - t * 1.8;
                g.rotation.z = 0.45 - t * 0.6;
                g.rotation.x = t * 0.2;
                g.position.x = rp.x + 0.2 - t * 0.5;
                g.position.z = rp.z - t * 0.15;
            } else if (p < 0.5) {
                g.rotation.y = -1.0;
                g.rotation.z = -0.15;
                g.position.x = rp.x - 0.3;
            } else {
                const t = easeOutQuad((p - 0.5) / 0.5);
                g.rotation.y = -1.0 + t * 1.0;
                g.rotation.z = -0.15 + t * 0.4;
                g.rotation.x = 0.2 - t * 0.2;
                g.position.x = rp.x - 0.3 + t * 0.3;
                g.position.z = rp.z - 0.15 + t * 0.15;
            }
        } else if (itemId === 'staff') {
            // STAFF - Channel and release magic blast (Mage)
            if (p < 0.4) {
                const t = easeOutQuad(p / 0.4);
                g.rotation.x = 0.15 + t * 0.4;
                g.rotation.z = 0.2 - t * 0.3;
                g.position.y = rp.y + t * 0.15;
                g.position.z = rp.z - t * 0.1;
                const vibe = Math.sin(p * 50) * 0.01 * t;
                g.position.x = rp.x + vibe;
            } else if (p < 0.55) {
                const t = easeOutBack((p - 0.4) / 0.15);
                g.rotation.x = 0.55 - t * 0.8;
                g.position.y = rp.y + 0.15 + t * 0.1;
                g.position.z = rp.z - 0.1 - t * 0.15;
            } else {
                const t = easeOutQuad((p - 0.55) / 0.45);
                g.rotation.x = -0.25 + t * 0.25;
                g.rotation.z = -0.1 + t * 0.3;
                g.position.y = rp.y + 0.25 - t * 0.25;
                g.position.z = rp.z - 0.25 + t * 0.25;
            }
        } else if (itemId === 'broadsword') {
            // BROADSWORD - Heavy two-handed cleave (Knight)
            if (p < 0.4) {
                const t = easeOutQuad(p / 0.4);
                g.rotation.x = 0.15 + t * 1.2;
                g.rotation.y = t * 0.5;
                g.rotation.z = 0.22 + t * 0.4;
                g.position.y = rp.y + t * 0.3;
                g.position.x = rp.x + t * 0.15;
            } else if (p < 0.65) {
                const t = easeInQuad((p - 0.4) / 0.25);
                g.rotation.x = 1.35 - t * 1.8;
                g.rotation.y = 0.5 - t * 1.0;
                g.rotation.z = 0.62 - t * 0.8;
                g.position.y = rp.y + 0.3 - t * 0.55;
                g.position.x = rp.x + 0.15 - t * 0.35;
                g.position.z = rp.z - t * 0.15;
            } else {
                const t = easeOutQuad((p - 0.65) / 0.35);
                const shake = Math.sin(t * Math.PI * 2) * (1 - t) * 0.05;
                g.rotation.x = -0.45 + t * 0.45 + shake;
                g.rotation.y = -0.5 + t * 0.5;
                g.rotation.z = -0.18 + t * 0.4;
                g.position.y = rp.y - 0.25 + t * 0.25;
                g.position.x = rp.x - 0.2 + t * 0.2;
                g.position.z = rp.z - 0.15 + t * 0.15;
            }
        } else if (itemId === 'dagger') {
            // DAGGER - Quick double stab (Thief)
            if (p < 0.2) {
                const t = easeOutQuad(p / 0.2);
                g.rotation.x = 0.15 - t * 0.3;
                g.position.z = rp.z + t * 0.1;
            } else if (p < 0.35) {
                const t = easeOutBack((p - 0.2) / 0.15);
                g.rotation.x = -0.15 + t * 0.4;
                g.position.z = rp.z + 0.1 - t * 0.25;
            } else if (p < 0.5) {
                const t = easeOutQuad((p - 0.35) / 0.15);
                g.rotation.x = 0.25 - t * 0.4;
                g.rotation.y = t * 0.3;
                g.position.z = rp.z - 0.15 + t * 0.2;
                g.position.x = rp.x + t * 0.1;
            } else if (p < 0.7) {
                const t = easeOutBack((p - 0.5) / 0.2);
                g.rotation.x = -0.15 + t * 0.35;
                g.rotation.y = 0.3 - t * 0.5;
                g.position.z = rp.z + 0.05 - t * 0.22;
                g.position.x = rp.x + 0.1 - t * 0.15;
            } else {
                const t = easeOutQuad((p - 0.7) / 0.3);
                g.rotation.x = 0.2 - t * 0.2;
                g.rotation.y = -0.2 + t * 0.2;
                g.position.z = rp.z - 0.17 + t * 0.17;
                g.position.x = rp.x - 0.05 + t * 0.05;
            }
        } else if (itemType === 'weapon') {
            // DEFAULT SWORD - Horizontal slash animation
            if (p < 0.25) {
                const t = easeOutQuad(p / 0.25);
                g.rotation.y = t * 0.6;
                g.rotation.z = 0.25 + t * 0.4;
                g.rotation.x = 0.15 - t * 0.3;
                g.position.x = rp.x + t * 0.15;
                g.position.z = rp.z + t * 0.05;
            } else if (p < 0.55) {
                const t = easeOutBack((p - 0.25) / 0.3);
                g.rotation.y = 0.6 - t * 1.4;
                g.rotation.z = 0.65 - t * 0.8;
                g.rotation.x = -0.15 + t * 0.25;
                g.position.x = rp.x + 0.15 - t * 0.35;
                g.position.y = rp.y - t * 0.08;
                g.position.z = rp.z + 0.05 - t * 0.12;
            } else {
                const t = easeOutQuad((p - 0.55) / 0.45);
                g.rotation.y = -0.8 + t * 0.8;
                g.rotation.z = -0.15 + t * 0.4;
                g.rotation.x = 0.1 - t * 0.1;
                g.position.x = rp.x - 0.20 + t * 0.20;
                g.position.y = rp.y - 0.08 + t * 0.08;
                g.position.z = rp.z - 0.07 + t * 0.07;
            }
        } else if (itemId === 'pickaxe') {
            // PICKAXE - Overhead mining swing
            if (p < 0.35) {
                const t = easeOutQuad(p / 0.35);
                g.rotation.x = 0.35 + t * 1.4;
                g.rotation.z = 0.45 - t * 0.2;
                g.position.y = rp.y + t * 0.25;
                g.position.z = rp.z + t * 0.15;
            } else if (p < 0.6) {
                const t = easeInQuad((p - 0.35) / 0.25);
                g.rotation.x = 1.75 - t * 2.0;
                g.rotation.z = 0.25;
                g.position.y = rp.y + 0.25 - t * 0.45;
                g.position.z = rp.z + 0.15 - t * 0.25;
            } else {
                const t = easeOutQuad((p - 0.6) / 0.4);
                const bounce = Math.sin(t * Math.PI * 2) * (1 - t) * 0.15;
                g.rotation.x = -0.25 + bounce + t * 0.6;
                g.rotation.z = 0.25 + bounce * 0.5 + t * 0.2;
                g.position.y = rp.y - 0.20 + bounce * 0.5 + t * 0.20;
                g.position.z = rp.z - 0.10 + t * 0.10;
            }
        } else {
            // AXE - Side chop animation (default tool)
            if (p < 0.3) {
                const t = easeOutQuad(p / 0.3);
                g.rotation.x = 0.45 - t * 0.3;
                g.rotation.y = -0.35 - t * 0.5;
                g.rotation.z = 0.35 + t * 0.4;
                g.position.x = rp.x + t * 0.12;
                g.position.y = rp.y + t * 0.10;
            } else if (p < 0.55) {
                const t = easeOutBack((p - 0.3) / 0.25);
                g.rotation.x = 0.15 + t * 0.8;
                g.rotation.y = -0.85 + t * 1.0;
                g.rotation.z = 0.75 - t * 0.6;
                g.position.x = rp.x + 0.12 - t * 0.22;
                g.position.y = rp.y + 0.10 - t * 0.28;
                g.position.z = rp.z - t * 0.12;
            } else {
                const t = easeOutQuad((p - 0.55) / 0.45);
                const shake = Math.sin(t * Math.PI * 3) * (1 - t) * 0.08;
                g.rotation.x = 0.95 - t * 0.50 + shake;
                g.rotation.y = 0.15 - t * 0.50 + shake;
                g.rotation.z = 0.15 + t * 0.20;
                g.position.x = rp.x - 0.10 + t * 0.10;
                g.position.y = rp.y - 0.18 + t * 0.18;
                g.position.z = rp.z - 0.12 + t * 0.12;
            }
        }

        // Apply damage at the right moment for each weapon (exact from HTML build)
        const impactTimes = { mace: 0.52, flintlock: 0.48, lance: 0.45, longbow: 0.52, katana: 0.30, staff: 0.50, broadsword: 0.60, dagger: 0.32 };
        const impactTime = impactTimes[itemId] || (itemType === 'weapon' ? 0.45 : (itemId === 'pickaxe' ? 0.55 : 0.50));

        // Fire projectiles for ranged weapons
        if (swingProgress >= impactTime && !CombatSystem.projectileFiredThisSwing()) {
            if (itemId === 'flintlock') {
                const camDir = new THREE.Vector3();
                _deps.camera.getWorldDirection(camDir);
                const startPos = _deps.getPlayer().position.clone();
                startPos.y += 1.4;
                startPos.add(camDir.clone().multiplyScalar(0.5));
                CombatSystem.createProjectile('bullet', startPos, camDir);
                CombatSystem.markProjectileFired();
            } else if (itemId === 'longbow') {
                const camDir = new THREE.Vector3();
                _deps.camera.getWorldDirection(camDir);
                const startPos = _deps.getPlayer().position.clone();
                startPos.y += 1.3;
                startPos.add(camDir.clone().multiplyScalar(0.3));
                CombatSystem.createProjectile('arrow', startPos, camDir);
                CombatSystem.markProjectileFired();
            }
        }

        // Melee damage at impact time
        const targetedResource = CombatSystem.getTargetedResource();
        if (swingProgress >= impactTime && swingProgress < impactTime + 0.1 && targetedResource && !targetedResource.isDestroyed) {
            if (itemId !== 'flintlock' && itemId !== 'longbow') {
                const effectiveness = item ? (item.effectiveness || {}) : {};
                targetedResource.takeDamage(item ? item.damage : 1, effectiveness[targetedResource.resourceType] || 0.1, _deps.getPlayer().position.clone());
            }
        }

        // Swing complete - reset to rest position (exact from HTML build)
        if (swingProgress >= 1) {
            CombatSystem.endSwing();
            g.rotation.copy(_restRotation);
            g.position.copy(_restPosition);
        }
    }

    return {
        init(deps) {
            Object.assign(_deps, deps);

            // Create held item group and attach to camera (exact HTML build pattern)
            _heldItemGroup = new THREE.Group();
            _deps.camera.add(_heldItemGroup);
            _heldItemGroup.position.set(0.35, -0.3, -0.5);

            // Build all tool meshes
            _toolMeshes = {
                hand: createHand(),
                pickaxe: createPickaxe(),
                axe: createAxe(),
                sword: createSword()
            };

            // Show initial item
            this.updateHeldItem();
        },

        updateHeldItem() {
            const { InventorySystem } = _deps;
            if (!InventorySystem || !_heldItemGroup) return;

            if (_currentHeldMesh) _heldItemGroup.remove(_currentHeldMesh);
            const item = InventorySystem.getSelectedItem();
            _currentHeldMesh = _toolMeshes[item ? item.id : 'hand'] || _toolMeshes.hand;
            _heldItemGroup.add(_currentHeldMesh);
            _heldItemGroup.position.copy(_restPosition);
            _heldItemGroup.rotation.copy(_restRotation);
        },

        // Called every frame from animate loop
        update(delta, time) {
            if (!_heldItemGroup) return;
            const { CombatSystem, InventorySystem } = _deps;

            // Check for slot change
            if (InventorySystem) {
                const item = InventorySystem.getSelectedItem();
                const itemId = item ? item.id : 'hand';
                const currentMesh = _toolMeshes[itemId] || _toolMeshes.hand;
                if (currentMesh !== _currentHeldMesh) {
                    this.updateHeldItem();
                }
            }

            // Run swing animation if swinging (exact port from HTML build updateSwing)
            _updateSwing(delta);

            // Idle animation when not swinging (exact port from HTML build)
            if (!CombatSystem || !CombatSystem.isSwinging()) {
                const keys = _deps.getKeys ? _deps.getKeys() : {};
                const idleBob = Math.sin(time * 2.5) * 0.008;
                const idleSway = Math.sin(time * 1.8) * 0.012;
                // Walking bob when moving
                const walkBob = (keys.w || keys.a || keys.s || keys.d) ? Math.sin(time * 12) * 0.015 : 0;
                _heldItemGroup.position.y = _restPosition.y + idleBob + walkBob;
                _heldItemGroup.position.x = _restPosition.x + idleSway * 0.5;
                _heldItemGroup.rotation.z = idleSway;
            }
        },

        setVisible(visible) {
            if (_heldItemGroup) _heldItemGroup.visible = visible;
        },

        getGroup() { return _heldItemGroup; },
        getRestPosition() { return _restPosition; },
        getRestRotation() { return _restRotation; }
    };
})();

export { HeldItemSystem };
export default HeldItemSystem;
