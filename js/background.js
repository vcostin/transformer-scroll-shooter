// Parallax background system for old-school feel
class Background {
    constructor(game) {
        this.game = game;
        this.layers = [];
        this.stars = [];
        
        this.createLayers();
        this.createStars();
    }
    
    createLayers() {
        // Layer 1: Far mountains/cityscape
        this.layers.push({
            name: 'farBackground',
            speed: 20,
            color: '#1a1a2e',
            elements: this.generateMountains(5, 0.3),
            y: this.game.height * 0.7
        });
        
        // Layer 2: Mid-ground buildings
        this.layers.push({
            name: 'midBackground',
            speed: 40,
            color: '#16213e',
            elements: this.generateBuildings(8, 0.5),
            y: this.game.height * 0.6
        });
        
        // Layer 3: Foreground structures
        this.layers.push({
            name: 'nearBackground',
            speed: 80,
            color: '#0e3460',
            elements: this.generateStructures(12, 0.8),
            y: this.game.height * 0.8
        });
        
        // Layer 4: Clouds
        this.layers.push({
            name: 'clouds',
            speed: 15,
            color: '#444466',
            elements: this.generateClouds(6),
            y: this.game.height * 0.2
        });
    }
    
    createStars() {
        // Create twinkling stars
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.game.width * 2,
                y: Math.random() * this.game.height * 0.6,
                size: Math.random() * 2 + 1,
                twinkle: Math.random() * Math.PI * 2,
                speed: Math.random() * 10 + 5
            });
        }
    }
    
    generateMountains(count, opacity) {
        const mountains = [];
        const segmentWidth = this.game.width * 2 / count;
        
        for (let i = 0; i < count; i++) {
            mountains.push({
                x: i * segmentWidth,
                width: segmentWidth + 50,
                height: Math.random() * 100 + 50,
                opacity: opacity
            });
        }
        
        return mountains;
    }
    
    generateBuildings(count, opacity) {
        const buildings = [];
        const segmentWidth = this.game.width * 2 / count;
        
        for (let i = 0; i < count; i++) {
            buildings.push({
                x: i * segmentWidth + Math.random() * 20,
                width: Math.random() * 40 + 30,
                height: Math.random() * 120 + 80,
                opacity: opacity,
                windows: this.generateWindows()
            });
        }
        
        return buildings;
    }
    
    generateStructures(count, opacity) {
        const structures = [];
        const segmentWidth = this.game.width * 2 / count;
        
        for (let i = 0; i < count; i++) {
            structures.push({
                x: i * segmentWidth + Math.random() * 30,
                width: Math.random() * 60 + 40,
                height: Math.random() * 80 + 100,
                opacity: opacity,
                type: Math.random() > 0.5 ? 'tower' : 'factory',
                details: this.generateStructureDetails()
            });
        }
        
        return structures;
    }
    
    generateClouds(count) {
        const clouds = [];
        
        for (let i = 0; i < count; i++) {
            clouds.push({
                x: Math.random() * this.game.width * 2,
                y: Math.random() * this.game.height * 0.4 + 50,
                width: Math.random() * 80 + 60,
                height: Math.random() * 30 + 20,
                opacity: Math.random() * 0.3 + 0.1,
                puffs: Math.floor(Math.random() * 3) + 3
            });
        }
        
        return clouds;
    }
    
    generateWindows() {
        const windows = [];
        const windowCount = Math.floor(Math.random() * 8) + 4;
        
        for (let i = 0; i < windowCount; i++) {
            windows.push({
                x: Math.random() * 0.8 + 0.1,
                y: Math.random() * 0.8 + 0.1,
                lit: Math.random() > 0.6
            });
        }
        
        return windows;
    }
    
    generateStructureDetails() {
        return {
            antennas: Math.floor(Math.random() * 3),
            pipes: Math.floor(Math.random() * 4) + 1,
            lights: Math.random() > 0.5
        };
    }
    
    update(deltaTime) {
        const timeMultiplier = deltaTime / 1000;
        
        // Update layer positions
        this.layers.forEach(layer => {
            layer.elements.forEach(element => {
                element.x -= layer.speed * timeMultiplier;
                
                // Wrap around
                if (element.x + (element.width || 100) < 0) {
                    element.x = this.game.width + Math.random() * 200;
                }
            });
        });
        
        // Update stars
        this.stars.forEach(star => {
            star.x -= star.speed * timeMultiplier;
            star.twinkle += deltaTime * 0.01;
            
            // Wrap around
            if (star.x < 0) {
                star.x = this.game.width + Math.random() * 100;
            }
        });
    }
    
    render(ctx) {
        // Clear with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.game.height);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(0.7, '#1a1a2e');
        gradient.addColorStop(1, '#2a2a3e');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.game.width, this.game.height);
        
        // Render stars
        this.renderStars(ctx);
        
        // Render layers from back to front
        this.layers.forEach(layer => {
            this.renderLayer(ctx, layer);
        });
    }
    
    renderStars(ctx) {
        ctx.fillStyle = '#ffffff';
        
        this.stars.forEach(star => {
            const alpha = (Math.sin(star.twinkle) + 1) * 0.5;
            ctx.globalAlpha = alpha;
            
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.globalAlpha = 1;
    }
    
    renderLayer(ctx, layer) {
        ctx.globalAlpha = 1;
        
        layer.elements.forEach(element => {
            ctx.globalAlpha = element.opacity;
            
            switch (layer.name) {
                case 'farBackground':
                    this.renderMountain(ctx, element, layer);
                    break;
                case 'midBackground':
                    this.renderBuilding(ctx, element, layer);
                    break;
                case 'nearBackground':
                    this.renderStructure(ctx, element, layer);
                    break;
                case 'clouds':
                    this.renderCloud(ctx, element, layer);
                    break;
            }
        });
        
        ctx.globalAlpha = 1;
    }
    
    renderMountain(ctx, mountain, layer) {
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.moveTo(mountain.x, layer.y);
        ctx.lineTo(mountain.x + mountain.width / 2, layer.y - mountain.height);
        ctx.lineTo(mountain.x + mountain.width, layer.y);
        ctx.lineTo(mountain.x + mountain.width, this.game.height);
        ctx.lineTo(mountain.x, this.game.height);
        ctx.closePath();
        ctx.fill();
    }
    
    renderBuilding(ctx, building, layer) {
        const x = building.x;
        const y = layer.y - building.height;
        
        // Main building
        ctx.fillStyle = layer.color;
        ctx.fillRect(x, y, building.width, building.height);
        
        // Windows
        if (building.windows) {
            building.windows.forEach(window => {
                ctx.fillStyle = window.lit ? '#ffff88' : '#333355';
                const winX = x + window.x * building.width;
                const winY = y + window.y * building.height;
                ctx.fillRect(winX, winY, 4, 6);
            });
        }
        
        // Building outline
        ctx.strokeStyle = '#555577';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, building.width, building.height);
    }
    
    renderStructure(ctx, structure, layer) {
        const x = structure.x;
        const y = layer.y - structure.height;
        
        ctx.fillStyle = layer.color;
        
        if (structure.type === 'tower') {
            // Tower structure
            ctx.fillRect(x, y, structure.width, structure.height);
            
            // Tower top
            ctx.fillRect(x - 5, y - 10, structure.width + 10, 10);
            
            // Antennas
            if (structure.details.antennas > 0) {
                ctx.strokeStyle = '#666688';
                ctx.lineWidth = 2;
                for (let i = 0; i < structure.details.antennas; i++) {
                    const antennaX = x + (i + 1) * structure.width / (structure.details.antennas + 1);
                    ctx.beginPath();
                    ctx.moveTo(antennaX, y - 10);
                    ctx.lineTo(antennaX, y - 30);
                    ctx.stroke();
                }
            }
        } else {
            // Factory structure
            ctx.fillRect(x, y, structure.width, structure.height);
            
            // Smokestacks
            for (let i = 0; i < structure.details.pipes; i++) {
                const pipeX = x + (i + 1) * structure.width / (structure.details.pipes + 1);
                ctx.fillRect(pipeX - 3, y - 20, 6, 20);
                
                // Smoke effect
                ctx.fillStyle = '#666677';
                ctx.globalAlpha = 0.3;
                ctx.fillRect(pipeX - 2, y - 40, 4, 20);
                ctx.globalAlpha = structure.opacity;
                ctx.fillStyle = layer.color;
            }
        }
        
        // Warning lights
        if (structure.details.lights) {
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(x + structure.width / 2, y - 5, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderCloud(ctx, cloud, layer) {
        ctx.fillStyle = layer.color;
        
        // Draw cloud as multiple overlapping circles
        for (let i = 0; i < cloud.puffs; i++) {
            const puffX = cloud.x + (i * cloud.width / cloud.puffs);
            const puffY = cloud.y + Math.sin(i) * 5;
            const puffSize = cloud.height / 2 + Math.sin(i * 2) * 5;
            
            ctx.beginPath();
            ctx.arc(puffX, puffY, puffSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
