// Enemy classes
class Enemy {
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
        }
    }
    
    update(deltaTime) {
        // Move towards player
        this.move(deltaTime);
        
        // Shooting AI
        this.shootTimer += deltaTime;
        if (this.shootTimer > this.shootRate) {
            this.shoot();
            this.shootTimer = 0;
        }
        
        // Mark for deletion if off screen or dead
        if (this.x < -100 || this.health <= 0) {
            this.markedForDeletion = true;
        }
    }
    
    move(deltaTime) {
        const player = this.game.player;
        const moveSpeed = this.speed * (deltaTime / 1000);
        
        switch (this.type) {
            case 'fighter':
                // Move straight towards player
                this.x -= moveSpeed;
                
                // Slight vertical movement towards player
                const dy = player.y - this.y;
                if (Math.abs(dy) > 5) {
                    this.y += Math.sign(dy) * moveSpeed * 0.3;
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
                
                const targetDy = this.targetY - this.y;
                if (Math.abs(targetDy) > 5) {
                    this.y += Math.sign(targetDy) * moveSpeed * 0.8;
                }
                break;
        }
    }
    
    shoot() {
        const player = this.game.player;
        
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
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
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
        ctx.fillRect(this.x + 10, this.y + 30, 25, 5);
        
        // Engine pods
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x + 15, this.y - 2, 6, 10);
        ctx.fillRect(this.x + 15, this.y + 28, 6, 10);
        
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
        // Small, sleek design
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 8, 5);
        
        // Wings - small and swept
        ctx.fillRect(this.x + 8, this.y + 2, 8, 3);
        ctx.fillRect(this.x + 8, this.y + 10, 8, 3);
        
        // Nose - pointed
        ctx.beginPath();
        ctx.moveTo(this.x + 5, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 2 - 3);
        ctx.lineTo(this.x, this.y + this.height / 2 + 3);
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
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    }
}

// Bullet class
class Bullet {
    constructor(game, x, y, velocityX, velocityY, type, friendly) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.type = type;
        this.friendly = friendly;
        this.markedForDeletion = false;
        
        // Set properties based on type
        this.setupType();
    }
    
    setupType() {
        switch (this.type) {
            case 'normal':
                this.width = 8;
                this.height = 3;
                this.damage = 10;
                this.color = '#ffff00';
                break;
                
            case 'torpedo':
                this.width = 12;
                this.height = 4;
                this.damage = 15;
                this.color = '#00ffff';
                break;
                
            case 'cannon':
                this.width = 6;
                this.height = 6;
                this.damage = 20;
                this.color = '#ff8800';
                break;
                
            case 'laser':
                this.width = 15;
                this.height = 2;
                this.damage = 8;
                this.color = '#ff00ff';
                break;
                
            case 'enemy':
                this.width = 6;
                this.height = 3;
                this.damage = 5;
                this.color = '#ff4444';
                break;
        }
    }
    
    update(deltaTime) {
        const speed = deltaTime / 1000;
        this.x += this.velocityX * speed;
        this.y += this.velocityY * speed;
        
        // Mark for deletion if off screen
        if (this.x < -50 || this.x > this.game.width + 50 ||
            this.y < -50 || this.y > this.game.height + 50) {
            this.markedForDeletion = true;
        }
    }
    
    render(ctx) {
        ctx.fillStyle = this.color;
        
        switch (this.type) {
            case 'laser':
                // Draw laser beam
                ctx.fillRect(this.x, this.y, this.width, this.height);
                // Add glow effect
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 5;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.shadowBlur = 0;
                break;
                
            case 'torpedo':
                // Draw torpedo with trail
                ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.fillStyle = '#006666';
                ctx.fillRect(this.x - 5, this.y + 1, 5, 2);
                break;
                
            case 'cannon':
                // Draw cannon ball
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            default:
                // Standard bullet
                ctx.fillRect(this.x, this.y, this.width, this.height);
                break;
        }
    }
}

