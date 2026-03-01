// ═══════════════════════════════════════════════════════════════════════════════
// ASSETS.JS - Icons, Materials, Shared Geometries
// Dependencies: THREE.js
// Consumers: UI, Inventory, Shop, Resources, NPCs
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// ITEM ICONS - SVG icons for inventory items
// ═══════════════════════════════════════════════════════════════════════════════

const itemIcons = {
    wood: '<svg viewBox="0 0 32 32" width="24" height="24"><ellipse cx="16" cy="16" rx="6" ry="10" fill="#8B6914"/><ellipse cx="16" cy="16" rx="4" ry="8" fill="#D2691E"/><circle cx="14" cy="12" r="2" fill="#5c3d1e"/></svg>',
    stone: '<svg viewBox="0 0 32 32" width="24" height="24"><polygon points="6,20 10,8 22,8 26,20 20,26 12,26" fill="#808080"/><polygon points="10,8 16,10 22,8 16,6" fill="#a0a0a0"/></svg>',
    fiber: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M8 28 Q16 4 16 4 Q16 4 24 28" stroke="#228b22" stroke-width="2" fill="none"/><path d="M12 28 Q16 8 16 8 Q16 8 20 28" stroke="#32cd32" stroke-width="2" fill="none"/></svg>',
    iron: '<svg viewBox="0 0 32 32" width="24" height="24"><polygon points="8,24 8,12 16,6 24,12 24,24 16,28" fill="#4a5568"/><polygon points="8,12 16,6 16,18 8,24" fill="#718096"/><path d="M12 14 L16 12 L20 14" stroke="#ffd700" stroke-width="1" fill="none"/></svg>',
    coal: '<svg viewBox="0 0 32 32" width="24" height="24"><polygon points="6,22 10,10 18,8 26,14 24,26 14,28" fill="#1a1a1a"/><path d="M14 16 L18 14 L20 18" stroke="#ff4500" stroke-width="1" fill="none"/></svg>',
    leather: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M6 8 Q16 4 26 8 L26 24 Q16 28 6 24 Z" fill="#8b4513"/><path d="M8 10 Q16 7 24 10 L24 22 Q16 25 8 22 Z" fill="#a0522d"/></svg>',
    planks: '<svg viewBox="0 0 32 32" width="24" height="24"><rect x="4" y="6" width="24" height="6" fill="#deb887"/><rect x="4" y="13" width="24" height="6" fill="#d2b48c"/><rect x="4" y="20" width="24" height="6" fill="#deb887"/></svg>',
    rope: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M8 6 Q24 10 24 16 Q24 22 8 26" stroke="#d2691e" stroke-width="3" fill="none"/></svg>',
    ironIngot: '<svg viewBox="0 0 32 32" width="24" height="24"><polygon points="4,20 10,10 26,10 28,14 22,24 6,24" fill="#4a5568"/><polygon points="10,10 26,10 28,14 12,14" fill="#718096"/></svg>',
    torch: '<svg viewBox="0 0 32 32" width="24" height="24"><rect x="13" y="16" width="6" height="12" fill="#8b4513"/><ellipse cx="16" cy="12" rx="5" ry="6" fill="#ff6600"/><ellipse cx="16" cy="10" rx="3" ry="4" fill="#ffcc00"/></svg>',
    betterAxe: '<svg viewBox="0 0 32 32" width="24" height="24"><rect x="14" y="10" width="4" height="18" fill="#8B5A2B"/><path d="M18 4h10v14l-5 5h-5V4z" fill="#4a5568"/></svg>',
    betterPick: '<svg viewBox="0 0 32 32" width="24" height="24"><rect x="15" y="10" width="3" height="18" fill="#8B5A2B"/><path d="M6 6h20l-3 8H9L6 6z" fill="#4a5568"/></svg>',
    // Armor Icons
    helmet: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M8 18 L8 12 Q8 4 16 4 Q24 4 24 12 L24 18 L20 20 L20 16 L12 16 L12 20 Z" fill="#4a5568"/><path d="M10 12 Q10 6 16 6 Q22 6 22 12 L22 16 L10 16 Z" fill="#718096"/><rect x="10" y="18" width="12" height="3" fill="#2d3748"/></svg>',
    pauldrons: '<svg viewBox="0 0 32 32" width="24" height="24"><ellipse cx="10" cy="14" rx="6" ry="8" fill="#4a5568"/><ellipse cx="22" cy="14" rx="6" ry="8" fill="#4a5568"/><path d="M10 8 Q16 4 22 8" stroke="#718096" stroke-width="2" fill="none"/><circle cx="10" cy="12" r="2" fill="#ffd700"/><circle cx="22" cy="12" r="2" fill="#ffd700"/></svg>',
    chestpiece: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M6 8 L12 6 L16 8 L20 6 L26 8 L26 26 L20 28 L16 26 L12 28 L6 26 Z" fill="#4a5568"/><path d="M8 10 L14 8 L16 10 L18 8 L24 10 L24 24 L18 26 L16 24 L14 26 L8 24 Z" fill="#718096"/><path d="M16 12 L16 22" stroke="#2d3748" stroke-width="2"/></svg>',
    greaves: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M8 4 L12 4 L12 24 L8 28 L8 4" fill="#4a5568"/><path d="M20 4 L24 4 L24 28 L20 24 L20 4" fill="#4a5568"/><path d="M9 6 L11 6 L11 22 L9 25 Z" fill="#718096"/><path d="M21 6 L23 6 L23 25 L21 22 Z" fill="#718096"/></svg>',
    boots: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M6 8 L12 8 L12 20 L6 24 L2 24 L2 20 L6 16 Z" fill="#4a5568"/><path d="M20 8 L26 8 L26 16 L30 20 L30 24 L26 24 L20 20 Z" fill="#4a5568"/><path d="M7 10 L11 10 L11 18 L7 21 Z" fill="#718096"/><path d="M21 10 L25 10 L25 18 L21 21 Z" fill="#718096"/></svg>',
    belt: '<svg viewBox="0 0 32 32" width="24" height="24"><rect x="2" y="12" width="28" height="8" rx="2" fill="#8b4513"/><rect x="12" y="10" width="8" height="12" rx="1" fill="#ffd700"/><rect x="14" y="13" width="4" height="6" fill="#4a5568"/></svg>',
    necklace: '<svg viewBox="0 0 32 32" width="24" height="24"><ellipse cx="16" cy="12" rx="10" ry="6" fill="none" stroke="#ffd700" stroke-width="2"/><circle cx="16" cy="24" r="5" fill="#a855f7"/><circle cx="16" cy="24" r="3" fill="#c084fc"/></svg>',
    ring: '<svg viewBox="0 0 32 32" width="24" height="24"><ellipse cx="16" cy="16" rx="10" ry="8" fill="none" stroke="#ffd700" stroke-width="3"/><ellipse cx="16" cy="16" rx="6" ry="4" fill="none" stroke="#c9a227" stroke-width="2"/><circle cx="16" cy="10" r="3" fill="#60a5fa"/></svg>',
    trinket: '<svg viewBox="0 0 32 32" width="24" height="24"><polygon points="16,2 20,12 30,12 22,18 26,28 16,22 6,28 10,18 2,12 12,12" fill="#a855f7"/><polygon points="16,6 18,12 24,12 20,16 22,22 16,18 10,22 12,16 8,12 14,12" fill="#c084fc"/></svg>',
    lockpicks: '<svg viewBox="0 0 32 32" width="24" height="24"><path d="M6 16 L20 16 L22 14 L24 16 L26 14" stroke="#718096" stroke-width="2" fill="none"/><path d="M6 20 L18 20 L20 18 L22 20" stroke="#4a5568" stroke-width="2" fill="none"/><circle cx="4" cy="16" r="2" fill="#718096"/><circle cx="4" cy="20" r="2" fill="#4a5568"/></svg>'
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const weatherIcons = {
    clear: '<svg viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="6" fill="#ffd700"/><g stroke="#ffd700" stroke-width="2"><line x1="16" y1="2" x2="16" y2="6"/><line x1="16" y1="26" x2="16" y2="30"/><line x1="2" y1="16" x2="6" y2="16"/><line x1="26" y1="16" x2="30" y2="16"/></g></svg>',
    light_rain: '<svg viewBox="0 0 32 32" width="28" height="28"><path d="M8 14 Q8 8 16 8 Q24 8 24 14 Q24 18 16 18 Q8 18 8 14" fill="#a0a0a0"/><line x1="10" y1="22" x2="8" y2="28" stroke="#4fc3f7" stroke-width="2"/><line x1="16" y1="22" x2="14" y2="28" stroke="#4fc3f7" stroke-width="2"/><line x1="22" y1="22" x2="20" y2="28" stroke="#4fc3f7" stroke-width="2"/></svg>',
    storm: '<svg viewBox="0 0 32 32" width="28" height="28"><path d="M6 12 Q6 6 16 6 Q26 6 26 12 Q26 16 16 16 Q6 16 6 12" fill="#606060"/><polygon points="16,16 12,22 15,22 13,30 20,20 17,20 19,16" fill="#ffd700"/></svg>',
    snow: '<svg viewBox="0 0 32 32" width="28" height="28"><path d="M8 12 Q8 6 16 6 Q24 6 24 12 Q24 16 16 16 Q8 16 8 12" fill="#d0d0d0"/><circle cx="10" cy="24" r="2" fill="#fff"/><circle cx="16" cy="26" r="2" fill="#fff"/><circle cx="22" cy="24" r="2" fill="#fff"/></svg>'
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPELL ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const spellIcons = {
    // Combat
    powerStrike: '<svg viewBox="0 0 32 32"><path d="M16 2 L20 14 L28 16 L20 18 L16 30 L12 18 L4 16 L12 14 Z" fill="#ff6b6b"/></svg>',
    whirlwind: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#ff6b6b" stroke-width="2"/><path d="M16 4 Q28 16 16 28 Q4 16 16 4" fill="none" stroke="#ff6b6b" stroke-width="2"/></svg>',
    shieldBash: '<svg viewBox="0 0 32 32"><path d="M8 6 L24 6 L24 20 L16 28 L8 20 Z" fill="#ff6b6b"/><path d="M12 10 L20 10 L20 18 L16 22 L12 18 Z" fill="#ffaaaa"/></svg>',
    rage: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="#ff6b6b"/><path d="M10 12 L14 16 L10 20" stroke="#fff" stroke-width="2" fill="none"/><path d="M22 12 L18 16 L22 20" stroke="#fff" stroke-width="2" fill="none"/></svg>',
    execute: '<svg viewBox="0 0 32 32"><path d="M6 6 L26 26 M26 6 L6 26" stroke="#ff6b6b" stroke-width="4"/><circle cx="16" cy="16" r="6" fill="none" stroke="#ff6b6b" stroke-width="2"/></svg>',
    // Magic
    fireball: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="#ff4500"/><circle cx="16" cy="16" r="5" fill="#ff6600"/><circle cx="16" cy="16" r="2" fill="#ffcc00"/></svg>',
    frostbolt: '<svg viewBox="0 0 32 32"><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="#4fc3f7"/><circle cx="16" cy="16" r="4" fill="#e1f5fe"/></svg>',
    lightning: '<svg viewBox="0 0 32 32"><polygon points="18,2 10,14 14,14 8,30 24,12 18,12 22,2" fill="#ffd700"/></svg>',
    heal: '<svg viewBox="0 0 32 32"><rect x="12" y="6" width="8" height="20" rx="2" fill="#4eff4e"/><rect x="6" y="12" width="20" height="8" rx="2" fill="#4eff4e"/></svg>',
    arcaneShield: '<svg viewBox="0 0 32 32"><path d="M16 4 L26 8 L26 18 L16 28 L6 18 L6 8 Z" fill="none" stroke="#a855f7" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="#a855f7"/></svg>',
    teleport: '<svg viewBox="0 0 32 32"><circle cx="10" cy="16" r="4" fill="none" stroke="#4fc3f7" stroke-width="2" stroke-dasharray="2,2"/><circle cx="22" cy="16" r="4" fill="#4fc3f7"/></svg>',
    // Survival
    secondWind: '<svg viewBox="0 0 32 32"><path d="M16 6 Q8 14 8 20 Q8 28 16 28 Q24 28 24 20 Q24 14 16 6" fill="#4ade80"/><path d="M12 18 L16 14 L20 18" stroke="#fff" stroke-width="2" fill="none"/><path d="M12 22 L16 18 L20 22" stroke="#fff" stroke-width="2" fill="none"/></svg>',
    regenerate: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#4ade80" stroke-width="2"/><path d="M16 8 L16 16 L22 16" stroke="#4ade80" stroke-width="2" fill="none"/><circle cx="16" cy="16" r="4" fill="#4ade80"/></svg>',
    hunker: '<svg viewBox="0 0 32 32"><path d="M16 4 L26 10 L26 22 L16 28 L6 22 L6 10 Z" fill="#4ade80"/><path d="M10 14 L22 14 M10 18 L22 18" stroke="#fff" stroke-width="2"/></svg>',
    harvest: '<svg viewBox="0 0 32 32"><path d="M12 6 Q16 2 20 6 L22 20 L16 26 L10 20 Z" fill="#4ade80"/><rect x="14" y="22" width="4" height="8" fill="#8b4513"/></svg>',
    skinning: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="10" ry="8" fill="#c4a574"/><path d="M8 14 Q16 10 24 14" stroke="#8b4513" stroke-width="2" fill="none"/></svg>',
    tracking: '<svg viewBox="0 0 32 32"><circle cx="10" cy="20" r="3" fill="#4ade80"/><circle cx="18" cy="14" r="3" fill="#4ade80"/><circle cx="24" cy="22" r="3" fill="#4ade80"/><path d="M10 20 L18 14 L24 22" stroke="#4ade80" stroke-width="1" fill="none" stroke-dasharray="2,2"/></svg>',
    campmaster: '<svg viewBox="0 0 32 32"><polygon points="16,8 20,18 26,26 16,22 6,26 12,18" fill="#ff6600"/><polygon points="16,12 18,18 22,22 16,20 10,22 14,18" fill="#ffcc00"/><rect x="8" y="24" width="16" height="4" fill="#8b4513"/></svg>',
    natureBond: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="10" fill="none" stroke="#4ade80" stroke-width="2"/><path d="M16 8 Q12 16 16 24 Q20 16 16 8" fill="#4ade80"/><circle cx="12" cy="14" r="2" fill="#4ade80"/><circle cx="20" cy="14" r="2" fill="#4ade80"/></svg>',
    // Utility
    sprint: '<svg viewBox="0 0 32 32"><path d="M8 24 L14 16 L10 16 L16 8 L12 8 L20 4" stroke="#ffd93d" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    stealth: '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="6" fill="none" stroke="#ffd93d" stroke-width="2" stroke-dasharray="3,2"/><path d="M10 20 Q16 28 22 20" fill="none" stroke="#ffd93d" stroke-width="2"/></svg>',
    detect: '<svg viewBox="0 0 32 32"><circle cx="14" cy="14" r="8" fill="none" stroke="#ffd93d" stroke-width="2"/><line x1="20" y1="20" x2="28" y2="28" stroke="#ffd93d" stroke-width="3"/></svg>',
    forage: '<svg viewBox="0 0 32 32"><path d="M16 4 Q20 8 20 14 Q20 20 16 24 Q12 20 12 14 Q12 8 16 4" fill="#4eff4e"/><line x1="16" y1="24" x2="16" y2="30" stroke="#8b4513" stroke-width="2"/></svg>',
    campfire: '<svg viewBox="0 0 32 32"><polygon points="16,6 20,16 24,26 16,22 8,26 12,16" fill="#ff6600"/><polygon points="16,10 18,16 20,22 16,20 12,22 14,16" fill="#ffcc00"/></svg>'
};

// ═══════════════════════════════════════════════════════════════════════════════
// DISCOVERY ICONS - For lore book and notifications
// ═══════════════════════════════════════════════════════════════════════════════

const discoveryIcons = {
    grass: '<svg viewBox="0 0 32 32"><path d="M8 28V18l4-6v16M16 28V14l4-8v22M24 28V16l-4-4v16" stroke="currentColor" fill="none" stroke-width="2"/></svg>',
    tree: '<svg viewBox="0 0 32 32"><path d="M16 4l-8 12h4l-6 10h20l-6-10h4z" fill="currentColor"/><rect x="14" y="24" width="4" height="6" fill="currentColor"/></svg>',
    mountain: '<svg viewBox="0 0 32 32"><path d="M4 28L16 6l12 22H4z" fill="currentColor"/><path d="M10 28l6-10 6 10" fill="currentColor" opacity="0.6"/></svg>',
    water: '<svg viewBox="0 0 32 32"><path d="M4 14q6-4 12 0t12 0M4 20q6-4 12 0t12 0M4 26q6-4 12 0t12 0" stroke="currentColor" fill="none" stroke-width="2"/></svg>',
    sun: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="6" fill="currentColor"/><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7 7l3 3M22 22l3 3M7 25l3-3M22 10l3-3" stroke="currentColor" stroke-width="2"/></svg>',
    snow: '<svg viewBox="0 0 32 32"><path d="M16 4v24M4 16h24M8 8l16 16M24 8L8 24" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>',
    deer: '<svg viewBox="0 0 32 32"><ellipse cx="20" cy="18" rx="8" ry="6" fill="currentColor"/><circle cx="10" cy="12" r="4" fill="currentColor"/><path d="M8 8l-2-4M8 8l2-4M12 8l-1-4M12 8l1-4" stroke="currentColor" stroke-width="1.5"/><path d="M20 24v4M26 22v6" stroke="currentColor" stroke-width="2"/></svg>',
    rock: '<svg viewBox="0 0 32 32"><path d="M6 24l4-10 6 2 8-8 4 6-4 10-8 2z" fill="currentColor"/><path d="M10 14l4 1 4-4" stroke="currentColor" stroke-width="1" opacity="0.5"/></svg>',
    crystal: '<svg viewBox="0 0 32 32"><path d="M16 2l8 12-8 16-8-16z" fill="currentColor"/><path d="M16 2l-4 10 4 6 4-6z" fill="currentColor" opacity="0.6"/></svg>',
    herb: '<svg viewBox="0 0 32 32"><path d="M16 28V16M10 20q6-8 6-8M22 20q-6-8-6-8M8 24q8-6 8-6M24 24q-8-6-8-6" stroke="currentColor" fill="none" stroke-width="2"/><circle cx="16" cy="10" r="4" fill="currentColor"/></svg>',
    mushroom: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="14" rx="10" ry="8" fill="currentColor"/><rect x="12" y="18" width="8" height="10" fill="currentColor" opacity="0.7"/></svg>',
    flower: '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="4" fill="currentColor"/><circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.8"/><circle cx="22" cy="10" r="3" fill="currentColor" opacity="0.8"/><circle cx="12" cy="16" r="3" fill="currentColor" opacity="0.8"/><circle cx="20" cy="16" r="3" fill="currentColor" opacity="0.8"/><path d="M16 16v12" stroke="currentColor" stroke-width="2"/></svg>',
    axe: '<svg viewBox="0 0 32 32"><path d="M8 24L24 8" stroke="currentColor" stroke-width="3"/><path d="M20 4l8 8-4 4-8-8z" fill="currentColor"/></svg>',
    pickaxe: '<svg viewBox="0 0 32 32"><path d="M8 24L24 8" stroke="currentColor" stroke-width="3"/><path d="M18 6l8 2-6 6-4-6zM26 8l-2 8-6-6z" fill="currentColor"/></svg>'
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHOP ICONS - Full weapon and armor icon set
// ═══════════════════════════════════════════════════════════════════════════════

const SHOP_ICONS = {
    sword: '<svg viewBox="0 0 32 32"><rect x="14" y="4" width="4" height="20" fill="#c0c0c0"/><rect x="10" y="22" width="12" height="3" fill="#8b4513"/><path d="M14 4L16 2L18 4" fill="#c0c0c0"/></svg>',
    axe: '<svg viewBox="0 0 32 32"><rect x="15" y="8" width="3" height="18" fill="#8B5A2B"/><path d="M8 6h16l-2 6H10L8 6z" fill="#708090"/></svg>',
    pickaxe: '<svg viewBox="0 0 32 32"><rect x="14" y="10" width="4" height="16" fill="#8B5A2B"/><path d="M18 4h8v12l-4 4h-4V4z" fill="#708090"/></svg>',
    bow: '<svg viewBox="0 0 32 32"><path d="M8 4Q4 16 8 28" stroke="#8b4513" fill="none" stroke-width="3"/><line x1="8" y1="16" x2="24" y2="16" stroke="#deb887" stroke-width="1"/></svg>',
    shield: '<svg viewBox="0 0 32 32"><path d="M6 6h20v12q-10 10-10 10Q6 18 6 18V6z" fill="#708090" stroke="#4a4a4a" stroke-width="2"/></svg>',
    // Weapons
    mace: '<svg viewBox="0 0 32 32"><rect x="14" y="14" width="4" height="14" fill="#8b4513"/><circle cx="16" cy="10" r="7" fill="#cd7f32"/><circle cx="16" cy="10" r="3" fill="#ffd700"/><rect x="8" y="8" width="3" height="5" fill="#5a5a6a"/><rect x="21" y="8" width="3" height="5" fill="#5a5a6a"/><rect x="14" y="3" width="4" height="4" fill="#5a5a6a"/></svg>',
    flintlock: '<svg viewBox="0 0 32 32"><rect x="4" y="14" width="20" height="5" fill="#2a3439"/><rect x="20" y="12" width="8" height="9" fill="#5a3820"/><circle cx="24" cy="16" r="2" fill="#b5a642"/><rect x="2" y="15" width="4" height="3" fill="#b5a642"/><rect x="18" y="10" width="3" height="4" fill="#2a3439"/></svg>',
    lance: '<svg viewBox="0 0 32 32"><rect x="14" y="10" width="4" height="20" fill="#8a5a30"/><polygon points="16,2 20,10 12,10" fill="#d0d8e0"/><rect x="10" y="10" width="12" height="3" fill="#708090"/><rect x="20" y="8" width="6" height="4" fill="#c03040"/></svg>',
    longbow: '<svg viewBox="0 0 32 32"><path d="M10 4Q4 16 10 28" stroke="#8a5a30" fill="none" stroke-width="4"/><line x1="10" y1="4" x2="10" y2="28" stroke="#d4c4a8" stroke-width="1"/><rect x="8" y="14" width="6" height="4" fill="#5a3820"/><polygon points="22,16 28,14 28,18" fill="#708090"/><rect x="10" y="15" width="14" height="2" fill="#8a5a30"/></svg>',
    katana: '<svg viewBox="0 0 32 32"><path d="M14 28L18 28L20 4L16 2L14 4Z" fill="#d0d8e0"/><rect x="12" y="22" width="8" height="4" fill="#1a1a28"/><rect x="10" y="20" width="12" height="2" fill="#5a5a6a"/><path d="M15 4L17 4L18 18L14 18Z" fill="#e8e8f0"/></svg>',
    staff: '<svg viewBox="0 0 32 32"><rect x="14" y="10" width="4" height="20" fill="#4a3020"/><circle cx="16" cy="6" r="5" fill="#4488ff" opacity="0.8"/><circle cx="16" cy="6" r="2" fill="#9944ff"/><circle cx="12" cy="10" r="2" fill="#c0c8d0"/><circle cx="20" cy="10" r="2" fill="#c0c8d0"/></svg>',
    broadsword: '<svg viewBox="0 0 32 32"><rect x="13" y="4" width="6" height="18" fill="#d0d8e0"/><rect x="15" y="6" width="2" height="14" fill="#606878"/><rect x="8" y="20" width="16" height="3" fill="#5a5a6a"/><rect x="14" y="22" width="4" height="6" fill="#6a4028"/><circle cx="16" cy="28" r="2" fill="#5a5a6a"/><path d="M13 4L16 1L19 4" fill="#f0f4f8"/></svg>',
    dagger: '<svg viewBox="0 0 32 32"><polygon points="16,2 20,16 16,18 12,16" fill="#d0d8e0"/><rect x="12" y="16" width="8" height="3" fill="#3a3a4a"/><rect x="13" y="18" width="6" height="8" fill="#6a4028"/><circle cx="16" cy="27" r="2" fill="#30c080"/><path d="M14 4L16 2L18 4L16 14Z" fill="#f0f4f8"/></svg>',
    // Consumables
    bread: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="18" rx="12" ry="8" fill="#d4a574"/><ellipse cx="16" cy="16" rx="10" ry="6" fill="#e8c496"/><path d="M10 14 Q13 12 16 14 Q19 12 22 14" stroke="#c49454" fill="none" stroke-width="1.5"/></svg>',
    ale: '<svg viewBox="0 0 32 32"><rect x="10" y="8" width="12" height="18" rx="2" fill="#8B4513"/><rect x="11" y="10" width="10" height="14" fill="#d4a556"/><ellipse cx="16" cy="10" rx="5" ry="2" fill="#fff8dc"/><rect x="22" y="12" width="4" height="10" rx="2" fill="#8B4513"/></svg>',
    stew: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="20" rx="12" ry="6" fill="#4a4a4a"/><ellipse cx="16" cy="18" rx="10" ry="5" fill="#8B4513"/><circle cx="12" cy="17" r="2" fill="#d4a574"/><circle cx="18" cy="16" r="2.5" fill="#ff6b4a"/><circle cx="14" cy="19" r="1.5" fill="#90ee90"/></svg>',
    potion: '<svg viewBox="0 0 32 32"><rect x="13" y="4" width="6" height="4" fill="#8B4513"/><path d="M12 8L10 24h12L20 8z" fill="#2a5a2a"/><ellipse cx="16" cy="24" rx="6" ry="3" fill="#1a4a1a"/><ellipse cx="16" cy="10" rx="4" ry="2" fill="#4a8a4a"/></svg>',
    potion_health: '<svg viewBox="0 0 32 32"><rect x="13" y="4" width="6" height="4" fill="#8B4513"/><path d="M12 8L10 24h12L20 8z" fill="#8a2a2a"/><ellipse cx="16" cy="24" rx="6" ry="3" fill="#6a1a1a"/><ellipse cx="16" cy="10" rx="4" ry="2" fill="#ea4a4a"/><path d="M14 15h4v2h-4zM15 13h2v6h-2z" fill="#ffaaaa"/></svg>',
    potion_stamina: '<svg viewBox="0 0 32 32"><rect x="13" y="4" width="6" height="4" fill="#8B4513"/><path d="M12 8L10 24h12L20 8z" fill="#2a6a2a"/><ellipse cx="16" cy="24" rx="6" ry="3" fill="#1a5a1a"/><ellipse cx="16" cy="10" rx="4" ry="2" fill="#4aea4a"/><path d="M13 16L16 12L19 16L16 14z" fill="#aaffaa"/></svg>',
    mana_potion: '<svg viewBox="0 0 32 32"><rect x="13" y="4" width="6" height="4" fill="#8B4513"/><path d="M12 8L10 24h12L20 8z" fill="#2a2a8a"/><ellipse cx="16" cy="24" rx="6" ry="3" fill="#1a1a6a"/><ellipse cx="16" cy="10" rx="4" ry="2" fill="#6a6aea"/><circle cx="16" cy="17" r="3" fill="#aaaaff" opacity="0.6"/></svg>',
    scroll: '<svg viewBox="0 0 32 32"><rect x="8" y="6" width="16" height="20" fill="#f5f0dc"/><rect x="6" y="4" width="4" height="24" rx="2" fill="#d4c4a8"/><rect x="22" y="4" width="4" height="24" rx="2" fill="#d4c4a8"/><line x1="11" y1="10" x2="21" y2="10" stroke="#333" stroke-width="1"/><line x1="11" y1="14" x2="21" y2="14" stroke="#333" stroke-width="1"/><line x1="11" y1="18" x2="17" y2="18" stroke="#333" stroke-width="1"/></svg>',
    scroll_fire: '<svg viewBox="0 0 32 32"><rect x="8" y="6" width="16" height="20" fill="#fff0dc"/><rect x="6" y="4" width="4" height="24" rx="2" fill="#e4a478"/><rect x="22" y="4" width="4" height="24" rx="2" fill="#e4a478"/><circle cx="16" cy="14" r="5" fill="#ff6a00"/><circle cx="16" cy="13" r="3" fill="#ffaa00"/><path d="M14 18L16 10L18 18" fill="#ff4400"/></svg>',
    scroll_ice: '<svg viewBox="0 0 32 32"><rect x="8" y="6" width="16" height="20" fill="#f0f8ff"/><rect x="6" y="4" width="4" height="24" rx="2" fill="#a8d4e4"/><rect x="22" y="4" width="4" height="24" rx="2" fill="#a8d4e4"/><polygon points="16,8 18,12 22,12 19,15 20,20 16,17 12,20 13,15 10,12 14,12" fill="#4ad4ff"/><circle cx="16" cy="14" r="2" fill="#ffffff"/></svg>',
    torch: '<svg viewBox="0 0 32 32"><rect x="14" y="14" width="4" height="14" fill="#8B4513"/><ellipse cx="16" cy="10" rx="4" ry="6" fill="#ff8c00"/><ellipse cx="16" cy="8" rx="2.5" ry="4" fill="#ffcc00"/><ellipse cx="16" cy="6" rx="1.5" ry="2.5" fill="#ffffaa"/></svg>',
    rope: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="10" ry="10" fill="none" stroke="#d4a574" stroke-width="4"/><ellipse cx="16" cy="16" rx="5" ry="5" fill="none" stroke="#d4a574" stroke-width="3"/><path d="M26 16 Q28 16 28 20 L26 22" stroke="#d4a574" stroke-width="3" fill="none"/></svg>',
    // Armor icons
    helmet: '<svg viewBox="0 0 32 32"><path d="M8 18 L8 12 Q8 4 16 4 Q24 4 24 12 L24 18 L20 20 L20 16 L12 16 L12 20 Z" fill="#708090"/><path d="M10 12 Q10 6 16 6 Q22 6 22 12 L22 16 L10 16 Z" fill="#a0aec0"/><rect x="10" y="18" width="12" height="3" fill="#4a5568"/></svg>',
    armor: '<svg viewBox="0 0 32 32"><path d="M10 8h12v4l2 14h-16l2-14z" fill="#708090"/><path d="M12 8v-2h8v2" fill="#4a4a4a"/></svg>',
    pauldrons: '<svg viewBox="0 0 32 32"><ellipse cx="10" cy="14" rx="6" ry="8" fill="#708090"/><ellipse cx="22" cy="14" rx="6" ry="8" fill="#708090"/><path d="M10 8 Q16 4 22 8" stroke="#a0aec0" stroke-width="2" fill="none"/><circle cx="10" cy="12" r="2" fill="#ffd700"/><circle cx="22" cy="12" r="2" fill="#ffd700"/></svg>',
    chestpiece: '<svg viewBox="0 0 32 32"><path d="M6 8 L12 6 L16 8 L20 6 L26 8 L26 26 L20 28 L16 26 L12 28 L6 26 Z" fill="#708090"/><path d="M8 10 L14 8 L16 10 L18 8 L24 10 L24 24 L18 26 L16 24 L14 26 L8 24 Z" fill="#a0aec0"/><path d="M16 12 L16 22" stroke="#4a5568" stroke-width="2"/></svg>',
    greaves: '<svg viewBox="0 0 32 32"><path d="M8 4 L12 4 L12 24 L8 28 L8 4" fill="#708090"/><path d="M20 4 L24 4 L24 28 L20 24 L20 4" fill="#708090"/><path d="M9 6 L11 6 L11 22 L9 25 Z" fill="#a0aec0"/><path d="M21 6 L23 6 L23 25 L21 22 Z" fill="#a0aec0"/></svg>',
    boots: '<svg viewBox="0 0 32 32"><path d="M6 8 L12 8 L12 20 L6 24 L2 24 L2 20 L6 16 Z" fill="#708090"/><path d="M20 8 L26 8 L26 16 L30 20 L30 24 L26 24 L20 20 Z" fill="#708090"/><path d="M7 10 L11 10 L11 18 L7 21 Z" fill="#a0aec0"/><path d="M21 10 L25 10 L25 18 L21 21 Z" fill="#a0aec0"/></svg>',
    belt: '<svg viewBox="0 0 32 32"><rect x="2" y="12" width="28" height="8" rx="2" fill="#8b4513"/><rect x="12" y="10" width="8" height="12" rx="1" fill="#ffd700"/><rect x="14" y="13" width="4" height="6" fill="#4a5568"/></svg>',
    necklace: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="12" rx="10" ry="6" fill="none" stroke="#ffd700" stroke-width="2"/><circle cx="16" cy="24" r="5" fill="#a855f7"/><circle cx="16" cy="24" r="3" fill="#c084fc"/></svg>',
    ring: '<svg viewBox="0 0 32 32"><ellipse cx="16" cy="16" rx="10" ry="8" fill="none" stroke="#ffd700" stroke-width="3"/><ellipse cx="16" cy="16" rx="6" ry="4" fill="none" stroke="#c9a227" stroke-width="2"/><circle cx="16" cy="10" r="3" fill="#60a5fa"/></svg>',
    trinket: '<svg viewBox="0 0 32 32"><polygon points="16,2 20,12 30,12 22,18 26,28 16,22 6,28 10,18 2,12 12,12" fill="#a855f7"/><polygon points="16,6 18,12 24,12 20,16 22,22 16,18 10,22 12,16 8,12 14,12" fill="#c084fc"/></svg>'
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED GEOMETRIES - Reused across resources
// ═══════════════════════════════════════════════════════════════════════════════

const sharedGeom = {
    sphere1: new THREE.SphereGeometry(1, 6, 5),
    sphere2: new THREE.SphereGeometry(1, 5, 4),
    sphere3: new THREE.SphereGeometry(1, 4, 3),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 5),
    cylinder1: new THREE.CylinderGeometry(1, 1, 1, 5),
    cylinder2: new THREE.CylinderGeometry(1, 1.2, 0.8, 5),
    cone1: new THREE.ConeGeometry(1, 1, 5),
    cone2: new THREE.ConeGeometry(1, 1, 6),
    box: new THREE.BoxGeometry(1, 1, 1),
    plane: new THREE.PlaneGeometry(1, 1),
    dodeca: new THREE.DodecahedronGeometry(1, 0),
    icosa: new THREE.IcosahedronGeometry(1, 0),
    octa: new THREE.OctahedronGeometry(1, 0)
};

// ═══════════════════════════════════════════════════════════════════════════════
// STYLIZED MATERIALS - Rich saturated colors for world objects
// ═══════════════════════════════════════════════════════════════════════════════

const mats = {
    // Tree trunks
    trunkOak: new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, metalness: 0 }),
    trunkPine: new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.85, metalness: 0 }),
    trunkBirch: new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.7, metalness: 0 }),
    trunkWillow: new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.9, metalness: 0 }),
    trunkMaple: new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.85, metalness: 0 }),
    trunkCherry: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.75, metalness: 0 }),
    // Foliage
    foliageDeep: new THREE.MeshStandardMaterial({ color: 0x1a472a, roughness: 0.8 }),
    foliageRich: new THREE.MeshStandardMaterial({ color: 0x2d5a35, roughness: 0.75 }),
    foliageBright: new THREE.MeshStandardMaterial({ color: 0x4a9f4a, roughness: 0.7 }),
    foliagePine: new THREE.MeshStandardMaterial({ color: 0x2f4f2f, roughness: 0.85 }),
    foliageAutumn1: new THREE.MeshStandardMaterial({ color: 0xd4652f, roughness: 0.7 }),
    foliageAutumn2: new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.7 }),
    foliageAutumn3: new THREE.MeshStandardMaterial({ color: 0x8b2500, roughness: 0.75 }),
    foliageCherry: new THREE.MeshStandardMaterial({ color: 0xffb7c5, roughness: 0.6 }),
    foliageWillow: new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.7 }),
    // Rocks
    rockGranite: new THREE.MeshStandardMaterial({ color: 0x7a7a72, roughness: 1.0, metalness: 0.1 }),
    rockSlate: new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.95, metalness: 0 }),
    rockMoss: new THREE.MeshStandardMaterial({ color: 0x5a6b52, roughness: 0.9, metalness: 0 }),
    rockSand: new THREE.MeshStandardMaterial({ color: 0xc4a76c, roughness: 0.85, metalness: 0 }),
    rockCrystal: new THREE.MeshStandardMaterial({ color: 0x9ab8d5, roughness: 0.3, metalness: 0.4, transparent: true, opacity: 0.85 }),
    rockObsidian: new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.2, metalness: 0.6 }),
    // Ground cover
    grass1: new THREE.MeshStandardMaterial({ color: 0x5a8f4a, roughness: 0.8, side: THREE.DoubleSide }),
    grass2: new THREE.MeshStandardMaterial({ color: 0x7ab85a, roughness: 0.75, side: THREE.DoubleSide }),
    flowerRed: new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 }),
    flowerYellow: new THREE.MeshStandardMaterial({ color: 0xf4d35e, roughness: 0.5 }),
    flowerPurple: new THREE.MeshStandardMaterial({ color: 0x9b5de5, roughness: 0.5 }),
    flowerWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    mushroom: new THREE.MeshStandardMaterial({ color: 0xc9a06c, roughness: 0.6 }),
    mushroomCap: new THREE.MeshStandardMaterial({ color: 0xc44536, roughness: 0.5 }),
    fern: new THREE.MeshStandardMaterial({ color: 0x3d7a4a, roughness: 0.7, side: THREE.DoubleSide }),
    // Tools
    hand: new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.6 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x708090, roughness: 0.4, metalness: 0.7 }),
    blade: new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.25, metalness: 0.85 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.9 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL MATERIALS - Wind Waker style flat shaded
