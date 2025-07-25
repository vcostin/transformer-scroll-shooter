/**
 * Player Class - Event-Driven Architecture
 * 
 * Represents the player character with transformer capabilities.
 * Supports multiple vehicle modes with different properties.
 * Uses event-driven architecture for input handling, state management, and communication.
 */

import Bullet from '@/entities/bullet.js';
import { TransformEffect } from '@/rendering/effects.js';
import { PLAYER_EVENTS, PLAYER_STATES, MOVE_DIRECTIONS } from '@/constants/player-events.js';
import { GAME_EVENTS } from '@/constants/game-events.js';
import * as MathUtils from '@/utils/math.js';
import { EffectManager } from '@/systems/EffectManager.js';

export default class Player {
    /**
     * Extract payload from event data with fallback
     * @param {Object} data - Event data object
     * @returns {Object} Extracted payload
     */
    static extractEventPayload(data) {
        return data.payload || data;
    }

    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 30;
        
        // Stats
        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 200;
        
        // Transformer modes
        this.modes = ['car', 'scuba', 'boat', 'plane'];
        this.currentModeIndex = 0;
        this.mode = this.modes[this.currentModeIndex];
        this.transformCooldown = 0;
        
        // Shooting
        this.shootCooldown = 0;
        this.baseShootRate = 300; // milliseconds
        this.currentShootRate = this.baseShootRate;
        
        // Power-ups
        this.activePowerups = [];
        this.shield = 0;
        
        // Mode-specific properties
        this.modeProperties = {
            car: {
                speed: 250,
                shootRate: 300,
                bulletType: 'normal',
                color: '#ff6600',
                width: 40,
                height: 25
            },
            scuba: {
                speed: 150,
                shootRate: 200,
                bulletType: 'torpedo',
                color: '#0066ff',
                width: 35,
                height: 30
            },
            boat: {
                speed: 180,
                shootRate: 400,
                bulletType: 'cannon',
                color: '#006600',
                width: 45,
                height: 28
            },
            plane: {
                speed: 300,
                shootRate: 150,
                bulletType: 'laser',
                color: '#6600ff',
                width: 50,
                height: 20
            }
        };
        
        this.updateModeProperties();
        
        // Event-driven architecture setup
        this.eventDispatcher = game.eventDispatcher;
        this.stateManager = game.stateManager;
        this.effectManager = game.effectManager;
        
        // Setup effects-based event handling
        this.setupEffects();
        
