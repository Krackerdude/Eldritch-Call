// ═══════════════════════════════════════════════════════════════════════════════
// VILLAGESYSTEM.JS - Meadows Village Buildings, Paths, and Exclusion Zones
// Dependencies: THREE.js, config.js
// Injected: scene, getHeight
// Consumers: Main game loop, ResourceSystem (exclusion), NPCSystem (exclusion)
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { VILLAGE_CONFIG, BUILDING_TYPES } from '../config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED MATERIALS (created once, reused across all buildings)
// ═══════════════════════════════════════════════════════════════════════════════

const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.85 });
const stoneAccentMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.8 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
const thatchMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 });
const doorMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.85 });
const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x3a2515, roughness: 0.9 });
const handleMat = new THREE.MeshStandardMaterial({ color: 0xb8860b, metalness: 0.8, roughness: 0.3 });
const windowMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
const warmWindowMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
const bannerMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, side: THREE.DoubleSide });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
const pathMat = new THREE.MeshStandardMaterial({ color: 0x8a7a60, roughness: 0.95, depthWrite: false });
const pathEdgeMat = new THREE.MeshStandardMaterial({ color: 0x6a5a40, roughness: 0.95, depthWrite: false });

// ═══════════════════════════════════════════════════════════════════════════════
// VILLAGE BUILDING CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class VillageBuilding {
    constructor(type, x, z, rotation, scene, getHeight) {
        this.type = type;
        this.config = BUILDING_TYPES[type];
        this.x = x;
        this.z = z;
        this.rotation = rotation;
        this.group = new THREE.Group();
        this.interactionRadius = 6;

        const groundY = getHeight(x, z);
        this.groundY = groundY;

        this.createExterior();
        this.createCollision();
        this.createDoor();

        // Sink slightly into ground for natural look
        this.group.position.set(x, groundY - 0.3, z);
        this.group.rotation.y = rotation;

        scene.add(this.group);

        this.position = new THREE.Vector3(x, groundY, z);
        this.name = this.config.name;
    }

    createCollision() {
        this.collisionBounds = {
            minX: -this.config.width / 2 - 1,
            maxX: this.config.width / 2 + 1,
            minZ: -this.config.depth / 2 - 1,
            maxZ: this.config.depth / 2 + 1,
            height: this.config.height
        };
    }

    checkCollision(worldX, worldZ, radius = 0.5) {
        const dx = worldX - this.x;
        const dz = worldZ - this.z;
        const cos = Math.cos(-this.rotation);
        const sin = Math.sin(-this.rotation);
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        const bounds = this.collisionBounds;
        return localX > bounds.minX - radius && localX < bounds.maxX + radius &&
               localZ > bounds.minZ - radius && localZ < bounds.maxZ + radius;
    }

    getDistance(px, pz) {
        const dx = px - this.x;
        const dz = pz - this.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    createExterior() {
        if (this.type === 'castle') {
            this._castleExterior();
        } else if (this.type === 'temple') {
            this._templeExterior();
        } else if (this.type === 'mageGuild') {
            this._mageGuildExterior();
        } else if (this.type === 'fighterGuild') {
            this._fighterGuildExterior();
        } else if (this.type === 'tavern') {
            this._tavernExterior();
        } else if (this.type === 'bank') {
            this._bankExterior();
        } else if (this.type === 'shop') {
            this._shopExterior();
        } else {
            this._houseExterior();
        }
    }

    createDoor() {
        const { depth } = this.config;

        const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3, 4.5, 0.4), doorFrameMat);
        doorFrame.position.set(0, 2.25, depth / 2 + 0.1);
        this.group.add(doorFrame);

        const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4, 0.25), doorMat);
        door.position.set(0, 2, depth / 2 + 0.25);
        this.group.add(door);

        const handle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), handleMat);
        handle.position.set(0.7, 2, depth / 2 + 0.45);
        this.group.add(handle);

        const awning = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 1.2), doorMat);
        awning.position.set(0, 4.5, depth / 2 + 0.6);
        awning.rotation.x = 0.15;
        this.group.add(awning);

        const doorLight = new THREE.PointLight(0xffaa44, 0.5, 10);
        doorLight.position.set(0, 4, depth / 2 + 1);
        this.group.add(doorLight);
    }

    // ─── Castle ────────────────────────────────────────────────────────────────
    _castleExterior() {
        const { width, depth, height } = this.config;

        // Main keep
        const keep = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, height, depth * 0.6), stoneMat);
        keep.position.set(0, height / 2, 0);
        this.group.add(keep);

        // Four corner towers
        const tR = 5, tH = height * 1.3;
        const corners = [
            [-width / 2 + tR, -depth / 2 + tR], [width / 2 - tR, -depth / 2 + tR],
            [-width / 2 + tR, depth / 2 - tR], [width / 2 - tR, depth / 2 - tR]
        ];
        corners.forEach(([tx, tz]) => {
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(tR, tR * 1.1, tH, 8), stoneMat);
            tower.position.set(tx, tH / 2, tz);
            this.group.add(tower);

            const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(tR * 1.2, 6, 8), roofMat);
            towerRoof.position.set(tx, tH + 3, tz);
            this.group.add(towerRoof);

            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const batt = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1), stoneMat);
                batt.position.set(tx + Math.cos(angle) * (tR - 0.5), tH + 1, tz + Math.sin(angle) * (tR - 0.5));
                this.group.add(batt);
            }
        });

        // Connecting walls
        const wH = height * 0.7, wT = 2;

        const fwL = new THREE.Mesh(new THREE.BoxGeometry((width - 8) / 2, wH, wT), stoneMat);
        fwL.position.set(-width / 4 - 2, wH / 2, depth / 2 - tR);
        this.group.add(fwL);

        const fwR = new THREE.Mesh(new THREE.BoxGeometry((width - 8) / 2, wH, wT), stoneMat);
        fwR.position.set(width / 4 + 2, wH / 2, depth / 2 - tR);
        this.group.add(fwR);

        const gateArch = new THREE.Mesh(new THREE.BoxGeometry(8, wH * 0.4, wT), stoneMat);
        gateArch.position.set(0, wH * 0.8, depth / 2 - tR);
        this.group.add(gateArch);

        const sw1 = new THREE.Mesh(new THREE.BoxGeometry(wT, wH, depth - tR * 2), stoneMat);
        sw1.position.set(-width / 2 + tR, wH / 2, 0);
        this.group.add(sw1);

        const sw2 = new THREE.Mesh(new THREE.BoxGeometry(wT, wH, depth - tR * 2), stoneMat);
        sw2.position.set(width / 2 - tR, wH / 2, 0);
        this.group.add(sw2);

        const bw = new THREE.Mesh(new THREE.BoxGeometry(width - tR * 2, wH, wT), stoneMat);
        bw.position.set(0, wH / 2, -depth / 2 + tR);
        this.group.add(bw);

        // Main tower on keep
        const mTower = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, height * 0.6, 8), stoneAccentMat);
        mTower.position.set(0, height + height * 0.3, -depth * 0.15);
        this.group.add(mTower);

        const mRoof = new THREE.Mesh(new THREE.ConeGeometry(5, 8, 8), roofMat);
        mRoof.position.set(0, height + height * 0.6 + 4, -depth * 0.15);
        this.group.add(mRoof);

        // Banner
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), poleMat);
        pole.position.set(0, height + height * 0.6 + 11, -depth * 0.15);
        this.group.add(pole);

        const banner = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), bannerMat);
        banner.position.set(1.5, height + height * 0.6 + 10, -depth * 0.15);
        this.group.add(banner);
    }

    // ─── Temple ────────────────────────────────────────────────────────────────
    _templeExterior() {
        const { width, depth, height } = this.config;

        const platform = new THREE.Mesh(new THREE.BoxGeometry(width + 4, 1.5, depth + 4), stoneMat);
        platform.position.set(0, 0.75, 0);
        this.group.add(platform);

        const main = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.7, depth), stoneMat);
        main.position.set(0, height * 0.35 + 1.5, 0);
        this.group.add(main);

        for (let i = -2; i <= 2; i++) {
            if (i === 0) continue;
            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, height * 0.65, 8), stoneAccentMat);
            pillar.position.set(i * 4, height * 0.325 + 1.5, depth / 2 + 1);
            this.group.add(pillar);
        }

        // Triangular pediment
        const pedGeo = new THREE.BufferGeometry();
        pedGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -width / 2 - 1, height * 0.7 + 1.5, depth / 2 + 2,
            width / 2 + 1, height * 0.7 + 1.5, depth / 2 + 2,
            0, height + 1.5, depth / 2 + 2
        ]), 3));
        pedGeo.computeVertexNormals();
        this.group.add(new THREE.Mesh(pedGeo, stoneAccentMat));

        const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 2, 1, depth + 2), roofMat);
        roof.position.set(0, height * 0.7 + 2, 0);
        this.group.add(roof);

        const spire = new THREE.Mesh(new THREE.ConeGeometry(2, 8, 8), stoneAccentMat);
        spire.position.set(0, height * 0.7 + 6, 0);
        this.group.add(spire);

        const orbMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), orbMat);
        orb.position.set(0, height * 0.7 + 10.5, 0);
        this.group.add(orb);

        const orbLight = new THREE.PointLight(0xffdd88, 1, 20);
        orbLight.position.copy(orb.position);
        this.group.add(orbLight);
    }

    // ─── Mage Guild ────────────────────────────────────────────────────────────
    _mageGuildExterior() {
        const { width, depth, height } = this.config;

        const tower = new THREE.Mesh(new THREE.CylinderGeometry(width / 2 - 2, width / 2, height, 8), stoneMat);
        tower.position.set(0, height / 2, 0);
        this.group.add(tower);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(width / 2 + 1, height * 0.5, 8), roofMat);
        roof.position.set(0, height + height * 0.25, 0);
        this.group.add(roof);

        const sideTower = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, height * 0.8, 8), stoneMat);
        sideTower.position.set(width / 2 - 1, height * 0.4, depth / 4);
        this.group.add(sideTower);

        const sideRoof = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 8), roofMat);
        sideRoof.position.set(width / 2 - 1, height * 0.8 + 2.5, depth / 4);
        this.group.add(sideRoof);

        const crystalMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, emissive: 0x2244aa, emissiveIntensity: 0.5 });
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), crystalMat);
            crystal.position.set(Math.cos(angle) * (width / 2 - 1), height - 1, Math.sin(angle) * (width / 2 - 1));
            crystal.scale.y = 2;
            this.group.add(crystal);
        }

        const entrance = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 4), stoneMat);
        entrance.position.set(0, 2.5, depth / 2 - 1);
        this.group.add(entrance);
    }

    // ─── Fighter Guild ─────────────────────────────────────────────────────────
    _fighterGuildExterior() {
        const { width, depth, height } = this.config;

        const main = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stoneMat);
        main.position.set(0, height / 2, 0);
        this.group.add(main);

        // Peaked roof
        const hw = width / 2, hd = depth / 2, rh = height * 0.5;
        const roofGeo = new THREE.BufferGeometry();
        roofGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -hw - 1, height, -hd - 1, hw + 1, height, -hd - 1, 0, height + rh, 0,
            hw + 1, height, -hd - 1, hw + 1, height, hd + 1, 0, height + rh, 0,
            hw + 1, height, hd + 1, -hw - 1, height, hd + 1, 0, height + rh, 0,
            -hw - 1, height, hd + 1, -hw - 1, height, -hd - 1, 0, height + rh, 0
        ]), 3));
        roofGeo.computeVertexNormals();
        this.group.add(new THREE.Mesh(roofGeo, roofMat));

        // Training dummy
        const dummyPole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 6), woodMat);
        dummyPole.position.set(width / 2 + 3, 2.5, 0);
        this.group.add(dummyPole);

        const dummyBody = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 2, 8), thatchMat);
        dummyBody.position.set(width / 2 + 3, 4, 0);
        this.group.add(dummyBody);

        // Weapon rack
        const rack = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 0.3), woodMat);
        rack.position.set(-width / 2 - 0.2, 2.5, depth / 4);
        rack.rotation.y = Math.PI / 2;
        this.group.add(rack);

        // Shield emblem
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
        const shield = new THREE.Mesh(new THREE.CircleGeometry(1.5, 6), shieldMat);
        shield.position.set(0, height - 2, depth / 2 + 0.1);
        this.group.add(shield);
    }

    // ─── Tavern ────────────────────────────────────────────────────────────────
    _tavernExterior() {
        const { width, depth, height } = this.config;

        // Stone base
        const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.45, depth), stoneMat);
        stoneBase.position.set(0, height * 0.225, 0);
        this.group.add(stoneBase);

        // Wood upper (overhanging)
        const upper = new THREE.Mesh(new THREE.BoxGeometry(width + 1.5, height * 0.55, depth + 0.8), woodMat);
        upper.position.set(0, height * 0.45 + height * 0.275, 0.4);
        this.group.add(upper);

        // Support beams
        for (let i = -1; i <= 1; i++) {
            const support = new THREE.Mesh(new THREE.BoxGeometry(0.25, height * 0.45, 0.25), woodMat);
            support.position.set(i * (width / 3), height * 0.225, depth / 2 + 0.5);
            this.group.add(support);
        }

        // Thatched roof
        const roofHeight = 4;
        const roofGeo = new THREE.BufferGeometry();
        roofGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -width / 2 - 1.5, height, -depth / 2 - 0.5,
            width / 2 + 1.5, height, -depth / 2 - 0.5,
            0, height + roofHeight, -depth / 2 - 0.5,
            -width / 2 - 1.5, height, depth / 2 + 1.5,
            width / 2 + 1.5, height, depth / 2 + 1.5,
            0, height + roofHeight, depth / 2 + 1.5,
        ]), 3));
        roofGeo.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 2, 2, 3, 5, 1, 2, 5, 1, 5, 4]);
        roofGeo.computeVertexNormals();
        this.group.add(new THREE.Mesh(roofGeo, thatchMat));

        // Chimney
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4, 1.8), stoneMat);
        chimney.position.set(width / 3, height + 3, -depth / 4);
        this.group.add(chimney);

        // Sign post
        const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4, 8), woodMat);
        signPost.position.set(width / 2 + 2, 2, depth / 2);
        this.group.add(signPost);

        const signArm = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 0.2), woodMat);
        signArm.position.set(width / 2 + 1, 3.5, depth / 2);
        this.group.add(signArm);

        const signBoardMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 0.15), signBoardMat);
        signBoard.position.set(width / 2 + 1, 2.5, depth / 2);
        this.group.add(signBoard);

        // Windows
        const wPos = [
            { x: -width / 3, y: height * 0.25, z: depth / 2 + 0.1 },
            { x: 0, y: height * 0.25, z: depth / 2 + 0.1 },
            { x: width / 3, y: height * 0.25, z: depth / 2 + 0.1 },
            { x: -width / 4, y: height * 0.7, z: depth / 2 + 1 },
            { x: width / 4, y: height * 0.7, z: depth / 2 + 1 },
        ];
        wPos.forEach(pos => {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.8), warmWindowMat);
            win.position.set(pos.x, pos.y, pos.z);
            this.group.add(win);
        });

        // Lantern by door
        const lanternPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 }));
        lanternPost.position.set(3, height * 0.4, depth / 2 + 0.5);
        lanternPost.rotation.z = -0.3;
        this.group.add(lanternPost);

        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4),
            new THREE.MeshBasicMaterial({ color: 0xffcc44 }));
        lantern.position.set(3.3, height * 0.35, depth / 2 + 0.5);
        this.group.add(lantern);
    }

    // ─── Bank ──────────────────────────────────────────────────────────────────
    _bankExterior() {
        const { width, depth, height } = this.config;

        const main = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stoneMat);
        main.position.set(0, height / 2, 0);
        this.group.add(main);

        // Grand entrance pillars
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6 });
        for (let i = -1; i <= 1; i += 2) {
            const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), stoneAccentMat);
            base.position.set(i * 3.5, 0.4, depth / 2 + 1.5);
            this.group.add(base);

            const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, height * 0.75, 12), pillarMat);
            pillar.position.set(i * 3.5, 0.8 + height * 0.375, depth / 2 + 1.5);
            this.group.add(pillar);

            const capital = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), stoneAccentMat);
            capital.position.set(i * 3.5, 0.8 + height * 0.75 + 0.3, depth / 2 + 1.5);
            this.group.add(capital);
        }

        // Portico
        const portico = new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, 4), stoneAccentMat);
        portico.position.set(0, height * 0.85, depth / 2 + 1.5);
        this.group.add(portico);

        // Pediment
        const pedGeo = new THREE.BufferGeometry();
        pedGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -4.5, height * 0.85 + 0.3, depth / 2 + 3.5,
            4.5, height * 0.85 + 0.3, depth / 2 + 3.5,
            0, height * 0.85 + 2.5, depth / 2 + 3.5,
            -4.5, height * 0.85 + 0.3, depth / 2 - 0.3,
            4.5, height * 0.85 + 0.3, depth / 2 - 0.3,
            0, height * 0.85 + 2.5, depth / 2 - 0.3,
        ]), 3));
        pedGeo.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4]);
        pedGeo.computeVertexNormals();
        this.group.add(new THREE.Mesh(pedGeo, stoneAccentMat));

        // Flat roof with parapet
        const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 1.5, 0.6, depth + 1.5), stoneAccentMat);
        roof.position.set(0, height + 0.3, 0);
        this.group.add(roof);

        // Gold coin emblem
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.3, 24), coinMat);
        coin.position.set(0, height - 2.5, depth / 2 + 0.2);
        coin.rotation.x = Math.PI / 2;
        this.group.add(coin);

        // Barred windows
        const bWindowMat = new THREE.MeshBasicMaterial({ color: 0x445566 });
        for (let i = -1; i <= 1; i += 2) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), bWindowMat);
            win.position.set(i * (width / 3), height * 0.5, depth / 2 + 0.1);
            this.group.add(win);
        }
    }

    // ─── Shop ──────────────────────────────────────────────────────────────────
    _shopExterior() {
        const { width, depth, height } = this.config;

        const walls = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stoneMat);
        walls.position.set(0, height / 2, 0);
        this.group.add(walls);

        // Timber frame accents
        const beams = [
            { x: -width / 2 + 0.15, y: height / 2, z: depth / 2 + 0.1, w: 0.3, h: height, d: 0.2 },
            { x: width / 2 - 0.15, y: height / 2, z: depth / 2 + 0.1, w: 0.3, h: height, d: 0.2 },
            { x: 0, y: height - 0.15, z: depth / 2 + 0.1, w: width, h: 0.3, d: 0.2 },
            { x: 0, y: 0.15, z: depth / 2 + 0.1, w: width, h: 0.3, d: 0.2 },
        ];
        beams.forEach(b => {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), darkWoodMat);
            beam.position.set(b.x, b.y, b.z);
            this.group.add(beam);
        });

        // Sloped roof
        const roofGeo = new THREE.BufferGeometry();
        roofGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -width / 2 - 1, height, -depth / 2 - 0.5,
            width / 2 + 1, height, -depth / 2 - 0.5,
            width / 2 + 1, height, depth / 2 + 0.5,
            -width / 2 - 1, height, depth / 2 + 0.5,
            -width / 2 - 1, height + 3, 0,
            width / 2 + 1, height + 3, 0,
        ]), 3));
        roofGeo.setIndex([0, 4, 1, 1, 4, 5, 2, 5, 3, 3, 5, 4, 0, 3, 4, 1, 5, 2]);
        roofGeo.computeVertexNormals();
        this.group.add(new THREE.Mesh(roofGeo, thatchMat));

        // Awning
        const awn = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.15, 2.5), woodMat);
        awn.position.set(0, height * 0.7, depth / 2 + 1.2);
        awn.rotation.x = 0.15;
        this.group.add(awn);

        // Shop sign
        const signPost = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), darkWoodMat);
        signPost.position.set(width / 2 + 1.5, 1.5, depth / 2);
        this.group.add(signPost);

        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 0.15), woodMat);
        signBoard.position.set(width / 2 + 1.5, 3.5, depth / 2);
        this.group.add(signBoard);

        // Windows
        const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2), windowMat);
        w1.position.set(width / 4, height * 0.5, depth / 2 + 0.1);
        this.group.add(w1);

        const w2 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2), windowMat);
        w2.position.set(-width / 4, height * 0.5, depth / 2 + 0.1);
        this.group.add(w2);

        // Chimney
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3, 1.2), stoneMat);
        chimney.position.set(width / 3, height + 2, -depth / 4);
        this.group.add(chimney);
    }

    // ─── House ─────────────────────────────────────────────────────────────────
    _houseExterior() {
        const { width, depth, height } = this.config;
        const plasterMat = new THREE.MeshStandardMaterial({ color: 0xd4c4a8, roughness: 0.9 });
        const shutterMat = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.9 });

        // Stone base
        const stoneBase = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.35, depth), stoneMat);
        stoneBase.position.set(0, height * 0.175, 0);
        this.group.add(stoneBase);

        // Plaster upper
        const upper = new THREE.Mesh(new THREE.BoxGeometry(width, height * 0.65, depth), plasterMat);
        upper.position.set(0, height * 0.35 + height * 0.325, 0);
        this.group.add(upper);

        // Half-timber beams on front face
        const beamDefs = [
            { x: -width / 2 + 0.1, y: height / 2, z: depth / 2 + 0.05, w: 0.25, h: height, d: 0.15 },
            { x: width / 2 - 0.1, y: height / 2, z: depth / 2 + 0.05, w: 0.25, h: height, d: 0.15 },
            { x: 0, y: height * 0.35, z: depth / 2 + 0.05, w: width, h: 0.2, d: 0.15 },
            { x: 0, y: height - 0.1, z: depth / 2 + 0.05, w: width, h: 0.2, d: 0.15 },
            { x: -width / 4, y: height * 0.6, z: depth / 2 + 0.05, w: 0.15, h: height * 0.4, d: 0.1, rz: 0.4 },
            { x: width / 4, y: height * 0.6, z: depth / 2 + 0.05, w: 0.15, h: height * 0.4, d: 0.1, rz: -0.4 },
        ];
        beamDefs.forEach(b => {
            const beam = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), darkWoodMat);
            beam.position.set(b.x, b.y, b.z);
            if (b.rz) beam.rotation.z = b.rz;
            this.group.add(beam);
        });

        // Pitched roof
        const rH = 3.5, rO = 1.2;
        const roofGeo = new THREE.BufferGeometry();
        roofGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
            -width / 2 - rO, height, -depth / 2 - 0.5,
            width / 2 + rO, height, -depth / 2 - 0.5,
            0, height + rH, -depth / 2 - 0.5,
            -width / 2 - rO, height, depth / 2 + 0.5,
            width / 2 + rO, height, depth / 2 + 0.5,
            0, height + rH, depth / 2 + 0.5,
        ]), 3));
        roofGeo.setIndex([0, 2, 1, 3, 4, 5, 0, 3, 2, 2, 3, 5, 1, 2, 5, 1, 5, 4]);
        roofGeo.computeVertexNormals();
        this.group.add(new THREE.Mesh(roofGeo, thatchMat));

        // Chimney
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, 1.2), stoneMat);
        chimney.position.set(-width / 4, height + 2.5, -depth / 4);
        this.group.add(chimney);

        const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), stoneMat);
        chimneyTop.position.set(-width / 4, height + 4.3, -depth / 4);
        this.group.add(chimneyTop);

        // Windows with shutters
        [-1, 1].forEach(side => {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), windowMat);
            win.position.set(side * (width / 4), height * 0.6, depth / 2 + 0.1);
            this.group.add(win);

            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.9, 0.1), darkWoodMat);
            frame.position.set(side * (width / 4), height * 0.6, depth / 2 + 0.15);
            this.group.add(frame);

            const sL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.7, 0.08), shutterMat);
            sL.position.set(side * (width / 4) - 0.9, height * 0.6, depth / 2 + 0.18);
            sL.rotation.y = 0.3;
            this.group.add(sL);

            const sR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.7, 0.08), shutterMat);
            sR.position.set(side * (width / 4) + 0.9, height * 0.6, depth / 2 + 0.18);
            sR.rotation.y = -0.3;
            this.group.add(sR);
        });

        // Flower box
        const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.5), darkWoodMat);
        flowerBox.position.set(width / 4, height * 0.35, depth / 2 + 0.3);
        this.group.add(flowerBox);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VILLAGE LAYOUT - Scaled for 3000-unit terrain (larger spread than HTML build)
