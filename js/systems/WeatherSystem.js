// ═══════════════════════════════════════════════════════════════════════════════
// WEATHERSYSTEM.JS - Weather State and Lightning Effects
// Dependencies: weatherIcons (optional, for UI updates)
// Consumers: Rendering (fog, clouds), Precipitation, Lighting, Sky shader
// ═══════════════════════════════════════════════════════════════════════════════

// Weather icons can be injected via init() or set directly
let weatherIcons = {};

const WeatherSystem = (function() {
    // Private state
    let _current = 'clear';
    let _idx = 0;
    let _lightningTimer = 0;
    let _lightningActive = false;
    
    const _types = ['clear', 'light_rain', 'storm', 'snow'];
    
    const _configs = {
        clear:      { icon: 'clear',      name: 'Clear', fog: 0.0015, cloud: 0.35, wind: 0.5, precip: 'none' },
        light_rain: { icon: 'light_rain', name: 'Rain',  fog: 0.004,  cloud: 0.75, wind: 0.8, precip: 'rain' },
        storm:      { icon: 'storm',      name: 'Storm', fog: 0.006,  cloud: 0.95, wind: 1.8, precip: 'rain' },
        snow:       { icon: 'snow',       name: 'Snow',  fog: 0.0045, cloud: 0.8,  wind: 0.3, precip: 'snow' }
    };
    
    // Private helper for UI updates
    function _updateWeatherUI() {
        const c = _configs[_current];
        const iconEl = document.querySelector('#weather-widget .weather-icon');
        const nameEl = document.querySelector('#weather-widget .weather-name');
        if (iconEl && weatherIcons[c.icon]) iconEl.innerHTML = weatherIcons[c.icon];
        if (nameEl) nameEl.textContent = c.name;
    }
    
    return {
        // Initialize with icons
        init(icons) {
            if (icons) weatherIcons = icons;
        },
        
        // Property access for backward compatibility
        get current() { return _current; },
        set current(val) { if (_configs[val]) _current = val; },
        get lightningActive() { return _lightningActive; },
        get lightningTimer() { return _lightningTimer; },
        get configs() { return _configs; },
        get types() { return [..._types]; },
        get idx() { return _idx; },
        
        // Getters (preferred API)
        getCurrentWeather() { return _current; },
        getConfig() { return { ..._configs[_current] }; },
        getAllConfigs() { return JSON.parse(JSON.stringify(_configs)); },
        getWeatherTypes() { return [..._types]; },
        isLightningActive() { return _lightningActive; },
        
        // Weather queries
        isRaining() { return _current === 'light_rain' || _current === 'storm'; },
        isSnowing() { return _current === 'snow'; },
        isStorming() { return _current === 'storm'; },
        isClear() { return _current === 'clear'; },
        getPrecipType() { return _configs[_current].precip; },
        getFogDensity() { return _configs[_current].fog; },
        getCloudCover() { return _configs[_current].cloud; },
        getWindStrength() { return _configs[_current].wind; },
        
        // Weather control
        cycle() {
            _idx = (_idx + 1) % _types.length;
            _current = _types[_idx];
            _updateWeatherUI();
        },
        
        setWeather(weatherType) {
            if (_configs[weatherType]) {
                _current = weatherType;
                _idx = _types.indexOf(weatherType);
                _updateWeatherUI();
            }
        },
        
        // Lightning system
        updateLightning(delta) {
            if (_current !== 'storm') {
                _lightningActive = false;
                return;
            }
            
            _lightningTimer += delta;
            if (_lightningTimer > 2 + Math.random() * 6) {
                _lightningTimer = 0;
                const flash = document.getElementById('lightning-flash');
                if (flash) {
                    flash.style.opacity = '0.8';
                    setTimeout(() => flash.style.opacity = '0.3', 60);
                    setTimeout(() => flash.style.opacity = '0', 200);
                }
                _lightningActive = true;
                setTimeout(() => { _lightningActive = false; }, 250);
            }
        },
        
        resetLightning() {
            _lightningTimer = 0;
            _lightningActive = false;
        }
    };
})();

// Backward compatibility alias
const weather = WeatherSystem;

export { WeatherSystem, weather, weatherIcons };
export default WeatherSystem;
