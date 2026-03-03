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

function drawSphereGrid() {
    // Sphere grid drawing implementation
    // This would be called when the skills tab is opened
}

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
