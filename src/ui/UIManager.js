/**
 * UIManager - Central UI Management System
 * Coordinates all UI components and handles event-driven interactions
 */

import { 
    UI_EVENTS, 
    UI_STATE_KEYS, 
    INPUT_ACTIONS 
} from '../constants/ui-events.js';
import MenuSystem from './MenuSystem.js';
import InputHandler from './InputHandler.js';
import DisplayManager from './DisplayManager.js';

export class UIManager {
    constructor(game, eventDispatcher, stateManager) {
        this.game = game;
        this.eventDispatcher = eventDispatcher;
        this.stateManager = stateManager;
        
        // UI components
        this.menuSystem = null;
        this.inputHandler = null;
        this.displayManager = null;
        
        // UI state
        this.isInitialized = false;
        this.currentFocus = null;
        this.inputBuffer = [];
        this.lastInputTime = 0;
        
        // Initialize UI system
        this.initialize();
    }
    
    /**
     * Initialize UI manager
     */
    initialize() {
        this.setupEventListeners();
        this.initializeComponents();
        this.setupSystemIntegration();
        this.isInitialized = true;
        
        // Emit initialization event
        this.eventDispatcher.emit(UI_EVENTS.UI_INITIALIZED, {
            timestamp: Date.now()
        });
    }
    
    /**
     * Initialize UI components
     */
    initializeComponents() {
        // Initialize menu system
        this.menuSystem = new MenuSystem(
            this.game,
            this.eventDispatcher,
            this.stateManager
        );
        
        // Initialize input handler
        this.inputHandler = new InputHandler(
            this.eventDispatcher,
            this.stateManager
        );
        
        // Initialize display manager
        this.displayManager = new DisplayManager(
            this.game.canvas,
            this.eventDispatcher,
            this.stateManager
        );
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.eventDispatcher) return;
        
        // Game state events
        this.eventDispatcher.on(UI_EVENTS.GAME_STARTED, () => {
            this.handleGameStarted();
        });
        
        this.eventDispatcher.on(UI_EVENTS.GAME_PAUSED, () => {
            this.handleGamePaused();
        });
        
        this.eventDispatcher.on(UI_EVENTS.GAME_RESUMED, () => {
            this.handleGameResumed();
        });
        
        this.eventDispatcher.on(UI_EVENTS.GAME_ENDED, () => {
            this.handleGameEnded();
        });
        
        // UI state events
        this.eventDispatcher.on(UI_EVENTS.MENU_OPENED, (data) => {
            this.handleMenuOpened(data);
        });
        
        this.eventDispatcher.on(UI_EVENTS.MENU_CLOSED, (data) => {
            this.handleMenuClosed(data);
        });
        
        this.eventDispatcher.on(UI_EVENTS.NOTIFICATION_CREATED, (data) => {
            this.handleNotificationCreated(data);
        });
        
        // Input events
        this.eventDispatcher.on(UI_EVENTS.INPUT_ACTION, (data) => {
            this.handleInputAction(data);
        });
        
        // Display events
        this.eventDispatcher.on(UI_EVENTS.HUD_UPDATED, (data) => {
            this.handleHUDUpdate(data);
        });
        
