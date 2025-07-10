// Power-up system
class Powerup {
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
        ctx.font = '14px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0);
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Draw description when close to player
        const player = this.game.player;
        const distance = Math.sqrt(
            Math.pow(player.x - this.x, 2) + 
            Math.pow(player.y - this.y, 2)
        );
        
        if (distance < 80) {
            ctx.fillStyle = this.color;
            ctx.font = '10px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(this.description, centerX, centerY - this.height);
        }
    }
}

// Synergy system for powerups
class PowerupSynergy {
    static checkSynergies(player) {
        const activePowerups = player.activePowerups.map(p => p.type);
        const synergies = [];
        
        // Rapid Fire + Multi-Shot = Bullet Storm
        if (activePowerups.includes('rapidfire') && activePowerups.includes('multishot')) {
            synergies.push({
                name: 'Bullet Storm',
                effect: 'Even faster firing rate with spread shots',
                bonus: () => {
                    player.currentShootRate *= 0.5; // Even faster
                }
            });
        }
        
        // Shield + Transform = Adaptive Defense
        if (player.shield > 0 && activePowerups.includes('transform')) {
            synergies.push({
                name: 'Adaptive Defense',
                effect: 'Transform grants temporary invulnerability',
                bonus: () => {
                    // Implemented in transform method
                }
            });
        }
        
        return synergies;
    }
    
    static applySynergies(player) {
        const synergies = this.checkSynergies(player);
        synergies.forEach(synergy => {
            if (synergy.bonus) {
                synergy.bonus();
            }
        });
        return synergies;
    }
}
