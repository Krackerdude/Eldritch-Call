// ═══════════════════════════════════════════════════════════════
// MODEL VIEWER - 3D Entity Browser (ES Module)
// Uses REAL game model builders from the codebase
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { sharedGeom, mats, toolMats } from './js/assets.js';
import { treeTypes, rockTypes, foliageMats, trunkMats, ResourceSystem } from './js/resources.js';
import { CreatureSystem, Deer, Fox, Sheep, Rabbit, Butterfly, Bird } from './js/systems/CreatureSystem.js';
import { NPC, NPC_DATA, NPC_APPEARANCES, NPCSystem } from './js/npc.js';
import { VillageBuilding } from './js/systems/VillageSystem.js';
import { BUILDING_TYPES, CONFIG } from './js/config.js';

// ── Mock scene/deps so constructors don't crash ──
const mockScene = { add() {}, remove() {} };
const mockGetHeight = () => 0;

// Initialize systems with minimal deps for model building
ResourceSystem.init({
    scene: mockScene,
    CONFIG,
    sharedGeom,
    mats,
    inventory: { add() {} },
    ParticleSystem: null,
    showPickupNotification: null,
    discoverMaterial: null,
    getHeight: mockGetHeight
});

CreatureSystem.init({
    scene: mockScene,
    getHeight: mockGetHeight,
    getSlope: () => 0,
    getBaseHeight: mockGetHeight,
    spawnArea: 1200,
    CONFIG,
    sharedGeom,
    inventory: { add() {} },
    ParticleSystem: null,
    updateQuestProgress: null,
    discoverEntry: null,
    showTransaction: null
});

NPCSystem.init({
    scene: mockScene,
    getHeight: mockGetHeight,
    DialogueSystem: null
});

// ═══════════════════════════════════════════════════════════════
// MODEL VIEWER CORE
// ═══════════════════════════════════════════════════════════════

