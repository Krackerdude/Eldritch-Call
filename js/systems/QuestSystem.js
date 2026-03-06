// ═══════════════════════════════════════════════════════════════════════════════
// QUESTSYSTEM.JS - Quest Generation, Tracking, Progress, and Rewards
// Dependencies: THREE.js (for quest markers)
// Injected: npcList, biomeNPCList, loreBookData, inventory, NPC_DATA, BUILDING_NPCS
// Consumers: DialogueSystem, NPC interaction, LoreBookSystem, animate loop
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    npcList: [],
    biomeNPCList: [],
    loreBookData: null,
    inventory: null,        // InventorySystem — has .gold, .items, .materials, .add(), .addXP()
    NPC_DATA: {},
    LoreBookSystem: null,   // For checking isOpen() state
    addThought: null,
    showTransaction: null,
    updateInventoryUI: null,
    renderQuests: null
};

// Quest type constants
const QUEST_TYPES = {
    FETCH: 'fetch',
    KILL: 'kill',
    EXPLORE: 'explore',
    DELIVER: 'deliver',
    CRAFT: 'craft',
    TALK: 'talk',
    VISIT: 'visit'
};

// Quest difficulty settings
const QUEST_DIFFICULTY = {
    EASY: { gold: [10, 30], exp: [25, 50], label: 'Easy' },
    MEDIUM: { gold: [30, 80], exp: [50, 100], label: 'Medium' },
    HARD: { gold: [80, 200], exp: [100, 250], label: 'Hard' },
    EPIC: { gold: [200, 500], exp: [250, 500], label: 'Epic' }
};

