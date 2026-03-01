// ═══════════════════════════════════════════════════════════════════════════════
// NPC.JS - NPC Data, Appearances, Class, and Management
// Dependencies: THREE.js
// Injected: scene, getHeight, DialogueSystem
// Consumers: DialogueSystem, QuestSystem, World generation
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null,
    getHeight: (x, z) => 0,
    DialogueSystem: null
};

// NPC lists
const npcList = [];
const biomeNPCList = [];

// ═══════════════════════════════════════════════════════════════════════════════
// NPC APPEARANCE OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const NPC_APPEARANCES = {
    skinTones: [0xe8b898, 0xc49878, 0x8d5524, 0xd4a574, 0xf5d0b8, 0x6b4423],
    hairColors: [0x2a1506, 0x5c3317, 0x8b4513, 0xd4a574, 0x1a1a1a, 0x808080, 0xffd700, 0xa52a2a],
    outfitPrimary: [0x8b0000, 0x006400, 0x00008b, 0x4b0082, 0x8b4513, 0x2f4f4f, 0x800080, 0xdaa520],
    outfitSecondary: [0xcd853f, 0xf4a460, 0xdeb887, 0xd2b48c, 0x708090, 0xbc8f8f, 0xc0c0c0, 0xffd700]
};

// ═══════════════════════════════════════════════════════════════════════════════
// NPC DATA - Dialogues, Shop Inventories, Appearances
// ═══════════════════════════════════════════════════════════════════════════════

