// ═══════════════════════════════════════════════════════════════════════════════
// SHOPSYSTEM.JS - Self-Contained Shop UI, Trading, Buy/Sell Functionality
// Dependencies: DOM elements for shop UI
// Injected: InventorySystem, UISystem, SHOP_ICONS, itemIcons, renderer
// Consumers: DialogueSystem (opens shop), NPC interaction, main.js (Escape key)
// ═══════════════════════════════════════════════════════════════════════════════

// Injected dependencies
let _deps = {
    InventorySystem: null,
    UISystem: null,
    SHOP_ICONS: {},
    itemIcons: {},
    renderer: null
};

const ShopSystem = (function() {
    // === Private State ===
    let _isOpen = false;
    let _currentTrader = null;
    let _traderFilter = 'all';    // Active filter for trader inventory
    let _playerFilter = 'all';    // Active filter for player inventory

    // === DOM Element Cache ===
    let _elements = null;

    function _getElements() {
        if (!_elements) {
            _elements = {
                overlay: document.getElementById('shop-overlay'),
                traderName: document.getElementById('shop-trader-name'),
                traderGrid: document.getElementById('shop-trader-inventory'),
                playerGrid: document.getElementById('shop-player-inventory'),
                goldAmount: document.getElementById('shop-gold-amount'),
                crosshair: document.getElementById('crosshair'),
                closeBtn: document.getElementById('shop-close'),
                traderSortBar: document.getElementById('shop-sort-bar'),
                playerSortBar: document.getElementById('shop-player-sort-bar')
            };
        }
        return _elements;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SELL PRICE LOOKUP
    // ═══════════════════════════════════════════════════════════════════════════

    const _sellPrices = {
        // Gathered materials
        wood: 2, stone: 3, crystal: 15, leaves: 1, ore: 8, herb: 5,
        fiber: 2, gold: 50, gem: 25, iron: 5, coal: 4, leather: 6,
        planks: 5, rope: 5, ironIngot: 12,
        // Weapons (sell for roughly half buy price)
        mace: 60, flintlock: 110, lance: 100, longbow: 80,
        katana: 125, staff: 75, broadsword: 90, dagger: 40,
        // Scrolls
        scroll_fire: 40, scroll_ice: 40,
        // Consumables (sell for roughly 1/3 buy price)
        bread: 2, ale: 3, stew: 5,
        potion: 15, potion_health: 17, potion_stamina: 13, mana_potion: 20,
        // Tools
        torch: 3, pickaxe: 15, betterAxe: 25, betterPick: 25
    };

    function _getSellPrice(materialId, itemPrice) {
        if (_sellPrices[materialId]) return _sellPrices[materialId];
        if (itemPrice) return Math.floor(itemPrice / 2);
        return 1;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ICON HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    // Fallback SVG icons for gathered materials not in SHOP_ICONS
    const _fallbackIcons = {
        wood:    '<svg viewBox="0 0 32 32"><rect x="10" y="6" width="12" height="20" fill="#8B4513"/></svg>',
        stone:   '<svg viewBox="0 0 32 32"><polygon points="16,4 28,14 24,28 8,28 4,14" fill="#708090"/></svg>',
        crystal: '<svg viewBox="0 0 32 32"><polygon points="16,2 24,12 20,30 12,30 8,12" fill="#87CEEB"/></svg>',
        leaves:  '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="10" ry="6" fill="#228B22" transform="rotate(-30 16 16)"/></svg>',
        ore:     '<svg viewBox="0 0 32 32"><polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="#4a4a4a"/></svg>',
        iron:    '<svg viewBox="0 0 32 32"><polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="#4a4a4a"/></svg>',
        herb:    '<svg viewBox="0 0 32 32"><path d="M16 28V12M12 16Q16 8 16 8Q16 8 20 16" stroke="#228B22" fill="none" stroke-width="3"/><circle cx="16" cy="8" r="3" fill="#90EE90"/></svg>',
        fiber:   '<svg viewBox="0 0 32 32"><path d="M8 24Q12 16 16 24Q20 16 24 24" stroke="#8B7355" fill="none" stroke-width="2"/><path d="M10 20Q14 12 16 20Q18 12 22 20" stroke="#A0826D" fill="none" stroke-width="2"/></svg>',
        gold:    '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#FFD700"/><circle cx="16" cy="16" r="6" fill="#FFA500"/><text x="16" y="20" text-anchor="middle" font-size="10" fill="#8B4513">G</text></svg>',
        gem:     '<svg viewBox="0 0 32 32"><polygon points="16,4 24,12 20,28 12,28 8,12" fill="#9932CC"/><polygon points="16,8 20,12 18,20 14,20 12,12" fill="#DDA0DD"/></svg>',
        coal:    '<svg viewBox="0 0 32 32"><polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="#2a2a2a"/></svg>',
        leather: '<svg viewBox="0 0 32 32"><rect x="8" y="8" width="16" height="16" rx="3" fill="#8B4513"/><rect x="11" y="11" width="10" height="10" rx="2" fill="#A0522D"/></svg>',
        planks:  '<svg viewBox="0 0 32 32"><rect x="6" y="8" width="20" height="5" fill="#C19A6B"/><rect x="6" y="15" width="20" height="5" fill="#A0826D"/><rect x="6" y="22" width="20" height="5" fill="#C19A6B"/></svg>',
        rope:    '<svg viewBox="0 0 32 32"><path d="M10 6Q16 12 10 18Q16 24 10 28" stroke="#8B7355" fill="none" stroke-width="3"/><path d="M22 6Q16 12 22 18Q16 24 22 28" stroke="#A0826D" fill="none" stroke-width="3"/></svg>',
        ironIngot: '<svg viewBox="0 0 32 32"><polygon points="8,20 16,14 24,20 16,26" fill="#808080"/><polygon points="8,20 16,14 16,26" fill="#696969"/></svg>'
    };

    function _getIcon(materialId) {
        const icons = _deps.SHOP_ICONS || {};
        const itemIcons = _deps.itemIcons || {};
        return icons[materialId] || itemIcons[materialId] || _fallbackIcons[materialId] || _fallbackIcons.stone;
    }

    function _getTraderIcon(item) {
        const icons = _deps.SHOP_ICONS || {};
        const itemIcons = _deps.itemIcons || {};
        const iconKey = item.icon || item.id;
        return icons[iconKey] || icons[item.id] || itemIcons[iconKey] || itemIcons[item.id] || icons.sword || _fallbackIcons.stone;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SLOT CREATION
    // ═══════════════════════════════════════════════════════════════════════════

    // Create a trader-side shop slot (items for sale)
    function _createTraderSlot(item, index) {
        const slot = document.createElement('div');
        const itemType = item.class ? 'weapon' : (item.type || 'weapon');
        slot.className = 'shop-slot type-' + itemType;
        slot.dataset.itemType = itemType;
        slot.dataset.itemId = item.id;
        slot.style.animationDelay = (index * 0.05) + 's';

        const iconSvg = _getTraderIcon(item);

        slot.innerHTML = `
            <div class="type-glow"></div>
            <div class="item-icon">${iconSvg}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-price">${item.price}g</div>
            ${item.class ? '<div class="item-class">' + item.class + '</div>' : ''}
        `;

        slot.addEventListener('click', () => _buyItem(item));

        // Tooltip if UISystem provides it
        if (_deps.UISystem && _deps.UISystem.attachItemTooltip) {
            _deps.UISystem.attachItemTooltip(slot, item, 1);
        }

        return slot;
    }

    // Create a player-side shop slot (items to sell)
    function _createPlayerSlot(item, index) {
        const slot = document.createElement('div');
        const itemType = item.type || 'resource';
        slot.className = 'shop-slot player-slot type-' + itemType;
        slot.dataset.itemType = itemType;
        slot.dataset.itemId = item.id;
        slot.style.animationDelay = (index * 0.05) + 's';

        const icon = _getIcon(item.icon || item.id);

        slot.innerHTML = `
            <div class="type-glow"></div>
            <div class="item-icon">${icon}</div>
            <div class="item-name">${item.name} (${item.amount})</div>
            <div class="item-price">${item.sellPrice}g</div>
        `;

        slot.addEventListener('click', () => _sellItem(item));

        // Tooltip with stack count
        if (_deps.UISystem && _deps.UISystem.attachItemTooltip) {
            _deps.UISystem.attachItemTooltip(slot, { ...item, price: item.sellPrice }, item.amount);
        }

        return slot;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SORT TAB LOGIC
    // ═══════════════════════════════════════════════════════════════════════════

    function _initSortTabs() {
        // Trader sort tabs
        const traderBtns = document.querySelectorAll('#shop-sort-bar .sort-btn');
        traderBtns.forEach(btn => {
            btn.onclick = () => {
                traderBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _traderFilter = btn.dataset.filter;
                _applyTraderFilter();
            };
        });

        // Player sort tabs
        const playerBtns = document.querySelectorAll('#shop-player-sort-bar .sort-btn');
        playerBtns.forEach(btn => {
            btn.onclick = () => {
                playerBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                _playerFilter = btn.dataset.filter;
                _applyPlayerFilter();
            };
        });
    }

    function _applyTraderFilter() {
        const slots = document.querySelectorAll('#shop-trader-inventory .shop-slot');
        slots.forEach(slot => {
            const itemType = slot.dataset.itemType || 'weapon';
            slot.style.display = (_traderFilter === 'all' || itemType === _traderFilter) ? '' : 'none';
        });
    }

    function _applyPlayerFilter() {
        const slots = document.querySelectorAll('#shop-player-inventory .shop-slot');
        slots.forEach(slot => {
            const itemType = slot.dataset.itemType || 'resource';
            slot.style.display = (_playerFilter === 'all' || itemType === _playerFilter) ? '' : 'none';
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GOLD DISPLAY
    // ═══════════════════════════════════════════════════════════════════════════

    function _updateGoldDisplay() {
        const inv = _deps.InventorySystem;
        if (!inv) return;

        const goldAmount = inv.gold || 0;
        const els = _getElements();
        if (els.goldAmount) els.goldAmount.textContent = goldAmount;

        // Also update inventory-side gold display if present
        const invGold = document.getElementById('inv-gold-amount');
        if (invGold) invGold.textContent = goldAmount;
    }

    function _flashGold(color) {
        const els = _getElements();
        if (!els.goldAmount) return;
        els.goldAmount.style.transition = 'color 0.3s';
        els.goldAmount.style.color = color;
        setTimeout(() => { els.goldAmount.style.color = ''; }, 400);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSACTION FEEDBACK
    // ═══════════════════════════════════════════════════════════════════════════

    function _showTransaction(message, type) {
        if (_deps.UISystem && _deps.UISystem.showTransaction) {
            _deps.UISystem.showTransaction(message, type);
        } else {
            // Inline fallback
            const flash = document.createElement('div');
            flash.className = 'transaction-flash ' + type;
            flash.textContent = message;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 800);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUY / SELL CORE LOGIC
    // ═══════════════════════════════════════════════════════════════════════════

    function _buyItem(item) {
        const inv = _deps.InventorySystem;
        if (!inv) return false;

        const currentGold = inv.gold || 0;

        // Gold check
        if (currentGold < item.price) {
            _showTransaction('Not enough gold!', 'error');
            return false;
        }

        // Deduct gold
        inv.gold = currentGold - item.price;
        _flashGold('#f87171');

        // Build full item data for storage
        const fullItemData = {
            name: item.name, count: 0, type: item.type || 'resource',
            icon: item.icon || item.id, desc: item.desc || '', price: item.price,
            level: item.level, damage: item.damage, attackSpeed: item.attackSpeed,
            class: item.class, slot: item.slot, armorClass: item.armorClass,
            defense: item.defense, physRes: item.physRes, fireRes: item.fireRes,
            iceRes: item.iceRes, lightRes: item.lightRes, shadowRes: item.shadowRes,
            strength: item.strength, dexterity: item.dexterity, constitution: item.constitution,
            intelligence: item.intelligence, wisdom: item.wisdom, charisma: item.charisma,
            bonusHp: item.bonusHp, bonusMp: item.bonusMp, bonusStamina: item.bonusStamina,
            attack: item.attack, critChance: item.critChance, grantsSpell: item.grantsSpell,
            healing: item.healing, mana: item.mana, stamina: item.stamina
        };

        // Add to player inventory
        if (!inv.items[item.id]) {
            inv.items[item.id] = fullItemData;
        }
        inv.items[item.id].count++;

        // Auto-equip weapons to first empty hotbar slot (slots 4-8)
        if (item.type === 'weapon') {
            let equipped = false;
            const hotbar = inv.getHotbarItems();
            for (let i = 4; i < hotbar.length; i++) {
                if (hotbar[i] === null) {
                    inv.setHotbarItem(i, {
                        ...fullItemData, id: item.id,
                        effectiveness: { creature: 1.0, tree: 0.2, rock: 0.1 }
                    });
                    equipped = true;
                    if (_deps.UISystem) _deps.UISystem.updateHotbarUI();
                    _showTransaction('Bought & Equipped ' + item.name + '!', 'buy');
                    break;
                }
            }
            if (!equipped) _showTransaction('Bought ' + item.name + '!', 'buy');
        } else if (item.type === 'armor') {
            const slot = item.slot;
            if (slot && !inv.getEquipmentSlot(slot)) {
                if (_deps.UISystem) _deps.UISystem.equipItem(item.id);
                _showTransaction('Bought & Equipped ' + item.name + '!', 'buy');
            } else {
                _showTransaction('Bought ' + item.name + '!', 'buy');
            }
        } else {
            _showTransaction('Bought ' + item.name + '!', 'buy');
        }

        // Re-render after a tick to let DOM settle
        setTimeout(() => _publicAPI.renderInventories(), 10);
        if (_deps.UISystem) _deps.UISystem.updateCharacterStats();
        return true;
    }

    function _sellItem(item) {
        const inv = _deps.InventorySystem;
        if (!inv) return false;

        let sold = false;

        // Try materials first, then items
        if (inv.materials && inv.materials[item.id] > 0) {
            inv.materials[item.id]--;
            sold = true;
        } else if (inv.items && inv.items[item.id] && inv.items[item.id].count > 0) {
            inv.items[item.id].count--;
            if (inv.items[item.id].count <= 0) {
                delete inv.items[item.id];
            }
            sold = true;
        }

        if (sold) {
            inv.gold = (inv.gold || 0) + item.sellPrice;
            _showTransaction('Sold ' + item.name + ' for ' + item.sellPrice + 'g!', 'sell');
            _updateGoldDisplay();
            _publicAPI.renderInventories();
            if (_deps.UISystem) {
                _deps.UISystem.updateInventoryUI();
                _deps.UISystem.updateCharacterStats();
            }
        }

        return sold;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INVENTORY GATHERING (collects sellable items from player)
    // ═══════════════════════════════════════════════════════════════════════════

    function _gatherSellableItems() {
        const inv = _deps.InventorySystem;
        if (!inv) return [];

        const sellableItems = [];
        const classWeapons = ['mace', 'flintlock', 'lance', 'longbow', 'katana', 'staff', 'broadsword', 'dagger'];

        // Structured items (from inventory.items)
        if (inv.items) {
            for (const [key, item] of Object.entries(inv.items)) {
                if (item && item.count > 0) {
                    sellableItems.push({
                        ...item,
                        id: key,
                        amount: item.count,
                        sellPrice: _getSellPrice(key, item.price)
                    });
                }
            }
        }

        // Raw materials (from inventory.materials — wood, stone, etc.)
        if (inv.materials) {
            for (const [key, amount] of Object.entries(inv.materials)) {
                if (amount > 0 && !sellableItems.find(s => s.id === key)) {
                    let itemType = 'resource';
                    if (classWeapons.includes(key) || key.startsWith('scroll_')) {
                        itemType = 'weapon';
                    }
                    sellableItems.push({
                        id: key,
                        name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                        amount: amount,
                        sellPrice: _getSellPrice(key),
                        type: itemType,
                        icon: key
                    });
                }
            }
        }

        // Sort: weapons first, then consumables, tools, resources
        const typeOrder = { weapon: 0, consumable: 1, tool: 2, resource: 3 };
        sellableItems.sort((a, b) => {
            const aOrd = typeOrder[a.type] ?? 3;
            const bOrd = typeOrder[b.type] ?? 3;
            if (aOrd !== bOrd) return aOrd - bOrd;
            return a.name.localeCompare(b.name);
        });

        return sellableItems;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════════

    const _publicAPI = {
        init(deps) {
            Object.assign(_deps, deps);

            // Bind close button
            const els = _getElements();
            if (els.closeBtn) {
                els.closeBtn.addEventListener('click', () => this.close());
            }
        },

        // === State Getters ===
        isOpen() { return _isOpen; },
        getCurrentTrader() { return _currentTrader; },

        // === Open the shop for a given NPC ===
        open(npc) {
            if (!npc || !npc.data || !npc.data.shopInventory) {
                console.log('No shop inventory for this NPC');
                if (_deps.renderer) _deps.renderer.domElement.requestPointerLock();
                return;
            }

            const els = _getElements();
            _currentTrader = npc;
            _isOpen = true;

            // Reset filters when opening
            _traderFilter = 'all';
            _playerFilter = 'all';

            // Hide crosshair, show overlay
            if (els.crosshair) els.crosshair.classList.add('hidden');
            if (els.overlay) els.overlay.classList.add('open');
            if (els.traderName) els.traderName.textContent = npc.data.name + "'s Wares";

            // Reset active tab states
            if (els.traderSortBar) {
                els.traderSortBar.querySelectorAll('.sort-btn').forEach((btn, i) => {
                    btn.classList.toggle('active', i === 0);
                });
            }
            if (els.playerSortBar) {
                els.playerSortBar.querySelectorAll('.sort-btn').forEach((btn, i) => {
                    btn.classList.toggle('active', i === 0);
                });
            }

            this.renderInventories();
        },

        // === Close the shop ===
        close() {
            const els = _getElements();
            if (els.overlay) els.overlay.classList.remove('open');
            _isOpen = false;
            _currentTrader = null;
            if (els.crosshair) els.crosshair.classList.remove('hidden');
            if (_deps.renderer) _deps.renderer.domElement.requestPointerLock();
        },

        // === Full re-render of both panels ===
        renderInventories() {
            const els = _getElements();

            // Update gold
            _updateGoldDisplay();

            // --- Trader side ---
            if (els.traderGrid && _currentTrader) {
                els.traderGrid.innerHTML = '';
                _currentTrader.data.shopInventory.forEach((item, i) => {
                    els.traderGrid.appendChild(_createTraderSlot(item, i));
                });
            }

            // --- Player side ---
            if (els.playerGrid) {
                els.playerGrid.innerHTML = '';
                const sellableItems = _gatherSellableItems();

                sellableItems.forEach((item, i) => {
                    els.playerGrid.appendChild(_createPlayerSlot(item, i));
                });

                // Fill empty slots so the grid doesn't look barren
                const emptyCount = Math.max(0, 12 - sellableItems.length);
                for (let i = 0; i < emptyCount; i++) {
                    const empty = document.createElement('div');
                    empty.className = 'shop-slot player-slot empty';
                    els.playerGrid.appendChild(empty);
                }
            }

            // Re-bind sort tabs and apply current filters
            _initSortTabs();
            _applyTraderFilter();
            _applyPlayerFilter();
        }
    };

    return _publicAPI;
})();

// Legacy wrappers for backward compat
function openShop(npc) { ShopSystem.open(npc); }
function closeShop() { ShopSystem.close(); }

export {
    ShopSystem,
    openShop,
    closeShop
};
export default ShopSystem;
