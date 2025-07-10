// Player class with transformer capabilities
class Player {
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
    }
    
    update(deltaTime, keys) {
        // Handle movement
        this.handleMovement(deltaTime, keys);
        
        // Update cooldowns
        this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
        this.transformCooldown = Math.max(0, this.transformCooldown - deltaTime);
        
        // Update power-ups
        this.updatePowerups(deltaTime);
        
        // Check if dead
        if (this.health <= 0) {
            this.game.gameOver = true;
        }
    }
    
    handleMovement(deltaTime, keys) {
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
        this.x = Math.max(0, Math.min(this.game.width - this.width, this.x));
        this.y = Math.max(0, Math.min(this.game.height - this.height, this.y));
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
            // Play transform sound
            this.game.audio.playSound('transform', 0.8);
            
            this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
            this.mode = this.modes[this.currentModeIndex];
            this.updateModeProperties();
            this.transformCooldown = 1000; // 1 second cooldown
            
            // Add transform effect
            this.game.addEffect(new TransformEffect(this.game, this.x, this.y));
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
    
    takeDamage(damage) {
        // Play hit sound
        this.game.audio.playSound('playerHit', 0.7);
        
        if (this.shield > 0) {
            this.shield = Math.max(0, this.shield - damage);
        } else {
            this.health = Math.max(0, this.health - damage);
        }
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