// ═══════════════════════════════════════════════════════════════════════════════

const toolMats = {
    // Hand
    hand: new THREE.MeshStandardMaterial({ color: 0xe8b898, flatShading: true, roughness: 0.8 }),
    handShadow: new THREE.MeshStandardMaterial({ color: 0xc49878, flatShading: true, roughness: 0.8 }),
    handNail: new THREE.MeshStandardMaterial({ color: 0xf5d0b8, flatShading: true, roughness: 0.7 }),
    // Wood
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5a30, flatShading: true, roughness: 0.9 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x5a3820, flatShading: true, roughness: 0.9 }),
    woodLight: new THREE.MeshStandardMaterial({ color: 0xb87a48, flatShading: true, roughness: 0.85 }),
    // Metal
    metal: new THREE.MeshStandardMaterial({ color: 0x8898a8, flatShading: true, roughness: 0.4, metalness: 0.6 }),
    metalShine: new THREE.MeshStandardMaterial({ color: 0xb8c8d8, flatShading: true, roughness: 0.3, metalness: 0.7 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x606878, flatShading: true, roughness: 0.5, metalness: 0.5 }),
    // Blade
    blade: new THREE.MeshStandardMaterial({ color: 0xd0d8e0, flatShading: true, emissive: 0x404858, emissiveIntensity: 0.15, roughness: 0.2, metalness: 0.8 }),
    bladeEdge: new THREE.MeshStandardMaterial({ color: 0xf0f4f8, flatShading: true, emissive: 0x606878, emissiveIntensity: 0.2, roughness: 0.15, metalness: 0.85 }),
    // Gold
    gold: new THREE.MeshStandardMaterial({ color: 0xe8c040, flatShading: true, emissive: 0x805010, emissiveIntensity: 0.15, roughness: 0.3, metalness: 0.8 }),
    // Leather
    leather: new THREE.MeshStandardMaterial({ color: 0x6a4028, flatShading: true, roughness: 0.95 }),
    leatherWrap: new THREE.MeshStandardMaterial({ color: 0x483020, flatShading: true, roughness: 0.95 }),
    // Gem
    ruby: new THREE.MeshStandardMaterial({ color: 0xc03040, flatShading: true, emissive: 0x801020, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.3 }),
    // Bronze/Iron
    bronze: new THREE.MeshStandardMaterial({ color: 0xcd7f32, flatShading: true, roughness: 0.4, metalness: 0.7 }),
    bronzeDark: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, flatShading: true, roughness: 0.5, metalness: 0.6 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x5a5a6a, flatShading: true, roughness: 0.5, metalness: 0.7 }),
    ironDark: new THREE.MeshStandardMaterial({ color: 0x3a3a4a, flatShading: true, roughness: 0.6, metalness: 0.6 }),
    // Brass/Gunmetal
    brass: new THREE.MeshStandardMaterial({ color: 0xb5a642, flatShading: true, roughness: 0.35, metalness: 0.75 }),
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x2a3439, flatShading: true, roughness: 0.45, metalness: 0.8 }),
    // String
    string: new THREE.MeshStandardMaterial({ color: 0xd4c4a8, flatShading: true, roughness: 0.95 }),
    // Katana
    hamon: new THREE.MeshStandardMaterial({ color: 0xe8e8f0, flatShading: true, emissive: 0x8080a0, emissiveIntensity: 0.15, roughness: 0.1, metalness: 0.9 }),
    tsuka: new THREE.MeshStandardMaterial({ color: 0x1a1a28, flatShading: true, roughness: 0.9 }),
    samegawa: new THREE.MeshStandardMaterial({ color: 0xf0f0e8, flatShading: true, roughness: 0.7 }),
    // Staff/Crystal
    crystalBlue: new THREE.MeshStandardMaterial({ color: 0x4488ff, flatShading: true, emissive: 0x2244aa, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.9 }),
    crystalPurple: new THREE.MeshStandardMaterial({ color: 0x9944ff, flatShading: true, emissive: 0x6622aa, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.9 }),
    staffWood: new THREE.MeshStandardMaterial({ color: 0x4a3020, flatShading: true, roughness: 0.85 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xc0c8d0, flatShading: true, roughness: 0.25, metalness: 0.85 }),
    // Gems
    emerald: new THREE.MeshStandardMaterial({ color: 0x30c080, flatShading: true, emissive: 0x108040, emissiveIntensity: 0.3, roughness: 0.2, metalness: 0.3 }),
    holyGold: new THREE.MeshStandardMaterial({ color: 0xffd700, flatShading: true, emissive: 0xaa8800, emissiveIntensity: 0.3, roughness: 0.25, metalness: 0.85 })
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    itemIcons,
    weatherIcons,
    spellIcons,
    discoveryIcons,
    SHOP_ICONS,
    sharedGeom,
    mats,
    toolMats
};

export default {
    itemIcons,
    weatherIcons,
    spellIcons,
    discoveryIcons,
    SHOP_ICONS,
    sharedGeom,
    mats,
    toolMats
};
