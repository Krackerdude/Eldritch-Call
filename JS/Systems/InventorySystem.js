// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORYSYSTEM.JS - Items, Equipment, Currency, Stats, and Hotbar Management
// Dependencies: itemIcons (for notification display)
// Injected: CONFIG (for weapon damage values), updateInventoryUI, updateQuestProgress
// Consumers: ShopSystem, CombatSystem, CraftingSystem, UI rendering
// ═══════════════════════════════════════════════════════════════════════════════

// Injected dependencies
let _deps = {
    CONFIG: { handDamage: 5, pickaxeDamage: 8, axeDamage: 10, swordDamage: 15 },
    itemIcons: {},
    updateInventoryUI: null,
    updateQuestProgress: null
};

const InventorySystem = (function() {
    // === Private State: Items & Resources ===
    const _items = {
        wood: { count: 0, icon: "wood", name: "Wood", maxStack: 99, type: "resource" },
        stone: { count: 0, icon: "stone", name: "Stone", maxStack: 99, type: "resource" },
        fiber: { count: 0, icon: "fiber", name: "Fiber", maxStack: 99, type: "resource" },
        iron: { count: 0, icon: "iron", name: "Iron Ore", maxStack: 99, type: "resource" },
        coal: { count: 0, icon: "coal", name: "Coal", maxStack: 99, type: "resource" },
        leather: { count: 0, icon: "leather", name: "Leather", maxStack: 99, type: "resource" },
        planks: { count: 0, icon: "planks", name: "Planks", maxStack: 99, type: "crafted" },
        rope: { count: 0, icon: "rope", name: "Rope", maxStack: 99, type: "crafted" },
        ironIngot: { count: 0, icon: "ironIngot", name: "Iron Ingot", maxStack: 99, type: "crafted" },
        torch: { count: 0, icon: "torch", name: "Torch", maxStack: 20, type: "tool" },
        betterAxe: { count: 0, icon: "betterAxe", name: "Iron Axe", maxStack: 1, type: "tool" },
        betterPick: { count: 0, icon: "betterPick", name: "Iron Pickaxe", maxStack: 1, type: "tool" }
    };
    
    const _materials = {
        wood: 10, stone: 5, crystal: 0, leaves: 0, ore: 0, herb: 0, fiber: 3
    };
    
    // === Private State: Currency & Progression ===
    let _gold = 500;
    let _skillPoints = 5;
    let _level = 1;
    let _xp = 0;
    let _xpToNext = 100;
    
    // === Private State: Equipment ===
    const _equipment = {
        helmet: null,
        pauldrons: null,
        necklace: null,
        chestpiece: null,
        ring1: null,
        ring2: null,
        belt: null,
        trinket: null,
        greaves: null,
        boots: null,
        weapon: null
    };
    
    let _equipmentGrantedSpells = [];
    
    // === Private State: Hotbar ===
    let _hotbarItems = null;
    
    function _initHotbar() {
        if (_hotbarItems) return;
        const CONFIG = _deps.CONFIG;
        _hotbarItems = [
            { id: "hand", name: "Hand", icon: "H", damage: CONFIG.handDamage || 5, type: "hand", effectiveness: {} },
            { id: "pickaxe", name: "Pickaxe", icon: "P", damage: CONFIG.pickaxeDamage || 8, type: "tool", effectiveness: { rock: 1.0, tree: 0.3 } },
            { id: "axe", name: "Axe", icon: "A", damage: CONFIG.axeDamage || 10, type: "tool", effectiveness: { tree: 1.0, rock: 0.2 } },
            { id: "sword", name: "Sword", icon: "S", damage: CONFIG.swordDamage || 15, type: "weapon", effectiveness: { creature: 1.0, tree: 0.1, rock: 0.1 } },
            null, null, null, null, null
        ];
    }
    
    let _selectedSlot = 0;
    
    // === Private State: Character Stats ===
    const _baseStats = {
        strength: 10, dexterity: 10, constitution: 10,
        intelligence: 10, wisdom: 10, charisma: 10,
        maxHp: 100, maxMp: 50, maxStamina: 100,
        attack: 5, defense: 2, critChance: 5,
        physRes: 0, fireRes: 0, iceRes: 0, lightRes: 0, shadowRes: 0
    };
    
    const _characterStats = {
        name: 'Wanderer', class: 'Adventurer',
        strength: 10, dexterity: 10, constitution: 10,
        intelligence: 10, wisdom: 10, charisma: 10,
        maxHp: 100, hp: 100, maxMp: 50, mp: 50,
        maxStamina: 100, stamina: 100,
        attack: 5, defense: 2, critChance: 5,
        physRes: 0, fireRes: 0, iceRes: 0, lightRes: 0, shadowRes: 0
    };
    
    // === Private State: UI ===
    let _isOpen = false;
    let _currentFilter = 'all';
    
    // === Private State: Spells ===
    const _knownSpells = {
        combat: [], magic: [], survival: [], utility: []
    };
    
    // === Private Helper: Show notification ===
    function _showNotification(itemId, amount) {
        const item = _items[itemId];
        if (!item) return;
        
        const popup = document.getElementById('material-popup');
        if (!popup) return;
        
        const notif = document.createElement('div');
        notif.className = 'mat-notif';
        const iconSvg = _deps.itemIcons[item.icon] || _deps.itemIcons[itemId] || '';
        notif.innerHTML = `<span class="mat-icon">${iconSvg}</span><span class="mat-amount">+${amount}</span> ${item.name}`;
        popup.appendChild(notif);
        
        // Add XP and gold for gathering
        _xp += 2;
        _gold += Math.floor(Math.random() * 3);
        if (_xp >= _xpToNext) {
            _level++;
            _xp -= _xpToNext;
            _xpToNext = Math.floor(_xpToNext * 1.5);
        }
        
        setTimeout(() => notif.classList.add('show'), 10);
        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 300);
        }, 2000);
    }
    
    // === Private Helper: Calculate equipment bonuses ===
    function _calculateEquipmentBonuses() {
        // Reset to base stats
        Object.keys(_baseStats).forEach(key => {
            _characterStats[key] = _baseStats[key];
        });
        
        _equipmentGrantedSpells = [];
        
        // Add bonuses from each equipped item
        Object.values(_equipment).forEach(item => {
            if (!item) return;
            
            if (item.defense) _characterStats.defense += item.defense;
            if (item.physRes) _characterStats.physRes += item.physRes;
            if (item.fireRes) _characterStats.fireRes += item.fireRes;
            if (item.iceRes) _characterStats.iceRes += item.iceRes;
            if (item.lightRes) _characterStats.lightRes += item.lightRes;
            if (item.shadowRes) _characterStats.shadowRes += item.shadowRes;
            if (item.strength) _characterStats.strength += item.strength;
            if (item.dexterity) _characterStats.dexterity += item.dexterity;
            if (item.constitution) _characterStats.constitution += item.constitution;
            if (item.intelligence) _characterStats.intelligence += item.intelligence;
            if (item.wisdom) _characterStats.wisdom += item.wisdom;
            if (item.charisma) _characterStats.charisma += item.charisma;
            if (item.bonusHp) _characterStats.maxHp += item.bonusHp;
            if (item.bonusMp) _characterStats.maxMp += item.bonusMp;
            if (item.bonusStamina) _characterStats.maxStamina += item.bonusStamina;
            if (item.attack) _characterStats.attack += item.attack;
            if (item.damage) _characterStats.attack += item.damage;
            if (item.critChance) _characterStats.critChance += item.critChance;
            if (item.grantsSpell) _equipmentGrantedSpells.push(item.grantsSpell);
        });
        
        // Stat derivations
        _characterStats.maxHp += Math.floor((_characterStats.constitution - 10) * 5);
        _characterStats.maxMp += Math.floor((_characterStats.intelligence - 10) * 3);
        _characterStats.critChance += Math.floor((_characterStats.dexterity - 10) * 0.5);
        
        // Cap current values
        _characterStats.hp = Math.min(_characterStats.hp, _characterStats.maxHp);
        _characterStats.mp = Math.min(_characterStats.mp, _characterStats.maxMp);
        _characterStats.stamina = Math.min(_characterStats.stamina, _characterStats.maxStamina);
    }
    
    // === Public Interface ===
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
            _initHotbar();
        },
        
        // === Item Management ===
        add(itemId, amount = 1) {
            if (_items[itemId]) {
                _items[itemId].count = Math.min(_items[itemId].count + amount, _items[itemId].maxStack);
                _showNotification(itemId, amount);
                if (_deps.updateInventoryUI) _deps.updateInventoryUI();
                if (_deps.updateQuestProgress) {
                    _deps.updateQuestProgress('collect', { itemId: itemId, amount: amount });
                }
            } else if (_materials[itemId] !== undefined) {
                _materials[itemId] += amount;
                _showNotification(itemId, amount);
                if (_deps.updateInventoryUI) _deps.updateInventoryUI();
                if (_deps.updateQuestProgress) {
                    _deps.updateQuestProgress('collect', { itemId: itemId, amount: amount });
                }
            }
        },
        
        remove(itemId, amount = 1) {
            if (_items[itemId] && _items[itemId].count >= amount) {
                _items[itemId].count -= amount;
                if (_deps.updateInventoryUI) _deps.updateInventoryUI();
                return true;
            }
            return false;
        },
        
        has(itemId, amount = 1) {
            return _items[itemId] && _items[itemId].count >= amount;
        },
        
        getItem(itemId) {
            return _items[itemId] || null;
        },
        
        setItem(itemId, itemData) {
            _items[itemId] = itemData;
        },
        
        // === Direct Data Access (for backward compat) ===
        get items() { return _items; },
        get materials() { return _materials; },
        
        // === Currency & Progression ===
        get gold() { return _gold; },
        set gold(val) { _gold = val; },
        
        get skillPoints() { return _skillPoints; },
        set skillPoints(val) { _skillPoints = val; },
        
        get level() { return _level; },
        set level(val) { _level = val; },
        
        get xp() { return _xp; },
        set xp(val) { _xp = val; },
        
        get xpToNext() { return _xpToNext; },
        set xpToNext(val) { _xpToNext = val; },
        
        addGold(amount) { _gold += amount; },
        removeGold(amount) { 
            if (_gold >= amount) { _gold -= amount; return true; }
            return false;
        },
        
        addXP(amount) {
            _xp += amount;
            while (_xp >= _xpToNext) {
                _level++;
                _xp -= _xpToNext;
                _xpToNext = Math.floor(_xpToNext * 1.5);
            }
        },
        
        // === Equipment ===
        getEquipment() { return _equipment; },
        getEquipmentSlot(slot) { return _equipment[slot]; },
        
        equip(slot, item) {
            _equipment[slot] = item;
            _calculateEquipmentBonuses();
        },
        
        unequip(slot) {
            const item = _equipment[slot];
            _equipment[slot] = null;
            _calculateEquipmentBonuses();
            return item;
        },
        
        isEquipped(itemId) {
            for (const slot in _equipment) {
                if (_equipment[slot] && _equipment[slot].id === itemId) {
                    return slot;
                }
            }
            return null;
        },
        
        getEquipmentGrantedSpells() { return _equipmentGrantedSpells; },
        calculateBonuses() { _calculateEquipmentBonuses(); },
        
        // === Hotbar ===
        getHotbarItems() { 
            _initHotbar();
            return _hotbarItems; 
        },
        getHotbarItem(index) { 
            _initHotbar();
            return _hotbarItems[index]; 
        },
        setHotbarItem(index, item) { 
            _initHotbar();
            _hotbarItems[index] = item; 
        },
        
        get selectedSlot() { return _selectedSlot; },
        set selectedSlot(val) { 
            _initHotbar();
            _selectedSlot = Math.max(0, Math.min(val, _hotbarItems.length - 1)); 
        },
        
        getSelectedItem() {
            _initHotbar();
            return _hotbarItems[_selectedSlot] || _hotbarItems[0];
        },
        
        // === Character Stats ===
        getStats() { return _characterStats; },
        getBaseStats() { return _baseStats; },
        
        getStat(statName) { return _characterStats[statName]; },
        setStat(statName, value) { _characterStats[statName] = value; },
        
        modifyStat(statName, delta) {
            _characterStats[statName] = Math.max(0, _characterStats[statName] + delta);
            // Cap HP/MP/Stamina to their max
            if (statName === 'hp') _characterStats.hp = Math.min(_characterStats.hp, _characterStats.maxHp);
            if (statName === 'mp') _characterStats.mp = Math.min(_characterStats.mp, _characterStats.maxMp);
            if (statName === 'stamina') _characterStats.stamina = Math.min(_characterStats.stamina, _characterStats.maxStamina);
        },
        
        // === Spells ===
        getKnownSpells() { return _knownSpells; },
        
        unlockSpell(spellId, type) {
            if (!_knownSpells[type].includes(spellId)) {
                _knownSpells[type].push(spellId);
                return true;
            }
            return false;
        },
        
        hasSpell(spellId) {
            return Object.values(_knownSpells).some(arr => arr.includes(spellId));
        },
        
        // === UI State ===
        get isOpen() { return _isOpen; },
        set isOpen(val) { _isOpen = val; },
        
        get filter() { return _currentFilter; },
        set filter(val) { _currentFilter = val; },
        
        toggle() {
            _isOpen = !_isOpen;
            return _isOpen;
        }
    };
})();

