// Audio Manager for sound effects and music
class AudioManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.masterVolume = 1.0;
        this.enabled = true;
        
        this.loadSounds();
    }
    
    loadSounds() {
        // Create audio contexts for procedural sounds
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
        
        // Define sound effects
        this.soundDefinitions = {
            shoot: { frequency: 800, duration: 0.1, type: 'square' },
            enemyShoot: { frequency: 400, duration: 0.15, type: 'sawtooth' },
            explosion: { frequency: 200, duration: 0.3, type: 'noise' },
            powerup: { frequency: 600, duration: 0.2, type: 'sine', ascending: true },
            transform: { frequency: 300, duration: 0.4, type: 'triangle', sweep: true },
            enemyHit: { frequency: 350, duration: 0.1, type: 'square' },
            playerHit: { frequency: 150, duration: 0.2, type: 'sawtooth' },
            engineLow: { frequency: 100, duration: 0.5, type: 'triangle', loop: true },
            engineHigh: { frequency: 200, duration: 0.5, type: 'triangle', loop: true },
            backgroundAmbient: { frequency: 80, duration: 2.0, type: 'sine', loop: true, volume: 0.1 }
        };
    }
    
    playSound(soundName, volume = 1.0) {
        if (!this.enabled || !this.audioContext) return;
        
        const soundDef = this.soundDefinitions[soundName];
        if (!soundDef) return;
        
        const finalVolume = volume * this.sfxVolume * this.masterVolume;
        if (finalVolume <= 0) return;
        
        try {
            this.generateSound(soundDef, finalVolume);
        } catch (e) {
            console.warn('Could not play sound:', soundName);
        }
    }
    
    generateSound(soundDef, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Set waveform
        oscillator.type = soundDef.type === 'noise' ? 'sawtooth' : soundDef.type;
        
        // Set frequency
        let frequency = soundDef.frequency;
        if (soundDef.ascending) {
            oscillator.frequency.setValueAtTime(frequency * 0.5, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 2, this.audioContext.currentTime + soundDef.duration);
        } else if (soundDef.sweep) {
            oscillator.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioContext.currentTime + soundDef.duration);
        } else {
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        }
        
        // Set volume envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
        
        if (soundDef.type === 'noise') {
            // Create noise effect for explosions
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + soundDef.duration);
        } else {
            gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + soundDef.duration);
        }
        
        // Start and stop
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + soundDef.duration);
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    // Resume audio context (required for Chrome autoplay policy)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}
