// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCES.JS - Harvestable Resources (Trees, Rocks, Ground Cover)
// Dependencies: THREE.js, assets.js (sharedGeom, mats), CONFIG
// Consumers: World Generation, Player interaction, Inventory
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE STATE
// ═══════════════════════════════════════════════════════════════════════════════

let _deps = {
    scene: null,
    CONFIG: null,
    sharedGeom: null,
    mats: null,
    inventory: null,
    ParticleSystem: null,
    showPickupNotification: null,
    discoverMaterial: null,
    getHeight: null
};

// Resource tracking arrays
const swayingTrees = [];
const harvestableResources = [];
const groundCover = [];

// Spatial grid for collision detection
let treeGrid = null;
let rockGrid = null;

// ═══════════════════════════════════════════════════════════════════════════════
// FOLIAGE GEOMETRIES - Low-poly shapes for tree canopies
// ═══════════════════════════════════════════════════════════════════════════════

const foliageGeoms = {
    chunk: new THREE.DodecahedronGeometry(1, 0),
    faceted: new THREE.IcosahedronGeometry(1, 0),
    angular: new THREE.OctahedronGeometry(1, 0),
    cone: new THREE.ConeGeometry(1, 1.5, 6),
    tall: new THREE.IcosahedronGeometry(1, 0)
};

// ═══════════════════════════════════════════════════════════════════════════════
// FOLIAGE MATERIALS - Varied greens and biome colors
// ═══════════════════════════════════════════════════════════════════════════════

const foliageMats = {
    darkGreen: new THREE.MeshStandardMaterial({ color: 0x2d5a35, roughness: 0.85, flatShading: true }),
    medGreen: new THREE.MeshStandardMaterial({ color: 0x3d7a45, roughness: 0.8, flatShading: true }),
    lightGreen: new THREE.MeshStandardMaterial({ color: 0x5a9955, roughness: 0.75, flatShading: true }),
    oliveGreen: new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.8, flatShading: true }),
    forestGreen: new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.85, flatShading: true }),
    sageGreen: new THREE.MeshStandardMaterial({ color: 0x77815c, roughness: 0.8, flatShading: true }),
    autumn1: new THREE.MeshStandardMaterial({ color: 0xd4652f, roughness: 0.75, flatShading: true }),
    autumn2: new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.75, flatShading: true }),
    // Biome-specific
    ancientDark: new THREE.MeshStandardMaterial({ color: 0x1a3020, roughness: 0.9, flatShading: true }),
    ancientMoss: new THREE.MeshStandardMaterial({ color: 0x2a4a30, roughness: 0.85, flatShading: true }),
    desertGreen: new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.8, flatShading: true }),
    palmGreen: new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.75, flatShading: true }),
    snowyBlue: new THREE.MeshStandardMaterial({ color: 0x3a6a5a, roughness: 0.85, flatShading: true }),
    frosted: new THREE.MeshStandardMaterial({ color: 0x5a8a7a, roughness: 0.7, flatShading: true }),
    swampGreen: new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.9, flatShading: true }),
    willowGreen: new THREE.MeshStandardMaterial({ color: 0x5a7a4a, roughness: 0.8, flatShading: true }),
    crystalPurple: new THREE.MeshStandardMaterial({ color: 0x8a7aaa, roughness: 0.5, flatShading: true, emissive: 0x221133, emissiveIntensity: 0.2 }),
    crystalBlue: new THREE.MeshStandardMaterial({ color: 0x7a9acc, roughness: 0.4, flatShading: true, emissive: 0x112233, emissiveIntensity: 0.2 }),
    shadowPurple: new THREE.MeshStandardMaterial({ color: 0x3a2a4a, roughness: 0.9, flatShading: true }),
    thornBlack: new THREE.MeshStandardMaterial({ color: 0x2a2a3a, roughness: 0.95, flatShading: true })
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRUNK MATERIALS
// ═══════════════════════════════════════════════════════════════════════════════

const trunkMats = {
    oak: new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9, flatShading: true }),
    pine: new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.85, flatShading: true }),
    birch: new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.7, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9, flatShading: true }),
    ancientBark: new THREE.MeshStandardMaterial({ color: 0x2a2015, roughness: 0.95, flatShading: true }),
    cactus: new THREE.MeshStandardMaterial({ color: 0x3a6a2a, roughness: 0.8, flatShading: true }),
    palm: new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.85, flatShading: true }),
    frostedBark: new THREE.MeshStandardMaterial({ color: 0x6a6a7a, roughness: 0.8, flatShading: true }),
    swampWood: new THREE.MeshStandardMaterial({ color: 0x4a4a3a, roughness: 0.95, flatShading: true }),
    crystal: new THREE.MeshStandardMaterial({ color: 0x7a7a8a, roughness: 0.5, metalness: 0.2, flatShading: true }),
    shadow: new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.95, flatShading: true })
};

// ═══════════════════════════════════════════════════════════════════════════════
// TREE BUILDER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function buildOakTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.35;
    const topRadius = size * 0.08;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th, 5),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const fs = size * 2.5;
    
    const blob1 = new THREE.Mesh(foliageGeoms.chunk, foliageMat);
    blob1.scale.set(fs * 1.2, fs * 0.8, fs * 1.1);
    blob1.position.y = th * 0.9;
    blob1.rotation.set(0.2, Math.random() * Math.PI, 0.1);
    blob1.castShadow = false;
    foliage.add(blob1);
    
    const blob2 = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    blob2.scale.set(fs * 0.7, fs * 0.55, fs * 0.65);
    blob2.position.set(fs * 0.15, th + fs * 0.5, fs * 0.1);
    blob2.rotation.set(0.3, Math.random() * Math.PI, 0.2);
    blob2.castShadow = false;
    foliage.add(blob2);
}

function buildPineTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.25;
    const topRadius = size * 0.05;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th, 5),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const layers = 4;
    for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1);
        const layerY = th * 0.35 + (th * 0.75) * t;
        const layerSize = size * 2.2 * (1 - t * 0.55);
        
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(layerSize, layerSize * 1.0, 6),
            foliageMat
        );
        cone.position.y = layerY;
        cone.rotation.y = i * 0.5;
        cone.castShadow = false;
        foliage.add(cone);
    }
    
    const top = new THREE.Mesh(
        new THREE.ConeGeometry(size * 0.4, size * 1.8, 4),
        foliageMat
    );
    top.position.y = th + size * 0.5;
    top.castShadow = false;
    foliage.add(top);
}

function buildBirchTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.2;
    const topRadius = size * 0.06;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th, 5),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const crown = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    crown.scale.set(size * 1.8, size * 3.5, size * 1.8);
    crown.position.y = th + size * 0.8;
    crown.rotation.set(0.1, Math.random() * Math.PI, 0.1);
    crown.castShadow = false;
    foliage.add(crown);
}

function buildBranchedTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.3;
    const topRadius = size * 0.1;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th * 0.55, 5),
        trunkMat
    );
    trunk.position.y = th * 0.275;
    trunk.castShadow = false;
    group.add(trunk);
    
    const branchCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < branchCount; i++) {
        const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.4;
        const branchY = th * 0.5;
        const branchLen = size * (3 + Math.random() * 2);
        
        const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(size * 0.04, size * 0.1, branchLen, 4),
            trunkMat
        );
        branch.position.set(
            Math.cos(angle) * branchLen * 0.35,
            branchY + branchLen * 0.3,
            Math.sin(angle) * branchLen * 0.35
        );
        branch.rotation.z = -Math.cos(angle) * 0.6;
        branch.rotation.x = Math.sin(angle) * 0.6;
        group.add(branch);
        
        const cluster = new THREE.Mesh(foliageGeoms.chunk, foliageMat);
        const cs = size * (1.3 + Math.random() * 0.6);
        cluster.scale.set(cs, cs * 0.75, cs);
        cluster.position.set(
            Math.cos(angle) * branchLen * 0.7,
            branchY + branchLen * 0.55,
            Math.sin(angle) * branchLen * 0.7
        );
        cluster.rotation.y = Math.random() * Math.PI;
        cluster.castShadow = false;
        foliage.add(cluster);
    }
    
    const topCluster = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    topCluster.scale.set(size * 1.5, size * 1.2, size * 1.5);
    topCluster.position.y = th * 0.85;
    topCluster.rotation.y = Math.random() * Math.PI;
    topCluster.castShadow = false;
    foliage.add(topCluster);
}

function buildCypressTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.2;
    const topRadius = size * 0.04;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th, 5),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const blob1 = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    blob1.scale.set(size * 1.2, size * 2.0, size * 1.2);
    blob1.position.y = th * 0.6;
    blob1.rotation.y = Math.random() * Math.PI;
    blob1.castShadow = false;
    foliage.add(blob1);
    
    const blob2 = new THREE.Mesh(foliageGeoms.angular, foliageMat);
    blob2.scale.set(size * 0.9, size * 1.8, size * 0.9);
    blob2.position.y = th * 0.9;
    blob2.rotation.y = Math.random() * Math.PI;
    blob2.castShadow = false;
    foliage.add(blob2);
    
    const blob3 = new THREE.Mesh(foliageGeoms.angular, foliageMat);
    blob3.scale.set(size * 0.6, size * 1.4, size * 0.6);
    blob3.position.y = th * 1.15;
    blob3.rotation.y = Math.random() * Math.PI;
    blob3.castShadow = false;
    foliage.add(blob3);
}

function buildBushyTree(group, foliage, size, th, trunkMat, foliageMat) {
    const shortTh = th * 0.45;
    const baseRadius = size * 0.35;
    const topRadius = size * 0.12;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, shortTh, 5),
        trunkMat
    );
    trunk.position.y = shortTh / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const main = new THREE.Mesh(foliageGeoms.chunk, foliageMat);
    main.scale.set(size * 3, size * 1.8, size * 3);
    main.position.y = shortTh + size * 0.8;
    main.rotation.y = Math.random() * Math.PI;
    main.castShadow = false;
    foliage.add(main);
    
    const top = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    top.scale.set(size * 1.5, size * 1.2, size * 1.5);
    top.position.set(size * 0.3, shortTh + size * 2, size * 0.2);
    top.rotation.y = Math.random() * Math.PI;
    top.castShadow = false;
    foliage.add(top);
}

function buildAncientTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.7;
    const topRadius = size * 0.15;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th, 6),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const root = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, baseRadius * 0.4, size * 1.2, 4),
            trunkMat
        );
        root.position.set(
            Math.cos(angle) * baseRadius * 0.7,
            size * 0.3,
            Math.sin(angle) * baseRadius * 0.7
        );
        root.rotation.x = Math.cos(angle) * 0.4;
        root.rotation.z = -Math.sin(angle) * 0.4;
        group.add(root);
    }
    
    const main = new THREE.Mesh(foliageGeoms.chunk, foliageMat);
    main.scale.set(size * 4.5, size * 3, size * 4.5);
    main.position.y = th + size;
    main.rotation.y = Math.random() * Math.PI;
    main.castShadow = false;
    foliage.add(main);
    
    const top = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    top.scale.set(size * 2.5, size * 2, size * 2.5);
    top.position.set(size * 0.5, th + size * 3, size * 0.3);
    top.rotation.y = Math.random() * Math.PI;
    top.castShadow = false;
    foliage.add(top);
}

function buildDeadTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.4;
    const topRadius = size * 0.08;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th * 0.8, 5),
        trunkMat
    );
    trunk.position.y = th * 0.4;
    trunk.rotation.z = Math.random() * 0.1 - 0.05;
    trunk.castShadow = false;
    group.add(trunk);
    
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
        const branchLen = size * (1.5 + Math.random() * 2);
        const branchY = th * (0.4 + Math.random() * 0.4);
        
        const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, size * 0.08, branchLen, 3),
            trunkMat
        );
        branch.position.set(
            Math.cos(angle) * branchLen * 0.3,
            branchY,
            Math.sin(angle) * branchLen * 0.3
        );
        branch.rotation.z = -Math.cos(angle) * (0.5 + Math.random() * 0.4);
        branch.rotation.x = Math.sin(angle) * (0.5 + Math.random() * 0.4);
        group.add(branch);
    }
}

