/**
 * Neon Overdrive: Retro Space Shooter
 * Core Game Engine, Systems, and Audio Synthesizer
 */

// ==========================================================================
// 1. AUDIO SYNTHESIZER (Web Audio API)
// ==========================================================================
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicInterval = null;
        this.musicTempo = 135; // BPM
        this.musicStep = 0;
        this.musicSynth = null;
        this.musicFilter = null;
        this.bassSequence = [
            48, 48, 48, 48, 51, 51, 53, 53, // C3, C3, C3, C3, Eb3, Eb3, F3, F3
            48, 48, 48, 48, 46, 46, 43, 43  // C3, C3, C3, C3, Bb2, Bb2, G2, G2
        ];
    }

    init() {
        if (this.ctx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        
        this.ctx = new AudioContextClass();
        
        // Master gain node
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Music Lowpass Filter for that retro-synthwave sweep
        this.musicFilter = this.ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
        this.musicFilter.Q.setValueAtTime(2, this.ctx.currentTime);
        this.musicFilter.connect(this.masterGain);

        this.startMusicLoop();
    }

    // Convert MIDI note to Frequency
    mtof(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }

    playShoot(type) {
        if (!this.ctx || this.muted) return;
        this.init();

        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        if (type === 'blaster') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, time);
            osc.frequency.exponentialRampToValueAtTime(150, time + 0.12);
            gain.gain.setValueAtTime(0.4, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
            osc.start(time);
            osc.stop(time + 0.12);
        } else if (type === 'shotgun') {
            // Noise-like blast combined with a pitch sweep
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, time);
            osc.frequency.exponentialRampToValueAtTime(80, time + 0.2);
            gain.gain.setValueAtTime(0.6, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
            
            // Add a short high-pass noise burst
            const noise = this.createNoiseBuffer();
            if (noise) {
                const noiseNode = this.ctx.createBufferSource();
                noiseNode.buffer = noise;
                const noiseFilter = this.ctx.createBiquadFilter();
                noiseFilter.type = 'bandpass';
                noiseFilter.frequency.value = 1000;
                const noiseGain = this.ctx.createGain();
                
                noiseNode.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(this.masterGain);
                
                noiseGain.gain.setValueAtTime(0.3, time);
                noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
                
                noiseNode.start(time);
                noiseNode.stop(time + 0.15);
            }

            osc.start(time);
            osc.stop(time + 0.2);
        } else if (type === 'railgun') {
            // Charging whine then a massive beam sound
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, time);
            osc.frequency.linearRampToValueAtTime(1800, time + 0.1);
            gain.gain.setValueAtTime(0.8, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
            
            osc.start(time);
            osc.stop(time + 0.3);
        } else if (type === 'missile') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(200, time);
            osc.frequency.exponentialRampToValueAtTime(600, time + 0.25);
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
            osc.start(time);
            osc.stop(time + 0.25);
        }
    }

    playExplosion(size = 'medium') {
        if (!this.ctx || this.muted) return;
        this.init();

        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sawtooth';
        filter.type = 'lowpass';

        let duration = 0.3;
        let startFreq = 200;
        let endFreq = 20;

        if (size === 'small') {
            duration = 0.2;
            startFreq = 300;
            gain.gain.setValueAtTime(0.4, time);
        } else if (size === 'medium') {
            duration = 0.4;
            startFreq = 180;
            gain.gain.setValueAtTime(0.7, time);
        } else if (size === 'large') {
            duration = 0.8;
            startFreq = 100;
            gain.gain.setValueAtTime(1.0, time);
            filter.Q.setValueAtTime(5, time);
        }

        osc.frequency.setValueAtTime(startFreq, time);
        osc.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
        filter.frequency.setValueAtTime(startFreq * 2, time);
        filter.frequency.exponentialRampToValueAtTime(30, time + duration);
        
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.start(time);
        osc.stop(time + duration);

        // Add white noise for texture
        const noise = this.createNoiseBuffer();
        if (noise) {
            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = noise;
            const noiseGain = this.ctx.createGain();
            const noiseFilter = this.ctx.createBiquadFilter();
            
            noiseNode.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(600, time);
            noiseFilter.frequency.exponentialRampToValueAtTime(50, time + duration);

            noiseGain.gain.setValueAtTime(gain.gain.value * 0.8, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, time + duration);
            
            noiseNode.start(time);
            noiseNode.stop(time + duration);
        }
    }

    playShieldHit() {
        if (!this.ctx || this.muted) return;
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, time);
        osc.frequency.exponentialRampToValueAtTime(800, time + 0.15);
        
        gain.gain.setValueAtTime(0.5, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        
        osc.start(time);
        osc.stop(time + 0.15);
    }

    playUpgrade() {
        if (!this.ctx || this.muted) return;
        const time = this.ctx.currentTime;
        
        const playTone = (freq, startTime, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        playTone(523.25, time, 0.1); // C5
        playTone(659.25, time + 0.08, 0.1); // E5
        playTone(783.99, time + 0.16, 0.12); // G5
        playTone(1046.50, time + 0.24, 0.2); // C6
    }

    playGameOver() {
        if (!this.ctx || this.muted) return;
        const time = this.ctx.currentTime;
        
        const playTone = (freq, startTime, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.4, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        playTone(392.00, time, 0.25); // G4
        playTone(349.23, time + 0.2, 0.25); // F4
        playTone(311.13, time + 0.4, 0.25); // Eb4
        playTone(261.63, time + 0.6, 0.6); // C4
    }

    playBossWarning() {
        if (!this.ctx || this.muted) return;
        const time = this.ctx.currentTime;
        
        const playSiren = (startTime) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, startTime);
            osc.frequency.linearRampToValueAtTime(440, startTime + 0.4);
            osc.frequency.linearRampToValueAtTime(220, startTime + 0.8);
            
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
            
            osc.start(startTime);
            osc.stop(startTime + 0.8);
        };

        playSiren(time);
        playSiren(time + 0.9);
        playSiren(time + 1.8);
    }

    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    startMusicLoop() {
        if (this.musicInterval) return;
        const intervalTime = (60 / this.musicTempo) / 2 * 1000; // Eighth notes
        
        this.musicInterval = setInterval(() => {
            this.playMusicStep();
        }, intervalTime);
    }

    playMusicStep() {
        if (!this.ctx || this.muted || this.ctx.state === 'suspended') return;
        
        const time = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicFilter);

        // Basic synthwave 8th note bassline
        const noteIndex = this.musicStep % this.bassSequence.length;
        let midinote = this.bassSequence[noteIndex];
        
        // Accent/variation on step 7 and 15
        if (this.musicStep % 8 === 7) {
            midinote += 12; // Octave jump
        }

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(this.mtof(midinote), time);
        
        gain.gain.setValueAtTime(0.18, time);
        // Short plucky bass notes
        gain.gain.exponentialRampToValueAtTime(0.005, time + 0.15);

        // Slowly sweep filter frequency up and down for synthwave flavor
        const sweep = Math.sin(time * 0.1) * 300 + 600;
        this.musicFilter.frequency.setValueAtTime(sweep, time);

        osc.start(time);
        osc.stop(time + 0.18);

        this.musicStep++;
    }

    stopMusicLoop() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

const audio = new AudioEngine();


// ==========================================================================
// 2. PARTICLE ENGINE & VISUAL EFFECTS
// ==========================================================================
class Particle {
    constructor(x, y, color, vx, vy, size, decay, type = 'normal') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.alpha = 1;
        this.decay = decay;
        this.type = type; // 'normal', 'thruster', 'laser-dust', 'shield'
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        if (this.type === 'thruster') {
            this.size *= 0.95;
        }
    }

    draw(ctx) {
        // No per-particle save/restore — caller handles state
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        
        if (this.type === 'shield') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        }
    }
}

// Floating Damage Numbers & Text
class FloatingText {
    constructor(x, y, text, color, isCrit = false) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.isCrit = isCrit;
        this.alpha = 1;
        this.vy = -1.2 - Math.random() * 1;
        this.vx = (Math.random() - 0.5) * 1;
        this.life = 1.0;
        this.decay = 0.02;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.font = this.isCrit ? "bold 18px 'Orbitron'" : "12px 'Share Tech Mono'";
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isCrit ? 10 : 0;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}


// ==========================================================================
// 3. ENERGY SCRAP COLLECTIBLE
// ==========================================================================
class Scrap {
    constructor(x, y, val = 1) {
        this.x = x;
        this.y = y;
        this.val = val;
        this.size = 6 + Math.min(val, 4);
        
        // Spawn with random scatter speed
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        this.friction = 0.96;
        this.color = '#fffb00'; // Glowing Synth Yellow
        this.pulse = 0;
        this.collected = false;
        // Scraps expire after 15s so they don't accumulate and tank performance
        this.born = Date.now();
        this.lifetime = 15000;
        this.dead = false;
    }

    update(playerX, playerY) {
        if (this.dead) return;

        const age = Date.now() - this.born;
        if (age > this.lifetime) { this.dead = true; return; }

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.x += this.vx;
        this.y += this.vy;
        
        this.pulse += 0.15;

        // Magnetism: pull towards player if within range
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 380) {
            const pullStrength = (380 - dist) / 380 * 0.9;
            this.vx += (dx / dist) * pullStrength;
            this.vy += (dy / dist) * pullStrength;
            
            // Limit pull speed
            const mag = Math.hypot(this.vx, this.vy);
            if (mag > 14) {
                this.vx = (this.vx / mag) * 14;
                this.vy = (this.vy / mag) * 14;
            }
        }
    }

    draw(ctx) {
        if (this.dead) return;
        const age = Date.now() - this.born;
        // Fade out in final 3 seconds of lifetime
        const fadeAlpha = age > this.lifetime - 3000
            ? Math.max(0, (this.lifetime - age) / 3000)
            : 1.0;
        ctx.save();
        ctx.globalAlpha = fadeAlpha;
        // Small fixed glow — shadowBlur is expensive, keep it low
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4;
        ctx.fillStyle = this.color;
        
        // Draw diamond shape
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.size);
        ctx.lineTo(this.x + this.size, this.y);
        ctx.lineTo(this.x, this.y + this.size);
        ctx.lineTo(this.x - this.size, this.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}


// ==========================================================================
// 4. BULLET / PROJECTILE CLASS
// ==========================================================================
class Bullet {
    constructor(x, y, angle, speed, damage, isPlayer, type = 'blaster', target = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.isPlayer = isPlayer;
        this.type = type; // 'blaster', 'shotgun', 'missile', 'railgun', 'enemy'
        this.target = target; // target reference for homing missiles
        this.life = 1.0;
        
        // Define sizes/colors based on type
        switch (type) {
            case 'blaster':
                this.color = '#00f3ff'; // Cyan
                this.size = 4;
                break;
            case 'shotgun':
                this.color = '#ff00aa'; // Magenta
                this.size = 3;
                break;
            case 'missile':
                this.color = '#fffb00'; // Yellow
                this.size = 6;
                this.turnSpeed = 0.08;
                this.speed = speed;
                break;
            case 'enemy':
                this.color = '#ff0055'; // Red-Pink
                this.size = 4;
                break;
        }
    }

