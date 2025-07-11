/**
 * Bullet Class - Phase 3 Game Object Module
 * 
 * Represents projectiles fired by player and enemies.
 * Supports multiple bullet types with different properties.
 */

export class Bullet {
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

export default Bullet;