function buildStackedTree(group, foliage, size, th, trunkMat, foliageMat) {
    const baseRadius = size * 0.25;
    const topRadius = size * 0.06;
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, th, 5),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const blob1 = new THREE.Mesh(foliageGeoms.chunk, foliageMat);
    blob1.scale.set(size * 2.2, size * 1.5, size * 2.0);
    blob1.position.y = th * 0.7;
    blob1.rotation.y = Math.random() * Math.PI;
    blob1.castShadow = false;
    foliage.add(blob1);
    
    const blob2 = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    blob2.scale.set(size * 1.6, size * 1.2, size * 1.5);
    blob2.position.set(size * 0.2, th * 0.95, size * 0.1);
    blob2.rotation.y = Math.random() * Math.PI;
    blob2.castShadow = false;
    foliage.add(blob2);
    
    const blob3 = new THREE.Mesh(foliageGeoms.angular, foliageMat);
    blob3.scale.set(size * 1.1, size * 0.9, size * 1.0);
    blob3.position.set(size * -0.1, th * 1.15, size * 0.15);
    blob3.rotation.y = Math.random() * Math.PI;
    blob3.castShadow = false;
    foliage.add(blob3);
}

function buildCactusTree(group, foliage, size, th, trunkMat, foliageMat) {
    const mainBody = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.8, size * 1.0, th * 0.8, 8),
        trunkMat
    );
    mainBody.position.y = th * 0.4;
    mainBody.castShadow = false;
    group.add(mainBody);
    
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.8, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        trunkMat
    );
    cap.position.y = th * 0.8;
    group.add(cap);
    
    const armCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < armCount; i++) {
        const armHeight = th * (0.3 + Math.random() * 0.3);
        const armY = th * (0.3 + Math.random() * 0.3);
        const angle = (i / armCount) * Math.PI * 2 + Math.random() * 0.5;
        
        const armH = new THREE.Mesh(
            new THREE.CylinderGeometry(size * 0.3, size * 0.35, size * 1.5, 6),
            trunkMat
        );
        armH.rotation.z = Math.PI / 2;
        armH.position.set(Math.cos(angle) * size * 1.2, armY, Math.sin(angle) * size * 1.2);
        group.add(armH);
        
        const armV = new THREE.Mesh(
            new THREE.CylinderGeometry(size * 0.25, size * 0.3, armHeight, 6),
            trunkMat
        );
        armV.position.set(Math.cos(angle) * size * 1.8, armY + armHeight * 0.5, Math.sin(angle) * size * 1.8);
        group.add(armV);
    }
}

function buildPalmTree(group, foliage, size, th, trunkMat, foliageMat) {
    const segments = 5;
    const curve = 0.15;
    let prevY = 0;
    
    for (let i = 0; i < segments; i++) {
        const segHeight = th / segments;
        const radius = size * (0.3 - i * 0.04);
        const xOff = Math.sin(i * 0.3) * curve * th;
        
        const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(radius * 0.8, radius, segHeight, 6),
            trunkMat
        );
        seg.position.set(xOff, prevY + segHeight / 2, 0);
        seg.castShadow = false;
        group.add(seg);
        prevY += segHeight;
    }
    
    const frondCount = 7;
    for (let i = 0; i < frondCount; i++) {
        const angle = (i / frondCount) * Math.PI * 2;
        const frond = new THREE.Mesh(
            new THREE.ConeGeometry(size * 0.3, size * 4, 4),
            foliageMat
        );
        frond.position.set(
            Math.cos(angle) * size * 0.5,
            th,
            Math.sin(angle) * size * 0.5
        );
        frond.rotation.x = Math.PI / 3;
        frond.rotation.y = angle;
        frond.scale.set(0.4, 1, 1);
        frond.castShadow = false;
        foliage.add(frond);
    }
}

function buildFrostedPine(group, foliage, size, th, trunkMat, foliageMat) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.08, size * 0.3, th, 5),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true });
    const layers = 5;
    for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1);
        const layerY = th * 0.3 + (th * 0.8) * t;
        const layerSize = size * 2.5 * (1 - t * 0.6);
        
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(layerSize, layerSize * 0.8, 6),
            foliageMat
        );
        cone.position.y = layerY;
        cone.castShadow = false;
        foliage.add(cone);
        
        const snow = new THREE.Mesh(
            new THREE.ConeGeometry(layerSize * 0.9, layerSize * 0.3, 6),
            snowMat
        );
        snow.position.y = layerY + layerSize * 0.3;
        foliage.add(snow);
    }
}

function buildWillowTree(group, foliage, size, th, trunkMat, foliageMat) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.15, size * 0.5, th * 0.6, 6),
        trunkMat
    );
    trunk.position.y = th * 0.3;
    trunk.castShadow = false;
    group.add(trunk);
    
    const canopy = new THREE.Mesh(foliageGeoms.chunk, foliageMat);
    canopy.scale.set(size * 3, size * 1.5, size * 3);
    canopy.position.y = th * 0.7;
    canopy.castShadow = false;
    foliage.add(canopy);
    
    const vineCount = 12;
    const vineMat = new THREE.MeshStandardMaterial({ color: 0x4a6a3a, roughness: 0.9, flatShading: true });
    for (let i = 0; i < vineCount; i++) {
        const angle = (i / vineCount) * Math.PI * 2;
        const dist = size * 2 + Math.random() * size;
        const vineHeight = th * (0.4 + Math.random() * 0.3);
        
        const vine = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.08, vineHeight, 4),
            vineMat
        );
        vine.position.set(
            Math.cos(angle) * dist,
            th * 0.5 - vineHeight / 2,
            Math.sin(angle) * dist
        );
        foliage.add(vine);
    }
}

function buildMangroveTree(group, foliage, size, th, trunkMat, foliageMat) {
    const rootCount = 5;
    for (let i = 0; i < rootCount; i++) {
        const angle = (i / rootCount) * Math.PI * 2 + Math.random() * 0.3;
        const dist = size * 0.8;
        
        const root = new THREE.Mesh(
            new THREE.CylinderGeometry(size * 0.08, size * 0.15, th * 0.5, 4),
            trunkMat
        );
        root.position.set(
            Math.cos(angle) * dist,
            th * 0.2,
            Math.sin(angle) * dist
        );
        root.rotation.x = Math.sin(angle) * 0.3;
        root.rotation.z = Math.cos(angle) * 0.3;
        root.castShadow = false;
        group.add(root);
    }
    
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.12, size * 0.25, th * 0.6, 5),
        trunkMat
    );
    trunk.position.y = th * 0.5;
    trunk.castShadow = false;
    group.add(trunk);
    
    const canopy = new THREE.Mesh(foliageGeoms.faceted, foliageMat);
    canopy.scale.set(size * 2.5, size * 1.2, size * 2.5);
    canopy.position.y = th * 0.85;
    canopy.castShadow = false;
    foliage.add(canopy);
}