        // Initialize state
        this.initializeState();
    }
    
    /**
     * Setup effects-based event handling using EffectManager
     */
    setupEffects() {
        this.setupInputEffects();
        this.setupHealthEffects();
        this.setupStateEffects();
        this.setupCollisionEffects();
        this.setupPowerupEffects();
    }

    /**
     * Setup input-related effect handlers
     */
    setupInputEffects() {
        this.effectManager.effect(PLAYER_EVENTS.INPUT_MOVE, (data) => {
            this.handleMoveInput(data);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.INPUT_SHOOT, (data) => {
            this.handleShootInput(data);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.INPUT_TRANSFORM, (data) => {
            this.handleTransformInput(data);
        });
    }

    /**
     * Setup health and damage effect handlers
     */
    setupHealthEffects() {
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_DAMAGED, (data) => {
            this.handleDamage(data);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_HEALED, (data) => {
            this.handleHeal(data);
        });
    }

    /**
     * Setup state synchronization effect handlers
     */
    setupStateEffects() {
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_SHOOT_COOLDOWN_CHANGED, (data) => {
            this.stateManager.setState(PLAYER_STATES.SHOOT_COOLDOWN, data.value);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_TRANSFORM_COOLDOWN_CHANGED, (data) => {
            this.stateManager.setState(PLAYER_STATES.TRANSFORM_COOLDOWN, data.value);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_TRANSFORMED, (data) => {
            this.stateManager.setState(PLAYER_STATES.MODE, data.newMode);
            this.stateManager.setState(PLAYER_STATES.SPEED, this.speed);
            this.stateManager.setState(PLAYER_STATES.SHOOT_RATE, this.currentShootRate);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_MOVED, (data) => {
            this.stateManager.setState(PLAYER_STATES.POSITION, { x: data.x, y: data.y });
        });
        
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_HEALTH_CHANGED, (data) => {
            this.stateManager.setState(PLAYER_STATES.HEALTH, data.health);
            this.stateManager.setState(PLAYER_STATES.SHIELD, data.shield || this.shield);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_POWERUP_ACTIVATED, (data) => {
            this.stateManager.setState(PLAYER_STATES.POWERUPS, this.activePowerups);
        });
    }

    /**
     * Setup collision effect handlers
     */
    setupCollisionEffects() {
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_COLLISION_ENEMY, (data) => {
            this.handleEnemyCollision(data);
        });
        
        this.effectManager.effect(PLAYER_EVENTS.PLAYER_COLLISION_POWERUP, (data) => {
            this.handlePowerupCollision(data);
        });
    }

    /**
     * Setup powerup effect handlers
     */
    setupPowerupEffects() {
        // Add any powerup-specific effects here if needed
        // Currently handled through collision effects
    }
    
    /**
     * Initialize player state using EffectManager
     */
    initializeState() {
        // Use the game's EffectManager instead of creating a new one
        const effectManager = this.game.effectManager;
        if (effectManager) {
            effectManager.initializeEntityState({
                stateManager: this.stateManager,
                initialState: {
                    [PLAYER_STATES.HEALTH]: this.health,
                    [PLAYER_STATES.POSITION]: { x: this.x, y: this.y },
                    [PLAYER_STATES.MODE]: this.mode,
                    [PLAYER_STATES.SPEED]: this.speed,
                    [PLAYER_STATES.SHOOT_RATE]: this.currentShootRate
                }
            });
            // Emit the event to trigger the effect
            this.eventDispatcher.emit(GAME_EVENTS.ENTITY_STATE_INIT);
        }
    }
    
    update(deltaTime, keys) {
        if (keys) {
            this.handleMovement(deltaTime, keys);
        }

        // Update cooldowns
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
        this.transformCooldown = Math.max(0, this.transformCooldown - deltaTime);

        // Update power-ups
        this.updatePowerups(deltaTime);

        // Emit events for cooldown changes (handled by EffectManager)
        this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_SHOOT_COOLDOWN_CHANGED, { value: this.shootCooldown });
        this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_TRANSFORM_COOLDOWN_CHANGED, { value: this.transformCooldown });

        // Check if dead
        if (this.health <= 0) {
            this.game.gameOver = true;
        }
    }
    
    handleMovement(deltaTime, keys) {
        const previousX = this.x;
        const previousY = this.y;
        
        let dx = 0;
        let dy = 0;
        
        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }
        
        // Apply movement with mode-specific speed
        const moveSpeed = this.speed * (deltaTime / 1000);
        this.x += dx * moveSpeed;
        this.y += dy * moveSpeed;
        
        // Keep player on screen
        this.x = MathUtils.clamp(this.x, 0, this.game.width - this.width);
        this.y = MathUtils.clamp(this.y, 0, this.game.height - this.height);
        
        // Emit events for movement and position (handled by EffectManager)
        if (this.x !== previousX || this.y !== previousY) {
            this.eventDispatcher.emit('PLAYER_POSITION_CHANGED', { x: this.x, y: this.y });
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_MOVED, {
                x: this.x,
                y: this.y,
                previousX,
                previousY
            });
        }
    }
    
    /**
     * Handle movement input events
     */
    handleMoveInput(data) {
        // Extract from event payload
        const payload = Player.extractEventPayload(data);
        const { direction, deltaTime } = payload;
        const previousX = this.x;
        const previousY = this.y;
        
        let dx = 0;
        let dy = 0;
        
        // Handle single direction or array of directions
        const directions = Array.isArray(direction) ? direction : [direction];
        
        for (const dir of directions) {
            switch (dir) {
                case MOVE_DIRECTIONS.UP:
                    dy -= 1;
                    break;
                case MOVE_DIRECTIONS.DOWN:
                    dy += 1;
                    break;
                case MOVE_DIRECTIONS.LEFT:
                    dx -= 1;
                    break;
                case MOVE_DIRECTIONS.RIGHT:
                    dx += 1;
                    break;
            }
        }
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }
        
        // Apply movement with mode-specific speed
        const moveSpeed = this.speed * (deltaTime / 1000);
        this.x += dx * moveSpeed;
        this.y += dy * moveSpeed;
        
        // Check boundaries and emit boundary hit events
        let boundaryHit = false;
        let edge = null;
        
        if (this.x < 0) {
            this.x = 0;
            boundaryHit = true;
            edge = 'left';
        } else if (this.x > this.game.width - this.width) {
            this.x = this.game.width - this.width;
            boundaryHit = true;
            edge = 'right';
        }
        
        if (this.y < 0) {
            this.y = 0;
            boundaryHit = true;
            edge = edge ? 'corner' : 'top';
        } else if (this.y > this.game.height - this.height) {
            this.y = this.game.height - this.height;
            boundaryHit = true;
            edge = edge ? 'corner' : 'bottom';
        }
        
        // Emit boundary hit event if needed
        if (boundaryHit && this.eventDispatcher) {
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_BOUNDARY_HIT, {
                edge,
                x: this.x,
                y: this.y
            });
        }
        
        // Only emit moved event if position actually changed
        if (this.x !== previousX || this.y !== previousY) {
            this.eventDispatcher.emit('PLAYER_POSITION_CHANGED', { x: this.x, y: this.y });
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_MOVED, {
                x: this.x,
                y: this.y,
                previousX,
                previousY
            });
        }
    }
    
    shoot() {
        if (this.shootCooldown <= 0) {
            const props = this.modeProperties[this.mode];
            // Play shoot sound
            this.game.audio.playSound('shoot', 0.6);
            // Create bullets based on current mode and power-ups
            const bullets = this.createBullets();
            bullets.forEach(bullet => this.game.addBullet(bullet));
            this.shootCooldown = this.currentShootRate;
            // Emit event for shoot cooldown change (handled by EffectManager)
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_SHOOT_COOLDOWN_CHANGED, { value: this.shootCooldown });
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_SHOT, {
                x: this.x + this.width,
                y: this.y + this.height / 2,
                bulletType: props.bulletType,
                mode: this.mode
            });
        }
    }
    
    /**
     * Handle shooting input events
     */
    handleShootInput(data) {
        // Extract from event payload
        const payload = Player.extractEventPayload(data);
        if (this.shootCooldown <= 0) {
            const props = this.modeProperties[this.mode];
            
            // Play shoot sound
            this.game.audio.playSound('shoot', 0.6);
            
            // Create bullets based on current mode and power-ups
            const bullets = this.createBullets();
            bullets.forEach(bullet => this.game.addBullet(bullet));
            
            this.shootCooldown = this.currentShootRate;
            
            // Emit shot event - state synchronization handled by effects
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_SHOT, {
                x: this.x + this.width,
                y: this.y + this.height / 2,
                bulletType: props.bulletType,
                mode: this.mode
            });
        }
    }
    
    createBullets() {
        const props = this.modeProperties[this.mode];
        const bullets = [];
        const centerX = this.x + this.width;
        const centerY = this.y + this.height / 2;
        
        // Check for multishot powerup
        const multishotPowerup = this.activePowerups.find(p => p.type === 'multishot');
        const shotCount = multishotPowerup ? 3 : 1;
        
        for (let i = 0; i < shotCount; i++) {
            let bulletY = centerY;
            let velocityY = 0;
            
            if (shotCount > 1) {
                const spread = 15;
                bulletY = centerY + (i - 1) * spread;
                velocityY = (i - 1) * 50;
            }
            
            bullets.push(new Bullet(
                this.game,
                centerX,
                bulletY,
                300, // velocity X
                velocityY, // velocity Y
                props.bulletType,
                true // friendly
            ));
        }
        
        return bullets;
    }
    
    transform() {
        if (this.transformCooldown <= 0) {
            const oldMode = this.mode;
            
            // Play transform sound
            this.game.audio.playSound('transform', 0.8);
            
            this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
            this.mode = this.modes[this.currentModeIndex];
            this.updateModeProperties();
            this.transformCooldown = 1000; // 1 second cooldown
            
            // Add transform effect
            this.game.addEffect(new TransformEffect(this.game, this.x, this.y));
            
            // Emit transformation event - state synchronization handled by effects
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_TRANSFORMED, {
                oldMode,
                newMode: this.mode,
                modeIndex: this.currentModeIndex
            });
        }
    }
    
    /**
     * Handle transformation input events
     */
    handleTransformInput(data) {
        // Extract from event payload
        const payload = Player.extractEventPayload(data);
        if (this.transformCooldown <= 0) {
            const oldMode = this.mode;
            
            // Play transform sound
            this.game.audio.playSound('transform', 0.8);
            
            this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
            this.mode = this.modes[this.currentModeIndex];
            this.updateModeProperties();
            this.transformCooldown = 1000; // 1 second cooldown
            
            // Add transform effect
            this.game.addEffect(new TransformEffect(this.game, this.x, this.y));
            
            // Emit transformation event - state synchronization handled by effects
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_TRANSFORMED, {
                oldMode,
                newMode: this.mode,
                modeIndex: this.currentModeIndex
            });
        }
    }
    
    updateModeProperties() {
        const props = this.modeProperties[this.mode];
        this.speed = props.speed;
        this.currentShootRate = props.shootRate;
        this.width = props.width;
        this.height = props.height;
        
        // Apply rapid fire powerup if active
        const rapidfirePowerup = this.activePowerups.find(p => p.type === 'rapidfire');
        if (rapidfirePowerup) {
            this.currentShootRate = props.shootRate * 0.3;
        }
    }
    
    collectPowerup(powerup) {
        switch (powerup.type) {
            case 'health':
                this.health = Math.min(this.maxHealth, this.health + 25);
                break;
                
            case 'shield':
                this.shield = Math.max(this.shield, 50);
                break;
                
            case 'rapidfire':
            case 'multishot':
                // Remove existing powerup of same type
                this.activePowerups = this.activePowerups.filter(p => p.type !== powerup.type);
                // Add new powerup
                this.activePowerups.push({
                    type: powerup.type,
                    duration: 10000 // 10 seconds
                });
                break;
                
            case 'transform':
                // Instant transform to next mode
                this.transform();
                break;
        }
        
        this.updateModeProperties();
    }
    
    updatePowerups(deltaTime) {
        // Update active powerup durations
        for (let i = this.activePowerups.length - 1; i >= 0; i--) {
            this.activePowerups[i].duration -= deltaTime;
            
            if (this.activePowerups[i].duration <= 0) {
                this.activePowerups.splice(i, 1);
                this.updateModeProperties(); // Recalculate properties
            }
        }
        
        // Update shield
        if (this.shield > 0) {
            this.shield = Math.max(0, this.shield - deltaTime * 0.02);
        }
    }
    
    /**
     * Handle damage events
     */
    handleDamage(data) {
        // Extract damage from event payload
        const damage = data.payload ? data.payload.damage : data.damage;
        const oldHealth = this.health;
        
        // Apply damage (consider shield)
        let actualDamage = damage;
        if (this.shield > 0) {
            actualDamage = Math.max(0, damage - this.shield);
            this.shield = Math.max(0, this.shield - damage);
        }
        
        this.health = Math.max(0, this.health - actualDamage);
        
        // Emit health changed event - state synchronization handled by effects
        this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_HEALTH_CHANGED, {
            health: this.health,
            maxHealth: this.maxHealth,
            percentage: this.health / this.maxHealth,
            previousHealth: oldHealth,
            damageDealt: actualDamage,
            shield: this.shield
        });
        
        // Emit critical health event if health is low
        if (this.health > 0 && this.health <= this.maxHealth * 0.25) {
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_HEALTH_CRITICAL, {
                health: this.health,
                maxHealth: this.maxHealth
            });
        }
        
        // Emit death event if health reaches zero
        if (this.health <= 0 && this.eventDispatcher) {
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_DIED, {
                finalHealth: this.health,
                position: { x: this.x, y: this.y }
            });
        }
    }
    
    /**
     * This method provides compatibility with the collision system
     * @param {number} damage - Amount of damage to take
     */
    takeDamage(damage) {
        // Bridge to event-driven damage handling
        this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_DAMAGED, { damage });
    }
    
    /**
     * Handle healing events
     */
    handleHeal(data) {
        // Extract from event payload
        const payload = Player.extractEventPayload(data);
        const { amount } = payload;
        const oldHealth = this.health;
        
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        // Emit health changed event - state synchronization handled by effects
        this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_HEALTH_CHANGED, {
            health: this.health,
            maxHealth: this.maxHealth,
            percentage: this.health / this.maxHealth,
            previousHealth: oldHealth,
            healAmount: amount,
            shield: this.shield
        });
        
        // Emit full health event if at max health
        if (this.health === this.maxHealth) {
            this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_HEALTH_FULL, {
                health: this.health,
                maxHealth: this.maxHealth
            });
        }
    }
    
    /**
     * Handle enemy collision events
     */
    handleEnemyCollision(data) {
        // Extract from event payload
        const payload = Player.extractEventPayload(data);
        const { enemy } = payload;
        
        // Apply damage from enemy
        if (enemy.damage) {
            this.handleDamage({ damage: enemy.damage });
        }
    }
    
    /**
     * Handle powerup collision events
     */
    handlePowerupCollision(data) {
        // Extract from event payload
        const payload = Player.extractEventPayload(data);
        const { powerup } = payload;
        
        // Add powerup to active powerups
        const powerupData = {
            type: powerup.type,
            duration: powerup.duration,
            startTime: Date.now()
        };
        
        this.activePowerups.push(powerupData);
        
        // Apply powerup effects
        this.applyPowerupEffects(powerupData);
        
        // Emit powerup activated event - state synchronization handled by effects
        this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_POWERUP_ACTIVATED, {
            type: powerup.type,
            duration: powerup.duration,
            player: this,
            activePowerups: this.activePowerups
        });
    }
    
    /**
     * Apply powerup effects immediately
     */
    applyPowerupEffects(powerup) {
        switch (powerup.type) {
            case 'shield':
                this.shield = 50;
                this.eventDispatcher.emit(PLAYER_EVENTS.PLAYER_SHIELD_ACTIVATED, {
                    shield: this.shield,
                    duration: powerup.duration
                });
                break;
            case 'rapidfire':
                this.updateModeProperties();
                break;
            case 'multishot':
                // Effect is applied in createBullets method
                break;
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // EffectManager handles cleanup automatically when effects are unregistered
        // No manual cleanup needed for effect-based event handling
    }
    
    render(ctx) {
        const props = this.modeProperties[this.mode];
        
        // Draw shield if active
        if (this.shield > 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${this.shield / 50})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(
                this.x + this.width / 2,
                this.y + this.height / 2,
                Math.max(this.width, this.height) / 2 + 10,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        }
        
        // Draw player based on current mode
        ctx.fillStyle = props.color;
        
        switch (this.mode) {
            case 'car':
                this.drawCar(ctx);
                break;
            case 'scuba':
                this.drawScuba(ctx);
                break;
            case 'boat':
                this.drawBoat(ctx);
                break;
            case 'plane':
                this.drawPlane(ctx);
                break;
        }
        
        // Draw health bar
        this.drawHealthBar(ctx);
    }
    
    drawCar(ctx) {
        // Car body
        ctx.fillRect(this.x, this.y + 8, this.width - 5, this.height - 16);
        
        // Wheels
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + 5, this.y + 2, 8, 6);
        ctx.fillRect(this.x + 5, this.y + this.height - 8, 8, 6);
        ctx.fillRect(this.x + this.width - 15, this.y + 2, 8, 6);
        ctx.fillRect(this.x + this.width - 15, this.y + this.height - 8, 8, 6);
        
        // Windshield
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(this.x + this.width - 12, this.y + 10, 8, 10);
    }
    
    drawScuba(ctx) {
        // Submarine body
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width / 2,
            this.y + this.height / 2,
            this.width / 2,
            this.height / 2,
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Periscope
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x + this.width - 5, this.y + 5, 3, 15);
        
        // Propeller
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 5, this.y + this.height / 2 - 5);
        ctx.lineTo(this.x - 5, this.y + this.height / 2 + 5);
        ctx.moveTo(this.x - 8, this.y + this.height / 2);
        ctx.lineTo(this.x - 2, this.y + this.height / 2);
        ctx.stroke();
    }
    
    drawBoat(ctx) {
        // Hull
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width - 10, this.y + this.height / 2 - 5);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width - 5, this.y + this.height);
        ctx.lineTo(this.x + 5, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Mast
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(this.x + this.width / 2, this.y, 3, this.height / 2);
        
        // Sail
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + this.width / 2 + 3, this.y + 2, 15, 12);
    }
    
    drawPlane(ctx) {
        // Fuselage
        ctx.fillRect(this.x + 10, this.y + this.height / 2 - 3, this.width - 15, 6);
        
        // Wings
        ctx.fillRect(this.x + 15, this.y + 2, 20, 4);
        ctx.fillRect(this.x + 15, this.y + this.height - 6, 20, 4);
        
        // Tail
        ctx.fillRect(this.x, this.y + this.height / 2 - 8, 15, 4);
        ctx.fillRect(this.x, this.y + this.height / 2 + 4, 15, 4);
        
        // Nose
        ctx.beginPath();
        ctx.moveTo(this.x + this.width - 5, this.y + this.height / 2);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2 - 5);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2 + 5);
        ctx.closePath();
        ctx.fill();
    }
    
    drawHealthBar(ctx) {
        const barWidth = 40;
        const barHeight = 4;
        const x = this.x + (this.width - barWidth) / 2;
        const y = this.y - 10;
        
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