const mvScreen = document.getElementById('model-viewer-screen');
if (mvScreen) {

const mvCanvas = document.getElementById('mv-viewer-canvas');
const mvListScroll = document.getElementById('mv-list-scroll');
const mvListTitle = document.getElementById('mv-list-title');
const mvListCount = document.getElementById('mv-list-count');
const mvInfoName = document.getElementById('mv-info-name');
const mvInfoSub = document.getElementById('mv-info-sub');
const mvNoModel = document.getElementById('mv-no-model');
const mvControlsHint = document.getElementById('mv-controls-hint');
const catTabs = mvScreen.querySelectorAll('.mv-cat-tab');
const btnBack = document.getElementById('btn-model-back');

let mvRenderer, mvScene, mvCamera, mvAnimId;
let mvCurrentModel = null;
let mvCurrentCategory = 'flora';
let mvAutoRotate = true;
let mvMouseDown = false;
let mvLastMouse = { x: 0, y: 0 };
let mvRotation = { x: 0.3, y: 0 };
let mvZoom = 5;

// ═══════════════════════════════════════════════════════════════
// MODEL LIBRARY - References real game builders
// ═══════════════════════════════════════════════════════════════

function buildTreeModel(typeIdx) {
    const type = treeTypes[typeIdx];
    const group = new THREE.Group();
    const foliage = new THREE.Group();
    const size = 1.0;
    const scaleMult = 2.0;
    const th = size * 18 * scaleMult;
    type.buildFn(group, foliage, size * scaleMult, th, type.trunkMat, type.foliageMat);
    group.add(foliage);
    return group;
}

function buildRockModel(typeIdx) {
    const type = rockTypes[typeIdx];
    const group = new THREE.Group();
    const r = 1.5;
    const mainGeom = sharedGeom[type.geom] || sharedGeom.dodeca;
    const matName = `rock${type.name.charAt(0).toUpperCase() + type.name.slice(1)}`;
    const mat = mats[matName] || mats.rockGranite;
    const mainRock = new THREE.Mesh(mainGeom, mat);
    mainRock.scale.set(r * type.scaleMod.x, r * type.scaleMod.y, r * type.scaleMod.z);
    group.add(mainRock);

    if (type.name === 'boulder' || type.name === 'granite') {
        for (let i = 0; i < 3; i++) {
            const small = new THREE.Mesh(sharedGeom.dodeca, mat);
            const angle = (i / 3) * Math.PI * 2 + Math.random();
            const dist = r * 0.8;
            small.scale.setScalar(r * 0.25 + Math.random() * r * 0.15);
            small.position.set(Math.cos(angle) * dist, -r * 0.2, Math.sin(angle) * dist);
            small.rotation.set(Math.random(), Math.random(), Math.random());
            group.add(small);
        }
    }
    if (type.name === 'mossy') {
        for (let i = 0; i < 4; i++) {
            const moss = new THREE.Mesh(sharedGeom.sphere2, mats.grass1);
            moss.scale.set(r * 0.3, r * 0.1, r * 0.3);
            moss.position.set((Math.random() - 0.5) * r * 0.8, r * 0.3 + Math.random() * r * 0.2, (Math.random() - 0.5) * r * 0.8);
            group.add(moss);
        }
    }
    if (type.name === 'crystal') {
        for (let i = 0; i < 5; i++) {
            const shard = new THREE.Mesh(sharedGeom.octa, mat);
            shard.scale.set(r * 0.15, r * 0.5 + Math.random() * r * 0.4, r * 0.15);
            shard.position.set((Math.random() - 0.5) * r * 0.5, r * 0.3, (Math.random() - 0.5) * r * 0.5);
            shard.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
            group.add(shard);
        }
    }
    return group;
}

function buildGroundcoverModel(type) {
    const group = new THREE.Group();
    if (type === 'grass') {
        const mat = mats.grass1;
        const bladeCount = 5;
        for (let i = 0; i < bladeCount; i++) {
            const blade = new THREE.Mesh(sharedGeom.plane, mat);
            blade.scale.set(0.08 + Math.random() * 0.04, 0.3 + Math.random() * 0.25, 1);
            blade.position.set((Math.random() - 0.5) * 0.2, blade.scale.y / 2, (Math.random() - 0.5) * 0.2);
            blade.rotation.y = Math.random() * Math.PI;
            group.add(blade);
        }
    } else if (type === 'flowerRed' || type === 'flowerYellow' || type === 'flowerPurple' || type === 'flowerWhite') {
        const petalMat = mats[type];
        const stem = new THREE.Mesh(sharedGeom.cylinder, mats.grass1);
        stem.scale.set(0.015, 0.25, 0.015);
        stem.position.y = 0.125;
        group.add(stem);
        for (let i = 0; i < 4; i++) {
            const petal = new THREE.Mesh(sharedGeom.sphere2, petalMat);
            const angle = (i / 4) * Math.PI * 2;
            petal.scale.set(0.05, 0.02, 0.08);
            petal.position.set(Math.cos(angle) * 0.04, 0.27, Math.sin(angle) * 0.04);
            petal.rotation.y = angle;
            group.add(petal);
        }
        const center = new THREE.Mesh(sharedGeom.sphere2, mats.flowerYellow);
        center.scale.setScalar(0.03);
        center.position.y = 0.27;
        group.add(center);
    } else if (type === 'mushroom') {
        const count = 2;
        for (let i = 0; i < count; i++) {
            const stem = new THREE.Mesh(sharedGeom.cylinder, mats.mushroom);
            const cap = new THREE.Mesh(sharedGeom.sphere2, mats.mushroomCap);
            const ox = (Math.random() - 0.5) * 0.1;
            const oz = (Math.random() - 0.5) * 0.1;
            const h = 0.08 + Math.random() * 0.06;
            stem.scale.set(0.025, h, 0.025);
            stem.position.set(ox, h / 2, oz);
            cap.scale.set(0.06 + Math.random() * 0.03, 0.03, 0.06 + Math.random() * 0.03);
            cap.position.set(ox, h + 0.02, oz);
            group.add(stem);
            group.add(cap);
        }
    } else if (type === 'fern') {
        const fernMat = mats.fern;
        const frondCount = 4;
        for (let i = 0; i < frondCount; i++) {
            const frond = new THREE.Mesh(sharedGeom.plane, fernMat);
            const angle = (i / frondCount) * Math.PI * 2;
            frond.scale.set(0.15, 0.35 + Math.random() * 0.15, 1);
            frond.position.set(Math.cos(angle) * 0.05, frond.scale.y * 0.4, Math.sin(angle) * 0.05);
            frond.rotation.y = angle;
            frond.rotation.x = -0.3;
            group.add(frond);
        }
    }
    return group;
}

function buildCreatureModel(type) {
    let creature;
    switch (type) {
        case 'deer': creature = new Deer(0, 0, 0); break;
        case 'fox': creature = new Fox(0, 0, 0); break;
        case 'sheep': creature = new Sheep(0, 0, 0); break;
        case 'rabbit': creature = new Rabbit(0, 0, 0); break;
        case 'butterfly': creature = new Butterfly(0, 0, 0); break;
        case 'bird': creature = new Bird(0, 0, 0); break;
        default: return new THREE.Group();
    }
    creature.group.position.set(0, 0, 0);
    return creature.group;
}

function buildNPCModel(dataKey) {
    const data = NPC_DATA[dataKey];
    if (!data) return new THREE.Group();
    const group = new THREE.Group();
    const app = data.appearance;
    const skinColor = NPC_APPEARANCES.skinTones[app.skin];
    const hairColor = NPC_APPEARANCES.hairColors[app.hair];
    const outfit1 = NPC_APPEARANCES.outfitPrimary[app.outfit1];
    const outfit2 = NPC_APPEARANCES.outfitSecondary[app.outfit2];

    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
    const outfitMat = new THREE.MeshStandardMaterial({ color: outfit1, roughness: 0.7 });
    const outfit2Mat = new THREE.MeshStandardMaterial({ color: outfit2, roughness: 0.75 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), outfitMat);
    torso.position.y = 1.4;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.5), skinMat);
    head.position.y = 2.3;
    group.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.55), hairMat);
    hair.position.set(0, 2.55, 0);
    group.add(hair);

    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.15), hairMat);
    hairBack.position.set(0, 2.35, -0.2);
    group.add(hairBack);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    [[-0.12, 2.35, 0.25], [0.12, 2.35, 0.25]].forEach(([x, y, z]) => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
        eye.position.set(x, y, z);
        group.add(eye);
    });

    if (app.hasBeard) {
        const beard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.2), hairMat);
        beard.position.set(0, 2.05, 0.2);
        group.add(beard);
    }

    if (app.hatType === 'hood') {
        const hood = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 6), outfitMat);
        hood.position.set(0, 2.7, 0.05);
        group.add(hood);
    } else if (app.hatType === 'wizard') {
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), outfit2Mat);
        hat.position.set(0, 2.9, 0);
        group.add(hat);
        const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 8), outfit2Mat);
        hatBrim.position.set(0, 2.55, 0);
        group.add(hatBrim);
    }

    // Arms
    [[-0.5, 1.35], [0.5, 1.35]].forEach(([x, y]) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), outfitMat);
        arm.position.set(x, y, 0);
        group.add(arm);
        const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.18), skinMat);
        hand.position.set(x, 0.8, 0);
        group.add(hand);
    });

    // Legs
    [[-0.2, 0.45], [0.2, 0.45]].forEach(([x, y]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), outfit2Mat);
        leg.position.set(x, y, 0);
        group.add(leg);
    });

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.55), outfit2Mat);
    belt.position.y = 0.9;
    group.add(belt);

    if (data.type === 'trader') {
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), outfit2Mat);
        apron.position.set(0, 1.1, -0.3);
        group.add(apron);
    }

    return group;
}

