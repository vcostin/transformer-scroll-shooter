/**
 * MenuSystem - Centralized Menu Management
 * Handles all menu types and their interactions through the event system
 */

import { 
    UI_EVENTS, 
    UI_STATE_KEYS, 
    MENU_TYPES 
} from '@/constants/ui-events.js';
import OptionsMenu from '@/ui/options.js';

export class MenuSystem {
    constructor(game, eventDispatcher, stateManager) {
        this.game = game;
        this.eventDispatcher = eventDispatcher;
        this.stateManager = stateManager;
        
        // Menu instances
        this.menus = new Map();
        this.currentMenu = null;
        this.menuStack = [];
        this.isInitialized = false;
        
        // Initialize menu system
        this.initialize();
    }
    
    /**
     * Initialize menu system
     */
    initialize() {
        this.setupEventListeners();
        this.initializeMenus();
        this.isInitialized = true;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Listen for menu control events
        this.eventDispatcher.on(UI_EVENTS.MENU_OPEN_REQUESTED, (data) => {
            this.openMenu(data.menuType, data.options);
        });
        
        this.eventDispatcher.on(UI_EVENTS.MENU_CLOSE_REQUESTED, (data) => {
            this.closeMenu(data.menuType);
        });
        
        this.eventDispatcher.on(UI_EVENTS.MENU_TOGGLE_REQUESTED, (data) => {
            this.toggleMenu(data.menuType);
        });
        
        // Listen for menu navigation
        this.eventDispatcher.on(UI_EVENTS.MENU_NAVIGATION, (data) => {
            this.handleNavigation(data);
        });
        
        // Listen for menu selection
        this.eventDispatcher.on(UI_EVENTS.MENU_OPTION_SELECTED, (data) => {
            this.handleMenuSelection(data);
        });
        
        // Listen for escape key to close menus
        this.eventDispatcher.on(UI_EVENTS.KEY_PRESSED, (data) => {
            if (data.key === 'Escape' && this.currentMenu) {
                this.closeCurrentMenu();
            }
        });
    }
    
    /**
     * Initialize menu instances
     */
    initializeMenus() {
        // Create options menu
        this.menus.set(MENU_TYPES.OPTIONS, new OptionsMenu(
            this.game,
            this.eventDispatcher,
            this.stateManager
        ));
        
        // Create pause menu (simple implementation)
        this.menus.set(MENU_TYPES.PAUSE, this.createPauseMenu());
        
        // Create main menu (simple implementation)
        this.menus.set(MENU_TYPES.MAIN, this.createMainMenu());
    }
    
    /**
     * Create pause menu
     */
    createPauseMenu() {
        return {
            type: MENU_TYPES.PAUSE,
            isOpen: false,
            options: [
                { label: 'Resume', action: () => this.closeMenu(MENU_TYPES.PAUSE) },
                { label: 'Options', action: () => this.openMenu(MENU_TYPES.OPTIONS) },
                { label: 'Main Menu', action: () => this.returnToMainMenu() }
            ],
            selectedOption: 0,
            
            open: () => {
                this.game.paused = true;
                this.isOpen = true;
                this.eventDispatcher.emit(UI_EVENTS.MENU_OPENED, {
                    menuType: MENU_TYPES.PAUSE
                });
            },
            
            close: () => {
                this.game.paused = false;
                this.isOpen = false;
                this.eventDispatcher.emit(UI_EVENTS.MENU_CLOSED, {
                    menuType: MENU_TYPES.PAUSE
                });
            },
            
            handleNavigation: (data) => {
                const { direction, action } = data;
                
                if (direction === 'up') {
                    this.selectedOption = Math.max(0, this.selectedOption - 1);
                } else if (direction === 'down') {
                    this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
                }
                
                if (action === 'select') {
                    this.options[this.selectedOption].action();
                }
            }
        };
    }
    
    /**
     * Create main menu
     */
    createMainMenu() {
        return {
            type: MENU_TYPES.MAIN,
            isOpen: false,
            options: [
                { label: 'New Game', action: () => this.startNewGame() },
                { label: 'Options', action: () => this.openMenu(MENU_TYPES.OPTIONS) },
                { label: 'Exit', action: () => this.exitGame() }
            ],
            selectedOption: 0,
            
            open: () => {
                this.isOpen = true;
                this.eventDispatcher.emit(UI_EVENTS.MENU_OPENED, {
                    menuType: MENU_TYPES.MAIN
                });
            },
            
            close: () => {
                this.isOpen = false;
                this.eventDispatcher.emit(UI_EVENTS.MENU_CLOSED, {
                    menuType: MENU_TYPES.MAIN
                });
            },
            
            handleNavigation: (data) => {
                const { direction, action } = data;
                
                if (direction === 'up') {
                    this.selectedOption = Math.max(0, this.selectedOption - 1);
                } else if (direction === 'down') {
                    this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
                }
                
                if (action === 'select') {
                    this.options[this.selectedOption].action();
                }
            }
        };
    }
    