// ═══════════════════════════════════════════════════════════════════════════════

// Scale factor: HTML build was ~200-unit radius village on ~600-unit terrain
// Now: ~120-unit radius village on 3000-unit terrain, but buildings are same size
// We keep buildings same scale but spread them out more with wider paths

const VILLAGE_LAYOUT = [
    { type: 'castle',       x:   0, z: -85, rotation: 0 },
    { type: 'temple',       x: -55, z: -40, rotation: Math.PI * 0.1 },
    { type: 'mageGuild',    x:  55, z: -38, rotation: -Math.PI * 0.1 },
    { type: 'fighterGuild', x: -60, z:  22, rotation: Math.PI * 0.15 },
    { type: 'tavern',       x:  28, z:  32, rotation: -Math.PI * 0.05 },
    { type: 'shop',         x: -28, z:  38, rotation: Math.PI * 0.08 },
    { type: 'bank',         x:  58, z:  28, rotation: -Math.PI * 0.12 },
    { type: 'house',        x: -38, z:  65, rotation: Math.PI * 0.2 },
    { type: 'house',        x:   0, z:  60, rotation: 0 },
    { type: 'house',        x:  38, z:  62, rotation: -Math.PI * 0.15 },
    // Additional buildings for the larger space
    { type: 'house',        x: -70, z: -15, rotation: Math.PI * 0.25 },
    { type: 'house',        x:  75, z: -10, rotation: -Math.PI * 0.2 },
    { type: 'house',        x: -15, z:  80, rotation: Math.PI * 0.1 },
    { type: 'house',        x:  60, z:  60, rotation: -Math.PI * 0.08 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PATH CONNECTIONS - Natural dirt paths between buildings
// ═══════════════════════════════════════════════════════════════════════════════

// Paths defined as pairs of building indices + optional waypoints
const PATH_CONNECTIONS = [
    // Main road: castle -> town center -> south
    [0, 4],   // castle -> tavern
    [0, 2],   // castle -> mage guild
    [0, 1],   // castle -> temple
    // Cross connections
    [1, 3],   // temple -> fighter guild
    [2, 6],   // mage guild -> bank
    [3, 5],   // fighter guild -> shop
    [4, 5],   // tavern -> shop
    [4, 6],   // tavern -> bank
    // South road
    [5, 7],   // shop -> house west
    [4, 8],   // tavern -> house center
    [6, 9],   // bank -> house east
    // Extra houses
    [3, 10],  // fighter guild -> house NW
    [2, 11],  // mage guild -> house NE
    [8, 12],  // house center -> house S
    [9, 13],  // house east -> house SE
];

// ═══════════════════════════════════════════════════════════════════════════════
// VILLAGE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

let _scene = null;
let _getHeight = null;
const _buildings = [];
const _pathMeshes = [];

const VillageSystem = {
    init(deps) {
        _scene = deps.scene;
        _getHeight = deps.getHeight;
    },

    generate() {
        if (!_scene || !_getHeight) return;

        // Create buildings
        VILLAGE_LAYOUT.forEach(b => {
            const bx = VILLAGE_CONFIG.center.x + b.x;
            const bz = VILLAGE_CONFIG.center.z + b.z;
            const building = new VillageBuilding(b.type, bx, bz, b.rotation, _scene, _getHeight);
            _buildings.push(building);
        });

        // Create paths between buildings
        this._createPaths();

        // Create a central town square/plaza
        this._createTownSquare();

        console.log(`Village generated: ${_buildings.length} buildings, ${_pathMeshes.length} path segments`);
    },

    _createPaths() {
        PATH_CONNECTIONS.forEach(([fromIdx, toIdx]) => {
            if (fromIdx >= _buildings.length || toIdx >= _buildings.length) return;
            const from = _buildings[fromIdx];
            const to = _buildings[toIdx];
            this._createPathBetween(from.x, from.z, to.x, to.z);
        });
    },

    _createPathBetween(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const segments = Math.max(4, Math.floor(dist / 4));
        const pathWidth = 3.0;

        const angle = Math.atan2(dz, dx);

        for (let i = 0; i < segments; i++) {
            const t = (i + 0.5) / segments;
            const px = x1 + dx * t;
            const pz = z1 + dz * t;
            const py = _getHeight(px, pz) + 0.05;

            const segLen = dist / segments + 0.5;

            // Main path segment
            const pathGeo = new THREE.PlaneGeometry(segLen, pathWidth);
            const pathMesh = new THREE.Mesh(pathGeo, pathMat);
            pathMesh.position.set(px, py, pz);
            pathMesh.rotation.x = -Math.PI / 2;
            pathMesh.rotation.z = -angle;
            pathMesh.receiveShadow = true;
            _scene.add(pathMesh);
            _pathMeshes.push(pathMesh);

            // Path edge stones (alternating sides)
            if (i % 2 === 0) {
                const edgeGeo = new THREE.PlaneGeometry(segLen, 0.6);
                for (let side = -1; side <= 1; side += 2) {
                    const ex = px + Math.sin(angle) * (pathWidth / 2 + 0.2) * side;
                    const ez = pz - Math.cos(angle) * (pathWidth / 2 + 0.2) * side;
                    const edge = new THREE.Mesh(edgeGeo, pathEdgeMat);
                    edge.position.set(ex, py + 0.01, ez);
                    edge.rotation.x = -Math.PI / 2;
                    edge.rotation.z = -angle;
                    edge.receiveShadow = true;
                    _scene.add(edge);
                    _pathMeshes.push(edge);
                }
            }
        }
    },

    _createTownSquare() {
        // Central plaza area near origin
        const cx = VILLAGE_CONFIG.center.x;
        const cz = VILLAGE_CONFIG.center.z;
        const squareSize = 18;
        const py = _getHeight(cx, cz) + 0.06;

        // Main plaza surface
        const squareGeo = new THREE.PlaneGeometry(squareSize, squareSize);
        const square = new THREE.Mesh(squareGeo, pathMat);
        square.position.set(cx, py, cz);
        square.rotation.x = -Math.PI / 2;
        square.receiveShadow = true;
        _scene.add(square);
        _pathMeshes.push(square);

        // Stone border
        const borderGeo = new THREE.PlaneGeometry(squareSize + 2, squareSize + 2);
        const border = new THREE.Mesh(borderGeo, pathEdgeMat);
        border.position.set(cx, py - 0.01, cz);
        border.rotation.x = -Math.PI / 2;
        border.receiveShadow = true;
        _scene.add(border);
        _pathMeshes.push(border);

        // Well in center
        const wellBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 1.2, 12), stoneMat);
        wellBase.position.set(cx, py + 0.6, cz);
        _scene.add(wellBase);

        const wellRim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.2, 8, 12), stoneMat);
        wellRim.position.set(cx, py + 1.2, cz);
        wellRim.rotation.x = Math.PI / 2;
        _scene.add(wellRim);

        // Well posts
        for (let i = -1; i <= 1; i += 2) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), woodMat);
            post.position.set(cx + i * 1.2, py + 2.5, cz);
            _scene.add(post);
        }

        // Well crossbar + rope
        const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.2), woodMat);
        crossbar.position.set(cx, py + 4, cz);
        _scene.add(crossbar);

        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 6), darkWoodMat);
        rope.position.set(cx, py + 2.5, cz);
        _scene.add(rope);

        // Bucket
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 8), woodMat);
        bucket.position.set(cx, py + 1.4, cz);
        _scene.add(bucket);
    },

    // ─── Exclusion Zone Queries ────────────────────────────────────────────────

    isInVillage(x, z) {
        const dx = x - VILLAGE_CONFIG.center.x;
        const dz = z - VILLAGE_CONFIG.center.z;
        return Math.sqrt(dx * dx + dz * dz) < VILLAGE_CONFIG.radius;
    },

    isNearBuilding(x, z, minDist = 12) {
        for (const b of _buildings) {
            const dx = x - b.x;
            const dz = z - b.z;
            const buildingRadius = Math.max(b.config.width, b.config.depth) / 2 + minDist;
            if (Math.sqrt(dx * dx + dz * dz) < buildingRadius) return true;
        }
        return false;
    },

    checkBuildingCollision(worldX, worldZ, radius = 0.5) {
        for (const b of _buildings) {
            if (b.checkCollision(worldX, worldZ, radius)) return true;
        }
        return false;
    },

    getBuildings() {
        return _buildings;
    },

    getNearestBuilding(px, pz) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const b of _buildings) {
            const d = b.getDistance(px, pz);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = b;
            }
        }
        return { building: nearest, distance: nearestDist };
    },

    getInteractableBuilding(px, pz) {
        for (const b of _buildings) {
            if (b.getDistance(px, pz) < b.interactionRadius) {
                return b;
            }
        }
        return null;
    }
};

export { VillageSystem, VillageBuilding };
export default VillageSystem;