function buildBuildingModel(type) {
    const building = new VillageBuilding(type, 0, 0, 0, mockScene, mockGetHeight);
    return building.group;
}

// ── Tool/Weapon builders (ported from HeldItemSystem - private closure) ──
function createHand() {
    const m = toolMats;
    const hand = new THREE.Group();
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 6), m.hand);
    wrist.position.set(0, -0.12, 0);
    hand.add(wrist);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 6), m.leather);
    cuff.position.set(0, -0.08, 0);
    hand.add(cuff);
    const cuffTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 6), m.gold);
    cuffTrim.position.set(0, -0.055, 0);
    hand.add(cuffTrim);
    const cuffTrim2 = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 6), m.gold);
    cuffTrim2.position.set(0, -0.105, 0);
    hand.add(cuffTrim2);
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.055), m.hand);
    palm.position.set(0, 0.01, 0);
    hand.add(palm);
    const palmBack = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.11, 0.02), m.handShadow);
    palmBack.position.set(0, 0.01, -0.025);
    hand.add(palmBack);
    const palmHeel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), m.hand);
    palmHeel.scale.set(1.2, 0.6, 0.8);
    palmHeel.position.set(0, -0.04, 0.02);
    hand.add(palmHeel);
    const fingerLengths = [0.055, 0.065, 0.06, 0.05];
    const fingerWidths = [0.022, 0.024, 0.024, 0.022];
    for (let i = 0; i < 4; i++) {
        const xPos = -0.038 + i * 0.026;
        const len = fingerLengths[i];
        const wid = fingerWidths[i];
        const knuckle = new THREE.Mesh(new THREE.SphereGeometry(wid * 0.6, 4, 3), m.hand);
        knuckle.position.set(xPos, 0.065, 0.01);
        hand.add(knuckle);
        const fingerBase = new THREE.Mesh(new THREE.BoxGeometry(wid, len, wid * 0.9), m.hand);
        fingerBase.position.set(xPos, 0.065 + len / 2, 0);
        hand.add(fingerBase);
        const midJoint = new THREE.Mesh(new THREE.SphereGeometry(wid * 0.45, 4, 3), m.hand);
        midJoint.position.set(xPos, 0.065 + len, 0);
        hand.add(midJoint);
        const fingerMid = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.9, len * 0.65, wid * 0.85), m.hand);
        fingerMid.position.set(xPos, 0.065 + len + len * 0.32, 0);
        hand.add(fingerMid);
        const fingerTip = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.8, len * 0.45, wid * 0.8), m.hand);
        fingerTip.position.set(xPos, 0.065 + len + len * 0.65 + len * 0.22, 0);
        hand.add(fingerTip);
        const nail = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.65, 0.012, wid * 0.5), m.handNail);
        nail.position.set(xPos, 0.065 + len + len * 0.65 + len * 0.4, 0.01);
        hand.add(nail);
    }
    const thumbMeta = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.035, 0.025), m.hand);
    thumbMeta.position.set(0.058, 0.005, 0.018); thumbMeta.rotation.z = -0.4;
    hand.add(thumbMeta);
    const thumbBase = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.04, 0.024), m.hand);
    thumbBase.position.set(0.075, 0.035, 0.02); thumbBase.rotation.z = -0.5;
    hand.add(thumbBase);
    const thumbJoint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 4, 3), m.hand);
    thumbJoint.position.set(0.088, 0.058, 0.02);
    hand.add(thumbJoint);
    const thumbTip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.03, 0.022), m.hand);
    thumbTip.position.set(0.095, 0.08, 0.02); thumbTip.rotation.z = -0.6;
    hand.add(thumbTip);
    const thumbNail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.01, 0.012), m.handNail);
    thumbNail.position.set(0.102, 0.095, 0.028); thumbNail.rotation.z = -0.6;
    hand.add(thumbNail);
    return hand;
}

