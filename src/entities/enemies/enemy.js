/**
 * Enemy Base Class - Phase 3 Game Object Module
 * 
 * Base class for all enemy types in the game.
 * Provides common functionality for movement, shooting, and rendering.
 */

import Bullet from '@/entities/bullet.js';

export default class Enemy {
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
                
            case 'boss':
                this.width = 80;
                this.height = 60;
                this.maxHealth = 200;
                this.health = this.maxHealth;
                this.speed = 50;
                this.damage = 50;
                this.points = 500;
                this.color = '#ff0000';
                this.shootRate = 1000;
                this.bulletSpeed = 300;
                break;
                
            case 'boss_heavy':
                this.width = 100;
                this.height = 80;
                this.maxHealth = 300;
                this.health = this.maxHealth;
                this.speed = 30;
                this.damage = 75;
                this.points = 750;
                this.color = '#8B0000'; // Dark red
                this.shootRate = 800;
                this.bulletSpeed = 250;
                break;
                
            case 'boss_fast':
                this.width = 70;
                this.height = 50;
                this.maxHealth = 150;
                this.health = this.maxHealth;
                this.speed = 80;
                this.damage = 40;
                this.points = 600;
                this.color = '#FF6600'; // Orange
                this.shootRate = 600;
                this.bulletSpeed = 350;
                break;
                
            case 'boss_sniper':
                this.width = 90;
                this.height = 70;
                this.maxHealth = 250;
                this.health = this.maxHealth;
                this.speed = 40;
                this.damage = 80;
                this.points = 800;
                this.color = '#9400D3'; // Violet
                this.shootRate = 1500;
                this.bulletSpeed = 400;
                break;
                
            default:
                // Default to fighter type
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
                this.type = 'fighter';
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
                if (player) {
                    const dy = player.y - this.y;
                    if (Math.abs(dy) > 5) {
                        this.y += Math.sign(dy) * moveSpeed * 0.3;
                    }
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
                
                const scoutTargetDy = this.targetY - this.y;
                if (Math.abs(scoutTargetDy) > 5) {
                    this.y += Math.sign(scoutTargetDy) * moveSpeed * 0.8;
                }
                break;
                
            case 'boss':
                // Boss movement - slower horizontal movement with vertical tracking
                this.x -= moveSpeed * 0.5; // Move slower than other enemies
                
                // Track player vertically but with limits
                if (player) {
                    const bossTargetY = player.y - this.height / 2;
                    const maxY = this.game.height - this.height;
                    const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY));
                    