function buildCrystalTree(group, foliage, size, th, trunkMat, foliageMat) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.1, size * 0.4, th, 6),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const crystalCount = 5 + Math.floor(Math.random() * 4);
    const crystalMats = [
        new THREE.MeshStandardMaterial({ color: 0xaa88cc, roughness: 0.3, metalness: 0.1, flatShading: true, emissive: 0x221133, emissiveIntensity: 0.3 }),
        new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.3, metalness: 0.1, flatShading: true, emissive: 0x112233, emissiveIntensity: 0.3 }),
        new THREE.MeshStandardMaterial({ color: 0xccaaff, roughness: 0.2, metalness: 0.2, flatShading: true, emissive: 0x332244, emissiveIntensity: 0.4 })
    ];
    
    for (let i = 0; i < crystalCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = size * 0.5 + Math.random() * size;
        const crystalH = size * (1 + Math.random() * 2);
        
        const crystal = new THREE.Mesh(
            new THREE.ConeGeometry(size * 0.3, crystalH, 5),
            crystalMats[i % crystalMats.length]
        );
        crystal.position.set(
            Math.cos(angle) * dist,
            th * 0.6 + Math.random() * th * 0.3,
            Math.sin(angle) * dist
        );
        crystal.rotation.x = (Math.random() - 0.5) * 0.5;
        crystal.rotation.z = (Math.random() - 0.5) * 0.5;
        crystal.castShadow = false;
        foliage.add(crystal);
    }
}

function buildTwistedTree(group, foliage, size, th, trunkMat, foliageMat) {
    const segments = 8;
    let prevY = 0;
    const twist = 0.4;
    
    for (let i = 0; i < segments; i++) {
        const segHeight = th / segments;
        const radius = size * (0.4 - i * 0.03);
        const angle = i * twist;
        
        const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(radius * 0.7, radius, segHeight, 5),
            trunkMat
        );
        seg.position.set(
            Math.sin(angle) * size * 0.3,
            prevY + segHeight / 2,
            Math.cos(angle) * size * 0.3
        );
        seg.rotation.x = Math.cos(angle) * 0.1;
        seg.rotation.z = Math.sin(angle) * 0.1;
        seg.castShadow = false;
        group.add(seg);
        prevY += segHeight;
    }
    
    const blobCount = 3;
    for (let i = 0; i < blobCount; i++) {
        const blob = new THREE.Mesh(foliageGeoms.angular, foliageMat);
        blob.scale.set(size * 1.2, size * 0.8, size * 1.1);
        blob.position.set(
            (Math.random() - 0.5) * size,
            th * (0.7 + i * 0.15),
            (Math.random() - 0.5) * size
        );
        blob.rotation.set(Math.random(), Math.random(), Math.random());
        blob.castShadow = false;
        foliage.add(blob);
    }
}

function buildThornTree(group, foliage, size, th, trunkMat, foliageMat) {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.08, size * 0.35, th, 5),
        trunkMat
    );
    trunk.position.y = th / 2;
    trunk.castShadow = false;
    group.add(trunk);
    
    const thornCount = 12;
    for (let i = 0; i < thornCount; i++) {
        const angle = (i / thornCount) * Math.PI * 2;
        const y = th * (0.3 + (i % 4) * 0.15);
        const length = size * (1 + Math.random());
        
        const thorn = new THREE.Mesh(
            new THREE.ConeGeometry(size * 0.08, length, 4),
            trunkMat
        );
        thorn.position.set(0, y, 0);
        thorn.rotation.z = Math.PI / 2 - 0.3;
        thorn.rotation.y = angle;
        thorn.castShadow = false;
        group.add(thorn);
    }
    
    if (Math.random() > 0.5) {
        const blob = new THREE.Mesh(foliageGeoms.angular, foliageMat);
        blob.scale.set(size * 0.8, size * 0.6, size * 0.7);
        blob.position.y = th * 0.9;
        blob.castShadow = false;
        foliage.add(blob);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREE TYPES CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const treeTypes = [
    { name: 'oak', buildFn: buildOakTree, trunkMat: trunkMats.oak, foliageMat: foliageMats.medGreen, biomes: ['rolling_meadows'] },
    { name: 'pine', buildFn: buildPineTree, trunkMat: trunkMats.pine, foliageMat: foliageMats.darkGreen, biomes: ['rolling_meadows', 'frozen_peaks'] },
    { name: 'birch', buildFn: buildBirchTree, trunkMat: trunkMats.birch, foliageMat: foliageMats.lightGreen, biomes: ['rolling_meadows'] },
    { name: 'branched', buildFn: buildBranchedTree, trunkMat: trunkMats.oak, foliageMat: foliageMats.forestGreen, biomes: ['rolling_meadows'] },
    { name: 'cypress', buildFn: buildCypressTree, trunkMat: trunkMats.dark, foliageMat: foliageMats.oliveGreen, biomes: ['rolling_meadows', 'murky_swamp'] },
    { name: 'bushy', buildFn: buildBushyTree, trunkMat: trunkMats.oak, foliageMat: foliageMats.sageGreen, biomes: ['rolling_meadows'] },
    { name: 'ancient', buildFn: buildAncientTree, trunkMat: trunkMats.ancientBark, foliageMat: foliageMats.ancientDark, biomes: ['ancient_woodlands'] },
    { name: 'maple', buildFn: buildOakTree, trunkMat: trunkMats.oak, foliageMat: foliageMats.autumn1, biomes: ['rolling_meadows'] },
    { name: 'golden', buildFn: buildStackedTree, trunkMat: trunkMats.oak, foliageMat: foliageMats.autumn2, biomes: ['rolling_meadows'] },
    { name: 'dead', buildFn: buildDeadTree, trunkMat: trunkMats.dark, foliageMat: null, biomes: ['crimson_dunes', 'shadow_vale', 'murky_swamp'] },
    { name: 'stacked', buildFn: buildStackedTree, trunkMat: trunkMats.oak, foliageMat: foliageMats.medGreen, biomes: ['rolling_meadows'] },
    { name: 'cactus', buildFn: buildCactusTree, trunkMat: trunkMats.cactus, foliageMat: foliageMats.desertGreen, biomes: ['crimson_dunes'] },
    { name: 'palm', buildFn: buildPalmTree, trunkMat: trunkMats.palm, foliageMat: foliageMats.palmGreen, biomes: ['crimson_dunes'] },
    { name: 'frostedPine', buildFn: buildFrostedPine, trunkMat: trunkMats.frostedBark, foliageMat: foliageMats.snowyBlue, biomes: ['frozen_peaks'] },
    { name: 'willow', buildFn: buildWillowTree, trunkMat: trunkMats.swampWood, foliageMat: foliageMats.willowGreen, biomes: ['murky_swamp'] },
    { name: 'mangrove', buildFn: buildMangroveTree, trunkMat: trunkMats.swampWood, foliageMat: foliageMats.swampGreen, biomes: ['murky_swamp'] },
    { name: 'crystalTree', buildFn: buildCrystalTree, trunkMat: trunkMats.crystal, foliageMat: foliageMats.crystalPurple, biomes: ['crystal_heights'] },
    { name: 'alpine', buildFn: buildPineTree, trunkMat: trunkMats.oak, foliageMat: foliageMats.crystalBlue, biomes: ['crystal_heights'] },
    { name: 'twisted', buildFn: buildTwistedTree, trunkMat: trunkMats.shadow, foliageMat: foliageMats.shadowPurple, biomes: ['shadow_vale'] },
    { name: 'thornTree', buildFn: buildThornTree, trunkMat: trunkMats.shadow, foliageMat: foliageMats.thornBlack, biomes: ['shadow_vale'] },
    { name: 'mossyAncient', buildFn: buildAncientTree, trunkMat: trunkMats.ancientBark, foliageMat: foliageMats.ancientMoss, biomes: ['ancient_woodlands'] },
    { name: 'gnarled', buildFn: buildBranchedTree, trunkMat: trunkMats.ancientBark, foliageMat: foliageMats.ancientDark, biomes: ['ancient_woodlands'] }
];

// ═══════════════════════════════════════════════════════════════════════════════
// ROCK TYPES CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const rockTypes = [
    { name: 'granite', mat: null, geom: 'dodeca', scaleMod: { x: 1.2, y: 0.7, z: 1.1 } },
    { name: 'slate', mat: null, geom: 'box', scaleMod: { x: 1.5, y: 0.4, z: 1.2 } },
    { name: 'mossy', mat: null, geom: 'icosa', scaleMod: { x: 1.0, y: 0.8, z: 1.0 } },
    { name: 'sandstone', mat: null, geom: 'dodeca', scaleMod: { x: 1.3, y: 0.9, z: 1.1 } },
    { name: 'crystal', mat: null, geom: 'octa', scaleMod: { x: 0.6, y: 1.4, z: 0.6 } },
    { name: 'obsidian', mat: null, geom: 'icosa', scaleMod: { x: 0.8, y: 1.0, z: 0.8 } },
    { name: 'boulder', mat: null, geom: 'sphere1', scaleMod: { x: 1.1, y: 0.9, z: 1.0 } }
];

