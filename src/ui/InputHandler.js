/**
 * InputHandler - Event-Driven Input Management
 * Centralized input handling with UI event integration
 */

import { 
    UI_EVENTS, 
    INPUT_ACTIONS 
} from '../constants/ui-events.js';

export class InputHandler {
    constructor(eventDispatcher, stateManager) {
        this.eventDispatcher = eventDispatcher;
        this.stateManager = stateManager;
        
        // Input state
        this.keys = new Map();
        this.mouseState = {
            x: 0,
            y: 0,
            buttons: new Map()
        };
        
        // Configuration
        this.keyMappings = new Map();
        this.inputBuffer = [];
        this.bufferMaxSize = 10;
        this.bufferTimeout = 100; // ms
        
        // Initialize
        this.setupKeyMappings();
        this.setupEventListeners();
    }
    
    /**
     * Set up key mappings
     */
    setupKeyMappings() {
        // Game controls
        this.keyMappings.set('ArrowUp', INPUT_ACTIONS.MOVE_UP);
        this.keyMappings.set('KeyW', INPUT_ACTIONS.MOVE_UP);
        this.keyMappings.set('ArrowDown', INPUT_ACTIONS.MOVE_DOWN);
        this.keyMappings.set('KeyS', INPUT_ACTIONS.MOVE_DOWN);
        this.keyMappings.set('ArrowLeft', INPUT_ACTIONS.MOVE_LEFT);
        this.keyMappings.set('KeyA', INPUT_ACTIONS.MOVE_LEFT);
        this.keyMappings.set('ArrowRight', INPUT_ACTIONS.MOVE_RIGHT);
        this.keyMappings.set('KeyD', INPUT_ACTIONS.MOVE_RIGHT);
        
        // Combat controls
        this.keyMappings.set('Space', INPUT_ACTIONS.FIRE);
        this.keyMappings.set('Enter', INPUT_ACTIONS.FIRE);
        this.keyMappings.set('KeyZ', INPUT_ACTIONS.FIRE);
        this.keyMappings.set('KeyX', INPUT_ACTIONS.SPECIAL);
        this.keyMappings.set('KeyC', INPUT_ACTIONS.BOMB);
        
        // Menu controls
        this.keyMappings.set('Escape', INPUT_ACTIONS.MENU_TOGGLE);
        this.keyMappings.set('KeyP', INPUT_ACTIONS.PAUSE);
        this.keyMappings.set('KeyO', INPUT_ACTIONS.OPTIONS);
        this.keyMappings.set('KeyM', INPUT_ACTIONS.MUTE);
        
        // Debug controls
        this.keyMappings.set('F1', INPUT_ACTIONS.DEBUG_TOGGLE);
        this.keyMappings.set('F2', INPUT_ACTIONS.FPS_TOGGLE);
        this.keyMappings.set('F3', INPUT_ACTIONS.DEBUG_INFO);
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        
        // Touch events for mobile
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        
        // Focus events
        window.addEventListener('focus', () => this.handleFocus());
        window.addEventListener('blur', () => this.handleBlur());
    }
    