    update(enemies) {
        if (this.type === 'missile') {
            this.updateHoming(enemies);
        }

        this.x += this.vx;
        this.y += this.vy;
    }

    updateHoming(enemies) {
        // If target is dead or null, search for the nearest one
        if (!this.target || this.target.dead) {
            let nearestDist = Infinity;
            let nearestEnemy = null;
            for (let e of enemies) {
                const dist = Math.hypot(e.x - this.x, e.y - this.y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestEnemy = e;
                }
            }
            this.target = nearestEnemy;
        }

        // Steer toward target
        if (this.target) {
            const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
            
            // Interpolate angle smoothly
            let diff = targetAngle - this.angle;
            // Wrap difference between -PI and PI
            diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            
            this.angle += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed);
            
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
        }
    }

    draw(ctx) {
        ctx.save();
        // No shadowBlur on bullets — too expensive in tight loops, solid color is fine
        ctx.fillStyle = this.color;

        if (this.type === 'missile') {
            // Draw rocket with flame tail
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-6, 4);
            ctx.closePath();
            ctx.fill();
        } else {
            // Standard rounded circle — no glow needed
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}


// ==========================================================================
// 4b. ENEMY HAZARD — Lingering ground dangers (Terraria-style)
// ==========================================================================
class EnemyHazard {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'toxic', 'mine', 'fire'
        this.dead = false;
        this.pulse = Math.random() * Math.PI * 2;
        this.triggered = false; // mine only