// ═══════════════════════════════════════════════════════════════════════════════
// TREE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class Tree {
    constructor(x, y, z, size, typeIdx) {
        const type = treeTypes[typeIdx % treeTypes.length];
        this.posX = x;
        this.posZ = z;
        this.size = size;
        this.group = new THREE.Group();
        this.swayOff = Math.random() * Math.PI * 2;
        this.resourceType = 'tree';
        this.maxHealth = _deps.CONFIG.treeHealth * (type.name === 'ancient' ? 2 : 1);
        this.health = this.maxHealth;
        this.isDestroyed = false;
        this.treeType = type.name;
        this.baseY = y;
        this.lodLevel = 0;
        this.shadowsEnabled = false;
        
        const scaleMult = 1.2 + Math.random() * 3.3;
        this.scaleMult = scaleMult;
        
        const th = size * 18 * scaleMult;
        this.treeHeight = th;
        
        const trunkBaseRadius = size * scaleMult * 0.35;
        this.collisionRadius = Math.max(trunkBaseRadius, 0.8);
        
        this.foliage = new THREE.Group();
        
        type.buildFn(this.group, this.foliage, size * scaleMult, th, type.trunkMat, type.foliageMat);
        
        this.billboard = this.createBillboard(th, type.foliageMat, type.trunkMat, type.name);
        this.billboard.visible = false;
        this.group.add(this.billboard);
        
        this.group.add(this.foliage);
        this.group.position.set(x, y, z);
        _deps.scene.add(this.group);
        swayingTrees.push(this);
        harvestableResources.push(this);
        if (treeGrid) treeGrid.add(this);
    }
    
    createBillboard(height, foliageMat, trunkMaterial, treeName) {
        const billboardGroup = new THREE.Group();
        
        let foliageColor = new THREE.Color(0x3d7a45);
        if (foliageMat && foliageMat.color) {
            foliageColor = foliageMat.color.clone();
        }
        
        let trunkColor = new THREE.Color(0x6b4028);
        if (trunkMaterial && trunkMaterial.color) {
            trunkColor = trunkMaterial.color.clone();
        }
        
        const shadowColor = foliageColor.clone().multiplyScalar(0.6);
        
        const trunkMat = new THREE.MeshStandardMaterial({
            color: trunkColor,
            flatShading: true,
            emissive: trunkColor.clone().multiplyScalar(0.15),
            emissiveIntensity: 0.15,
            roughness: 0.9
        });
        
        const foliageLodMat = new THREE.MeshStandardMaterial({
            color: foliageColor,
            flatShading: true,
            emissive: shadowColor,
            emissiveIntensity: foliageMat && foliageMat.emissiveIntensity ? foliageMat.emissiveIntensity : 0.1,
            roughness: 0.8
        });
        
        // Build simple LOD based on tree type
        const size = height / 18;
        
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(size * 0.08, size * 0.35, height, 5),
            trunkMat
        );
        trunk.position.y = height * 0.5;
        billboardGroup.add(trunk);
        
        const fs = size * 2.5;
        const foliage1 = new THREE.Mesh(new THREE.DodecahedronGeometry(fs, 0), foliageLodMat);
        foliage1.scale.set(1.2, 0.8, 1.1);
        foliage1.position.y = height * 0.9;
        billboardGroup.add(foliage1);
        
        return billboardGroup;
    }
    
    takeDamage(amount, effectiveness, hitPos) {
        if (this.isDestroyed) return;
        this.health -= amount * (effectiveness || 0.1);
        this.group.position.x += (Math.random() - 0.5) * 0.15;
        
        if (_deps.ParticleSystem) {
            const particlePos = new THREE.Vector3(this.posX, this.group.position.y + 2, this.posZ);
            _deps.ParticleSystem.spawnImpact(particlePos, this.treeType || 'wood');
        }
        
        if (this.health <= 0) this.destroy();
    }
    
    destroy() {
        this.isDestroyed = true;
        if (treeGrid) treeGrid.remove(this);
        
        if (_deps.ParticleSystem) {
            _deps.ParticleSystem.spawnDestruction(this.group.position, 'tree');
        }
        
        const animate = () => {
            this.group.scale.y -= 0.03;
            this.group.position.y -= 0.2;
            if (this.group.scale.y > 0.1) {
                requestAnimationFrame(animate);
            } else {
                _deps.scene.remove(this.group);
                
                const woodAmount = Math.floor(3 + Math.random() * 4);
                const treeNames = {
                    oak: 'Oak', pine: 'Pine', birch: 'Birch', maple: 'Maple',
                    ancient: 'Ancient Tree', palm: 'Palm', willow: 'Willow'
                };
                const resourceName = treeNames[this.treeType] || 'Tree';
                const resourceId = this.treeType || 'oak';
                
                _deps.inventory.add('wood', woodAmount);
                if (Math.random() < 0.4) _deps.inventory.add('fiber', Math.floor(1 + Math.random() * 3));
                
                if (_deps.showPickupNotification) {
                    _deps.showPickupNotification(resourceName, woodAmount + ' wood', 'tree');
                }
                
                if (_deps.discoverMaterial) {
                    _deps.discoverMaterial('tree', resourceId);
                }
                
                harvestableResources.splice(harvestableResources.indexOf(this), 1);
                swayingTrees.splice(swayingTrees.indexOf(this), 1);
            }
        };
        animate();
    }
    
    updateWind(t, str, dir) {
        if (!this.group.visible || this.isDestroyed || this.lodLevel > 0) return;
        const swayAmt = 0.008 / this.scaleMult;
        const s = Math.sin(t * 1.2 + this.swayOff) * swayAmt * str;
        this.foliage.rotation.x = s * dir.y;
        this.foliage.rotation.z = s * dir.x;
    }
    
    updateVis(px, pz) {
        if (this.isDestroyed) { this.group.visible = false; return; }
        const dx = this.posX - px, dz = this.posZ - pz;
        const distSq = dx * dx + dz * dz;
        const cullSq = _deps.CONFIG.treeCulling * _deps.CONFIG.treeCulling;
        const lodSq = _deps.CONFIG.treeLOD * _deps.CONFIG.treeLOD;
        const shadowDistSq = 2500;
        
        if (distSq > cullSq) {
            this.group.visible = false;
        } else {
            this.group.visible = true;
            if (distSq > lodSq) {
                if (this.lodLevel !== 1) {
                    this.lodLevel = 1;
                    this.foliage.visible = false;
                    this.billboard.visible = true;
                }
                if (this.shadowsEnabled) {
                    this.shadowsEnabled = false;
                    this.group.traverse(c => { if (c.isMesh) c.castShadow = false; });
                }
            } else {
                if (this.lodLevel !== 0) {
                    this.lodLevel = 0;
                    this.foliage.visible = true;
                    this.billboard.visible = false;
                }
                const shouldHaveShadow = distSq < shadowDistSq;
                if (shouldHaveShadow !== this.shadowsEnabled) {
                    this.shadowsEnabled = shouldHaveShadow;
                    this.group.traverse(c => { if (c.isMesh) c.castShadow = shouldHaveShadow; });
                }
            }
        }
    }
    
    getWorldPos() {
        return new THREE.Vector3(this.posX, this.baseY + 1.5, this.posZ);
    }
    
    checkCollision(worldX, worldZ, playerRadius = 0.5) {
        if (this.isDestroyed) return false;
        const dx = worldX - this.posX;
        const dz = worldZ - this.posZ;
        const distSq = dx * dx + dz * dz;
        const minDist = this.collisionRadius + playerRadius;
        return distSq < minDist * minDist;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROCK CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class Rock {
    constructor(x, y, z, r, typeIdx) {
        const type = rockTypes[typeIdx % rockTypes.length];
        this.posX = x;
        this.posZ = z;
        this.radius = r;
        this.resourceType = 'rock';
        this.rockType = type.name;
        this.maxHealth = type.name === 'crystal' ? _deps.CONFIG.rockHealth * 0.7 : _deps.CONFIG.rockHealth;
        this.health = this.maxHealth;
        this.isDestroyed = false;
        this.originalScale = new THREE.Vector3(r * type.scaleMod.x, r * type.scaleMod.y, r * type.scaleMod.z);
        
        this.group = new THREE.Group();
        const mainGeom = _deps.sharedGeom[type.geom] || _deps.sharedGeom.dodeca;
        const mat = _deps.mats[`rock${type.name.charAt(0).toUpperCase() + type.name.slice(1)}`] || _deps.mats.rockGranite;
        this.mainRock = new THREE.Mesh(mainGeom, mat);
        this.mainRock.scale.copy(this.originalScale);
        this.mainRock.castShadow = false;
        this.group.add(this.mainRock);
        
        if (type.name === 'boulder' || type.name === 'granite') {
            for (let i = 0; i < 3; i++) {
                const small = new THREE.Mesh(_deps.sharedGeom.dodeca, mat);
                const angle = (i / 3) * Math.PI * 2 + Math.random();
                const dist = r * 0.8;
                small.scale.setScalar(r * 0.25 + Math.random() * r * 0.15);
                small.position.set(Math.cos(angle) * dist, -r * 0.2, Math.sin(angle) * dist);
                small.rotation.set(Math.random(), Math.random(), Math.random());
                this.group.add(small);
            }
        }
        
        if (type.name === 'mossy') {
            for (let i = 0; i < 4; i++) {
                const moss = new THREE.Mesh(_deps.sharedGeom.sphere2, _deps.mats.grass1);
                moss.scale.set(r * 0.3, r * 0.1, r * 0.3);
                moss.position.set((Math.random() - 0.5) * r * 0.8, r * 0.3 + Math.random() * r * 0.2, (Math.random() - 0.5) * r * 0.8);
                this.group.add(moss);
            }
        }
        
        if (type.name === 'crystal') {
            for (let i = 0; i < 5; i++) {
                const shard = new THREE.Mesh(_deps.sharedGeom.octa, mat);
                shard.scale.set(r * 0.15, r * 0.5 + Math.random() * r * 0.4, r * 0.15);
                shard.position.set((Math.random() - 0.5) * r * 0.5, r * 0.3, (Math.random() - 0.5) * r * 0.5);
                shard.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
                this.group.add(shard);
            }
        }
        
        this.group.position.set(x, y + r * 0.2, z);
        this.group.rotation.y = Math.random() * Math.PI * 2;
        this.baseY = y;
        this.lodLevel = 0;
        _deps.scene.add(this.group);
        harvestableResources.push(this);
        if (rockGrid) rockGrid.add(this);
    }
    
    takeDamage(amount, effectiveness, hitPos) {
        if (this.isDestroyed) return;
        this.health -= amount * (effectiveness || 0.1);
        this.group.position.x += (Math.random() - 0.5) * 0.2;
        const pct = this.health / this.maxHealth;
        this.mainRock.scale.copy(this.originalScale).multiplyScalar(0.6 + pct * 0.4);
        
        if (_deps.ParticleSystem) {
            const particlePos = new THREE.Vector3(this.posX, this.group.position.y + this.radius * 0.5, this.posZ);
            _deps.ParticleSystem.spawnImpact(particlePos, this.rockType || 'stone');
        }
        
        if (this.health <= 0) this.destroy();
    }
    
    destroy() {
        this.isDestroyed = true;
        if (rockGrid) rockGrid.remove(this);
        
        if (_deps.ParticleSystem) {
            _deps.ParticleSystem.spawnDestruction(this.group.position, 'rock');
        }
        
        _deps.scene.remove(this.group);
        
        const stoneAmount = Math.floor(2 + Math.random() * 3);
        _deps.inventory.add('stone', stoneAmount);
        
        const rockNames = {
            granite: 'Granite', slate: 'Slate', mossy: 'Mossy Stone', sandstone: 'Sandstone',
            crystal: 'Crystal Cluster', obsidian: 'Obsidian', boulder: 'Boulder'
        };
        const resourceName = rockNames[this.rockType] || 'Rock';
        
        let bonusText = '';
        if (this.rockType === 'crystal') {
            const ironAmt = Math.floor(1 + Math.random() * 2);
            _deps.inventory.add('iron', ironAmt);
            bonusText = ` +${ironAmt} crystals`;
        } else if (Math.random() < 0.2) {
            _deps.inventory.add('iron', 1);
            bonusText = ' +1 iron';
        }
        if (Math.random() < 0.15) {
            _deps.inventory.add('coal', 1);
            bonusText += ' +1 coal';
        }
        
        if (_deps.showPickupNotification) {
            _deps.showPickupNotification(resourceName, stoneAmount + ' stone' + bonusText, 'rock');
        }
        
        if (_deps.discoverMaterial) {
            _deps.discoverMaterial('rock', this.rockType);
        }
        
        harvestableResources.splice(harvestableResources.indexOf(this), 1);
    }
    
    updateVis(px, pz) {
        if (this.isDestroyed) { this.group.visible = false; return; }
        const dx = this.posX - px, dz = this.posZ - pz;
        const distSq = dx * dx + dz * dz;
        const cullSq = _deps.CONFIG.rockCulling * _deps.CONFIG.rockCulling;
        const lodSq = _deps.CONFIG.rockLOD * _deps.CONFIG.rockLOD;
        
        if (distSq > cullSq) {
            this.group.visible = false;
        } else {
            this.group.visible = true;
            if (distSq > lodSq && this.lodLevel === 0) {
                this.lodLevel = 1;
                this.group.traverse(c => { if (c.castShadow) c.castShadow = false; });
            } else if (distSq <= lodSq && this.lodLevel === 1) {
                this.lodLevel = 0;
                this.mainRock.castShadow = false;
            }
        }
    }
    
    getWorldPos() { return this.group.position.clone(); }
    
    checkCollision(worldX, worldZ, playerRadius = 0.5) {
        if (this.isDestroyed) return false;
        const dx = worldX - this.posX;
        const dz = worldZ - this.posZ;
        const distSq = dx * dx + dz * dz;
        const minDist = this.radius + playerRadius;
        return distSq < minDist * minDist;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUND COVER CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

class GrassTuft {
    constructor(x, y, z) {
        this.posX = x;
        this.posZ = z;
        this.group = new THREE.Group();
        this.swayOff = Math.random() * Math.PI * 2;
        const mat = Math.random() > 0.5 ? _deps.mats.grass1 : _deps.mats.grass2;
        const bladeCount = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < bladeCount; i++) {
            const blade = new THREE.Mesh(_deps.sharedGeom.plane, mat);
            blade.scale.set(0.08 + Math.random() * 0.04, 0.3 + Math.random() * 0.25, 1);
            blade.position.set((Math.random() - 0.5) * 0.2, blade.scale.y / 2, (Math.random() - 0.5) * 0.2);
            blade.rotation.y = Math.random() * Math.PI;
            blade.rotation.x = -0.1 + Math.random() * 0.2;
            this.group.add(blade);
        }
        this.group.position.set(x, y, z);
        _deps.scene.add(this.group);
        groundCover.push(this);
    }
    
    updateVis(px, pz) {
        const dx = this.posX - px, dz = this.posZ - pz;
        this.group.visible = dx * dx + dz * dz < _deps.CONFIG.groundCulling * _deps.CONFIG.groundCulling;
    }
    
    updateWind(t, str) {
        if (!this.group.visible) return;
        const sway = Math.sin(t * 3 + this.swayOff) * 0.15 * str;
        this.group.rotation.x = sway;
    }
}

class Flower {
    constructor(x, y, z) {
        this.posX = x;
        this.posZ = z;
        this.group = new THREE.Group();
        const flowerMats = [_deps.mats.flowerRed, _deps.mats.flowerYellow, _deps.mats.flowerPurple, _deps.mats.flowerWhite];
        const petalMat = flowerMats[Math.floor(Math.random() * flowerMats.length)];
        
        const stem = new THREE.Mesh(_deps.sharedGeom.cylinder, _deps.mats.grass1);
        stem.scale.set(0.015, 0.25, 0.015);
        stem.position.y = 0.125;
        this.group.add(stem);
        
        for (let i = 0; i < 4; i++) {
            const petal = new THREE.Mesh(_deps.sharedGeom.sphere2, petalMat);
            const angle = (i / 4) * Math.PI * 2;
            petal.scale.set(0.05, 0.02, 0.08);
            petal.position.set(Math.cos(angle) * 0.04, 0.27, Math.sin(angle) * 0.04);
            petal.rotation.y = angle;
            this.group.add(petal);
        }
        
        const center = new THREE.Mesh(_deps.sharedGeom.sphere2, _deps.mats.flowerYellow);
        center.scale.setScalar(0.03);
        center.position.y = 0.27;
        this.group.add(center);
        
        this.group.position.set(x, y, z);
        _deps.scene.add(this.group);
        groundCover.push(this);
    }
    
    updateVis(px, pz) {
        const dx = this.posX - px, dz = this.posZ - pz;
        this.group.visible = dx * dx + dz * dz < _deps.CONFIG.groundCulling * _deps.CONFIG.groundCulling;
    }
}

class Mushroom {
    constructor(x, y, z) {
        this.posX = x;
        this.posZ = z;
        this.group = new THREE.Group();
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            const stem = new THREE.Mesh(_deps.sharedGeom.cylinder, _deps.mats.mushroom);
            const cap = new THREE.Mesh(_deps.sharedGeom.sphere2, _deps.mats.mushroomCap);
            const ox = (Math.random() - 0.5) * 0.1;
            const oz = (Math.random() - 0.5) * 0.1;
            const h = 0.08 + Math.random() * 0.06;
            stem.scale.set(0.025, h, 0.025);
            stem.position.set(ox, h / 2, oz);
            cap.scale.set(0.06 + Math.random() * 0.03, 0.03, 0.06 + Math.random() * 0.03);
            cap.position.set(ox, h + 0.02 + Math.random() * 0.02, oz);
            this.group.add(stem);
            this.group.add(cap);
        }
        this.group.position.set(x, y, z);
        _deps.scene.add(this.group);
        groundCover.push(this);
    }
    
    updateVis(px, pz) {
        const dx = this.posX - px, dz = this.posZ - pz;
        this.group.visible = dx * dx + dz * dz < _deps.CONFIG.groundCulling * _deps.CONFIG.groundCulling;
    }
}

class Fern {
    constructor(x, y, z) {
        this.posX = x;
        this.posZ = z;
        this.group = new THREE.Group();
        this.swayOff = Math.random() * Math.PI * 2;
        const frondCount = 3 + Math.floor(Math.random() * 2);
        for (let i = 0; i < frondCount; i++) {
            const frond = new THREE.Mesh(_deps.sharedGeom.plane, _deps.mats.fern);
            frond.scale.set(0.15, 0.4 + Math.random() * 0.2, 1);
            const angle = (i / frondCount) * Math.PI * 2;
            frond.rotation.y = angle;
            frond.rotation.x = -0.6 - Math.random() * 0.3;
            frond.position.y = 0.15;
            this.group.add(frond);
        }
        this.group.position.set(x, y, z);
        _deps.scene.add(this.group);
        groundCover.push(this);
    }
    
    updateVis(px, pz) {
        const dx = this.posX - px, dz = this.posZ - pz;
        this.group.visible = dx * dx + dz * dz < _deps.CONFIG.groundCulling * _deps.CONFIG.groundCulling;
    }
    
    updateWind(t, str) {
        if (!this.group.visible) return;
        this.group.children.forEach((frond, i) => {
            frond.rotation.x = -0.6 + Math.sin(t * 2 + this.swayOff + i) * 0.1 * str;
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getTreeTypesForBiome(biomeId) {
    const validTypes = [];
    for (let i = 0; i < treeTypes.length; i++) {
        if (treeTypes[i].biomes && treeTypes[i].biomes.includes(biomeId)) {
            validTypes.push(i);
        }
    }
    return validTypes.length > 0 ? validTypes : [0, 1, 2, 3];
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE SYSTEM API
// ═══════════════════════════════════════════════════════════════════════════════

const ResourceSystem = {
    init(deps) {
        _deps = { ..._deps, ...deps };
        
        // Set up grids if provided
        if (deps.treeGrid) treeGrid = deps.treeGrid;
        if (deps.rockGrid) rockGrid = deps.rockGrid;
        
        // Initialize rock type materials from mats
        rockTypes[0].mat = _deps.mats.rockGranite;
        rockTypes[1].mat = _deps.mats.rockSlate;
        rockTypes[2].mat = _deps.mats.rockMoss;
        rockTypes[3].mat = _deps.mats.rockSand;
        rockTypes[4].mat = _deps.mats.rockCrystal;
        rockTypes[5].mat = _deps.mats.rockObsidian;
        rockTypes[6].mat = _deps.mats.rockGranite;
        
        console.log('ResourceSystem initialized');
    },
    
    setGrids(tGrid, rGrid) {
        treeGrid = tGrid;
        rockGrid = rGrid;
    },
    
    // Tree creation
    createTree(x, y, z, size, typeIdx) {
        return new Tree(x, y, z, size, typeIdx);
    },
    
    // Rock creation
    createRock(x, y, z, radius, typeIdx) {
        return new Rock(x, y, z, radius, typeIdx);
    },
    
    // Ground cover creation
    createGrassTuft(x, y, z) { return new GrassTuft(x, y, z); },
    createFlower(x, y, z) { return new Flower(x, y, z); },
    createMushroom(x, y, z) { return new Mushroom(x, y, z); },
    createFern(x, y, z) { return new Fern(x, y, z); },
    
    // Accessors
    getSwayingTrees() { return swayingTrees; },
    getHarvestableResources() { return harvestableResources; },
    getGroundCover() { return groundCover; },
    getTreeTypes() { return treeTypes; },
    getRockTypes() { return rockTypes; },
    getTreeTypesForBiome,
    
    // Update methods
    updateTreeWind(t, windStrength, windDir) {
        swayingTrees.forEach(tree => tree.updateWind(t, windStrength, windDir));
    },
    
    updateVisibility(px, pz) {
        swayingTrees.forEach(tree => tree.updateVis(px, pz));
        harvestableResources.forEach(resource => {
            if (resource.updateVis) resource.updateVis(px, pz);
        });
        groundCover.forEach(item => {
            if (item.updateVis) item.updateVis(px, pz);
        });
    },
    
    updateGroundCoverWind(t, windStrength) {
        groundCover.forEach(item => {
            if (item.updateWind) item.updateWind(t, windStrength);
        });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    ResourceSystem,
    Tree,
    Rock,
    GrassTuft,
    Flower,
    Mushroom,
    Fern,
    treeTypes,
    rockTypes,
    foliageGeoms,
    foliageMats,
    trunkMats,
    getTreeTypesForBiome
};

export default ResourceSystem;
