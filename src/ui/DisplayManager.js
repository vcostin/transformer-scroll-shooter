/**
 * DisplayManager - UI Display and Notification System
 * Handles HUD, notifications, and visual feedback through events
 */

import { 
    UI_EVENTS, 
    UI_STATE_KEYS 
} from '../constants/ui-events.js';

export class DisplayManager {
    constructor(canvas, eventDispatcher, stateManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.eventDispatcher = eventDispatcher;
        this.stateManager = stateManager;
        
        // Display state
        this.showFPS = false;
        this.showDebug = false;
        this.notifications = [];
        this.hudElements = new Map();
        
        // Animation state
        this.animationFrame = null;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        
        // Initialize
        this.initialize();
    }
    
    /**
     * Initialize display manager
     */
    initialize() {
        this.setupEventListeners();
        this.setupHUDElements();
        this.createNotificationContainer();
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Display control events
        this.eventDispatcher.on(UI_EVENTS.FPS_TOGGLED, () => {
            this.showFPS = !this.showFPS;
            this.stateManager.setState(UI_STATE_KEYS.SHOW_FPS, this.showFPS);
        });
        
        this.eventDispatcher.on(UI_EVENTS.DEBUG_TOGGLED, () => {
            this.showDebug = !this.showDebug;
            this.stateManager.setState(UI_STATE_KEYS.SHOW_DEBUG, this.showDebug);
        });
        
        // Notification events
        this.eventDispatcher.on(UI_EVENTS.NOTIFICATION_CREATED, (data) => {
            this.showNotification(data);
        });
        
        this.eventDispatcher.on(UI_EVENTS.NOTIFICATION_DISMISSED, (data) => {
            this.dismissNotification(data.id);
        });
        
        // HUD update events
        this.eventDispatcher.on(UI_EVENTS.HUD_UPDATED, (data) => {
            this.updateHUDElement(data.element, data.value);
        });
        
        // Display state changes
        this.eventDispatcher.on(UI_EVENTS.DISPLAY_STATE_CHANGED, (data) => {
            this.handleDisplayStateChange(data);
        });
        
        // Game state events
        this.eventDispatcher.on(UI_EVENTS.GAME_STARTED, () => {
            this.resetDisplay();
        });
        
        this.eventDispatcher.on(UI_EVENTS.GAME_PAUSED, () => {
            this.showPauseOverlay();
        });
        
        this.eventDispatcher.on(UI_EVENTS.GAME_RESUMED, () => {
            this.hidePauseOverlay();
        });
    }
    
    /**
     * Set up HUD elements
     */
    setupHUDElements() {
        this.hudElements.set('score', {
            value: 0,
            x: 20,
            y: 30,
            font: '20px Arial',
            color: '#ffffff',
            prefix: 'Score: '
        });
        
        this.hudElements.set('health', {
            value: 100,
            x: 20,
            y: 60,
            font: '16px Arial',
            color: '#ff0000',
            prefix: 'Health: ',
            suffix: '%'
        });
        
        this.hudElements.set('level', {
            value: 1,
            x: 20,
            y: 90,
            font: '16px Arial',
            color: '#00ff00',
            prefix: 'Level: '
        });
        
        this.hudElements.set('lives', {
            value: 3,
            x: 20,
            y: 120,
            font: '16px Arial',
            color: '#ffff00',
            prefix: 'Lives: '
        });
        
        this.hudElements.set('power', {
            value: 0,
            x: 20,
            y: 150,
            font: '16px Arial',
            color: '#ff00ff',
            prefix: 'Power: '
        });
    }
    
    /**
     * Create notification container
     */
    createNotificationContainer() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notifications';
        this.notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2000;
            pointer-events: none;
            font-family: 'Arial', sans-serif;
        `;
        
        document.body.appendChild(this.notificationContainer);
    }
    
    /**
     * Show notification
     */
    showNotification(data) {
        const notification = {
            id: data.id || Date.now().toString(),
            message: data.message,
            type: data.type || 'info',
            duration: data.duration || 3000,
            timestamp: Date.now()
        };
        
        this.notifications.push(notification);
        
        // Create notification element
        const notificationElement = document.createElement('div');
        notificationElement.id = `notification-${notification.id}`;
        notificationElement.className = `notification notification-${notification.type}`;
        notificationElement.textContent = notification.message;
        
        // Style notification
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336'
        };
        
        notificationElement.style.cssText = `
            background-color: ${colors[notification.type] || colors.info};
            color: white;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        this.notificationContainer.appendChild(notificationElement);
        
        // Animate in
        setTimeout(() => {
            notificationElement.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto-dismiss
        setTimeout(() => {
            this.dismissNotification(notification.id);
        }, notification.duration);
        
        // Emit notification shown event
        this.eventDispatcher.emit(UI_EVENTS.NOTIFICATION_SHOWN, {
            id: notification.id,
            message: notification.message,
            type: notification.type
        });
    }
    
    /**
     * Dismiss notification
     */
    dismissNotification(id) {
        const notificationElement = document.getElementById(`notification-${id}`);
        if (notificationElement) {
            notificationElement.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                notificationElement.remove();
            }, 300);
        }
        
        // Remove from notifications array
        this.notifications = this.notifications.filter(n => n.id !== id);
        
