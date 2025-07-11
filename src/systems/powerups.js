/**
 * Power-up System - ES Module Version
 * Handles collectible power-ups and their effects
 */

export class Powerup {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;
        this.markedForDeletion = false;
        
        // Common properties
        this.width = 25;
        this.height = 25;
        this.speed = 80;
        this.bobOffset = 0;
        this.rotationAngle = 0;
        
        // Set type-specific properties
        this.setupType();
    }
    
    setupType() {
        switch (this.type) {
            case 'health':
                this.color = '#ff0000';
                this.symbol = '+';
                this.description = 'Health Boost';
                break;
                
            case 'shield':
                this.color = '#00ffff';
                this.symbol = '◇';
                this.description = 'Energy Shield';
                break;
                
            case 'rapidfire':
                this.color = '#ffff00';
                this.symbol = '⟩⟩';
                this.description = 'Rapid Fire';
                break;
                
            case 'multishot':
                this.color = '#ff8800';
                this.symbol = '※';
                this.description = 'Multi-Shot';
                break;
                
            case 'transform':
                this.color = '#ff00ff';
                this.symbol = '⟲';
                this.description = 'Transform';
                break;
                
            default:
                this.color = '#00ff00';
                this.symbol = '?';
                this.description = 'Unknown';
        }
    }
    
    update(deltaTime) {
        // Move left
        this.x -= this.speed * (deltaTime / 1000);
        
        // Bobbing animation
        this.bobOffset += deltaTime * 0.003;
        
        // Rotation animation
        this.rotationAngle += deltaTime * 0.002;
        
        // Mark for deletion if off screen
        if (this.x < -50) {
            this.markedForDeletion = true;
        }
    }
    
    render(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2 + Math.sin(this.bobOffset) * 3;
        
        ctx.save();
        
        // Translate to center for rotation
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotationAngle);
        
        // Draw outer glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Draw powerup background
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw inner circle
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw symbol
        ctx.fillStyle = this.color;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0);
        
        ctx.restore();
    }
    
    // Apply effect to player
    applyEffect(player) {
        switch (this.type) {
            case 'health':
                player.health = Math.min(player.maxHealth, player.health + 25);
                break;
                
            case 'shield':
                player.shield = Math.min(100, player.shield + 50);
                break;
                
            case 'rapidfire':
                player.addPowerup('rapidfire', 10000); // 10 seconds
                break;
                
            case 'multishot':
                player.addPowerup('multishot', 8000); // 8 seconds
                break;
                
            case 'transform':
                if (player.transformCooldown <= 0) {
                    player.transform();
                }
                break;
        }
    }
}

// Powerup spawning utilities
export const PowerupTypes = {
    HEALTH: 'health',
    SHIELD: 'shield',
    RAPIDFIRE: 'rapidfire',
    MULTISHOT: 'multishot',
    TRANSFORM: 'transform'
};

export const PowerupSpawner = {
    getRandomType() {
        const types = Object.values(PowerupTypes);
        return types[Math.floor(Math.random() * types.length)];
    },
    
    getWeightedType() {
        const weights = {
            health: 30,
            shield: 20,
            rapidfire: 25,
            multishot: 20,
            transform: 5
        };
        
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }
        
        return PowerupTypes.HEALTH;
    }
};

// Default export
export default {
    Powerup,
    PowerupTypes,
    PowerupSpawner
};