        switch (type) {
            case 'toxic':
                this.radius    = 28;
                this.color     = '#39ff14';
                this.damage    = 8;          // per second
                this.lifetime  = 5000;       // ms
                this.born      = Date.now();
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = (Math.random() - 0.5) * 1.5;
                break;
            case 'mine':
                this.radius    = 14;
                this.color     = '#ff9900';
                this.damage    = 40;         // contact explosion
                this.lifetime  = 12000;
                this.born      = Date.now();
                this.vx = (Math.random() - 0.5) * 0.6;
                this.vy = (Math.random() - 0.5) * 0.6 + 0.5; // slowly drifts down
                this.armDelay  = 1200;       // ms before it's active
                break;
            case 'fire':
                this.radius    = 20;
                this.color     = '#ff4400';
                this.damage    = 12;
                this.lifetime  = 3500;
                this.born      = Date.now();
                this.vx = (Math.random() - 0.5) * 2;
                this.vy = (Math.random() - 0.5) * 2;
                break;
        }
    }

    update(player, particles) {
        const age = Date.now() - this.born;
        if (age > this.lifetime) { this.dead = true; return; }

        this.pulse += 0.12;
        this.x += this.vx;
        this.y += this.vy;

        // Friction / drift slowdown
        this.vx *= 0.98;
        this.vy *= 0.98;

        // Emit ambient particles
        if (Math.random() < 0.25) {
            const c = this.type === 'toxic' ? '#39ff14' : (this.type === 'mine' ? '#ff9900' : '#ff4400');
            particles.push(new Particle(
                this.x + (Math.random() - 0.5) * this.radius,
                this.y + (Math.random() - 0.5) * this.radius,
                c,
                (Math.random() - 0.5) * 1.5,
                -Math.random() * 1.5,
                Math.random() * 4 + 2,
                0.04
            ));
        }

        // Mine: arm then check contact explosion
        if (this.type === 'mine') {
            if (age < this.armDelay) return; // not yet armed
        }

        // Player contact check
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < player.radius + this.radius && !player.isDashing) {
            if (this.type === 'mine') {
                // Instant detonation
                player.damage(this.damage);
                this.dead = true;
                // Blast ring particles
                for (let i = 0; i < 20; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const s = Math.random() * 5 + 2;
                    particles.push(new Particle(this.x, this.y, '#ff9900',
                        Math.cos(a) * s, Math.sin(a) * s,
                        Math.random() * 6 + 3, 0.04));
                }
                audio.playExplosion('medium');
            } else {
                // Continuous burn/acid damage (~damage per second @ 60fps)
                player.damage(this.damage / 60);
            }
        }
    }

    draw(ctx) {
        const age  = Date.now() - this.born;
        const fade = Math.max(0, 1 - age / this.lifetime);

        ctx.save();
        ctx.globalAlpha = fade * (0.55 + Math.sin(this.pulse) * 0.2);
        // Reduced shadowBlur from 18 → 6 to eliminate per-draw blur cost
        ctx.shadowColor = this.color;
        ctx.shadowBlur  = 6;

        if (this.type === 'toxic') {
            // Bubbling acid pool
            ctx.fillStyle = this.color + '55';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + Math.sin(this.pulse) * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.stroke();

        } else if (this.type === 'mine') {
            const armed = (age > this.armDelay);
            ctx.strokeStyle = armed ? '#ff9900' : '#888';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            // Skull-like cross
            ctx.beginPath();
            ctx.moveTo(this.x - 8, this.y); ctx.lineTo(this.x + 8, this.y);
            ctx.moveTo(this.x, this.y - 8); ctx.lineTo(this.x, this.y + 8);
            ctx.stroke();
            if (armed) {
                // Pulsing danger ring
                ctx.globalAlpha = (0.3 + Math.sin(this.pulse * 3) * 0.3) * fade;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
                ctx.stroke();
            }

        } else if (this.type === 'fire') {
            // Fire node
            ctx.fillStyle = this.color + '44';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + Math.sin(this.pulse * 2) * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ==========================================================================
// 5. PLAYER SHIP CLASS
// ==========================================================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 18;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        this.accel = 0.55;
        this.friction = 0.90;
        
        // Stats & Progression values
        this.maxHp = 100;
        this.hp = 100;
        
        this.maxShield = 100;
        this.shield = 100;
        this.shieldRegenDelay = 2000; // ms to start regeneration after hit
        this.shieldRegenRate = 0.25; // shield healed per frame during regen
        this.lastHitTime = 0;

        this.baseSpeed = 5.5;
        
        // Weapon management
        this.activeWeapon = 'blaster'; // 'blaster', 'shotgun', 'railgun', 'missile'
        this.unlockedWeapons = ['blaster']; // Blaster is default
        this.weaponIndex = 0;
        this.lastShootTime = 0;
        
        // Cooldowns
        this.shootCooldowns = {
            blaster: 130,
            shotgun: 450,
            railgun: 700,
            missile: 600
        };
        
        // Weapon Damages
        this.weaponDamage = {
            blaster: 12,
            shotgun: 9, // x 5 pellets
            railgun: 40,
            missile: 35
        };

        // Dash action state
        this.dashCooldown = 1500; // ms
        this.lastDashTime = 0;
        this.dashDuration = 150; // ms active dash length
        this.isDashing = false;
        this.dashVx = 0;
        this.dashVy = 0;
        
        // Visual effects values
        this.angle = 0; // facing direction (towards mouse)
        this.pulseShield = 0;
        this.thrusterAnim = 0;

        // Valorant-style accuracy / recoil settings
        this.recoil = 0;             // current spray error (in radians)
        this.maxRecoil = 0.28;       // max spray deviation (~16 degrees)
        this.recoilRecovery = 0.008; // recoil recovery rate per frame
        this.movementError = 0;      // movement error modifier
    }

    update(keys, mouse, width, height, particleEngine) {
        const timeNow = Date.now();

        // 1. Dash Duration Ending Check
        if (this.isDashing && timeNow - this.lastDashTime > this.dashDuration) {
            this.isDashing = false;
        }

        // 2. Shield Regeneration
        if (timeNow - this.lastHitTime > this.shieldRegenDelay) {
            this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate);
        }

        // 3. Movement Physics (Friction, Acceleration, Dash Velocity override)
        if (this.isDashing) {
            this.x += this.dashVx;
            this.y += this.dashVy;
            
            // Thruster particle trail during dash
            for (let i = 0; i < 2; i++) {
                particleEngine.push(new Particle(
                    this.x - Math.cos(this.angle) * 15,
                    this.y - Math.sin(this.angle) * 15,
                    i % 2 === 0 ? '#ff00aa' : '#00f3ff',
                    -Math.cos(this.angle) * 5 + (Math.random() - 0.5) * 2,
                    -Math.sin(this.angle) * 5 + (Math.random() - 0.5) * 2,
                    Math.random() * 6 + 4,
                    0.05,
                    'thruster'
                ));
            }
        } else {
            let ax = 0;
            let ay = 0;

            if (keys['w'] || keys['arrowup']) ay -= this.accel;
            if (keys['s'] || keys['arrowdown']) ay += this.accel;
            if (keys['a'] || keys['arrowleft']) ax -= this.accel;
            if (keys['d'] || keys['arrowright']) ax += this.accel;

            // Apply acceleration
            this.vx += ax;
            this.vy += ay;
            
            // Clamp speed to baseSpeed
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > this.baseSpeed) {
                this.vx = (this.vx / speed) * this.baseSpeed;
                this.vy = (this.vy / speed) * this.baseSpeed;
            }

            // Apply friction/drag
            this.vx *= this.friction;
            this.vy *= this.friction;

            this.x += this.vx;
            this.y += this.vy;

            // Thruster flame particle animation
            this.thrusterAnim += 0.2;
            if (Math.hypot(this.vx, this.vy) > 0.5) {
                particleEngine.push(new Particle(
                    this.x - Math.cos(this.angle) * 15,
                    this.y - Math.sin(this.angle) * 15,
                    '#00f3ff',
                    -Math.cos(this.angle) * 3 + (Math.random() - 0.5) * 1,
                    -Math.sin(this.angle) * 3 + (Math.random() - 0.5) * 1,
                    Math.random() * 4 + 2,
                    0.07,
                    'thruster'
                ));
            }
        }

        // 4. Stay inside bounds
        this.x = Math.max(this.radius, Math.min(width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(height - this.radius, this.y));

        // 5. Angle towards cursor
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        this.angle = Math.atan2(dy, dx);
        
        // 6. Shield aesthetic pulse
        this.pulseShield = (this.pulseShield + 0.08) % (Math.PI * 2);

        // 7. Valorant-style Recoil Recovery and Movement Error calculation
        if (timeNow - this.lastShootTime > 160) {
            this.recoil = Math.max(0, this.recoil - this.recoilRecovery * 1.5);
        } else {
            this.recoil = Math.max(0, this.recoil - this.recoilRecovery * 0.2);
        }

        const currentSpeed = Math.hypot(this.vx, this.vy);
        if (this.isDashing) {
            this.movementError = 0.35; // Dash spread is massive
        } else {
            // Standing perfectly still = 0 movement error.
            // Moving adds up to 0.12 rad (~7 degrees) error.
            this.movementError = (currentSpeed / this.baseSpeed) * 0.12;
        }
    }

    triggerDash(keys) {
        const timeNow = Date.now();
        if (this.isDashing || timeNow - this.lastDashTime < this.dashCooldown) return;

        // Determine dash direction based on keys pressed
        let dx = 0;
        let dy = 0;
        
        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;

        // If no movement keys are pressed, dash towards cursor
        if (dx === 0 && dy === 0) {
            dx = Math.cos(this.angle);
            dy = Math.sin(this.angle);
        } else {
            // Normalize direction
            const len = Math.hypot(dx, dy);
            dx /= len;
            dy /= len;
        }

        // Apply dash burst
        this.isDashing = true;
        this.lastDashTime = timeNow;
        this.dashVx = dx * (this.baseSpeed * 2.8);
        this.dashVy = dy * (this.baseSpeed * 2.8);
        
        // Play short sonic blast sound
        audio.playExplosion('small');
    }

    damage(amount) {
        if (this.isDashing || this.hp <= 0) return 0; // Invulnerable

        this.lastHitTime = Date.now();
        let absorbed = 0;

        if (this.shield > 0) {
            audio.playShieldHit();
            const dmgToShield = Math.min(this.shield, amount);
            this.shield -= dmgToShield;
            absorbed = dmgToShield;
            amount -= dmgToShield;
        }

        if (amount > 0) {
            audio.playExplosion('small');
            this.hp = Math.max(0, this.hp - amount);
        }
        return amount + absorbed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Small fixed glow — reduced from 15 to 6 (shadowBlur is very expensive)
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 6;

        // Draw Player Ship (Neon arrowhead style with glowing wings)
        ctx.lineWidth = 2.5;
        
        // Wings/Shield generator details
        ctx.strokeStyle = '#ff00aa';
        ctx.beginPath();
        ctx.moveTo(-10, -12);
        ctx.lineTo(-4, -14);
        ctx.lineTo(-8, -4);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-10, 12);
        ctx.lineTo(-4, 14);
        ctx.lineTo(-8, 4);
        ctx.stroke();

        // Main Hull
        ctx.strokeStyle = '#00f3ff';
        ctx.beginPath();
        ctx.moveTo(18, 0);       // Nose
        ctx.lineTo(-12, -12);    // Left back
        ctx.lineTo(-6, 0);       // Inner indentation
        ctx.lineTo(-12, 12);     // Right back
        ctx.closePath();
        ctx.stroke();

        // Thruster core glow
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-8, -2, 3, 4);

        ctx.restore();

        // Draw active glowing shield bubble if shield is charged
        if (this.shield > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 243, 255, ${0.15 + Math.sin(this.pulseShield) * 0.08})`;
            ctx.lineWidth = 3 + Math.sin(this.pulseShield) * 1.5;
            // No shadowBlur on shield ring — already drawn with alpha blending
            ctx.stroke();
            ctx.restore();
        }
    }
}


// ==========================================================================
// 6. ENEMY SUB-SYSTEM & AI BEHAVIOR
// ==========================================================================
class Enemy {
    constructor(x, y, type, waveMultiplier = 1.0) {
        this.x = x;
        this.y = y;
        this.type = type; // 'scout', 'kamikaze', 'striker', 'boss', 'boss_satellite'
        this.dead = false;
        
        this.pulse = 0;
        this.shootTimer = Math.random() * 2000;
        this._hazardDropCb = null;

        const speedScale = Math.min(1.8, 1.0 + (waveMultiplier - 1) * 0.12);
        
        switch (type) {
            case 'scout': // Renamed visually to Void Orblet
                this.hp = 18 * waveMultiplier;
                this.maxHp = this.hp;
                this.radius = 12;
                this.color = '#bf55ec'; // Shadow purple
                this.speed = (2.2 + Math.random() * 0.6) * speedScale;
                this.scrapVal = 2;
                this.points = 100;
                this.scoutShootCooldown = Math.max(1000, 2400 - waveMultiplier * 150);
                this.lastShoot = 0;
                break;
            case 'kamikaze': // Renamed visually to Entropic Void Seeker
                this.hp = 12 * waveMultiplier;
                this.maxHp = this.hp;
                this.radius = 10;
                this.color = '#ff0077'; // Burning pink
                this.speed = 3.6 * speedScale;
                this.scrapVal = 3;
                this.points = 150;
                this.targetAngle = 0;
                break;
            case 'striker': // Renamed visually to Abyssal Sentry
                this.hp = 40 * waveMultiplier;
                this.maxHp = this.hp;
                this.radius = 16;
                this.color = '#9b59b6'; // Abyssal purple
                this.speed = 1.4 * speedScale;
                this.scrapVal = 6;
                this.points = 300;
                this.shootCooldown = Math.max(500, 1400 / Math.min(2.0, 1.0 + (waveMultiplier - 1) * 0.08));
                this.lastShoot = 0;
                break;
            case 'boss': // NOXUS, THE ENTROPIC GOD
                this.hp = 1000 * waveMultiplier;
                this.maxHp = this.hp;
                this.radius = 65;
                this.color = '#000000'; // Dark Void
                this.speed = 0.8 * Math.min(1.5, 1.0 + (waveMultiplier - 1) * 0.07);
                this.scrapVal = 100;
                this.points = 10000;
                
                this.bossPhase = 1; // 1: Satellites active (Invulnerable), 2: Vulnerable (Core Exposed), 3: Enraged (Gravity/Reality split)
                this.lastAttackTime = 0;
                this.attackCooldown = 2200;
                this.targetY = 160;
                this.satelliteSpawned = false;

                // Noxus specific variables
                this.singularityActive = false;
                this.singularityX = 0;
                this.singularityY = 0;
                this.singularityPulse = 0;
                this.warningLines = [];
                this.alpha = 1.0;
                this.targetAlpha = 1.0;
                this.warpTimer = 0;
                this.isWarping = false;
                this.dashTargetX = 0;
                this.dashTargetY = 0;
                this.isDashing = false;
                break;
            case 'boss_satellite': // Dark Core Shield Satellites
                this.hp = 120 * waveMultiplier;
                this.maxHp = this.hp;
                this.radius = 16;
                this.color = '#a537fd';
                this.speed = 0;
                this.scrapVal = 10;
                this.points = 1000;
                
                this.orbitAngle = 0;
                this.orbitRadius = 110;
                this.bossRef = null;
                break;
        }
    }

    update(player, bullets, particleEngine, width, height) {
        this.pulse += 0.1;
        const timeNow = Date.now();

        // Noxus Gravity Pull logic (Phase 2 & 3 Singularity)
        if (this.type === 'boss' && this.singularityActive) {
            const pdx = this.singularityX - player.x;
            const pdy = this.singularityY - player.y;
            const pdist = Math.hypot(pdx, pdy);
            if (pdist < 700) {
                // Insanely strong pull like Noxus's black hole
                const force = (1.0 - pdist / 700) * 0.55;
                player.vx += (pdx / pdist) * force;
                player.vy += (pdy / pdist) * force;
            }
        }

        // Alpha fade interpolation (for teleportation warp)
        if (this.type === 'boss') {
            this.alpha += (this.targetAlpha - this.alpha) * 0.1;
        }

        switch (this.type) {
            case 'scout': {
                // Sine-wave drift
                this.y += this.speed;
                this.x += Math.sin(this.y / 20) * 2.0;

                // Fire scatter shot
                if (!this.lastShoot) this.lastShoot = timeNow + Math.random() * 1500;
                if (timeNow - this.lastShoot > this.scoutShootCooldown) {
                    this.lastShoot = timeNow;
                    const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
                    for (let i = -1; i <= 1; i++) {
                        bullets.push(new Bullet(
                            this.x, this.y, baseAngle + i * 0.25,
                            4.0, 8, false, 'enemy'
                        ));
                    }
                    audio.playShoot('blaster');
                }
                if (this.y > height + 40) this.dead = true;
                break;
            }

            case 'kamikaze': {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.hypot(dx, dy);

                this.targetAngle = Math.atan2(dy, dx);
                this.x += Math.cos(this.targetAngle) * this.speed;
                this.y += Math.sin(this.targetAngle) * this.speed;

                // Fire hazard nodes
                if (!this.lastFireNode) this.lastFireNode = timeNow;
                if (timeNow - this.lastFireNode > 250) {
                    this.lastFireNode = timeNow;
                    if (this._hazardDropCb) this._hazardDropCb(new EnemyHazard(this.x, this.y, 'fire'));
                }

                if (dist < this.radius + player.radius) {
                    player.damage(30); // Heavy damage seeker
                    this.dead = true;
                    this.explode(particleEngine);
                    for (let i = 0; i < 10; i++) {
                        bullets.push(new Bullet(this.x, this.y, (i / 10) * Math.PI * 2, 5.5, 9, false, 'enemy'));
                    }
                    audio.playExplosion('medium');
                }
                if (this.y > height + 40) this.dead = true;
                break;
            }

            case 'striker': {
                if (this.y < 220) {
                    this.y += this.speed;
                } else {
                    this.x += Math.sin(this.pulse * 0.25) * 1.0;
                }

                if (timeNow - this.lastShoot > this.shootCooldown) {
                    this.lastShoot = timeNow;
                    this._burstCount = 3;
                    this._burstTimer = timeNow;
                }
                if (this._burstCount > 0 && timeNow - this._burstTimer > 100) {
                    this._burstTimer = timeNow;
                    this._burstCount--;
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    for (let spread of [-0.2, 0, 0.2]) {
                        bullets.push(new Bullet(
                            this.x, this.y + this.radius,
                            angle + spread, 5.2, 11, false, 'enemy'
                        ));
                    }
                    audio.playShoot('blaster');
                }
                if (timeNow - this.lastMine > 5000) {
                    this.lastMine = timeNow;
                    if (this._hazardDropCb) this._hazardDropCb(new EnemyHazard(this.x, this.y, 'mine'));
                }
                if (this.y > height + 40) this.dead = true;
                break;
            }

            case 'boss': {
                // Enter arena
                if (!this.isWarping && !this.isDashing) {
                    if (this.y < this.targetY) {
                        this.y += this.speed;
                    } else {
                        // Slowly drift and sway cosmic style
                        this.x = (width / 2) + Math.sin(this.pulse * 0.05) * 180;
                        this.y = this.targetY + Math.cos(this.pulse * 0.08) * 20;
                    }
                }

                // Eldritch Dash logic
                if (this.isDashing) {
                    const ddx = this.dashTargetX - this.x;
                    const ddy = this.dashTargetY - this.y;
                    const ddist = Math.hypot(ddx, ddy);
                    
                    if (ddist > 15) {
                        this.x += (ddx / ddist) * 22; // hyper speed dash!
                        this.y += (ddy / ddist) * 22;
                        
                        // Drop hazard mine trail
                        if (Math.random() < 0.2 && this._hazardDropCb) {
                            this._hazardDropCb(new EnemyHazard(this.x, this.y, 'mine'));
                        }
                    } else {
                        this.isDashing = false;
                        this.lastAttackTime = timeNow;
                    }
                }

                // Attack trigger
                if (!this.isWarping && !this.isDashing && timeNow - this.lastAttackTime > this.attackCooldown) {
                    this.lastAttackTime = timeNow;
                    this.executeBossAttack(player, bullets, width, height);
                }
                break;
            }

            case 'boss_satellite': {
                if (this.bossRef && !this.bossRef.dead) {
                    this.orbitAngle += 0.045; // faster shield rotation
                    this.x = this.bossRef.x + Math.cos(this.orbitAngle) * this.orbitRadius;
                    this.y = this.bossRef.y + Math.sin(this.orbitAngle) * this.orbitRadius;
                } else {
                    this.dead = true;
                }
                break;
            }
        }
    }

    executeBossAttack(player, bullets, width, height) {
        const timeNow = Date.now();
        
        // Dynamic Attack Cycle for Noxus
        const attacks = this.bossPhase === 1 ? ['spiral'] : 
                       (this.bossPhase === 2 ? ['singularity', 'lasersweep', 'minions'] : 
                                               ['singularity', 'fissure', 'warp_dash']);
                                               
        const choice = attacks[Math.floor(Math.random() * attacks.length)];

        if (choice === 'spiral') {
            // Entropic Orbs Spiral
            const ringCount = 16;
            const baseAngle = Math.random() * Math.PI;
            for (let i = 0; i < ringCount; i++) {
                const angle = baseAngle + (i / ringCount) * Math.PI * 2;
                bullets.push(new Bullet(this.x, this.y, angle, 3.8, 12, false, 'enemy'));
            }
            audio.playShoot('shotgun');
        } 
        
        else if (choice === 'singularity') {
            // Pulse Void Singularity Black Hole
            this.singularityActive = true;
            this.singularityX = width / 2;
            this.singularityY = height * 0.45;
            
            // Blast bullet rings out of the black hole — reduced to 12 bullets/ring
            let ringPulses = 0;
            const maxRings = this.bossPhase === 3 ? 4 : 3;
            // Store interval so it can be killed if boss dies mid-attack
            if (this._singularityInterval) clearInterval(this._singularityInterval);
            this._singularityInterval = setInterval(() => {
                if (this.dead || this.bossPhase === 1) {
                    clearInterval(this._singularityInterval);
                    this._singularityInterval = null;
                    this.singularityActive = false;
                    return;
                }
                
                const count = 12; // reduced from 18 to reduce bullet count
                const offsetAngle = ringPulses * 0.2;
                for (let i = 0; i < count; i++) {
                    const angle = offsetAngle + (i / count) * Math.PI * 2;
                    bullets.push(new Bullet(this.singularityX, this.singularityY, angle, 3.2, 10, false, 'enemy'));
                }
                audio.playExplosion('small');
                
                ringPulses++;
                if (ringPulses >= maxRings) {
                    clearInterval(this._singularityInterval);
                    this._singularityInterval = null;
                    this.singularityActive = false;
                }
            }, 650); // slightly slower between rings for breathing room
        }

        else if (choice === 'lasersweep') {
            // Teleport and Sweep Laser Lines
            this.targetAlpha = 0.05; // Fade out
            this.isWarping = true;
            
            setTimeout(() => {
                if (this.dead) return;
                this.x = width / 2;
                this.y = 80;
                this.targetAlpha = 1.0; // Fade in
                
                // Show Warning Lines
                this.warningLines = [
                    { type: 'v', x: width * 0.25, width: 2 },
                    { type: 'v', x: width * 0.50, width: 2 },
                    { type: 'v', x: width * 0.75, width: 2 }
                ];
                
                setTimeout(() => {
                    this.warningLines = [];
                    if (this.dead) return;
                    // Fire lasers — reduced to 12 bullets per column (36 total vs old 105)
                    // Stagger columns slightly so all bullets don't spawn in one frame
                    const fireLaser = (lx, delay) => {
                        setTimeout(() => {
                            if (this.dead) return;
                            for (let j = 0; j < 12; j++) {
                                bullets.push(new Bullet(
                                    lx, 60 + j * 48, // spread start positions down the column
                                    Math.PI / 2 + (Math.random() - 0.5) * 0.12,
                                    5.5 + Math.random() * 2, 14, false, 'enemy'
                                ));
                            }
                        }, delay);
                    };
                    fireLaser(width * 0.25, 0);
                    fireLaser(width * 0.50, 80);
                    fireLaser(width * 0.75, 160);
                    audio.playExplosion('large');
                    this.isWarping = false;
                }, 1000);
            }, 600);
        }

        else if (choice === 'minions') {
            // Spawn swirling Void Minions
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const mx = this.x + Math.cos(angle) * 70;
                const my = this.y + Math.sin(angle) * 70;
                const minion = new Enemy(mx, my, 'scout', this.hp / this.maxHp * 1.5);
                minion._hazardDropCb = this._hazardDropCb;
                // Add to game enemies pool directly
                // (We can assume the controller pushes the minion dynamically since this update has access to the game context indirectly or we can spawn them as bullets)
                bullets.push(new Bullet(mx, my, Math.atan2(player.y - my, player.x - mx), 4.2, 10, false, 'enemy'));
            }
        }

        else if (choice === 'fissure') {
            // Noxus Reality Split - Grid Laser Fissures
            const h1 = Math.random() * (height - 200) + 100;
            const h2 = Math.random() * (height - 200) + 100;
            const v1 = Math.random() * (width - 200) + 100;

            this.warningLines = [
                { type: 'h', y: h1, width: 4 },
                { type: 'h', y: h2, width: 4 },
                { type: 'v', x: v1, width: 4 }
            ];

            setTimeout(() => {
                this.warningLines = [];
                if (this.dead) return;
                
                // Explode warning lines — reduced density 25→10 and stagger each
                // line's spawn by 120 ms so no single frame gets 150 bullets at once
                const spawnLineExp = (type, coord, delay) => {
                    setTimeout(() => {
                        if (this.dead) return;
                        const density = 10; // reduced from 25
                        for (let i = 0; i < density; i++) {
                            const pct = i / density;
                            if (type === 'h') {
                                bullets.push(new Bullet(pct * width, coord, -Math.PI / 2, 4.0, 16, false, 'enemy'));
                                bullets.push(new Bullet(pct * width, coord,  Math.PI / 2, 4.0, 16, false, 'enemy'));
                            } else {
                                bullets.push(new Bullet(coord, pct * height, 0,        4.0, 16, false, 'enemy'));
                                bullets.push(new Bullet(coord, pct * height, Math.PI,  4.0, 16, false, 'enemy'));
                            }
                        }
                    }, delay);
                };
                spawnLineExp('h', h1,   0);
                spawnLineExp('h', h2, 120);
                spawnLineExp('v', v1, 240);
                audio.playExplosion('large');
            }, 1200);
        }

        else if (choice === 'warp_dash') {
            // Teleport behind player and dash at hyper velocity
            this.targetAlpha = 0.0; // fully invisible warp
            this.isWarping = true;
            
            setTimeout(() => {
                if (this.dead) return;
                // Warp to random screen boundary
                const side = Math.floor(Math.random() * 4);
                if (side === 0) { this.x = 50; this.y = player.y; }
                else if (side === 1) { this.x = width - 50; this.y = player.y; }
                else if (side === 2) { this.x = player.x; this.y = 50; }
                else { this.x = player.x; this.y = height - 50; }
                
                this.targetAlpha = 1.0;
                this.isWarping = false;
                
                // Setup hyper dash target
                this.dashTargetX = player.x + (Math.random() - 0.5) * 100;
                this.dashTargetY = player.y + (Math.random() - 0.5) * 100;
                this.isDashing = true;
                
                audio.playExplosion('medium');
            }, 600);
        }
    }

    damage(amount, particleEngine, bossSatellites = []) {
        if (this.dead) return false;

        // Phase 1 Satellites protection check
        if (this.type === 'boss' && this.bossPhase === 1) {
            if (bossSatellites.length > 0) {
                // Satellites are alive, boss is invulnerable!
                particleEngine.push(new Particle(
                    this.x + (Math.random() - 0.5) * this.radius,
                    this.y + (Math.random() - 0.5) * this.radius,
                    '#a537fd',
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 4,
                    Math.random() * 5 + 3,
                    0.05,
                    'shield'
                ));
                audio.playShieldHit();
                return false;
            } else {
                // Transition to Phase 2
                this.bossPhase = 2;
                this.attackCooldown = 1800; // speed up attacks
                audio.playExplosion('large');
            }
        }

        this.hp -= amount;

        // Transition to Phase 3 Enraged
        if (this.type === 'boss' && this.bossPhase === 2 && this.hp < this.maxHp * 0.40) {
            this.bossPhase = 3;
            this.attackCooldown = 1000; // rapid enraged attacks!
            audio.playExplosion('large');
            this.floatingTexts.push(new FloatingText(this.x, this.y - 40, "NOXUS IS ENRAGED!", '#ff003c', true));
        }
        
        for (let i = 0; i < 3; i++) {
            particleEngine.push(new Particle(
                this.x, 
                this.y, 
                this.color === '#000000' ? '#a537fd' : this.color, 
                (Math.random() - 0.5) * 3, 
                (Math.random() - 0.5) * 3, 
                Math.random() * 3 + 1, 
                0.08
            ));
        }

        if (this.hp <= 0) {
            this.dead = true;
            this.explode(particleEngine);
            audio.playExplosion(this.type === 'boss' ? 'large' : 'medium');
            return true;
        }
        return false;
    }

    explode(particleEngine) {
        const count = this.type === 'boss' ? 120 : (this.type === 'striker' ? 25 : 12);
        const force = this.type === 'boss' ? 12 : 5;
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * force + 1;
            particleEngine.push(new Particle(
                this.x,
                this.y,
                this.type === 'boss' ? '#a537fd' : this.color,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() * 7 + 2,
                0.015 + Math.random() * 0.025
            ));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.type === 'boss' ? this.alpha : 1.0;

        // Fixed small glow — dynamic sin-based shadowBlur is expensive every frame
        ctx.shadowColor = this.type === 'boss' ? '#a537fd' : this.color;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = this.type === 'boss' ? '#a537fd' : this.color;
        ctx.lineWidth = 2.5;

        // Custom Reality Split lines
        if (this.type === 'boss' && this.warningLines && this.warningLines.length > 0) {
            ctx.restore();
            ctx.save();
            this.warningLines.forEach(line => {
                ctx.strokeStyle = `rgba(255, 0, 119, ${0.4 + Math.sin(Date.now() * 0.05) * 0.35})`;
                ctx.lineWidth = line.width;
                ctx.beginPath();
                if (line.type === 'h') {
                    ctx.moveTo(0, line.y);
                    ctx.lineTo(ctx.canvas.width, line.y);
                } else {
                    ctx.moveTo(line.x, 0);
                    ctx.lineTo(line.x, ctx.canvas.height);
                }
                ctx.stroke();
            });
            ctx.restore();
            ctx.save();
            ctx.translate(this.x, this.y);
        }

        // Custom Void Singularity (swirling black hole)
        if (this.type === 'boss' && this.singularityActive) {
            ctx.restore();
            ctx.save();
            ctx.translate(this.singularityX, this.singularityY);
            
            this.singularityPulse += 0.15;
            const r = 50 + Math.sin(this.singularityPulse) * 8;
            
            // Outer accretion disk — removed shadowBlur=30 (too expensive)
            ctx.strokeStyle = '#a537fd';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();

            // Inner dark singularity void
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
            ctx.fill();
            
            // Swirling arms
            ctx.strokeStyle = '#ff0077';
            ctx.lineWidth = 2.5;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.8, i * Math.PI / 2, i * Math.PI / 2 + Math.PI / 3);
                ctx.stroke();
            }
            ctx.restore();
            ctx.save();
            ctx.translate(this.x, this.y);
        }

        if (this.type === 'scout') {
            // Void Orblet
            ctx.fillStyle = this.color + '33';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();

        } else if (this.type === 'kamikaze') {
            // Entropic Seeker Star
            ctx.rotate(this.targetAngle - Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, this.radius * 1.3);
            ctx.lineTo(-this.radius * 0.7, -this.radius * 0.5);
            ctx.lineTo(0, -this.radius * 0.1);
            ctx.lineTo(this.radius * 0.7, -this.radius * 0.5);
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'striker') {
            // Abyssal Sentry Ring
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

        } else if (this.type === 'boss') {
            // Draw NOXUS, THE ENTROPIC GOD
            const r = this.radius;
            
            // Pulsing dark energy background void
            ctx.fillStyle = 'rgba(15, 10, 25, 0.95)';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
            ctx.fill();

            // Swirling entropic spiky outer ring
            ctx.strokeStyle = this.bossPhase === 3 ? '#ff003c' : '#a537fd';
            ctx.lineWidth = 3;
            const points = 18;
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const angle = (i / (points * 2)) * Math.PI * 2 + (this.pulse * 0.08);
                const offset = i % 2 === 0 ? 12 : -10;
                const d = r + offset + Math.sin(this.pulse * 1.5) * 4;
                const px = Math.cos(angle) * d;
                const py = Math.sin(angle) * d;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            // Outer Orbiting dark matter nodes
            ctx.fillStyle = '#ff0077';
            for (let i = 0; i < 3; i++) {
                const angle = (this.pulse * 0.35) + (i / 3) * Math.PI * 2;
                const px = Math.cos(angle) * (r * 0.7);
                const py = Math.sin(angle) * (r * 0.7);
                ctx.beginPath();
                ctx.arc(px, py, 6, 0, Math.PI * 2);
                ctx.fill();
            }

            // Glow core — only set shadowBlur here where it's most visible
            ctx.fillStyle = this.bossPhase === 1 ? '#00f3ff' : (this.bossPhase === 2 ? '#bf55ec' : '#ff003c');
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(0, 0, 16 + Math.sin(this.pulse * 2.0) * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0; // reset immediately after to stop contaminating next draws

        } else if (this.type === 'boss_satellite') {
            // Satellite orbit shield
            ctx.strokeStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}


// ==========================================================================
// 7. CORE GAME BOARD / GAME ENGINE CLASS
// ==========================================================================
class NeonShooterGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('gameContainer');
        
        // Game States
        // 'menu', 'playing', 'paused', 'shop', 'gameover', 'victory'
        this.state = 'menu';
        
        this.score = 0;
        this.wave = 1;
        this.scrap = 0;
        
        // Keyboard Inputs
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        
        // Entity Pools
        this.player = null;
        this.bullets = [];
        this.enemies = [];
        this.scraps = [];
        this.particles = [];
        this.floatingTexts = [];
        
        // Wave management spawning system
        this.waveActive = false;
        this.enemiesRemainingToSpawn = 0;
        this.lastSpawnTime = 0;
        this.spawnRate = 1800; // ms between enemy spawns
        this.waveTimer = 0;
        this.bossAlertActive = false;
        this.bossRef = null;

        // Visual screen shakes
        this.shakeIntensity = 0;
        this.shakeDecay = 0.90;

        // Web backgrounds
        this.gridSize = 40;
        this.scrollOffset = 0;

        // UI Shop Prices & Level tracking
        this.upgradeLevels = { hp: 0, shield: 0, speed: 0 };
        this.nextWeaponCost = 80;

        // Initialize hazard pool
        this.hazards = [];

        // Wave timer tracking
        this.waveStartTime = 0;     // Date.now() when current wave started
        this.pauseStartTime = 0;    // when the current pause began
        this.pausedDuration = 0;    // total ms paused this wave
        this._lastTimerSec = -1;    // last second value displayed (avoid redundant DOM writes)

        // Cache DOM elements used every frame — getElementById in a loop is expensive
        this._timerEl    = null;  // populated on first use after DOM ready
        this._perfBulEl  = null;
        this._perfPartEl = null;
        this._perfHazEl  = null;

        this.initResize();
        this.setupInputListeners();
        this.setupUIEvents();
    }

    initResize() {
        const resize = () => {
            const rect = this.container.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
        };
        resize();
        window.addEventListener('resize', resize);
    }

    setupInputListeners() {
        // Make canvas focusable so key inputs are not stolen by focused HTML buttons
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.style.outline = 'none';

        // Track key downs
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            this.keys[e.key] = true; // Store both capital and lowercase states

            // Prevent default browser/button actions for game controls to stop buttons from stealing focus
            const gameKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'escape', 'p'];
            if (this.state === 'playing' && gameKeys.includes(key)) {
                e.preventDefault();
            }

            // Pause toggle
            if (e.key === 'Escape' || key === 'p') {
                if (this.state === 'playing') {
                    this.pauseGame();
                } else if (this.state === 'paused') {
                    this.resumeGame();
                }
            }

            // Weapon hotkeys (1, 2, 3, 4)
            if (this.state === 'playing' && this.player) {
                if (key === '1') this.switchWeaponDirect('blaster');
                if (key === '2') this.switchWeaponDirect('shotgun');
                if (key === '3') this.switchWeaponDirect('railgun');
                if (key === '4') this.switchWeaponDirect('missile');
            }

            // Quick Space/Dash trigger
            if (e.key === ' ' && this.state === 'playing' && this.player) {
                e.preventDefault();
                this.player.triggerDash(this.keys);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.key] = false;
        });

        // Mouse aiming position tracker
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.canvas.focus(); // Force canvas focus on click
            if (e.button === 0) {
                this.mouse.down = true;
                // Initialize audio context on first interactive click
                audio.init();
            } else if (e.button === 2) {
                // Right click dodge dash
                e.preventDefault();
                if (this.state === 'playing' && this.player) {
                    this.player.triggerDash(this.keys);
                }
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.down = false;
        });

        // Block context menu on canvas
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());

        // ── Auto-pause triggers ──────────────────────────────────────────────
        // 1) Window loses focus (alt-tab, clicking another app)
        window.addEventListener('blur', () => {
            if (this.state === 'playing') {
                this.autoPause();
            }
        });

        // 2) Browser tab becomes hidden (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'playing') {
                this.autoPause();
            }
        });
    }

    // Auto-pause helper: pauses game and resets live input so ship doesn't
    // drift/shoot after the player returns to focus.
    autoPause() {
        this.pauseStartTime = Date.now();
        this.pauseGame();
        // Clear all held keys so movement doesn't continue on resume
        this.keys = {};
        // Release mouse fire button so ship stops shooting on resume
        this.mouse.down = false;
    }

    setupUIEvents() {
        // Start game button
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startGame();
        });

        // Resume game button
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });

        // Restart buttons
        document.getElementById('restartBtnPause').addEventListener('click', () => {
            this.startGame();
        });
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.startGame();
        });

        // Close shop button
        document.getElementById('closeShopBtn').addEventListener('click', () => {
            this.closeShop();
        });

        // Buy health upgrade button
        document.getElementById('buyHpBtn').addEventListener('click', () => {
            this.buyUpgrade('hp');
        });

        // Buy shield upgrade button
        document.getElementById('buyShieldBtn').addEventListener('click', () => {
            this.buyUpgrade('shield');
        });

        // Buy engine speed upgrade button
        document.getElementById('buySpeedBtn').addEventListener('click', () => {
            this.buyUpgrade('speed');
        });

        // Buy fire rate upgrade button
        document.getElementById('buyFireRateBtn').addEventListener('click', () => {
            this.buyUpgrade('fireRate');
        });

        // Buy / Unlock weapons button
        document.getElementById('buyWeaponBtn').addEventListener('click', () => {
            this.buyWeaponUpgrade();
        });
    }

    startGame() {
        this.score = 0;
        this.wave = 1;
        this.scrap = 0;
        this.upgradeLevels = { hp: 0, shield: 0, speed: 0, fireRate: 0 };
        this.nextWeaponCost = 80;

        // Reset pools
        this.player = new Player(this.canvas.width / 2, this.canvas.height * 0.75);
        this.bullets = [];
        this.enemies = [];
        this.scraps = [];
        this.particles = [];
        this.floatingTexts = [];
        this.hazards = [];
        
        // Wave control resets
        this.waveActive = false;
        this.bossAlertActive = false;
        this.bossRef = null;
        this.hazards = [];

        // UI transitions
        this.hideAllScreens();
        document.getElementById('hud').style.display = 'flex';
        this.updateHUD();
        this.state = 'playing';

        // Start synth loop audio
        audio.init();
        if (audio.ctx && audio.ctx.state === 'suspended') {
            audio.ctx.resume();
        }

        // Focus canvas so WASD keys work instantly
        this.canvas.focus();

        // Trigger start wave
        this.startWave();
    }

    getBossTitle() {
        if (this.wave === 1) return "NOXUS, THE ENTROPIC GHOST";
        if (this.wave === 2) return "NOXUS, THE APPARITION OF THE VOID";
        if (this.wave === 3) return "NOXUS, THE ABYSSAL DEITY";
        if (this.wave === 4) return "NOXUS, THE GOD OF NOTHINGNESS";
        return `NOXUS, THE ENTROPIC GOD (TIER ${this.wave - 4})`;
    }

    startWave() {
        this.waveActive = true;
        this.waveTimer = Date.now();
        // Reset wave timer
        this.waveStartTime = Date.now();
        this.pausedDuration = 0;
        this.pauseStartTime = 0;
        // NOTE: showWaveAnnouncement() intentionally NOT called here — the
        // warningOverlay below already displays the boss name, so calling both
        // would show two overlapping warning screens at the same time.
        
        // Overhauled: ONLY spawn boss! Standard waves are gone.
        this.enemiesToSpawn = [];
        this.enemiesRemainingToSpawn = 0;

        this.bossAlertActive = true;
        const warningOverlay = document.getElementById('warningOverlay');
        warningOverlay.style.display = 'flex';
        // Set warning header for Noxus
        const warningTitle = document.querySelector('.warning-title');
        if (warningTitle) {
            warningTitle.textContent = `⚠ ${this.getBossTitle()} ⚠`;
        }
        audio.playBossWarning();
        
        setTimeout(() => {
            warningOverlay.style.display = 'none';
            this.bossAlertActive = false;
            this.spawnBoss();
        }, 3000);

        this.updateHUD();
    }

    showWaveAnnouncement() {
        // Flash wave number on screen briefly
        const banner = document.createElement('div');
        banner.style.cssText = [
            'position:absolute', 'top:50%', 'left:50%',
            'transform:translate(-50%,-50%)',
            'font-family:Orbitron,sans-serif',
            'font-size:2.8rem', 'font-weight:900',
            'color:#fff', 'text-align:center', 'z-index:200',
            'pointer-events:none', 'letter-spacing:4px',
            'transition:opacity 0.6s ease',
        ].join(';');
        
        banner.innerHTML = `<span style="color:#ff003c;text-shadow:0 0 20px #ff003c">⚠ ${this.getBossTitle()} ⚠</span><br><span style="font-size:1rem;color:rgba(255,255,255,0.5)">${this.getDifficultyLabel()}</span>`;
        document.getElementById('gameContainer').appendChild(banner);
        setTimeout(() => { banner.style.opacity = '0'; }, 1500);
        setTimeout(() => { banner.remove(); }, 2200);
    }

    getDifficultyLabel() {
        if (this.wave === 1) return 'ENTROPIC TIER 1';
        if (this.wave === 2) return 'ENTROPIC TIER 2';
        if (this.wave === 3) return 'ENTROPIC TIER 3';
        if (this.wave === 4) return 'ENTROPIC TIER 4';
        return `GOD MODE (TIER ${this.wave - 4})`;
    }

    spawnBoss() {
        // Hp scales aggressively per wave for high difficulty
        const waveMult = 1.0 + (this.wave - 1) * 2.2;
        const totalSats = 2 + Math.min(4, this.wave - 1); // 2 to 6 satellites guarding Noxus

        this.bossRef = new Enemy(this.canvas.width / 2, -100, 'boss', waveMult);
        this.bossRef.attackCooldown = Math.max(700, 2200 - (this.wave - 1) * 250);
        this.bossRef._hazardDropCb = (hazard) => { this.hazards.push(hazard); };
        this.enemies.push(this.bossRef);

        for (let i = 0; i < totalSats; i++) {
            const sat = new Enemy(0, 0, 'boss_satellite', waveMult);
            sat.orbitAngle = (i / totalSats) * Math.PI * 2;
            sat.orbitRadius = 75 + i * 18;
            sat.bossRef = this.bossRef;
            this.enemies.push(sat);
        }
    }

    pauseGame() {
        this.state = 'paused';
        this.pauseStartTime = Date.now(); // record when we paused
        document.getElementById('pauseScreen').classList.add('screen-active');
    }

    resumeGame() {
        // Accumulate time spent paused so timer doesn't count pause time
        if (this.pauseStartTime > 0) {
            this.pausedDuration += Date.now() - this.pauseStartTime;
            this.pauseStartTime = 0;
        }
        this.state = 'playing';
        this.hideAllScreens();
        this.canvas.focus();
    }

    gameOver() {
        this.state = 'gameover';
        audio.playGameOver();
        
        // Update Game Over statistics
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalWaves').textContent = this.wave - 1;
        document.getElementById('finalScrap').textContent = this.scrap;

        document.getElementById('hud').style.display = 'none';
        document.getElementById('gameOverScreen').classList.add('screen-active');
    }

    openShop() {
        this.state = 'shop';
        this.updateShopUI();
        document.getElementById('shopOverlay').style.display = 'flex';
    }

    closeShop() {
        this.state = 'playing';
        document.getElementById('shopOverlay').style.display = 'none';
        this.canvas.focus();
        
        // Start next wave
        this.wave++;
        this.startWave();
    }

    switchWeaponDirect(weapon) {
        if (this.player.unlockedWeapons.includes(weapon)) {
            this.player.activeWeapon = weapon;
            audio.playUpgrade();
            this.updateHUD();
            
            // Text indicator splash
            this.floatingTexts.push(new FloatingText(
                this.player.x,
                this.player.y - 30,
                weapon.toUpperCase() + " ACTIVE",
                '#00f3ff'
            ));
        }
    }

    // Upgrades Purchase System
    buyUpgrade(stat) {
        const cost = this.getUpgradeCost(stat);
        if (this.scrap >= cost) {
            this.scrap -= cost;
            this.upgradeLevels[stat]++;
            
            // Apply stats directly to player
            if (stat === 'hp') {
                this.player.maxHp += 20;
                this.player.hp = this.player.maxHp; // Heal to full
            } else if (stat === 'shield') {
                this.player.maxShield += 20;
                this.player.shield = this.player.maxShield;
                this.player.shieldRegenRate += 0.08;
            } else if (stat === 'speed') {
                this.player.baseSpeed += 0.8;
                this.player.dashCooldown = Math.max(800, this.player.dashCooldown - 150);
            } else if (stat === 'fireRate') {
                for (let key in this.player.shootCooldowns) {
                    this.player.shootCooldowns[key] = Math.max(
                        this.player.shootCooldowns[key] * 0.2, // Hard limit of 80% cdr max
                        this.player.shootCooldowns[key] * 0.85 // 15% reduction per level
                    );
                }
            }
            
            audio.playUpgrade();
            this.updateShopUI();
            this.updateHUD();
        }
    }

    buyWeaponUpgrade() {
        if (this.scrap >= this.nextWeaponCost) {
            this.scrap -= this.nextWeaponCost;
            
            // Check next weapon lock index
            if (!this.player.unlockedWeapons.includes('shotgun')) {
                this.player.unlockedWeapons.push('shotgun');
                this.player.activeWeapon = 'shotgun';
                this.nextWeaponCost = 140;
            } else if (!this.player.unlockedWeapons.includes('railgun')) {
                this.player.unlockedWeapons.push('railgun');
                this.player.activeWeapon = 'railgun';
                this.nextWeaponCost = 220;
            } else if (!this.player.unlockedWeapons.includes('missile')) {
                this.player.unlockedWeapons.push('missile');
                this.player.activeWeapon = 'missile';
                this.nextWeaponCost = 0; // maxed out
            } else {
                // If all weapons unlocked, give damage bonus instead
                for (let key in this.player.weaponDamage) {
                    this.player.weaponDamage[key] = Math.round(this.player.weaponDamage[key] * 1.2);
                }
                this.nextWeaponCost = Math.round(this.nextWeaponCost * 1.5);
            }

            audio.playUpgrade();
            this.updateShopUI();
            this.updateHUD();
        }
    }

    getUpgradeCost(stat) {
        const lvl = this.upgradeLevels[stat];
        if (stat === 'hp') return 40 + lvl * 20;
        if (stat === 'shield') return 50 + lvl * 25;
        if (stat === 'speed') return 30 + lvl * 15;
        if (stat === 'fireRate') return 60 + lvl * 30;
        return 999;
    }

    updateShopUI() {
        document.getElementById('shopScrapCount').textContent = this.scrap;
        
        // Buy Hull HP
        const hpCostVal = this.getUpgradeCost('hp');
        document.getElementById('hpCost').textContent = `${hpCostVal} Scrap`;
        document.getElementById('buyHpBtn').disabled = this.scrap < hpCostVal;

        // Buy Shield
        const shieldCostVal = this.getUpgradeCost('shield');
        document.getElementById('shieldCost').textContent = `${shieldCostVal} Scrap`;
        document.getElementById('buyShieldBtn').disabled = this.scrap < shieldCostVal;

        // Buy Speed
        const speedCostVal = this.getUpgradeCost('speed');
        document.getElementById('speedCost').textContent = `${speedCostVal} Scrap`;
        document.getElementById('buySpeedBtn').disabled = this.scrap < speedCostVal;

        // Buy Fire Rate
        const fireRateCostVal = this.getUpgradeCost('fireRate');
        document.getElementById('fireRateCost').textContent = `${fireRateCostVal} Scrap`;
        document.getElementById('buyFireRateBtn').disabled = this.scrap < fireRateCostVal;

        // Weapon Upgrade Button layout adjustments
        const weaponBtn = document.getElementById('buyWeaponBtn');
        const weaponTitle = document.getElementById('weaponNameUpgrade');
        const weaponDesc = document.getElementById('weaponDescUpgrade');
        const weaponCost = document.getElementById('weaponCost');

        if (!this.player.unlockedWeapons.includes('shotgun')) {
            weaponTitle.textContent = "Unlock: Plasma Shotgun";
            weaponDesc.textContent = "Fires a 5-pellet shotgun blast in a broad angle.";
            weaponCost.textContent = `${this.nextWeaponCost} Scrap`;
            weaponBtn.textContent = "UNLOCK";
            weaponBtn.disabled = this.scrap < this.nextWeaponCost;
        } else if (!this.player.unlockedWeapons.includes('railgun')) {
            weaponTitle.textContent = "Unlock: Penetrating Railgun";
            weaponDesc.textContent = "Fires a concentrated thermal beam that pierces through all enemies.";
            weaponCost.textContent = `${this.nextWeaponCost} Scrap`;
            weaponBtn.textContent = "UNLOCK";
            weaponBtn.disabled = this.scrap < this.nextWeaponCost;
        } else if (!this.player.unlockedWeapons.includes('missile')) {
            weaponTitle.textContent = "Unlock: Homing Rocket Launcher";
            weaponDesc.textContent = "Fires seeker rockets that lock on and pursue enemies.";
            weaponCost.textContent = `${this.nextWeaponCost} Scrap`;
            weaponBtn.textContent = "UNLOCK";
            weaponBtn.disabled = this.scrap < this.nextWeaponCost;
        } else {
            // Weapon Upgrade loops
            weaponTitle.textContent = "System Damage Upgrade (+20%)";
            weaponDesc.textContent = "Boosts damage output for all available weapons.";
            weaponCost.textContent = `${this.nextWeaponCost} Scrap`;
            weaponBtn.textContent = "UPGRADE";
            weaponBtn.disabled = this.scrap < this.nextWeaponCost;
        }
    }

    updateHUD() {
        document.getElementById('hudScore').textContent = String(this.score).padStart(6, '0');
        document.getElementById('hudWave').textContent = this.wave;
        document.getElementById('hudScrap').textContent = this.scrap;

        // Difficulty label on wave HUD
        const waveLabel = document.getElementById('hudWaveLabel');
        if (waveLabel) waveLabel.textContent = this.getDifficultyLabel() + ' — WAVE:';

        // Bars
        const hpPct = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
        document.getElementById('hpBar').style.width = `${hpPct}%`;

        const shieldPct = Math.max(0, (this.player.shield / this.player.maxShield) * 100);
        document.getElementById('shieldBar').style.width = `${shieldPct}%`;

        // Weapon
        document.getElementById('hudWeaponName').textContent = this.player.activeWeapon.toUpperCase();
    }

    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => s.classList.remove('screen-active'));
    }

    triggerScreenShake(intensity) {
        this.shakeIntensity = Math.min(25, this.shakeIntensity + intensity);
    }

    // ==========================================================================
    // 8. BULLETS FIRING ACTIONS
// ==========================================================================
    firePlayerWeapon() {
        const timeNow = Date.now();
        const weapon = this.player.activeWeapon;
        const cooldown = this.player.shootCooldowns[weapon];

        if (timeNow - this.player.lastShootTime < cooldown) return;
        this.player.lastShootTime = timeNow;

        const dmg = this.player.weaponDamage[weapon];
        
        // Valorant-style spread calculation: movement inaccuracy + continuous firing spray error
        const spread = this.player.recoil + this.player.movementError;

        if (weapon === 'blaster') {
            // Firing Sheriff/Vandal single shot builds recoil error
            const bulletAngle = this.player.angle + (Math.random() - 0.5) * spread;
            const startX = this.player.x + Math.cos(bulletAngle) * 15;
            const startY = this.player.y + Math.sin(bulletAngle) * 15;
            this.bullets.push(new Bullet(
                startX,
                startY,
                bulletAngle,
                11.5, // Speed
                dmg,
                true,
                'blaster'
            ));
            
            // Build recoil for subsequent shots
            this.player.recoil = Math.min(this.player.maxRecoil, this.player.recoil + 0.055);
            audio.playShoot('blaster');
        } else if (weapon === 'shotgun') {
            // Apply spread to the central direction of shotgun blast
            const centerAngle = this.player.angle + (Math.random() - 0.5) * spread;
            const startX = this.player.x + Math.cos(centerAngle) * 12;
            const startY = this.player.y + Math.sin(centerAngle) * 12;
            
            for (let i = -2; i <= 2; i++) {
                // Combine Central spread with shotgun spread arc
                const angle = centerAngle + (i * 0.08) + (Math.random() - 0.5) * 0.04;
                this.bullets.push(new Bullet(
                    startX,
                    startY,
                    angle,
                    9.5 + (Math.random() - 0.5) * 1,
                    dmg,
                    true,
                    'shotgun'
                ));
            }
            
            // Shotgun fires build substantial spray recoil
            this.player.recoil = Math.min(this.player.maxRecoil, this.player.recoil + 0.11);
            audio.playShoot('shotgun');
            this.triggerScreenShake(2.5);
        } else if (weapon === 'railgun') {
            // Operator Sniper: Stand still for high accuracy, moving makes it highly inaccurate
            const angle = this.player.angle + (Math.random() - 0.5) * spread;
            const startX = this.player.x + Math.cos(angle) * 15;
            const startY = this.player.y + Math.sin(angle) * 15;
            
            const length = 1400;
            const endX = startX + Math.cos(angle) * length;
            const endY = startY + Math.sin(angle) * length;
            
            this.enemies.forEach((enemy) => {
                if (enemy.dead) return;
                
                const distToLine = this.distancePointToSegment(enemy.x, enemy.y, startX, startY, endX, endY);
                if (distToLine < enemy.radius + 10) {
                    const isDead = enemy.damage(dmg, this.particles, this.bossSatellites());
                    if (isDead) {
                        this.handleEnemyKilled(enemy);
                    }
                    this.floatingTexts.push(new FloatingText(
                        enemy.x,
                        enemy.y - 10,
                        String(dmg),
                        '#00f3ff',
                        true
                    ));
                }
            });

            for (let step = 0; step < length; step += 30) {
                const px = startX + Math.cos(angle) * step;
                const py = startY + Math.sin(angle) * step;
                if (px >= 0 && px <= this.canvas.width && py >= 0 && py <= this.canvas.height) {
                    this.particles.push(new Particle(
                        px + (Math.random() - 0.5) * 8,
                        py + (Math.random() - 0.5) * 8,
                        '#00f3ff',
                        (Math.random() - 0.5) * 1,
                        (Math.random() - 0.5) * 1,
                        Math.random() * 4 + 1,
                        0.04,
                        'laser-dust'
                    ));
                }
            }

            // Heavy kickback recoil
            this.player.recoil = Math.min(this.player.maxRecoil, this.player.recoil + 0.18);
            audio.playShoot('railgun');
            this.triggerScreenShake(7);
        } else if (weapon === 'missile') {
            const angle = this.player.angle + (Math.random() - 0.5) * spread;
            const wingLeftAngle = angle - Math.PI / 2;
            const wingRightAngle = angle + Math.PI / 2;
            
            const startX1 = this.player.x + Math.cos(wingLeftAngle) * 12 + Math.cos(angle) * 2;
            const startY1 = this.player.y + Math.sin(wingLeftAngle) * 12 + Math.sin(angle) * 2;
            
            const startX2 = this.player.x + Math.cos(wingRightAngle) * 12 + Math.cos(angle) * 2;
            const startY2 = this.player.y + Math.sin(wingRightAngle) * 12 + Math.sin(angle) * 2;

            let target = null;
            if (this.enemies.length > 0) {
                target = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            }

            this.bullets.push(new Bullet(startX1, startY1, angle - 0.2, 5.0, dmg, true, 'missile', target));
            this.bullets.push(new Bullet(startX2, startY2, angle + 0.2, 5.0, dmg, true, 'missile', target));

            this.player.recoil = Math.min(this.player.maxRecoil, this.player.recoil + 0.08);
            audio.playShoot('missile');
        }
    }

    // Helper math to calculate distance between segment and center of enemy
    distancePointToSegment(px, py, x1, y1, x2, y2) {
        const l2 = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (l2 === 0) return Math.hypot(px - x1, py - y1);
        let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    bossSatellites() {
        return this.enemies.filter(e => e.type === 'boss_satellite' && !e.dead);
    }

    // ==========================================================================
    // 9. COLLISION DETECTORS & UPDATE LOOPS
    // ==========================================================================
    update() {
        if (this.state !== 'playing') return;

        // 1. Particle & Floating Text Updates
        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => p.alpha > 0);
        // Hard particle cap: drop oldest if too many (each particle costs a draw call)
        if (this.particles.length > 400) {
            this.particles = this.particles.slice(this.particles.length - 400);
        }

        this.floatingTexts.forEach(ft => ft.update());
        this.floatingTexts = this.floatingTexts.filter(ft => ft.alpha > 0);
        // Hard cap on floating texts to prevent DOM/Canvas rendering lag during massive bullet hits
        if (this.floatingTexts.length > 40) {
            this.floatingTexts = this.floatingTexts.slice(this.floatingTexts.length - 40);
        }

        // 2. Scrolling Grid
        this.scrollOffset = (this.scrollOffset + 1.2) % this.gridSize;

        // 3. Update Player
        if (this.player.hp > 0) {
            this.player.update(this.keys, this.mouse, this.canvas.width, this.canvas.height, this.particles);
            
            // Firing check
            if (this.mouse.down) {
                this.firePlayerWeapon();
            }
        } else {
            // Player death
            this.gameOver();
            return;
        }

        // 4. Enemy Spawner logic
        if (this.waveActive && !this.bossAlertActive) {
            const timeNow = Date.now();

            // Spawn enemies for ALL non-boss waves (no wave cap!)
            if (this.wave % 5 !== 0 && this.enemiesRemainingToSpawn > 0 && timeNow - this.lastSpawnTime > this.spawnRate) {
                this.lastSpawnTime = timeNow;
                this.spawnEnemy();
            }

            // Wave complete: open shop after brief delay
            if (this.enemies.length === 0 && this.enemiesRemainingToSpawn === 0 && !this.bossRef) {
                this.waveActive = false;
                setTimeout(() => {
                    if (this.state === 'playing') this.openShop();
                }, 800);
            }
        }

        // 5. Update Enemies
        this.enemies.forEach((enemy) => {
            enemy.update(this.player, this.bullets, this.particles, this.canvas.width, this.canvas.height);
        });
        
        // Remove dead/off-screen enemies
        this.enemies = this.enemies.filter(e => !e.dead);

        // 5b. Update hazards (toxic puddles, mines, fire nodes)
        this.hazards.forEach(h => h.update(this.player, this.particles));
        this.hazards = this.hazards.filter(h => !h.dead);

        // 6. Update Bullets
        this.bullets.forEach((bullet) => {
            bullet.update(this.enemies);
        });

        // Filter out of bounds bullets
        this.bullets = this.bullets.filter(b => {
            const buffer = 40;
            return b.x > -buffer && b.x < this.canvas.width + buffer && b.y > -buffer && b.y < this.canvas.height + buffer;
        });

        // Hard bullet cap: if we somehow exceed 300 bullets, trim oldest enemy bullets
        // to prevent a single attack chain from tanking the frame rate
        const BULLET_CAP = 300;
        if (this.bullets.length > BULLET_CAP) {
            // Keep all player bullets, cull oldest enemy bullets
            const playerBullets = this.bullets.filter(b => b.isPlayer);
            const enemyBullets  = this.bullets.filter(b => !b.isPlayer);
            const allowed = BULLET_CAP - playerBullets.length;
            this.bullets = [...playerBullets, ...enemyBullets.slice(-Math.max(0, allowed))];
        }

        // 7. Update Scraps (magnetizing towards player)
        this.scraps.forEach((scrap) => {
            scrap.update(this.player.x, this.player.y);
            
            // Check collision collection
            const dist = Math.hypot(this.player.x - scrap.x, this.player.y - scrap.y);
            if (dist < this.player.radius + scrap.size) {
                scrap.collected = true;
                scrap.dead = true;
                this.scrap += scrap.val;
                this.score += scrap.val * 50;
                
                // Add tiny green point particle splashes
                for (let i = 0; i < 4; i++) {
                    this.particles.push(new Particle(
                        scrap.x,
                        scrap.y,
                        '#fffb00',
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 3,
                        Math.random() * 3 + 1,
                        0.08
                    ));
                }
                
                // Text popup on collection
                this.floatingTexts.push(new FloatingText(
                    scrap.x,
                    scrap.y - 12,
                    `+${scrap.val} SCRAP`,
                    '#fffb00'
                ));

                audio.playUpgrade();
                this.updateHUD();
            }
        });
        // Remove collected OR expired scraps
        this.scraps = this.scraps.filter(s => !s.dead);
        // Hard scrap cap: if somehow too many pile up, trim oldest
        if (this.scraps.length > 80) this.scraps = this.scraps.slice(-80);

        // 8. Bullet Collisions (Bullet hits player or enemy)
        const satellites = this.bossSatellites();
        this.bullets.forEach((bullet) => {
            if (bullet.isPlayer) {
                // Hits enemy
                for (let i = 0; i < this.enemies.length; i++) {
                    const enemy = this.enemies[i];
                    if (enemy.dead) continue;
                    
                    const dist = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
                    if (dist < enemy.radius + bullet.size) {
                        bullet.dead = true;
                        
                        const hitsBoss = enemy.type === 'boss';
                        const isKilled = enemy.damage(bullet.damage, this.particles, satellites);
                        
                        // Floating score damage
                        const floatCol = (hitsBoss && satellites.length > 0) ? '#00f3ff' : '#ff00aa';
                        const textVal = (hitsBoss && satellites.length > 0) ? "SHIELDED" : String(bullet.damage);
                        
                        this.floatingTexts.push(new FloatingText(
                            bullet.x,
                            bullet.y - 10,
                            textVal,
                            floatCol
                        ));

                        if (isKilled) {
                            this.handleEnemyKilled(enemy);
                        }
                        break; // Bullet is dead, stop checking other enemies for this bullet
                    }
                }
            } else {
                // Enemy hits player
                const dist = Math.hypot(this.player.x - bullet.x, this.player.y - bullet.y);
                if (dist < this.player.radius + bullet.size) {
                    bullet.dead = true;
                    
                    const dmgTaken = this.player.damage(bullet.damage);
                    if (dmgTaken > 0) {
                        this.triggerScreenShake(6);
                        
                        // Flash red/white floating damage text on Player
                        this.floatingTexts.push(new FloatingText(
                            this.player.x,
                            this.player.y - 20,
                            `-${dmgTaken}`,
                            '#ff0055',
                            true
                        ));
                    }
                    this.updateHUD();
                }
            }
        });

        // Filter dead bullets
        this.bullets = this.bullets.filter(b => !b.dead);

        // Handle Screen shake dampening decay
        if (this.shakeIntensity > 0.05) {
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeIntensity = 0;
        }
    }

    spawnEnemy() {
        const type = this.enemiesToSpawn.pop();
        if (!type) return;

        const x = Math.random() * (this.canvas.width - 60) + 30;
        const y = -30;
        
        const waveMult = 1.0 + (this.wave - 1) * 0.20;
        const enemy = new Enemy(x, y, type, waveMult);

        // Give the enemy a callback to drop hazards into the game's hazard pool
        enemy._hazardDropCb = (hazard) => { this.hazards.push(hazard); };

        this.enemies.push(enemy);
        this.enemiesRemainingToSpawn--;
    }

    handleEnemyKilled(enemy) {
        // Score multiplier grows with wave
        const scoreMult = 1 + Math.floor(this.wave / 5) * 0.5;
        this.score += Math.round(enemy.points * scoreMult);
        this.updateHUD();

        // Scrap drops — scale val per wave cycle so later waves reward more
        const scrapBonus = Math.floor(this.wave / 5);
        const scrapCount = enemy.scrapVal + scrapBonus;
        for (let i = 0; i < scrapCount; i++) {
            this.scraps.push(new Scrap(enemy.x, enemy.y, 1));
        }

        // Death hazard drops
        if (enemy.type === 'scout' && Math.random() < 0.4) {
            // 40% chance to leave a toxic puddle on death
            this.hazards.push(new EnemyHazard(enemy.x, enemy.y, 'toxic'));
        }
        if (enemy.type === 'striker') {
            // Always drop a mine on death
            this.hazards.push(new EnemyHazard(enemy.x, enemy.y, 'mine'));
        }

        // Screen shake based on enemy type
        this.triggerScreenShake(enemy.type === 'striker' ? 4 : enemy.type === 'kamikaze' ? 2 : 1.5);

        // Boss killed: open shop after cinematic delay
        if (enemy.type === 'boss') {
            this.bossRef = null;
            this.waveActive = false;
            this.triggerScreenShake(25);

            this.floatingTexts.push(new FloatingText(
                enemy.x,
                enemy.y,
                `BOSS WAVE ${this.wave} CLEARED!`,
                '#39ff14',
                true
            ));

            setTimeout(() => {
                if (this.state === 'playing') this.openShop();
            }, 2500);
        }
    }


    // ==========================================================================
    // 10. CANVAS RENDERING LOOPS
    // ==========================================================================
    draw() {
        this.ctx.save();
        
        // Apply Screen Shake translates
        if (this.shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        // Clear view area
        this.ctx.fillStyle = '#03030c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Synthwave Grid background lines
        this.drawBackgroundGrid();

        // Draw Collectibles
        this.scraps.forEach(s => s.draw(this.ctx));
        this.ctx.shadowBlur = 0; // reset after scrap glow batch

        // Draw Player
        if (this.player && this.player.hp > 0) {
            this.player.draw(this.ctx);
            this.ctx.shadowBlur = 0;
        }

        // Draw Bullets — no shadow (removed to eliminate per-bullet blur cost)
        this.ctx.shadowBlur = 0;
        this.bullets.forEach(b => b.draw(this.ctx));

        // Draw hazards (toxic puddles, mines, fire nodes)
        this.hazards.forEach(h => h.draw(this.ctx));
        this.ctx.shadowBlur = 0;

        // Draw Enemies
        this.enemies.forEach(e => e.draw(this.ctx));
        this.ctx.shadowBlur = 0;

        // Draw Particles — batched with single save/restore to avoid per-particle overhead
        this.ctx.save();
        this.ctx.shadowBlur = 0; // no shadow on particles — too many, just solid squares
        this.particles.forEach(p => p.draw(this.ctx));
        this.ctx.restore();

        // Draw Floating Text HUD Numbers
        this.floatingTexts.forEach(ft => ft.draw(this.ctx));
        this.ctx.shadowBlur = 0;

        // Draw Valorant-style dynamic crosshair at mouse pointer location
        if (this.state === 'playing' && this.player && this.player.hp > 0) {
            this.drawCrosshair();
        }

        this.ctx.restore();
    }

    drawCrosshair() {
        const x = this.mouse.x;
        const y = this.mouse.y;
        
        // Hide if coordinates are not within canvas
        if (x === undefined || y === undefined || x < 0 || x > this.canvas.width || y < 0 || y > this.canvas.height) return;

        this.ctx.save();
        
        // Firing spread calculation: recoil + movement error, scaled to pixels
        const spreadRad = this.player.recoil + this.player.movementError;
        const spreadPx = spreadRad * 120; // visual scale factor
        const offset = Math.max(3, 4 + spreadPx); // minimum offset 4px, increases with spread
        const length = 5; // length of each crosshair line segment
        
        this.ctx.strokeStyle = '#39ff14'; // Valorant Neon Green
        this.ctx.lineWidth = 1.5;
        this.ctx.shadowColor = '#39ff14';
        this.ctx.shadowBlur = 2; // reduced from 4

        // Center Dot
        this.ctx.fillStyle = '#39ff14';
        this.ctx.fillRect(x - 1, y - 1, 2, 2);

        // Top Line
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - offset);
        this.ctx.lineTo(x, y - offset - length);
        this.ctx.stroke();

        // Bottom Line
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + offset);
        this.ctx.lineTo(x, y + offset + length);
        this.ctx.stroke();

        // Left Line
        this.ctx.beginPath();
        this.ctx.moveTo(x - offset, y);
        this.ctx.lineTo(x - offset - length, y);
        this.ctx.stroke();

        // Right Line
        this.ctx.beginPath();
        this.ctx.moveTo(x + offset, y);
        this.ctx.lineTo(x + offset + length, y);
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawBackgroundGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
        this.ctx.lineWidth = 1.0;

        // Draw moving vertical grid lines
        for (let x = 0; x < this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Draw moving horizontal grid lines scroll offset
        for (let y = this.scrollOffset; y < this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    loop() {
        this.update();
        this.draw();

        // Cache DOM element references once
        if (!this._timerEl)    this._timerEl    = document.getElementById('hudTimer');
        if (!this._perfBulEl)  this._perfBulEl  = document.getElementById('perfBullets');
        if (!this._perfPartEl) this._perfPartEl = document.getElementById('perfParticles');
        if (!this._perfHazEl)  this._perfHazEl  = document.getElementById('perfHazards');

        // Perf counters: update every 30 frames (~2x/sec)
        this._loopFrame = (this._loopFrame || 0) + 1;
        if (this._loopFrame % 30 === 0 && this.state === 'playing') {
            if (this._perfBulEl)  this._perfBulEl.textContent  = this.bullets.length;
            if (this._perfPartEl) this._perfPartEl.textContent = this.particles.length;
            if (this._perfHazEl)  this._perfHazEl.textContent  = this.hazards.length;
        }

        // Timer: only write DOM when the second value actually changes (max 1 write/sec)
        if (this.state === 'playing' && this.waveStartTime > 0) {
            const elapsed  = Date.now() - this.waveStartTime - this.pausedDuration;
            const totalSec = Math.floor(elapsed / 1000);
            if (totalSec !== this._lastTimerSec) {
                this._lastTimerSec = totalSec;
                const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
                const ss = String(totalSec % 60).padStart(2, '0');
                if (this._timerEl) this._timerEl.textContent = `${mm}:${ss}`;
            }
        }

        requestAnimationFrame(() => this.loop());
    }
}

// Instantiate game system on load
window.addEventListener('DOMContentLoaded', () => {
    const game = new NeonShooterGame();
    game.loop();
});
