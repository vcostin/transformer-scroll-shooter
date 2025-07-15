/**
 * UI Events Constants
 * 
 * Defines all UI-related event types for the event-driven architecture.
 * These events handle menu interactions, game controls, and UI state changes.
 */

// UI Menu Events
export const UI_EVENTS = {
    // Menu lifecycle events
    MENU_OPENED: 'ui.menu.opened',
    MENU_CLOSED: 'ui.menu.closed',
    MENU_OPTION_SELECTED: 'ui.menu.option.selected',
    MENU_OPTION_CHANGED: 'ui.menu.option.changed',
    MENU_NAVIGATION: 'ui.menu.navigation',
    
    // Button interaction events
    BUTTON_CLICKED: 'ui.button.clicked',
    BUTTON_HOVERED: 'ui.button.hovered',
    BUTTON_PRESSED: 'ui.button.pressed',
    BUTTON_RELEASED: 'ui.button.released',
    
    // Input control events
    INPUT_KEYDOWN: 'ui.input.keydown',
    INPUT_KEYUP: 'ui.input.keyup',
    INPUT_MOUSE_CLICK: 'ui.input.mouse.click',
    INPUT_MOUSE_MOVE: 'ui.input.mouse.move',
    INPUT_TOUCH_START: 'ui.input.touch.start',
    INPUT_TOUCH_END: 'ui.input.touch.end',
    INPUT_TOUCH_MOVE: 'ui.input.touch.move',
    
    // Game control events
    GAME_PAUSE: 'ui.game.pause',
    GAME_RESUME: 'ui.game.resume',
    GAME_RESTART: 'ui.game.restart',
    GAME_QUIT: 'ui.game.quit',
    
    // Settings/Options events
    SETTING_CHANGED: 'ui.setting.changed',
    VOLUME_CHANGED: 'ui.volume.changed',
    DIFFICULTY_CHANGED: 'ui.difficulty.changed',
    GRAPHICS_CHANGED: 'ui.graphics.changed',
    
    // Display update events
    SCORE_UPDATED: 'ui.display.score.updated',
    HEALTH_UPDATED: 'ui.display.health.updated',
    LEVEL_UPDATED: 'ui.display.level.updated',
    MODE_UPDATED: 'ui.display.mode.updated',
    FPS_UPDATED: 'ui.display.fps.updated',
    
    // Modal/Dialog events
    MODAL_SHOW: 'ui.modal.show',
    MODAL_HIDE: 'ui.modal.hide',
    DIALOG_CONFIRM: 'ui.dialog.confirm',
    DIALOG_CANCEL: 'ui.dialog.cancel',
    
    // Notification events
    NOTIFICATION_SHOW: 'ui.notification.show',
    NOTIFICATION_HIDE: 'ui.notification.hide',
    
    // Error handling
    UI_ERROR: 'ui.error',
    UI_WARNING: 'ui.warning'
};

// UI State Keys for StateManager
export const UI_STATE_KEYS = {
    // Menu state
    MENU_OPEN: 'ui.menu.open',
    MENU_TYPE: 'ui.menu.type',
    MENU_SELECTED_OPTION: 'ui.menu.selectedOption',
    
    // Game state
    GAME_PAUSED: 'ui.game.paused',
    GAME_OVER: 'ui.game.over',
    GAME_SCORE: 'ui.game.score',
    GAME_LEVEL: 'ui.game.level',
    GAME_HEALTH: 'ui.game.health',
    GAME_MODE: 'ui.game.mode',
    
    // Settings state
    MASTER_VOLUME: 'ui.settings.masterVolume',
    SFX_VOLUME: 'ui.settings.sfxVolume',
    MUSIC_VOLUME: 'ui.settings.musicVolume',
    AUDIO_ENABLED: 'ui.settings.audioEnabled',
    SHOW_FPS: 'ui.settings.showFPS',
    DIFFICULTY: 'ui.settings.difficulty',
    
    // Display state
    MODAL_VISIBLE: 'ui.modal.visible',
    MODAL_TYPE: 'ui.modal.type',
    NOTIFICATION_VISIBLE: 'ui.notification.visible',
    NOTIFICATION_MESSAGE: 'ui.notification.message'
};

// UI Element Types
export const UI_ELEMENT_TYPES = {
    BUTTON: 'button',
    SLIDER: 'slider',
    TOGGLE: 'toggle',
    SELECT: 'select',
    TEXT_INPUT: 'textInput',
    CHECKBOX: 'checkbox',
    RADIO: 'radio'
};

// Menu Types
export const MENU_TYPES = {
    MAIN: 'main',
    PAUSE: 'pause',
    OPTIONS: 'options',
    HELP: 'help',
    GAME_OVER: 'gameOver',
    SETTINGS: 'settings'
};

// Input Action Types
export const INPUT_ACTIONS = {
    MOVE_UP: 'moveUp',
    MOVE_DOWN: 'moveDown',
    MOVE_LEFT: 'moveLeft',
    MOVE_RIGHT: 'moveRight',
    SHOOT: 'shoot',
    TRANSFORM: 'transform',
    PAUSE: 'pause',
    RESTART: 'restart',
    MENU: 'menu',
    CONFIRM: 'confirm',
    CANCEL: 'cancel'
};

// Key Mappings (default bindings)
export const DEFAULT_KEY_MAPPINGS = {
    // Movement
    KeyW: INPUT_ACTIONS.MOVE_UP,
    KeyS: INPUT_ACTIONS.MOVE_DOWN,
    KeyA: INPUT_ACTIONS.MOVE_LEFT,
    KeyD: INPUT_ACTIONS.MOVE_RIGHT,
    ArrowUp: INPUT_ACTIONS.MOVE_UP,
    ArrowDown: INPUT_ACTIONS.MOVE_DOWN,
    ArrowLeft: INPUT_ACTIONS.MOVE_LEFT,
    ArrowRight: INPUT_ACTIONS.MOVE_RIGHT,
    
    // Actions
    Space: INPUT_ACTIONS.SHOOT,
    KeyQ: INPUT_ACTIONS.TRANSFORM,
    KeyP: INPUT_ACTIONS.PAUSE,
    KeyR: INPUT_ACTIONS.RESTART,
    Escape: INPUT_ACTIONS.MENU,
    Enter: INPUT_ACTIONS.CONFIRM,
    Backspace: INPUT_ACTIONS.CANCEL
};

// UI Animation States
export const UI_ANIMATION_STATES = {
    IDLE: 'idle',
    HOVER: 'hover',
    PRESSED: 'pressed',
    DISABLED: 'disabled',
    LOADING: 'loading'
};

// UI Responsiveness Breakpoints
export const UI_BREAKPOINTS = {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200
};

export default {
    UI_EVENTS,
    UI_STATE_KEYS,
    UI_ELEMENT_TYPES,
    MENU_TYPES,
    INPUT_ACTIONS,
    DEFAULT_KEY_MAPPINGS,
    UI_ANIMATION_STATES,
    UI_BREAKPOINTS
};
