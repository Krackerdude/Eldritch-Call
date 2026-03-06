// ═══════════════════════════════════════════════════════════════════════════════
// LOREBOOKSYSTEM.JS - Journal, Lore, Discoveries, Quests, Thoughts
// Dependencies: None (standalone data system)
// Consumers: UI, Quest system, NPC dialogue, Biome discovery
// ═══════════════════════════════════════════════════════════════════════════════

const LoreBookSystem = (function() {
    // Private state
    let _isOpen = false;
    
    // Game time tracking for journal entries
    const _gameTime = {
        day: 1,
        hour: 8,
        minute: 0,
        
        getFormattedTime() {
            const period = this.hour >= 12 ? 'PM' : 'AM';
            const displayHour = this.hour > 12 ? this.hour - 12 : (this.hour === 0 ? 12 : this.hour);
            return `Day ${this.day}, ${displayHour}:${this.minute.toString().padStart(2, '0')} ${period}`;
        },
        
        getFullDate() {
            const months = ['Frostmoon', 'Dawntide', 'Bloomveil', 'Sunpeak', 'Harvestgold', 'Shadowfall'];
            const month = months[Math.floor((this.day - 1) / 30) % months.length];
            const dayOfMonth = ((this.day - 1) % 30) + 1;
            return `${dayOfMonth} ${month}, Year of the Wanderer`;
        },
        
        advance(hours) {
            this.hour += hours;
            while (this.hour >= 24) {
                this.hour -= 24;
                this.day++;
            }
        }
    };
    
    // Main data store
    const _data = {
        lore: {
            worldHistory: [
                { id: 'sundering', title: 'The Sundering', text: 'A thousand years ago, the world was torn asunder when the Forgotten Ones attempted to breach the veil between realms. The cataclysm shattered continents and reshaped the very fabric of magic. Few records survive from before that dark age.', discovered: true, category: 'Ancient History' },
                { id: 'forgotten_ones', title: 'The Forgotten Ones', text: 'Beings of immense power who once ruled before mortals walked the earth. Their true names have been lost to time, spoken only in whispers by those who still remember. Some say they merely slumber, waiting for the stars to align once more.', discovered: false, category: 'Ancient History' },
                { id: 'valdris', title: 'The Realm of Valdris', text: 'Valdris stands as one of the last great kingdoms, built upon the ruins of an even older civilization. Its walls have withstood countless sieges, protected by both mortal steel and ancient wards that few understand.', discovered: true, category: 'Locations' },
                { id: 'guardian_knights', title: 'The Guardian Knights of Solanthus', text: 'An order of warriors bound by sacred oaths to protect the realm from supernatural threats. Their fortress of Solanthus was said to be impregnable, until the Night of Shadows when it fell in a single hour.', discovered: false, category: 'Factions' },
                { id: 'ironhand_clan', title: 'The Ironhand Clan', text: 'Master smiths whose lineage stretches back to before the Sundering. They are said to possess the secret of forging weapons that can harm beings of pure magic. Grimjaw is the last known smith of the bloodline.', discovered: false, category: 'Factions' },
                { id: 'mystic_forest', title: 'The Mystic Forest', text: 'An ancient woodland that predates human memory. The trees here remember things that history has forgotten. Travelers speak of lights that dance between the branches and whispers that seem to come from the earth itself.', discovered: true, category: 'Locations' }
            ],
            magic: [],
            creatures: []
        },
        quests: { active: [], completed: [] },
        discoveries: {
            biomes: [
                { id: 'rolling_meadows', name: 'Rolling Meadows', icon: 'grass', discovered: true, description: 'Land of Gentle Hills - Sun-dappled fields where wildflowers bloom in abundance' },
                { id: 'ancient_woodlands', name: 'Ancient Woodlands', icon: 'tree', discovered: false, description: 'Where Giants Sleep - Towering trees older than memory, shrouded in eternal twilight' },
                { id: 'crimson_dunes', name: 'Crimson Dunes', icon: 'sun', discovered: false, description: 'The Scorched Expanse - Endless golden sands under a blazing sky' },
                { id: 'frozen_peaks', name: 'Frozen Peaks', icon: 'snow', discovered: false, description: 'Realm of Eternal Winter - Ice-clad mountains where the cold never relents' },
                { id: 'murky_swamp', name: 'Murky Swamp', icon: 'water', discovered: false, description: 'The Festering Bog - Mist-shrouded wetlands glowing with strange lights' },
                { id: 'crystal_heights', name: 'Crystal Heights', icon: 'crystal', discovered: false, description: 'The Shimmering Summit - Magical peaks where crystals grow from the earth' },
                { id: 'shadow_vale', name: 'Shadow Vale', icon: 'ruins', discovered: false, description: 'Where Light Fears to Tread - A cursed land of perpetual darkness' }
            ],
            fauna: [
                { id: 'deer', name: 'Forest Deer', icon: 'deer', discovered: false, description: 'Graceful creatures of the woodland', count: 0 },
                { id: 'wolf', name: 'Timber Wolf', icon: 'wolf', discovered: false, description: 'Pack hunters of the wild', count: 0 },
                { id: 'boar', name: 'Wild Boar', icon: 'boar', discovered: false, description: 'Fierce tusked beasts', count: 0 },
                { id: 'rabbit', name: 'Meadow Hare', icon: 'rabbit', discovered: false, description: 'Swift and elusive', count: 0 },
                { id: 'bear', name: 'Mountain Bear', icon: 'bear', discovered: false, description: 'Lords of the wilderness', count: 0 },
                { id: 'eagle', name: 'Sky Eagle', icon: 'eagle', discovered: false, description: 'Majestic hunters of the air', count: 0 }
            ],
            flora: [
                // Trees - Meadows
                { id: 'oak', name: 'Oak Tree', icon: 'tree', discovered: false, description: 'Sturdy hardwood with dense grain, perfect for construction', count: 0, type: 'tree' },
                { id: 'birch', name: 'Silver Birch', icon: 'tree', discovered: false, description: 'Elegant white-barked tree with papery bark', count: 0, type: 'tree' },
                { id: 'maple', name: 'Autumn Maple', icon: 'tree', discovered: false, description: 'Vibrant foliage that blazes red and gold', count: 0, type: 'tree' },
                { id: 'branched', name: 'Branching Ash', icon: 'tree', discovered: false, description: 'Wide-spreading tree with visible branch structure', count: 0, type: 'tree' },
                { id: 'cypress', name: 'Cypress', icon: 'tree', discovered: false, description: 'Tall columnar tree reaching for the sky', count: 0, type: 'tree' },
                { id: 'bushy', name: 'Elderwood', icon: 'tree', discovered: false, description: 'Dense foliage provides excellent shade', count: 0, type: 'tree' },
                { id: 'stacked', name: 'Cloud Tree', icon: 'tree', discovered: false, description: 'Distinctive layered canopy like stacked clouds', count: 0, type: 'tree' },
                { id: 'golden', name: 'Golden Elm', icon: 'tree', discovered: false, description: 'Radiant yellow leaves shimmer in sunlight', count: 0, type: 'tree' },
                // Trees - Ancient Woodlands
                { id: 'ancient', name: 'Ancient Greatwood', icon: 'tree', discovered: false, description: 'Massive primordial tree older than civilization', count: 0, type: 'tree' },
                { id: 'mossyAncient', name: 'Moss-Shrouded Elder', icon: 'tree', discovered: false, description: 'Ancient tree draped in centuries of moss', count: 0, type: 'tree' },
                { id: 'gnarled', name: 'Gnarled Sentinel', icon: 'tree', discovered: false, description: 'Twisted trunk tells tales of ages past', count: 0, type: 'tree' },
                // Trees - Frozen Peaks
                { id: 'pine', name: 'Mountain Pine', icon: 'pine', discovered: false, description: 'Hardy conifer adapted to harsh climates', count: 0, type: 'tree' },
                { id: 'frostedPine', name: 'Frost Pine', icon: 'pine', discovered: false, description: 'Ice-laden evergreen of the frozen north', count: 0, type: 'tree' },
                // Trees - Crimson Dunes
                { id: 'cactus', name: 'Desert Cactus', icon: 'cactus', discovered: false, description: 'Resilient succulent storing precious water', count: 0, type: 'tree' },
                { id: 'palm', name: 'Oasis Palm', icon: 'palm', discovered: false, description: 'Graceful fronds swaying in desert winds', count: 0, type: 'tree' },
                { id: 'dead', name: 'Deadwood', icon: 'deadTree', discovered: false, description: 'Bleached remains of once-living trees', count: 0, type: 'tree' },
                // Trees - Murky Swamp
                { id: 'willow', name: 'Weeping Willow', icon: 'tree', discovered: false, description: 'Cascading branches drape like curtains', count: 0, type: 'tree' },
                { id: 'mangrove', name: 'Swamp Mangrove', icon: 'tree', discovered: false, description: 'Tangled roots rise from murky waters', count: 0, type: 'tree' },
                // Trees - Crystal Heights
                { id: 'crystalTree', name: 'Crystal Spire Tree', icon: 'crystal', discovered: false, description: 'Crystalline growths replace natural bark', count: 0, type: 'tree' },
                { id: 'alpine', name: 'Alpine Fir', icon: 'pine', discovered: false, description: 'High-altitude evergreen with blue tint', count: 0, type: 'tree' },
                // Trees - Shadow Vale
                { id: 'twisted', name: 'Shadowtwist', icon: 'deadTree', discovered: false, description: 'Corrupted tree warped by dark magic', count: 0, type: 'tree' },
                { id: 'thornTree', name: 'Blackthorn', icon: 'deadTree', discovered: false, description: 'Menacing thorns drip with shadowy essence', count: 0, type: 'tree' },
                // Ground Cover
                { id: 'mushroom', name: 'Forest Mushroom', icon: 'mushroom', discovered: false, description: 'Bioluminescent fungi of shaded groves', count: 0, type: 'groundcover' },
                { id: 'fern', name: 'Woodland Fern', icon: 'fern', discovered: false, description: 'Delicate fronds carpet the forest floor', count: 0, type: 'groundcover' },
                { id: 'flower', name: 'Wildflower', icon: 'flower', discovered: false, description: 'Colorful blooms dot meadows and glades', count: 0, type: 'groundcover' },
            ],
            minerals: [
                { id: 'granite', name: 'Granite', icon: 'rock', discovered: false, description: 'Dense igneous rock, excellent for building', count: 0 },
                { id: 'slate', name: 'Slate', icon: 'rock', discovered: false, description: 'Layered sedimentary stone that splits cleanly', count: 0 },
                { id: 'mossy', name: 'Mossy Stone', icon: 'rock', discovered: false, description: 'Ancient rock covered in verdant moss', count: 0 },
                { id: 'sandstone', name: 'Sandstone', icon: 'rock', discovered: false, description: 'Warm-colored stone formed from compressed sand', count: 0 },
                { id: 'crystal', name: 'Crystal Cluster', icon: 'crystal', discovered: false, description: 'Precious crystals humming with latent energy', count: 0 },
                { id: 'obsidian', name: 'Obsidian', icon: 'rock', discovered: false, description: 'Volcanic glass sharper than steel', count: 0 },
                { id: 'boulder', name: 'Boulder', icon: 'rock', discovered: false, description: 'Massive rounded stone smoothed by ages', count: 0 }
            ],
            towns: [
                { id: 'valdris_town', name: 'Valdris Township', icon: 'town', discovered: true, description: 'The central hub of civilization' },
                { id: 'harbor', name: 'Stormhaven Port', icon: 'anchor', discovered: false, description: 'Gateway to distant shores' },
                { id: 'ruins', name: 'Forgotten Ruins', icon: 'ruins', discovered: false, description: 'Remnants of a lost age' },
                { id: 'camp', name: 'Wanderer Camp', icon: 'camp', discovered: false, description: 'Temporary shelter for travelers' }
            ]
        },
        thoughts: []
    };
    
    // Thought templates for automatic generation
    const _thoughtTemplates = {
        enterForest: [
            "The ancient trees seem to whisper secrets in a language I cannot quite understand.",
            "There's a weight to the air here, as if the forest itself is watching.",
            "I feel small beneath these towering sentinels of wood and leaf."
        ],
        enterTown: [
            "The bustle of civilization is both comforting and overwhelming after the wilderness.",
            "So many stories walk these streets. Each face holds a lifetime of memories.",
            "The smell of cooking fires and the sound of commerce—a reminder that life persists."
        ],
        combat: [
            "My heart still races from the encounter. In those moments, nothing else exists but survival.",
            "Combat sharpens the senses in ways nothing else can. I feel more alive than ever.",
            "Each battle teaches me something new about my limits—and how to surpass them."
        ],
        nightfall: [
            "As darkness descends, the world transforms. Familiar paths become mysterious.",
            "The stars above remind me how small we are in the grand design.",
            "Night brings different dangers, but also a certain peace."
        ],
        discovery: [
            "Another secret revealed. This world holds more wonders than I ever imagined.",
            "Knowledge is power, they say. Each discovery makes me stronger.",
            "I wonder how much remains hidden, waiting to be found."
        ],
        rest: [
            "A moment of peace in an unforgiving world. I should treasure these respites.",
            "My body aches, but my spirit remains unbroken.",
            "Tomorrow brings new challenges. Tonight, I rest."
        ]
    };
    
    // Discovery icons SVG
    const _discoveryIcons = {
        grass: '<svg viewBox="0 0 32 32"><path d="M8 28V18l4-6v16M16 28V14l4-8v22M24 28V16l-4-4v16" stroke="currentColor" fill="none" stroke-width="2"/></svg>',
        tree: '<svg viewBox="0 0 32 32"><path d="M16 4l-8 12h4l-6 10h20l-6-10h4z" fill="currentColor"/><rect x="14" y="24" width="4" height="6" fill="currentColor"/></svg>',
        mountain: '<svg viewBox="0 0 32 32"><path d="M4 28L16 6l12 22H4z" fill="currentColor"/><path d="M10 28l6-10 6 10" fill="currentColor" opacity="0.6"/></svg>',
        water: '<svg viewBox="0 0 32 32"><path d="M4 14q6-4 12 0t12 0M4 20q6-4 12 0t12 0M4 26q6-4 12 0t12 0" stroke="currentColor" fill="none" stroke-width="2"/></svg>',
        sun: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="6" fill="currentColor"/><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7 7l3 3M22 22l3 3M7 25l3-3M22 10l3-3" stroke="currentColor" stroke-width="2"/></svg>',
        snow: '<svg viewBox="0 0 32 32"><path d="M16 4v24M4 16h24M8 8l16 16M24 8L8 24" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>',
        crystal: '<svg viewBox="0 0 32 32"><path d="M16 2l8 12-8 16-8-16z" fill="currentColor"/><path d="M16 2l-4 10 4 6 4-6z" fill="currentColor" opacity="0.6"/></svg>',
        ruins: '<svg viewBox="0 0 32 32"><rect x="4" y="20" width="6" height="8" fill="currentColor"/><rect x="12" y="16" width="4" height="12" fill="currentColor"/><rect x="22" y="22" width="6" height="6" fill="currentColor"/><path d="M4 20l3-8M10 20l-2-6M12 16l2-8M16 16l-1-4M22 22l2-10M28 22l-3-6" stroke="currentColor" stroke-width="1" opacity="0.5"/></svg>',
        deer: '<svg viewBox="0 0 32 32"><ellipse cx="20" cy="18" rx="8" ry="6" fill="currentColor"/><circle cx="10" cy="12" r="4" fill="currentColor"/><path d="M8 8l-2-4M8 8l2-4M12 8l-1-4M12 8l1-4" stroke="currentColor" stroke-width="1.5"/><path d="M20 24v4M26 22v6" stroke="currentColor" stroke-width="2"/></svg>',
        wolf: '<svg viewBox="0 0 32 32"><ellipse cx="18" cy="18" rx="10" ry="7" fill="currentColor"/><path d="M6 14l2-6 4 4M8 16l-4 1" fill="currentColor"/><circle cx="10" cy="14" r="1.5" fill="#333"/><path d="M20 25l2 5M26 24l2 4" stroke="currentColor" stroke-width="2"/></svg>',
        boar: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="10" ry="8" fill="currentColor"/><ellipse cx="6" cy="18" rx="4" ry="3" fill="currentColor"/><path d="M3 16l-1-2M3 20l-1 2" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="16" r="1" fill="#333"/></svg>',
        rabbit: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="20" rx="8" ry="6" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="currentColor"/><ellipse cx="8" cy="6" rx="2" ry="5" fill="currentColor"/><ellipse cx="14" cy="6" rx="2" ry="5" fill="currentColor"/></svg>',
        bear: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="20" rx="12" ry="8" fill="currentColor"/><circle cx="16" cy="10" r="6" fill="currentColor"/><circle cx="8" cy="6" r="3" fill="currentColor"/><circle cx="24" cy="6" r="3" fill="currentColor"/></svg>',
        eagle: '<svg viewBox="0 0 32 32"><path d="M16 8l-12 8 6 2-4 8 10-6 10 6-4-8 6-2z" fill="currentColor"/><circle cx="16" cy="10" r="3" fill="currentColor"/></svg>',
        pine: '<svg viewBox="0 0 32 32"><path d="M16 2l-6 8h3l-5 8h3l-6 10h22l-6-10h3l-5-8h3z" fill="currentColor"/><rect x="14" y="26" width="4" height="4" fill="currentColor"/></svg>',
        mushroom: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="14" rx="10" ry="8" fill="currentColor"/><rect x="12" y="18" width="8" height="10" fill="currentColor" opacity="0.7"/></svg>',
        flower: '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="4" fill="currentColor"/><circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.8"/><circle cx="22" cy="10" r="3" fill="currentColor" opacity="0.8"/><circle cx="12" cy="16" r="3" fill="currentColor" opacity="0.8"/><circle cx="20" cy="16" r="3" fill="currentColor" opacity="0.8"/><path d="M16 16v12" stroke="currentColor" stroke-width="2"/></svg>',
        fern: '<svg viewBox="0 0 32 32"><path d="M16 28V12" stroke="currentColor" stroke-width="2"/><path d="M16 12l-6-4M16 15l-5-2M16 18l-4-1M16 21l-3 0M16 12l6-4M16 15l5-2M16 18l4-1M16 21l3 0" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
        rock: '<svg viewBox="0 0 32 32"><path d="M6 24l4-10 6 2 8-8 4 6-4 10-8 2z" fill="currentColor"/><path d="M10 14l4 1 4-4" stroke="currentColor" stroke-width="1" opacity="0.5"/></svg>',
        town: '<svg viewBox="0 0 32 32"><rect x="4" y="16" width="8" height="12" fill="currentColor"/><rect x="14" y="10" width="10" height="18" fill="currentColor"/><path d="M14 10l5-6 5 6" fill="currentColor"/><rect x="6" y="18" width="3" height="4" fill="currentColor" opacity="0.5"/><rect x="17" y="14" width="4" height="4" fill="currentColor" opacity="0.5"/></svg>',
        anchor: '<svg viewBox="0 0 32 32"><circle cx="16" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 10v16M8 22l8 4 8-4M4 18h6M22 18h6" stroke="currentColor" stroke-width="2"/></svg>',
        camp: '<svg viewBox="0 0 32 32"><path d="M16 6l-12 18h24z" fill="currentColor"/><path d="M16 6l-6 18h12z" fill="currentColor" opacity="0.6"/><path d="M4 28h24" stroke="currentColor" stroke-width="2"/></svg>',
        cactus: '<svg viewBox="0 0 32 32"><rect x="13" y="8" width="6" height="20" rx="2" fill="currentColor"/><rect x="6" y="14" width="10" height="4" rx="1" fill="currentColor"/><rect x="16" y="18" width="10" height="4" rx="1" fill="currentColor"/></svg>',
        palm: '<svg viewBox="0 0 32 32"><rect x="14" y="14" width="4" height="14" fill="currentColor" opacity="0.8"/><path d="M16 6c-8 4-10 8-10 8l10-2M16 6c8 4 10 8 10 8l-10-2" stroke="currentColor" fill="none" stroke-width="2"/></svg>',
        deadTree: '<svg viewBox="0 0 32 32"><rect x="14" y="10" width="4" height="18" fill="currentColor"/><path d="M16 10l-6-6M16 10l6-6M16 14l-8 2M16 14l8 2M16 18l-5 4M16 18l5 4" stroke="currentColor" stroke-width="2"/></svg>'
    };

    // Private render functions
    function _showNotificationBadge() {
        const badge = document.querySelector('#lore-book-hint .notification-badge');
        if (badge) badge.classList.add('visible');
    }

    function _hideNotificationBadge() {
        const badge = document.querySelector('#lore-book-hint .notification-badge');
        if (badge) badge.classList.remove('visible');
    }

    return {
        // State getters
        isOpen() { return _isOpen; },
        getGameTime() { return { ..._gameTime }; },
        getData() { return _data; },
        
        // State setters
        setOpen(open) { _isOpen = open; },

        // Initialize DOM event listeners
        init() {
            const self = this;

            // Hint icon click
            const hint = document.getElementById('lore-book-hint');
            if (hint) hint.addEventListener('click', () => self.toggle());

            // Close button
            const closeBtn = document.getElementById('lore-book-close');
            if (closeBtn) closeBtn.addEventListener('click', () => self.toggle());

            // Tab buttons
            document.querySelectorAll('#lore-book-tabs .lore-tab').forEach(tab => {
                tab.addEventListener('click', () => self.switchTab(tab.dataset.tab));
            });

            // Discovery subtab buttons
            document.querySelectorAll('#discoveries-subtabs .discovery-subtab').forEach(btn => {
                btn.addEventListener('click', () => self.switchDiscoveryTab(btn.dataset.subtab));
            });
        },

        // Open/close the lore book
        toggle() {
            _isOpen = !_isOpen;
            const overlay = document.getElementById('lore-book-overlay');
            const crosshair = document.getElementById('crosshair');
            
            if (_isOpen) {
                if (overlay) overlay.classList.add('visible');
                if (crosshair) crosshair.classList.add('hidden');
                document.exitPointerLock();
                _hideNotificationBadge();
                this.render();
            } else {
                if (overlay) overlay.classList.remove('visible');
                if (crosshair) crosshair.classList.remove('hidden');
            }
            return _isOpen;
        },
        
        open() { if (!_isOpen) this.toggle(); },
        close() { if (_isOpen) this.toggle(); },
        
        // Thought system
        addThought(text, context) {
            _data.thoughts.push({
                text: text,
                context: context,
                date: _gameTime.getFullDate() + ', ' + _gameTime.getFormattedTime()
            });
            _showNotificationBadge();
            if (_isOpen) this.renderThoughts();
        },
        
        generateThought(eventType) {
            const templates = _thoughtTemplates[eventType];
            if (!templates || templates.length === 0) return;
            
            const text = templates[Math.floor(Math.random() * templates.length)];
            const contextMap = {
                enterForest: 'Entering the ancient forest',
                enterTown: 'Returning to civilization',
                combat: 'A recent battle',
                nightfall: 'The setting sun',
                discovery: 'A new discovery',
                rest: 'Taking a moment to rest'
            };
            
            this.addThought(text, contextMap[eventType] || eventType);
        },
        
        // Discovery system
        discoverLore(loreId) {
            const entry = _data.lore.worldHistory.find(e => e.id === loreId);
            if (entry && !entry.discovered) {
                entry.discovered = true;
                this.addThought(
                    `I've learned something new about "${entry.title}". The knowledge feels important, as if a piece of a greater puzzle has fallen into place.`,
                    `Learning about ${entry.title}`
                );
                return true;
            }
            return false;
        },
        
        discoverEntry(type, id) {
            const items = _data.discoveries[type];
            if (!items) return false;
            
            const item = items.find(i => i.id === id);
            if (item && !item.discovered) {
                item.discovered = true;
                if (item.count !== undefined) item.count = 1;
                
                this.addThought(
                    `I've discovered ${item.name}. ${item.description}. I should make note of this for future reference.`,
                    `Discovering ${item.name}`
                );
                return true;
            } else if (item && item.count !== undefined) {
                item.count++;
            }
            return false;
        },
        
        isDiscovered(type, id) {
            const items = _data.discoveries[type];
            if (!items) return false;
            const item = items.find(i => i.id === id);
            return item ? item.discovered : false;
        },
        
        // Quest system
        addQuest(quest) {
            _data.quests.active.push({
                ...quest,
                type: quest.type || 'side'
            });
            
            this.addThought(
                `${quest.giver} has given me a task: "${quest.name}". ${quest.description}`,
                `Accepting quest from ${quest.giver}`
            );
        },
        
        completeQuest(questId) {
            const index = _data.quests.active.findIndex(q => q.id === questId);
            if (index !== -1) {
                const quest = _data.quests.active.splice(index, 1)[0];
                _data.quests.completed.push(quest);
                
                this.addThought(
                    `I have completed "${quest.name}". Another step forward on my journey through Valdris.`,
                    `Completing ${quest.name}`
                );
                return quest;
            }
            return null;
        },
        
        getActiveQuests() { return [..._data.quests.active]; },
        getCompletedQuests() { return [..._data.quests.completed]; },
        
        hasActiveQuest(questId) {
            return _data.quests.active.some(q => q.id === questId);
        },
        
        getQuest(questId) {
            return _data.quests.active.find(q => q.id === questId) || 
                   _data.quests.completed.find(q => q.id === questId);
        },
        
        // Time management
        advanceGameTime(hours) {
            _gameTime.advance(hours);
        },
        
        // Render functions
        render() {
            const activeTab = document.querySelector('.lore-tab.active');
            if (activeTab) {
                this.switchTab(activeTab.dataset.tab);
            } else {
                this.switchTab('lore');
            }
        },
        
        switchTab(tabName) {
            document.querySelectorAll('.lore-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            document.querySelectorAll('.lore-page').forEach(page => {
                page.classList.toggle('active', page.id === `lore-page-${tabName}`);
            });
            
            switch(tabName) {
                case 'lore': this.renderLoreEntries(); break;
                case 'quests': this.renderQuests(); break;
                case 'discoveries': this.renderDiscoveries('biomes'); break;
                case 'thoughts': this.renderThoughts(); break;
            }
        },
        
        renderLoreEntries() {
            const container = document.getElementById('lore-entries-container');
            if (!container) return;
            
            const categories = {};
            _data.lore.worldHistory.forEach(entry => {
                const cat = entry.category || 'Uncategorized';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(entry);
            });
            
            let html = '';
            for (const [category, entries] of Object.entries(categories)) {
                const discoveredEntries = entries.filter(e => e.discovered);
                if (discoveredEntries.length === 0) continue;
                
                html += `<div class="lore-category"><div class="lore-category-header">${category}</div>`;
                discoveredEntries.forEach(entry => {
                    html += `<div class="lore-entry">
                        <div class="lore-entry-title">
                            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                            ${entry.title}
                        </div>
                        <div class="lore-entry-text">${entry.text}</div>
                    </div>`;
                });
                html += '</div>';
            }
            
            container.innerHTML = html || '<div class="empty-state">No lore discovered yet. Explore the world to uncover its secrets.</div>';
        },
        
        renderQuests() {
            const activeContainer = document.getElementById('active-quests-container');
            const completedContainer = document.getElementById('completed-quests-container');
            
            if (activeContainer) {
                if (_data.quests.active.length === 0) {
                    activeContainer.innerHTML = '<div class="empty-state">No active quests. Speak with NPCs to find work.</div>';
                } else {
                    activeContainer.innerHTML = _data.quests.active.map(quest => {
                        const questType = quest.type === 'main' ? 'main-quest' : 'side-quest';
                        const readyClass = quest.readyToTurnIn ? ' ready-turnin' : '';
                        const diffBadge = quest.difficulty ? `<span class="quest-type-badge ${quest.type || 'side'}">${quest.difficulty}</span>` : '';
                        
                        let objectivesHtml = '';
                        if (quest.objectives) {
                            objectivesHtml = quest.objectives.map(obj => {
                                if (obj.type === 'collect' && obj.items) {
                                    return obj.items.map(item => {
                                        const itemName = item.id.charAt(0).toUpperCase() + item.id.slice(1).replace(/_/g, ' ');
                                        return `<div class="quest-objective ${item.current >= item.required ? 'complete' : ''}">
                                            <span>Collect ${itemName}</span>
                                            <span class="quest-progress">${item.current}/${item.required}</span>
                                        </div>`;
                                    }).join('');
                                } else if (obj.type === 'kill') {
                                    return `<div class="quest-objective ${obj.complete ? 'complete' : ''}">
                                        <span>Defeat enemies</span>
                                        <span class="quest-progress">${obj.current || 0}/${obj.required}</span>
                                    </div>`;
                                } else if (obj.type === 'craft') {
                                    const itemName = obj.item ? obj.item.charAt(0).toUpperCase() + obj.item.slice(1).replace(/_/g, ' ') : 'Items';
                                    return `<div class="quest-objective ${obj.complete ? 'complete' : ''}">
                                        <span>Craft ${itemName}</span>
                                        <span class="quest-progress">${obj.current || 0}/${obj.required}</span>
                                    </div>`;
                                } else if (obj.type === 'visit') {
                                    return `<div class="quest-objective ${obj.complete ? 'complete' : ''}">
                                        <span>Visit the location</span>
                                        <span class="quest-progress">${obj.complete ? '✓' : '...'}</span>
                                    </div>`;
                                } else if (obj.type === 'talkTo') {
                                    return `<div class="quest-objective ${obj.complete ? 'complete' : ''}">
                                        <span>Speak with the contact</span>
                                        <span class="quest-progress">${obj.complete ? '✓' : '...'}</span>
                                    </div>`;
                                }
                                return '';
                            }).join('');
                        }
                        
                        return `
                        <div class="quest-entry ${questType}${readyClass}">
                            <div class="quest-name">${quest.name} ${diffBadge}</div>
                            <div class="quest-giver">From: ${quest.giver}</div>
                            <div class="quest-description">${quest.description}</div>
                            <div class="quest-objectives">${objectivesHtml}</div>
                            ${quest.readyToTurnIn ? '<div class="quest-ready">✓ Ready to turn in!</div>' : ''}
                            ${quest.rewards ? `
                            <div class="quest-rewards">
                                <div class="quest-rewards-title">Rewards</div>
                                <div class="quest-reward-list">
                                    ${quest.rewards.gold ? `<span class="reward-item">💰 ${quest.rewards.gold}g</span>` : ''}
                                    ${quest.rewards.exp ? `<span class="reward-item">⭐ ${quest.rewards.exp} XP</span>` : ''}
                                </div>
                            </div>` : ''}
                        </div>`;
                    }).join('');
                }
            }
            
            if (completedContainer) {
                if (_data.quests.completed.length === 0) {
                    completedContainer.innerHTML = '<div class="empty-state">No completed quests yet.</div>';
                } else {
                    completedContainer.innerHTML = _data.quests.completed.slice().reverse().map(quest => `
                        <div class="quest-entry completed">
                            <div class="quest-name">${quest.name}</div>
                            <div class="quest-giver">Completed for: ${quest.giver}</div>
                        </div>
                    `).join('');
                }
            }
        },
        
        switchDiscoveryTab(subtab) {
            document.querySelectorAll('.discovery-subtab').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.subtab === subtab);
            });
            ['biomes', 'fauna', 'flora', 'minerals', 'towns'].forEach(type => {
                const grid = document.getElementById(`discovery-${type}`);
                if (grid) grid.style.display = type === subtab ? 'grid' : 'none';
            });
            this.renderDiscoveries(subtab);
        },

        renderDiscoveries(type) {
            const container = document.getElementById(`discovery-${type}`);
            if (!container) return;

            const items = _data.discoveries[type] || [];
            container.innerHTML = items.map(item => {
                const iconKey = item.icon || type;
                const iconSvg = _discoveryIcons[iconKey] || _discoveryIcons.tree || '';
                const countText = (item.count !== undefined) ?
                    `<div class="discovery-count">${item.count > 0 ? item.count : '&empty;'} encountered</div>` : '';

                return `
                    <div class="discovery-card ${item.discovered ? '' : 'undiscovered'}">
                        <div class="discovery-icon">${iconSvg}</div>
                        <div class="discovery-name">${item.discovered ? item.name : '???'}</div>
                        <div class="discovery-detail">${item.discovered ? (item.description || '') : 'Not yet discovered.'}</div>
                        ${countText}
                    </div>
                `;
            }).join('');
        },
        
        renderThoughts() {
            const container = document.getElementById('thoughts-container');
            if (!container) return;
            
            if (_data.thoughts.length === 0) {
                container.innerHTML = '<div class="empty-state">My mind is clear. Perhaps exploration will stir some thoughts.</div>';
            } else {
                container.innerHTML = _data.thoughts.slice().reverse().map(thought => `
                    <div class="thought-entry">
                        <div class="thought-text">"${thought.text}"</div>
                        <div class="thought-context">${thought.context}</div>
                        <div class="thought-date">${thought.date}</div>
                    </div>
                `).join('');
            }
        }
    };
})();

// Backward compatibility - expose data for other systems
const loreBookData = LoreBookSystem.getData();

// Helper functions for external use
function addThought(text, context) {
    LoreBookSystem.addThought(text, context);
}

function discoverLore(loreId) {
    return LoreBookSystem.discoverLore(loreId);
}

function discoverEntry(type, id) {
    return LoreBookSystem.discoverEntry(type, id);
}

export { 
    LoreBookSystem, 
    loreBookData,
    addThought,
    discoverLore,
    discoverEntry
};
export default LoreBookSystem;
