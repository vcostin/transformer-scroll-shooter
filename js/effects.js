// Visual effects system
class Effect {
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

class Explosion extends Effect {
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
            
            this.particles.push({
                x: this.x,
                y: this.y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                color: this.getParticleColor(),
                life: 1.0
            });
        }
    }
    
    getParticleColor() {
        const colors = ['#ff4444', '#ff8844', '#ffff44', '#ffffff', '#ff6600'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const ageRatio = this.age / this.maxAge;
        
        this.particles.forEach(particle => {
            particle.x += particle.velocityX * (deltaTime / 1000);
            particle.y += particle.velocityY * (deltaTime / 1000);
            particle.life = 1.0 - ageRatio;
            particle.size *= 0.998; // Gradually shrink
            
            // Add gravity effect
            particle.velocityY += 50 * (deltaTime / 1000);
            
            // Add air resistance
            particle.velocityX *= 0.98;
            particle.velocityY *= 0.98;
        });
    }
    
    render(ctx) {
        this.particles.forEach(particle => {
            if (particle.life > 0) {
                ctx.save();
                ctx.globalAlpha = particle.life;
                
                // Add glow effect
                ctx.shadowColor = particle.color;
                ctx.shadowBlur = particle.size * 2;
                
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        });
    }
}

class PowerupEffect extends Effect {
    constructor(game, x, y) {
        super(game, x, y);
        this.maxAge = 1000;
        this.rings = [];
        
        // Create expanding rings
        for (let i = 0; i < 3; i++) {
            this.rings.push({
                radius: 0,
                maxRadius: 30 + i * 10,
                color: `hsl(${120 + i * 60}, 70%, 60%)`,
                delay: i * 100
            });
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        this.rings.forEach(ring => {
            if (this.age > ring.delay) {
                const adjustedAge = this.age - ring.delay;
                const progress = adjustedAge / (this.maxAge - ring.delay);
                ring.radius = ring.maxRadius * Math.sin(progress * Math.PI);
            }
        });
    }
    
    render(ctx) {
        const ageRatio = this.age / this.maxAge;
        const alpha = 1.0 - ageRatio;
        
        this.rings.forEach(ring => {
            if (ring.radius > 0) {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = ring.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
        
        // Central sparkle
        if (ageRatio < 0.5) {
            ctx.save();
            ctx.globalAlpha = 1.0 - ageRatio * 2;
            ctx.fillStyle = '#ffffff';
            
            // Draw sparkle lines
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const length = 15 * (1.0 - ageRatio);
                
                ctx.beginPath();
                ctx.moveTo(
                    this.x + Math.cos(angle) * 5,
                    this.y + Math.sin(angle) * 5
                );
                ctx.lineTo(
                    this.x + Math.cos(angle) * length,
                    this.y + Math.sin(angle) * length
                );
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
}

class TransformEffect extends Effect {
    constructor(game, x, y) {
        super(game, x, y);
        this.maxAge = 800;
        this.spirals = [];
        
        // Create transformation spirals
        for (let i = 0; i < 2; i++) {
            this.spirals.push({
                radius: 0,
                angle: i * Math.PI,
                speed: 5 + i * 2,
                color: i === 0 ? '#ff00ff' : '#00ffff'
            });
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const ageRatio = this.age / this.maxAge;
        
        this.spirals.forEach(spiral => {
            spiral.angle += spiral.speed * (deltaTime / 1000);
            spiral.radius = 40 * Math.sin(ageRatio * Math.PI);
        });
    }
    
    render(ctx) {
        const ageRatio = this.age / this.maxAge;
        const alpha = Math.sin(ageRatio * Math.PI);
        
        this.spirals.forEach(spiral => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = spiral.color;
            ctx.lineWidth = 3;
            
            // Draw spiral trail
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const trailAngle = spiral.angle - i * 0.3;
                const trailRadius = spiral.radius * (1 - i * 0.05);
                const x = this.x + Math.cos(trailAngle) * trailRadius;
                const y = this.y + Math.sin(trailAngle) * trailRadius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            
            ctx.restore();
        });
        
        // Central energy core
        if (ageRatio < 0.7) {
            ctx.save();
            ctx.globalAlpha = (0.7 - ageRatio) / 0.7;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 20;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }
}

class MuzzleFlash extends Effect {
    constructor(game, x, y, direction = 0) {
        super(game, x, y);
        this.maxAge = 150; // Very short duration
        this.direction = direction;
        this.length = 15;
        this.width = 8;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        const ageRatio = this.age / this.maxAge;
        this.length *= 0.95;
        this.width *= 0.9;
    }
    
    render(ctx) {
        const ageRatio = this.age / this.maxAge;
        const alpha = 1.0 - ageRatio;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.direction);
        
        // Main flash
        ctx.fillStyle = '#ffff88';
        ctx.fillRect(0, -this.width / 2, this.length, this.width);
        
        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -this.width / 4, this.length * 0.7, this.width / 2);
        
        // Outer glow
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = this.width;
        ctx.fillRect(0, -this.width / 2, this.length, this.width);
        
        ctx.restore();
    }
}

class TrailEffect extends Effect {
    constructor(game, x, y, color = '#ffffff') {
        super(game, x, y);
        this.maxAge = 300;
        this.color = color;
        this.initialSize = 5;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // Move with slight randomness
        this.x -= 50 * (deltaTime / 1000);
        this.y += (Math.random() - 0.5) * 20 * (deltaTime / 1000);
    }
    
    render(ctx) {
        const ageRatio = this.age / this.maxAge;
        const alpha = 1.0 - ageRatio;
        const size = this.initialSize * (1.0 - ageRatio);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = size * 2;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
