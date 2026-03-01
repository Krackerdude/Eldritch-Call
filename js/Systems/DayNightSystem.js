// ═══════════════════════════════════════════════════════════════════════════════
// DAYNIGHTSYSTEM.JS - Time of Day Management
// Dependencies: None (standalone)
// Consumers: FogSystem, Lighting, Sky rendering, Creature spawning
// ═══════════════════════════════════════════════════════════════════════════════

const DayNightSystem = (function() {
    // Private state
    let _gameTime = 10.0;
    const _timeSpeed = 0.015;
    let _paused = false;
    
    return {
        // Property access for backward compatibility
        get gameTime() { return _gameTime; },
        set gameTime(val) { _gameTime = val % 24; },
        get paused() { return _paused; },
        set paused(val) { _paused = !!val; },
        
        // Core update - advances time if not paused
        update(delta) {
            if (!_paused) {
                _gameTime = (_gameTime + delta * _timeSpeed) % 24;
            }
        },
        
        // Getters (preferred API)
        getGameTime() { return _gameTime; },
        getTimeSpeed() { return _timeSpeed; },
        isPaused() { return _paused; },
        
        // Calculations
        getSunAngle() {
            return (_gameTime / 24) * Math.PI * 2 - Math.PI / 2;
        },
        
        getSunIntensity() {
            const h = _gameTime;
            return (h >= 6 && h <= 18) ? Math.sin(((h - 6) / 12) * Math.PI) * 0.8 + 0.4 : 0.1;
        },
        
        isNight() {
            return _gameTime < 6 || _gameTime > 20;
        },
        
        isDawn() { return _gameTime >= 5 && _gameTime < 7; },
        isDusk() { return _gameTime >= 20 && _gameTime < 22; },
        
        getTimePeriod() {
            const h = _gameTime;
            if (h >= 5 && h < 7) return "Dawn";
            if (h >= 7 && h < 11) return "Morning";
            if (h >= 11 && h < 13) return "Midday";
            if (h >= 13 && h < 17) return "Afternoon";
            if (h >= 17 && h < 20) return "Evening";
            if (h >= 20 && h < 22) return "Dusk";
            return "Night";
        },
        
        getTimeString() {
            const h = Math.floor(_gameTime);
            const m = Math.floor((_gameTime % 1) * 60);
            return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
        },
        
        // Setters
        setTime(hour) {
            _gameTime = Math.max(0, Math.min(24, hour)) % 24;
        },
        
        advanceTime(hours) {
            _gameTime = (_gameTime + hours) % 24;
        },
        
        pause() { _paused = true; },
        resume() { _paused = false; },
        togglePause() { _paused = !_paused; }
    };
})();

// Backward compatibility alias
const dayNight = DayNightSystem;

export { DayNightSystem, dayNight };
export default DayNightSystem;