// Quest templates by NPC type
const QUEST_TEMPLATES = {
    merchant: [
        { type: QUEST_TYPES.FETCH, name: 'Supply Run', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'collect', items: ['wood'], amounts: [15, 25] }],
          description: 'The shop is running low on supplies. Could you gather some materials from the forest?' },
        { type: QUEST_TYPES.FETCH, name: 'Rare Ingredients', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'collect', items: ['herb', 'fiber'], amounts: [5, 10] }],
          description: 'A customer has placed a special order. I need some harder-to-find materials.' },
        { type: QUEST_TYPES.DELIVER, name: 'Special Delivery', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'talkTo', npc: 'any' }],
          description: 'I have a package that needs delivering. Would you be so kind?' }
    ],
    weaponsmith: [
        { type: QUEST_TYPES.FETCH, name: 'Iron for the Forge', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'collect', items: ['ore'], amounts: [10, 20] }],
          description: 'My forge burns hot but the ore runs low. Bring me iron from the mines.' },
        { type: QUEST_TYPES.KILL, name: 'Test the Blade', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'kill', targets: ['enemy'], count: [5, 10] }],
          description: 'I need someone to test my latest creation in real combat. Prove its worth!' },
        { type: QUEST_TYPES.FETCH, name: 'Ancient Metal', difficulty: 'HARD', questType: 'main',
          objectives: [{ type: 'collect', items: ['crystal', 'ore'], amounts: [3, 8] }],
          description: 'Legend speaks of Void-touched ore in the deep places. Bring me some, and I shall forge something legendary.' }
    ],
    armorsmith: [
        { type: QUEST_TYPES.FETCH, name: 'Leather and Fiber', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'collect', items: ['fiber'], amounts: [10, 15] }],
          description: 'Good armor needs good materials. Bring me fiber for padding.' },
        { type: QUEST_TYPES.CRAFT, name: 'Apprentice Task', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'craft', item: 'planks', count: [10, 20] }],
          description: 'Show me you understand craftsmanship. Create some basic materials.' },
        { type: QUEST_TYPES.FETCH, name: 'Dragon Scale Rumor', difficulty: 'EPIC', questType: 'main',
          objectives: [{ type: 'collect', items: ['crystal'], amounts: [5, 10] }],
          description: 'Rumors tell of crystallized dragon scales in the mountains. Find them, and I will craft armor fit for legends.' }
    ],
    mage: [
        { type: QUEST_TYPES.FETCH, name: 'Crystal Harvesting', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'collect', items: ['crystal'], amounts: [3, 6] }],
          description: 'Magical research requires mana crystals. The forest glades sometimes hold them.' },
        { type: QUEST_TYPES.VISIT, name: 'Ley Line Survey', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'visit', location: 'poi' }],
          description: 'I sense a disturbance in the ley lines. Investigate the ancient sites nearby.' },
        { type: QUEST_TYPES.KILL, name: 'Corrupted Creatures', difficulty: 'HARD', questType: 'main',
          objectives: [{ type: 'kill', targets: ['enemy'], count: [8, 15] }],
          description: 'Dark magic has twisted the creatures of the wild. Purge them before the corruption spreads.' }
    ],
    temple: [
        { type: QUEST_TYPES.FETCH, name: 'Sacred Herbs', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'collect', items: ['herb'], amounts: [5, 10] }],
          description: 'The temple needs herbs for healing salves. The faithful depend on us.' },
        { type: QUEST_TYPES.VISIT, name: 'Blessing the Land', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'visit', location: 'poi' }],
          description: 'Ancient shrines need consecration. Visit them and speak the old prayers.' },
        { type: QUEST_TYPES.KILL, name: 'Cleansing Darkness', difficulty: 'HARD', questType: 'main',
          objectives: [{ type: 'kill', targets: ['enemy'], count: [10, 20] }],
          description: 'Shadow creatures defile the sacred groves. The Ancients call for their destruction.' }
    ],
    fighter: [
        { type: QUEST_TYPES.KILL, name: 'Proving Grounds', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'kill', targets: ['enemy'], count: [3, 5] }],
          description: 'Every warrior must prove themselves. Hunt down some beasts and show your mettle.' },
        { type: QUEST_TYPES.KILL, name: 'Monster Contract', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'kill', targets: ['enemy'], count: [8, 12] }],
          description: 'The guild has received reports of increased monster activity. Deal with them.' },
        { type: QUEST_TYPES.KILL, name: 'Champion\'s Trial', difficulty: 'HARD', questType: 'main',
          objectives: [{ type: 'kill', targets: ['enemy'], count: [15, 25] }],
          description: 'To become a true champion, you must face overwhelming odds. Are you ready?' }
    ],
    tavern: [
        { type: QUEST_TYPES.TALK, name: 'Rumor Mill', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'talkTo', npc: 'any' }],
          description: 'Information is currency. Talk to the locals and learn what you can.' },
        { type: QUEST_TYPES.FETCH, name: 'Brewing Supplies', difficulty: 'EASY', questType: 'side',
          objectives: [{ type: 'collect', items: ['herb', 'wood'], amounts: [3, 5] }],
          description: 'The tavern needs supplies for the evening rush. Help me out?' },
        { type: QUEST_TYPES.DELIVER, name: 'Lost Heirloom', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'talkTo', npc: 'any' }],
          description: 'A traveler left behind a valuable item. Find them and return it.' }
    ],
    wanderer: [
        { type: QUEST_TYPES.EXPLORE, name: 'Ancient Knowledge', difficulty: 'MEDIUM', questType: 'main',
          objectives: [{ type: 'visit', location: 'poi' }],
          description: 'The old places hold secrets. Explore them and bring back what you learn.' },
        { type: QUEST_TYPES.FETCH, name: 'Reagent Collection', difficulty: 'MEDIUM', questType: 'side',
          objectives: [{ type: 'collect', items: ['crystal', 'herb'], amounts: [2, 4] }],
          description: 'My rituals require rare components. Can you gather them?' },
        { type: QUEST_TYPES.VISIT, name: 'The Forgotten Path', difficulty: 'HARD', questType: 'main',
          objectives: [{ type: 'visit', location: 'poi' }],
          description: 'I have seen visions of a place lost to time. Find it, and unlock ancient power.' }
    ]
};

// Reward pools by NPC type
const QUEST_REWARD_POOLS = {
    merchant: {
        items: ['potion_health', 'potion_stamina', 'torch', 'rope', 'bread'],
        resources: ['wood', 'stone', 'fiber']
    },
    weaponsmith: {
        items: ['dagger', 'sword', 'mace', 'broadsword'],
        armor: ['iron_helm', 'iron_pauldrons', 'warriors_belt']
    },
    armorsmith: {
        items: ['leather_cap', 'leather_vest', 'chain_coif', 'chain_hauberk'],
        armor: ['reinforced_boots', 'adventurer_belt', 'iron_bracers']
    },
    mage: {
        items: ['mana_potion', 'scroll_fire', 'scroll_ice', 'staff'],
        armor: ['cloth_hood', 'mage_robe', 'mana_pendant', 'apprentice_ring', 'arcane_trinket']
    },
    temple: {
        items: ['holy_water', 'blessed_salve', 'prayer_incense'],
        armor: ['priest_cowl', 'pilgrim_vestments', 'silver_holy_symbol', 'prayer_beads', 'ring_of_purity']
    },
    fighter: {
        items: ['potion_health', 'antidote'],
        armor: ['iron_cuirass', 'iron_greaves', 'iron_boots', 'strength_ring']
    },
    tavern: {
        items: ['bread', 'ale', 'stew', 'wine'],
        armor: ['lucky_coin', 'travelers_cloak']
    },
    wanderer: {
        items: ['mana_potion', 'antidote'],
        armor: ['mana_pendant', 'vitality_pendant', 'agility_ring']
    }
};