        // Emit notification dismissed event
        this.eventDispatcher.emit(UI_EVENTS.NOTIFICATION_DISMISSED, { id });
    }
    
    /**
     * Update HUD element
     */
    updateHUDElement(element, value) {
        if (this.hudElements.has(element)) {
            this.hudElements.get(element).value = value;
        }
    }
    
    /**
     * Handle display state change
     */
    handleDisplayStateChange(data) {
        const { property, value } = data;
        
        switch (property) {
            case 'showFPS':
                this.showFPS = value;
                break;
            case 'showDebug':
                this.showDebug = value;
                break;
        }
    }
    
    /**
     * Reset display
     */
    resetDisplay() {
        // Clear notifications
        this.notifications.forEach(notification => {
            this.dismissNotification(notification.id);
        });
        
        // Reset HUD elements
        this.hudElements.get('score').value = 0;
        this.hudElements.get('health').value = 100;
        this.hudElements.get('level').value = 1;
        this.hudElements.get('lives').value = 3;
        this.hudElements.get('power').value = 0;
        
        // Reset counters
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fps = 0;
    }
    
    /**
     * Show pause overlay
     */
    showPauseOverlay() {
        let overlay = document.getElementById('pauseOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pauseOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1500;
                font-family: 'Arial', sans-serif;
            `;
            
            const pauseText = document.createElement('div');
            pauseText.textContent = 'PAUSED';
            pauseText.style.cssText = `
                color: white;
                font-size: 48px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            `;
            
            overlay.appendChild(pauseText);
            document.body.appendChild(overlay);
        }
        
        overlay.style.display = 'flex';
    }
    
    /**
     * Hide pause overlay
     */
    hidePauseOverlay() {
        const overlay = document.getElementById('pauseOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * Render display elements
     */
    render(deltaTime) {
        // Update FPS
        this.updateFPS(deltaTime);
        
        // Render HUD
        this.renderHUD();
        
        // Render debug info
        if (this.showDebug) {
            this.renderDebugInfo();
        }
        
        // Render FPS
        if (this.showFPS) {
            this.renderFPS();
        }
    }
    
    /**
     * Update FPS calculation
     */
    updateFPS(deltaTime) {
        this.frameCount++;
        const now = Date.now();
        
        if (now - this.lastFPSUpdate >= 1000) {
            this.fps = Math.round(this.frameCount / ((now - this.lastFPSUpdate) / 1000));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }
    }
    
    /**
     * Render HUD
     */
    renderHUD() {
        this.ctx.save();
        
        // Render each HUD element
        this.hudElements.forEach((element, key) => {
            this.ctx.font = element.font;
            this.ctx.fillStyle = element.color;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            
            const text = `${element.prefix || ''}${element.value}${element.suffix || ''}`;
            this.ctx.fillText(text, element.x, element.y);
        });
        
        this.ctx.restore();
    }
    
    /**
     * Render debug info
     */
    renderDebugInfo() {
        this.ctx.save();
        
        const debugInfo = [
            `Canvas: ${this.canvas.width}x${this.canvas.height}`,
            `Notifications: ${this.notifications.length}`,
            `HUD Elements: ${this.hudElements.size}`,
            `State: ${this.stateManager.getState('gameState') || 'unknown'}`,
            `Menu: ${this.stateManager.getState('menuType') || 'none'}`
        ];
        
        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // Background
        const debugHeight = debugInfo.length * 16 + 10;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 250, 10, 240, debugHeight);
        
        // Text
        this.ctx.fillStyle = '#ffffff';
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, this.canvas.width - 240, 20 + index * 16);
        });
        
        this.ctx.restore();
    }
    
    /**
     * Render FPS
     */
    renderFPS() {
        this.ctx.save();
        
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#ffff00';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 70, 10, 60, 25);
        
        // FPS text
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText(`FPS: ${this.fps}`, this.canvas.width - 10, 15);
        
        this.ctx.restore();
    }
    
    /**
     * Create notification
     */
    createNotification(message, type = 'info', duration = 3000) {
        const notification = {
            id: Date.now().toString(),
            message,
            type,
            duration
        };
        
        this.eventDispatcher.emit(UI_EVENTS.NOTIFICATION_CREATED, notification);
        
        return notification.id;
    }
    
    /**
     * Update HUD
     */
    updateHUD(element, value) {
        this.eventDispatcher.emit(UI_EVENTS.HUD_UPDATED, {
            element,
            value
        });
    }
    
    /**
     * Clear all notifications
     */
    clearNotifications() {
        this.notifications.forEach(notification => {
            this.dismissNotification(notification.id);
        });
    }
    
    /**
     * Get display state
     */
    getDisplayState() {
        return {
            showFPS: this.showFPS,
            showDebug: this.showDebug,
            notifications: this.notifications.length,
            hudElements: Array.from(this.hudElements.keys())
        };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Clear notifications
        this.clearNotifications();
        
        // Remove notification container
        if (this.notificationContainer) {
            this.notificationContainer.remove();
        }
        
        // Remove overlays
        const pauseOverlay = document.getElementById('pauseOverlay');
        if (pauseOverlay) {
            pauseOverlay.remove();
        }
        
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

export default DisplayManager;
