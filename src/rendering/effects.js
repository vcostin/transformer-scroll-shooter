/**
 * Visual Effects System - ES Module Version
 * Handles particle effects, explosions, and other visual effects
 */

export class Effect {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.markedForDeletion = false;
        this.age = 0;
        this.maxAge = 1000; // Default 1 second
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        if (this.age >= this.maxAge) {
            this.markedForDeletion = true;
        }
    }
    
    render(ctx) {
        // Override in subclasses
    }
}

export class Explosion extends Effect {
    constructor(game, x, y, size = 'medium') {
        super(game, x, y);
        this.size = size;
        this.particles = [];
        
        // Set properties based on size
        switch (size) {
            case 'small':
                this.maxAge = 500;
                this.particleCount = 8;
                this.maxRadius = 20;
                break;
            case 'medium':
                this.maxAge = 800;
                this.particleCount = 12;
                this.maxRadius = 35;
                break;
            case 'large':
                this.maxAge = 1200;
                this.particleCount = 20;
                this.maxRadius = 50;
                break;
        }
        
        this.createParticles();
    }
    
    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            const angle = (Math.PI * 2 * i) / this.particleCount + Math.random() * 0.5;
            const speed = Math.random() * 100 + 50;
            const life = Math.random() * 0.5 + 0.5;
            
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: life,
                maxLife: life,
                size: Math.random() * 4 + 2,
                color: Math.random() > 0.5 ? '#ff4444' : '#ff8844'
            });
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const timeMultiplier = deltaTime / 1000;
        
        this.particles.forEach(particle => {
            particle.x += particle.vx * timeMultiplier;
            particle.y += particle.vy * timeMultiplier;
            particle.life -= timeMultiplier;
            
            // Gravity effect
            particle.vy += 50 * timeMultiplier;
            
            // Friction
            particle.vx *= 0.99;
            particle.vy *= 0.99;
        });
        
        // Remove dead particles
        this.particles = this.particles.filter(p => p.life > 0);
        
        if (this.particles.length === 0) {
            this.markedForDeletion = true;
        }
    }
    
    render(ctx) {
        ctx.save();
        
        this.particles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.fillRect(
                particle.x - particle.size / 2,
                particle.y - particle.size / 2,
                particle.size,
                particle.size
            );
        });
        
        ctx.restore();
    }
}

export class PowerupEffect extends Effect {
    constructor(game, x, y, color = '#00ff00') {
        super(game, x, y);
        this.color = color;
        this.maxAge = 1000;
        this.radius = 0;
        this.maxRadius = 30;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const progress = this.age / this.maxAge;
        this.radius = Math.sin(progress * Math.PI) * this.maxRadius;
    }
    
    render(ctx) {
        ctx.save();
        
        const alpha = 1 - (this.age / this.maxAge);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

export class MuzzleFlash extends Effect {
    constructor(game, x, y, angle = 0) {
        super(game, x, y);
        this.angle = angle;
        this.maxAge = 100;
        this.length = 20;
        this.width = 8;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const progress = this.age / this.maxAge;
        this.length = 20 * (1 - progress);
        this.width = 8 * (1 - progress);
    }
    
    render(ctx) {
        ctx.save();
        
        const alpha = 1 - (this.age / this.maxAge);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffff44';
        
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.fillRect(-this.length / 2, -this.width / 2, this.length, this.width);
        
        ctx.restore();
    }
}

export class TrailEffect extends Effect {
    constructor(game, x, y, color = '#ffffff') {
        super(game, x, y);
        this.color = color;
        this.maxAge = 300;
        this.size = 4;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const progress = this.age / this.maxAge;
        this.size = 4 * (1 - progress);
    }
    
    render(ctx) {
        ctx.save();
        
        const alpha = 1 - (this.age / this.maxAge);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - this.size / 2,
            this.y - this.size / 2,
            this.size,
            this.size
        );
        
        ctx.restore();
    }
}

// Default export
export default {
    Effect,
    Explosion,
    PowerupEffect,
    MuzzleFlash,
    TrailEffect
};
