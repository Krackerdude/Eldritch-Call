// ═══════════════════════════════════════════════════════════════════════════════
// UI.JS - User Interface System
// Dependencies: assets.js (itemIcons, SHOP_ICONS, spellIcons)
// Consumers: Player, Inventory, Shop, Combat, Crafting
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE STATE
// ═══════════════════════════════════════════════════════════════════════════════

let _deps = {
    inventory: null,
    equipment: null,
    hotbarItems: null,
    characterStats: null,
    knownSpells: null,
    craftingRecipes: null,
    itemIcons: null,
    SHOP_ICONS: null,
    spellIcons: null,
    updateQuestProgress: null,
    camera: null,
    MOVE: null,
    pMove: null
};

// UI State
let inventoryOpen = false;
let currentInventoryFilter = 'all';
let currentCraftingFilter = 'all';
let currentShopFilter = 'all';
let draggedInvItem = null;

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIAL NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function showMaterialNotif(itemId, amount) {
    const item = _deps.inventory.items[itemId];
    if (!item) return;
    
    const popup = document.getElementById('material-popup');
    if (!popup) return;
    
    const notif = document.createElement('div');
    notif.className = 'mat-notif';
    const iconSvg = _deps.itemIcons[item.icon] || _deps.itemIcons[itemId] || '';
    notif.innerHTML = `<span class="mat-icon">${iconSvg}</span><span class="mat-amount">+${amount}</span> ${item.name}`;
    popup.appendChild(notif);
    
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PICKUP NOTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const discoveryIcons = {
    tree: '<svg viewBox="0 0 32 32"><path d="M16 4l-8 12h4l-6 10h20l-6-10h4z" fill="currentColor"/><rect x="14" y="24" width="4" height="6" fill="currentColor"/></svg>',
    rock: '<svg viewBox="0 0 32 32"><path d="M6 24l4-10 6 2 8-8 4 6-4 10-8 2z" fill="currentColor"/></svg>',
    crystal: '<svg viewBox="0 0 32 32"><path d="M16 2l8 12-8 16-8-16z" fill="currentColor"/></svg>',
    herb: '<svg viewBox="0 0 32 32"><path d="M16 28V16M10 20q6-8 6-8M22 20q-6-8-6-8" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="16" cy="10" r="4" fill="currentColor"/></svg>'
};

function showPickupNotification(itemName, amount, iconType) {
    const container = document.getElementById('pickup-notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'pickup-notification';
    
    const iconSvg = discoveryIcons[iconType] || discoveryIcons.tree;
    
    notification.innerHTML = `
        <div class="pickup-icon">${iconSvg}</div>
        <div class="pickup-info">
            <div class="pickup-name">${itemName}</div>
            <div class="pickup-amount">+${amount} gathered</div>
        </div>
        <div class="pickup-plus">+</div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION FLASH
// ═══════════════════════════════════════════════════════════════════════════════

function showTransaction(message, type) {
    const flash = document.createElement('div');
    flash.className = 'transaction-flash ' + type;
    flash.textContent = message;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 800);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOGGLE INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════

function toggleInventory() {
    inventoryOpen = !inventoryOpen;
    const overlay = document.getElementById('inventory-overlay');
    const hotbar = document.getElementById('hotbar');
    
    if (inventoryOpen) {
        overlay.classList.add('open');
        hotbar.classList.add('inventory-open');
        document.getElementById('crosshair').classList.add('hidden');
        document.exitPointerLock();
        
        // Reset camera effects when opening inventory
        if (_deps.pMove) {
            _deps.pMove.targetCamTilt = 0;
            _deps.pMove.camTilt = 0;
            _deps.pMove.targetFOV = _deps.MOVE.baseFOV;
        }
        if (_deps.camera) {
            _deps.camera.rotation.z = 0;
            _deps.camera.fov = _deps.MOVE.baseFOV;
            _deps.camera.updateProjectionMatrix();
        }
        
        updateInventoryUI();
        updateCraftingUI();
        drawSphereGrid();
        initMainTabs();
        initHotbarDragDrop();
        setupInventoryDropZone();
        initSortingTabs();
        initBagEquipmentSlots();
        updateAllEquipmentSlots();
    } else {
        overlay.classList.remove('open');
        hotbar.classList.remove('inventory-open');
        document.getElementById('crosshair').classList.remove('hidden');
    }
}

function isInventoryOpen() {
    return inventoryOpen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY UI
// ═══════════════════════════════════════════════════════════════════════════════

function updateInventoryUI() {
    const bagGrid = document.getElementById('unified-bag-grid');
    const goldDisplay = document.getElementById('inv-gold-amount');
    
    if (!bagGrid) return;
    bagGrid.innerHTML = '';
    
    // Update gold display
    if (goldDisplay) goldDisplay.textContent = _deps.inventory.gold || 0;
    
    // Collect all items into unified list
    const allItems = [];
    
    // Add items from inventory.items
    Object.entries(_deps.inventory.items).forEach(([id, item]) => {
        if (item.count > 0) {
            allItems.push({
                ...item,
                id: id
            });
        }
    });
    
    // Add items from inventory.materials
    if (_deps.inventory.materials) {
        Object.entries(_deps.inventory.materials).forEach(([id, count]) => {
            if (count > 0 && !allItems.find(i => i.id === id)) {
                let type = 'resource';
                if (['mace', 'flintlock', 'lance', 'longbow', 'katana', 'staff', 'broadsword', 'dagger'].includes(id)) {
                    type = 'weapon';
                } else if (id.startsWith('scroll_')) {
                    type = 'weapon';
                } else if (['bread', 'ale', 'stew', 'potion', 'potion_health', 'potion_stamina', 'mana_potion'].includes(id)) {
                    type = 'consumable';
                } else if (['torch', 'rope', 'pickaxe'].includes(id)) {
                    type = 'tool';
                }
                allItems.push({
                    id: id,
                    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
                    count: count,
                    type: type,
                    icon: id
                });
            }
        });
    }
    
    // Add weapons from hotbar
    _deps.hotbarItems.forEach((item, index) => {
        if (item && item.type === 'weapon' && !['sword'].includes(item.id)) {
            if (!allItems.find(i => i.id === item.id)) {
                allItems.push({
                    ...item,
                    id: item.id,
                    count: 1,
                    inHotbar: true,
                    hotbarSlot: index
                });
            }
        }
    });
    
    // Sort items by type
    const typeOrder = { weapon: 0, armor: 1, consumable: 2, tool: 3, resource: 4, crafted: 5, buildable: 6 };
    allItems.sort((a, b) => (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99));
    
    // Create slots
    allItems.forEach((item, index) => {
        const slot = createBagSlot(item, index);
        bagGrid.appendChild(slot);
    });
    
    // Fill remaining slots
    const totalSlots = 36;
    for (let i = allItems.length; i < totalSlots; i++) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'bag-slot empty';
        emptySlot.style.animationDelay = (i * 0.02) + 's';
        bagGrid.appendChild(emptySlot);
    }
    
    applyInventoryFilter();
    updateCharacterStats();
}

function createBagSlot(item, index) {
    const slot = document.createElement('div');
    slot.className = `bag-slot type-${item.type}`;
    slot.dataset.itemId = item.id;
    slot.dataset.itemType = item.type;
    slot.style.animationDelay = (index * 0.03) + 's';
    
    const equippedSlot = isItemEquipped(item.id);
    const isEquipped = equippedSlot !== null;
    
    if (isEquipped) {
        slot.classList.add('equipped');
    }
    
    const iconKey = item.icon || item.id;
    const iconSvg = _deps.SHOP_ICONS[iconKey] || _deps.itemIcons[iconKey] || 
                    _deps.SHOP_ICONS[item.id] || _deps.itemIcons[item.id] || 
                    getDefaultIcon(item.type);
    
    let statusText = '';
    if (item.inHotbar) {
        statusText = ' (Hotbar)';
    } else if (isEquipped) {
        statusText = ' (Equipped)';
    }
    
    slot.innerHTML = `
        <div class="type-glow"></div>
        ${isEquipped ? '<div class="equipped-indicator">E</div>' : ''}
        <span class="item-icon">${iconSvg}</span>
        <span class="item-count">${item.count > 1 ? item.count : ''}</span>
        <span class="item-name">${item.name}${statusText}</span>
    `;
    
    slot.draggable = true;
    slot.addEventListener('dragstart', handleInvDragStart);
    slot.addEventListener('dragend', handleInvDragEnd);
    
    if (item.type === 'armor') {
        slot.style.cursor = 'pointer';
        slot.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isEquipped) {
                unequipItem(equippedSlot);
                showTransaction('Unequipped ' + item.name, 'sell');
            } else {
                equipItem(item.id);
                showTransaction('Equipped ' + item.name, 'buy');
            }
        });
    }
    
    const tooltipData = {
        ...item,
        desc: item.desc || getDefaultDescription(item.id, item.type)
    };
    attachItemTooltip(slot, tooltipData, item.count || 1);
    
    return slot;
}

function isItemEquipped(itemId) {
    for (const slot in _deps.equipment) {
        if (_deps.equipment[slot] && _deps.equipment[slot].id === itemId) {
            return slot;
        }
    }
    return null;
}

function getDefaultIcon(type) {
    const defaultIcons = {
        weapon: '<svg viewBox="0 0 32 32"><path d="M8 24L24 8M20 8h4v4" stroke="currentColor" stroke-width="3" fill="none"/></svg>',
        tool: '<svg viewBox="0 0 32 32"><rect x="14" y="6" width="4" height="16" fill="currentColor"/><rect x="8" y="20" width="16" height="6" rx="2" fill="currentColor"/></svg>',
        armor: '<svg viewBox="0 0 32 32"><path d="M16 4C10 4 6 6 6 6v12c0 6 10 10 10 10s10-4 10-10V6s-4-2-10-2z" fill="currentColor"/></svg>',
        resource: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="currentColor"/></svg>',
        crafted: '<svg viewBox="0 0 32 32"><polygon points="16,4 28,24 4,24" fill="currentColor"/></svg>',
        consumable: '<svg viewBox="0 0 32 32"><path d="M12 8L10 24h12L20 8z" fill="currentColor"/></svg>',
        buildable: '<svg viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" fill="currentColor"/></svg>'
    };
    return defaultIcons[type] || defaultIcons.resource;
}

function getDefaultDescription(id, type) {
    const descriptions = {
        wood: 'Raw lumber harvested from trees',
        stone: 'Rough stone from the earth',
        crystal: 'A shimmering magical crystal',
        ore: 'Unrefined metal ore',
        herb: 'A useful medicinal plant',
        leaves: 'Fallen foliage',
        fiber: 'Natural plant fibers',
        mace: 'A heavy flanged mace for crushing blows',
        flintlock: 'A reliable ranged firearm',
        lance: 'A long thrusting polearm',
        longbow: 'A powerful ranged bow',
        katana: 'A swift curved blade',
        staff: 'Channels magical energies',
        broadsword: 'A heavy two-handed sword',
        dagger: 'A quick stabbing weapon',
        bread: 'A fresh loaf of bread',
        ale: 'A refreshing golden ale',
        stew: 'A hearty bowl of stew',
        potion_health: 'Restores your vitality',
        potion_stamina: 'Restores your energy',
        mana_potion: 'Restores magical power',
        torch: 'Lights dark places',
        rope: 'Useful for climbing',
        pickaxe: 'For mining ore'
    };
    return descriptions[id] || '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SORTING & FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

function initMainTabs() {
    const tabs = document.querySelectorAll('#inv-tabs .inv-tab');
    const contents = document.querySelectorAll('#inventory-container .tab-content');
    
    // Close button
    const closeBtn = document.getElementById('inv-close');
    if (closeBtn) {
        closeBtn.onclick = () => toggleInventory();
    }
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active to clicked tab
            tab.classList.add('active');
            const targetId = 'tab-' + tab.dataset.tab;
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
            
            // Refresh content based on tab
            if (tab.dataset.tab === 'items') {
                updateInventoryUI();
                initSortingTabs();
                initBagEquipmentSlots();
            } else if (tab.dataset.tab === 'crafting') {
                updateCraftingUI();
            } else if (tab.dataset.tab === 'skills') {
                drawSphereGrid();
            } else if (tab.dataset.tab === 'character') {
                updateCharacterStats();
                initCharacterEquipmentSlots();
            }
        };
    });
}

function initCharacterEquipmentSlots() {
    const slots = document.querySelectorAll('#equipment-slots .equip-slot');
    slots.forEach(slot => {
        const slotType = slot.dataset.slot;
        const equipped = _deps.inventory.getEquipmentSlot ? _deps.inventory.getEquipmentSlot(slotType) : null;
        
        if (equipped) {
            slot.classList.add('equipped');
            slot.innerHTML = `<img src="${_deps.itemIcons[equipped.icon] || ''}" alt="${equipped.name}">`;
        }
    });
}

function initSortingTabs() {
    const sortBtns = document.querySelectorAll('#inv-sort-bar .sort-btn');
    sortBtns.forEach(btn => {
        btn.onclick = () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInventoryFilter = btn.dataset.filter;
            applyInventoryFilter();
        };
    });
}

function applyInventoryFilter() {
    const slots = document.querySelectorAll('#unified-bag-grid .bag-slot');
    let visibleCount = 0;
    
    slots.forEach((slot, index) => {
        const itemType = slot.dataset.itemType || 'empty';
        const shouldShow = currentInventoryFilter === 'all' ||
                           itemType === currentInventoryFilter ||
                           (currentInventoryFilter === 'resource' && (itemType === 'resource' || itemType === 'crafted')) ||
                           slot.classList.contains('empty');
        
        if (shouldShow) {
            slot.classList.remove('hidden-by-filter');
            slot.style.animationDelay = (visibleCount * 0.03) + 's';
            visibleCount++;
        } else {
            slot.classList.add('hidden-by-filter');
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAG & DROP
// ═══════════════════════════════════════════════════════════════════════════════

function handleInvDragStart(e) {
    draggedInvItem = e.target.closest('.bag-slot');
    if (!draggedInvItem) draggedInvItem = e.target.closest('.inv-slot');
    if (!draggedInvItem) return;
    
    draggedInvItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'inventory',
        itemId: draggedInvItem.dataset.itemId,
        itemType: draggedInvItem.dataset.itemType
    }));
}

function handleInvDragEnd(e) {
    if (draggedInvItem) {
        draggedInvItem.classList.remove('dragging');
        draggedInvItem = null;
    }
}

function initHotbarDragDrop() {
    const hotbarSlots = document.querySelectorAll('.hotbar-slot');
    hotbarSlots.forEach((slot, index) => {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            slot.classList.add('drag-over');
        });
        slot.addEventListener('dragleave', (e) => {
            slot.classList.remove('drag-over');
        });
        slot.addEventListener('drop', (e) => {
            e.preventDefault();
            slot.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'inventory' && data.itemType === 'weapon') {
                    // Handle weapon equip to hotbar
                }
            } catch (err) {
                console.log('Drop parse error');
            }
        });
    });
}

function setupInventoryDropZone() {
    const bagGrid = document.getElementById('unified-bag-grid');
    if (!bagGrid) return;
    
    bagGrid.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPMENT
// ═══════════════════════════════════════════════════════════════════════════════

function initBagEquipmentSlots() {
    const bagEquipSlots = document.querySelectorAll('.bag-equip-slot');
    bagEquipSlots.forEach(slot => {
        slot.addEventListener('dragover', handleEquipDragOver);
        slot.addEventListener('dragleave', handleEquipDragLeave);
        slot.addEventListener('drop', handleEquipDrop);
        slot.addEventListener('click', handleEquipClick);
    });
    
    const charEquipSlots = document.querySelectorAll('#equipment-panel .equip-slot');
    charEquipSlots.forEach(slot => {
        slot.addEventListener('dragover', handleEquipDragOver);
        slot.addEventListener('dragleave', handleEquipDragLeave);
        slot.addEventListener('drop', handleEquipDrop);
        slot.addEventListener('click', handleEquipClick);
    });
}

function handleEquipDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleEquipDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleEquipDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const slotType = e.currentTarget.dataset.slot;
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        if (data.type === 'inventory' && data.itemType) {
            const item = _deps.inventory.items[data.itemId];
            if (item && canEquipToSlot(data.itemType, slotType, item.slot)) {
                _deps.equipment[slotType] = {
                    ...item,
                    id: data.itemId,
                    slot: slotType
                };
                
                calculateEquipmentBonuses();
                updateAllEquipmentSlots();
                updateInventoryUI();
                updateCharacterStats();
                showTransaction('Equipped ' + item.name + '!', 'buy');
            }
        }
    } catch (err) {
        console.log('Equip drop error');
    }
}

function handleEquipClick(e) {
    const slotType = e.currentTarget.dataset.slot;
    if (_deps.equipment[slotType]) {
        const item = _deps.equipment[slotType];
        _deps.equipment[slotType] = null;
        
        calculateEquipmentBonuses();
        updateAllEquipmentSlots();
        updateInventoryUI();
        updateCharacterStats();
        showTransaction('Unequipped ' + item.name, 'sell');
    }
}

function canEquipToSlot(itemType, slotType, itemSlot) {
    if (itemSlot) {
        if ((itemSlot === 'ring1' || itemSlot === 'ring2') && (slotType === 'ring1' || slotType === 'ring2')) {
            return true;
        }
        return itemSlot === slotType;
    }
    
    const slotMap = {
        helmet: ['armor', 'helmet'],
        pauldrons: ['armor', 'pauldrons'],
        necklace: ['armor', 'necklace', 'accessory'],
        chestpiece: ['armor', 'chestpiece'],
        ring1: ['armor', 'ring', 'accessory'],
        ring2: ['armor', 'ring', 'accessory'],
        belt: ['armor', 'belt'],
        trinket: ['armor', 'trinket', 'accessory'],
        greaves: ['armor', 'greaves'],
        boots: ['armor', 'boots']
    };
    
    return slotMap[slotType]?.includes(itemType) || false;
}

function equipItem(itemId) {
    const item = _deps.inventory.items[itemId];
    if (!item || item.type !== 'armor') return false;
    
    const slotType = item.slot || itemId;
    if (_deps.equipment[slotType]) {
        // Already something equipped
    }
    
    _deps.equipment[slotType] = { ...item, id: itemId };
    calculateEquipmentBonuses();
    updateAllEquipmentSlots();
    updateInventoryUI();
    return true;
}

function unequipItem(slotType) {
    if (_deps.equipment[slotType]) {
        _deps.equipment[slotType] = null;
        calculateEquipmentBonuses();
        updateAllEquipmentSlots();
        updateInventoryUI();
    }
}

function updateAllEquipmentSlots() {
    const slots = ['helmet', 'pauldrons', 'necklace', 'chestpiece', 'ring1', 'ring2', 'belt', 'trinket', 'greaves', 'boots'];
    slots.forEach(slotType => {
        updateEquipmentSlot(slotType);
    });
}

function updateEquipmentSlot(slotType) {
    const slots = document.querySelectorAll(`[data-slot="${slotType}"]`);
    const equipped = _deps.equipment[slotType];
    
    slots.forEach(slot => {
        if (!slot.dataset.originalIcon) {
            slot.dataset.originalIcon = slot.innerHTML;
        }
        
        if (equipped) {
            slot.classList.add('has-item');
            const iconKey = equipped.icon || equipped.id;
            const iconSvg = _deps.SHOP_ICONS[iconKey] || _deps.itemIcons[iconKey] || 
                           _deps.SHOP_ICONS[equipped.id] || _deps.itemIcons[equipped.id] || 
                           slot.dataset.originalIcon;
            slot.innerHTML = `<div class="equipped-item">${iconSvg}</div>`;
        } else {
            slot.classList.remove('has-item');
            slot.innerHTML = slot.dataset.originalIcon;
        }
    });
}

function calculateEquipmentBonuses() {
    // Delegate to inventory system if available
    if (_deps.inventory && _deps.inventory.calculateBonuses) {
        _deps.inventory.calculateBonuses();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOTBAR UI
// ═══════════════════════════════════════════════════════════════════════════════

function updateHotbarUI() {
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((slot, i) => {
        const item = _deps.hotbarItems[i];
        const iconEl = slot.querySelector('.slot-icon');
        const keyEl = slot.querySelector('.slot-key');
        
        if (item) {
            const weaponIcons = {
                hand: '✋', pickaxe: '⛏', axe: '🪓', sword: '⚔',
                mace: '🔨', flintlock: '🔫', lance: '🗡', longbow: '🏹',
                katana: '⚔', staff: '🪄', broadsword: '⚔', dagger: '🗡'
            };
            iconEl.textContent = weaponIcons[item.id] || item.icon || item.name.charAt(0);
            slot.title = item.name + (item.class ? ' (' + item.class + ')' : '');
        } else {
            iconEl.textContent = '';
            slot.title = 'Empty slot';
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLTIPS
// ═══════════════════════════════════════════════════════════════════════════════

function attachItemTooltip(element, itemData, stackCount = 1) {
    element.addEventListener('mouseenter', (e) => showItemTooltip(itemData, e, stackCount));
    element.addEventListener('mouseleave', hideItemTooltip);
    element.removeAttribute('title');
}

function showItemTooltip(item, event, stackCount = 1) {
    let tooltip = document.getElementById('item-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'item-tooltip';
        tooltip.className = 'item-tooltip';
        document.body.appendChild(tooltip);
    }
    
    const typeColors = {
        weapon: '#ff6b6b',
        armor: '#4fc3f7',
        consumable: '#81c784',
        tool: '#ffb74d',
        resource: '#b0bec5',
        crafted: '#ce93d8'
    };
    
    const typeColor = typeColors[item.type] || '#b0bec5';
    
    let statsHTML = '';
    if (item.damage) statsHTML += `<div class="tooltip-stat">⚔ Damage: ${item.damage}</div>`;
    if (item.defense) statsHTML += `<div class="tooltip-stat">🛡 Defense: ${item.defense}</div>`;
    if (item.attack) statsHTML += `<div class="tooltip-stat">⚔ Attack: +${item.attack}</div>`;
    if (item.hp) statsHTML += `<div class="tooltip-stat">❤ HP: +${item.hp}</div>`;
    if (item.mp) statsHTML += `<div class="tooltip-stat">💧 MP: +${item.mp}</div>`;
    if (item.strength) statsHTML += `<div class="tooltip-stat">💪 STR: +${item.strength}</div>`;
    if (item.dexterity) statsHTML += `<div class="tooltip-stat">🏃 DEX: +${item.dexterity}</div>`;
    if (item.intelligence) statsHTML += `<div class="tooltip-stat">🧠 INT: +${item.intelligence}</div>`;
    
    tooltip.innerHTML = `
        <div class="tooltip-header" style="border-color: ${typeColor}">
            <span class="tooltip-name">${item.name}</span>
            <span class="tooltip-type" style="color: ${typeColor}">${item.type || 'Item'}</span>
        </div>
        ${item.desc ? `<div class="tooltip-desc">${item.desc}</div>` : ''}
        ${statsHTML}
        ${stackCount > 1 ? `<div class="tooltip-stack">Stack: ${stackCount}</div>` : ''}
        ${item.price ? `<div class="tooltip-price">💰 ${item.price}g</div>` : ''}
    `;
    
    tooltip.style.display = 'block';
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = (rect.right + 10) + 'px';
    tooltip.style.top = rect.top + 'px';
    
    // Ensure tooltip stays on screen
    const tooltipRect = tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = (rect.left - tooltipRect.width - 10) + 'px';
    }
    if (tooltipRect.bottom > window.innerHeight) {
        tooltip.style.top = (window.innerHeight - tooltipRect.height - 10) + 'px';
    }
}

function hideItemTooltip() {
    const tooltip = document.getElementById('item-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHOP UI
// ═══════════════════════════════════════════════════════════════════════════════

function createShopSlot(item, type, index) {
    const slot = document.createElement('div');
    const itemType = item.class ? 'weapon' : (item.type || 'weapon');
    slot.className = 'shop-slot type-' + itemType;
    slot.dataset.itemType = itemType;
    slot.dataset.itemId = item.id;
    slot.style.animationDelay = (index * 0.05) + 's';
    
    const iconKey = item.icon || item.id;
    const iconSvg = _deps.SHOP_ICONS[iconKey] || _deps.SHOP_ICONS[item.id] || 
                    _deps.itemIcons[iconKey] || _deps.itemIcons[item.id] || 
                    _deps.SHOP_ICONS.sword;
    
    slot.innerHTML = `
        <div class="type-glow"></div>
        <div class="item-icon">${iconSvg}</div>
        <div class="item-name">${item.name}</div>
        <div class="item-price">${item.price}g</div>
        ${item.class ? '<div class="item-class">' + item.class + '</div>' : ''}
    `;
    
    attachItemTooltip(slot, item, 1);
    
    return slot;
}

function initShopSortTabs() {
    const sortBtns = document.querySelectorAll('#shop-sort-bar .sort-btn');
    sortBtns.forEach(btn => {
        btn.onclick = () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShopFilter = btn.dataset.filter;
            applyShopFilter();
        };
    });
}

function applyShopFilter() {
    const slots = document.querySelectorAll('#shop-trader-inventory .shop-slot');
    slots.forEach(slot => {
        const itemType = slot.dataset.itemType || 'weapon';
        const shouldShow = currentShopFilter === 'all' || itemType === currentShopFilter;
        slot.style.display = shouldShow ? '' : 'none';
    });
}

function getMaterialIcon(material) {
    if (_deps.SHOP_ICONS[material]) return _deps.SHOP_ICONS[material];
    if (_deps.itemIcons[material]) return _deps.itemIcons[material];
    
    const icons = {
        wood: '<svg viewBox="0 0 32 32"><rect x="10" y="6" width="12" height="20" fill="#8B4513"/></svg>',
        stone: '<svg viewBox="0 0 32 32"><polygon points="16,4 28,14 24,28 8,28 4,14" fill="#708090"/></svg>',
        crystal: '<svg viewBox="0 0 32 32"><polygon points="16,2 24,12 20,30 12,30 8,12" fill="#87CEEB"/></svg>'
    };
    return icons[material] || icons.stone;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRAFTING UI
// ═══════════════════════════════════════════════════════════════════════════════

function updateCraftingUI() {
    const list = document.getElementById('crafting-list');
    if (!list) return;
    list.innerHTML = '';
    
    initCraftingSortTabs();
    
    _deps.craftingRecipes.forEach(recipe => {
        if (currentCraftingFilter !== 'all' && recipe.type !== currentCraftingFilter) {
            return;
        }
        
        const canCraft = Object.entries(recipe.ingredients).every(([item, amount]) =>
            _deps.inventory.has(item, amount)
        );
        
        const div = document.createElement('div');
        div.className = 'craft-recipe type-' + recipe.type + (canCraft ? ' can-craft' : '');
        div.dataset.recipeType = recipe.type;
        
        let ingredientsHTML = Object.entries(recipe.ingredients).map(([item, amount]) => {
            const hasEnough = _deps.inventory.has(item, amount);
            const iconSvg = _deps.itemIcons[item] || '';
            return `<div class="craft-ing ${hasEnough ? 'has-enough' : 'not-enough'}">
                <span class="ing-icon">${iconSvg}</span>
                <span class="ing-amount">${_deps.inventory.items[item]?.count || 0}/${amount}</span>
            </div>`;
        }).join('');
        
        const resultIcon = _deps.itemIcons[recipe.result] || '';
        div.innerHTML = `
            <div class="craft-result">
                <span class="result-icon">${resultIcon}</span>
                <div>
                    <div class="result-name">${recipe.name}</div>
                    <div class="result-desc">${recipe.desc}</div>
                </div>
            </div>
            <span class="craft-arrow"><svg viewBox="0 0 24 24" width="24" height="24"><path d="M14 6l-6 6 6 6" stroke="currentColor" stroke-width="2" fill="none"/></svg></span>
            <div class="craft-ingredients">${ingredientsHTML}</div>
            <button class="craft-btn" ${canCraft ? '' : 'disabled'}>Craft</button>
        `;
        
        div.querySelector('.craft-btn').addEventListener('click', () => {
            if (canCraft) {
                Object.entries(recipe.ingredients).forEach(([item, amount]) => {
                    _deps.inventory.remove(item, amount);
                });
                _deps.inventory.add(recipe.result, recipe.resultAmount);
                _deps.inventory.xp += 10;
                if (_deps.inventory.xp >= _deps.inventory.xpToNext) {
                    _deps.inventory.level++;
                    _deps.inventory.xp -= _deps.inventory.xpToNext;
                    _deps.inventory.xpToNext = Math.floor(_deps.inventory.xpToNext * 1.5);
                }
                
                if (_deps.updateQuestProgress) {
                    _deps.updateQuestProgress('craft', { itemId: recipe.result, amount: recipe.resultAmount });
                }
                
                updateCraftingUI();
                updateInventoryUI();
            }
        });
        
        list.appendChild(div);
    });
}

function initCraftingSortTabs() {
    const sortBtns = document.querySelectorAll('#craft-sort-bar .sort-btn');
    sortBtns.forEach(btn => {
        btn.onclick = () => {
            sortBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCraftingFilter = btn.dataset.filter;
            updateCraftingUI();
        };
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHARACTER STATS
// ═══════════════════════════════════════════════════════════════════════════════

function updateCharacterStats() {
    calculateEquipmentBonuses();
    
    const stats = _deps.characterStats;
    const inv = _deps.inventory;
    
    // Level and XP
    const levelEl = document.getElementById('char-level');
    if (levelEl) levelEl.textContent = inv.level;
    
    const goldEl = document.getElementById('gold-amount');
    if (goldEl) goldEl.textContent = inv.gold;
    
    const xpPercent = (inv.xp / inv.xpToNext) * 100;
    const xpFill = document.getElementById('xp-fill');
    if (xpFill) xpFill.style.width = xpPercent + '%';
    
    const xpText = document.getElementById('xp-text');
    if (xpText) xpText.textContent = `${inv.xp} / ${inv.xpToNext} XP`;
    
    // Primary stats
    const statMappings = {
        'stat-str': stats.strength,
        'stat-dex': stats.dexterity,
        'stat-con': stats.constitution,
        'stat-int': stats.intelligence,
        'stat-wis': stats.wisdom,
        'stat-cha': stats.charisma,
        'stat-hp': `${stats.hp}/${stats.maxHp}`,
        'stat-mp': `${stats.mp}/${stats.maxMp}`,
        'stat-stam': `${stats.stamina}/${stats.maxStamina}`,
        'stat-atk': stats.attack,
        'stat-def': stats.defense,
        'stat-crit': stats.critChance + '%',
        'res-phys': stats.physRes + '%',
        'res-fire': stats.fireRes + '%',
        'res-ice': stats.iceRes + '%',
        'res-light': stats.lightRes + '%',
        'res-shadow': stats.shadowRes + '%'
    };
    
    Object.entries(statMappings).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
    
    updatePlayerHUD();
}

function updatePlayerHUD() {
    const stats = _deps.characterStats;
    const inv = _deps.inventory;
    
    // HP Flask
    const hpPercent = (stats.hp / stats.maxHp) * 100;
    const hpLiquid = document.getElementById('hp-liquid');
    if (hpLiquid) hpLiquid.style.height = Math.max(0, Math.min(100, hpPercent)) + '%';
    
    const hpValue = document.getElementById('hp-value');
    if (hpValue) hpValue.textContent = Math.floor(stats.hp);
    
    const hpMax = document.getElementById('hp-max');
    if (hpMax) hpMax.textContent = stats.maxHp;
    
    // MP Flask
    const mpPercent = (stats.mp / stats.maxMp) * 100;
    const mpLiquid = document.getElementById('mp-liquid');
    if (mpLiquid) mpLiquid.style.height = Math.max(0, Math.min(100, mpPercent)) + '%';
    
    const mpValue = document.getElementById('mp-value');
    if (mpValue) mpValue.textContent = Math.floor(stats.mp);
    
    const mpMax = document.getElementById('mp-max');
    if (mpMax) mpMax.textContent = stats.maxMp;
    
    // XP Bar
    const xpPercent = (inv.xp / inv.xpToNext) * 100;
    const xpBarFill = document.getElementById('xp-bar-fill');
    if (xpBarFill) xpBarFill.style.width = Math.max(0, Math.min(100, xpPercent)) + '%';
    
    const xpLevelNum = document.getElementById('xp-level-num');
    if (xpLevelNum) xpLevelNum.textContent = inv.level;
    
    const xpCurrent = document.getElementById('xp-current');
    if (xpCurrent) xpCurrent.textContent = inv.xp;
    
    const xpNeeded = document.getElementById('xp-needed');
    if (xpNeeded) xpNeeded.textContent = inv.xpToNext;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPHERE GRID (Placeholder - actual implementation is complex)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SPHERE GRID - FFX/PERSONA 5 STYLE SKILL TREE
// ═══════════════════════════════════════════════════════════════════════════════

// Skill tree data structure
const skillTree = {
    nodes: [],
    connections: [],
    classCircles: []
};

// Pan and zoom state
const gridView = {
    panX: 0, panY: 0,
    zoom: 0.32,
    minZoom: 0.15, maxZoom: 1.5,
    dragging: false,
    lastX: 0, lastY: 0
};

let gridAnimTime = 0;
let hoveredSkill = null;
let gridInitialized = false;

// Animated particles
const gridParticles = [];
for (let i = 0; i < 120; i++) {
    gridParticles.push({
        x: Math.random() * 4000 - 2000,
        y: Math.random() * 4000 - 2000,
        size: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        angle: Math.random() * Math.PI * 2
    });
}

// Generate sphere grid structure
function generateSphereGrid() {
    if (skillTree.nodes.length > 0) return; // Already generated
    
    const nodes = skillTree.nodes;
    const conns = skillTree.connections;
    const classCircles = skillTree.classCircles;
    
    // Class definitions
    const classes = [
        { id: 'knight', name: 'Knight', icon: '🛡️', color: '#4a90d9', desc: 'Masters of defense',
          skills: [
            { name: 'Shield Wall', desc: 'Block 50% damage' },
            { name: 'Fortress', desc: '+30% armor' },
            { name: 'Stalwart', desc: 'Immune to knockback' },
            { name: 'Guardian', desc: 'Protect allies' },
            { name: 'Iron Defense', desc: 'Reduce damage 25%' },
            { name: 'Cover', desc: 'Take hits for allies' },
            { name: 'Sentinel', desc: 'Increased threat' },
            { name: 'Bulwark', desc: 'Shield bash stuns' },
            { name: 'Aegis', desc: 'Reflect 10% damage' },
            { name: 'Last Bastion', desc: 'Survive fatal blow' }
          ]},
        { id: 'blackmage', name: 'Black Mage', icon: '🔮', color: '#9b59b6', desc: 'Destructive magic',
          skills: [
            { name: 'Fire III', desc: 'Powerful fire spell' },
            { name: 'Blizzard III', desc: 'Powerful ice spell' },
            { name: 'Thunder III', desc: 'Lightning spell' },
            { name: 'Flare', desc: 'Massive AoE fire' },
            { name: 'Freeze', desc: 'Chance to freeze' },
            { name: 'Mana Font', desc: '+50% MP recovery' },
            { name: 'Spell Speed', desc: 'Faster casts' },
            { name: 'Elemental Mastery', desc: '+30% damage' },
            { name: 'Meteor', desc: 'Ultimate destruction' },
            { name: 'Astral Fire', desc: 'HP for MP' }
          ]},
        { id: 'whitemage', name: 'White Mage', icon: '✨', color: '#2ecc71', desc: 'Blessed healers',
          skills: [
            { name: 'Cure III', desc: 'Powerful healing' },
            { name: 'Regen', desc: 'Heal over time' },
            { name: 'Raise', desc: 'Revive allies' },
            { name: 'Esuna', desc: 'Remove debuffs' },
            { name: 'Protect', desc: 'Defense buff' },
            { name: 'Shell', desc: 'Magic defense' },
            { name: 'Holy', desc: 'Light damage' },
            { name: 'Benediction', desc: 'Full HP restore' },
            { name: 'Divine Seal', desc: '+50% healing' },
            { name: 'Asylum', desc: 'AoE healing zone' }
          ]},
        { id: 'samurai', name: 'Samurai', icon: '⚔️', color: '#e74c3c', desc: 'Blade masters',
          skills: [
            { name: 'Iaijutsu', desc: 'Quick draw attack' },
            { name: 'Meikyo Shisui', desc: 'Perfect combo' },
            { name: 'Hissatsu', desc: 'Guaranteed crit' },
            { name: 'Kaiten', desc: '+50% next attack' },
            { name: 'Third Eye', desc: 'Parry next attack' },
            { name: 'Meditate', desc: 'Build Kenki' },
            { name: 'Hagakure', desc: 'Convert resources' },
            { name: 'Midare', desc: '3-hit ultimate' },
            { name: 'Tsubame', desc: 'Counter attack' },
            { name: 'Shoha', desc: 'Meditation finisher' }
          ]},
        { id: 'ranger', name: 'Ranger', icon: '🏹', color: '#27ae60', desc: 'Expert marksmen',
          skills: [
            { name: 'Snipe', desc: 'Long range shot' },
            { name: 'Barrage', desc: 'Multiple arrows' },
            { name: 'Track', desc: 'See enemy locations' },
            { name: 'Camouflage', desc: 'Harder to detect' },
            { name: 'Trap Mastery', desc: 'Set deadly traps' },
            { name: 'Eagle Eye', desc: '+50% crit range' },
            { name: 'Rain of Arrows', desc: 'AoE arrow attack' },
            { name: 'Quickdraw', desc: 'Instant shot' },
            { name: 'Beast Companion', desc: 'Animal ally' },
            { name: 'Nature\'s Blessing', desc: 'Wilderness regen' }
          ]},
        { id: 'dragoon', name: 'Dragoon', icon: '🐉', color: '#3498db', desc: 'Aerial warriors',
          skills: [
            { name: 'Jump', desc: 'Leap attack' },
            { name: 'High Jump', desc: 'Higher leap' },
            { name: 'Dragonfire Dive', desc: 'Fire damage dive' },
            { name: 'Spineshatter', desc: 'Stunning dive' },
            { name: 'Blood of Dragon', desc: 'Dragon trance' },
            { name: 'Mirage Dive', desc: 'Follow-up dive' },
            { name: 'Geirskogul', desc: 'Energy beam' },
            { name: 'Nastrond', desc: 'Enhanced beam' },
            { name: 'Stardiver', desc: 'Ultimate dive' },
            { name: 'Dragon Sight', desc: 'Buff ally damage' }
          ]},
        { id: 'machinist', name: 'Machinist', icon: '⚙️', color: '#95a5a6', desc: 'Tech gunners',
          skills: [
            { name: 'Split Shot', desc: 'Basic attack' },
            { name: 'Wildfire', desc: 'Explosive combo' },
            { name: 'Hypercharge', desc: 'Overload turret' },
            { name: 'Automaton', desc: 'Robot companion' },
            { name: 'Gauss Round', desc: 'Quick burst' },
            { name: 'Ricochet', desc: 'Bouncing bullet' },
            { name: 'Air Anchor', desc: 'Heavy hit' },
            { name: 'Drill', desc: 'Piercing attack' },
            { name: 'Chain Saw', desc: 'Brutal finisher' },
            { name: 'Flamethrower', desc: 'AoE fire' }
          ]},
        { id: 'paladin', name: 'Paladin', icon: '⚜️', color: '#f1c40f', desc: 'Holy warriors',
          skills: [
            { name: 'Flash', desc: 'Blind enemies' },
            { name: 'Clemency', desc: 'Heal self/ally' },
            { name: 'Hallowed Ground', desc: 'Invulnerable' },
            { name: 'Divine Veil', desc: 'Party shield' },
            { name: 'Requiescat', desc: 'Magic combo' },
            { name: 'Holy Spirit', desc: 'Light attack' },
            { name: 'Confiteor', desc: 'Magic finisher' },
            { name: 'Passage of Arms', desc: 'Block all' },
            { name: 'Cover', desc: 'Ally protection' },
            { name: 'Intervention', desc: 'Reduce ally dmg' }
          ]},
        { id: 'thief', name: 'Thief', icon: '🗡️', color: '#e67e22', desc: 'Shadow rogues',
          skills: [
            { name: 'Steal', desc: 'Steal items' },
            { name: 'Mug', desc: 'Attack + steal' },
            { name: 'Hide', desc: 'Become invisible' },
            { name: 'Backstab', desc: '+100% from behind' },
            { name: 'Trick Attack', desc: 'Position bonus' },
            { name: 'Assassinate', desc: 'Execute low HP' },
            { name: 'Smokescreen', desc: 'Escape combat' },
            { name: 'Shadow Fang', desc: 'Poison DoT' },
            { name: 'Dancing Edge', desc: 'Combo finisher' },
            { name: 'Perfect Dodge', desc: 'Avoid next hit' }
          ]}
    ];
    
    // Core skill types
    const coreTypes = ['combat', 'survival', 'utility', 'special'];
    const coreSkills = {
        combat: [
            { name: 'Strength +5', desc: 'Increase base damage' },
            { name: 'Fury', desc: 'Critical damage +50%' },
            { name: 'Power Strike', desc: 'Heavy attack stuns' },
            { name: 'Battle Cry', desc: 'Damage aura' }
        ],
        survival: [
            { name: 'Vitality +20', desc: 'Increase max HP' },
            { name: 'Regeneration', desc: 'HP recovery over time' },
            { name: 'Thick Skin', desc: 'Reduce damage 10%' },
            { name: 'Second Wind', desc: 'Survive fatal blow' }
        ],
        utility: [
            { name: 'Swift +10%', desc: 'Move speed increase' },
            { name: 'Gatherer', desc: '+25% resource yield' },
            { name: 'Lucky Find', desc: 'Rare drop chance' },
            { name: 'Efficiency', desc: 'Tool durability +50%' }
        ],
        special: [
            { name: 'Night Vision', desc: 'See in darkness' },
            { name: 'Spirit Walk', desc: 'Phase through foliage' },
            { name: 'Elemental', desc: 'Resist elements' },
            { name: 'Transcend', desc: 'Ultimate power unlock' }
        ]
    };
    
    // Center origin node
    nodes.push({ 
        id: 'origin', x: 0, y: 0, 
        name: '✦ ORIGIN ✦', 
        desc: 'The nexus of all paths. Your journey begins here.', 
        type: 'start', unlocked: true, cost: 0, radius: 40 
    });
    
    // Core rings
    const coreRings = [
        { r: 100, count: 6 },
        { r: 180, count: 10 },
        { r: 270, count: 14 },
        { r: 370, count: 18 }
    ];
    
    let nodeId = 0;
    const corePoolIdx = { combat: 0, survival: 0, utility: 0, special: 0 };
    
    coreRings.forEach((ring, ringIdx) => {
        for (let i = 0; i < ring.count; i++) {
            const angle = (i / ring.count) * Math.PI * 2;
            const x = Math.cos(angle) * ring.r;
            const y = Math.sin(angle) * ring.r;
            
            const quadrant = Math.floor(((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 0.5));
            const type = coreTypes[quadrant];
            const skillPool = coreSkills[type];
            const skill = skillPool[corePoolIdx[type] % skillPool.length];
            corePoolIdx[type]++;
            
            nodes.push({
                id: `core${nodeId}`,
                x, y,
                name: skill.name,
                desc: skill.desc,
                type: type,
                unlocked: false,
                cost: ringIdx + 1,
                ring: ringIdx,
                isCore: true,
                radius: 14 - ringIdx
            });
            nodeId++;
        }
    });
    
    // Core connections
    for (let i = 0; i < coreRings[0].count; i++) {
        conns.push(['origin', `core${i}`]);
    }
    
    let prevStart = 0;
    for (let r = 0; r < coreRings.length - 1; r++) {
        const currCount = coreRings[r].count;
        const nextCount = coreRings[r + 1].count;
        const nextStart = prevStart + currCount;
        
        for (let i = 0; i < currCount; i++) {
            const ratio = nextCount / currCount;
            const target = Math.floor(i * ratio);
            conns.push([`core${prevStart + i}`, `core${nextStart + target}`]);
        }
        prevStart = nextStart;
    }
    
    // Ring connections
    prevStart = 0;
    coreRings.forEach((ring) => {
        for (let i = 0; i < ring.count; i++) {
            if (i % 2 === 0) {
                conns.push([`core${prevStart + i}`, `core${prevStart + ((i + 1) % ring.count)}`]);
            }
        }
        prevStart += ring.count;
    });
    
    // Class sub-circles
    const classRadius = 320;
    const classDistance = 850;
    const classRings = [
        { r: 80, count: 8 },
        { r: 150, count: 12 },
        { r: 220, count: 14 },
        { r: 290, count: 6 }
    ];
    
    const coreNodeCount = nodeId;
    
    classes.forEach((cls, classIdx) => {
        const classAngle = (classIdx / classes.length) * Math.PI * 2 - Math.PI / 2;
        const classCenterX = Math.cos(classAngle) * classDistance;
        const classCenterY = Math.sin(classAngle) * classDistance;
        
        classCircles.push({
            id: cls.id,
            name: cls.name,
            icon: cls.icon,
            color: cls.color,
            desc: cls.desc,
            x: classCenterX,
            y: classCenterY,
            radius: classRadius
        });
        
        // Gate node
        const gateId = `${cls.id}_gate`;
        nodes.push({
            id: gateId,
            x: classCenterX,
            y: classCenterY,
            name: `${cls.icon} ${cls.name}`,
            desc: cls.desc,
            type: cls.id,
            classType: cls.id,
            unlocked: false,
            cost: 5,
            radius: 28,
            isGate: true
        });
        
        // Connect to outer core
        const outerCoreStart = coreRings.slice(0, -1).reduce((a, r) => a + r.count, 0);
        const outerCoreCount = coreRings[coreRings.length - 1].count;
        const nearestCoreIdx = Math.round((classAngle + Math.PI / 2) / (Math.PI * 2) * outerCoreCount) % outerCoreCount;
        conns.push([`core${outerCoreStart + nearestCoreIdx}`, gateId]);
        
        // Generate class nodes
        let classNodeId = 0;
        let skillIdx = 0;
        
        classRings.forEach((ring, ringIdx) => {
            for (let i = 0; i < ring.count; i++) {
                const localAngle = (i / ring.count) * Math.PI * 2;
                const x = classCenterX + Math.cos(localAngle) * ring.r;
                const y = classCenterY + Math.sin(localAngle) * ring.r;
                
                const skill = cls.skills[skillIdx % cls.skills.length];
                skillIdx++;
                
                const nodeIdStr = `${cls.id}_n${classNodeId}`;
                nodes.push({
                    id: nodeIdStr,
                    x, y,
                    name: skill.name,
                    desc: skill.desc,
                    type: cls.id,
                    classType: cls.id,
                    unlocked: false,
                    cost: ringIdx + 2,
                    ring: ringIdx,
                    radius: 12 - ringIdx
                });
                classNodeId++;
            }
        });
        
        // Connect gate to first ring
        for (let i = 0; i < classRings[0].count; i++) {
            conns.push([gateId, `${cls.id}_n${i}`]);
        }
        
        // Connect between rings
        let classPrevStart = 0;
        for (let r = 0; r < classRings.length - 1; r++) {
            const currCount = classRings[r].count;
            const nextCount = classRings[r + 1].count;
            const nextStart = classPrevStart + currCount;
            
            for (let i = 0; i < currCount; i++) {
                const ratio = nextCount / currCount;
                const target = Math.floor(i * ratio) % nextCount;
                conns.push([`${cls.id}_n${classPrevStart + i}`, `${cls.id}_n${nextStart + target}`]);
            }
            classPrevStart = nextStart;
        }
    });
    
    // Connect adjacent class circles
    for (let i = 0; i < classes.length; i++) {
        const next = (i + 1) % classes.length;
        conns.push([`${classes[i].id}_gate`, `${classes[next].id}_gate`]);
    }
    
    console.log(`🔮 Generated sphere grid: ${nodes.length} nodes, ${conns.length} connections`);
}

// Color utilities
function lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function drawSphereGrid() {
    generateSphereGrid();
    
    const canvas = document.getElementById('sphere-canvas');
    const container = document.getElementById('skills-container');
    if (!canvas || !container) return;
    
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2 + gridView.panX;
    const centerY = canvas.height / 2 + gridView.panY;
    const zoom = gridView.zoom;
    
    const colors = {
        combat: '#ff2d55', survival: '#4ecdc4', utility: '#ffd700', special: '#a855f7',
        start: '#ffffff', locked: '#2a2a3c',
        knight: '#4a90d9', blackmage: '#9b59b6', whitemage: '#2ecc71',
        samurai: '#e74c3c', ranger: '#27ae60', dragoon: '#3498db',
        machinist: '#95a5a6', paladin: '#f1c40f', thief: '#e67e22'
    };
    
    // Background
    const bgGrad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width * 0.8);
    bgGrad.addColorStop(0, '#0d0d1a');
    bgGrad.addColorStop(0.3, '#080812');
    bgGrad.addColorStop(0.6, '#050508');
    bgGrad.addColorStop(1, '#020204');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Nebula overlays
    const time = gridAnimTime;
    const nebula1 = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time * 0.1) * 50, 
        canvas.height * 0.4 + Math.cos(time * 0.15) * 30, 
        0, canvas.width * 0.3, canvas.height * 0.4, canvas.width * 0.4
    );
    nebula1.addColorStop(0, 'rgba(139, 92, 246, 0.08)');
    nebula1.addColorStop(0.5, 'rgba(139, 92, 246, 0.03)');
    nebula1.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Star particles
    gridParticles.forEach((p, i) => {
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        if (p.x > 1800) p.x = -1800;
        if (p.x < -1800) p.x = 1800;
        if (p.y > 1800) p.y = -1800;
        if (p.y < -1800) p.y = 1800;
        
        const px = centerX + p.x * zoom;
        const py = centerY + p.y * zoom;
        if (px > -10 && px < canvas.width + 10 && py > -10 && py < canvas.height + 10) {
            const twinkle = Math.sin(time * 3 + i * 0.5) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + twinkle * 0.6})`;
            ctx.beginPath();
            ctx.arc(px, py, p.size * 0.8 * zoom, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Class circles
    skillTree.classCircles.forEach((cls, idx) => {
        const cx = centerX + cls.x * zoom;
        const cy = centerY + cls.y * zoom;
        const r = cls.radius * zoom;
        
        if (cx < -r * 1.5 || cx > canvas.width + r * 1.5 || cy < -r * 1.5 || cy > canvas.height + r * 1.5) return;
        
        ctx.save();
        ctx.translate(cx, cy);
        
        // Outer rotating ring
        ctx.rotate(gridAnimTime * 0.15 + idx * 0.5);
        ctx.strokeStyle = cls.color + '50';
        ctx.lineWidth = 2 * zoom;
        ctx.setLineDash([20 * zoom, 12 * zoom]);
        ctx.beginPath();
        ctx.arc(0, 0, r + 30 * zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Inner glow
        const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        innerGlow.addColorStop(0, cls.color + '08');
        innerGlow.addColorStop(0.5, cls.color + '15');
        innerGlow.addColorStop(0.8, cls.color + '25');
        innerGlow.addColorStop(1, cls.color + '05');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        
        // Energy arcs
        for (let i = 0; i < 6; i++) {
            const arcAngle = (i / 6) * Math.PI * 2 + gridAnimTime * 0.8;
            const arcWidth = 0.25 + Math.sin(gridAnimTime * 3 + i) * 0.1;
            ctx.strokeStyle = cls.color + '70';
            ctx.lineWidth = 4 * zoom;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, r - 15 * zoom, arcAngle - arcWidth, arcAngle + arcWidth);
            ctx.stroke();
        }
        
        ctx.restore();
        
        // Class icon
        const iconSize = 50 * zoom;
        ctx.shadowBlur = 30;
        ctx.shadowColor = cls.color;
        ctx.strokeStyle = cls.color;
        ctx.lineWidth = 3 * zoom;
        ctx.beginPath();
        ctx.arc(cx, cy, iconSize + 8 * zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        const iconBg = ctx.createRadialGradient(cx - iconSize * 0.2, cy - iconSize * 0.2, 0, cx, cy, iconSize);
        iconBg.addColorStop(0, lightenColor(cls.color, 30));
        iconBg.addColorStop(0.4, cls.color);
        iconBg.addColorStop(1, darkenColor(cls.color, 50));
        ctx.fillStyle = iconBg;
        ctx.beginPath();
        ctx.arc(cx, cy, iconSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3 * zoom;
        ctx.stroke();
        
        ctx.font = `${Math.floor(40 * zoom)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(cls.icon, cx, cy + 2 * zoom);
        
        ctx.font = `bold ${Math.floor(14 * zoom)}px 'Orbitron', sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = cls.color;
        ctx.fillText(cls.name.toUpperCase(), cx, cy + iconSize + 20 * zoom);
        ctx.shadowBlur = 0;
    });
    
    // Energy streams to classes
    skillTree.classCircles.forEach((cls, idx) => {
        const cx = centerX + cls.x * zoom;
        const cy = centerY + cls.y * zoom;
        
        const gradient = ctx.createLinearGradient(centerX, centerY, cx, cy);
        gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
        gradient.addColorStop(0.3, cls.color + '40');
        gradient.addColorStop(0.7, cls.color + '60');
        gradient.addColorStop(1, cls.color + '20');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 * zoom;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        const midX = (centerX + cx) / 2 + Math.sin(idx * 0.7) * 50 * zoom;
        const midY = (centerY + cy) / 2 + Math.cos(idx * 0.7) * 50 * zoom;
        ctx.quadraticCurveTo(midX, midY, cx, cy);
        ctx.stroke();
    });
    
    // Core center effects
    for (let i = 0; i < 4; i++) {
        const ringR = (120 + i * 80) * zoom;
        const pulse = Math.sin(gridAnimTime * 1.5 - i * 0.5) * 0.4 + 0.6;
        ctx.strokeStyle = `rgba(255, 45, 85, ${pulse * 0.1})`;
        ctx.lineWidth = (2 - i * 0.3) * zoom;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringR * pulse, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Build node lookup
    const nodeMap = {};
    skillTree.nodes.forEach(n => nodeMap[n.id] = n);
    
    // Connections
    skillTree.connections.forEach(([fromId, toId]) => {
        const nodeFrom = nodeMap[fromId];
        const nodeTo = nodeMap[toId];
        if (!nodeFrom || !nodeTo) return;
        
        const fromX = centerX + nodeFrom.x * zoom;
        const fromY = centerY + nodeFrom.y * zoom;
        const toX = centerX + nodeTo.x * zoom;
        const toY = centerY + nodeTo.y * zoom;
        
        if (Math.max(fromX, toX) < -50 || Math.min(fromX, toX) > canvas.width + 50) return;
        if (Math.max(fromY, toY) < -50 || Math.min(fromY, toY) > canvas.height + 50) return;
        
        const bothUnlocked = nodeFrom.unlocked && nodeTo.unlocked;
        const oneUnlocked = nodeFrom.unlocked || nodeTo.unlocked;
        const nodeColor = colors[nodeTo.classType] || colors[nodeTo.type] || colors.utility;
        
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        
        if (bothUnlocked) {
            ctx.strokeStyle = nodeColor;
            ctx.lineWidth = 3 * zoom;
            ctx.shadowBlur = 15;
            ctx.shadowColor = nodeColor;
        } else if (oneUnlocked) {
            const activeColor = colors[nodeFrom.unlocked ? nodeFrom.type : nodeTo.type] || '#fff';
            ctx.strokeStyle = activeColor + '80';
            ctx.lineWidth = 2 * zoom;
            ctx.shadowBlur = 5;
            ctx.shadowColor = activeColor;
        } else {
            ctx.strokeStyle = colors.locked;
            ctx.lineWidth = 1 * zoom;
            ctx.shadowBlur = 0;
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
    
    // Nodes
    const skillPoints = _deps.inventory?.skillPoints || 5;
    
    skillTree.nodes.forEach(node => {
        const x = centerX + node.x * zoom;
        const y = centerY + node.y * zoom;
        const baseRadius = node.radius || 16;
        const radius = baseRadius * zoom;
        
        if (x < -radius * 2 || x > canvas.width + radius * 2) return;
        if (y < -radius * 2 || y > canvas.height + radius * 2) return;
        
        const nodeColor = colors[node.classType] || colors[node.type] || colors.utility;
        
        let canUnlock = false;
        if (!node.unlocked && skillPoints >= node.cost) {
            canUnlock = skillTree.connections.some(([a, b]) => {
                const other = a === node.id ? b : (b === node.id ? a : null);
                return other && nodeMap[other]?.unlocked;
            });
        }
        
        // Glow for unlocked/available
        if (node.unlocked || canUnlock) {
            const glowGrad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 3);
            glowGrad.addColorStop(0, (node.unlocked ? nodeColor : '#ffffff') + '40');
            glowGrad.addColorStop(0.5, (node.unlocked ? nodeColor : '#ffffff') + '15');
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Pulse indicator
        if (canUnlock) {
            const pulse = Math.sin(gridAnimTime * 4) * 0.4 + 0.6;
            ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius * 1.8 * (0.8 + pulse * 0.2), 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Main sphere
        const sphereGrad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
        if (node.unlocked) {
            sphereGrad.addColorStop(0, lightenColor(nodeColor, 50));
            sphereGrad.addColorStop(0.5, nodeColor);
            sphereGrad.addColorStop(1, darkenColor(nodeColor, 40));
        } else if (canUnlock) {
            sphereGrad.addColorStop(0, '#6a6a8a');
            sphereGrad.addColorStop(0.5, '#4a4a6a');
            sphereGrad.addColorStop(1, '#2a2a4a');
        } else {
            sphereGrad.addColorStop(0, '#3a3a4a');
            sphereGrad.addColorStop(1, '#1a1a2a');
        }
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();
        
        // Border
        if (node.unlocked) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = nodeColor;
        }
        ctx.strokeStyle = node.unlocked ? '#fff' : (canUnlock ? '#999' : '#444');
        ctx.lineWidth = (node.unlocked ? 3 : 2) * zoom;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Specular
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${node.unlocked ? 0.5 : 0.2})`;
        ctx.fill();
        
        // Store for hit detection
        node.screenX = x;
        node.screenY = y;
        node.screenRadius = radius;
    });
    
    // Update skill points display
    const spValue = document.querySelector('#skill-points .sp-value');
    if (spValue) spValue.textContent = skillPoints;
    
    // Setup interactions if not already
    if (!gridInitialized) {
        initSphereGridInteractions();
        gridInitialized = true;
    }
}

function initSphereGridInteractions() {
    const canvas = document.getElementById('sphere-canvas');
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            gridView.dragging = true;
            gridView.lastX = e.clientX;
            gridView.lastY = e.clientY;
            canvas.style.cursor = 'grabbing';
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (gridView.dragging) {
            gridView.panX += e.clientX - gridView.lastX;
            gridView.panY += e.clientY - gridView.lastY;
            gridView.lastX = e.clientX;
            gridView.lastY = e.clientY;
            drawSphereGrid();
        }
        
        // Hit detection
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        hoveredSkill = null;
        for (const node of skillTree.nodes) {
            if (node.screenX === undefined) continue;
            const dx = x - node.screenX;
            const dy = y - node.screenY;
            if (Math.sqrt(dx*dx + dy*dy) < (node.screenRadius || 16) + 5) {
                hoveredSkill = node;
                break;
            }
        }
        
        const info = document.getElementById('skill-info');
        if (hoveredSkill && info) {
            info.querySelector('.skill-name').textContent = hoveredSkill.name;
            info.querySelector('.skill-desc').textContent = hoveredSkill.desc;
            info.querySelector('.skill-cost').textContent = hoveredSkill.cost > 0 ? `Cost: ${hoveredSkill.cost} SP` : 'Starting Node';
            
            const nodeMap = {};
            skillTree.nodes.forEach(n => nodeMap[n.id] = n);
            const skillPoints = _deps.inventory?.skillPoints || 5;
            
            const canUnlock = !hoveredSkill.unlocked && skillPoints >= hoveredSkill.cost &&
                skillTree.connections.some(([a, b]) => {
                    const other = a === hoveredSkill.id ? b : (b === hoveredSkill.id ? a : null);
                    return other && nodeMap[other]?.unlocked;
                });
            
            const status = info.querySelector('.skill-status');
            if (hoveredSkill.unlocked) {
                status.textContent = '✓ UNLOCKED';
                status.className = 'skill-status unlocked';
            } else if (canUnlock) {
                status.textContent = '► CLICK TO UNLOCK';
                status.className = 'skill-status available';
            } else {
                status.textContent = '✗ Requirements not met';
                status.className = 'skill-status locked';
            }
            
            info.classList.add('show');
        } else if (info) {
            info.classList.remove('show');
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        gridView.dragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('mouseleave', () => {
        gridView.dragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const oldZoom = gridView.zoom;
        
        if (e.deltaY < 0) {
            gridView.zoom = Math.min(gridView.maxZoom, gridView.zoom * (1 + zoomSpeed));
        } else {
            gridView.zoom = Math.max(gridView.minZoom, gridView.zoom * (1 - zoomSpeed));
        }
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - canvas.width / 2;
        const mouseY = e.clientY - rect.top - canvas.height / 2;
        
        gridView.panX = mouseX - (mouseX - gridView.panX) * (gridView.zoom / oldZoom);
        gridView.panY = mouseY - (mouseY - gridView.panY) * (gridView.zoom / oldZoom);
        
        drawSphereGrid();
    });
    
    canvas.addEventListener('click', () => {
        if (!hoveredSkill || hoveredSkill.unlocked) return;
        
        const nodeMap = {};
        skillTree.nodes.forEach(n => nodeMap[n.id] = n);
        const skillPoints = _deps.inventory?.skillPoints || 5;
        
        const canUnlock = skillPoints >= hoveredSkill.cost &&
            skillTree.connections.some(([a, b]) => {
                const other = a === hoveredSkill.id ? b : (b === hoveredSkill.id ? a : null);
                return other && nodeMap[other]?.unlocked;
            });
        
        if (canUnlock && _deps.inventory) {
            hoveredSkill.unlocked = true;
            _deps.inventory.skillPoints -= hoveredSkill.cost;
            drawSphereGrid();
        }
    });
    
    // Zoom controls
    document.getElementById('zoom-in')?.addEventListener('click', () => {
        gridView.zoom = Math.min(gridView.maxZoom, gridView.zoom * 1.2);
        drawSphereGrid();
    });
    
    document.getElementById('zoom-out')?.addEventListener('click', () => {
        gridView.zoom = Math.max(gridView.minZoom, gridView.zoom * 0.8);
        drawSphereGrid();
    });
    
    document.getElementById('zoom-reset')?.addEventListener('click', () => {
        gridView.zoom = 0.32;
        gridView.panX = 0;
        gridView.panY = 0;
        drawSphereGrid();
    });
    
    canvas.style.cursor = 'grab';
}

// Animation loop for sphere grid
function animateSphereGrid() {
    const skillsTab = document.getElementById('tab-skills');
    if (skillsTab && skillsTab.classList.contains('active') && inventoryOpen) {
        gridAnimTime += 0.016;
        drawSphereGrid();
    }
    requestAnimationFrame(animateSphereGrid);
}
animateSphereGrid();

// ═══════════════════════════════════════════════════════════════════════════════
// UI SYSTEM - Public API
// ═══════════════════════════════════════════════════════════════════════════════

const UISystem = {
    init(deps) {
        _deps = { ..._deps, ...deps };
    },
    
    // Notifications
    showMaterialNotif,
    showPickupNotification,
    showTransaction,
    
    // Inventory
    toggleInventory,
    isInventoryOpen,
    updateInventoryUI,
    updateHotbarUI,
    
    // Equipment
    equipItem,
    unequipItem,
    updateAllEquipmentSlots,
    calculateEquipmentBonuses,
    
    // Shop
    createShopSlot,
    initShopSortTabs,
    applyShopFilter,
    getMaterialIcon,
    
    // Crafting
    updateCraftingUI,
    
    // Character
    updateCharacterStats,
    updatePlayerHUD,
    
    // Tooltips
    attachItemTooltip,
    showItemTooltip,
    hideItemTooltip,
    
    // Sphere grid
    drawSphereGrid
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    UISystem,
    showMaterialNotif,
    showPickupNotification,
    showTransaction,
    toggleInventory,
    isInventoryOpen,
    updateInventoryUI,
    updateHotbarUI,
    equipItem,
    unequipItem,
    updateAllEquipmentSlots,
    createShopSlot,
    updateCraftingUI,
    updateCharacterStats,
    updatePlayerHUD,
    attachItemTooltip,
    drawSphereGrid
};

export default UISystem;