// === Backward Compatibility Layer ===
const inventory = {
    get items() { return InventorySystem.items; },
    get materials() { return InventorySystem.materials; },
    get gold() { return InventorySystem.gold; },
    set gold(val) { InventorySystem.gold = val; },
    get skillPoints() { return InventorySystem.skillPoints; },
    set skillPoints(val) { InventorySystem.skillPoints = val; },
    get level() { return InventorySystem.level; },
    set level(val) { InventorySystem.level = val; },
    get xp() { return InventorySystem.xp; },
    set xp(val) { InventorySystem.xp = val; },
    get xpToNext() { return InventorySystem.xpToNext; },
    set xpToNext(val) { InventorySystem.xpToNext = val; },
    add(itemId, amount) { InventorySystem.add(itemId, amount); },
    remove(itemId, amount) { return InventorySystem.remove(itemId, amount); },
    has(itemId, amount) { return InventorySystem.has(itemId, amount); }
};

// Crafting recipes
const craftingRecipes = [
    { id: 'planks', result: 'planks', resultAmount: 4, ingredients: { wood: 1 }, name: 'Planks', desc: 'Basic building material', type: 'buildable' },
    { id: 'rope', result: 'rope', resultAmount: 1, ingredients: { fiber: 3 }, name: 'Rope', desc: 'Useful for crafting', type: 'resource' },
    { id: 'torch', result: 'torch', resultAmount: 4, ingredients: { wood: 1, coal: 1 }, name: 'Torch', desc: 'Light up the darkness', type: 'consumable' },
    { id: 'ironIngot', result: 'ironIngot', resultAmount: 1, ingredients: { iron: 2, coal: 1 }, name: 'Iron Ingot', desc: 'Refined iron for tools', type: 'resource' },
    { id: 'betterAxe', result: 'betterAxe', resultAmount: 1, ingredients: { ironIngot: 3, planks: 2 }, name: 'Iron Axe', desc: 'Chops trees faster', type: 'tool' },
    { id: 'betterPick', result: 'betterPick', resultAmount: 1, ingredients: { ironIngot: 3, planks: 2 }, name: 'Iron Pickaxe', desc: 'Mines rocks faster', type: 'tool' },
    { id: 'campfire', result: 'campfire', resultAmount: 1, ingredients: { wood: 5, stone: 8 }, name: 'Campfire', desc: 'Warmth and cooking', type: 'buildable' },
    { id: 'workbench', result: 'workbench', resultAmount: 1, ingredients: { planks: 10, stone: 5 }, name: 'Workbench', desc: 'Advanced crafting', type: 'buildable' }
];

export { 
    InventorySystem, 
    inventory,
    craftingRecipes
};
export default InventorySystem;