function createPickaxe() {
    const m = toolMats;
    const pick = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.034, 0.6, 6), m.wood);
    handle.rotation.x = Math.PI / 2; handle.position.z = 0.12;
    pick.add(handle);
    const pommelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.025, 6), m.woodDark);
    pommelCap.rotation.x = Math.PI / 2; pommelCap.position.z = 0.42;
    pick.add(pommelCap);
    const pommelDeco = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), m.metal);
    pommelDeco.position.z = 0.44;
    pick.add(pommelDeco);
    for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.027 + i * 0.002, 0.027 + i * 0.002, 0.012, 6), m.woodDark);
        ring.rotation.x = Math.PI / 2; ring.position.z = 0.08 + i * 0.12;
        pick.add(ring);
    }
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.16, 6), m.leather);
    grip.rotation.x = Math.PI / 2; grip.position.z = 0.30;
    pick.add(grip);
    for (let i = 0; i < 5; i++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.01, 6), m.leatherWrap);
        band.rotation.x = Math.PI / 2; band.position.z = 0.23 + i * 0.035;
        pick.add(band);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.065, 6), m.metal);
    collar.rotation.x = Math.PI / 2; collar.position.z = -0.14;
    pick.add(collar);
    for (let i = 0; i < 4; i++) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), m.metalShine);
        const angle = (i / 4) * Math.PI * 2;
        rivet.position.set(Math.cos(angle) * 0.045, Math.sin(angle) * 0.045, -0.14);
        pick.add(rivet);
    }
    const headBlock = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.05), m.metal);
    headBlock.position.set(0, 0, -0.15);
    pick.add(headBlock);
    const headTop = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.018, 0.045), m.metalShine);
    headTop.position.set(0, 0.035, -0.15);
    pick.add(headTop);
    const headBottom = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.015, 0.045), m.metalDark);
    headBottom.position.set(0, -0.032, -0.15);
    pick.add(headBottom);
    const pointBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.045), m.metal);
    pointBase.position.set(0.16, 0, -0.15);
    pick.add(pointBase);
    const point = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.18, 4), m.blade);
    point.rotation.z = -Math.PI / 2; point.position.set(0.26, 0, -0.15);
    pick.add(point);
    const pointShine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.012, 0.008), m.bladeEdge);
    pointShine.position.set(0.24, 0.025, -0.15); pointShine.rotation.z = -0.12;
    pick.add(pointShine);
    const hammerBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.055, 0.048), m.metal);
    hammerBase.position.set(-0.16, 0, -0.15);
    pick.add(hammerBase);
    const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.06), m.metal);
    hammer.position.set(-0.20, 0, -0.15);
    pick.add(hammer);
    const hammerFace = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.05), m.metalDark);
    hammerFace.position.set(-0.235, 0, -0.15);
    pick.add(hammerFace);
    const hammerTop = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.055), m.metalShine);
    hammerTop.position.set(-0.20, 0.038, -0.15);
    pick.add(hammerTop);
    return pick;
}

