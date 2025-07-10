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