                    const bossDy = clampedTargetY - this.y;
                    if (Math.abs(bossDy) > 5) {
                        this.y += Math.sign(bossDy) * moveSpeed * 0.4;
                    }
                }
                break;
                
            case 'boss_heavy':
                // Heavy boss - very slow but steady movement
                this.x -= moveSpeed * 0.3; // Even slower than regular boss
                
                // Minimal vertical movement - stays more in center
                if (player) {
                    const centerY = this.game.height / 2 - this.height / 2;
                    const dy = centerY - this.y;
                    if (Math.abs(dy) > 20) {
                        this.y += Math.sign(dy) * moveSpeed * 0.2;
                    }
                }
                break;
                
            case 'boss_fast':
                // Fast boss - quick horizontal movement with aggressive tracking
                this.x -= moveSpeed * 0.8; // Faster than regular boss
                
                // Aggressive vertical tracking
                if (player) {
                    const bossTargetY = player.y - this.height / 2;
                    const maxY = this.game.height - this.height;
                    const clampedTargetY = Math.max(0, Math.min(maxY, bossTargetY));
                    
                    const bossDy = clampedTargetY - this.y;
                    if (Math.abs(bossDy) > 2) {
                        this.y += Math.sign(bossDy) * moveSpeed * 0.7;
                    }
                }
                break;
                
            case 'boss_sniper':
                // Sniper boss - maintains distance, minimal horizontal movement
                this.x -= moveSpeed * 0.2; // Very slow horizontal movement
                
                // Erratic vertical movement to avoid being predictable
                this.moveTimer += deltaTime;
                if (this.moveTimer > 2000) {
                    this.targetY = Math.random() * (this.game.height - this.height);
                    this.moveTimer = 0;
                }
                
                const sniperTargetDy = this.targetY - this.y;
                if (Math.abs(sniperTargetDy) > 5) {
                    this.y += Math.sign(sniperTargetDy) * moveSpeed * 0.3;
                }
                break;
        }
    }
    
    shoot() {
        const player = this.game.player;
        
        // Only shoot if player exists
        if (!player) return;
        
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
        if (this.health <= 0) {
            this.cleanup();
        }
    }
    
    cleanup() {
        // Base cleanup - can be overridden by subclasses
        // This is a placeholder for any timers or intervals to clean up
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
            case 'boss':
                this.drawBoss(ctx);
                break;
            case 'boss_heavy':
                this.drawBossHeavy(ctx);
                break;
            case 'boss_fast':
                this.drawBossFast(ctx);
                break;
            case 'boss_sniper':
                this.drawBossSniper(ctx);
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
        ctx.fillRect(this.x + 10, this.y + 29, 25, 6);
        
        // Engines
        ctx.fillStyle = '#666';
        ctx.fillRect(this.x + 15, this.y + 2, 4, 4);
        ctx.fillRect(this.x + 15, this.y + 29, 4, 4);
        
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
        // Small, agile ship
        ctx.fillRect(this.x, this.y + 4, this.width - 3, 7);
        
        // Small wings
        ctx.fillRect(this.x + 5, this.y, 10, 3);
        ctx.fillRect(this.x + 5, this.y + 12, 10, 3);
        
        // Pointed nose
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 6, this.y + this.height / 2 - 3);
        ctx.lineTo(this.x - 6, this.y + this.height / 2 + 3);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBoss(ctx) {
        // Main body - large and imposing
        ctx.fillRect(this.x, this.y + 15, this.width - 15, 30);
        
        // Upper and lower sections
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 25, 15);
        ctx.fillRect(this.x + 5, this.y + 40, this.width - 25, 15);
        
        // Central core
        ctx.fillStyle = '#ff6666';
        ctx.fillRect(this.x + 10, this.y + 20, this.width - 35, 20);
        
        // Weapon pods
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + this.width - 20, this.y + 10, 8, 12);
        ctx.fillRect(this.x + this.width - 20, this.y + 38, 8, 12);
        
        // Nose/front section
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 15, this.y + this.height / 2 - 8);
        ctx.lineTo(this.x - 15, this.y + this.height / 2 + 8);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBossHeavy(ctx) {
        // Main body - very large and bulky
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y + 20, this.width - 20, 40);
        
        // Upper and lower armor sections
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 30, 20);
        ctx.fillRect(this.x + 5, this.y + 55, this.width - 30, 20);
        
        // Central core - darker
        ctx.fillStyle = '#4B0000';
        ctx.fillRect(this.x + 15, this.y + 25, this.width - 45, 30);
        
        // Heavy weapon pods
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + this.width - 25, this.y + 15, 12, 20);
        ctx.fillRect(this.x + this.width - 25, this.y + 45, 12, 20);
        
        // Massive nose section
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 20, this.y + this.height / 2 - 12);
        ctx.lineTo(this.x - 20, this.y + this.height / 2 + 12);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBossFast(ctx) {
        // Main body - sleek and angular
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y + 12, this.width - 10, 26);
        
        // Angular wings
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y);
        ctx.lineTo(this.x + 30, this.y + 8);
        ctx.lineTo(this.x + 15, this.y + 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + 50);
        ctx.lineTo(this.x + 30, this.y + 42);
        ctx.lineTo(this.x + 15, this.y + 35);
        ctx.closePath();
        ctx.fill();
        
        // Engine cores
        ctx.fillStyle = '#FF9900';
        ctx.fillRect(this.x + 5, this.y + 18, this.width - 25, 8);
        ctx.fillRect(this.x + 5, this.y + 28, this.width - 25, 8);
        
        // Sharp nose
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 12, this.y + this.height / 2 - 6);
        ctx.lineTo(this.x - 12, this.y + this.height / 2 + 6);
        ctx.closePath();
        ctx.fill();
    }
    
    drawBossSniper(ctx) {
        // Main body - long and streamlined
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y + 18, this.width - 12, 34);
        
        // Sniper barrel/cannon
        ctx.fillStyle = '#6A0DAD';
        ctx.fillRect(this.x - 30, this.y + 28, 35, 14);
        
        // Targeting systems
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x + 10, this.y + 8, 8, 8);
        ctx.fillRect(this.x + 10, this.y + 54, 8, 8);
        
        // Main body sections
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 5, this.y + 5, this.width - 25, 15);
        ctx.fillRect(this.x + 5, this.y + 50, this.width - 25, 15);
        
        // Scope/targeting array
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x + 20, this.y + 30, 6, 10);
        
        // Pointed nose
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 10, this.y + this.height / 2 - 5);
        ctx.lineTo(this.x - 10, this.y + this.height / 2 + 5);
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
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                       healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    }
}