function createAxe() {
    const m = toolMats;
    const axe = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.038, 0.68, 6), m.wood);
    handle.rotation.x = Math.PI / 2; handle.position.z = 0.2;
    axe.add(handle);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), m.woodDark);
    pommel.scale.set(1, 0.8, 1); pommel.position.z = 0.55;
    axe.add(pommel);
    const pommelRing = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.015, 6), m.metal);
    pommelRing.rotation.x = Math.PI / 2; pommelRing.position.z = 0.52;
    axe.add(pommelRing);
    for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.026 + i * 0.003, 0.026 + i * 0.003, 0.014, 6), m.woodDark);
        ring.rotation.x = Math.PI / 2; ring.position.z = 0.02 + i * 0.14;
        axe.add(ring);
    }
    const grip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.18, 6), m.leather);
    grip2.rotation.x = Math.PI / 2; grip2.position.z = 0.42;
    axe.add(grip2);
    for (let i = 0; i < 6; i++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.008, 6), m.leatherWrap);
        band.rotation.x = Math.PI / 2; band.position.z = 0.34 + i * 0.03;
        axe.add(band);
    }
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.075, 6), m.metal);
    collar.rotation.x = Math.PI / 2; collar.position.z = -0.12;
    axe.add(collar);
    const collarBand = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.018, 6), m.metalShine);
    collarBand.rotation.x = Math.PI / 2; collarBand.position.z = -0.10;
    axe.add(collarBand);
    for (let i = 0; i < 4; i++) {
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.008, 4, 3), m.gold);
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        rivet.position.set(Math.cos(angle) * 0.052, Math.sin(angle) * 0.052, -0.12);
        axe.add(rivet);
    }
    const bladeBack = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.065), m.metal);
    bladeBack.position.set(0.025, 0, -0.12);
    axe.add(bladeBack);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.075), m.blade);
    blade.position.set(0.055, 0, -0.12);
    axe.add(blade);
    const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.24, 0.055), m.bladeEdge);
    bladeEdge.position.set(0.09, 0, -0.12);
    axe.add(bladeEdge);
    const bladeBevelTop = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.015, 0.06), m.metalShine);
    bladeBevelTop.position.set(0.05, 0.115, -0.12);
    axe.add(bladeBevelTop);
    const bladeBevelBottom = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.015, 0.06), m.metalDark);
    bladeBevelBottom.position.set(0.05, -0.115, -0.12);
    axe.add(bladeBevelBottom);
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.018), m.metalDark);
    notch.position.set(0.035, -0.085, -0.12);
    axe.add(notch);
    const spineTop = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.07), m.metal);
    spineTop.position.set(0.02, 0.09, -0.12);
    axe.add(spineTop);
    const eyeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.08, 6), m.metalDark);
    eyeRing.rotation.x = Math.PI / 2; eyeRing.position.z = -0.12;
    axe.add(eyeRing);
    return axe;
}