// Boss Enemy Class - Epic encounters every 5 levels
class Boss extends Enemy {
    constructor(game, x, y, bossType) {
        super(game, x, y, 'boss');
        this.bossType = bossType;
        this.isBoss = true;
        
        // Boss-specific properties
        this.phase = 1;
        this.maxPhases = 3;
        this.phaseSwitchHealth = [];
        this.attackPattern = 0;
        this.attackTimer = 0;
        this.specialAttackTimer = 0;
        this.movementTimer = 0;
        this.isInvulnerable = false;
        this.invulnerabilityTimer = 0;
        
        // Setup boss type
        this.setupBossType();
        this.setupPhases();
        
        // Visual effects
        this.glowIntensity = 0;
        this.glowDirection = 1;
    }
    
    setupBossType() {
        switch (this.bossType) {
            case 'fortress':
                this.width = 120;
                this.height = 80;
                this.maxHealth = 300;
                this.health = this.maxHealth;
                this.speed = 30;
                this.damage = 40;
                this.points = 500;
                this.color = '#ff2222';
                this.shootRate = 800;
                this.bulletSpeed = 180;
                this.name = 'FORTRESS DESTROYER';
                break;
                
            case 'speeddemon':
                this.width = 80;
                this.height = 60;
                this.maxHealth = 200;
                this.health = this.maxHealth;
                this.speed = 120;
                this.damage = 30;
                this.points = 400;
                this.color = '#ff8822';
                this.shootRate = 400;
                this.bulletSpeed = 300;
                this.name = 'SPEED DEMON';
                this.canTeleport = true;
                this.teleportTimer = 0;
                break;
                
            case 'shieldmaster':
                this.width = 100;
                this.height = 70;
                this.maxHealth = 250;
                this.health = this.maxHealth;
                this.speed = 50;
                this.damage = 35;
                this.points = 450;
                this.color = '#2288ff';
                this.shootRate = 600;
                this.bulletSpeed = 200;
                this.name = 'SHIELD MASTER';
                this.shieldActive = true;
                this.shieldRotation = 0;
                break;
        }
    }
    
    setupPhases() {
        // Calculate health thresholds for phase changes
        for (let i = 1; i < this.maxPhases; i++) {
            this.phaseSwitchHealth.push((this.maxHealth * (this.maxPhases - i)) / this.maxPhases);
        }
    }
    
    update(deltaTime) {
        // Update phase based on health
        this.updatePhase();
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Handle invulnerability
        if (this.isInvulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.isInvulnerable = false;
            }
        }
        
        // Boss movement patterns
        this.move(deltaTime);
        
        // Boss attack patterns
        this.updateAttacks(deltaTime);
        