const QuestSystem = (function() {
    // Private state
    const _npcQuestStatus = new Map();
    const _questMarkers = [];
    
    // Private: Generate quest for NPC
    function _generateQuest(npc, npcType) {
        const templates = QUEST_TEMPLATES[npcType] || QUEST_TEMPLATES.merchant;
        const template = templates[Math.floor(Math.random() * templates.length)];
        const difficultyData = QUEST_DIFFICULTY[template.difficulty];
        
        const objectives = template.objectives.map(obj => {
            const generated = { ...obj, complete: false };
            
            if (obj.type === 'collect') {
                generated.items = obj.items.map((item, i) => ({
                    id: item,
                    required: Math.floor(obj.amounts[0] + Math.random() * (obj.amounts[1] - obj.amounts[0])),
                    current: 0
                }));
            } else if (obj.type === 'kill') {
                generated.required = Math.floor(obj.count[0] + Math.random() * (obj.count[1] - obj.count[0]));
                generated.current = 0;
            } else if (obj.type === 'craft') {
                generated.required = Math.floor(obj.count[0] + Math.random() * (obj.count[1] - obj.count[0]));
                generated.current = 0;
            } else if (obj.type === 'visit') {
                generated.visited = false;
            } else if (obj.type === 'talkTo') {
                generated.talked = false;
            }
            
            return generated;
        });
        
        const goldReward = Math.floor(difficultyData.gold[0] + Math.random() * (difficultyData.gold[1] - difficultyData.gold[0]));
        const expReward = Math.floor(difficultyData.exp[0] + Math.random() * (difficultyData.exp[1] - difficultyData.exp[0]));
        
        const rewardPool = QUEST_REWARD_POOLS[npcType] || QUEST_REWARD_POOLS.merchant;
        const itemRewards = [];
        
        if (template.difficulty === 'HARD' || template.difficulty === 'EPIC') {
            const pool = rewardPool.armor || rewardPool.items;
            if (pool && pool.length > 0) {
                itemRewards.push({ id: pool[Math.floor(Math.random() * pool.length)], count: 1 });
            }
        } else if (template.difficulty === 'MEDIUM') {
            if (rewardPool.items && rewardPool.items.length > 0 && Math.random() < 0.6) {
                itemRewards.push({ id: rewardPool.items[Math.floor(Math.random() * rewardPool.items.length)], count: 1 + Math.floor(Math.random() * 2) });
            }
        }
        
        if (rewardPool.resources && Math.random() < 0.5) {
            const res = rewardPool.resources[Math.floor(Math.random() * rewardPool.resources.length)];
            itemRewards.push({ id: res, count: 5 + Math.floor(Math.random() * 10) });
        }
        
        return {
            id: `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: template.name,
            description: template.description,
            type: template.questType,
            questType: template.type,
            difficulty: template.difficulty,
            giver: npc.data.name,
            giverKey: npc.dataKey,
            objectives: objectives,
            rewards: { gold: goldReward, exp: expReward, items: itemRewards },
            accepted: false,
            readyToTurnIn: false
        };
    }
    
    // Private: Get NPC quest type
    function _getNPCType(npc) {
        if (!npc || !npc.data) return 'merchant';
        
        const name = npc.data.name?.toLowerCase() || '';
        const title = npc.data.title?.toLowerCase() || '';
        const dataKey = npc.dataKey?.toLowerCase() || '';
        
        if (dataKey.includes('weapon') || title.includes('weapon')) return 'weaponsmith';
        if (dataKey.includes('armor') || title.includes('armor')) return 'armorsmith';
        if (title.includes('mage') || title.includes('arcane') || name.includes('archmagus')) return 'mage';
        if (title.includes('priest') || title.includes('temple') || title.includes('acolyte')) return 'temple';
        if (title.includes('guildmaster') || title.includes('arms') || title.includes('combat')) return 'fighter';
        if (title.includes('innkeeper') || title.includes('tavern') || title.includes('bard')) return 'tavern';
        if (title.includes('sage') || title.includes('wanderer') || title.includes('hermit')) return 'wanderer';
        
        return 'merchant';
    }
    
    // Private: Create quest marker
    function _createMarker(npc, questType) {
        if (!npc.group) return;
        
        const existing = _questMarkers.find(m => m.npc === npc);
        if (existing) {
            npc.group.remove(existing.marker);
            _questMarkers.splice(_questMarkers.indexOf(existing), 1);
        }
        
        const marker = new THREE.Group();
        const color = questType === 'main' ? 0xffcc00 : (questType === 'turnin' ? 0x44ff44 : 0xffaa00);
        const symbol = questType === 'turnin' ? '?' : '!';
        
        const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
        const dotGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const markerMat = new THREE.MeshBasicMaterial({ color: color });
        
        if (symbol === '!') {
            const stem = new THREE.Mesh(stemGeo, markerMat);
            stem.position.y = 0.35;
            marker.add(stem);
            
            const dot = new THREE.Mesh(dotGeo, markerMat);
            dot.position.y = -0.05;
            marker.add(dot);
        } else {
            const curve = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.06, 8, 12, Math.PI * 1.5), markerMat);
            curve.position.y = 0.35;
            curve.rotation.x = Math.PI / 2;
            marker.add(curve);
            
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 8), markerMat);
            stem.position.y = 0.1;
            marker.add(stem);
            
            const dot = new THREE.Mesh(dotGeo, markerMat);
            dot.position.y = -0.1;
            marker.add(dot);
        }
        
        const glowGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.2 
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = 0.2;
        marker.add(glow);
        
        marker.position.set(0, 3.5, 0);
        npc.group.add(marker);
        
        _questMarkers.push({ npc, marker, type: questType, time: 0 });
    }
    
    // Private: Remove quest marker
    function _removeMarker(npc) {
        const idx = _questMarkers.findIndex(m => m.npc === npc);
        if (idx !== -1) {
            const { marker } = _questMarkers[idx];
            if (npc.group) npc.group.remove(marker);
            _questMarkers.splice(idx, 1);
        }
    }
    
    // Public interface
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
        },
        
        // === Data Access ===
        getQuestTypes() { return QUEST_TYPES; },
        getDifficulty() { return QUEST_DIFFICULTY; },
        getTemplates() { return QUEST_TEMPLATES; },
        getRewardPools() { return QUEST_REWARD_POOLS; },
        
        // === State Getters ===
        getStatus(npcKey) { return _npcQuestStatus.get(npcKey); },
        hasStatus(npcKey) { return _npcQuestStatus.has(npcKey); },
        
        // === Initialize ===
        initialize() {
            const { npcList, biomeNPCList } = _deps;
            
            if (npcList) {
                for (const npc of npcList) {
                    if (npc.data.hasShop || npc.data.type === 'lore' || Math.random() < 0.4) {
                        const npcType = _getNPCType(npc);
                        const quest = _generateQuest(npc, npcType);
                        _npcQuestStatus.set(npc.dataKey, {
                            hasQuest: true,
                            quest: quest,
                            questType: quest.type
                        });
                        _createMarker(npc, quest.type);
                    }
                }
            }
            
            if (biomeNPCList) {
                for (const npc of biomeNPCList) {
                    if (npc.data.hasShop || npc.data.type === 'lore' || Math.random() < 0.3) {
                        const npcType = _getNPCType(npc);
                        const quest = _generateQuest(npc, npcType);
                        _npcQuestStatus.set(npc.dataKey, {
                            hasQuest: true,
                            quest: quest,
                            questType: quest.type
                        });
                    }
                }
            }
        },
        
        // === Quest Checking ===
        canAccept(npcKey) {
            const status = _npcQuestStatus.get(npcKey);
            if (!status || !status.hasQuest) return false;
            const { loreBookData } = _deps;
            if (!loreBookData) return false;
            const existingQuest = loreBookData.quests.active.find(q => q.giverKey === npcKey);
            if (existingQuest) return false;
            return !status.quest.accepted;
        },
        
        hasToTurnIn(npcKey) {
            const { loreBookData } = _deps;
            if (!loreBookData) return false;
            return loreBookData.quests.active.some(q => q.giverKey === npcKey && q.readyToTurnIn);
        },
        
        // === Quest Actions ===
        accept(npcKey) {
            const status = _npcQuestStatus.get(npcKey);
            if (!status || !status.quest) return;

            const { loreBookData, npcList, addThought, showTransaction, renderQuests, LoreBookSystem } = _deps;

            // Deep copy quest and mark as accepted
            const quest = { ...status.quest, accepted: true };
            if (loreBookData) loreBookData.quests.active.push(quest);
            status.quest.accepted = true;

            // Remove the "!" marker from the NPC
            if (npcList) {
                const npc = npcList.find(n => n.dataKey === npcKey);
                if (npc) _removeMarker(npc);
            }

            if (addThought) {
                addThought(`I have accepted the task "${quest.name}" from ${quest.giver}. ${quest.description}`, 'Accepting a new quest');
            }
            if (showTransaction) {
                showTransaction(`Quest Accepted: ${quest.name}`, 'buy');
            }
            // Refresh quest journal if it's currently open
            if (LoreBookSystem && LoreBookSystem.isOpen && LoreBookSystem.isOpen() && renderQuests) {
                renderQuests();
            }
        },
        
        turnIn(npcKey) {
            const { loreBookData, inventory, npcList, showTransaction, addThought, updateInventoryUI, renderQuests, LoreBookSystem } = _deps;

            if (!loreBookData) return null;

            const questIndex = loreBookData.quests.active.findIndex(q => q.giverKey === npcKey && q.readyToTurnIn);
            if (questIndex === -1) return null;

            // Move quest from active to completed
            const quest = loreBookData.quests.active.splice(questIndex, 1)[0];
            loreBookData.quests.completed.push(quest);

            // Give gold reward
            if (inventory) {
                inventory.gold = (inventory.gold || 0) + quest.rewards.gold;
            }

            // Give XP reward — use addXP if available, else set directly
            if (inventory && inventory.addXP) {
                inventory.addXP(quest.rewards.exp);
            }

            // Give item rewards
            for (const reward of quest.rewards.items) {
                if (inventory && inventory.items && inventory.items[reward.id]) {
                    // Item already exists — bump count
                    inventory.items[reward.id].count += reward.count;
                } else if (inventory) {
                    // Try to find full item data from NPC shop inventories
                    const itemData = this.findItemData(reward.id);
                    if (itemData) {
                        inventory.items[reward.id] = { ...itemData, count: reward.count };
                    } else if (inventory.add) {
                        // Fallback to generic add (covers materials/resources)
                        inventory.add(reward.id, reward.count);
                    }
                }
            }

            // Remove turn-in marker and schedule a new quest for this NPC
            if (npcList) {
                const npc = npcList.find(n => n.dataKey === npcKey);
                if (npc) {
                    _removeMarker(npc);

                    // New quest spawns after 60 seconds
                    setTimeout(() => {
                        const npcType = _getNPCType(npc);
                        const newQuest = _generateQuest(npc, npcType);
                        _npcQuestStatus.set(npc.dataKey, {
                            hasQuest: true,
                            quest: newQuest,
                            questType: newQuest.type
                        });
                        _createMarker(npc, newQuest.type);
                    }, 60000);
                }
            }

            if (showTransaction) {
                showTransaction(`Quest Complete! +${quest.rewards.gold}g +${quest.rewards.exp} XP`, 'buy');
            }
            if (addThought) {
                addThought(`"${quest.name}" is complete! ${quest.giver} rewarded me handsomely.`, `Completing ${quest.name}`);
            }
            if (updateInventoryUI) updateInventoryUI();
            if (LoreBookSystem && LoreBookSystem.isOpen && LoreBookSystem.isOpen() && renderQuests) {
                renderQuests();
            }

            return quest;
        },
        
        updateProgress(type, data) {
            const { loreBookData, npcList, showTransaction, addThought, renderQuests, LoreBookSystem } = _deps;

            if (!loreBookData) return;

            for (const quest of loreBookData.quests.active) {
                if (quest.readyToTurnIn) continue;

                for (const obj of quest.objectives) {
                    if (obj.complete) continue;

                    // Match progress type to objective type
                    if (type === 'collect' && obj.type === 'collect') {
                        for (const item of obj.items) {
                            if (data.itemId === item.id) {
                                item.current = Math.min(item.current + (data.amount || 1), item.required);
                            }
                        }
                        obj.complete = obj.items.every(i => i.current >= i.required);
                    }
                    else if (type === 'kill' && obj.type === 'kill') {
                        obj.current = Math.min(obj.current + 1, obj.required);
                        obj.complete = obj.current >= obj.required;
                    }
                    else if (type === 'craft' && obj.type === 'craft') {
                        if (data.itemId === obj.item) {
                            obj.current = Math.min(obj.current + (data.amount || 1), obj.required);
                            obj.complete = obj.current >= obj.required;
                        }
                    }
                    else if (type === 'visit' && obj.type === 'visit') {
                        obj.visited = true;
                        obj.complete = true;
                    }
                    else if (type === 'talkTo' && obj.type === 'talkTo') {
                        obj.talked = true;
                        obj.complete = true;
                    }
                }

                // Check if all objectives are now complete
                if (quest.objectives.every(o => o.complete)) {
                    quest.readyToTurnIn = true;
                    // Show green "?" marker above quest giver
                    if (npcList) {
                        const npc = npcList.find(n => n.dataKey === quest.giverKey);
                        if (npc) _createMarker(npc, 'turnin');
                    }
                    if (showTransaction) {
                        showTransaction(`Quest Ready: Return to ${quest.giver}!`, 'buy');
                    }
                    if (addThought) {
                        addThought(`I have completed all objectives for "${quest.name}". I should return to ${quest.giver}.`, 'Completing quest objectives');
                    }
                }
            }

            // Refresh quest journal if open
            if (LoreBookSystem && LoreBookSystem.isOpen && LoreBookSystem.isOpen() && renderQuests) {
                renderQuests();
            }
        },
        
        // === Dialogue Options ===
        getDialogueOptions(npc) {
            const options = [];
            const npcKey = npc.dataKey;
            
            if (this.hasToTurnIn(npcKey)) {
                options.push({
                    text: '⭐ Complete Quest',
                    action: 'turnin',
                    cssClass: 'quest-turnin'
                });
            }
            else if (this.canAccept(npcKey)) {
                const status = _npcQuestStatus.get(npcKey);
                if (status && status.quest) {
                    const diffLabel = QUEST_DIFFICULTY[status.quest.difficulty]?.label || status.quest.difficulty;
                    options.push({
                        text: `📜 ${status.quest.name} (${diffLabel})`,
                        action: 'quest',
                        cssClass: 'quest-available'
                    });
                }
            }
            
            return options;
        },
        
        // === Marker Animation ===
        animateMarkers(time) {
            for (const entry of _questMarkers) {
                entry.time += 0.016;
                if (entry.marker) {
                    entry.marker.position.y = 3.5 + Math.sin(entry.time * 2) * 0.15;
                    entry.marker.rotation.y = time * 0.001;
                }
            }
        },
        
        // === Utility: search NPC shop inventories for item data ===
        findItemData(itemId) {
            const { NPC_DATA } = _deps;

            if (NPC_DATA) {
                for (const key in NPC_DATA) {
                    const npcData = NPC_DATA[key];
                    if (npcData.shopInventory) {
                        const item = npcData.shopInventory.find(i => i.id === itemId);
                        if (item) return { ...item };
                    }
                }
            }

            return null;
        }
    };
})();

// Backward compatibility wrappers
function initializeNPCQuests() { QuestSystem.initialize(); }
function canAcceptQuest(npcKey) { return QuestSystem.canAccept(npcKey); }
function acceptQuest(npcKey) { QuestSystem.accept(npcKey); }
function turnInQuest(npcKey) { return QuestSystem.turnIn(npcKey); }
function updateQuestProgress(type, data) { QuestSystem.updateProgress(type, data); }
function hasQuestToTurnIn(npcKey) { return QuestSystem.hasToTurnIn(npcKey); }
function getQuestDialogueOptions(npc) { return QuestSystem.getDialogueOptions(npc); }
function animateQuestMarkers(time) { QuestSystem.animateMarkers(time); }

export { 
    QuestSystem,
    QUEST_TYPES,
    QUEST_DIFFICULTY,
    QUEST_TEMPLATES,
    QUEST_REWARD_POOLS,
    initializeNPCQuests,
    canAcceptQuest,
    acceptQuest,
    turnInQuest,
    updateQuestProgress,
    hasQuestToTurnIn,
    getQuestDialogueOptions,
    animateQuestMarkers
};
export default QuestSystem;
