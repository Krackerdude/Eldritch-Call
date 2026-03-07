// ═══════════════════════════════════════════════════════════════
// MODEL VIEWER - 3D Entity Browser
// ═══════════════════════════════════════════════════════════════

(function initModelViewer() {
    if (typeof THREE === 'undefined') {
        console.warn('Model Viewer: THREE.js not loaded');
        return;
    }
    const mvScreen = document.getElementById('model-viewer-screen');
    if (!mvScreen) return;

    const mvCanvas = document.getElementById('mv-viewer-canvas');
    const mvListScroll = document.getElementById('mv-list-scroll');
    const mvListTitle = document.getElementById('mv-list-title');
    const mvListCount = document.getElementById('mv-list-count');
    const mvInfoName = document.getElementById('mv-info-name');
    const mvInfoSub = document.getElementById('mv-info-sub');
    const mvNoModel = document.getElementById('mv-no-model');
    const mvViewerOverlay = document.getElementById('mv-viewer-overlay');
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

    // ── Model Library Definition ──
    const MODEL_LIBRARY = {
        flora: {
            label: 'Flora',
            items: [
                { name: 'Oak Tree', sub: 'Rolling Meadows', builder: buildOakTree },
                { name: 'Pine Tree', sub: 'Rolling Meadows', builder: buildPineTree },
                { name: 'Birch Tree', sub: 'Rolling Meadows', builder: buildBirchTree },
                { name: 'Cypress Tree', sub: 'Rolling Meadows', builder: buildCypressTree },
                { name: 'Maple Tree', sub: 'Rolling Meadows', builder: buildMapleTree },
                { name: 'Dead Tree', sub: 'Shadow Vale', builder: buildDeadTree },
                { name: 'Cactus', sub: 'Crimson Dunes', builder: buildCactus },
                { name: 'Palm Tree', sub: 'Crimson Dunes', builder: buildPalmTree },
                { name: 'Frosted Pine', sub: 'Frozen Peaks', builder: buildFrostedPine },
                { name: 'Willow Tree', sub: 'Murky Swamp', builder: buildWillowTree },
                { name: 'Crystal Tree', sub: 'Crystal Heights', builder: buildCrystalTree },
                { name: 'Twisted Tree', sub: 'Shadow Vale', builder: buildTwistedTree },
                { name: 'Ancient Tree', sub: 'Ancient Woodlands', builder: buildAncientTree },
            ]
        },
        fauna: {
            label: 'Fauna',
            items: [
                { name: 'Deer', sub: 'Passive Creature', builder: buildDeer },
                { name: 'Fox', sub: 'Passive Creature', builder: buildFox },
                { name: 'Sheep', sub: 'Passive Creature', builder: buildSheep },
                { name: 'Rabbit', sub: 'Passive Creature', builder: buildRabbit },
                { name: 'Butterfly', sub: 'Flying Creature', builder: buildButterfly },
                { name: 'Bird', sub: 'Flying Creature', builder: buildBird },
            ]
        },
        groundcover: {
            label: 'Groundcover',
            items: [
                { name: 'Grass Tuft', sub: 'Ground Flora', builder: buildGrassTuft },
                { name: 'Red Flower', sub: 'Ground Flora', builder: () => buildFlower(0xff4444) },
                { name: 'Yellow Flower', sub: 'Ground Flora', builder: () => buildFlower(0xffdd44) },
                { name: 'Purple Flower', sub: 'Ground Flora', builder: () => buildFlower(0xaa44ff) },
                { name: 'Mushroom Cluster', sub: 'Ground Flora', builder: buildMushroom },
            ]
        },
        npcs: {
            label: 'NPCs',
            items: [
                { name: 'Eldric the Wanderer', sub: 'Traveling Sage', builder: () => buildNPC(0x888888, 0x4a3728, true) },
                { name: 'Mira Thornweave', sub: 'Master Herbalist', builder: () => buildNPC(0x8B6C5C, 0x2d5a1e, false) },
                { name: 'Grimjaw Ironhand', sub: 'Master Weaponsmith', builder: () => buildNPC(0x5C4033, 0x8B0000, false) },
                { name: 'Helena Steelweave', sub: 'Master Armorsmith', builder: () => buildNPC(0xF5DEB3, 0x4682B4, false) },
                { name: 'Professor Aldwin Quill', sub: 'Arcane Scholar', builder: () => buildNPC(0xCCCCCC, 0x2E0854, true) },
            ]
        },
        buildings: {
            label: 'Buildings',
            items: [
                { name: 'Valdris Keep', sub: 'Castle', builder: buildCastle },
                { name: 'Temple of the Ancients', sub: 'Temple', builder: buildTemple },
                { name: 'The Golden Flagon', sub: 'Tavern', builder: buildTavern },
                { name: 'General Store', sub: 'Shop', builder: buildGeneralStore },
                { name: 'House', sub: 'Residential', builder: buildHouse },
            ]
        },
        items: {
            label: 'Items',
            items: [
                { name: 'Wood', sub: 'Resource', builder: () => buildResource(0x8B6914, 'wood') },
                { name: 'Stone', sub: 'Resource', builder: () => buildResource(0x888888, 'stone') },
                { name: 'Iron Ore', sub: 'Resource', builder: () => buildResource(0x8B7355, 'ore') },
                { name: 'Coal', sub: 'Resource', builder: () => buildResource(0x222222, 'coal') },
                { name: 'Leather', sub: 'Resource', builder: () => buildResource(0x8B4513, 'leather') },
                { name: 'Fiber', sub: 'Resource', builder: () => buildResource(0x90EE90, 'fiber') },
            ]
        },
        weapons: {
            label: 'Weapons',
            items: [
                { name: 'Knight Broadsword', sub: '32 Damage', builder: () => buildSword(0xC0C0C0, 1.2) },
                { name: 'Shadow Dagger', sub: '15 Damage', builder: () => buildSword(0x333344, 0.5) },
                { name: 'Iaijutsu Katana', sub: '26 Damage', builder: () => buildSword(0xDDDDDD, 1.0) },
                { name: 'Holy Mace', sub: '25 Damage', builder: buildMace },
                { name: 'Dragoon Lance', sub: '28 Damage', builder: buildLance },
                { name: 'Ranger Longbow', sub: '22 Damage', builder: buildBow },
                { name: 'Arcane Staff', sub: '18 Damage', builder: buildStaff },
            ]
        },
        tools: {
            label: 'Tools',
            items: [
                { name: 'Iron Axe', sub: '25 Damage', builder: buildAxe },
                { name: 'Iron Pickaxe', sub: '20 Damage', builder: buildPickaxe },
                { name: 'Torch', sub: 'Light Source', builder: buildTorch },
            ]
        }
    };

    // ── Three.js Setup ──
    function mvInitRenderer() {
        if (mvRenderer) return;
        mvRenderer = new THREE.WebGLRenderer({ canvas: mvCanvas, antialias: true, alpha: true });
        mvRenderer.setPixelRatio(window.devicePixelRatio);
        mvRenderer.setClearColor(0x000000, 0);
        mvScene = new THREE.Scene();
        mvCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        mvCamera.position.set(0, 2, 5);
        mvCamera.lookAt(0, 0.5, 0);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        mvScene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 8, 5);
        mvScene.add(dirLight);
        const backLight = new THREE.DirectionalLight(0x6b2d9e, 0.3);
        backLight.position.set(-3, 2, -5);
        mvScene.add(backLight);

        // Ground grid
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

    // ── Rendering Loop ──
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
        if (mvAnimId) {
            cancelAnimationFrame(mvAnimId);
            mvAnimId = null;
        }
    }

    // ── Build Playlist ──
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

        // Highlight active
        const items = mvListScroll.querySelectorAll('.mv-list-item');
        items.forEach((el, i) => el.classList.toggle('active', i === index));

        // Remove old model
        if (mvCurrentModel) {
            mvScene.remove(mvCurrentModel);
            mvCurrentModel = null;
        }

        // Build new model
        try {
            mvCurrentModel = item.builder();
            mvScene.add(mvCurrentModel);
        } catch (e) {
            console.warn('Model build error:', e);
        }

        // Auto-fit camera
        if (mvCurrentModel) {
            const box = new THREE.Box3().setFromObject(mvCurrentModel);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            mvZoom = maxDim * 2.5 + 1;
            mvRotation = { x: 0.3, y: 0 };
            mvAutoRotate = true;
        }

        // Update info
        mvInfoName.textContent = item.name;
        mvInfoSub.textContent = item.sub;
        mvNoModel.classList.add('hidden');
        mvControlsHint.textContent = 'Drag to rotate · Scroll to zoom';
    }

    // ── Mouse Controls ──
    mvCanvas.addEventListener('mousedown', (e) => {
        mvMouseDown = true;
        mvAutoRotate = false;
        mvLastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { mvMouseDown = false; });
    window.addEventListener('mousemove', (e) => {
        if (!mvMouseDown) return;
        const dx = e.clientX - mvLastMouse.x;
        const dy = e.clientY - mvLastMouse.y;
        mvRotation.y += dx * 0.01;
        mvRotation.x = Math.max(-1, Math.min(1, mvRotation.x + dy * 0.005));
        mvLastMouse = { x: e.clientX, y: e.clientY };
    });
    mvCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        mvZoom = Math.max(1, Math.min(30, mvZoom + e.deltaY * 0.01));
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
            const dx = e.touches[0].clientX - mvTouchStart.x;
            const dy = e.touches[0].clientY - mvTouchStart.y;
            mvRotation.y += dx * 0.01;
            mvRotation.x = Math.max(-1, Math.min(1, mvRotation.x + dy * 0.005));
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
        setTimeout(() => {
            mvScreen.classList.add('hidden');
        }, 300);
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

    // ═══════════════════════════════════════
    // MODEL BUILDERS
    // ═══════════════════════════════════════

    function mat(color, opts) {
        return new THREE.MeshLambertMaterial({ color, ...opts });
    }

    // ── FLORA ──

    function buildOakTree() {
        const g = new THREE.Group();
        // Trunk
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), mat(0x8B6914));
        trunk.position.y = 0.75;
        g.add(trunk);
        // Canopy spheres
        const leafMat = mat(0x2E8B2E);
        [[0, 2.2, 0, 0.9], [0.5, 2.0, 0.3, 0.6], [-0.4, 1.9, -0.3, 0.65], [0.1, 2.6, -0.2, 0.55]].forEach(([x, y, z, r]) => {
            const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), leafMat);
            s.position.set(x, y, z);
            g.add(s);
        });
        return g;
    }

    function buildPineTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 6), mat(0x654321));
        trunk.position.y = 0.6;
        g.add(trunk);
        const leafMat = mat(0x1B5E20);
        for (let i = 0; i < 4; i++) {
            const r = 0.8 - i * 0.15;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 0.8, 8), leafMat);
            cone.position.y = 1.2 + i * 0.55;
            g.add(cone);
        }
        return g;
    }

    function buildBirchTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2, 8), mat(0xF5F5DC));
        trunk.position.y = 1;
        g.add(trunk);
        // Dark streaks on birch
        for (let i = 0; i < 4; i++) {
            const streak = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.25), mat(0x333333));
            streak.position.set(0.1, 0.5 + i * 0.4, 0);
            streak.rotation.y = i * 0.8;
            g.add(streak);
        }
        const leafMat = mat(0x4CAF50);
        [[0, 2.5, 0, 0.7], [0.4, 2.3, 0.2, 0.5], [-0.3, 2.2, -0.2, 0.55]].forEach(([x, y, z, r]) => {
            const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), leafMat);
            s.position.set(x, y, z);
            g.add(s);
        });
        return g;
    }

    function buildCypressTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.5, 6), mat(0x5D4037));
        trunk.position.y = 0.75;
        g.add(trunk);
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.5, 8), mat(0x2E7D32));
        body.position.y = 2.5;
        g.add(body);
        return g;
    }

    function buildMapleTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.3, 8), mat(0x795548));
        trunk.position.y = 0.65;
        g.add(trunk);
        const leafMat = mat(0xFF6F00);
        [[0, 2, 0, 0.85], [0.5, 1.8, 0.3, 0.6], [-0.5, 1.9, -0.2, 0.6], [0, 2.5, 0, 0.5]].forEach(([x, y, z, r]) => {
            const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), leafMat);
            s.position.set(x, y, z);
            g.add(s);
        });
        return g;
    }

    function buildDeadTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2, 6), mat(0x4E342E));
        trunk.position.y = 1;
        g.add(trunk);
        // Dead branches
        const branchMat = mat(0x3E2723);
        [[0.6, 1.8, 0, 0.3], [-0.5, 1.5, 0.2, -0.4], [0.3, 2.2, -0.3, 0.5]].forEach(([x, y, z, tilt]) => {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.7, 4), branchMat);
            b.position.set(x, y, z);
            b.rotation.z = tilt;
            g.add(b);
        });
        return g;
    }

    function buildCactus() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.5, 8), mat(0x2E7D32));
        body.position.y = 0.75;
        g.add(body);
        // Arms
        const armMat = mat(0x388E3C);
        const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 6), armMat);
        arm1.position.set(0.3, 1.0, 0);
        arm1.rotation.z = -0.8;
        g.add(arm1);
        const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6), armMat);
        arm2.position.set(-0.25, 0.7, 0);
        arm2.rotation.z = 0.9;
        g.add(arm2);
        return g;
    }

    function buildPalmTree() {
        const g = new THREE.Group();
        // Curved trunk
        const trunkMat = mat(0xA0826D);
        for (let i = 0; i < 6; i++) {
            const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6), trunkMat);
            seg.position.set(Math.sin(i * 0.15) * 0.1, i * 0.35, 0);
            g.add(seg);
        }
        // Fronds
        const frondMat = mat(0x4CAF50);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const frond = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.2), frondMat);
            frond.material = new THREE.MeshLambertMaterial({ color: 0x4CAF50, side: THREE.DoubleSide });
            frond.position.set(Math.cos(angle) * 0.3, 2.2, Math.sin(angle) * 0.3);
            frond.rotation.x = -0.8;
            frond.rotation.y = angle;
            g.add(frond);
        }
        return g;
    }

    function buildFrostedPine() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1, 6), mat(0x5D4037));
        trunk.position.y = 0.5;
        g.add(trunk);
        for (let i = 0; i < 4; i++) {
            const r = 0.7 - i * 0.13;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 0.7, 8), mat(0xE0E0E0));
            cone.position.y = 1.0 + i * 0.5;
            g.add(cone);
        }
        return g;
    }

    function buildWillowTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8), mat(0x6D4C41));
        trunk.position.y = 0.75;
        g.add(trunk);
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), mat(0x558B2F));
        canopy.position.y = 2;
        g.add(canopy);
        // Drooping branches
        const dripMat = new THREE.MeshLambertMaterial({ color: 0x7CB342, side: THREE.DoubleSide });
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const drip = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.2), dripMat);
            drip.position.set(Math.cos(angle) * 0.7, 1.5, Math.sin(angle) * 0.7);
            drip.rotation.y = angle;
            g.add(drip);
        }
        return g;
    }

    function buildCrystalTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.5, 6), mat(0x9C27B0));
        trunk.position.y = 0.75;
        g.add(trunk);
        const crystalMat = new THREE.MeshLambertMaterial({ color: 0xCE93D8, emissive: 0x7B1FA2, emissiveIntensity: 0.4, transparent: true, opacity: 0.8 });
        [[0, 2.2, 0, 0.7], [0.4, 1.9, 0.3, 0.45], [-0.3, 2, -0.2, 0.5]].forEach(([x, y, z, r]) => {
            const s = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), crystalMat);
            s.position.set(x, y, z);
            g.add(s);
        });
        return g;
    }

    function buildTwistedTree() {
        const g = new THREE.Group();
        const trunkMat = mat(0x3E2723);
        // Twisted trunk segments
        for (let i = 0; i < 5; i++) {
            const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 6), trunkMat);
            seg.position.set(Math.sin(i * 0.5) * 0.12, i * 0.4, Math.cos(i * 0.5) * 0.05);
            seg.rotation.z = Math.sin(i * 0.7) * 0.2;
            g.add(seg);
        }
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 5), mat(0x4A148C));
        leaves.position.y = 2.2;
        g.add(leaves);
        return g;
    }

    function buildAncientTree() {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2.5, 10), mat(0x5D4037));
        trunk.position.y = 1.25;
        g.add(trunk);
        // Massive canopy
        const leafMat = mat(0x1B5E20);
        [[0, 3.2, 0, 1.2], [0.8, 2.8, 0.5, 0.8], [-0.7, 2.9, -0.4, 0.85], [0.3, 3.6, -0.3, 0.7]].forEach(([x, y, z, r]) => {
            const s = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), leafMat);
            s.position.set(x, y, z);
            g.add(s);
        });
        // Roots
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.6, 4), mat(0x4E342E));
            root.position.set(Math.cos(angle) * 0.4, 0.1, Math.sin(angle) * 0.4);
            root.rotation.z = Math.cos(angle) * 0.6;
            root.rotation.x = Math.sin(angle) * 0.6;
            g.add(root);
        }
        return g;
    }

    // ── FAUNA ──

    function buildDeer() {
        const g = new THREE.Group();
        const bodyMat = mat(0x8B6914);
        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.0), bodyMat);
        body.position.y = 0.8;
        g.add(body);
        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.35), bodyMat);
        head.position.set(0, 1.15, 0.5);
        g.add(head);
        // Legs
        const legMat = mat(0x7A5B14);
        [[-0.15, 0, 0.3], [0.15, 0, 0.3], [-0.15, 0, -0.3], [0.15, 0, -0.3]].forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 4), legMat);
            leg.position.set(x, 0.3 + y, z);
            g.add(leg);
        });
        // Antlers
        const antlerMat = mat(0xBCAAA4);
        [[-0.1, 1.4, 0.5], [0.1, 1.4, 0.5]].forEach(([x, y, z]) => {
            const a = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.3, 4), antlerMat);
            a.position.set(x, y, z);
            a.rotation.z = x > 0 ? -0.4 : 0.4;
            g.add(a);
        });
        return g;
    }

    function buildFox() {
        const g = new THREE.Group();
        const bodyMat = mat(0xD2691E);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.7), bodyMat);
        body.position.y = 0.45;
        g.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.25), bodyMat);
        head.position.set(0, 0.6, 0.4);
        g.add(head);
        // Snout
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.15), mat(0xE8A860));
        snout.position.set(0, 0.55, 0.55);
        g.add(snout);
        // Ears
        [[0.08, 0.75, 0.4], [-0.08, 0.75, 0.4]].forEach(([x, y, z]) => {
            const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 4), bodyMat);
            ear.position.set(x, y, z);
            g.add(ear);
        });
        // Legs
        const legMat = mat(0x3E2723);
        [[-0.1, 0, 0.2], [0.1, 0, 0.2], [-0.1, 0, -0.2], [0.1, 0, -0.2]].forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4), legMat);
            leg.position.set(x, 0.18 + y, z);
            g.add(leg);
        });
        // Tail
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), mat(0xFFFFFF));
        tail.position.set(0, 0.5, -0.5);
        tail.rotation.x = 0.8;
        g.add(tail);
        return g;
    }

    function buildSheep() {
        const g = new THREE.Group();
        // Fluffy body
        const woolMat = mat(0xFFFFF0);
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), woolMat);
        body.position.y = 0.55;
        body.scale.set(1, 0.8, 1.2);
        g.add(body);
        // Extra wool puffs
        [[0.15, 0.7, 0], [-0.15, 0.7, 0], [0, 0.7, 0.15], [0, 0.7, -0.15]].forEach(([x, y, z]) => {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), woolMat);
            puff.position.set(x, y, z);
            g.add(puff);
        });
        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.2), mat(0x222222));
        head.position.set(0, 0.6, 0.4);
        g.add(head);
        // Legs
        const legMat = mat(0x333333);
        [[-0.12, 0, 0.15], [0.12, 0, 0.15], [-0.12, 0, -0.15], [0.12, 0, -0.15]].forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 4), legMat);
            leg.position.set(x, 0.18, z);
            g.add(leg);
        });
        return g;
    }

    function buildRabbit() {
        const g = new THREE.Group();
        const bodyMat = mat(0xD2B48C);
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), bodyMat);
        body.position.y = 0.3;
        body.scale.set(0.8, 1, 1);
        g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), bodyMat);
        head.position.set(0, 0.5, 0.12);
        g.add(head);
        // Long ears
        [[-0.04, 0.75, 0.1], [0.04, 0.75, 0.1]].forEach(([x, y, z]) => {
            const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.25, 4), bodyMat);
            ear.position.set(x, y, z);
            g.add(ear);
        });
        // Tail puff
        const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mat(0xFFFFFF));
        tail.position.set(0, 0.25, -0.2);
        g.add(tail);
        // Legs
        [[-0.08, 0, 0.08], [0.08, 0, 0.08], [-0.08, 0, -0.05], [0.08, 0, -0.05]].forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 4), bodyMat);
            leg.position.set(x, 0.1, z);
            g.add(leg);
        });
        return g;
    }

    function buildButterfly() {
        const g = new THREE.Group();
        const bodyM = mat(0x333333);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.15, 4), bodyM);
        body.position.y = 0.5;
        body.rotation.x = Math.PI / 2;
        g.add(body);
        // Wings
        const wingMat = new THREE.MeshLambertMaterial({ color: 0xFF69B4, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        [[-1, 1], [1, 1]].forEach(([side]) => {
            const wing = new THREE.Mesh(new THREE.CircleGeometry(0.15, 6), wingMat);
            wing.position.set(side * 0.1, 0.52, 0);
            wing.rotation.y = side * 0.5;
            g.add(wing);
        });
        g.scale.set(2, 2, 2);
        return g;
    }

    function buildBird() {
        const g = new THREE.Group();
        const bodyMat = mat(0x6D4C41);
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bodyMat);
        body.position.y = 0.5;
        body.scale.set(0.8, 0.8, 1.2);
        g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), bodyMat);
        head.position.set(0, 0.6, 0.1);
        g.add(head);
        // Beak
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), mat(0xFFA000));
        beak.position.set(0, 0.58, 0.18);
        beak.rotation.x = -Math.PI / 2;
        g.add(beak);
        // Wings
        const wingMat = new THREE.MeshLambertMaterial({ color: 0x5D4037, side: THREE.DoubleSide });
        [[-1, 1]].forEach(() => {
            [-1, 1].forEach(side => {
                const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.08), wingMat);
                wing.position.set(side * 0.18, 0.52, 0);
                wing.rotation.z = side * 0.4;
                g.add(wing);
            });
        });
        // Tail
        const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.12), wingMat);
        tail.position.set(0, 0.5, -0.15);
        g.add(tail);
        g.scale.set(2.5, 2.5, 2.5);
        return g;
    }

    // ── GROUNDCOVER ──

    function buildGrassTuft() {
        const g = new THREE.Group();
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50, side: THREE.DoubleSide });
        for (let i = 0; i < 7; i++) {
            const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.4 + Math.random() * 0.3), grassMat);
            blade.position.set((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3);
            blade.rotation.y = Math.random() * Math.PI;
            blade.rotation.z = (Math.random() - 0.5) * 0.3;
            g.add(blade);
        }
        g.scale.set(2, 2, 2);
        return g;
    }

    function buildFlower(color) {
        const g = new THREE.Group();
        // Stem
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.4, 4), mat(0x388E3C));
        stem.position.y = 0.2;
        g.add(stem);
        // Petals
        const petalMat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const petal = new THREE.Mesh(new THREE.CircleGeometry(0.08, 6), petalMat);
            petal.position.set(Math.cos(angle) * 0.06, 0.42, Math.sin(angle) * 0.06);
            petal.rotation.x = -0.5;
            petal.rotation.y = angle;
            g.add(petal);
        }
        // Center
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mat(0xFFEB3B));
        center.position.y = 0.43;
        g.add(center);
        g.scale.set(2.5, 2.5, 2.5);
        return g;
    }

    function buildMushroom() {
        const g = new THREE.Group();
        const capMat = mat(0xD32F2F);
        const stemMat = mat(0xFFF8E1);
        // Large mushroom
        const stem1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6), stemMat);
        stem1.position.y = 0.15;
        g.add(stem1);
        const cap1 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
        cap1.position.y = 0.3;
        g.add(cap1);
        // Small mushroom
        const stem2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.2, 6), stemMat);
        stem2.position.set(0.15, 0.1, 0.08);
        g.add(stem2);
        const cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
        cap2.position.set(0.15, 0.2, 0.08);
        g.add(cap2);
        // Spots
        const spotMat = mat(0xFFFFFF);
        [[0, 0.38, 0.08], [-0.06, 0.35, -0.05], [0.07, 0.33, 0.02]].forEach(([x, y, z]) => {
            const spot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), spotMat);
            spot.position.set(x, y, z);
            g.add(spot);
        });
        g.scale.set(2.5, 2.5, 2.5);
        return g;
    }

    // ── NPCs ──

    function buildNPC(skinColor, clothColor, hasHat) {
        const g = new THREE.Group();
        const skinMat = mat(skinColor);
        const clothMat = mat(clothColor);
        // Body (torso)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), clothMat);
        torso.position.y = 1.0;
        g.add(torso);
        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), skinMat);
        head.position.y = 1.45;
        g.add(head);
        // Eyes
        const eyeMat = mat(0x111111);
        [[-0.06, 1.48, 0.13], [0.06, 1.48, 0.13]].forEach(([x, y, z]) => {
            const eye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), eyeMat);
            eye.position.set(x, y, z);
            g.add(eye);
        });
        // Arms
        [[-0.28, 0.95, 0], [0.28, 0.95, 0]].forEach(([x, y, z]) => {
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), clothMat);
            arm.position.set(x, y, z);
            g.add(arm);
            const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skinMat);
            hand.position.set(x, y - 0.25, z);
            g.add(hand);
        });
        // Legs
        [[-0.1, 0.35, 0], [0.1, 0.35, 0]].forEach(([x, y, z]) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.18), mat(0x3E2723));
            leg.position.set(x, y, z);
            g.add(leg);
        });
        // Hat (optional)
        if (hasHat) {
            const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 8), clothMat);
            brim.position.y = 1.58;
            g.add(brim);
            const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.25, 8), clothMat);
            top.position.y = 1.72;
            g.add(top);
        }
        return g;
    }

    // ── BUILDINGS ──

    function buildCastle() {
        const g = new THREE.Group();
        const wallMat = mat(0x9E9E9E);
        const roofMat = mat(0x5D4037);
        // Main keep
        const keep = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 2), wallMat);
        keep.position.y = 0.9;
        g.add(keep);
        // Roof
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.8, 4), roofMat);
        roof.position.y = 2.2;
        roof.rotation.y = Math.PI / 4;
        g.add(roof);
        // Towers
        [[-1.1, 0, -1.1], [1.1, 0, -1.1], [-1.1, 0, 1.1], [1.1, 0, 1.1]].forEach(([x, y, z]) => {
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.2, 8), wallMat);
            tower.position.set(x, 1.1, z);
            g.add(tower);
            const tRoof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 8), roofMat);
            tRoof.position.set(x, 2.5, z);
            g.add(tRoof);
        });
        // Door
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.05), mat(0x4E342E));
        door.position.set(0, 0.3, 1.03);
        g.add(door);
        g.scale.set(0.7, 0.7, 0.7);
        return g;
    }

    function buildTemple() {
        const g = new THREE.Group();
        const stoneMat = mat(0xBDBDBD);
        // Base platform
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2), stoneMat);
        base.position.y = 0.1;
        g.add(base);
        // Columns
        for (let i = 0; i < 6; i++) {
            const x = (i < 3 ? -0.9 : 0.9);
            const z = (i % 3 - 1) * 0.7;
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 8), stoneMat);
            col.position.set(x, 0.95, z);
            g.add(col);
        }
        // Roof triangle
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-1.3, 0);
        roofShape.lineTo(0, 0.7);
        roofShape.lineTo(1.3, 0);
        roofShape.closePath();
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.8, bevelEnabled: false });
        const roofMesh = new THREE.Mesh(roofGeo, mat(0xD4A84B));
        roofMesh.position.set(0, 1.7, -0.9);
        g.add(roofMesh);
        g.scale.set(0.7, 0.7, 0.7);
        return g;
    }

    function buildTavern() {
        const g = new THREE.Group();
        // Main body
        const walls = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.2), mat(0x8D6E63));
        walls.position.y = 0.5;
        g.add(walls);
        // Roof
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-0.85, 0);
        roofShape.lineTo(0, 0.55);
        roofShape.lineTo(0.85, 0);
        roofShape.closePath();
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 1.3, bevelEnabled: false });
        const roofM = new THREE.Mesh(roofGeo, mat(0x5D4037));
        roofM.position.set(0, 1, -0.65);
        g.add(roofM);
        // Door
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.05), mat(0x3E2723));
        door.position.set(0, 0.25, 0.63);
        g.add(door);
        // Sign
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.03), mat(0xD4A84B));
        sign.position.set(0.5, 0.9, 0.63);
        g.add(sign);
        // Windows
        const winMat = mat(0xFFEB3B);
        [[-0.35, 0.6, 0.61], [0.35, 0.6, 0.61]].forEach(([x, y, z]) => {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), winMat);
            w.position.set(x, y, z);
            g.add(w);
        });
        return g;
    }

    function buildGeneralStore() {
        const g = new THREE.Group();
        const walls = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), mat(0xA1887F));
        walls.position.y = 0.4;
        g.add(walls);
        // Flat roof with slight overhang
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 1.15), mat(0x5D4037));
        roof.position.y = 0.84;
        g.add(roof);
        // Door
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.45, 0.04), mat(0x3E2723));
        door.position.set(0, 0.22, 0.52);
        g.add(door);
        // Awning
        const awning = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.03, 0.3), mat(0xC62828));
        awning.position.set(0, 0.65, 0.65);
        g.add(awning);
        return g;
    }

    function buildHouse() {
        const g = new THREE.Group();
        const walls = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.7), mat(0xBCAAA4));
        walls.position.y = 0.35;
        g.add(walls);
        // Roof
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-0.5, 0);
        roofShape.lineTo(0, 0.4);
        roofShape.lineTo(0.5, 0);
        roofShape.closePath();
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.8, bevelEnabled: false });
        const roofM = new THREE.Mesh(roofGeo, mat(0x8D6E63));
        roofM.position.set(0, 0.7, -0.4);
        g.add(roofM);
        // Door
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 0.04), mat(0x5D4037));
        door.position.set(0, 0.17, 0.37);
        g.add(door);
        // Window
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.02), mat(0x90CAF9));
        win.position.set(0.22, 0.45, 0.36);
        g.add(win);
        return g;
    }

    // ── RESOURCES ──

    function buildResource(color, type) {
        const g = new THREE.Group();
        if (type === 'wood') {
            const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), mat(color));
            log.rotation.z = Math.PI / 2;
            log.position.y = 0.3;
            g.add(log);
            // End grain
            const end1 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), mat(0xA08050));
            end1.position.set(0.3, 0.3, 0);
            end1.rotation.y = Math.PI / 2;
            g.add(end1);
        } else if (type === 'stone' || type === 'coal') {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25, 0), mat(color));
            rock.position.y = 0.3;
            g.add(rock);
        } else if (type === 'ore') {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mat(0x888888));
            rock.position.y = 0.3;
            g.add(rock);
            // Ore veins
            for (let i = 0; i < 3; i++) {
                const vein = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), mat(color));
                vein.position.set(Math.sin(i * 2) * 0.15, 0.3 + Math.cos(i * 2) * 0.12, Math.sin(i * 3) * 0.1);
                g.add(vein);
            }
        } else if (type === 'leather') {
            const hide = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.3), mat(color));
            hide.position.y = 0.15;
            hide.rotation.y = 0.2;
            g.add(hide);
        } else if (type === 'fiber') {
            for (let i = 0; i < 5; i++) {
                const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), mat(color));
                strand.position.set((i - 2) * 0.05, 0.25, 0);
                strand.rotation.z = (Math.random() - 0.5) * 0.3;
                g.add(strand);
            }
        }
        g.scale.set(2, 2, 2);
        return g;
    }

    // ── WEAPONS ──

    function buildSword(bladeColor, length) {
        const g = new THREE.Group();
        // Blade
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, length, 0.02), mat(bladeColor));
        blade.position.y = 0.5 + length / 2;
        g.add(blade);
        // Guard
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.06), mat(0xD4A84B));
        guard.position.y = 0.5;
        g.add(guard);
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), mat(0x5D4037));
        handle.position.y = 0.3;
        g.add(handle);
        // Pommel
        const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mat(0xD4A84B));
        pommel.position.y = 0.13;
        g.add(pommel);
        return g;
    }

    function buildMace() {
        const g = new THREE.Group();
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.8, 6), mat(0x5D4037));
        handle.position.y = 0.5;
        g.add(handle);
        // Head
        const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15, 0), mat(0xBDBDBD));
        head.position.y = 1.0;
        g.add(head);
        // Spikes
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), mat(0x9E9E9E));
            spike.position.set(Math.cos(angle) * 0.15, 1.0, Math.sin(angle) * 0.15);
            spike.rotation.z = Math.cos(angle) * Math.PI / 2;
            spike.rotation.x = Math.sin(angle) * Math.PI / 2;
            g.add(spike);
        }
        return g;
    }

    function buildLance() {
        const g = new THREE.Group();
        // Shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.0, 6), mat(0x8D6E63));
        shaft.position.y = 1.0;
        g.add(shaft);
        // Tip
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), mat(0xC0C0C0));
        tip.position.y = 2.15;
        g.add(tip);
        // Guard
        const guard = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.2, 8), mat(0x5D4037));
        guard.position.y = 0.6;
        guard.rotation.x = Math.PI;
        g.add(guard);
        return g;
    }

    function buildBow() {
        const g = new THREE.Group();
        // Bow body (curved using torus)
        const bowMat = mat(0x8D6E63);
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 16, Math.PI), bowMat);
        bow.position.y = 0.8;
        g.add(bow);
        // String
        const stringMat = mat(0xCCCCCC);
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.0, 4), stringMat);
        string.position.set(-0.5, 0.8, 0);
        g.add(string);
        // Arrow
        const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4), mat(0xA1887F));
        arrowShaft.position.set(-0.45, 0.8, 0);
        arrowShaft.rotation.z = Math.PI / 2;
        g.add(arrowShaft);
        const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), mat(0x757575));
        arrowHead.position.set(-0.05, 0.8, 0);
        arrowHead.rotation.z = -Math.PI / 2;
        g.add(arrowHead);
        return g;
    }

    function buildStaff() {
        const g = new THREE.Group();
        // Shaft
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.8, 6), mat(0x5D4037));
        shaft.position.y = 0.9;
        g.add(shaft);
        // Orb
        const orbMat = new THREE.MeshLambertMaterial({ color: 0x7B1FA2, emissive: 0x4A148C, emissiveIntensity: 0.5 });
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), orbMat);
        orb.position.y = 1.9;
        g.add(orb);
        // Prongs holding orb
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.2, 4), mat(0x5D4037));
            prong.position.set(Math.cos(angle) * 0.04, 1.82, Math.sin(angle) * 0.04);
            prong.rotation.z = Math.cos(angle) * 0.3;
            prong.rotation.x = Math.sin(angle) * 0.3;
            g.add(prong);
        }
        return g;
    }

    // ── TOOLS ──

    function buildAxe() {
        const g = new THREE.Group();
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.9, 6), mat(0x8D6E63));
        handle.position.y = 0.45;
        g.add(handle);
        // Axe head
        const headShape = new THREE.Shape();
        headShape.moveTo(0, -0.1);
        headShape.lineTo(0.2, -0.15);
        headShape.lineTo(0.22, 0.15);
        headShape.lineTo(0, 0.1);
        headShape.closePath();
        const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: 0.04, bevelEnabled: false });
        const axeHead = new THREE.Mesh(headGeo, mat(0x9E9E9E));
        axeHead.position.set(-0.02, 0.8, -0.02);
        g.add(axeHead);
        return g;
    }

    function buildPickaxe() {
        const g = new THREE.Group();
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.9, 6), mat(0x8D6E63));
        handle.position.y = 0.45;
        g.add(handle);
        // Pick head (horizontal bar with pointed ends)
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.04), mat(0x9E9E9E));
        bar.position.y = 0.9;
        g.add(bar);
        // Points
        const pointMat = mat(0x757575);
        const point1 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 4), pointMat);
        point1.position.set(0.3, 0.9, 0);
        point1.rotation.z = -Math.PI / 2;
        g.add(point1);
        const point2 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 4), pointMat);
        point2.position.set(-0.3, 0.9, 0);
        point2.rotation.z = Math.PI / 2;
        g.add(point2);
        return g;
    }

    function buildTorch() {
        const g = new THREE.Group();
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6), mat(0x5D4037));
        handle.position.y = 0.3;
        g.add(handle);
        // Wrap
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.12, 6), mat(0x8D6E63));
        wrap.position.y = 0.55;
        g.add(wrap);
        // Flame
        const flameMat = new THREE.MeshLambertMaterial({ color: 0xFF9800, emissive: 0xFF6F00, emissiveIntensity: 0.8 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), flameMat);
        flame.position.y = 0.72;
        g.add(flame);
        // Inner flame
        const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6),
            new THREE.MeshLambertMaterial({ color: 0xFFEB3B, emissive: 0xFFC107, emissiveIntensity: 1 }));
        innerFlame.position.y = 0.7;
        g.add(innerFlame);
        return g;
    }

})();
