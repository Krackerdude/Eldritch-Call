// ═══════════════════════════════════════════════════════════════════════════════
// SHOPSYSTEM.JS - Shop UI, Trading, Buy/Sell Functionality
// Dependencies: DOM elements for shop UI
// Injected: inventory, equipment, hotbarItems, renderer, various UI functions
// Consumers: DialogueSystem, NPC interaction
// ═══════════════════════════════════════════════════════════════════════════════

// Injected dependencies
let _deps = {
    inventory: null,
    equipment: null,
    hotbarItems: null,
    renderer: null,
    showTransaction: null,
    updateHotbarUI: null,
    updateInventoryUI: null,
    updateCharacterStats: null,
    updateAllGoldDisplays: null,
    equipItem: null,
    createShopSlot: null,
    createPlayerShopSlot: null,
    initShopSortTabs: null,
    getMaterialSellPrice: null
};

const ShopSystem = (function() {
    // Private state
    let _isOpen = false;
    let _currentTrader = null;
    let _currentFilter = 'all';
    
    // DOM element cache
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
                closeBtn: document.getElementById('shop-close')
            };
        }
        return _elements;
    }
    
    // Public interface
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
            
            // Setup close button listener
            const els = _getElements();
            if (els.closeBtn) {
                els.closeBtn.addEventListener('click', () => this.close());
            }
        },
        
        // === State Getters ===
        isOpen() { return _isOpen; },
        getCurrentTrader() { return _currentTrader; },
        getFilter() { return _currentFilter; },
        
        // === State Setters ===
        setFilter(filter) { _currentFilter = filter; },
        
        // === Shop Control ===
        open(npc) {
            if (!npc || !npc.data || !npc.data.shopInventory) {
                console.log("No shop inventory for this NPC");
                if (_deps.renderer) _deps.renderer.domElement.requestPointerLock();
                return;
            }
            
            const els = _getElements();
            _currentTrader = npc;
            _isOpen = true;
            
            if (els.crosshair) els.crosshair.classList.add('hidden');
            if (els.overlay) els.overlay.classList.add('open');
            if (els.traderName) els.traderName.textContent = npc.data.name + "'s Wares";
            
            this.renderInventories();
        },
        
        close() {
            const els = _getElements();
            if (els.overlay) els.overlay.classList.remove('open');
            _isOpen = false;
            _currentTrader = null;
            if (els.crosshair) els.crosshair.classList.remove('hidden');
            if (_deps.renderer) _deps.renderer.domElement.requestPointerLock();
        },
        
        // === Inventory Rendering ===
        renderInventories() {
            const els = _getElements();
            const { inventory, createShopSlot, createPlayerShopSlot, initShopSortTabs, getMaterialSellPrice } = _deps;
            
            // Update gold display
            const goldAmount = inventory ? inventory.gold : 0;
            if (els.goldAmount) {
                els.goldAmount.textContent = goldAmount;
            }
            
            if (!els.traderGrid || !_currentTrader) return;
            els.traderGrid.innerHTML = '';
            
            if (createShopSlot) {
                _currentTrader.data.shopInventory.forEach((item, i) => {
                    const slot = createShopSlot(item, 'trader', i);
                    els.traderGrid.appendChild(slot);
                });
            }
            
            if (!els.playerGrid) return;
            els.playerGrid.innerHTML = '';
            
            const sellableItems = [];
            
            // Items from inventory.items
            if (inventory && inventory.items) {
                for (const [key, item] of Object.entries(inventory.items)) {
                    if (item && item.count > 0) {
                        const sellPrice = getMaterialSellPrice ? getMaterialSellPrice(key, item.price) : Math.floor((item.price || 10) * 0.4);
                        sellableItems.push({
                            ...item,
                            id: key,
                            amount: item.count,
                            sellPrice: sellPrice
                        });
                    }
                }
            }
            
            // Items from inventory.materials
            if (inventory && inventory.materials) {
                for (const [key, amount] of Object.entries(inventory.materials)) {
                    if (amount > 0 && !sellableItems.find(s => s.id === key)) {
                        let itemType = 'resource';
                        const classWeapons = ['mace', 'flintlock', 'lance', 'longbow', 'katana', 'staff', 'broadsword', 'dagger'];
                        if (classWeapons.includes(key) || key.startsWith('scroll_')) {
                            itemType = 'weapon';
                        }
                        const sellPrice = getMaterialSellPrice ? getMaterialSellPrice(key) : 5;
                        sellableItems.push({
                            id: key,
                            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                            amount: amount,
                            sellPrice: sellPrice,
                            type: itemType,
                            icon: key
                        });
                    }
                }
            }
            
            // Sort
            sellableItems.sort((a, b) => {
                const typeOrder = { weapon: 0, consumable: 1, tool: 2, resource: 3 };
                const aOrder = typeOrder[a.type] || 3;
                const bOrder = typeOrder[b.type] || 3;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return a.name.localeCompare(b.name);
            });
            
            if (createPlayerShopSlot) {
                sellableItems.forEach((item, i) => {
                    const slot = createPlayerShopSlot(item, i);
                    els.playerGrid.appendChild(slot);
                });
            }
            
            // Fill empty slots
            const emptySlots = Math.max(0, 12 - sellableItems.length);
            for (let i = 0; i < emptySlots; i++) {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'shop-slot player-slot empty';
                els.playerGrid.appendChild(emptySlot);
            }
            
            if (initShopSortTabs) initShopSortTabs();
        },
        
        // === Buy/Sell ===
        buy(item) {
            const { inventory, equipment, hotbarItems, showTransaction, updateHotbarUI, updateCharacterStats, equipItem } = _deps;
            
            if (!inventory) return false;
            
            const currentGold = inventory.gold || 0;
            
            if (currentGold < item.price) {
                if (showTransaction) showTransaction('Not enough gold!', 'error');
                return false;
            }
            
            inventory.gold = currentGold - item.price;
            
            // Update gold display
            const els = _getElements();
            if (els.goldAmount) {
                els.goldAmount.textContent = inventory.gold;
                els.goldAmount.style.transition = 'color 0.3s';
                els.goldAmount.style.color = '#f87171';
                setTimeout(() => { els.goldAmount.style.color = ''; }, 400);
            }
            
            // Store full item data
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
            
            if (!inventory.items[item.id]) {
                inventory.items[item.id] = fullItemData;
            }
            inventory.items[item.id].count++;
            
            // Auto-equip weapons to hotbar
            if (item.type === 'weapon' && hotbarItems) {
                let equipped = false;
                for (let i = 4; i < hotbarItems.length; i++) {
                    if (hotbarItems[i] === null) {
                        hotbarItems[i] = {
                            ...fullItemData, id: item.id,
                            effectiveness: { creature: 1.0, tree: 0.2, rock: 0.1 }
                        };
                        equipped = true;
                        if (updateHotbarUI) updateHotbarUI();
                        if (showTransaction) showTransaction('Bought & Equipped ' + item.name + '!', 'buy');
                        break;
                    }
                }
                if (!equipped && showTransaction) showTransaction('Bought ' + item.name + '!', 'buy');
            } else if (item.type === 'armor' && equipment) {
                const slot = item.slot;
                if (slot && !equipment[slot] && equipItem) {
                    equipItem(item.id);
                    if (showTransaction) showTransaction('Bought & Equipped ' + item.name + '!', 'buy');
                } else {
                    if (showTransaction) showTransaction('Bought ' + item.name + '!', 'buy');
                }
            } else {
                if (showTransaction) showTransaction('Bought ' + item.name + '!', 'buy');
            }
            
            setTimeout(() => this.renderInventories(), 10);
            if (updateCharacterStats) updateCharacterStats();
            return true;
        },
        
        sell(item) {
            const { inventory, showTransaction, updateAllGoldDisplays, updateInventoryUI, updateCharacterStats } = _deps;
            
            if (!inventory) return false;
            
            let sold = false;
            
            if (inventory.materials && inventory.materials[item.id] > 0) {
                inventory.materials[item.id]--;
                sold = true;
            } else if (inventory.items && inventory.items[item.id] && inventory.items[item.id].count > 0) {
                inventory.items[item.id].count--;
                if (inventory.items[item.id].count <= 0) {
                    delete inventory.items[item.id];
                }
                sold = true;
            }
            
            if (sold) {
                inventory.gold = (inventory.gold || 0) + item.sellPrice;
                if (showTransaction) showTransaction('Sold ' + item.name + ' for ' + item.sellPrice + 'g!', 'sell');
                if (updateAllGoldDisplays) updateAllGoldDisplays();
                this.renderInventories();
                if (updateInventoryUI) updateInventoryUI();
                if (updateCharacterStats) updateCharacterStats();
            }
            
            return sold;
        },
        
        // === Filter ===
        applyFilter() {
            const slots = document.querySelectorAll('#shop-trader-inventory .shop-slot');
            slots.forEach(slot => {
                const itemType = slot.dataset.itemType || 'weapon';
                const shouldShow = _currentFilter === 'all' || itemType === _currentFilter;
                slot.style.display = shouldShow ? '' : 'none';
            });
        }
    };
})();

// Backward compatibility wrapper
function openShop(npc) {
    ShopSystem.open(npc);
}

function closeShop() {
    ShopSystem.close();
}

export { 
    ShopSystem,
    openShop,
    closeShop
};
export default ShopSystem;
