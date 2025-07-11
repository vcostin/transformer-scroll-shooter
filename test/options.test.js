/**
 * Options Menu Tests
 * 
 * Tests for the options menu system including:
 * - Open/close behavior
 * - Input handling
 * - Settings persistence
 * - UI interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptionsMenu } from '../src/ui/options.js';

describe('OptionsMenu', () => {
    let optionsMenu;
    let mockGame;
    let mockAudio;
    
    beforeEach(() => {
        // Mock localStorage
        global.localStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };
        
        // Mock audio system
        mockAudio = {
            masterVolume: 0.8,
            sfxVolume: 0.7,
            musicVolume: 0.6,
            enabled: true,
            setMasterVolume: vi.fn(),
            setSfxVolume: vi.fn(),
            setMusicVolume: vi.fn(),
            setEnabled: vi.fn()
        };
        
        // Mock game object
        mockGame = {
            audio: mockAudio,
            showFPS: false,
            particles: true,
            difficulty: 'Normal',
            paused: false,
            controls: {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                shoot: 'Space',
                transform: 'Shift'
            }
        };
        
        // Mock DOM elements
        document.body.innerHTML = '<div id="gameContainer"></div>';
        
        optionsMenu = new OptionsMenu(mockGame);
    });
    
    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });
    
    describe('Constructor', () => {
        it('should initialize with default values', () => {
            expect(optionsMenu.game).toBe(mockGame);
            expect(optionsMenu.isOpen).toBe(false);
            expect(optionsMenu.selectedOption).toBe(0);
            expect(optionsMenu.options).toHaveLength(6);
        });
        
        it('should define all required options', () => {
            const expectedOptions = [
                'Master Volume',
                'Sound Effects', 
                'Music Volume',
                'Audio Enabled',
                'Show FPS',
                'Difficulty'
            ];
            
            const actualOptions = optionsMenu.options.map(opt => opt.name);
            expectedOptions.forEach(expected => {
                expect(actualOptions).toContain(expected);
            });
        });
    });
    
    describe('Open/Close Behavior', () => {
        it('should open the menu', () => {
            optionsMenu.open();
            expect(optionsMenu.isOpen).toBe(true);
            expect(optionsMenu.overlay.style.display).toBe('block');
        });
        
        it('should close the menu', () => {
            optionsMenu.open();
            optionsMenu.close();
            expect(optionsMenu.isOpen).toBe(false);
            expect(optionsMenu.overlay.style.display).toBe('none');
        });
        
        it('should save settings when closing', () => {
            const saveSettingsSpy = vi.spyOn(optionsMenu, 'saveSettings');
            optionsMenu.open();
            optionsMenu.close();
            expect(saveSettingsSpy).toHaveBeenCalled();
        });
        
        it('should toggle menu state', () => {
            expect(optionsMenu.isOpen).toBe(false);
            optionsMenu.open();
            expect(optionsMenu.isOpen).toBe(true);
            optionsMenu.close();
            expect(optionsMenu.isOpen).toBe(false);
        });
    });
    
    describe('Input Handling', () => {
        beforeEach(() => {
            optionsMenu.open();
        });
        
        it('should handle escape key to close menu', () => {
            const result = optionsMenu.handleInput('Escape');
            expect(result).toBe(true);
            expect(optionsMenu.isOpen).toBe(false);
        });
        
        it('should handle up arrow key navigation', () => {
            optionsMenu.selectedOption = 2;
            const result = optionsMenu.handleInput('ArrowUp');
            expect(result).toBe(true);
            expect(optionsMenu.selectedOption).toBe(1);
        });
        
        it('should handle down arrow key navigation', () => {
            optionsMenu.selectedOption = 1;
            const result = optionsMenu.handleInput('ArrowDown');
            expect(result).toBe(true);
            expect(optionsMenu.selectedOption).toBe(2);
        });
        
        it('should handle boundaries in navigation', () => {
            // Test top boundary
            optionsMenu.selectedOption = 0;
            optionsMenu.handleInput('ArrowUp');
            expect(optionsMenu.selectedOption).toBe(0);
            
            // Test bottom boundary
            optionsMenu.selectedOption = optionsMenu.options.length - 1;
            optionsMenu.handleInput('ArrowDown');
            expect(optionsMenu.selectedOption).toBe(optionsMenu.options.length - 1);
        });
        
        it('should handle enter key for selected option', () => {
            const result = optionsMenu.handleInput('Enter');
            expect(result).toBe(true);
        });
        
        it('should not handle input when menu is closed', () => {
            optionsMenu.close();
            const result = optionsMenu.handleInput('Escape');
            expect(result).toBe(false);
        });
    });
    
    describe('Settings Persistence', () => {
        it('should save settings to localStorage', () => {
            optionsMenu.saveSettings();
            
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'gameSettings',
                expect.stringContaining('mastervolume')
            );
            
            // Check that the saved data contains expected keys
            const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
            expect(savedData).toHaveProperty('mastervolume');
            expect(savedData).toHaveProperty('soundeffects');
            expect(savedData).toHaveProperty('musicvolume');
            expect(savedData).toHaveProperty('audioenabled');
            expect(savedData).toHaveProperty('showfps');
            expect(savedData).toHaveProperty('difficulty');
        });
        
        it('should load settings from localStorage', () => {
            const mockSettings = {
                mastervolume: 0.5,
                soundeffects: 0.6,
                musicvolume: 0.7,
                audioenabled: false,
                showfps: true,
                difficulty: 'Hard'
            };
            
            localStorage.getItem.mockReturnValue(JSON.stringify(mockSettings));
            
            optionsMenu.loadSettings();
            
            expect(mockAudio.setMasterVolume).toHaveBeenCalledWith(0.5);
            expect(mockAudio.setSfxVolume).toHaveBeenCalledWith(0.6);
            expect(mockAudio.setMusicVolume).toHaveBeenCalledWith(0.7);
            expect(mockAudio.setEnabled).toHaveBeenCalledWith(false);
            expect(mockGame.showFPS).toBe(true);
            expect(mockGame.difficulty).toBe('Hard');
        });
        
        it('should handle missing localStorage data gracefully', () => {
            localStorage.getItem.mockReturnValue(null);
            
            expect(() => {
                optionsMenu.loadSettings();
            }).not.toThrow();
        });
        
        it('should handle corrupted localStorage data gracefully', () => {
            localStorage.getItem.mockReturnValue('invalid json');
            
            expect(() => {
                optionsMenu.loadSettings();
            }).not.toThrow();
        });
    });
    
    describe('UI Interactions', () => {
        it('should create overlay when instantiated', () => {
            expect(optionsMenu.overlay).toBeTruthy();
            expect(optionsMenu.overlay.id).toBe('optionsOverlay');
        });
        
        it('should show overlay when opened', () => {
            optionsMenu.open();
            expect(optionsMenu.overlay.style.display).toBe('block');
        });
        
        it('should hide overlay when closed', () => {
            optionsMenu.open();
            optionsMenu.close();
            expect(optionsMenu.overlay.style.display).toBe('none');
        });
        
        it('should pause game when menu is opened', () => {
            optionsMenu.open();
            expect(mockGame.paused).toBe(true);
        });
        
        it('should unpause game when menu is closed', () => {
            optionsMenu.open();
            optionsMenu.close();
            expect(mockGame.paused).toBe(false);
        });
    });
    
    describe('Option Value Management', () => {
        it('should get current values from options', () => {
            const masterVolumeOption = optionsMenu.options.find(opt => opt.name === 'Master Volume');
            expect(masterVolumeOption.value()).toBe(mockAudio.masterVolume);
            
            const audioEnabledOption = optionsMenu.options.find(opt => opt.name === 'Audio Enabled');
            expect(audioEnabledOption.value()).toBe(mockAudio.enabled);
        });
        
        it('should set values through options', () => {
            const masterVolumeOption = optionsMenu.options.find(opt => opt.name === 'Master Volume');
            masterVolumeOption.setValue(0.5);
            expect(mockAudio.setMasterVolume).toHaveBeenCalledWith(0.5);
            
            const audioEnabledOption = optionsMenu.options.find(opt => opt.name === 'Audio Enabled');
            audioEnabledOption.setValue(false);
            expect(mockAudio.setEnabled).toHaveBeenCalledWith(false);
        });
        
        it('should respect min/max values for sliders', () => {
            const masterVolumeOption = optionsMenu.options.find(opt => opt.name === 'Master Volume');
            
            expect(masterVolumeOption.min).toBe(0);
            expect(masterVolumeOption.max).toBe(1);
            expect(masterVolumeOption.step).toBe(0.1);
        });
    });
    
    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            optionsMenu.open();
        });
        
        it('should navigate through all options', () => {
            for (let i = 0; i < optionsMenu.options.length - 1; i++) {
                const currentOption = optionsMenu.selectedOption;
                optionsMenu.handleInput('ArrowDown');
                expect(optionsMenu.selectedOption).toBe(Math.min(optionsMenu.options.length - 1, currentOption + 1));
            }
        });
        
        it('should navigate backwards through options', () => {
            optionsMenu.selectedOption = optionsMenu.options.length - 1;
            
            for (let i = 0; i < optionsMenu.options.length - 1; i++) {
                const currentOption = optionsMenu.selectedOption;
                optionsMenu.handleInput('ArrowUp');
                expect(optionsMenu.selectedOption).toBe(Math.max(0, currentOption - 1));
            }
        });
        
        it('should respect option boundaries', () => {
            // Test upper boundary
            optionsMenu.selectedOption = 0;
            optionsMenu.handleInput('ArrowUp');
            expect(optionsMenu.selectedOption).toBe(0);
            
            // Test lower boundary
            optionsMenu.selectedOption = optionsMenu.options.length - 1;
            optionsMenu.handleInput('ArrowDown');
            expect(optionsMenu.selectedOption).toBe(optionsMenu.options.length - 1);
        });
        
        it('should handle enter key input', () => {
            const result = optionsMenu.handleInput('Enter');
            expect(result).toBe(true);
        });
    });
});
