// Main Game Engine

// Game Constants
const GAME_CONSTANTS = {
    BOSS_LEVEL_INTERVAL: 5,  // Boss every 5 levels
    ENEMIES_PER_LEVEL: 10,   // Regular enemies per level
    BOSS_BONUS_SCORE: 1000,  // Bonus score for boss defeat
    BOSS_HEALTH_RESTORE: 25, // Health restored on boss defeat
    MESSAGE_DURATION: {
        BOSS: 3000,
        VICTORY: 2000,
        INFO: 2000
    },
    MAX_MESSAGES: 3
};

class Game {
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
        
        // Audio and Options
        this.audio = new AudioManager();
        this.options = new OptionsMenu(this);
        
        // Input handling
        this.keys = {};
        this.setupInput();
        
        this.init();
    }
    
    init() {
        // Load settings
        this.options.loadSettings();
        
        // Initialize game objects
        this.player = new Player(this, 100, this.height / 2);
        this.background = new Background(this);
        
        // Start game loop
        this.gameLoop();
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
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Calculate FPS
        this.frameCount++;
        this.fpsTimer += deltaTime;
        if (this.fpsTimer >= 1000) {
            this.fps = Math.round(this.frameCount * 1000 / this.fpsTimer);
            this.frameCount = 0;
            this.fpsTimer = 0;
        }
        
        if (!this.paused && !this.gameOver) {
            this.update(deltaTime);
        }
        
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // Update background
        this.background.update(deltaTime);
        
        // Update player
        this.player.update(deltaTime, this.keys);
        
        // Spawn enemies and check for level progression
        this.enemySpawnTimer += deltaTime;
        const difficultyMultiplier = this.getDifficultyMultiplier();
        const spawnRate = (1000 + Math.random() * 2000) / difficultyMultiplier;
        
        // Check for boss spawn (every BOSS_LEVEL_INTERVAL levels)
        if (this.level % GAME_CONSTANTS.BOSS_LEVEL_INTERVAL === 0 && !this.bossActive && this.enemiesKilled === 0) {
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
        this.updateArray(this.enemies, deltaTime);
        this.updateArray(this.bullets, deltaTime);
        this.updateArray(this.powerups, deltaTime);
        this.updateArray(this.effects, deltaTime);
        
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
            array[i].update(deltaTime);
            if (array[i].markedForDeletion) {
                array.splice(i, 1);
            }
        }
    }
    
    spawnEnemy() {
        const types = ['fighter', 'bomber', 'scout'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const enemy = new Enemy(
            this,
            this.width + 50,
            Math.random() * (this.height - 100) + 50,
            type
        );
        
        this.enemies.push(enemy);
    }
    
    spawnBoss() {
        const bossTypes = ['fortress', 'speeddemon', 'shieldmaster'];
        const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
        
        const boss = new Boss(
            this,
            this.width + 100,
            this.height / 2,
            bossType
        );
        
        this.enemies.push(boss);
        this.bossActive = true;
        
        // Show boss warning message
        this.addMessage(`WARNING: Level ${this.level} Boss Approaching!`, 'boss');
    }
    
    spawnPowerup() {
        const types = ['shield', 'rapidfire', 'multishot', 'health', 'transform'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        const powerup = new Powerup(
            this,
            this.width + 50,
            Math.random() * (this.height - 100) + 50,
            type
        );
        
        this.powerups.push(powerup);
    }

    getDifficultyMultiplier() {
        switch(this.difficulty) {
            case 'Easy': return 0.7;
            case 'Normal': return 1.0;
            case 'Hard': return 1.5;
            case 'Insane': return 2.5;
            default: return 1.0;
        }
    }
    
    checkCollisions() {
        // Player bullets vs enemies
        this.bullets.forEach(bullet => {
            if (bullet.friendly) {
                this.enemies.forEach(enemy => {
                    if (this.checkCollision(bullet, enemy)) {
                        bullet.markedForDeletion = true;
                        enemy.takeDamage(bullet.damage);
                        this.addEffect(new Explosion(this, enemy.x, enemy.y, 'small'));
                        
                        if (enemy.health <= 0) {
                            this.score += enemy.points;
                            this.addEffect(new Explosion(this, enemy.x, enemy.y, 'large'));
                            this.audio.playSound('explosion', 0.8);
                            
                            // Check if defeated enemy was a boss
                            if (enemy.isBoss) {
                                this.bossActive = false;
                                this.addMessage(`Level ${this.level} Boss Defeated!`, 'victory');
                                // Reward player with extra points and powerup
                                this.score += GAME_CONSTANTS.BOSS_BONUS_SCORE;
                                this.spawnPowerup();
                                // Advance to next level after boss defeat
                                this.level++;
                                this.enemiesKilled = 0;
                                this.addMessage(`Level ${this.level} - Fight!`, 'info');
                            } else {
                                this.enemiesKilled++;
                                // Check if enough enemies killed to advance level (for non-boss levels)
                                if (this.enemiesKilled >= this.enemiesPerLevel) {
                                    this.level++;
                                    this.enemiesKilled = 0;
                                    this.addMessage(`Level ${this.level} - Fight!`, 'info');
                                }
                            }
                        } else {
                            this.audio.playSound('enemyHit', 0.5);
                        }
                    }
                });
            }
        });
        
        // Enemy bullets vs player
        this.bullets.forEach(bullet => {
            if (!bullet.friendly) {
                if (this.checkCollision(bullet, this.player)) {
                    bullet.markedForDeletion = true;
                    this.player.takeDamage(bullet.damage);
                    this.addEffect(new Explosion(this, this.player.x, this.player.y, 'small'));
                }
            }
        });
        
        // Enemies vs player
        this.enemies.forEach(enemy => {
            if (this.checkCollision(enemy, this.player)) {
                enemy.markedForDeletion = true;
                this.player.takeDamage(enemy.damage);
                this.addEffect(new Explosion(this, enemy.x, enemy.y, 'large'));
            }
        });
        
        // Powerups vs player
        this.powerups.forEach(powerup => {
            if (this.checkCollision(powerup, this.player)) {
                powerup.markedForDeletion = true;
                this.player.collectPowerup(powerup);
                this.addEffect(new PowerupEffect(this, powerup.x, powerup.y));
                this.audio.playSound('powerup', 0.8);
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
        // Remove off-screen objects
        this.enemies = this.enemies.filter(enemy => 
            enemy.x > -100 && !enemy.markedForDeletion
        );
        this.bullets = this.bullets.filter(bullet => 
            bullet.x > -50 && bullet.x < this.width + 50 && !bullet.markedForDeletion
        );
        this.powerups = this.powerups.filter(powerup => 
            powerup.x > -100 && !powerup.markedForDeletion
        );
    }
    
    addBullet(bullet) {
        this.bullets.push(bullet);
    }
    
    addEffect(effect) {
        this.effects.push(effect);
    }
    
    addMessage(text, type = 'info') {
        const message = {
            text: text,
            type: type,
            timestamp: Date.now(),
            duration: GAME_CONSTANTS.MESSAGE_DURATION[type.toUpperCase()] || GAME_CONSTANTS.MESSAGE_DURATION.INFO,
            alpha: 1.0
        };
        this.messages.push(message);
        
        // Limit to max messages
        if (this.messages.length > GAME_CONSTANTS.MAX_MESSAGES) {
            this.messages.shift();
        }
    }
    
    updateMessages() {
        const currentTime = Date.now();
        this.messages.forEach(message => {
            const elapsed = currentTime - message.timestamp;
            if (elapsed > message.duration - 500) {
                // Fade out in last 500ms
                message.alpha = Math.max(0, 1 - (elapsed - (message.duration - 500)) / 500);
            }
        });
        
        // Remove expired messages
        this.messages = this.messages.filter(message => 
            currentTime - message.timestamp < message.duration
        );
    }
    
    renderMessages() {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 24px Arial';
        
        this.messages.forEach((message, index) => {
            const y = 100 + index * 30;
            this.ctx.globalAlpha = message.alpha;
            
            // Set color based on message type
            switch (message.type) {
                case 'boss':
                    this.ctx.fillStyle = '#ff4444';
                    this.ctx.shadowColor = '#000000';
                    this.ctx.shadowBlur = 3;
                    break;
                case 'victory':
                    this.ctx.fillStyle = '#44ff44';
                    this.ctx.shadowColor = '#000000';
                    this.ctx.shadowBlur = 3;
                    break;
                default:
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.shadowColor = '#000000';
                    this.ctx.shadowBlur = 2;
            }
            
            this.ctx.fillText(message.text, this.width / 2, y);
        });
        
        this.ctx.restore();
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Render background
        this.background.render(this.ctx);
        
        // Render game objects
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.powerups.forEach(powerup => powerup.render(this.ctx));
        this.effects.forEach(effect => effect.render(this.ctx));
        
        // Render player
        this.player.render(this.ctx);
        
        // Render game over screen
        if (this.gameOver) {
            this.renderGameOver();
        }
        
        // Render FPS if enabled
        if (this.showFPS) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '16px Courier New';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`FPS: ${this.fps}`, 10, this.height - 20);
        }
        
        // Render messages
        this.renderMessages();
    }
    
    renderGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '48px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '24px Courier New';
        this.ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2);
        this.ctx.fillText('Press R to restart', this.width / 2, this.height / 2 + 50);
        
        this.ctx.textAlign = 'start';
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('health').textContent = this.player.health;
        document.getElementById('mode').textContent = this.player.mode.toUpperCase();
        document.getElementById('level').textContent = this.level;
        
        // Update powerup indicators
        const powerupDiv = document.getElementById('powerups');
        powerupDiv.innerHTML = this.player.activePowerups.map(p => 
            `${p.type}: ${Math.ceil(p.duration / 1000)}s`
        ).join('<br>');
    }
    
    restart() {
        this.score = 0;
        this.gameOver = false;
        this.level = 1;
        this.enemiesKilled = 0;
        this.bossActive = false;
        this.enemies = [];
        this.bullets = [];
        this.powerups = [];
        this.effects = [];
        this.messages = [];
        this.player = new Player(this, 100, this.height / 2);
        this.enemySpawnTimer = 0;
        this.powerupSpawnTimer = 0;
    }
}