        // Mark for deletion if dead
        if (this.health <= 0) {
            this.onDestroy();
            this.markedForDeletion = true;
        }
    }
    
    updatePhase() {
        const newPhase = this.maxPhases - Math.floor((this.health / this.maxHealth) * this.maxPhases) + 1;
        if (newPhase > this.phase && newPhase <= this.maxPhases) {
            this.phase = newPhase;
            this.onPhaseChange();
        }
    }
    
    onPhaseChange() {
        // Play phase change sound
        this.game.audio.playSound('transform', 1.0);
        
        // Brief invulnerability during phase change
        this.isInvulnerable = true;
        this.invulnerabilityTimer = 1000;
        
        // Reset attack patterns
        this.attackPattern = 0;
        this.attackTimer = 0;
        
        // Phase-specific changes
        switch (this.bossType) {
            case 'fortress':
                this.shootRate = Math.max(400, this.shootRate - 200); // Faster shooting each phase
                break;
            case 'speeddemon':
                this.speed += 30; // Faster movement each phase
                break;
            case 'shieldmaster':
                // Shield becomes more protective each phase
                break;
        }
    }
    
    move(deltaTime) {
        const moveSpeed = this.speed * (deltaTime / 1000);
        
        switch (this.bossType) {
            case 'fortress':
                // Slow, steady movement with occasional positioning
                this.x -= moveSpeed * 0.3;
                
                // Vertical positioning to stay in good firing position
                const player = this.game.player;
                const centerY = this.game.height / 2;
                const targetY = Math.max(50, Math.min(this.game.height - this.height - 50, centerY - this.height / 2));
                
                if (Math.abs(this.y - targetY) > 5) {
                    this.y += Math.sign(targetY - this.y) * moveSpeed * 0.5;
                }
                break;
                
            case 'speeddemon':
                // Erratic, fast movement
                this.movementTimer += deltaTime;
                
                if (this.canTeleport && this.teleportTimer <= 0) {
                    // Teleport ability
                    if (Math.random() < 0.3) {
                        this.teleport();
                        this.teleportTimer = 3000; // 3 second cooldown
                    }
                } else {
                    this.teleportTimer -= deltaTime;
                }
                
                // Fast zigzag movement
                this.x -= moveSpeed;
                this.y += Math.sin(this.movementTimer / 200) * moveSpeed * 0.8;
                
                // Keep in bounds
                this.y = Math.max(0, Math.min(this.game.height - this.height, this.y));
                break;
                
            case 'shieldmaster':
                // Defensive positioning
                this.x -= moveSpeed * 0.4;
                
                // Update shield rotation
                this.shieldRotation += deltaTime / 1000;
                
                // Circular movement pattern
                const amplitude = 30;
                const frequency = this.movementTimer / 2000;
                this.y += Math.sin(frequency) * amplitude * (deltaTime / 1000);
                this.movementTimer += deltaTime;
                break;
        }
        
        // Prevent boss from going off-screen left
        this.x = Math.max(this.game.width - this.width - 50, this.x);
    }
    
    teleport() {
        // Visual effect for teleportation
        this.game.addEffect(new TransformEffect(this.game, this.x, this.y));
        
        // Teleport to new position
        this.x = this.game.width - this.width - 100 + Math.random() * 50;
        this.y = Math.random() * (this.game.height - this.height);
        
        // Another effect at destination
        this.game.addEffect(new TransformEffect(this.game, this.x, this.y));
        
        // Play teleport sound
        this.game.audio.playSound('transform', 0.8);
    }
    
    updateAttacks(deltaTime) {
        this.attackTimer += deltaTime;
        this.specialAttackTimer += deltaTime;
        
        // Regular attack pattern
        if (this.attackTimer > this.shootRate) {
            this.regularAttack();
            this.attackTimer = 0;
        }
        
        // Special attacks based on phase
        const specialAttackRate = 3000 - (this.phase * 500); // Faster special attacks each phase
        if (this.specialAttackTimer > specialAttackRate) {
            this.specialAttack();
            this.specialAttackTimer = 0;
        }
    }
    
    regularAttack() {
        switch (this.bossType) {
            case 'fortress':
                this.fortressAttack();
                break;
            case 'speeddemon':
                this.speedDemonAttack();
                break;
            case 'shieldmaster':
                this.shieldMasterAttack();
                break;
        }
    }
    
    fortressAttack() {
        // Multiple turret attack
        const turretPositions = [
            { x: this.x, y: this.y + 10 },
            { x: this.x, y: this.y + this.height - 10 },
            { x: this.x + 20, y: this.y + this.height / 2 }
        ];
        
        turretPositions.forEach(pos => {
            const player = this.game.player;
            const dx = player.x - pos.x;
            const dy = player.y - pos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const velocityX = (dx / distance) * this.bulletSpeed;
                const velocityY = (dy / distance) * this.bulletSpeed;
                
                const bullet = new Bullet(
                    this.game,
                    pos.x,
                    pos.y,
                    velocityX,
                    velocityY,
                    'boss',
                    false
                );
                
                this.game.addBullet(bullet);
            }
        });
        
        // Play boss shoot sound
        this.game.audio.playSound('enemyShoot', 0.8);
    }
    
    speedDemonAttack() {
        // Rapid-fire burst
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const player = this.game.player;
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
                        'boss',
                        false
                    );
                    
                    this.game.addBullet(bullet);
                }
                
                this.game.audio.playSound('enemyShoot', 0.6);
            }, i * 100);
        }
    }
    
    shieldMasterAttack() {
        // Energy blast through shield
        const angles = [0, Math.PI / 4, -Math.PI / 4]; // Spread shot
        
        angles.forEach(angle => {
            const velocityX = Math.cos(angle) * this.bulletSpeed;
            const velocityY = Math.sin(angle) * this.bulletSpeed;
            
            const bullet = new Bullet(
                this.game,
                this.x,
                this.y + this.height / 2,
                velocityX,
                velocityY,
                'boss',
                false
            );
            
            this.game.addBullet(bullet);
        });
        
        this.game.audio.playSound('enemyShoot', 0.7);
    }
    
    specialAttack() {
        switch (this.bossType) {
            case 'fortress':
                this.missileBarrage();
                break;
            case 'speeddemon':
                this.dashAttack();
                break;
            case 'shieldmaster':
                this.shieldSlam();
                break;
        }
    }
    
    missileBarrage() {
        // Launch tracking missiles
        for (let i = 0; i < this.phase; i++) {
            setTimeout(() => {
                const bullet = new Bullet(
                    this.game,
                    this.x,
                    this.y + (i * 20),
                    -150,
                    0,
                    'missile',
                    false
                );
                this.game.addBullet(bullet);
            }, i * 300);
        }
        
        this.game.audio.playSound('explosion', 0.5);
    }
    
    dashAttack() {
        // Quick dash towards player
        const player = this.game.player;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const dashSpeed = 400;
            this.x += (dx / distance) * dashSpeed * 0.3;
            this.y += (dy / distance) * dashSpeed * 0.3;
        }
        
        this.game.audio.playSound('transform', 0.9);
    }
    
    shieldSlam() {
        // Create energy wave
        for (let i = 0; i < 5; i++) {
            const angle = (i - 2) * (Math.PI / 8);
            const velocityX = Math.cos(angle) * this.bulletSpeed * 1.5;
            const velocityY = Math.sin(angle) * this.bulletSpeed * 1.5;
            
            const bullet = new Bullet(
                this.game,
                this.x,
                this.y + this.height / 2,
                velocityX,
                velocityY,
                'energy',
                false
            );
            
            this.game.addBullet(bullet);
        }
        
        this.game.audio.playSound('explosion', 0.8);
    }
    
    takeDamage(damage) {
        if (this.isInvulnerable) return;
        
        // Shield master has damage reduction when shield is active
        if (this.bossType === 'shieldmaster' && this.shieldActive) {
            damage *= 0.5;
        }
        
        this.health -= damage;
        
        // Boss hit effect
        this.game.addEffect(new Explosion(this.game, this.x + this.width/2, this.y + this.height/2, 'small'));
    }
    
    updateVisualEffects(deltaTime) {
        // Pulsing glow effect
        this.glowIntensity += this.glowDirection * (deltaTime / 1000);
        if (this.glowIntensity > 1) {
            this.glowIntensity = 1;
            this.glowDirection = -1;
        } else if (this.glowIntensity < 0) {
            this.glowIntensity = 0;
            this.glowDirection = 1;
        }
    }
    
    onDestroy() {
        // Boss death effects
        this.game.addEffect(new Explosion(this.game, this.x + this.width/2, this.y + this.height/2, 'large'));
        
        // Multiple explosion effects
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const x = this.x + Math.random() * this.width;
                const y = this.y + Math.random() * this.height;
                this.game.addEffect(new Explosion(this.game, x, y, 'medium'));
            }, i * 200);
        }
        
        // Epic explosion sound
        this.game.audio.playSound('explosion', 1.0);
        
        // Bonus score and rewards
        this.game.score += this.points * this.phase; // Bonus for completing higher phases
        
        // Give player rewards (health, power-ups)
        this.game.player.health = Math.min(100, this.game.player.health + 25);
        
        // Spawn power-up reward
        const powerupTypes = ['rapidfire', 'multishot', 'shield'];
        const rewardType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        const powerup = new Powerup(this.game, this.x, this.y, rewardType);
        this.game.powerups.push(powerup);
    }
    
    render(ctx) {
        // Save context for transformations
        ctx.save();
        
        // Glow effect
        const glowAlpha = 0.3 + (this.glowIntensity * 0.4);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20 + (this.glowIntensity * 10);
        
        // Invulnerability flashing
        if (this.isInvulnerable && Math.floor(Date.now() / 100) % 2) {
            ctx.globalAlpha = 0.5;
        }
        
        // Draw boss based on type
        switch (this.bossType) {
            case 'fortress':
                this.renderFortress(ctx);
                break;
            case 'speeddemon':
                this.renderSpeedDemon(ctx);
                break;
            case 'shieldmaster':
                this.renderShieldMaster(ctx);
                break;
        }
        
        // Health bar
        this.renderHealthBar(ctx);
        
        // Boss name
        this.renderName(ctx);
        
        ctx.restore();
    }
    
    renderFortress(ctx) {
        // Main body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Turrets
        ctx.fillStyle = '#aa0000';
        ctx.fillRect(this.x - 10, this.y + 10, 15, 10);
        ctx.fillRect(this.x - 10, this.y + this.height - 20, 15, 10);
        ctx.fillRect(this.x + 15, this.y + this.height/2 - 8, 20, 16);
        
        // Details
        ctx.fillStyle = '#ffff00';
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < 4; j++) {
                ctx.fillRect(this.x + 10 + i * 15, this.y + 10 + j * 15, 3, 3);
            }
        }
    }
    
    renderSpeedDemon(ctx) {
        // Sleek, angular design
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height/2);
        ctx.lineTo(this.x + this.width/3, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height/3);
        ctx.lineTo(this.x + this.width, this.y + 2*this.height/3);
        ctx.lineTo(this.x + this.width/3, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        
        // Engine trails
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(this.x + this.width, this.y + this.height/2 - 5, 15, 3);
        ctx.fillRect(this.x + this.width, this.y + this.height/2 + 2, 15, 3);
    }
    
    renderShieldMaster(ctx) {
        // Main body
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Rotating shield
        if (this.shieldActive) {
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(this.shieldRotation);
            
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            
            // Create rotating shield segments
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const innerRadius = 40;
                const outerRadius = 60;
                
                ctx.moveTo(
                    Math.cos(angle) * innerRadius,
                    Math.sin(angle) * innerRadius
                );
                ctx.lineTo(
                    Math.cos(angle) * outerRadius,
                    Math.sin(angle) * outerRadius
                );
            }
            
            ctx.stroke();
            ctx.restore();
        }
        
        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    renderHealthBar(ctx) {
        const barWidth = this.width;
        const barHeight = 8;
        const barX = this.x;
        const barY = this.y - 20;
        
        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // Phase indicators
        for (let i = 1; i < this.maxPhases; i++) {
            const phaseX = barX + (barWidth * i / this.maxPhases);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(phaseX, barY);
            ctx.lineTo(phaseX, barY + barHeight);
            ctx.stroke();
        }
    }
    
    renderName(ctx) {
        // Boss name above health bar
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x + this.width/2, this.y - 30);
        
        // Phase indicator
        ctx.fillStyle = '#ffff00';
        ctx.font = '10px Courier New';
        ctx.fillText(`PHASE ${this.phase}`, this.x + this.width/2, this.y - 45);
    }
}
