/**
 * Main Game Class - ES Module Version
 * Core game engine handling game loop, state management, and coordination
 */

import { GAME_CONSTANTS } from '@/constants/game-constants.js';
import { GAME_EVENTS } from '@/constants/game-events.js';
import { BOSS_TYPES, BOSS_MESSAGES } from '@/constants/boss-constants.js';
import { AudioManager } from '@/systems/audio.js';
import { OptionsMenu } from '@/ui/options.js';
import { Background } from '@/rendering/background.js';
import { Explosion, PowerupEffect, MuzzleFlash } from '@/rendering/effects.js';
import { Powerup, PowerupSpawner } from '@/systems/powerups.js';
import Player from '@/entities/player.js';
import Enemy from '@/entities/enemies/enemy.js';
import { EventDispatcher } from '@/systems/EventDispatcher.js';
import { stateManager } from '@/systems/StateManager.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.showFPS = false;
        this.difficulty = 'Normal';
        this.level = 1;
        this.enemiesKilled = 0;
        this.enemiesPerLevel = GAME_CONSTANTS.ENEMIES_PER_LEVEL;
        this.bossActive = false;
        this.bossSpawnedThisLevel = false;
        
        // Game objects
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.powerups = [];
        this.effects = [];
        this.background = null;
        this.messages = [];
        
        // Timing
        this.lastTime = 0;
        this.enemySpawnTimer = 0;
        this.powerupSpawnTimer = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsTimer = 0;
        this.animationFrameId = null;
        
        // Systems
        this.eventDispatcher = new EventDispatcher();
        this.stateManager = stateManager;
        this.audio = new AudioManager();
        this.options = new OptionsMenu(this);
        
        // Frame counter for events
        this.frameNumber = 0;
        
        // Initialize FPS tracking variables
        this.frameCount = 0;
        this.fpsTimer = 0;
        
        // Event listeners cleanup tracking
        this.eventListeners = new Set();
        
        // State manager subscriptions cleanup tracking
        this.stateSubscriptions = new Set();
        
        // Input handling
        this.keys = {};
        this.setupInput();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.init();
    }
    
    setupEventListeners() {
        // Core game state event listeners
        this.addEventListener(GAME_EVENTS.GAME_START, () => {
            this.stateManager.setState('game.state', 'running');
        });
        
        this.addEventListener(GAME_EVENTS.GAME_PAUSE, () => {
            this.stateManager.setState('game.state', 'paused');
        });
        
        this.addEventListener(GAME_EVENTS.GAME_RESUME, () => {
            this.stateManager.setState('game.state', 'running');
        });
        
        this.addEventListener(GAME_EVENTS.GAME_OVER, (data) => {
            this.stateManager.setState('game.state', 'gameOver');
            this.stateManager.setState('game.finalScore', data.score);
        });
        
        this.addEventListener(GAME_EVENTS.UI_SCORE_UPDATE, (data) => {
            this.stateManager.setState('game.score', data.score);
        });
        
        // Set up state change listeners to emit UI events
        const unsubscribeScore = this.stateManager.subscribe('game.score', (newScore, oldScore) => {
            if (oldScore !== undefined) {
                this.eventDispatcher.emit(GAME_EVENTS.UI_SCORE_UPDATE, {
                    score: newScore,
                    previousScore: oldScore || 0,
                    delta: newScore - (oldScore || 0)
                });
            }
        });
        
        // Store subscription for cleanup
        this.stateSubscriptions.add(unsubscribeScore);
    }
    
    addEventListener(eventName, handler) {
        const unsubscribe = this.eventDispatcher.on(eventName, handler);
        this.eventListeners.add(unsubscribe);
        return unsubscribe;
    }
    
    init() {
        // Load settings
        this.options.loadSettings();
        
        // Initialize game objects
        this.player = new Player(this, 100, this.height / 2);
        this.background = new Background(this);
        
        // Store reference for backward compatibility
        window.game = this;
        
        // Emit game start event
        this.startGame();
        
        // Start game loop
        this.gameLoop();
    }
    
    // Event-driven game state methods
    startGame() {
        this.eventDispatcher.emit(GAME_EVENTS.GAME_START, {
            timestamp: Date.now()
        });
    }
    
    pauseGame() {
        this.paused = true;
        this.eventDispatcher.emit(GAME_EVENTS.GAME_PAUSE, {
            timestamp: Date.now()
        });
    }
    
    resumeGame() {
        this.paused = false;
        this.eventDispatcher.emit(GAME_EVENTS.GAME_RESUME, {
            timestamp: Date.now()
        });
    }
    
    endGame() {
        this.gameOver = true;
        this.eventDispatcher.emit(GAME_EVENTS.GAME_OVER, {
            timestamp: Date.now(),
            score: this.score,
            level: this.level
        });
    }
    
    calculateFPS(deltaTime) {
        this.frameCount++;
        this.fpsTimer += deltaTime;
        
        if (this.fpsTimer >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / this.fpsTimer);
            this.frameCount = 0;
            this.fpsTimer = 0;
            
            // Emit FPS update event
            this.eventDispatcher.emit(GAME_EVENTS.PERFORMANCE_FPS_UPDATE, {
                fps: this.fps,
                frameTime: deltaTime
            });
        }
    }
    
    destroy() {
        // Clean up animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // Clean up event listeners
        this.eventListeners.forEach(unsubscribe => unsubscribe());
        this.eventListeners.clear();
        
        // Clean up state manager subscriptions
        this.stateSubscriptions.forEach(unsubscribe => unsubscribe());
        this.stateSubscriptions.clear();
        
        // Clean up global reference
        if (window.game === this) {
            delete window.game;
        }
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            // Handle options menu input first
            if (this.options.handleInput(e.code)) {
                e.preventDefault();
                return;
            }
            
            this.keys[e.code] = true;
            
            // Handle special keys
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    if (!this.paused && this.player) {
                        this.player.shoot();
                        // Resume audio context on first interaction
                        this.audio.resume();
                    }
                    break;
                case 'KeyQ':
                    if (!this.paused && this.player) {
                        this.player.transform();
                    }
                    break;
                case 'KeyR':
                    if (this.gameOver) {
                        this.restart();
                    }
                    break;
                case 'Escape':
                    if (!this.options.isOpen) {
                        this.options.open();
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Handle click to resume audio (Chrome autoplay policy)
        document.addEventListener('click', () => {
            this.audio.resume();
        }, { once: true });
    }
    
    gameLoop(currentTime = 0) {
        // Don't run game loop if in test environment
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            return;
        }
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        this.frameNumber++;
        
        // Emit frame event
        this.eventDispatcher.emit(GAME_EVENTS.GAME_FRAME, {
            deltaTime,
            currentTime,
            frame: this.frameNumber
        });
        
        // Emit performance frame time event
        this.eventDispatcher.emit(GAME_EVENTS.PERFORMANCE_FRAME_TIME, {
            deltaTime,
            timestamp: currentTime
        });
        
        // Calculate FPS using the new method
        this.calculateFPS(deltaTime);
        
        if (!this.paused && !this.gameOver) {
            this.update(deltaTime);
        }
        
        this.render();
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Emit game update event
        this.eventDispatcher.emit(GAME_EVENTS.GAME_UPDATE, {
            deltaTime,
            currentTime: this.lastTime,
            frame: this.frameNumber
        });
        
        // Update background
        if (this.background && typeof this.background.update === 'function') {
            this.background.update(deltaTime);
        }
        
        // Update player
        if (this.player && typeof this.player.update === 'function') {
            this.player.update(deltaTime, this.keys);
        }
        
        // Spawn enemies and check for level progression
        this.enemySpawnTimer += deltaTime;
        const difficultyMultiplier = this.getDifficultyMultiplier();
        const spawnRate = (500 + Math.random() * 1000) / difficultyMultiplier; // Reduced from 1000-3000 to 500-1500
        
        // Check for boss spawn (every BOSS_LEVEL_INTERVAL levels)
        if (this.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && !this.bossActive && this.enemiesKilled === 0 && !this.bossSpawnedThisLevel) {
            this.spawnBoss();
        }
        // Regular enemy spawning
        else if (!this.bossActive && this.enemySpawnTimer > spawnRate) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // Spawn powerups
        this.powerupSpawnTimer += deltaTime;
        if (this.powerupSpawnTimer > 5000 + Math.random() * 10000) {
            this.spawnPowerup();
            this.powerupSpawnTimer = 0;
        }
        
        // Update game objects
        this.updateEntities('enemies', this.enemies, deltaTime);
        this.updateEntities('bullets', this.bullets, deltaTime);
        this.updateEntities('powerups', this.powerups, deltaTime);
        this.updateEntities('effects', this.effects, deltaTime);
        
        // Update messages
        this.updateMessages();
        
        // Check collisions
        this.checkCollisions();
        
        // Clean up off-screen objects
        this.cleanup();
        
        // Check for game over condition
        if (this.player.health <= 0) {
            this.gameOver = true;
        }
        
        // Update UI
        this.updateUI();
    }
    
    updateArray(array, deltaTime) {
        for (let i = array.length - 1; i >= 0; i--) {
            if (array[i] && typeof array[i].update === 'function') {
                array[i].update(deltaTime);
            }
            if (array[i] && array[i].markedForDeletion) {
                array.splice(i, 1);
            }
        }
    }
    
    updateEntities(entityType, entities, deltaTime) {
        // Emit entity update event
        this.eventDispatcher.emit(GAME_EVENTS.ENTITY_UPDATE, {
            entityType,
            deltaTime,
            count: entities.length
        });
        
        // Update entities using the existing method
        this.updateArray(entities, deltaTime);
    }
    
    render() {
        // Emit render event
        this.eventDispatcher.emit(GAME_EVENTS.GAME_RENDER, {
            ctx: this.ctx,
            deltaTime: this.lastTime
        });
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Render background
        this.background.render(this.ctx);
        
        // Render game objects
        this.player.render(this.ctx);
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.powerups.forEach(powerup => powerup.render(this.ctx));
        this.effects.forEach(effect => effect.render(this.ctx));
        
        // Render UI
        this.renderUI();
        
        // Render messages
        this.renderMessages();
        
        // Render game over screen
        if (this.gameOver) {
            this.renderGameOver();
        }
    }
    
    renderUI() {
        // FPS display
        if (this.showFPS) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        }
    }
    
    renderMessages() {
        this.messages.forEach((message, index) => {
            const y = 100 + index * 30;
            this.ctx.fillStyle = message.color || '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(message.text, this.width / 2, y);
        });
        this.ctx.textAlign = 'left';
    }
    
    renderGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2);
        this.ctx.fillText('Press R to Restart', this.width / 2, this.height / 2 + 50);
        
        this.ctx.textAlign = 'left';
    }
    
    spawnEnemy() {
        const enemyTypes = ['fighter', 'bomber', 'scout'];
        const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemy = new Enemy(this, this.width + 50, Math.random() * (this.height - 100) + 50, randomType);
        this.enemies.push(enemy);
    }
    
    spawnBoss() {
        // Select random boss type
        const randomBossType = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
        
        const boss = new Enemy(this, this.width - 100, this.height / 2 - 30, randomBossType);
        this.enemies.push(boss);
        this.bossActive = true;
        this.bossSpawnedThisLevel = true;
        
        this.addMessage(BOSS_MESSAGES[randomBossType], '#ff0000', GAME_CONSTANTS.MESSAGE_DURATION.BOSS);
    }
    
    spawnPowerup() {
        const type = PowerupSpawner.getWeightedType();
        const powerup = new Powerup(this, this.width + 50, Math.random() * (this.height - 100) + 50, type);
        this.powerups.push(powerup);
    }
    
    addMessage(text, color = '#ffffff', duration = GAME_CONSTANTS.MESSAGE_DURATION.INFO) {
        this.messages.push({
            text,
            color,
            duration,
            age: 0
        });
        
        // Keep only the most recent messages
        if (this.messages.length > GAME_CONSTANTS.MAX_MESSAGES) {
            this.messages.splice(0, this.messages.length - GAME_CONSTANTS.MAX_MESSAGES);
        }
    }
    
    updateMessages() {
        for (let i = this.messages.length - 1; i >= 0; i--) {
            this.messages[i].age += 16; // Approximate deltaTime
            if (this.messages[i].age >= this.messages[i].duration) {
                this.messages.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        // Player bullets vs enemies
        this.bullets.forEach(bullet => {
            if (bullet.owner === 'player') {
                this.enemies.forEach(enemy => {
                    if (this.checkCollision(bullet, enemy)) {
                        bullet.markedForDeletion = true;
                        enemy.takeDamage(bullet.damage || 25);
                        this.effects.push(new Explosion(this, enemy.x, enemy.y, 'small'));
                        this.audio.playSound('enemyHit');
                        
                        if (enemy.health <= 0) {
                            this.score += enemy.points || 100;
                            this.enemiesKilled++;
                            
                            // Check for level progression
                            if (this.enemiesKilled % this.enemiesPerLevel === 0) {
                                this.level++;
                                this.enemiesKilled = 0; // Reset counter for next level
                                this.bossSpawnedThisLevel = false; // Reset boss spawn flag for new level
                                this.addMessage(`LEVEL ${this.level}!`, '#00ff00', GAME_CONSTANTS.MESSAGE_DURATION.LEVEL_UP);
                            }
                            
                            if (this.isBoss(enemy)) {
                                this.bossActive = false;
                                this.score += GAME_CONSTANTS.BOSS_BONUS_SCORE;
                                this.player.health = Math.min(this.player.maxHealth, 
                                    this.player.health + GAME_CONSTANTS.BOSS_HEALTH_RESTORE);
                            }
                            
                            this.effects.push(new Explosion(this, enemy.x, enemy.y, 'medium'));
                            this.audio.playSound('explosion');
                            enemy.markedForDeletion = true;
                        }
                    }
                });
            }
        });
        
        // Enemy bullets vs player
        this.bullets.forEach(bullet => {
            if (bullet.owner === 'enemy') {
                if (this.checkCollision(bullet, this.player)) {
                    bullet.markedForDeletion = true;
                    this.player.takeDamage(bullet.damage || 25);
                    this.effects.push(new Explosion(this, this.player.x, this.player.y, 'small'));
                    this.audio.playSound('playerHit');
                }
            }
        });
        
        // Player vs powerups
        this.powerups.forEach(powerup => {
            if (this.checkCollision(this.player, powerup)) {
                this.player.collectPowerup(powerup);
                this.effects.push(new PowerupEffect(this, powerup.x, powerup.y, powerup.color));
                this.audio.playSound('powerup');
                powerup.markedForDeletion = true;
            }
        });
        
        // Player vs enemies
        this.enemies.forEach(enemy => {
            if (this.checkCollision(this.player, enemy)) {
                this.player.takeDamage(50);
                enemy.takeDamage(50);
                this.effects.push(new Explosion(this, (this.player.x + enemy.x) / 2, 
                    (this.player.y + enemy.y) / 2, 'medium'));
                this.audio.playSound('explosion');
            }
        });
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    cleanup() {
        // Remove off-screen objects and marked for deletion
        this.bullets = this.bullets.filter(bullet => 
            !bullet.markedForDeletion && 
            bullet.x > -50 && bullet.x < this.width + 50 && 
            bullet.y > -50 && bullet.y < this.height + 50
        );
        
        this.enemies = this.enemies.filter(enemy => 
            !enemy.markedForDeletion && 
            enemy.x > -100 && enemy.x < this.width + 100
        );
        
        this.powerups = this.powerups.filter(powerup => 
            !powerup.markedForDeletion && 
            powerup.x > -100 && powerup.x < this.width + 100
        );
    }
    
    updateUI() {
        // Update HTML UI elements
        document.getElementById('score').textContent = this.score;
        document.getElementById('health').textContent = this.player.health;
        document.getElementById('mode').textContent = this.player.mode ? this.player.mode.toUpperCase() : 'UNKNOWN';
        document.getElementById('level').textContent = this.level;
    }
    
    getDifficultyMultiplier() {
        switch (this.difficulty) {
            case 'Easy': return 0.5;
            case 'Normal': return 1.0;
            case 'Hard': return 1.5;
            case 'Extreme': return 2.0;
            default: return 1.0;
        }
    }
    
    restart() {
        // Emit restart event
        this.eventDispatcher.emit(GAME_EVENTS.GAME_RESTART, {
            timestamp: Date.now()
        });
        
        this.score = 0;
        this.gameOver = false;
        this.level = 1;
        this.enemiesKilled = 0;
        this.bossActive = false;
        this.bossSpawnedThisLevel = false;
        
        this.enemies = [];
        this.bullets = [];
        this.powerups = [];
        this.effects = [];
        this.messages = [];
        
        // Reset spawn timers to prevent immediate spawns after restart
        this.enemySpawnTimer = 0;
        this.powerupSpawnTimer = 0;
        this.lastTime = 0;
        this.fpsTimer = 0;
        this.frameCount = 0;
        
        this.player = new Player(this, 100, this.height / 2);
    }
    
    addBullet(bullet) {
        this.bullets.push(bullet);
    }
    
    addEffect(effect) {
        this.effects.push(effect);
    }
    
    stop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    isBoss(enemy) {
        return BOSS_TYPES.includes(enemy.type);
    }
}

// Default export
export default Game;
