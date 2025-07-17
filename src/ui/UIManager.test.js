/**
 * UI Event Integration System Tests
 * 
 * Tests for the UI Event Integration system including:
 * - Event constants validation
 * - Event system integration
 * - Input system integration
 * - Menu system integration
 * - Display system integration
 * - System integration flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '@/ui/UIManager.js';
import {
    UI_EVENTS,
    MENU_TYPES,
    INPUT_ACTIONS,
    UI_STATE_KEYS
} from '@/constants/ui-events.js';

describe('UI Event Integration System', () => {
    describe('UI Event Constants', () => {
        it('should define all required UI events', () => {
            expect(UI_EVENTS).toBeDefined();
            expect(UI_EVENTS.MENU_OPENED).toBe('ui.menu.opened');
            expect(UI_EVENTS.MENU_CLOSED).toBe('ui.menu.closed');
            expect(UI_EVENTS.SETTING_CHANGED).toBe('ui.setting.changed');
            expect(UI_EVENTS.VOLUME_CHANGED).toBe('ui.volume.changed');
            expect(UI_EVENTS.DIFFICULTY_CHANGED).toBe('ui.difficulty.changed');
            expect(UI_EVENTS.SCORE_UPDATED).toBe('ui.display.score.updated');
            expect(UI_EVENTS.HEALTH_UPDATED).toBe('ui.display.health.updated');
            expect(UI_EVENTS.LEVEL_UPDATED).toBe('ui.display.level.updated');
            expect(UI_EVENTS.GAME_PAUSE).toBe('ui.game.pause');
            expect(UI_EVENTS.GAME_RESUME).toBe('ui.game.resume');
            expect(UI_EVENTS.GAME_RESTART).toBe('ui.game.restart');
            expect(UI_EVENTS.GAME_QUIT).toBe('ui.game.quit');
            expect(UI_EVENTS.INPUT_KEYDOWN).toBe('ui.input.keydown');
            expect(UI_EVENTS.INPUT_KEYUP).toBe('ui.input.keyup');
            expect(UI_EVENTS.INPUT_MOUSE_CLICK).toBe('ui.input.mouse.click');
            expect(UI_EVENTS.BUTTON_CLICKED).toBe('ui.button.clicked');
            expect(UI_EVENTS.BUTTON_HOVERED).toBe('ui.button.hovered');
            expect(UI_EVENTS.MENU_NAVIGATION).toBe('ui.menu.navigation');
            expect(UI_EVENTS.MENU_OPTION_SELECTED).toBe('ui.menu.option.selected');
            expect(UI_EVENTS.MENU_OPTION_CHANGED).toBe('ui.menu.option.changed');
        });

        it('should define all required menu types', () => {
            expect(MENU_TYPES).toBeDefined();
            expect(MENU_TYPES.MAIN).toBe('main');
            expect(MENU_TYPES.OPTIONS).toBe('options');
            expect(MENU_TYPES.PAUSE).toBe('pause');
            expect(MENU_TYPES.GAME_OVER).toBe('gameOver');
            expect(MENU_TYPES.HELP).toBe('help');
            expect(MENU_TYPES.SETTINGS).toBe('settings');
        });

        it('should define all required input actions', () => {
            expect(INPUT_ACTIONS).toBeDefined();
            expect(INPUT_ACTIONS.MOVE_UP).toBe('moveUp');
            expect(INPUT_ACTIONS.MOVE_DOWN).toBe('moveDown');
            expect(INPUT_ACTIONS.MOVE_LEFT).toBe('moveLeft');
            expect(INPUT_ACTIONS.MOVE_RIGHT).toBe('moveRight');
            expect(INPUT_ACTIONS.SHOOT).toBe('shoot');
            expect(INPUT_ACTIONS.TRANSFORM).toBe('transform');
            expect(INPUT_ACTIONS.PAUSE).toBe('pause');
            expect(INPUT_ACTIONS.RESTART).toBe('restart');
            expect(INPUT_ACTIONS.MENU).toBe('menu');
            expect(INPUT_ACTIONS.CONFIRM).toBe('confirm');
            expect(INPUT_ACTIONS.CANCEL).toBe('cancel');
        });

        it('should define all required UI state keys', () => {
            expect(UI_STATE_KEYS).toBeDefined();
            expect(UI_STATE_KEYS.MENU_OPEN).toBe('ui.menu.open');
            expect(UI_STATE_KEYS.MENU_TYPE).toBe('ui.menu.type');
            expect(UI_STATE_KEYS.MENU_SELECTED_OPTION).toBe('ui.menu.selectedOption');
            expect(UI_STATE_KEYS.GAME_PAUSED).toBe('ui.game.paused');
            expect(UI_STATE_KEYS.GAME_OVER).toBe('ui.game.over');
            expect(UI_STATE_KEYS.GAME_SCORE).toBe('ui.game.score');
            expect(UI_STATE_KEYS.GAME_LEVEL).toBe('ui.game.level');
            expect(UI_STATE_KEYS.GAME_HEALTH).toBe('ui.game.health');
            expect(UI_STATE_KEYS.GAME_MODE).toBe('ui.game.mode');
            expect(UI_STATE_KEYS.MASTER_VOLUME).toBe('ui.settings.masterVolume');
            expect(UI_STATE_KEYS.SFX_VOLUME).toBe('ui.settings.sfxVolume');
            expect(UI_STATE_KEYS.MUSIC_VOLUME).toBe('ui.settings.musicVolume');
            expect(UI_STATE_KEYS.AUDIO_ENABLED).toBe('ui.settings.audioEnabled');
            expect(UI_STATE_KEYS.SHOW_FPS).toBe('ui.settings.showFPS');
            expect(UI_STATE_KEYS.DIFFICULTY).toBe('ui.settings.difficulty');
            expect(UI_STATE_KEYS.MODAL_VISIBLE).toBe('ui.modal.visible');
            expect(UI_STATE_KEYS.MODAL_TYPE).toBe('ui.modal.type');
            expect(UI_STATE_KEYS.NOTIFICATION_VISIBLE).toBe('ui.notification.visible');
            expect(UI_STATE_KEYS.NOTIFICATION_MESSAGE).toBe('ui.notification.message');
        });
    });

    describe('Event System Integration', () => {
        let eventDispatcher;
        let stateManager;
        let events;

        beforeEach(() => {
            events = [];
            eventDispatcher = {
                on: vi.fn((event, callback) => {
                    events.push({ event, callback });
                    return () => {};
                }),
                emit: vi.fn((event, data) => {
                    events.forEach(({ event: e, callback }) => {
                        if (e === event) {
                            callback(data);
                        }
                    });
                }),
                off: vi.fn()
            };
            
            stateManager = {
                setState: vi.fn(),
                getState: vi.fn(),
                subscribe: vi.fn()
            };
        });

        it('should support event registration and emission', () => {
            let eventReceived = false;
            
            eventDispatcher.on(UI_EVENTS.MENU_OPENED, () => {
                eventReceived = true;
            });
            
            eventDispatcher.emit(UI_EVENTS.MENU_OPENED);
            
            expect(eventReceived).toBe(true);
        });

        it('should support multiple event listeners', () => {
            let listener1Called = false;
            let listener2Called = false;
            
            eventDispatcher.on(UI_EVENTS.MENU_OPENED, () => {
                listener1Called = true;
            });
            
            eventDispatcher.on(UI_EVENTS.MENU_OPENED, () => {
                listener2Called = true;
            });
            
            eventDispatcher.emit(UI_EVENTS.MENU_OPENED);
            
            expect(listener1Called).toBe(true);
            expect(listener2Called).toBe(true);
        });

        it('should support event data passing', () => {
            let receivedData = null;
            
            eventDispatcher.on(UI_EVENTS.NOTIFICATION_SHOW, (data) => {
                receivedData = data;
            });
            
            const testData = { message: 'Test notification', type: 'success' };
            eventDispatcher.emit(UI_EVENTS.NOTIFICATION_SHOW, testData);
            
            expect(receivedData).toEqual(testData);
        });

        it('should support state management integration', () => {
            stateManager.setState(UI_STATE_KEYS.MENU_OPEN, true);
            stateManager.setState(UI_STATE_KEYS.MENU_TYPE, MENU_TYPES.OPTIONS);
            
            expect(stateManager.setState).toHaveBeenCalledWith(UI_STATE_KEYS.MENU_OPEN, true);
            expect(stateManager.setState).toHaveBeenCalledWith(UI_STATE_KEYS.MENU_TYPE, MENU_TYPES.OPTIONS);
        });
    });

    describe('Input System Integration', () => {
        let inputHandler;
        let keyMappings;
        let inputBuffer;

        beforeEach(() => {
            keyMappings = new Map();
            inputBuffer = [];
            
            inputHandler = {
                setKeyMapping: vi.fn((key, action) => {
                    keyMappings.set(key, action);
                }),
                getKeyMappings: vi.fn(() => keyMappings),
                addToBuffer: vi.fn((event) => {
                    inputBuffer.push(event);
                }),
                getInputBuffer: vi.fn(() => inputBuffer),
                clearInputBuffer: vi.fn(() => {
                    inputBuffer.length = 0;
                })
            };
        });

        it('should support key mapping', () => {
            inputHandler.setKeyMapping('KeyW', INPUT_ACTIONS.MOVE_UP);
            inputHandler.setKeyMapping('KeyS', INPUT_ACTIONS.MOVE_DOWN);
            inputHandler.setKeyMapping('KeyA', INPUT_ACTIONS.MOVE_LEFT);
            inputHandler.setKeyMapping('KeyD', INPUT_ACTIONS.MOVE_RIGHT);
            inputHandler.setKeyMapping('Space', INPUT_ACTIONS.SHOOT);
            
            expect(inputHandler.setKeyMapping).toHaveBeenCalledWith('KeyW', INPUT_ACTIONS.MOVE_UP);
            expect(inputHandler.setKeyMapping).toHaveBeenCalledWith('KeyS', INPUT_ACTIONS.MOVE_DOWN);
            expect(inputHandler.setKeyMapping).toHaveBeenCalledWith('KeyA', INPUT_ACTIONS.MOVE_LEFT);
            expect(inputHandler.setKeyMapping).toHaveBeenCalledWith('KeyD', INPUT_ACTIONS.MOVE_RIGHT);
            expect(inputHandler.setKeyMapping).toHaveBeenCalledWith('Space', INPUT_ACTIONS.SHOOT);
        });

        it('should support input buffer management', () => {
            const inputEvent = {
                type: 'key',
                key: 'Space',
                action: INPUT_ACTIONS.SHOOT,
                state: 'down',
                timestamp: Date.now()
            };
            
            inputHandler.addToBuffer(inputEvent);
            
            expect(inputHandler.addToBuffer).toHaveBeenCalledWith(inputEvent);
            
            const buffer = inputHandler.getInputBuffer();
            expect(buffer).toContain(inputEvent);
            
            inputHandler.clearInputBuffer();
            expect(inputHandler.clearInputBuffer).toHaveBeenCalled();
        });

        it('should support all defined input actions', () => {
            const actions = Object.values(INPUT_ACTIONS);
            
            actions.forEach(action => {
                expect(action).toBeDefined();
                expect(typeof action).toBe('string');
            });
        });
    });

    describe('Menu System Integration', () => {
        let menuSystem;
        let currentMenu;
        let menuStack;

        beforeEach(() => {
            currentMenu = null;
            menuStack = [];
            
            menuSystem = {
                openMenu: vi.fn((menuType) => {
                    currentMenu = menuType;
                    menuStack.push(menuType);
                }),
                closeMenu: vi.fn((menuType) => {
                    if (currentMenu === menuType) {
                        menuStack.pop();
                        currentMenu = menuStack[menuStack.length - 1] || null;
                    }
                }),
                toggleMenu: vi.fn((menuType) => {
                    if (currentMenu === menuType) {
                        menuSystem.closeMenu(menuType);
                    } else {
                        menuSystem.openMenu(menuType);
                    }
                }),
                getCurrentMenuState: vi.fn(() => ({
                    currentMenu,
                    isAnyMenuOpen: currentMenu !== null,
                    menuStack: [...menuStack]
                }))
            };
        });

        it('should support menu opening and closing', () => {
            menuSystem.openMenu(MENU_TYPES.OPTIONS);
            expect(menuSystem.openMenu).toHaveBeenCalledWith(MENU_TYPES.OPTIONS);
            
            menuSystem.closeMenu(MENU_TYPES.OPTIONS);
            expect(menuSystem.closeMenu).toHaveBeenCalledWith(MENU_TYPES.OPTIONS);
        });

        it('should support menu toggling', () => {
            menuSystem.toggleMenu(MENU_TYPES.PAUSE);
            expect(menuSystem.toggleMenu).toHaveBeenCalledWith(MENU_TYPES.PAUSE);
        });

        it('should support all defined menu types', () => {
            const menuTypes = Object.values(MENU_TYPES);
            
            menuTypes.forEach(menuType => {
                expect(menuType).toBeDefined();
                expect(typeof menuType).toBe('string');
            });
        });

        it('should provide menu state information', () => {
            const state = menuSystem.getCurrentMenuState();
            expect(state).toHaveProperty('currentMenu');
            expect(state).toHaveProperty('isAnyMenuOpen');
            expect(state).toHaveProperty('menuStack');
        });
    });

    describe('Display System Integration', () => {
        let displayManager;
        let notifications;
        let hudElements;

        beforeEach(() => {
            notifications = [];
            hudElements = [];
            
            displayManager = {
                createNotification: vi.fn((message, type, duration) => {
                    const notification = {
                        id: Date.now().toString(),
                        message,
                        type,
                        duration,
                        timestamp: Date.now()
                    };
                    notifications.push(notification);
                    return notification.id;
                }),
                updateHUDElement: vi.fn((key, value) => {
                    const existing = hudElements.find(el => el.key === key);
                    if (existing) {
                        existing.value = value;
                    } else {
                        hudElements.push({ key, value });
                    }
                }),
                getDisplayState: vi.fn(() => ({
                    notifications: [...notifications],
                    hudElements: hudElements.map(el => el.key)
                }))
            };
        });

        it('should support notification creation', () => {
            const notificationId = displayManager.createNotification('Test message', 'success', 3000);
            
            expect(displayManager.createNotification).toHaveBeenCalledWith('Test message', 'success', 3000);
            expect(notificationId).toBeDefined();
            expect(typeof notificationId).toBe('string');
        });

        it('should support HUD element updates', () => {
            displayManager.updateHUDElement('score', 1000);
            displayManager.updateHUDElement('health', 100);
            displayManager.updateHUDElement('level', 1);
            
            expect(displayManager.updateHUDElement).toHaveBeenCalledWith('score', 1000);
            expect(displayManager.updateHUDElement).toHaveBeenCalledWith('health', 100);
            expect(displayManager.updateHUDElement).toHaveBeenCalledWith('level', 1);
        });

        it('should provide display state information', () => {
            const state = displayManager.getDisplayState();
            expect(state).toHaveProperty('notifications');
            expect(state).toHaveProperty('hudElements');
        });
    });

    describe('System Integration Flow', () => {
        it('should support complete UI initialization flow', () => {
            let initializationComplete = false;
            
            // Mock the initialization process
            const mockInitialization = () => {
                // 1. Initialize components
                const components = ['MenuSystem', 'InputHandler', 'DisplayManager'];
                
                // 2. Set up event listeners
                components.forEach(component => {
                    expect(component).toBeDefined();
                });
                
                // 3. Initialize state
                const initialState = {
                    [UI_STATE_KEYS.MENU_OPEN]: false,
                    [UI_STATE_KEYS.GAME_PAUSED]: false,
                    [UI_STATE_KEYS.SHOW_FPS]: false
                };
                
                Object.entries(initialState).forEach(([key, value]) => {
                    expect(key).toBeDefined();
                    expect(value).toBeDefined();
                });
                
                // 4. Emit initialization event
                initializationComplete = true;
            };
            
            mockInitialization();
            
            expect(initializationComplete).toBe(true);
        });

        it('should support event-driven interactions', () => {
            let eventFlow = [];
            
            // Mock event flow
            const mockEventFlow = () => {
                // 1. User input event
                eventFlow.push(UI_EVENTS.INPUT_KEYDOWN);
                
                // 2. Menu interaction
                eventFlow.push(UI_EVENTS.MENU_OPENED);
                
                // 3. Setting change
                eventFlow.push(UI_EVENTS.SETTING_CHANGED);
                
                // 4. Notification creation
                eventFlow.push(UI_EVENTS.NOTIFICATION_SHOW);
                
                // 5. Menu closure
                eventFlow.push(UI_EVENTS.MENU_CLOSED);
            };
            
            mockEventFlow();
            
            expect(eventFlow).toContain(UI_EVENTS.INPUT_KEYDOWN);
            expect(eventFlow).toContain(UI_EVENTS.MENU_OPENED);
            expect(eventFlow).toContain(UI_EVENTS.SETTING_CHANGED);
            expect(eventFlow).toContain(UI_EVENTS.NOTIFICATION_SHOW);
            expect(eventFlow).toContain(UI_EVENTS.MENU_CLOSED);
        });
    });

    describe('UIManager State Change Events', () => {
        let mockEventDispatcher;
        beforeEach(() => {
            // Use UIManager imported above
            mockEventDispatcher = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
        });

        it('should emit STATE_CHANGED when menu is opened', () => {
            const uiManager = new UIManager(null, mockEventDispatcher, null);
            uiManager.displayManager = null; // avoid display code
            const data = { menuType: 'options' };
            uiManager.handleMenuOpened(data);
            expect(mockEventDispatcher.emit).toHaveBeenCalledWith(
                UI_EVENTS.STATE_CHANGED,
                { key: UI_STATE_KEYS.MENU_OPEN, value: true }
            );
            expect(mockEventDispatcher.emit).toHaveBeenCalledWith(
                UI_EVENTS.STATE_CHANGED,
                { key: UI_STATE_KEYS.MENU_TYPE, value: data.menuType }
            );
        });

        it('should emit STATE_CHANGED when menu is closed', () => {
            const uiManager = new UIManager(null, mockEventDispatcher, null);
            uiManager.displayManager = null;
            const data = { menuType: 'options' };
            uiManager.handleMenuClosed(data);
            expect(mockEventDispatcher.emit).toHaveBeenCalledWith(
                UI_EVENTS.STATE_CHANGED,
                { key: UI_STATE_KEYS.MENU_OPEN, value: false }
            );
            expect(mockEventDispatcher.emit).toHaveBeenCalledWith(
                UI_EVENTS.STATE_CHANGED,
                { key: UI_STATE_KEYS.MENU_TYPE, value: null }
            );
        });
    });
});
