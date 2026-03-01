// ═══════════════════════════════════════════════════════════════════════════════
// SKY.JS - Sky Sphere Shader and Volumetric Clouds
// Dependencies: THREE.js
// Injected: scene
// Consumers: Main game loop, weather system, day/night system
// ═══════════════════════════════════════════════════════════════════════════════

import * as THREE from 'three';

// Injected dependencies
let _deps = {
    scene: null
};

// Sky components
let skySphere = null;
let skyMat = null;
const clouds = [];

// Cloud materials (shared)
const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
});

const cloudMaterialDark = new THREE.MeshBasicMaterial({
    color: 0xccccdd,
    transparent: true,
    opacity: 0.75,
    depthWrite: false
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKY SHADER
// ═══════════════════════════════════════════════════════════════════════════════

const skyVertexShader = `
    varying vec3 vWorld;
    void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const skyFragmentShader = `
    uniform vec3 sunPos;
    uniform float tod, cloud, time;
    uniform vec3 biomeTint;
    uniform vec3 biomeFog;
    varying vec3 vWorld;
    
    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(hash(i), hash(i + vec2(1, 0)), f.x),
            mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
            f.y
        );
    }
    
    float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
        }
        return v;
    }
    
    void main() {
        vec3 dir = normalize(vWorld);
        float h = dir.y;
        float t = tod * 24.0;
        
        vec3 hC, zC;
        
        // Time-based sky colors
        if (t < 6.0 || t >= 21.0) {
            // Night
            hC = vec3(0.05, 0.08, 0.15);
            zC = vec3(0.02, 0.03, 0.08);
        } else if (t < 8.0) {
            // Dawn
            float b = (t - 6.0) / 2.0;
            hC = mix(vec3(0.05, 0.08, 0.15), vec3(1.0, 0.6, 0.4), b);
            zC = mix(vec3(0.02, 0.03, 0.08), vec3(0.4, 0.5, 0.7), b);
        } else if (t < 17.0) {
            // Day - use biome tint
            hC = biomeTint;
            zC = biomeFog;
        } else if (t < 19.0) {
            // Dusk
            float b = (t - 17.0) / 2.0;
            hC = mix(biomeTint, vec3(1.0, 0.5, 0.3), b);
            zC = mix(biomeFog, vec3(0.3, 0.3, 0.5), b);
        } else {
            // Twilight
            float b = (t - 19.0) / 2.0;
            hC = mix(vec3(1.0, 0.5, 0.3), vec3(0.05, 0.08, 0.15), b);
            zC = mix(vec3(0.3, 0.3, 0.5), vec3(0.02, 0.03, 0.08), b);
        }
        
        // Sky gradient
        vec3 sky = h > 0.0 ? mix(hC, zC, pow(h, 0.6)) : hC * 0.7;
        
        // Sun
        vec3 sunDir = normalize(sunPos);
        float sunDot = dot(dir, sunDir);
        
        // Sun disc
        sky += vec3(1.0, 0.95, 0.85) * smoothstep(0.9995, 0.9999, sunDot) * smoothstep(-0.1, 0.1, sunPos.y);
        
        // Sun glow
        sky += vec3(1.0, 0.8, 0.6) * pow(max(sunDot, 0.0), 8.0) * 0.3 * smoothstep(-0.1, 0.1, sunPos.y);
        
        // Stars at night
        if (t < 6.0 || t > 20.0) {
            float s = step(0.998, hash(floor(dir.xz * 500.0)));
            sky += vec3(1.0) * s * 0.7 * smoothstep(0.0, 0.3, h);
        }
        
        // Clouds
        if (h > 0.0) {
            vec2 uv = dir.xz / (h + 0.3) * 1.5 + time * 0.008;
            float c = fbm(uv * 2.5);
            c = smoothstep(1.0 - cloud, 1.0 - cloud + 0.3, c);
            vec3 cc = cloud > 0.8 ? vec3(0.4) : vec3(1.0);
            sky = mix(sky, cc, c * smoothstep(0.0, 0.3, h) * 0.7);
        }
        
        gl_FragColor = vec4(sky, 1.0);
    }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CLOUD CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class Cloud {
    constructor(x, y, z, scale) {
        this.group = new THREE.Group();
        this.baseX = x;
        this.baseZ = z;
        this.driftSpeed = 0.5 + Math.random() * 1;
        this.driftAngle = Math.random() * Math.PI * 2;
        
        // Create fluffy cloud from clustered spheres
        const puffCount = 8 + Math.floor(Math.random() * 8);
        const cloudScale = scale * (0.8 + Math.random() * 0.6);
        
        for (let i = 0; i < puffCount; i++) {
            const puffSize = cloudScale * (15 + Math.random() * 25);
            const geo = new THREE.SphereGeometry(puffSize, 8, 6);
            
            // Mix of white and slightly darker puffs for depth
            const mat = Math.random() > 0.3 ? cloudMaterial : cloudMaterialDark;
            const puff = new THREE.Mesh(geo, mat);
            
            // Position puffs in cloud-like formation
            const spreadX = cloudScale * 50 * (Math.random() - 0.5);
            const spreadY = cloudScale * 15 * (Math.random() - 0.3);
            const spreadZ = cloudScale * 40 * (Math.random() - 0.5);
            
            puff.position.set(spreadX, spreadY, spreadZ);
            puff.scale.y = 0.6 + Math.random() * 0.3; // Flatten slightly
            this.group.add(puff);
        }
        
        // Add some smaller detail puffs
        for (let i = 0; i < 5; i++) {
            const detailSize = cloudScale * (8 + Math.random() * 12);
            const detail = new THREE.Mesh(
                new THREE.SphereGeometry(detailSize, 6, 4),
                cloudMaterial
            );
            detail.position.set(
                cloudScale * 60 * (Math.random() - 0.5),
                cloudScale * 10 * (Math.random() - 0.5),
                cloudScale * 50 * (Math.random() - 0.5)
            );
            this.group.add(detail);
        }
        
        this.group.position.set(x, y, z);
        
        if (_deps.scene) {
            _deps.scene.add(this.group);
        }
    }
    
    update(delta, windDir, windStr, playerPos) {
        // Slow drift with wind
        this.group.position.x += (windDir.x * windStr * 0.3 + Math.cos(this.driftAngle) * 0.1) * this.driftSpeed * delta * 60;
        this.group.position.z += (windDir.y * windStr * 0.3 + Math.sin(this.driftAngle) * 0.1) * this.driftSpeed * delta * 60;
        
        // Keep clouds centered around player (wrap around)
        const dx = this.group.position.x - playerPos.x;
        const dz = this.group.position.z - playerPos.z;
        const wrapDist = 1200;
        
        if (dx > wrapDist) this.group.position.x -= wrapDist * 2;
        if (dx < -wrapDist) this.group.position.x += wrapDist * 2;
        if (dz > wrapDist) this.group.position.z -= wrapDist * 2;
        if (dz < -wrapDist) this.group.position.z += wrapDist * 2;
    }
    
    setOpacity(opacity) {
        this.group.traverse(child => {
            if (child.isMesh) {
                child.material.opacity = opacity * (child.material === cloudMaterialDark ? 0.75 : 0.85);
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const SkySystem = {
    init(deps) {
        Object.assign(_deps, deps);
        
        // Create sky shader material
        skyMat = new THREE.ShaderMaterial({
            uniforms: {
                sunPos: { value: new THREE.Vector3(0, 1, 0) },
                tod: { value: 0.5 },
                cloud: { value: 0.35 },
                time: { value: 0 },
                biomeTint: { value: new THREE.Color(0.53, 0.81, 0.92) }, // Default sky blue
                biomeFog: { value: new THREE.Color(0.78, 0.66, 0.51) }   // Default fog color
            },
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            side: THREE.BackSide
        });
        
        // Create sky sphere
        skySphere = new THREE.Mesh(
            new THREE.SphereGeometry(2000, 32, 32),
            skyMat
        );
        
        if (_deps.scene) {
            _deps.scene.add(skySphere);
        }
        
        // Spawn volumetric clouds
        this.spawnClouds(25);
        
        console.log(`Spawned ${clouds.length} volumetric clouds`);
    },
    
    spawnClouds(count) {
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 2000;
            const z = (Math.random() - 0.5) * 2000;
            const y = 180 + Math.random() * 120; // Cloud altitude
            const scale = 0.6 + Math.random() * 0.8;
            clouds.push(new Cloud(x, y, z, scale));
        }
    },
    
    // Update sky uniforms
    updateUniforms(sunPos, tod, cloudCover, time) {
        if (skyMat) {
            skyMat.uniforms.sunPos.value.copy(sunPos);
            skyMat.uniforms.tod.value = tod;
            skyMat.uniforms.cloud.value = cloudCover;
            skyMat.uniforms.time.value = time;
        }
    },
    
    // Update biome-based sky tint
    setBiomeTint(skyColor, fogColor) {
        if (skyMat) {
            skyMat.uniforms.biomeTint.value.set(skyColor);
            skyMat.uniforms.biomeFog.value.set(fogColor);
        }
    },
    
    // Update clouds
    updateClouds(delta, windDir, windStr, playerPos) {
        for (const cloud of clouds) {
            cloud.update(delta, windDir, windStr, playerPos);
        }
    },
    
    // Set cloud opacity (for weather effects)
    setCloudOpacity(opacity) {
        for (const cloud of clouds) {
            cloud.setOpacity(opacity);
        }
    },
    
    // Get sky material for external updates
    getMaterial() {
        return skyMat;
    },
    
    // Get cloud list
    getClouds() {
        return clouds;
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
    SkySystem,
    Cloud,
    skySphere,
    skyMat,
    clouds
};

export default SkySystem;
