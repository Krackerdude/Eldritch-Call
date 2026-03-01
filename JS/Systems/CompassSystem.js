// ═══════════════════════════════════════════════════════════════════════════════
// COMPASSSYSTEM.JS - HUD Compass with Direction and POI Markers
// Dependencies: THREE.js (for MathUtils)
// Injected: compass-strip DOM element
// Consumers: Main game loop, Quest markers, POI tracking
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

const CompassSystem = (function() {
    // Private state
    let _compassStrip = null;
    let _initialized = false;
    
    // Configuration constants
    const _config = {
        width: 600,           // Width of visible compass area in pixels
        degreesVisible: 180,  // How many degrees visible at once
        maxMarkerDistance: 500, // Max distance to show markers (meters)
        fadeStartAngle: 70    // Angle at which markers start to fade
    };
    
    const _pixelsPerDegree = _config.width / _config.degreesVisible;
    
    // Compass marker icons (SVG)
    const _icons = {
        quest: '<svg viewBox="0 0 24 24"><path d="M12 2L12 8M12 16L12 22M8 12L2 12M22 12L16 12"/><text x="12" y="16" font-size="14" text-anchor="middle" font-weight="bold">!</text></svg>',
        questTurnin: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
        poi: '<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
        town: '<svg viewBox="0 0 24 24"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>',
        dungeon: '<svg viewBox="0 0 24 24"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L18 8v7l-6 3.5L6 15V8l6-3.5z"/><circle cx="12" cy="12" r="2"/></svg>',
        npc: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/></svg>',
        cave: '<svg viewBox="0 0 24 24"><path d="M4 20h16l-2-8-6-8-6 8-2 8z"/><ellipse cx="12" cy="18" rx="3" ry="2"/></svg>',
        tower: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="8" height="14"/><path d="M6 8h12l-6-6-6 6z"/><rect x="10" y="12" width="4" height="4"/></svg>',
        shrine: '<svg viewBox="0 0 24 24"><path d="M12 2l-2 4h4l-2-4zM8 8h8v2H8zM10 10v10h4V10z"/><path d="M6 22h12v-2H6z"/></svg>',
        camp: '<svg viewBox="0 0 24 24"><path d="M12 4L4 18h16L12 4z"/><path d="M10 18v-4l2-2 2 2v4"/></svg>'
    };
    
    // Direction definitions
    const _directions = [
        { deg: 0, label: 'N', cardinal: true },
        { deg: 45, label: 'NE', cardinal: false },
        { deg: 90, label: 'E', cardinal: true },
        { deg: 135, label: 'SE', cardinal: false },
        { deg: 180, label: 'S', cardinal: true },
        { deg: 225, label: 'SW', cardinal: false },
        { deg: 270, label: 'W', cardinal: true },
        { deg: 315, label: 'NW', cardinal: false }
    ];
    
    // Private: Build direction markers on compass strip
    function _buildDirectionMarkers() {
        if (!_compassStrip) return;
        _compassStrip.innerHTML = '';
        
        // Create two sets for wrapping (720 degrees total)
        for (let offset = 0; offset <= 720; offset += 360) {
            _directions.forEach(dir => {
                const marker = document.createElement('div');
                marker.className = 'compass-direction' + (dir.cardinal ? ' cardinal' : '');
                marker.innerHTML = `
                    <span class="dir-letter">${dir.label}</span>
                    <span class="dir-tick"></span>
                `;
                marker.dataset.degree = dir.deg + offset;
                _compassStrip.appendChild(marker);
            });
            
            // Add minor tick marks every 15 degrees
            for (let deg = 0; deg < 360; deg += 15) {
                if (deg % 45 !== 0) {
                    const tick = document.createElement('div');
                    tick.className = 'compass-tick';
                    tick.dataset.degree = deg + offset;
                    _compassStrip.appendChild(tick);
                }
            }
        }
    }
    
    // Private: Create a marker element
    function _createMarkerElement(marker, relativeAngle, distance) {
        const el = document.createElement('div');
        el.className = 'compass-marker ' + marker.type;
        
        // Determine icon based on type
        let icon = _icons.poi;
        if (marker.type === 'quest-main' || marker.type === 'quest-side') {
            icon = _icons.quest;
        } else if (marker.type === 'quest-turnin') {
            icon = _icons.questTurnin;
        } else if (marker.type === 'dungeon') {
            icon = _icons.dungeon;
        } else if (marker.type === 'town') {
            icon = _icons.town;
        } else if (marker.type === 'npc') {
            icon = _icons.npc;
        } else if (_icons[marker.type]) {
            icon = _icons[marker.type];
        }
        
        const distText = Math.round(distance) + 'm';
        
        el.innerHTML = `
            <div class="compass-marker-icon">${icon}</div>
            <span class="compass-marker-distance">${distText}</span>
        `;
        
        // Position on compass
        const x = (_config.width / 2) + (relativeAngle * _pixelsPerDegree);
        el.style.left = x + 'px';
        el.style.top = '5px';
        
        // Fade if near edges
        if (Math.abs(relativeAngle) > _config.fadeStartAngle) {
            el.classList.add(relativeAngle < 0 ? 'far-left' : 'far-right');
        }
        
        return el;
    }
    
    // Private: Update direction markers positions
    function _updateDirections(playerAngle) {
        const centerDegree = playerAngle + 360;
        const stripOffset = (_config.width / 2) - (centerDegree * _pixelsPerDegree);
        
        _compassStrip.querySelectorAll('.compass-direction, .compass-tick').forEach(el => {
            const deg = parseFloat(el.dataset.degree);
            const x = (deg * _pixelsPerDegree) + stripOffset;
            el.style.left = x + 'px';
            el.style.display = (x > -50 && x < _config.width + 50) ? 'flex' : 'none';
        });
    }
    
    // Private: Render world markers
    function _renderMarkers(playerAngle, playerX, playerZ, markers) {
        // Clear old markers
        _compassStrip.querySelectorAll('.compass-marker').forEach(el => el.remove());
        
        markers.forEach(marker => {
            const dx = marker.x - playerX;
            const dz = marker.z - playerZ;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Skip markers too far away
            if (distance > _config.maxMarkerDistance) return;
            
            // Calculate angle to marker (0 = North)
            let angleToMarker = THREE.MathUtils.radToDeg(Math.atan2(-dx, -dz)) + 180;
            angleToMarker = ((angleToMarker % 360) + 360) % 360;
            
            // Calculate relative angle from player facing
            let relativeAngle = angleToMarker - playerAngle;
            while (relativeAngle > 180) relativeAngle -= 360;
            while (relativeAngle < -180) relativeAngle += 360;
            
            // Only show markers within visible compass range
            if (Math.abs(relativeAngle) <= 90) {
                const el = _createMarkerElement(marker, relativeAngle, distance);
                _compassStrip.appendChild(el);
            }
        });
    }
    
    // Public interface
    return {
        // Getters for configuration
        getConfig() { return { ..._config }; },
        getIcons() { return { ..._icons }; },
        isInitialized() { return _initialized; },
        
        // Initialize the compass (call once on startup)
        init(compassStripElement) {
            _compassStrip = compassStripElement || document.getElementById('compass-strip');
            if (!_compassStrip) {
                console.warn('CompassSystem: compass-strip element not found');
                return false;
            }
            _buildDirectionMarkers();
            _initialized = true;
            return true;
        },
        
        // Main update function - call every frame
        // playerAngle: degrees (0 = North)
        // playerX, playerZ: player world position
        // markers: array of { x, z, type, name } objects
        update(playerAngle, playerX, playerZ, markers) {
            if (!_initialized || !_compassStrip) return;
            
            // Normalize angle to 0-360
            playerAngle = ((playerAngle % 360) + 360) % 360;
            
            // Update direction markers
            _updateDirections(playerAngle);
            
            // Update world markers
            if (markers && markers.length > 0) {
                _renderMarkers(playerAngle, playerX, playerZ, markers);
            } else {
                // Clear markers if none provided
                _compassStrip.querySelectorAll('.compass-marker').forEach(el => el.remove());
            }
        },
        
        // Simplified update that uses player object directly (backward compat)
        updateFromPlayer(playerObj, markers) {
            if (!playerObj) return;
            
            // Get player's facing direction in degrees
            let playerAngle = THREE.MathUtils.radToDeg(playerObj.rotation.y) + 180;
            this.update(playerAngle, playerObj.position.x, playerObj.position.z, markers);
        },
        
        // Set configuration
        setMaxDistance(dist) { _config.maxMarkerDistance = dist; },
        setFadeAngle(angle) { _config.fadeStartAngle = angle; },
        
        // Add custom icon
        addIcon(name, svgHtml) {
            _icons[name] = svgHtml;
        },
        
        // Reinitialize (rebuild direction markers)
        rebuild() {
            if (_compassStrip) {
                _buildDirectionMarkers();
            }
        }
    };
})();

// Backward compatibility
const compassWidth = 600;
const degreesVisible = 180;

export { CompassSystem, compassWidth, degreesVisible };
export default CompassSystem;