const NPC_DATA = {
    wanderer: {
        name: "Eldric the Wanderer",
        title: "Traveling Sage",
        type: "lore",
        appearance: { skin: 0, hair: 5, outfit1: 5, outfit2: 0, hasBeard: true, hatType: 'hood' },
        dialogues: [
            {
                text: "Ah, another soul drawn to these <span class='highlight'>ancient lands</span>. I've walked these paths for thirty winters now, and still the mysteries reveal themselves slowly, like morning fog lifting from the valley.",
                options: [
                    { text: "What mysteries do you speak of?", next: 1 },
                    { text: "Tell me about these lands.", next: 2 },
                    { text: "Farewell, traveler.", action: 'close' }
                ]
            },
            {
                text: "The <span class='highlight'>Forgotten Ones</span> built the ruins you see scattered across these hills. They were master craftsmen, wielding magic we can scarcely comprehend. Some say they didn't die... they simply <span class='highlight'>transcended</span>, leaving their physical forms behind.",
                options: [
                    { text: "Who were the Forgotten Ones?", next: 3 },
                    { text: "What happened to them?", next: 4 },
                    { text: "Interesting. Thank you.", action: 'close' }
                ]
            },
            {
                text: "These lands were once called <span class='highlight'>Valdris</span>, the Shimmering Realm. Before the <span class='highlight'>Sundering</span>, this was the heart of a vast empire that stretched beyond the horizon. Now only echoes remain.",
                options: [
                    { text: "What was the Sundering?", next: 5 },
                    { text: "An empire? Tell me more.", next: 6 },
                    { text: "A beautiful place indeed.", action: 'close' }
                ]
            },
            {
                text: "The Forgotten Ones were the <span class='highlight'>First Children</span> of this world. Born from starlight and stone, they shaped the very mountains with their songs. Their cities floated among the clouds, and their knowledge of the arcane was without equal.",
                options: [
                    { text: "Where did they go?", next: 4 },
                    { text: "Can their magic still be found?", next: 7 },
                    { text: "Fascinating tales.", action: 'close' }
                ]
            },
            {
                text: "When the <span class='highlight'>Void Breach</span> opened in the eastern mountains, the Forgotten Ones sacrificed themselves to seal it. Every last one poured their essence into a barrier that holds to this day. Their empty cities still stand as monuments.",
                options: [
                    { text: "The Void Breach... is it still dangerous?", next: 8 },
                    { text: "A noble sacrifice.", action: 'close' }
                ]
            },
            {
                text: "The Sundering was the cataclysm that ended the <span class='highlight'>Age of Wonder</span>. When the Forgotten Ones sealed the Void Breach, the magical backlash shattered continents. Mountains rose where seas once lay.",
                options: [
                    { text: "How did anyone survive?", next: 9 },
                    { text: "Heavy history to carry.", action: 'close' }
                ]
            },
            {
                text: "The Valdrian Empire lasted three thousand years. Its capital, <span class='highlight'>Solanthus</span>, had towers that touched the clouds. All that remains now are scattered ruins and half-remembered legends.",
                options: [
                    { text: "Can Solanthus be found?", next: 10 },
                    { text: "Lost to time, then.", action: 'close' }
                ]
            },
            {
                text: "Echoes of their power linger in certain places. The shrines still hold fragments of blessing. And deep within ancient ruins, artifacts of immense power await those brave enough to seek them.",
                options: [
                    { text: "I shall seek these artifacts.", action: 'close' },
                    { text: "Perhaps some things are best left buried.", action: 'close' }
                ]
            },
            {
                text: "The barrier weakens with each century. The <span class='highlight'>Shadow Cults</span> work to hasten its fall. They are fools. What lies beyond would consume everything—light, life, even memory itself.",
                options: [
                    { text: "How can the barrier be strengthened?", next: 11 },
                    { text: "I will be watchful for these cults.", action: 'close' }
                ]
            },
            {
                text: "The ancestors were protected by <span class='highlight'>Guardian Spirits</span>—beings of pure light who sheltered survivors. When the chaos subsided, these spirits faded. But some say they can still be called upon in dire need.",
                options: [
                    { text: "How does one call a Guardian Spirit?", next: 12 },
                    { text: "A comforting thought.", action: 'close' }
                ]
            },
            {
                text: "Legends say Solanthus lies beneath the <span class='highlight'>Whispering Peaks</span>, buried but not destroyed. If one could find the entrance... but many have searched. Many have perished.",
                options: [
                    { text: "I may try to find it someday.", action: 'close' },
                    { text: "Some secrets should remain hidden.", action: 'close' }
                ]
            },
            {
                text: "Ancient texts speak of <span class='highlight'>Resonance Crystals</span>—fragments of the original barrier. Finding and reuniting them could restore the seal. But they are scattered, and the Shadow Cults seek them too.",
                options: [
                    { text: "I will search for these crystals.", action: 'close' },
                    { text: "A quest for another time.", action: 'close' }
                ]
            },
            {
                text: "Stand within a circle of ancient stones when the moon is full, and speak: '<span class='highlight'>Luminos veru, guardias awakos</span>.' But be warned—the spirits judge harshly. Only call upon them in true desperation.",
                options: [
                    { text: "I will remember this.", action: 'close' },
                    { text: "Thank you for sharing this wisdom.", action: 'close' }
                ]
            }
        ]
    },
    
    herbalist: {
        name: "Mira Thornweave",
        title: "Master Herbalist",
        type: "lore",
        appearance: { skin: 3, hair: 2, outfit1: 1, outfit2: 3, hasBeard: false, hatType: 'none' },
        dialogues: [
            {
                text: "Mind your step—the <span class='highlight'>Moonpetal</span> blooms are delicate this time of year. I've spent decades learning the secrets these plants hold. Every leaf tells a story.",
                options: [
                    { text: "What can you tell me about the local flora?", next: 1 },
                    { text: "Are you a healer?", next: 2 },
                    { text: "I'll be careful. Farewell.", action: 'close' }
                ]
            },
            {
                text: "These forests are a living pharmacy. <span class='highlight'>Starbloom</span> for clarity, <span class='highlight'>Bloodroot</span> for strength, <span class='highlight'>Whisperleaf</span> to calm spirits. But the most precious is <span class='highlight'>Voidsbane</span>—it protects against shadow corruption.",
                options: [
                    { text: "Tell me about Voidsbane.", next: 3 },
                    { text: "Where can I find these herbs?", next: 4 },
                    { text: "Valuable knowledge. Thank you.", action: 'close' }
                ]
            },
            {
                text: "Healer, herbalist, witch—I've been called many things. My grandmother taught me the old ways, passed down from the <span class='highlight'>Grove Keepers</span> who tended these lands before the Sundering.",
                options: [
                    { text: "Who were the Grove Keepers?", next: 5 },
                    { text: "The old ways still have power?", next: 6 },
                    { text: "A noble tradition.", action: 'close' }
                ]
            },
            {
                text: "Voidsbane grows only where the barrier is thin—near ancient ruins. Its silver leaves glow at night. Steep it in moonwater before entering places touched by shadow. It saved my life more than once.",
                options: [
                    { text: "How do I make moonwater?", next: 7 },
                    { text: "I'll keep an eye out for it.", action: 'close' }
                ]
            },
            {
                text: "The rarest herbs grow in dangerous places. <span class='highlight'>Sunfire Lily</span> needs volcanic soil. <span class='highlight'>Frost Orchid</span> requires eternal ice. But common healing herbs? Look for clearings or stream banks.",
                options: [
                    { text: "What's the most dangerous herb?", next: 8 },
                    { text: "Good advice for foraging.", action: 'close' }
                ]
            },
            {
                text: "The Grove Keepers were druids bound to the land. They could speak with trees and sense disturbances miles away. When the Sundering came, most perished protecting their sacred groves. My grandmother was among the few survivors.",
                options: [
                    { text: "Do any Grove Keepers remain?", next: 9 },
                    { text: "A heavy loss for the world.", action: 'close' }
                ]
            },
            {
                text: "Oh yes. The land remembers. The ley lines still pulse with energy. The ancient trees still whisper secrets to those who know how to listen. Magic isn't gone—it's waiting to be rediscovered.",
                options: [
                    { text: "Can you teach me to listen?", next: 10 },
                    { text: "Perhaps I will learn in time.", action: 'close' }
                ]
            },
            {
                text: "Collect water from a spring under full moonlight. Let it sit in a silver vessel for three nights, speaking words of protection each evening. The moon's essence will infuse the water with purifying properties.",
                options: [
                    { text: "I'll remember this recipe.", action: 'close' },
                    { text: "Thank you for the knowledge.", action: 'close' }
                ]
            },
            {
                text: "<span class='highlight'>Nightshade's Kiss</span>. Beautiful purple flowers that smell of honey and death. A single drop can stop a heart. The Shadow Cults cultivate it. If you see purple flowers with black centers—do not touch.",
                options: [
                    { text: "I'll be wary of it.", action: 'close' },
                    { text: "Even nature has its dangers.", action: 'close' }
                ]
            },
            {
                text: "A handful remain, scattered and hidden. We keep the old traditions alive in secret. There's a gathering place in the deep forest, but I cannot reveal it to outsiders. Perhaps, in time, if you prove yourself...",
                options: [
                    { text: "I understand. Trust must be earned.", action: 'close' },
                    { text: "I will respect the wild places.", action: 'close' }
                ]
            },
            {
                text: "Find an ancient tree with roots that reach deep. Sit with your back against its bark at twilight. Clear your mind. In time, you may hear whispers. But be patient. The land does not speak to the impatient.",
                options: [
                    { text: "I will try this meditation.", action: 'close' },
                    { text: "Patience is difficult, but I'll try.", action: 'close' }
                ]
            }
        ]
    },
    
    weaponsmith: {
        name: "Grimjaw Ironhand",
        title: "Master Weaponsmith",
        type: "trader",
        hasShop: true,
        appearance: { skin: 4, hair: 1, outfit1: 4, outfit2: 6, hasBeard: true, hatType: 'none' },
        shopInventory: [
            { id: 'mace', name: 'Holy Mace', price: 180, icon: 'mace', desc: 'Paladin weapon - Blessed flanged mace for smiting evil', type: 'weapon', class: 'Paladin', damage: 25, attackSpeed: 0.8, level: 3, wisdom: 2, lightRes: 5 },
            { id: 'flintlock', name: 'Ironworks Flintlock', price: 220, icon: 'flintlock', desc: 'Machinist weapon - Precise ranged firearm', type: 'weapon', class: 'Machinist', damage: 30, attackSpeed: 1.2, level: 4, dexterity: 2, critChance: 5 },
            { id: 'lance', name: 'Dragoon Lance', price: 200, icon: 'lance', desc: 'Dragoon weapon - Long reach for aerial strikes', type: 'weapon', class: 'Dragoon', damage: 28, attackSpeed: 1.0, level: 4, strength: 2, dexterity: 1 },
            { id: 'longbow', name: 'Ranger Longbow', price: 160, icon: 'longbow', desc: 'Ranger weapon - Silent and deadly at range', type: 'weapon', class: 'Ranger', damage: 22, attackSpeed: 0.9, level: 3, dexterity: 3 },
            { id: 'katana', name: 'Iaijutsu Katana', price: 250, icon: 'katana', desc: 'Samurai weapon - Swift slashing blade', type: 'weapon', class: 'Samurai', damage: 26, attackSpeed: 0.6, level: 4, dexterity: 2, critChance: 8 },
            { id: 'staff', name: 'Arcane Staff', price: 190, icon: 'staff', desc: 'Mage weapon - Channels magical energy', type: 'weapon', class: 'Mage', damage: 18, attackSpeed: 1.1, level: 3, intelligence: 3, bonusMp: 10 },
            { id: 'broadsword', name: 'Knight Broadsword', price: 210, icon: 'broadsword', desc: 'Knight weapon - Heavy two-handed blade', type: 'weapon', class: 'Knight', damage: 32, attackSpeed: 1.3, level: 4, strength: 3 },
            { id: 'dagger', name: 'Shadow Dagger', price: 140, icon: 'dagger', desc: 'Thief weapon - Quick strikes from the shadows', type: 'weapon', class: 'Thief', damage: 15, attackSpeed: 0.4, level: 2, dexterity: 2, critChance: 10 },
            { id: 'steel_helm', name: 'Forged Steel Helm', price: 150, icon: 'steel_helm', desc: 'Master-crafted helmet of hardened steel', type: 'armor', slot: 'helmet', armorClass: 'Heavy', defense: 8, physRes: 5, level: 4 },
            { id: 'steel_pauldrons', name: 'Steel Pauldrons', price: 175, icon: 'steel_pauldrons', desc: 'Heavy shoulder guards of finest steel', type: 'armor', slot: 'pauldrons', armorClass: 'Heavy', defense: 9, physRes: 4, strength: 1, level: 4 },
            { id: 'steel_cuirass', name: 'Ironhand Cuirass', price: 350, icon: 'iron_cuirass', desc: 'Grimjaws masterwork - near impenetrable', type: 'armor', slot: 'chestpiece', armorClass: 'Heavy', defense: 18, physRes: 8, level: 5 },
            { id: 'steel_greaves', name: 'Steel Greaves', price: 180, icon: 'steel_greaves', desc: 'Leg protection forged from folded steel', type: 'armor', slot: 'greaves', armorClass: 'Heavy', defense: 10, physRes: 5, level: 4 },
            { id: 'steel_boots', name: 'Ironshod Boots', price: 125, icon: 'ironshod_boots', desc: 'Heavy boots that never wear out', type: 'armor', slot: 'boots', armorClass: 'Heavy', defense: 6, physRes: 3, level: 3 }
        ],
        dialogues: [
            {
                text: "*The sound of hammer on anvil rings out* Aye, another customer! <span class='highlight'>Grimjaw's the name</span>, and fine weapons are my trade. Every blade from my forge holds its edge through a hundred battles.",
                options: [
                    { text: "Show me your wares.", action: 'shop', icon: 'gold' },
                    { text: "Tell me about your craft.", next: 1 },
                    { text: "How did you become a smith?", next: 2 },
                    { text: "Just looking around. Farewell.", action: 'close' }
                ]
            },
            {
                text: "Forging a true weapon is art. The metal must be heated to the right color—<span class='highlight'>cherry red for folding, yellow for shaping</span>. The hammer rhythm must be steady. And the quench... too fast and it shatters. Too slow and it won't hold an edge.",
                options: [
                    { text: "Show me your wares.", action: 'shop', icon: 'gold' },
                    { text: "What makes a blade magical?", next: 3 },
                    { text: "Impressive knowledge.", action: 'close' }
                ]
            },
            {
                text: "My father was a smith, and his father before him. The <span class='highlight'>Ironhand clan</span> has been forging since before the Sundering. We survived because the world always needs weapons. War is the one constant.",
                options: [
                    { text: "Show me your wares.", action: 'shop', icon: 'gold' },
                    { text: "Did your family know the Forgotten Ones?", next: 4 },
                    { text: "A proud lineage.", action: 'close' }
                ]
            },
            {
                text: "*Leans in* True enchantment requires more than skill. The metal must be forged under specific stars, cooled in <span class='highlight'>sacred springs</span>, blessed by one who knows the old words. I've made a few such weapons, but they're not for just anyone.",
                options: [
                    { text: "How might I earn such a weapon?", next: 5 },
                    { text: "Show me your regular wares.", action: 'shop', icon: 'gold' },
                    { text: "Perhaps another time.", action: 'close' }
                ]
            },
            {
                text: "Aye! My ancestors forged weapons for the <span class='highlight'>Guardian Knights</span> of Solanthus. I still have the original Ironhand forge-hammer. It's said to contain a fragment of a Forgotten One's power.",
                options: [
                    { text: "Could you teach me smithing?", next: 6 },
                    { text: "A precious heirloom.", action: 'close' }
                ]
            },
            {
                text: "Bring me rare materials—<span class='highlight'>Void-touched ore</span> from deep mines, or <span class='highlight'>Starfall metal</span> from where sky-stones landed. Prove yourself in battle. Then we'll talk about legendary weapons.",
                options: [
                    { text: "I'll find these materials.", action: 'close' },
                    { text: "Show me what you have now.", action: 'shop', icon: 'gold' }
                ]
            },
            {
                text: "Ha! Smithing isn't learned from words. It's learned from burning your hands and ruining a hundred blades. But... bring me <span class='highlight'>ten iron ingots</span> and I'll show you the basics. Fair warning—it takes years to become competent.",
                options: [
                    { text: "I may take you up on that.", action: 'close' },
                    { text: "For now, let me see your stock.", action: 'shop', icon: 'gold' }
                ]
            }
        ]
    },
    
    armorsmith: {
        name: "Helena Steelweave",
        title: "Master Armorsmith",
        type: "trader",
        hasShop: true,
        appearance: { skin: 2, hair: 3, outfit1: 4, outfit2: 5, hasBeard: false, hatType: 'none' },
        shopInventory: [
            { id: 'chain_coif', name: 'Chain Coif', price: 85, icon: 'chain_coif', desc: 'Flexible chainmail head protection', type: 'armor', slot: 'helmet', armorClass: 'Medium', defense: 4, physRes: 2, level: 2 },
            { id: 'chain_mantle', name: 'Chain Mantle', price: 120, icon: 'chain_mantle', desc: 'Linked rings protect the shoulders', type: 'armor', slot: 'pauldrons', armorClass: 'Medium', defense: 5, physRes: 3, level: 2 },
            { id: 'chain_hauberk', name: 'Chain Hauberk', price: 200, icon: 'chain_hauberk', desc: 'Full torso chainmail - ranger favorite', type: 'armor', slot: 'chestpiece', armorClass: 'Medium', defense: 10, physRes: 4, dexterity: 1, level: 3 },
            { id: 'chain_chausses', name: 'Chain Chausses', price: 140, icon: 'chain_chausses', desc: 'Chainmail leg protection', type: 'armor', slot: 'greaves', armorClass: 'Medium', defense: 6, physRes: 3, level: 2 },
            { id: 'reinforced_boots', name: 'Reinforced Leather Boots', price: 75, icon: 'reinforced_boots', desc: 'Leather boots with metal plates', type: 'armor', slot: 'boots', armorClass: 'Medium', defense: 3, physRes: 2, bonusStamina: 10, level: 2 },
            { id: 'fireproof_cloak', name: 'Fireproof Cloak', price: 180, icon: 'fireproof_cloak', desc: 'Treated cloth that resists flames', type: 'armor', slot: 'chestpiece', armorClass: 'Light', defense: 4, fireRes: 15, level: 3 },
            { id: 'frostward_mantle', name: 'Frostward Mantle', price: 180, icon: 'frostward_mantle', desc: 'Fur-lined guards against bitter cold', type: 'armor', slot: 'pauldrons', armorClass: 'Light', defense: 4, iceRes: 15, level: 3 },
            { id: 'adventurer_belt', name: "Adventurer's Utility Belt", price: 90, icon: 'belt', desc: 'Many pouches for many tools', type: 'armor', slot: 'belt', defense: 2, dexterity: 1, bonusStamina: 20, level: 2 },
            { id: 'iron_bracers', name: 'Iron Bracers', price: 65, icon: 'trinket', desc: 'Arm guards that deflect blows', type: 'armor', slot: 'trinket', defense: 3, physRes: 3, level: 2 },
            { id: 'vitality_pendant', name: 'Pendant of Vitality', price: 150, icon: 'necklace', desc: 'Enchanted to strengthen the body', type: 'armor', slot: 'necklace', constitution: 3, bonusHp: 25, level: 3 },
            { id: 'agility_ring', name: 'Ring of Agility', price: 130, icon: 'ring', desc: 'Enhances reflexes and speed', type: 'armor', slot: 'ring1', dexterity: 3, critChance: 3, level: 3 },
            { id: 'berserker_ring', name: "Berserker's Band", price: 175, icon: 'strength_ring', desc: 'Power at a cost - reduces defense', type: 'armor', slot: 'ring2', strength: 4, attack: 5, defense: -2, level: 4 }
        ],
        dialogues: [
            {
                text: "*Examines a piece of chainmail* Ah, a customer! <span class='highlight'>Helena Steelweave</span>, master armorsmith. I craft protection that keeps adventurers alive. What good is a sharp sword if you're dead before you can swing it?",
                options: [
                    { text: "Show me your wares.", action: 'shop', icon: 'gold' },
                    { text: "What makes good armor?", next: 1 },
                    { text: "Perhaps later. Farewell.", action: 'close' }
                ]
            },
            {
                text: "Good armor is about <span class='highlight'>balance</span>. Too heavy and you can't move. Too light and you can't survive. The best armor fits so well you forget you're wearing it—until a blade bounces off.",
                options: [
                    { text: "Show me what you have.", action: 'shop', icon: 'gold' },
                    { text: "How do you achieve that balance?", next: 2 },
                    { text: "Sound advice. Thank you.", action: 'close' }
                ]
            },
            {
                text: "Years of experience. I <span class='highlight'>measure each customer</span> carefully. I watch how they move. A dancer needs different armor than a brawler. Some want protection, others want freedom. I craft for the person, not the purse.",
                options: [
                    { text: "Craft something for me then!", action: 'shop', icon: 'gold' },
                    { text: "A true artisan's approach.", action: 'close' }
                ]
            }
        ]
    },
    
    scholar: {
        name: "Professor Aldwin Quill",
        title: "Arcane Scholar",
        type: "lore",
        appearance: { skin: 0, hair: 7, outfit1: 2, outfit2: 4, hasBeard: false, hatType: 'wizard' },
        dialogues: [
            {
                text: "*Adjusts spectacles* A visitor! Wonderful! I was translating some <span class='highlight'>fascinating runes</span> from the eastern ruins. The grammar is extraordinary—a whole tense system for events that happen in dreams!",
                options: [
                    { text: "You study the ancient language?", next: 1 },
                    { text: "What have the ruins revealed?", next: 2 },
                    { text: "You seem... very enthusiastic.", next: 3 },
                    { text: "I should leave you to your work.", action: 'close' }
                ]
            },
            {
                text: "Study it? I've dedicated my <span class='highlight'>entire life</span> to it! The language of the Forgotten Ones isn't merely communication—it's a tool of creation. Their words had <span class='highlight'>power</span>. To speak properly was to reshape reality!",
                options: [
                    { text: "Can you teach me any words?", next: 4 },
                    { text: "Is that how they did magic?", next: 5 },
                    { text: "Dangerous knowledge, perhaps.", action: 'close' }
                ]
            },
            {
                text: "The ruins are a <span class='highlight'>treasure trove</span>! Records of daily life, governance, beliefs. They worshipped concepts—<span class='highlight'>Truth, Beauty, Change, and Stillness</span>. Four pillars of their philosophy.",
                options: [
                    { text: "Tell me about these pillars.", next: 6 },
                    { text: "Any practical discoveries?", next: 7 },
                    { text: "Philosophy isn't my strength.", action: 'close' }
                ]
            },
            {
                text: "*Laughs nervously* I've been told I can be <span class='highlight'>intense</span>. But these aren't just dusty words—they're the key to understanding magic itself! The very foundation of reality!",
                options: [
                    { text: "I'd like to understand better.", next: 1 },
                    { text: "Your passion is admirable.", action: 'close' }
                ]
            },
            {
                text: "Simple ones, perhaps. '<span class='highlight'>Luminos</span>'—light. '<span class='highlight'>Aquos</span>'—water. '<span class='highlight'>Terros</span>'—earth. But speaking them with true intent can have <span class='highlight'>unintended consequences</span>. I once turned my lunch into a small thundercloud.",
                options: [
                    { text: "How do I speak with 'true intent'?", next: 8 },
                    { text: "I'll be careful with these words.", action: 'close' }
                ]
            },
            {
                text: "Precisely! Their magic wasn't waving wands. It was <span class='highlight'>speaking truth into being</span>. If you could perfectly describe something in their language—truly, completely—that thing would exist. Creation through definition!",
                options: [
                    { text: "Could I learn this magic?", next: 9 },
                    { text: "A powerful and dangerous ability.", action: 'close' }
                ]
            },
            {
                text: "Truth was pursuit of understanding. Beauty was appreciation of harmony. Change embraced growth. Stillness honored peace and reflection. They believed <span class='highlight'>balance</span> between these four led to enlightenment.",
                options: [
                    { text: "A wise philosophy.", action: 'close' },
                    { text: "Which pillar do you follow?", next: 10 }
                ]
            },
            {
                text: "I've reconstructed several <span class='highlight'>minor enchantments</span>. A charm for keeping books dry. Ink that never fades. Small proofs that the techniques still work! With more research...",
                options: [
                    { text: "Could you enchant something for me?", next: 11 },
                    { text: "Keep up the good work.", action: 'close' }
                ]
            },
            {
                text: "Intent comes from <span class='highlight'>heart and mind aligned</span>. You must truly mean what you say, visualize it completely, believe utterly in the outcome. Any doubt and the words are just... words. It takes years of meditation.",
                options: [
                    { text: "I will practice this.", action: 'close' },
                    { text: "More difficult than I thought.", action: 'close' }
                ]
            },
            {
                text: "In theory, yes. In practice... a <span class='highlight'>lifetime of study</span>. Over forty thousand words, each with precise pronunciation. But small effects? Those are achievable with dedication.",
                options: [
                    { text: "I have time to learn.", action: 'close' },
                    { text: "Perhaps I'll start small.", action: 'close' }
                ]
            },
            {
                text: "*Smiles* Truth, of course. I seek to understand, to reveal what is hidden. Though sometimes I envy those who follow Change. They embrace the new without fear.",
                options: [
                    { text: "Self-awareness is valuable.", action: 'close' },
                    { text: "Perhaps balance is your path.", action: 'close' }
                ]
            },
            {
                text: "For a price! Enchanting requires rare materials—<span class='highlight'>memory crystals</span> to hold patterns, <span class='highlight'>essence dust</span> to power it. Bring me such things, and I'll try. Fair warning: my success rate is only... seventy percent.",
                options: [
                    { text: "I'll gather the materials.", action: 'close' },
                    { text: "Seventy percent seems risky.", action: 'close' }
                ]
            }
        ]
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// NPC CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class NPC {
    constructor(x, z, dataKey) {
        this.data = NPC_DATA[dataKey];
        this.dataKey = dataKey;
        this.posX = x;
        this.posZ = z;
        this.interactionRadius = 8;
        
        this.group = new THREE.Group();
        this.createModel();
        
        const groundY = _deps.getHeight(x, z);
        this.group.position.set(x, groundY, z);
        this.baseY = groundY;
        
        this.animTime = Math.random() * Math.PI * 2;
        this.bobSpeed = 0.8 + Math.random() * 0.4;
        
        if (_deps.scene) {
            _deps.scene.add(this.group);
        }
        npcList.push(this);
    }
    
    createModel() {
        const app = this.data.appearance;
        const skinColor = NPC_APPEARANCES.skinTones[app.skin];
        const hairColor = NPC_APPEARANCES.hairColors[app.hair];
        const outfit1 = NPC_APPEARANCES.outfitPrimary[app.outfit1];
        const outfit2 = NPC_APPEARANCES.outfitSecondary[app.outfit2];
        
        const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
        const outfitMat = new THREE.MeshStandardMaterial({ color: outfit1, roughness: 0.7 });
        const outfit2Mat = new THREE.MeshStandardMaterial({ color: outfit2, roughness: 0.75 });
        
        // Torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), outfitMat);
        torso.position.y = 1.4;
        torso.castShadow = false;
        this.group.add(torso);
        this.torso = torso;
        
        // Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.5), skinMat);
        head.position.y = 2.3;
        this.group.add(head);
        
        // Hair
        const hair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.55), hairMat);
        hair.position.set(0, 2.55, 0);
        this.group.add(hair);
        
        const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.15), hairMat);
        hairBack.position.set(0, 2.35, -0.2);
        this.group.add(hairBack);
        
        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
        leftEye.position.set(-0.12, 2.35, 0.25);
        this.group.add(leftEye);
        
        const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), eyeMat);
        rightEye.position.set(0.12, 2.35, 0.25);
        this.group.add(rightEye);
        
        // Beard
        if (app.hasBeard) {
            const beard = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.2), hairMat);
            beard.position.set(0, 2.05, 0.2);
            this.group.add(beard);
        }
        
        // Hat
        if (app.hatType === 'hood') {
            const hood = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 6), outfitMat);
            hood.position.set(0, 2.7, 0.05);
            this.group.add(hood);
        } else if (app.hatType === 'wizard') {
            const hat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 8), outfit2Mat);
            hat.position.set(0, 2.9, 0);
            this.group.add(hat);
            
            const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 8), outfit2Mat);
            hatBrim.position.set(0, 2.55, 0);
            this.group.add(hatBrim);
        }
        
        // Arms
        this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), outfitMat);
        this.leftArm.position.set(-0.5, 1.35, 0);
        this.group.add(this.leftArm);
        
        this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), outfitMat);
        this.rightArm.position.set(0.5, 1.35, 0);
        this.group.add(this.rightArm);
        
        // Hands
        const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.18), skinMat);
        leftHand.position.set(-0.5, 0.8, 0);
        this.group.add(leftHand);
        
        const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.18), skinMat);
        rightHand.position.set(0.5, 0.8, 0);
        this.group.add(rightHand);
        
        // Legs
        this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), outfit2Mat);
        this.leftLeg.position.set(-0.2, 0.45, 0);
        this.group.add(this.leftLeg);
        
        this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), outfit2Mat);
        this.rightLeg.position.set(0.2, 0.45, 0);
        this.group.add(this.rightLeg);
        
        // Belt
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.15, 0.55), outfit2Mat);
        belt.position.y = 0.9;
        this.group.add(belt);
        
        // Trader apron
        if (this.data.type === 'trader') {
            const apron = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), outfit2Mat);
            apron.position.set(0, 1.1, -0.3);
            this.group.add(apron);
        }
    }
    
    update(time, playerPos) {
        this.animTime += 0.016 * this.bobSpeed;
        
        const bob = Math.sin(this.animTime * 2) * 0.03;
        this.group.position.y = this.baseY + bob;
        
        const armSway = Math.sin(this.animTime * 1.5) * 0.1;
        if (this.leftArm) this.leftArm.rotation.x = armSway;
        if (this.rightArm) this.rightArm.rotation.x = -armSway;
        
        // Face toward the player when nearby
        const dx = playerPos.x - this.group.position.x;
        const dz = playerPos.z - this.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 15) {
            const targetRot = Math.atan2(dx, dz);
            let rotDiff = targetRot - this.group.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.group.rotation.y += rotDiff * 0.08;
        }
    }
    
    getDistance(px, pz) {
        const dx = this.posX - px;
        const dz = this.posZ - pz;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    startDialogue() {
        if (_deps.DialogueSystem) {
            _deps.DialogueSystem.openDialogue(this, { startIndex: 0 });
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NPC SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const NPCSystem = {
    init(deps) {
        Object.assign(_deps, deps);
    },
    
    createNPC(x, z, dataKey) {
        if (NPC_DATA[dataKey]) {
            return new NPC(x, z, dataKey);
        }
        console.warn(`NPC data not found for key: ${dataKey}`);
        return null;
    },
    
    getList() {
        return npcList;
    },
    
    getBiomeList() {
        return biomeNPCList;
    },
    
    getData(key) {
        return NPC_DATA[key];
    },
    
    getAllData() {
        return NPC_DATA;
    },
    
    updateAll(time, playerPos) {
        npcList.forEach(npc => npc.update(time, playerPos));
        biomeNPCList.forEach(npc => npc.update(time, playerPos));
    },
    
    findNearest(px, pz, maxDist = Infinity) {
        let nearest = null;
        let nearestDist = maxDist;
        
        for (const npc of npcList) {
            const dist = npc.getDistance(px, pz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = npc;
            }
        }
        
        for (const npc of biomeNPCList) {
            const dist = npc.getDistance(px, pz);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = npc;
            }
        }
        
        return nearest;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    NPCSystem,
    NPC,
    NPC_DATA,
    NPC_APPEARANCES,
    npcList,
    biomeNPCList
};

export default NPCSystem;