function createSword() {
    const m = toolMats;
    const sword = new THREE.Group();
    const pommelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.03, 6), m.gold);
    pommelBase.rotation.x = Math.PI / 2; pommelBase.position.z = 0.25;
    sword.add(pommelBase);
    const pommelGeo = new THREE.Mesh(new THREE.DodecahedronGeometry(0.035, 0), m.gold);
    pommelGeo.position.z = 0.28;
    sword.add(pommelGeo);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), m.ruby);
    gem.position.z = 0.30;
    sword.add(gem);
    const pommelRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 4, 8), m.gold);
    pommelRing.position.z = 0.26;
    sword.add(pommelRing);
    const grip2 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.17, 6), m.leather);
    grip2.rotation.x = Math.PI / 2; grip2.position.z = 0.145;
    sword.add(grip2);
    for (let i = 0; i < 7; i++) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, 0.007, 6), m.leatherWrap);
        band.rotation.x = Math.PI / 2; band.position.z = 0.065 + i * 0.025;
        sword.add(band);
    }
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.030, 0.02, 6), m.gold);
    ferrule.rotation.x = Math.PI / 2; ferrule.position.z = 0.055;
    sword.add(ferrule);
    const guardBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.05), m.gold);
    guardBase.position.z = 0.035;
    sword.add(guardBase);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.03, 0.035), m.gold);
    guard.position.z = 0.04;
    sword.add(guard);
    const guardWingL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.03), m.gold);
    guardWingL.position.set(-0.085, 0.01, 0.04); guardWingL.rotation.z = 0.3;
    sword.add(guardWingL);
    const guardWingR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 0.03), m.gold);
    guardWingR.position.set(0.085, 0.01, 0.04); guardWingR.rotation.z = -0.3;
    sword.add(guardWingR);
    [0.105, -0.105].forEach(x => {
        const guardEnd = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), m.gold);
        guardEnd.position.set(x, 0.02, 0.04);
        sword.add(guardEnd);
    });
    const guardCenter = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.045), m.gold);
    guardCenter.position.z = 0.025;
    sword.add(guardCenter);
    const guardGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.012, 0), m.ruby);
    guardGem.position.set(0, 0.025, 0.025);
    sword.add(guardGem);
    const ricasso = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.016, 0.08), m.metal);
    ricasso.position.z = -0.025;
    sword.add(ricasso);
    const bladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.015, 0.42), m.blade);
    bladeMesh.position.z = -0.23;
    sword.add(bladeMesh);
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.35), m.metalShine);
    fuller.position.set(0, 0, -0.19);
    sword.add(fuller);
    const edge1 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.40), m.bladeEdge);
    edge1.position.set(0.028, 0, -0.21);
    sword.add(edge1);
    const edge2 = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.013, 0.40), m.bladeEdge);
    edge2.position.set(-0.028, 0, -0.21);
    sword.add(edge2);
    const spineTopMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.38), m.metalShine);
    spineTopMesh.position.set(0, 0.01, -0.20);
    sword.add(spineTopMesh);
    for (let i = 0; i < 3; i++) {
        const engraving = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.04), m.metalDark);
        engraving.position.set(0, 0.005, -0.08 - i * 0.12);
        sword.add(engraving);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.12, 4), m.blade);
    tip.rotation.x = -Math.PI / 2; tip.position.z = -0.50;
    sword.add(tip);
    const tipShine = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.08, 4), m.bladeEdge);
    tipShine.rotation.x = -Math.PI / 2; tipShine.position.z = -0.52;
    sword.add(tipShine);
    return sword;
}

function createTorch() {
    const m = toolMats;
    const torch = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6), m.wood);
    handle.position.y = 0.3;
    torch.add(handle);
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.12, 6), m.leather);
    wrap.position.y = 0.55;
    torch.add(wrap);
    const flameMat = new THREE.MeshStandardMaterial({ color: 0xFF9800, emissive: 0xFF6F00, emissiveIntensity: 0.8, flatShading: true });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), flameMat);
    flame.position.y = 0.72;
    torch.add(flame);
    const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0xFFEB3B, emissive: 0xFFC107, emissiveIntensity: 1, flatShading: true }));
    innerFlame.position.y = 0.7;
    torch.add(innerFlame);
    return torch;
}

// ═══════════════════════════════════════════════════════════════
// MODEL LIBRARY DEFINITION
// ═══════════════════════════════════════════════════════════════