        this.eventDispatcher.on(UI_EVENTS.DISPLAY_STATE_CHANGED, (data) => {
            this.handleDisplayStateChanged(data);
        });
    }
    
    /**
     * Set up system integration
     */
    setupSystemIntegration() {
        // Set up cross-component communication
        this.setupMenuInputIntegration();
        this.setupDisplayNotificationIntegration();
        this.setupStateManagementIntegration();
    }
    
    /**
     * Set up menu and input integration
     */
    setupMenuInputIntegration() {
        // Handle menu navigation through input
        this.eventDispatcher.on(UI_EVENTS.MENU_NAVIGATION, (data) => {
            if (this.menuSystem) {
                this.menuSystem.handleNavigation(data);
            }
        });
        
        // Handle menu toggle requests
        this.eventDispatcher.on(UI_EVENTS.MENU_TOGGLE_REQUESTED, (data) => {
            if (this.menuSystem) {
                this.menuSystem.toggleMenu(data.menuType);
            }
        });
        
        // Handle menu open/close requests
        this.eventDispatcher.on(UI_EVENTS.MENU_OPEN_REQUESTED, (data) => {
            if (this.menuSystem) {
                this.menuSystem.openMenu(data.menuType, data.options);
            }
        });
        
        this.eventDispatcher.on(UI_EVENTS.MENU_CLOSE_REQUESTED, (data) => {
            if (this.menuSystem) {
                this.menuSystem.closeMenu(data.menuType);
            }
        });
    }
    
    /**
     * Set up display and notification integration
     */
    setupDisplayNotificationIntegration() {
        // Handle display updates
        this.eventDispatcher.on(UI_EVENTS.FPS_TOGGLED, () => {
            if (this.displayManager) {
                this.displayManager.showFPS = !this.displayManager.showFPS;
            }
        });
        
        this.eventDispatcher.on(UI_EVENTS.DEBUG_TOGGLED, () => {
            if (this.displayManager) {
                this.displayManager.showDebug = !this.displayManager.showDebug;
            }
        });
        
        // Handle notification requests
        this.eventDispatcher.on(UI_EVENTS.NOTIFICATION_REQUESTED, (data) => {
            if (this.displayManager) {
                this.displayManager.createNotification(
                    data.message,
                    data.type,
                    data.duration
                );
            }
        });
    }
    
    /**
     * Set up state management integration
     */
    setupStateManagementIntegration() {
        // Subscribe to state changes
        if (this.stateManager) {
            this.stateManager.subscribe(UI_STATE_KEYS.MENU_OPEN, (isOpen) => {
                this.handleMenuStateChange(isOpen);
            });
            
            this.stateManager.subscribe(UI_STATE_KEYS.GAME_PAUSED, (isPaused) => {
                this.handlePauseStateChange(isPaused);
            });
            
            this.stateManager.subscribe(UI_STATE_KEYS.SHOW_FPS, (showFPS) => {
                this.handleFPSDisplayChange(showFPS);
            });
            
            this.stateManager.subscribe(UI_STATE_KEYS.SHOW_DEBUG, (showDebug) => {
                this.handleDebugDisplayChange(showDebug);
            });
        }
    }
    
    /**
     * Handle game started
     */
    handleGameStarted() {
        if (this.displayManager) {
            this.displayManager.resetDisplay();
            this.displayManager.createNotification('Game Started!', 'success', 2000);
        }
    }
    
    /**
     * Handle game paused
     */
    handleGamePaused() {
        if (this.displayManager) {
            this.displayManager.showPauseOverlay();
        }
    }
    
    /**
     * Handle game resumed
     */
    handleGameResumed() {
        if (this.displayManager) {
            this.displayManager.hidePauseOverlay();
        }
    }
    
    /**
     * Handle game ended
     */
    handleGameEnded() {
        if (this.displayManager) {
            this.displayManager.createNotification('Game Over!', 'error', 3000);
        }
    }
    
    /**
     * Handle menu opened
     */
    handleMenuOpened(data) {
        // Update UI state
        this.stateManager.setState(UI_STATE_KEYS.MENU_OPEN, true);
        this.stateManager.setState(UI_STATE_KEYS.MENU_TYPE, data.menuType);
        
        // Show notification
        if (this.displayManager) {
            this.displayManager.createNotification(
                `${data.menuType} menu opened`,
                'info',
                1000
            );
        }
    }
    
    /**
     * Handle menu closed
     */
    handleMenuClosed(data) {
        // Update UI state
        this.stateManager.setState(UI_STATE_KEYS.MENU_OPEN, false);
        this.stateManager.setState(UI_STATE_KEYS.MENU_TYPE, null);
        
        // Show notification
        if (this.displayManager) {
            this.displayManager.createNotification(
                `${data.menuType} menu closed`,
                'info',
                1000
            );
        }
    }
    
    /**
     * Handle notification created
     */
    handleNotificationCreated(data) {
        console.log('Notification created:', data);
    }
    
    /**
     * Handle input action
     */
    handleInputAction(data) {
        // Log input for debugging
        console.log('Input action:', data);
        
        // Update last input time
        this.lastInputTime = Date.now();
    }
    
    /**
     * Handle HUD update
     */
    handleHUDUpdate(data) {
        // Update display manager
        if (this.displayManager) {
            this.displayManager.updateHUDElement(data.element, data.value);
        }
    }
    
    /**
     * Handle display state changed
     */
    handleDisplayStateChanged(data) {
        console.log('Display state changed:', data);
    }
    
    /**
     * Handle menu state change
     */
    handleMenuStateChange(isOpen) {
        this.currentFocus = isOpen ? 'menu' : 'game';
    }
    
    /**
     * Handle pause state change
     */
    handlePauseStateChange(isPaused) {
        if (isPaused) {
            this.handleGamePaused();
        } else {
            this.handleGameResumed();
        }
    }
    
    /**
     * Handle FPS display change
     */
    handleFPSDisplayChange(showFPS) {
        if (this.displayManager) {
            this.displayManager.showFPS = showFPS;
        }
    }
    
    /**
     * Handle debug display change
     */
    handleDebugDisplayChange(showDebug) {
        if (this.displayManager) {
            this.displayManager.showDebug = showDebug;
        }
    }
    
    /**
     * Update UI system
     */
    update(deltaTime) {
        // Update display manager
        if (this.displayManager) {
            this.displayManager.render(deltaTime);
        }
        
        // Update input buffer
        this.updateInputBuffer();
        
        // Update component states
        this.updateComponentStates();
    }
    
    /**
     * Update input buffer
     */
    updateInputBuffer() {
        if (this.inputHandler) {
            this.inputBuffer = this.inputHandler.getInputBuffer();
        }
    }
    
    /**
     * Update component states
     */
    updateComponentStates() {
        // Update menu system state
        if (this.menuSystem) {
            const menuState = this.menuSystem.getCurrentMenuState();
            this.stateManager.setState(UI_STATE_KEYS.MENU_OPEN, menuState.isAnyMenuOpen);
            this.stateManager.setState(UI_STATE_KEYS.MENU_TYPE, menuState.currentMenu);
        }
        
        // Update display state
        if (this.displayManager) {
            const displayState = this.displayManager.getDisplayState();
            this.stateManager.setState(UI_STATE_KEYS.SHOW_FPS, displayState.showFPS);
            this.stateManager.setState(UI_STATE_KEYS.SHOW_DEBUG, displayState.showDebug);
        }
    }
    
    /**
     * Get UI state
     */
    getUIState() {
        return {
            isInitialized: this.isInitialized,
            currentFocus: this.currentFocus,
            lastInputTime: this.lastInputTime,
            menuState: this.menuSystem ? this.menuSystem.getCurrentMenuState() : null,
            displayState: this.displayManager ? this.displayManager.getDisplayState() : null,
            inputBuffer: this.inputBuffer.length
        };
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        if (this.displayManager) {
            return this.displayManager.createNotification(message, type, duration);
        }
        return null;
    }
    
    /**
     * Update HUD element
     */
    updateHUD(element, value) {
        if (this.displayManager) {
            this.displayManager.updateHUD(element, value);
        }
    }
    
    /**
     * Open menu
     */
    openMenu(menuType, options = {}) {
        if (this.menuSystem) {
            this.menuSystem.openMenu(menuType, options);
        }
    }
    
    /**
     * Close menu
     */
    closeMenu(menuType) {
        if (this.menuSystem) {
            this.menuSystem.closeMenu(menuType);
        }
    }
    
    /**
     * Toggle menu
     */
    toggleMenu(menuType) {
        if (this.menuSystem) {
            this.menuSystem.toggleMenu(menuType);
        }
    }
    
    /**
     * Get input state
     */
    getInputState() {
        if (this.inputHandler) {
            return {
                keyMappings: this.inputHandler.getKeyMappings(),
                mousePosition: this.inputHandler.getMousePosition(),
                inputBuffer: this.inputHandler.getInputBuffer()
            };
        }
        return null;
    }
    
    /**
     * Set key mapping
     */
    setKeyMapping(key, action) {
        if (this.inputHandler) {
            this.inputHandler.setKeyMapping(key, action);
        }
    }
    
    /**
     * Check if action is active
     */
    isActionActive(action) {
        if (this.inputHandler) {
            return this.inputHandler.isActionActive(action);
        }
        return false;
    }
    
    /**
     * Cleanup UI system
     */
    cleanup() {
        // Cleanup components
        if (this.menuSystem) {
            this.menuSystem.cleanup();
        }
        
        if (this.inputHandler) {
            this.inputHandler.cleanup();
        }
        
        if (this.displayManager) {
            this.displayManager.cleanup();
        }
        
        // Clear state
        this.isInitialized = false;
        this.currentFocus = null;
        this.inputBuffer.length = 0;
        
        // Emit cleanup event
        this.eventDispatcher.emit(UI_EVENTS.UI_CLEANUP, {
            timestamp: Date.now()
        });
    }
}

export default UIManager;
