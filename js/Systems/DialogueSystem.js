// ═══════════════════════════════════════════════════════════════════════════════
// DIALOGUESYSTEM.JS - NPC Dialogue Management and Portrait Drawing
// Dependencies: ShopSystem, QuestSystem (optional)
// Injected: npcList, biomeNPCList, interiorNPCList, renderer, NPC_APPEARANCES
// Consumers: NPC interaction, Main game loop
// ═══════════════════════════════════════════════════════════════════════════════

// Injected dependencies
let _deps = {
    npcList: [],
    biomeNPCList: [],
    interiorNPCList: [],
    renderer: null,
    ShopSystem: null,
    QuestSystem: null,
    NPC_APPEARANCES: null,
    discoverLore: null,
    discoverEntry: null,
    addThought: null
};

const DialogueSystem = (function() {
    // Private state
    let _nearbyNPC = null;
    let _currentDialogue = null;
    
    // DOM element cache
    let _elements = null;
    function _getElements() {
        if (!_elements) {
            _elements = {
                overlay: document.getElementById('dialogue-overlay'),
                name: document.getElementById('npc-name'),
                title: document.getElementById('npc-title'),
                text: document.getElementById('dialogue-text'),
                options: document.getElementById('dialogue-options'),
                canvas: document.getElementById('npc-portrait-canvas'),
                prompt: document.getElementById('npc-prompt'),
                crosshair: document.getElementById('crosshair')
            };
        }
        return _elements;
    }
    
    // Private: Draw human NPC portrait
    function _drawHumanPortrait(appearance) {
        const els = _getElements();
        if (!els.canvas) return;
        
        const ctx = els.canvas.getContext('2d');
        const app = appearance;
        const NPC_APPEARANCES = _deps.NPC_APPEARANCES;
        
        if (!NPC_APPEARANCES) return;
        
        ctx.clearRect(0, 0, 80, 80);
        ctx.fillStyle = '#1a1030';
        ctx.fillRect(0, 0, 80, 80);
        
        const skinColor = '#' + NPC_APPEARANCES.skinTones[app.skin].toString(16).padStart(6, '0');
        const hairColor = '#' + NPC_APPEARANCES.hairColors[app.hair].toString(16).padStart(6, '0');
        const outfitColor = '#' + NPC_APPEARANCES.outfitPrimary[app.outfit1].toString(16).padStart(6, '0');
        
        ctx.fillStyle = outfitColor;
        ctx.fillRect(15, 55, 50, 25);
        
        ctx.fillStyle = skinColor;
        ctx.fillRect(32, 48, 16, 12);
        ctx.fillRect(22, 20, 36, 35);
        
        ctx.fillStyle = hairColor;
        ctx.fillRect(20, 12, 40, 15);
        ctx.fillRect(18, 20, 8, 25);
        ctx.fillRect(54, 20, 8, 25);
        
        ctx.fillStyle = '#222';
        ctx.fillRect(28, 32, 8, 6);
        ctx.fillRect(44, 32, 8, 6);
        ctx.fillStyle = '#fff';
        ctx.fillRect(30, 33, 4, 4);
        ctx.fillRect(46, 33, 4, 4);
        
        if (app.hasBeard) {
            ctx.fillStyle = hairColor;
            ctx.fillRect(28, 45, 24, 12);
        }
        
        if (app.hatType === 'hood') {
            ctx.fillStyle = outfitColor;
            ctx.beginPath();
            ctx.moveTo(40, 5);
            ctx.lineTo(58, 30);
            ctx.lineTo(22, 30);
            ctx.closePath();
            ctx.fill();
        } else if (app.hatType === 'wizard') {
            ctx.fillStyle = outfitColor;
            ctx.beginPath();
            ctx.moveTo(40, 0);
            ctx.lineTo(55, 18);
            ctx.lineTo(25, 18);
            ctx.closePath();
            ctx.fill();
            ctx.fillRect(15, 15, 50, 6);
        }
    }
    
    // Private: Draw biome creature portrait
    function _drawBiomePortrait(creatureType, biomeId) {
        const els = _getElements();
        if (!els.canvas) return;
        
        const ctx = els.canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 80, 80);
        
        const bgColors = {
            ancient_woodlands: ['#1a3020', '#2a4a2a'],
            crimson_dunes: ['#8b4513', '#d4a35a'],
            frozen_peaks: ['#4a6a8a', '#ddeeff'],
            murky_swamp: ['#2a3a2a', '#4a5a3a'],
            crystal_heights: ['#6644aa', '#aa88dd'],
            shadow_vale: ['#1a1a2a', '#3a2a4a']
        };
        const colors = bgColors[biomeId] || ['#333', '#666'];
        const gradient = ctx.createLinearGradient(0, 0, 0, 80);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 80, 80);
        
        const creatureColors = {
            treant: { body: '#3d5a3d', eyes: '#88ff88' },
            golem: { body: '#c4935a', eyes: '#ffa500' },
            frostkin: { body: '#aaccee', eyes: '#88ddff' },
            bogfolk: { body: '#4a5a3a', eyes: '#88ff44' },
            crystalline: { body: '#aa88dd', eyes: '#dd88ff' },
            wraith: { body: '#5a4a6a', eyes: '#9944ff' }
        };
        const creature = creatureColors[creatureType] || { body: '#666', eyes: '#fff' };
        ctx.fillStyle = creature.body;
        ctx.beginPath();
        ctx.arc(40, 35, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = creature.eyes;
        ctx.shadowColor = creature.eyes;
        ctx.shadowBlur = 6;
        ctx.fillRect(30, 32, 6, 4);
        ctx.fillRect(44, 32, 6, 4);
        ctx.shadowBlur = 0;
    }
    
    // Private: Draw generic portrait
    function _drawGenericPortrait() {
        const els = _getElements();
        if (!els.canvas) return;
        
        const ctx = els.canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 80, 80);
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 80, 80);
        ctx.fillStyle = '#e8b898';
        ctx.beginPath();
        ctx.arc(40, 35, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5c3317';
        ctx.fillRect(22, 12, 36, 14);
        ctx.fillStyle = '#222';
        ctx.fillRect(32, 32, 5, 5);
        ctx.fillRect(43, 32, 5, 5);
    }
    
    // Private: Trigger lore discoveries
    function _triggerLoreDiscoveries(npc) {
        const { discoverLore, discoverEntry } = _deps;
        if (!discoverLore) return;
        
        const key = npc.dataKey;
        if (key === 'wanderer') {
            discoverLore('sundering');
            discoverLore('mystic_forest');
        } else if (key === 'weaponsmith') {
            discoverLore('ironhand_clan');
        } else if (key === 'hermit') {
            discoverLore('forgotten_ones');
        }
        
        if (npc.data.type === 'trader' || npc.data.hasShop) {
            if (discoverEntry) {
                discoverEntry('towns', 'valdris_town');
            }
        }
    }
    
    // Private: Generate meeting thought
    function _generateMeetingThought(npcName) {
        const { addThought } = _deps;
        if (!addThought || Math.random() >= 0.3) return;
        
        const thoughts = [
            `Meeting ${npcName} has given me much to consider. Each person in this land carries their own burdens and wisdom.`,
            `I wonder what ${npcName} truly thinks of travelers like myself. Trust is hard-earned in these times.`,
            `The conversation with ${npcName} lingers in my mind. There is always more beneath the surface.`
        ];
        addThought(thoughts[Math.floor(Math.random() * thoughts.length)], `Speaking with ${npcName}`);
    }
    
    return {
        // Initialize with dependencies
        init(deps) {
            Object.assign(_deps, deps);
        },
        
        // === State Getters ===
        getNearbyNPC() { return _nearbyNPC; },
        getCurrentDialogue() { return _currentDialogue; },
        isDialogueActive() { return _currentDialogue !== null; },
        
        // === State Setters ===
        setNearbyNPC(npc) { _nearbyNPC = npc; },
        
        // === Dialogue Control ===
        openDialogue(npc, options = {}) {
            const els = _getElements();
            const data = npc.data;
            
            _currentDialogue = {
                npc,
                index: options.startIndex || 0,
                isInterior: options.isInterior || false,
                biomeId: options.biomeId || null
            };
            
            if (els.name) els.name.textContent = data.name;
            if (els.title) els.title.textContent = data.title;
            
            // Draw portrait
            if (options.biomeId && data.biomeType) {
                _drawBiomePortrait(data.biomeType, options.biomeId);
            } else if (data.appearance) {
                _drawHumanPortrait(data.appearance);
            } else {
                _drawGenericPortrait();
            }
            
            // Update content
            if (data.dialogues && data.dialogues[0]) {
                this.updateContent(data.dialogues[0]);
            }
            
            if (els.overlay) els.overlay.classList.add('open');
            if (els.crosshair) els.crosshair.classList.add('hidden');
            document.exitPointerLock();
            
            _triggerLoreDiscoveries(npc);
            _generateMeetingThought(data.name);
        },
        
        closeDialogue() {
            const els = _getElements();
            const { ShopSystem, renderer } = _deps;
            
            if (els.overlay) els.overlay.classList.remove('open');
            _currentDialogue = null;
            
            if (!ShopSystem || !ShopSystem.isOpen()) {
                if (els.crosshair) els.crosshair.classList.remove('hidden');
                if (renderer && renderer.domElement) {
                    renderer.domElement.requestPointerLock();
                }
            }
        },
        
        updateContent(dialogue) {
            const els = _getElements();
            const { QuestSystem } = _deps;
            
            if (els.text) els.text.innerHTML = dialogue.text;
            if (els.options) els.options.innerHTML = '';
            
            const npc = _currentDialogue ? _currentDialogue.npc : null;
            
            // Get quest options
            const questOptions = npc && QuestSystem && QuestSystem.getDialogueOptions ? 
                QuestSystem.getDialogueOptions(npc) : [];
            
            // Add quest options first
            questOptions.forEach((opt, i) => {
                const optEl = document.createElement('div');
                optEl.className = 'dialogue-option ' + (opt.cssClass || '');
                optEl.innerHTML = '<span class="option-num">' + (i + 1) + '</span><span>' + opt.text + '</span>';
                optEl.addEventListener('click', () => this.handleOption(opt));
                if (els.options) els.options.appendChild(optEl);
            });
            
            // Add regular dialogue options
            if (dialogue.options) {
                dialogue.options.forEach((opt, i) => {
                    const optEl = document.createElement('div');
                    optEl.className = 'dialogue-option' + (opt.action === 'shop' ? ' shop-option' : '');
                    optEl.innerHTML = '<span class="option-num">' + (questOptions.length + i + 1) + '</span><span>' + opt.text + '</span>';
                    optEl.addEventListener('click', () => this.handleOption(opt));
                    if (els.options) els.options.appendChild(optEl);
                });
            }
        },
        
        handleOption(opt) {
            const { ShopSystem, QuestSystem } = _deps;
            const npc = _currentDialogue ? _currentDialogue.npc : null;
            
            if (opt.action === 'close') {
                this.closeDialogue();
            } else if (opt.action === 'shop') {
                const npcRef = npc;
                this.closeDialogue();
                if (npcRef && ShopSystem) ShopSystem.open(npcRef);
            } else if (opt.action === 'quest' && npc && QuestSystem) {
                QuestSystem.accept(npc.dataKey);
                const status = QuestSystem.getStatus(npc.dataKey);
                if (status && status.quest) {
                    const quest = status.quest;
                    const acceptDialogue = {
                        text: `<span class='highlight'>Quest Accepted!</span><br><br>"${quest.name}"<br><br>${quest.description}<br><br><em>Check your Lore Book (J) for details.</em>`,
                        options: [{ text: "I'll get started right away.", action: 'close' }]
                    };
                    this.updateContent(acceptDialogue);
                } else {
                    this.closeDialogue();
                }
            } else if (opt.action === 'turnin' && npc && QuestSystem) {
                const completedQuest = QuestSystem.turnIn(npc.dataKey);
                if (completedQuest) {
                    let rewardText = `+${completedQuest.rewards.gold} gold, +${completedQuest.rewards.exp} experience`;
                    if (completedQuest.rewards.items && completedQuest.rewards.items.length > 0) {
                        const itemNames = completedQuest.rewards.items.map(i => {
                            const name = i.id.charAt(0).toUpperCase() + i.id.slice(1).replace(/_/g, ' ');
                            return i.count > 1 ? `${i.count}x ${name}` : name;
                        }).join(', ');
                        rewardText += `, ${itemNames}`;
                    }
                    const turnInDialogue = {
                        text: `<span class='highlight'>Quest Complete!</span><br><br>Excellent work! You've proven yourself capable.<br><br><em>Rewards: ${rewardText}</em>`,
                        options: [{ text: "Thank you.", action: 'close' }]
                    };
                    this.updateContent(turnInDialogue);
                } else {
                    this.closeDialogue();
                }
            } else if (opt.next !== undefined && npc) {
                _currentDialogue.index = opt.next;
                const dialogue = npc.data.dialogues[opt.next];
                if (dialogue) this.updateContent(dialogue);
            }
        },
        
        // === Prompt Control ===
        showPrompt(npcName) {
            const els = _getElements();
            if (els.prompt) {
                const nameEl = els.prompt.querySelector('.npc-name');
                if (nameEl) nameEl.textContent = npcName;
                els.prompt.classList.add('show');
            }
        },
        
        hidePrompt() {
            const els = _getElements();
            if (els.prompt) els.prompt.classList.remove('show');
        },
        
        // === Portrait Drawing (public) ===
        drawHumanPortrait(appearance) { _drawHumanPortrait(appearance); },
        drawBiomePortrait(type, biomeId) { _drawBiomePortrait(type, biomeId); },
        drawGenericPortrait() { _drawGenericPortrait(); },
        
        // === Update (called from animate loop) ===
        update(playerPosition, currentInteriorRef) {
            const { ShopSystem, npcList, biomeNPCList, interiorNPCList } = _deps;
            
            if (_currentDialogue || (ShopSystem && ShopSystem.isOpen())) {
                this.hidePrompt();
                _nearbyNPC = null;
                return;
            }
            
            // Check interior NPCs if in a building
            if (currentInteriorRef && currentInteriorRef.isBuilding && interiorNPCList) {
                let closest = null;
                let closestDist = Infinity;
                
                for (const npc of interiorNPCList) {
                    if (!npc.getWorldPosition) continue;
                    const worldPos = npc.getWorldPosition();
                    const dx = playerPosition.x - worldPos.x;
                    const dz = playerPosition.z - worldPos.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < npc.interactionRadius && dist < closestDist) {
                        closest = npc;
                        closestDist = dist;
                    }
                }
                
                if (closest) {
                    this.showPrompt(closest.data.name);
                    _nearbyNPC = { data: closest.data, isInterior: true, biomeId: closest.biomeId };
                } else {
                    this.hidePrompt();
                    _nearbyNPC = null;
                }
                return;
            }
            
            // Don't check exterior NPCs if in other interiors
            if (currentInteriorRef) {
                this.hidePrompt();
                _nearbyNPC = null;
                return;
            }
            
            let closest = null;
            let closestDist = Infinity;
            
            if (npcList) {
                for (const npc of npcList) {
                    if (!npc.getDistance) continue;
                    const dist = npc.getDistance(playerPosition.x, playerPosition.z);
                    if (dist < npc.interactionRadius && dist < closestDist) {
                        closest = npc;
                        closestDist = dist;
                    }
                }
            }
            
            if (biomeNPCList) {
                for (const npc of biomeNPCList) {
                    if (!npc.getDistance) continue;
                    const dist = npc.getDistance(playerPosition.x, playerPosition.z);
                    if (dist < npc.interactionRadius && dist < closestDist) {
                        closest = npc;
                        closestDist = dist;
                    }
                }
            }
            
            if (closest) {
                this.showPrompt(closest.data.name);
                _nearbyNPC = closest;
            } else {
                this.hidePrompt();
                _nearbyNPC = null;
            }
        },
        
        // === Interaction ===
        handleInteraction() {
            const { ShopSystem } = _deps;
            
            if (!_nearbyNPC || _currentDialogue || (ShopSystem && ShopSystem.isOpen())) return;
            
            if (_nearbyNPC.isInterior) {
                this.openDialogue(
                    { data: _nearbyNPC.data, dataKey: _nearbyNPC.dataKey || 'interior_npc' },
                    { isInterior: true, biomeId: _nearbyNPC.biomeId }
                );
            } else if (_nearbyNPC.startDialogue) {
                _nearbyNPC.startDialogue();
            } else {
                this.openDialogue(_nearbyNPC);
            }
        },
        
        // === Reset ===
        reset() {
            _nearbyNPC = null;
            _currentDialogue = null;
        }
    };
})();

export { DialogueSystem };
export default DialogueSystem;
