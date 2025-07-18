/**
 * Enemy Base Class - Event-Driven Architecture
 * 
 * Base class for all enemy types in the game.
 * Provides common functionality for movement, shooting, and rendering.
 * Uses event-driven architecture for AI updates, state management, and communication.
 */

import Bullet from '@/entities/bullet.js';
import { BOSS_CONFIGS } from '@/constants/boss-constants.js';
import { ENEMY_EVENTS, ENEMY_STATES, ENEMY_TYPES, ENEMY_BEHAVIORS, AI_STATES } from '@/constants/enemy-events.js';

// Constants
const OFF_SCREEN_BOUNDARY = -100;
const CRITICAL_HEALTH_THRESHOLD = 0.25;

export default class Enemy {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.markedForDeletion = false;
        
        // Set properties based on type
        this.setupType();
        
        // AI and behavior
        this.shootTimer = 0;
        this.moveTimer = 0;
        this.targetY = y;
        this.aiState = AI_STATES.SPAWNING;
        this.behavior = ENEMY_BEHAVIORS.AGGRESSIVE;
        
        this.eventDispatcher = game.eventDispatcher;
        this.stateManager = game.stateManager;
        this.eventListeners = new Set();
        
        // Initialize event listeners if event dispatcher is available
        if (this.eventDispatcher) {
            this.setupEventListeners();
        }
        
        // Initialize state if state manager is available
        if (this.stateManager) {
            this.initializeState();
        }
        
