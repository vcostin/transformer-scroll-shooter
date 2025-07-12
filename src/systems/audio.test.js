/**
 * Unit tests for AudioManager class
 * Tests audio system functionality including Web Audio API integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AudioManager from './audio.js';

// Mock Web Audio API
class MockAudioContext {
    constructor() {
        this.currentTime = 0;
        this.destination = { connect: vi.fn() };
        this.state = 'running';
        this.resume = vi.fn().mockResolvedValue(undefined);
    }
    
    createOscillator() {
        return {
            type: 'sine',
            frequency: { 
                setValueAtTime: vi.fn(), 
                exponentialRampToValueAtTime: vi.fn() 
            },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        };
    }
    
    createGain() {
        return {
            gain: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
                exponentialRampToValueAtTime: vi.fn()
            },
            connect: vi.fn()
        };
    }
}

describe('AudioManager', () => {
    let audioManager;
    let mockAudioContext;
    let originalAudioContext;
    
    beforeEach(() => {
        // Mock Web Audio API
        originalAudioContext = window.AudioContext;
        mockAudioContext = new MockAudioContext();
        window.AudioContext = vi.fn(() => mockAudioContext);
        window.webkitAudioContext = vi.fn(() => mockAudioContext);
        
        // Create fresh AudioManager instance
        audioManager = new AudioManager();
    });
    
    afterEach(() => {
        // Restore original AudioContext
        window.AudioContext = originalAudioContext;
        vi.clearAllMocks();
    });
    
    describe('Constructor', () => {
        it('should initialize with default values', () => {
            expect(audioManager.sounds).toEqual({});
            expect(audioManager.musicVolume).toBe(0.5);
            expect(audioManager.sfxVolume).toBe(0.7);
            expect(audioManager.masterVolume).toBe(1.0);
            expect(audioManager.enabled).toBe(true);
        });
        
        it('should create AudioContext successfully', () => {
            expect(audioManager.audioContext).toBeDefined();
            expect(audioManager.audioContext).toBeInstanceOf(MockAudioContext);
        });
        
        it('should load sound definitions', () => {
            expect(audioManager.soundDefinitions).toBeDefined();
            expect(audioManager.soundDefinitions.shoot).toEqual({
                frequency: 800,
                duration: 0.1,
                type: 'square'
            });
            expect(audioManager.soundDefinitions.explosion).toEqual({
                frequency: 200,
                duration: 0.3,
                type: 'noise'
            });
        });
        
        it('should handle AudioContext creation failure gracefully', () => {
            window.AudioContext = vi.fn(() => {
                throw new Error('AudioContext not supported');
            });
            window.webkitAudioContext = vi.fn(() => {
                throw new Error('webkitAudioContext not supported');
            });
            
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            
            const manager = new AudioManager();
            expect(manager.audioContext).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Web Audio API not supported');
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('Sound Definitions', () => {
        it('should have all expected sound effects defined', () => {
            const expectedSounds = [
                'shoot', 'enemyShoot', 'explosion', 'powerup', 'transform',
                'enemyHit', 'playerHit', 'engineLow', 'engineHigh', 'backgroundAmbient'
            ];
            
            expectedSounds.forEach(sound => {
                expect(audioManager.soundDefinitions[sound]).toBeDefined();
                expect(audioManager.soundDefinitions[sound].frequency).toBeTypeOf('number');
                expect(audioManager.soundDefinitions[sound].duration).toBeTypeOf('number');
                expect(audioManager.soundDefinitions[sound].type).toBeTypeOf('string');
            });
        });
        
        it('should have correct properties for special sounds', () => {
            expect(audioManager.soundDefinitions.powerup.ascending).toBe(true);
            expect(audioManager.soundDefinitions.transform.sweep).toBe(true);
            expect(audioManager.soundDefinitions.engineLow.loop).toBe(true);
            expect(audioManager.soundDefinitions.backgroundAmbient.volume).toBe(0.1);
        });
    });
    
    describe('playSound method', () => {
        it('should not play sound when disabled', () => {
            audioManager.setEnabled(false);
            const generateSoundSpy = vi.spyOn(audioManager, 'generateSound');
            
            audioManager.playSound('shoot');
            expect(generateSoundSpy).not.toHaveBeenCalled();
        });
        
        it('should not play sound when audioContext is null', () => {
            audioManager.audioContext = null;
            const generateSoundSpy = vi.spyOn(audioManager, 'generateSound');
            
            audioManager.playSound('shoot');
            expect(generateSoundSpy).not.toHaveBeenCalled();
        });
        
        it('should not play sound for undefined sound name', () => {
            const generateSoundSpy = vi.spyOn(audioManager, 'generateSound');
            
            audioManager.playSound('nonexistent');
            expect(generateSoundSpy).not.toHaveBeenCalled();
        });
        
        it('should not play sound when final volume is zero', () => {
            audioManager.setMasterVolume(0);
            const generateSoundSpy = vi.spyOn(audioManager, 'generateSound');
            
            audioManager.playSound('shoot');
            expect(generateSoundSpy).not.toHaveBeenCalled();
        });
        
        it('should play sound with correct volume calculation', () => {
            const generateSoundSpy = vi.spyOn(audioManager, 'generateSound');
            
            audioManager.playSound('shoot', 0.5);
            
            const expectedVolume = 0.5 * 0.7 * 1.0; // custom * sfx * master
            expect(generateSoundSpy).toHaveBeenCalledWith(
                audioManager.soundDefinitions.shoot,
                expectedVolume
            );
        });
        
        it('should use default volume when not specified', () => {
            const generateSoundSpy = vi.spyOn(audioManager, 'generateSound');
            
            audioManager.playSound('shoot');
            
            const expectedVolume = 1.0 * 0.7 * 1.0; // default * sfx * master
            expect(generateSoundSpy).toHaveBeenCalledWith(
                audioManager.soundDefinitions.shoot,
                expectedVolume
            );
        });
        
        it('should handle sound generation errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            vi.spyOn(audioManager, 'generateSound').mockImplementation(() => {
                throw new Error('Sound generation failed');
            });
            
            expect(() => audioManager.playSound('shoot')).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith('Could not play sound:', 'shoot');
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('generateSound method', () => {
        let mockOscillator;
        let mockGainNode;
        
        beforeEach(() => {
            mockOscillator = mockAudioContext.createOscillator();
            mockGainNode = mockAudioContext.createGain();
            vi.spyOn(mockAudioContext, 'createOscillator').mockReturnValue(mockOscillator);
            vi.spyOn(mockAudioContext, 'createGain').mockReturnValue(mockGainNode);
        });
        
        it('should create and connect audio nodes', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'sine' };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockAudioContext.createOscillator).toHaveBeenCalled();
            expect(mockAudioContext.createGain).toHaveBeenCalled();
            expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
            expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
        });
        
        it('should set oscillator type correctly', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'square' };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockOscillator.type).toBe('square');
        });
        
        it('should handle noise type by using sawtooth', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'noise' };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockOscillator.type).toBe('sawtooth');
        });
        
        it('should set frequency for normal sounds', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'sine' };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
        });
        
        it('should handle ascending frequency sounds', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'sine', ascending: true };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(220, 0);
            expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(880, 0.1);
        });
        
        it('should handle sweep frequency sounds', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'sine', sweep: true };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(880, 0);
            expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(220, 0.1);
        });
        
        it('should set volume envelope for normal sounds', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'sine' };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.5, 0.01);
            expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.1);
        });
        
        it('should set volume envelope for noise sounds', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'noise' };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockGainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 0.1);
        });
        
        it('should start and stop oscillator', () => {
            const soundDef = { frequency: 440, duration: 0.1, type: 'sine' };
            
            audioManager.generateSound(soundDef, 0.5);
            
            expect(mockOscillator.start).toHaveBeenCalledWith(0);
            expect(mockOscillator.stop).toHaveBeenCalledWith(0.1);
        });
    });
    
    describe('Volume Control', () => {
        it('should set master volume within bounds', () => {
            audioManager.setMasterVolume(0.8);
            expect(audioManager.masterVolume).toBe(0.8);
            
            audioManager.setMasterVolume(-0.1);
            expect(audioManager.masterVolume).toBe(0);
            
            audioManager.setMasterVolume(1.5);
            expect(audioManager.masterVolume).toBe(1);
        });
        
        it('should set SFX volume within bounds', () => {
            audioManager.setSfxVolume(0.3);
            expect(audioManager.sfxVolume).toBe(0.3);
            
            audioManager.setSfxVolume(-0.1);
            expect(audioManager.sfxVolume).toBe(0);
            
            audioManager.setSfxVolume(1.2);
            expect(audioManager.sfxVolume).toBe(1);
        });
        
        it('should set music volume within bounds', () => {
            audioManager.setMusicVolume(0.9);
            expect(audioManager.musicVolume).toBe(0.9);
            
            audioManager.setMusicVolume(-0.5);
            expect(audioManager.musicVolume).toBe(0);
            
            audioManager.setMusicVolume(2.0);
            expect(audioManager.musicVolume).toBe(1);
        });
    });
    
    describe('Enable/Disable', () => {
        it('should enable and disable audio', () => {
            audioManager.setEnabled(false);
            expect(audioManager.enabled).toBe(false);
            
            audioManager.setEnabled(true);
            expect(audioManager.enabled).toBe(true);
        });
    });
    
    describe('Resume Audio Context', () => {
        it('should resume suspended audio context', () => {
            mockAudioContext.state = 'suspended';
            
            audioManager.resume();
            
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });
        
        it('should not resume running audio context', () => {
            mockAudioContext.state = 'running';
            
            audioManager.resume();
            
            expect(mockAudioContext.resume).not.toHaveBeenCalled();
        });
        
        it('should handle missing audio context gracefully', () => {
            audioManager.audioContext = null;
            
            expect(() => audioManager.resume()).not.toThrow();
        });
    });
});