    /**
     * Handle key down
     */
    handleKeyDown(event) {
        const key = event.code;
        
        // Prevent default for game keys
        if (this.keyMappings.has(key)) {
            event.preventDefault();
        }
        
        // Update key state
        this.keys.set(key, {
            pressed: true,
            timestamp: Date.now(),
            repeated: event.repeat
        });
        
        // Get mapped action
        const action = this.keyMappings.get(key);
        
        // Emit key pressed event
        this.eventDispatcher.emit(UI_EVENTS.KEY_PRESSED, {
            key,
            action,
            repeated: event.repeat,
            modifiers: {
                ctrl: event.ctrlKey,
                shift: event.shiftKey,
                alt: event.altKey,
                meta: event.metaKey
            },
            timestamp: Date.now()
        });
        
        // Handle input action
        if (action && !event.repeat) {
            this.handleInputAction(action, { pressed: true });
        }
        
        // Add to input buffer
        this.addToBuffer({
            type: 'key',
            key,
            action,
            state: 'down',
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle key up
     */
    handleKeyUp(event) {
        const key = event.code;
        
        // Update key state
        this.keys.set(key, {
            pressed: false,
            timestamp: Date.now()
        });
        
        // Get mapped action
        const action = this.keyMappings.get(key);
        
        // Emit key released event
        this.eventDispatcher.emit(UI_EVENTS.KEY_RELEASED, {
            key,
            action,
            timestamp: Date.now()
        });
        
        // Handle input action
        if (action) {
            this.handleInputAction(action, { pressed: false });
        }
        
        // Add to input buffer
        this.addToBuffer({
            type: 'key',
            key,
            action,
            state: 'up',
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle mouse move
     */
    handleMouseMove(event) {
        const rect = event.target.getBoundingClientRect();
        this.mouseState.x = event.clientX - rect.left;
        this.mouseState.y = event.clientY - rect.top;
        
        this.eventDispatcher.emit(UI_EVENTS.MOUSE_MOVED, {
            x: this.mouseState.x,
            y: this.mouseState.y,
            deltaX: event.movementX,
            deltaY: event.movementY,
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle mouse down
     */
    handleMouseDown(event) {
        const button = event.button;
        this.mouseState.buttons.set(button, {
            pressed: true,
            timestamp: Date.now()
        });
        
        this.eventDispatcher.emit(UI_EVENTS.MOUSE_CLICKED, {
            button,
            x: this.mouseState.x,
            y: this.mouseState.y,
            timestamp: Date.now()
        });
        
        // Handle mouse as input action
        if (button === 0) { // Left click
            this.handleInputAction(INPUT_ACTIONS.FIRE, { pressed: true });
        }
    }
    
    /**
     * Handle mouse up
     */
    handleMouseUp(event) {
        const button = event.button;
        this.mouseState.buttons.set(button, {
            pressed: false,
            timestamp: Date.now()
        });
        
        this.eventDispatcher.emit(UI_EVENTS.MOUSE_RELEASED, {
            button,
            x: this.mouseState.x,
            y: this.mouseState.y,
            timestamp: Date.now()
        });
        
        // Handle mouse as input action
        if (button === 0) { // Left click
            this.handleInputAction(INPUT_ACTIONS.FIRE, { pressed: false });
        }
    }
    
    /**
     * Handle mouse wheel
     */
    handleMouseWheel(event) {
        this.eventDispatcher.emit(UI_EVENTS.MOUSE_WHEEL, {
            deltaY: event.deltaY,
            deltaX: event.deltaX,
            x: this.mouseState.x,
            y: this.mouseState.y,
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle touch start
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        Array.from(event.touches).forEach(touch => {
            this.eventDispatcher.emit(UI_EVENTS.TOUCH_STARTED, {
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Handle touch move
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        Array.from(event.touches).forEach(touch => {
            this.eventDispatcher.emit(UI_EVENTS.TOUCH_MOVED, {
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        event.preventDefault();
        
        Array.from(event.changedTouches).forEach(touch => {
            this.eventDispatcher.emit(UI_EVENTS.TOUCH_ENDED, {
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Handle focus
     */
    handleFocus() {
        this.eventDispatcher.emit(UI_EVENTS.FOCUS_GAINED, {
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle blur
     */
    handleBlur() {
        // Clear all keys on blur
        this.keys.clear();
        this.mouseState.buttons.clear();
        
        this.eventDispatcher.emit(UI_EVENTS.FOCUS_LOST, {
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle input action
     */
    handleInputAction(action, data) {
        // Get current UI state
        const isMenuOpen = this.stateManager.getState('menuOpen');
        const menuType = this.stateManager.getState('menuType');
        
        // Handle menu-specific actions
        if (isMenuOpen) {
            this.handleMenuAction(action, data, menuType);
        } else {
            this.handleGameAction(action, data);
        }
        
        // Emit input action event
        this.eventDispatcher.emit(UI_EVENTS.INPUT_ACTION, {
            action,
            data,
            context: isMenuOpen ? 'menu' : 'game',
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle menu action
     */
    handleMenuAction(action, data, menuType) {
        if (!data.pressed) return; // Only handle key down for menus
        
        switch (action) {
            case INPUT_ACTIONS.MOVE_UP:
                this.eventDispatcher.emit(UI_EVENTS.MENU_NAVIGATION, {
                    direction: 'up',
                    menuType
                });
                break;
                
            case INPUT_ACTIONS.MOVE_DOWN:
                this.eventDispatcher.emit(UI_EVENTS.MENU_NAVIGATION, {
                    direction: 'down',
                    menuType
                });
                break;
                
            case INPUT_ACTIONS.MOVE_LEFT:
                this.eventDispatcher.emit(UI_EVENTS.MENU_NAVIGATION, {
                    direction: 'left',
                    menuType
                });
                break;
                
            case INPUT_ACTIONS.MOVE_RIGHT:
                this.eventDispatcher.emit(UI_EVENTS.MENU_NAVIGATION, {
                    direction: 'right',
                    menuType
                });
                break;
                
            case INPUT_ACTIONS.FIRE:
                this.eventDispatcher.emit(UI_EVENTS.MENU_NAVIGATION, {
                    direction: null,
                    action: 'select',
                    menuType
                });
                break;
                
            case INPUT_ACTIONS.MENU_TOGGLE:
                this.eventDispatcher.emit(UI_EVENTS.MENU_CLOSE_REQUESTED, {
                    menuType
                });
                break;
        }
    }
    
    /**
     * Handle game action
     */
    handleGameAction(action, data) {
        switch (action) {
            case INPUT_ACTIONS.MENU_TOGGLE:
                if (data.pressed) {
                    this.eventDispatcher.emit(UI_EVENTS.MENU_TOGGLE_REQUESTED, {
                        menuType: 'pause'
                    });
                }
                break;
                
            case INPUT_ACTIONS.PAUSE:
                if (data.pressed) {
                    this.eventDispatcher.emit(UI_EVENTS.GAME_PAUSED, {
                        source: 'input'
                    });
                }
                break;
                
            case INPUT_ACTIONS.OPTIONS:
                if (data.pressed) {
                    this.eventDispatcher.emit(UI_EVENTS.MENU_OPEN_REQUESTED, {
                        menuType: 'options'
                    });
                }
                break;
                
            case INPUT_ACTIONS.MUTE:
                if (data.pressed) {
                    this.eventDispatcher.emit(UI_EVENTS.AUDIO_MUTED, {
                        source: 'input'
                    });
                }
                break;
                
            case INPUT_ACTIONS.DEBUG_TOGGLE:
                if (data.pressed) {
                    this.eventDispatcher.emit(UI_EVENTS.DEBUG_TOGGLED, {
                        source: 'input'
                    });
                }
                break;
                
            case INPUT_ACTIONS.FPS_TOGGLE:
                if (data.pressed) {
                    this.eventDispatcher.emit(UI_EVENTS.FPS_TOGGLED, {
                        source: 'input'
                    });
                }
                break;
        }
    }
    
    /**
     * Add to input buffer
     */
    addToBuffer(input) {
        this.inputBuffer.push(input);
        
        // Limit buffer size
        if (this.inputBuffer.length > this.bufferMaxSize) {
            this.inputBuffer.shift();
        }
        
        // Clear old entries
        const now = Date.now();
        this.inputBuffer = this.inputBuffer.filter(
            entry => now - entry.timestamp < this.bufferTimeout
        );
    }
    
    /**
     * Check if key is pressed
     */
    isKeyPressed(key) {
        const keyState = this.keys.get(key);
        return keyState && keyState.pressed;
    }
    
    /**
     * Check if action is active
     */
    isActionActive(action) {
        for (const [key, mappedAction] of this.keyMappings) {
            if (mappedAction === action && this.isKeyPressed(key)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Get mouse position
     */
    getMousePosition() {
        return {
            x: this.mouseState.x,
            y: this.mouseState.y
        };
    }
    
    /**
     * Check if mouse button is pressed
     */
    isMouseButtonPressed(button) {
        const buttonState = this.mouseState.buttons.get(button);
        return buttonState && buttonState.pressed;
    }
    
    /**
     * Get input buffer
     */
    getInputBuffer() {
        return [...this.inputBuffer];
    }
    
    /**
     * Clear input buffer
     */
    clearInputBuffer() {
        this.inputBuffer.length = 0;
    }
    
    /**
     * Set key mapping
     */
    setKeyMapping(key, action) {
        this.keyMappings.set(key, action);
    }
    
    /**
     * Remove key mapping
     */
    removeKeyMapping(key) {
        this.keyMappings.delete(key);
    }
    
    /**
     * Get key mappings
     */
    getKeyMappings() {
        return new Map(this.keyMappings);
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('wheel', this.handleMouseWheel);
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('focus', this.handleFocus);
        window.removeEventListener('blur', this.handleBlur);
        
        // Clear state
        this.keys.clear();
        this.mouseState.buttons.clear();
        this.inputBuffer.length = 0;
    }
}

export default InputHandler;