const MODEL_LIBRARY = {
    flora: {
        label: 'Flora',
        items: treeTypes.map((t, i) => ({
            name: t.name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
            sub: (t.biomes || []).join(', ') || 'Various',
            builder: () => buildTreeModel(i)
        }))
    },
    fauna: {
        label: 'Fauna',
        items: [
            { name: 'Deer', sub: 'Passive · Speed 2.5', builder: () => buildCreatureModel('deer') },
            { name: 'Fox', sub: 'Passive · Speed 3', builder: () => buildCreatureModel('fox') },
            { name: 'Sheep', sub: 'Passive · Speed 1.2', builder: () => buildCreatureModel('sheep') },
            { name: 'Rabbit', sub: 'Passive · Speed 4', builder: () => buildCreatureModel('rabbit') },
            { name: 'Butterfly', sub: 'Flying Creature', builder: () => buildCreatureModel('butterfly') },
            { name: 'Bird', sub: 'Flying Creature', builder: () => buildCreatureModel('bird') },
        ]
    },
    groundcover: {
        label: 'Groundcover',
        items: [
            { name: 'Grass Tuft', sub: 'Ground Flora', builder: () => buildGroundcoverModel('grass') },
            { name: 'Red Flower', sub: 'Ground Flora', builder: () => buildGroundcoverModel('flowerRed') },
            { name: 'Yellow Flower', sub: 'Ground Flora', builder: () => buildGroundcoverModel('flowerYellow') },
            { name: 'Purple Flower', sub: 'Ground Flora', builder: () => buildGroundcoverModel('flowerPurple') },
            { name: 'White Flower', sub: 'Ground Flora', builder: () => buildGroundcoverModel('flowerWhite') },
            { name: 'Mushroom Cluster', sub: 'Ground Flora', builder: () => buildGroundcoverModel('mushroom') },
            { name: 'Fern', sub: 'Ground Flora', builder: () => buildGroundcoverModel('fern') },
        ]
    },
    rocks: {
        label: 'Rocks',
        items: rockTypes.map((t, i) => ({
            name: t.name.charAt(0).toUpperCase() + t.name.slice(1),
            sub: `Geometry: ${t.geom}`,
            builder: () => buildRockModel(i)
        }))
    },
    npcs: {
        label: 'NPCs',
        items: [
            { name: 'Eldric the Wanderer', sub: 'Traveling Sage', builder: () => buildNPCModel('wanderer') },
            { name: 'Mira Thornweave', sub: 'Master Herbalist', builder: () => buildNPCModel('herbalist') },
            { name: 'Grimjaw Ironhand', sub: 'Master Weaponsmith', builder: () => buildNPCModel('weaponsmith') },
            { name: 'Helena Steelweave', sub: 'Master Armorsmith', builder: () => buildNPCModel('armorsmith') },
            { name: 'Professor Aldwin Quill', sub: 'Arcane Scholar', builder: () => buildNPCModel('scholar') },
        ]
    },
    buildings: {
        label: 'Buildings',
        items: Object.entries(BUILDING_TYPES).map(([key, cfg]) => ({
            name: cfg.name,
            sub: `${cfg.width}x${cfg.depth}x${cfg.height}`,
            builder: () => buildBuildingModel(key)
        }))
    },
    tools: {
        label: 'Tools & Weapons',
        items: [
            { name: 'Hand / Fist', sub: 'Base · 5 Damage', builder: createHand },
            { name: 'Sword', sub: 'Melee · 15 Damage', builder: createSword },
            { name: 'Iron Axe', sub: 'Tool · 25 Damage', builder: createAxe },
            { name: 'Iron Pickaxe', sub: 'Tool · 20 Damage', builder: createPickaxe },
            { name: 'Torch', sub: 'Light Source', builder: createTorch },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════
// THREE.JS VIEWER SETUP
// ═══════════════════════════════════════════════════════════════

function mvInitRenderer() {
    if (mvRenderer) return;
    mvRenderer = new THREE.WebGLRenderer({ canvas: mvCanvas, antialias: true, alpha: true });
    mvRenderer.setPixelRatio(window.devicePixelRatio);
    mvRenderer.setClearColor(0x000000, 0);
    mvScene = new THREE.Scene();
    mvCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    mvCamera.position.set(0, 2, 5);
    mvCamera.lookAt(0, 0.5, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    mvScene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 8, 5);
    mvScene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x6b2d9e, 0.3);
    backLight.position.set(-3, 2, -5);
    mvScene.add(backLight);

    const grid = new THREE.GridHelper(10, 20, 0x6b2d9e, 0x1a0a2e);
    grid.material.opacity = 0.3;
    grid.material.transparent = true;
    mvScene.add(grid);

    mvResizeRenderer();
}

function mvResizeRenderer() {
    if (!mvRenderer) return;
    const frame = document.getElementById('mv-viewer-frame');
    if (!frame) return;
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    mvRenderer.setSize(w, h);
    mvCamera.aspect = w / h;
    mvCamera.updateProjectionMatrix();
}

function mvAnimate() {
    mvAnimId = requestAnimationFrame(mvAnimate);
    if (mvCurrentModel && mvAutoRotate) {
        mvCurrentModel.rotation.y += 0.008;
    }
    if (mvCurrentModel) {
        mvCamera.position.x = Math.sin(mvRotation.y) * mvZoom;
        mvCamera.position.z = Math.cos(mvRotation.y) * mvZoom;
        mvCamera.position.y = mvRotation.x * mvZoom * 0.5 + 1;
        mvCamera.lookAt(0, 0.5, 0);
    }
    mvRenderer.render(mvScene, mvCamera);
}

function mvStopAnimate() {
    if (mvAnimId) { cancelAnimationFrame(mvAnimId); mvAnimId = null; }
}

// ── Build List ──
function mvBuildList(category) {
    mvCurrentCategory = category;
    const cat = MODEL_LIBRARY[category];
    if (!cat) return;
    mvListTitle.textContent = cat.label;
    mvListCount.textContent = `(${cat.items.length})`;
    mvListScroll.innerHTML = '';

    cat.items.forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'mv-list-item';
        el.innerHTML = `<span class="mv-item-name">${item.name}</span><span class="mv-item-sub">${item.sub}</span>`;
        el.addEventListener('click', () => mvLoadModel(category, idx));
        mvListScroll.appendChild(el);
    });
}