        // Emit creation event
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_CREATED, {
                enemy: this,
                type: this.type,
                x: this.x,
                y: this.y,
                health: this.health,
                maxHealth: this.maxHealth
            });
        }
    }
    
    setupType() {
        switch (this.type) {
            case 'fighter':
                this.width = 30;
                this.height = 20;
                this.maxHealth = 20;
                this.health = this.maxHealth;
                this.speed = 100;
                this.damage = 15;
                this.points = 10;
                this.color = '#ff4444';
                this.shootRate = 2000;
                this.bulletSpeed = 200;
                break;
                
            case 'bomber':
                this.width = 45;
                this.height = 35;
                this.maxHealth = 40;
                this.health = this.maxHealth;
                this.speed = 60;
                this.damage = 25;
                this.points = 25;
                this.color = '#ff8844';
                this.shootRate = 3000;
                this.bulletSpeed = 150;
                break;
                
            case 'scout':
                this.width = 20;
                this.height = 15;
                this.maxHealth = 10;
                this.health = this.maxHealth;
                this.speed = 180;
                this.damage = 10;
                this.points = 5;
                this.color = '#44ff44';
                this.shootRate = 1500;
                this.bulletSpeed = 250;
                break;
                
            case 'boss':
            case 'boss_heavy':
            case 'boss_fast':
            case 'boss_sniper':
                // Use centralized boss configuration
                const config = BOSS_CONFIGS[this.type];
                Object.assign(this, config);
                this.health = this.maxHealth;
                break;
                
            default:
                // Default to fighter type
                this.width = 30;
                this.height = 20;
                this.maxHealth = 20;
                this.health = this.maxHealth;
                this.speed = 100;
                this.damage = 15;
                this.points = 10;
                this.color = '#ff4444';
                this.shootRate = 2000;
                this.bulletSpeed = 200;
                this.type = 'fighter';
                break;
        }
    }
    
    update(deltaTime) {
        // Event-driven update (preferred)
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_UPDATE, {
                enemy: this,
                deltaTime: deltaTime
            });
        } else {
            this.legacyUpdate(deltaTime);
        }
        
        // Check for off-screen or death conditions
        if (this.x < OFF_SCREEN_BOUNDARY || this.health <= 0) {
            if (this.eventDispatcher) {
                if (this.x < OFF_SCREEN_BOUNDARY) {
                    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_OFF_SCREEN, {
                        enemy: this,
                        x: this.x,
                        y: this.y
                    });
                }
                this.markedForDeletion = true;
            } else {
                this.markedForDeletion = true;
            }
        }
    }
    
    /**
     * Legacy update method for backward compatibility
     */
    legacyUpdate(deltaTime) {
        // Move towards player
        this.move(deltaTime);
        
        // Shooting AI
        this.shootTimer += deltaTime;
        if (this.shootTimer > this.shootRate) {
            this.shoot();
            this.shootTimer = 0;
        }
    }
    
    move(deltaTime) {
        const player = this.game.player;
        const moveSpeed = this.speed * (deltaTime / 1000);
        const previousX = this.x;
        const previousY = this.y;
        
        switch (this.type) {
            case 'fighter':
                // Move straight towards player
                this.x -= moveSpeed;
                
                // Slight vertical movement towards player
                if (player) {
                    const dy = player.y - this.y;
                    if (Math.abs(dy) > 5) {
                        this.y += Math.sign(dy) * moveSpeed * 0.3;
                    }
                }
                break;
                
            case 'bomber':
                // Slow, steady movement
                this.x -= moveSpeed;
                break;
                
            case 'scout':
                // Erratic movement pattern
                this.x -= moveSpeed;
                
                this.moveTimer += deltaTime;
                if (this.moveTimer > 1000) {
                    this.targetY = Math.random() * (this.game.height - this.height);
                    this.moveTimer = 0;
                }
                
                const scoutTargetDy = this.targetY - this.y;
                if (Math.abs(scoutTargetDy) > 5) {
                    this.y += Math.sign(scoutTargetDy) * moveSpeed * 0.8;
                }
                break;
                
            case 'boss':
                // Boss movement - slower horizontal movement with vertical tracking
                this.x -= moveSpeed * 0.5; // Move slower than other enemies
                
                // Track player vertically but with limits
                if (player) {
                    const bossTargetY = player.y - this.height / 2;
                    const maxY = this.game.height - this.height;
                    const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY));
                    
                    const bossDy = clampedTargetY - this.y;
                    if (Math.abs(bossDy) > 5) {
                        this.y += Math.sign(bossDy) * moveSpeed * 0.4;
                    }
                }
                break;
                
            case 'boss_heavy':
                // Heavy boss - very slow but steady movement
                this.x -= moveSpeed * 0.3; // Even slower than regular boss
                
                // Minimal vertical movement - stays more in center
                if (player) {
                    const centerY = this.game.height / 2 - this.height / 2;
                    const dy = centerY - this.y;
                    if (Math.abs(dy) > 20) {
                        this.y += Math.sign(dy) * moveSpeed * 0.2;
                    }
                }
                break;
                
            case 'boss_fast':
                // Fast boss - quick horizontal movement with aggressive tracking
                this.x -= moveSpeed * 0.8; // Faster than regular boss
                
                // Aggressive vertical tracking
                if (player) {
                    const bossTargetY = player.y - this.height / 2;
                    const maxY = this.game.height - this.height;
                    const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY));
                    
                    const bossDy = clampedTargetY - this.y;
                    if (Math.abs(bossDy) > 2) {
                        this.y += Math.sign(bossDy) * moveSpeed * 0.7;
                    }
                }
                break;
                
            case 'boss_sniper':
                // Sniper boss - maintains distance, minimal horizontal movement
                this.x -= moveSpeed * 0.2; // Very slow horizontal movement
                
                // Erratic vertical movement to avoid being predictable
                this.moveTimer += deltaTime;
                if (this.moveTimer > 2000) {
                    this.targetY = Math.random() * (this.game.height - this.height);
                    this.moveTimer = 0;
                }
                
                const sniperTargetDy = this.targetY - this.y;
                if (Math.abs(sniperTargetDy) > 5) {
                    this.y += Math.sign(sniperTargetDy) * moveSpeed * 0.3;
                }
                break;
        }
        
        // Emit movement events if position changed
        if (this.x !== previousX || this.y !== previousY) {
            if (this.eventDispatcher) {
                this.eventDispatcher.emit('ENEMY_POSITION_CHANGED', {
                    enemy: this,
                    x: this.x,
                    y: this.y,
                    previousX,
                    previousY,
                    type: this.type
                });
                this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_MOVED, {
                    enemy: this,
                    x: this.x,
                    y: this.y,
                    previousX,
                    previousY,
                    type: this.type
                });
            }
        }
    }
    
    shoot() {
        const player = this.game.player;
        
        // Only shoot if player exists
        if (!player) return;
        
        // Calculate direction to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const velocityX = (dx / distance) * this.bulletSpeed;
            const velocityY = (dy / distance) * this.bulletSpeed;
            
            const bullet = new Bullet(
                this.game,
                this.x,
                this.y + this.height / 2,
                velocityX,
                velocityY,
                'enemy',
                false // not friendly
            );
            
            this.game.addBullet(bullet);
            
            // Emit shooting event
            if (this.eventDispatcher) {
                this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_SHOT, {
                    enemy: this,
                    bullet: bullet,
                    x: this.x,
                    y: this.y + this.height / 2,
                    velocityX,
                    velocityY,
                    target: player,
                    type: this.type
                });
            }
            
            // Update state manager
            if (this.stateManager) {
                this.stateManager.setState(ENEMY_STATES.SHOOT_TIMER, this.shootTimer);
            }
        }
    }
    
    takeDamage(damage) {
        // Event-driven damage handling (preferred)
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
                enemy: this,
                damage: damage
            });
        } else {
            this.health -= damage;
            if (this.health <= 0) {
                this.cleanup();
            }
        }
    }
    
    /**
     * Setup event listeners for AI updates and collision events
     */
    setupEventListeners() {
        // Define event-to-handler mapping for cleaner registration
        const eventHandlerMapping = {
            [ENEMY_EVENTS.ENEMY_AI_UPDATE]: this.handleAIUpdate.bind(this),
            [ENEMY_EVENTS.ENEMY_DAMAGED]: this.handleDamage.bind(this),
            [ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED]: this.handleTargetAcquisition.bind(this),
            [ENEMY_EVENTS.ENEMY_COLLISION_BULLET]: this.handleBulletCollision.bind(this),
            [ENEMY_EVENTS.ENEMY_COLLISION_PLAYER]: this.handlePlayerCollision.bind(this),
        };
        
        // Register all event listeners with instance-specific filtering
        for (const [event, handler] of Object.entries(eventHandlerMapping)) {
            const listener = this.eventDispatcher.on(event, (data) => {
                if (data.enemy === this) {
                    handler(data);
                }
            });
            this.eventListeners.add(listener);
        }
    }
    
    /**
     * Initialize state in state manager
     */
    initializeState() {
        if (this.stateManager) {
            this.stateManager.setState(ENEMY_STATES.HEALTH, this.health);
            this.stateManager.setState(ENEMY_STATES.POSITION, { x: this.x, y: this.y });
            this.stateManager.setState(ENEMY_STATES.VELOCITY, { x: 0, y: 0 });
            this.stateManager.setState(ENEMY_STATES.TARGET, null);
            this.stateManager.setState(ENEMY_STATES.BEHAVIOR, this.behavior);
            this.stateManager.setState(ENEMY_STATES.SHOOT_TIMER, this.shootTimer);
            this.stateManager.setState(ENEMY_STATES.MOVE_TIMER, this.moveTimer);
            this.stateManager.setState(ENEMY_STATES.AI_STATE, this.aiState);
        }
    }
    
    /**
     * Handle AI update events
     */
    handleAIUpdate(data) {
        const { deltaTime } = data;
        
        // Update AI behavior based on current state
        switch (this.aiState) {
            case AI_STATES.SPAWNING:
                this.aiState = AI_STATES.MOVING;
                break;
            case AI_STATES.MOVING:
                // Check if we should switch to attacking
                if (this.game.player) {
                    this.aiState = AI_STATES.ATTACKING;
                }
                break;
            case AI_STATES.ATTACKING:
                // Handle shooting while moving
                this.shootTimer += deltaTime;
                if (this.shootTimer > this.shootRate) {
                    this.shoot();
                    this.shootTimer = 0;
                }
                break;
            case AI_STATES.SEARCHING:
                // Look for targets
                const player = this.game.player;
                if (player && this.eventDispatcher) {
                    this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_AI_TARGET_ACQUIRED, {
                        enemy: this,
                        target: player
                    });
                }
                break;
            case AI_STATES.FLEEING:
                // Special fleeing behavior could go here
                break;
        }
        
        // All AI states except SPAWNING and DYING should move
        if (this.aiState !== AI_STATES.SPAWNING && this.aiState !== AI_STATES.DYING) {
            this.move(deltaTime);
        }
        
        // Update state manager
        if (this.stateManager) {
            this.stateManager.setState(ENEMY_STATES.AI_STATE, this.aiState);
        }
    }
    
    /**
     * Handle damage events
     */
    handleDamage(data) {
        const { damage } = data;
        const oldHealth = this.health;
        
        this.health -= damage;
        
        // Update state manager
        if (this.stateManager) {
            this.stateManager.setState(ENEMY_STATES.HEALTH, this.health);
        }
        
        // Emit health changed event
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CHANGED, {
                enemy: this,
                health: this.health,
                maxHealth: this.maxHealth,
                previousHealth: oldHealth,
                damage: damage
            });
        }
        
        // Check for critical health
        if (this.health <= this.maxHealth * CRITICAL_HEALTH_THRESHOLD && this.health > 0 && this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_HEALTH_CRITICAL, {
                enemy: this,
                health: this.health,
                maxHealth: this.maxHealth
            });
        }
        
        // Check for death
        if (this.health <= 0) {
            this.die();
        }
    }
    
    /**
     * Handle target acquisition
     */
    handleTargetAcquisition(data) {
        const { target } = data;
        
        // Update state manager
        if (this.stateManager) {
            this.stateManager.setState(ENEMY_STATES.TARGET, target);
        }
        
        // Change AI state to attacking if we have a target
        if (target) {
            this.aiState = AI_STATES.ATTACKING;
        }
    }
    
    /**
     * Handle bullet collision events
     */
    handleBulletCollision(data) {
        const { bullet } = data;
        
        // Apply damage from bullet
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
                enemy: this,
                damage: bullet.damage || 10
            });
        } else {
            this.takeDamage(bullet.damage || 10);
        }
    }
    
    /**
     * Handle player collision events
     */
    handlePlayerCollision(data) {
        const { player } = data;
        
        // Deal damage to player and self-destruct
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DAMAGED, {
                enemy: this,
                damage: this.maxHealth // Self-destruct
            });
        } else {
            this.takeDamage(this.maxHealth);
        }
    }
    
    /**
     * Enemy death handling
     */
    die() {
        this.aiState = AI_STATES.DYING;
        
        // Emit death event
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DIED, {
                enemy: this,
                type: this.type,
                x: this.x,
                y: this.y,
                points: this.points
            });
        }
        
        // Mark for deletion
        this.markedForDeletion = true;
        
        // Clean up
        this.cleanup();
    }
    
    /**
     * Cleanup event listeners and emit destroy event
     */
    cleanup() {
        // Clean up event listeners
        if (this.eventDispatcher && this.eventListeners) {
            this.eventListeners.forEach(removeListener => {
                if (typeof removeListener === 'function') {
                    removeListener();
                }
            });
            this.eventListeners.clear();
        }
        
        // Emit destruction event
        if (this.eventDispatcher) {
            this.eventDispatcher.emit(ENEMY_EVENTS.ENEMY_DESTROYED, {
                enemy: this,
                type: this.type,
                x: this.x,
                y: this.y
            });
        }
    }

    render(ctx) {
        // Draw enemy based on type
        ctx.fillStyle = this.color;
        
        switch (this.type) {
            case 'fighter':
                this.drawFighter(ctx);
                break;
            case 'bomber':
                this.drawBomber(ctx);
                break;
            case 'scout':
                this.drawScout(ctx);
                break;
            case 'boss':
                this.drawBoss(ctx);
                break;
            case 'boss_heavy':
                this.drawBossHeavy(ctx);
                break;
            case 'boss_fast':
                this.drawBossFast(ctx);
                break;
            case 'boss_sniper':
                this.drawBossSniper(ctx);
                break;
        }
        
        // Draw health bar for damaged enemies
        if (this.health < this.maxHealth) {
            this.drawHealthBar(ctx);
        }
    }
    
    drawFighter(ctx) {
        // Main body
        ctx.fillRect(this.x, this.y + 6, this.width - 5, 8);
        
        // Wings
        ctx.fillRect(this.x + 8, this.y, 15, 4);
        ctx.fillRect(this.x + 8, this.y + 16, 15, 4);
        
        // Nose
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 8, this.y + this.height / 2 - 4);
        ctx.lineTo(this.x - 8, this.y + this.height / 2 + 4);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBomber(ctx) {
        // Main body - larger and bulkier
        ctx.fillRect(this.x, this.y + 8, this.width - 10, 20);
        
        // Wings
        ctx.fillRect(this.x + 10, this.y, 25, 6);
        ctx.fillRect(this.x + 10, this.y + 29, 25, 6);
        
        // Engines
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x + 15, this.y + 2, 4, 4);
        ctx.fillRect(this.x + 15, this.y + 29, 4, 4);
        
        // Nose
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 12, this.y + this.height / 2 - 6);
        ctx.lineTo(this.x - 12, this.y + this.height / 2 + 6);
        ctx.closePath();
        ctx.fill();
    }
    
    drawScout(ctx) {
        // Small, agile ship
        ctx.fillRect(this.x, this.y + 4, this.width - 3, 7);
        
        // Small wings
        ctx.fillRect(this.x + 5, this.y, 10, 3);
        ctx.fillRect(this.x + 5, this.y + 12, 10, 3);
        
        // Pointed nose
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 6, this.y + this.height / 2 - 3);
        ctx.lineTo(this.x - 6, this.y + this.height / 2 + 3);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBoss(ctx) {
        // Main body - large and imposing
        ctx.fillRect(this.x, this.y + 15, this.width - 15, 30);
        
        // Upper and lower sections
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 25, 15);
        ctx.fillRect(this.x + 5, this.y + 40, this.width - 25, 15);
        
        // Central core
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(this.x + 10, this.y + 20, this.width - 35, 20);
        
        // Weapon pods
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + this.width - 20, this.y + 10, 8, 12);
        ctx.fillRect(this.x + this.width - 20, this.y + 38, 8, 12);
        
        // Nose/front section
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 15, this.y + this.height / 2 - 8);
        ctx.lineTo(this.x - 15, this.y + this.height / 2 + 8);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBossHeavy(ctx) {
        // Main body - very large and bulky
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y + 20, this.width - 20, 40);
        
        // Upper and lower armor sections
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 30, 20);
        ctx.fillRect(this.x + 5, this.y + 55, this.width - 30, 20);
        
        // Central core - darker
        ctx.fillStyle = '#4B0000';
        ctx.fillRect(this.x + 15, this.y + 25, this.width - 45, 30);
        
        // Heavy weapon pods
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + this.width - 25, this.y + 15, 12, 20);
        ctx.fillRect(this.x + this.width - 25, this.y + 45, 12, 20);
        
        // Massive nose section
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 20, this.y + this.height / 2 - 12);
        ctx.lineTo(this.x - 20, this.y + this.height / 2 + 12);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBossFast(ctx) {
        // Main body - sleek and angular
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y + 12, this.width - 10, 26);
        
        // Angular wings
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y);
        ctx.lineTo(this.x + 30, this.y + 8);
        ctx.lineTo(this.x + 15, this.y + 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + 50);
        ctx.lineTo(this.x + 30, this.y + 42);
        ctx.lineTo(this.x + 15, this.y + 35);
        ctx.closePath();
        ctx.fill();
        
        // Engine cores
        ctx.fillStyle = '#FF9900';
        ctx.fillRect(this.x + 5, this.y + 18, this.width - 25, 8);
        ctx.fillRect(this.x + 5, this.y + 28, this.width - 25, 8);
        
        // Sharp nose
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 12, this.y + this.height / 2 - 6);
        ctx.lineTo(this.x - 12, this.y + this.height / 2 + 6);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBossSniper(ctx) {
        // Main body - long and streamlined
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y + 18, this.width - 12, 34);
        
        // Sniper barrel/cannon
        ctx.fillStyle = '#6A0DAD';
        ctx.fillRect(this.x - 30, this.y + 28, 35, 14);
        
        // Targeting systems
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x + 10, this.y + 8, 8, 8);
        ctx.fillRect(this.x + 10, this.y + 54, 8, 8);
        
        // Main body sections
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 25, 15);
        ctx.fillRect(this.x + 5, this.y + 50, this.width - 25, 15);
        
        // Scope/targeting array
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x + 20, this.y + 30, 6, 10);
        
        // Pointed nose
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 10, this.y + this.height / 2 - 5);
        ctx.lineTo(this.x - 10, this.y + this.height / 2 + 5);
        ctx.closePath();
        ctx.fill();
    }

    drawHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 3;
        const x = this.x;
        const y = this.y - 8;
        
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                       healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    }
}