    /**
     * Open a menu
     */
    openMenu(menuType, options = {}) {
        const menu = this.menus.get(menuType);
        if (!menu) {
            console.warn(`Menu type ${menuType} not found`);
            return;
        }
        
        // Close current menu if different
        if (this.currentMenu && this.currentMenu.type !== menuType) {
            this.menuStack.push(this.currentMenu);
            this.currentMenu.close();
        }
        
        // Open new menu
        this.currentMenu = menu;
        menu.open();
        
        // Update state
        this.stateManager.setState(UI_STATE_KEYS.MENU_OPEN, true);
        this.stateManager.setState(UI_STATE_KEYS.MENU_TYPE, menuType);
        
        // Emit event
        this.eventDispatcher.emit(UI_EVENTS.MENU_OPENED, {
            menuType,
            options,
            source: 'menuSystem'
        });
    }
    
    /**
     * Close a menu
     */
    closeMenu(menuType) {
        const menu = this.menus.get(menuType);
        if (!menu || !menu.isOpen) {
            return;
        }
        
        menu.close();
        
        // Handle menu stack
        if (this.currentMenu === menu) {
            this.currentMenu = null;
            
            // Restore previous menu if exists
            if (this.menuStack.length > 0) {
                this.currentMenu = this.menuStack.pop();
                this.currentMenu.open();
            } else {
                // No more menus, update state
                this.stateManager.setState(UI_STATE_KEYS.MENU_OPEN, false);
                this.stateManager.setState(UI_STATE_KEYS.MENU_TYPE, null);
            }
        }
        
        // Emit event
        this.eventDispatcher.emit(UI_EVENTS.MENU_CLOSED, {
            menuType,
            source: 'menuSystem'
        });
    }
    
    /**
     * Toggle a menu
     */
    toggleMenu(menuType) {
        const menu = this.menus.get(menuType);
        if (!menu) {
            console.warn(`Menu type ${menuType} not found`);
            return;
        }
        
        if (menu.isOpen) {
            this.closeMenu(menuType);
        } else {
            this.openMenu(menuType);
        }
    }
    
    /**
     * Close current menu
     */
    closeCurrentMenu() {
        if (this.currentMenu) {
            this.closeMenu(this.currentMenu.type);
        }
    }
    
    /**
     * Handle navigation for current menu
     */
    handleNavigation(data) {
        if (this.currentMenu && this.currentMenu.handleNavigation) {
            this.currentMenu.handleNavigation(data);
        }
    }
    
    /**
     * Handle menu selection
     */
    handleMenuSelection(data) {
        // Log menu selection
        console.log('Menu option selected:', data);
        
        // Emit analytics event
        this.eventDispatcher.emit(UI_EVENTS.MENU_OPTION_SELECTED, {
            ...data,
            timestamp: Date.now(),
            source: 'menuSystem'
        });
    }
    
    /**
     * Start new game
     */
    startNewGame() {
        this.closeCurrentMenu();
        this.eventDispatcher.emit(UI_EVENTS.GAME_STARTED, {
            source: 'menuSystem'
        });
    }
    
    /**
     * Return to main menu
     */
    returnToMainMenu() {
        // Close all menus
        this.closeCurrentMenu();
        
        // Reset game state
        this.game.reset();
        
        // Open main menu
        this.openMenu(MENU_TYPES.MAIN);
    }
    
    /**
     * Exit game
     */
    exitGame() {
        this.eventDispatcher.emit(UI_EVENTS.GAME_EXITED, {
            source: 'menuSystem'
        });
        
        // In a web context, we might just close the tab or show a message
        if (confirm('Are you sure you want to exit?')) {
            window.close();
        }
    }
    
    /**
     * Get current menu state
     */
    getCurrentMenuState() {
        return {
            currentMenu: this.currentMenu ? this.currentMenu.type : null,
            menuStack: this.menuStack.map(menu => menu.type),
            isAnyMenuOpen: this.currentMenu !== null
        };
    }
    
    /**
     * Check if any menu is open
     */
    isAnyMenuOpen() {
        return this.currentMenu !== null;
    }
    
    /**
     * Get menu by type
     */
    getMenu(menuType) {
        return this.menus.get(menuType);
    }
    
    /**
     * Cleanup menu system
     */
    cleanup() {
        // Close all menus
        this.closeCurrentMenu();
        
        // Cleanup individual menus
        this.menus.forEach(menu => {
            if (menu.cleanup) {
                menu.cleanup();
            }
        });
        
        this.menus.clear();
        this.menuStack.length = 0;
        this.currentMenu = null;
    }
}

export default MenuSystem;