// ── Load Model ──
function mvLoadModel(category, index) {
    const cat = MODEL_LIBRARY[category];
    if (!cat || !cat.items[index]) return;
    const item = cat.items[index];

    const items = mvListScroll.querySelectorAll('.mv-list-item');
    items.forEach((el, i) => el.classList.toggle('active', i === index));

    if (mvCurrentModel) { mvScene.remove(mvCurrentModel); mvCurrentModel = null; }

    try {
        mvCurrentModel = item.builder();
        mvScene.add(mvCurrentModel);
    } catch (e) {
        console.warn('Model build error:', e);
    }

    if (mvCurrentModel) {
        const box = new THREE.Box3().setFromObject(mvCurrentModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        mvZoom = maxDim * 2.5 + 1;
        const center = box.getCenter(new THREE.Vector3());
        mvCurrentModel.position.sub(center);
        mvCurrentModel.position.y += center.y;
        mvRotation = { x: 0.3, y: 0 };
        mvAutoRotate = true;
    }

    mvInfoName.textContent = item.name;
    mvInfoSub.textContent = item.sub;
    mvNoModel.classList.add('hidden');
    mvControlsHint.textContent = 'Drag to rotate · Scroll to zoom';
}

// ── Mouse Controls ──
mvCanvas.addEventListener('mousedown', (e) => {
    mvMouseDown = true; mvAutoRotate = false;
    mvLastMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('mouseup', () => { mvMouseDown = false; });
window.addEventListener('mousemove', (e) => {
    if (!mvMouseDown) return;
    mvRotation.y += (e.clientX - mvLastMouse.x) * 0.01;
    mvRotation.x = Math.max(-1, Math.min(1, mvRotation.x + (e.clientY - mvLastMouse.y) * 0.005));
    mvLastMouse = { x: e.clientX, y: e.clientY };
});
mvCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    mvZoom = Math.max(1, Math.min(200, mvZoom + e.deltaY * 0.01));
}, { passive: false });

// Touch controls
let mvTouchStart = null;
mvCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        mvAutoRotate = false;
        mvTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
});
mvCanvas.addEventListener('touchmove', (e) => {
    if (mvTouchStart && e.touches.length === 1) {
        e.preventDefault();
        mvRotation.y += (e.touches[0].clientX - mvTouchStart.x) * 0.01;
        mvRotation.x = Math.max(-1, Math.min(1, mvRotation.x + (e.touches[0].clientY - mvTouchStart.y) * 0.005));
        mvTouchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
}, { passive: false });

// ── Category Tabs ──
catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        catTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        mvBuildList(tab.dataset.category);
    });
});

// ── Back Button ──
if (btnBack) btnBack.addEventListener('click', () => {
    mvStopAnimate();
    mvScreen.style.transition = 'opacity 0.3s ease';
    mvScreen.style.opacity = '0';
    setTimeout(() => { mvScreen.classList.add('hidden'); }, 300);
});

// ── Open Model Viewer ──
const btnModelViewer = document.getElementById('btn-model-viewer');
if (btnModelViewer) {
    btnModelViewer.addEventListener('click', () => {
        mvInitRenderer();
        mvBuildList(mvCurrentCategory);
        mvScreen.classList.remove('hidden');
        mvScreen.style.opacity = '0';
        requestAnimationFrame(() => {
            mvScreen.style.transition = 'opacity 0.3s ease';
            mvScreen.style.opacity = '1';
        });
        mvResizeRenderer();
        mvStopAnimate();
        mvAnimate();
    });
}

window.addEventListener('resize', mvResizeRenderer);

} // end if (mvScreen)
