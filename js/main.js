// Main game initialization
let game;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    game = new Game();
    
    // Add some flavor text and welcome message
    console.log('🚗 Transformer Scroll Shooter Initialized! 🚁');
    console.log('Transform between Car, Scuba, Boat, and Plane modes!');
    console.log('Collect powerups and discover synergies!');
    
    // Add event listeners for additional controls
    document.addEventListener('keydown', handleSpecialKeys);
    
    // Add touch/mobile support
    addMobileControls();
    
    // Start background music simulation (visual feedback)
    startAudioVisualFeedback();
});

function handleSpecialKeys(event) {
    switch(event.code) {
        case 'KeyP':
            // Toggle pause
            if (game) {
                game.paused = !game.paused;
                console.log(game.paused ? 'Game Paused' : 'Game Resumed');
            }
            break;
            
        case 'KeyM':
            // Toggle mute (placeholder for future audio)
            console.log('Audio toggle (not implemented yet)');
            break;
            
        case 'Escape':
            // ESC key is now handled by the options menu in game.js
            break;
    }
}

function addMobileControls() {
    // Add virtual controls for mobile devices
    if ('ontouchstart' in window) {
        const canvas = document.getElementById('gameCanvas');
        
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouchMove);
        
        // Add virtual buttons
        createVirtualControls();
    }
}

function handleTouch(event) {
    event.preventDefault();
    if (!game) return;
    
    const touch = event.touches[0];
    const rect = event.target.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Simple tap to shoot
    game.player.shoot();
}

function handleTouchMove(event) {
    event.preventDefault();
    if (!game) return;
    
    const touch = event.touches[0];
    const rect = event.target.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Move player towards touch position
    const targetX = (x / rect.width) * game.width;
    const targetY = (y / rect.height) * game.height;
    
    // Simulate key presses based on touch position relative to player
    if (game.player) {
        const dx = targetX - game.player.x;
        const dy = targetY - game.player.y;
        
        // Reset keys
        game.keys = {};
        
        // Set movement keys based on direction
        if (Math.abs(dx) > 10) {
            game.keys[dx > 0 ? 'KeyD' : 'KeyA'] = true;
        }
        if (Math.abs(dy) > 10) {
            game.keys[dy > 0 ? 'KeyS' : 'KeyW'] = true;
        }
    }
}

function createVirtualControls() {
    const container = document.getElementById('gameContainer');
    
    // Create virtual control panel
    const controlPanel = document.createElement('div');
    controlPanel.id = 'virtualControls';
    controlPanel.style.cssText = `
        position: absolute;
        bottom: 10px;
        right: 10px;
        display: flex;
        gap: 10px;
        z-index: 100;
    `;
    
    // Shoot button
    const shootBtn = createButton('SHOOT', () => {
        if (game && game.player) game.player.shoot();
    });
    
    // Transform button
    const transformBtn = createButton('TRANSFORM', () => {
        if (game && game.player) game.player.transform();
    });
    
    controlPanel.appendChild(shootBtn);
    controlPanel.appendChild(transformBtn);
    container.appendChild(controlPanel);
}

function createButton(text, action) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
        background: rgba(0, 255, 255, 0.3);
        border: 1px solid #00ffff;
        color: #00ffff;
        padding: 10px;
        border-radius: 5px;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        cursor: pointer;
        text-shadow: 0 0 5px #00ffff;
    `;
    
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        action();
    });
    
    button.addEventListener('click', action);
    
    return button;
}

function startAudioVisualFeedback() {
    // Simulate audio feedback with visual cues
    // This could be expanded to include actual audio in the future
    
    setInterval(() => {
        if (game && !game.paused && !game.gameOver) {
            // Add subtle screen effects based on game state
            const canvas = game.canvas;
            
            // Add screen shake on explosions
            if (game.effects.some(effect => effect instanceof Explosion)) {
                canvas.style.transform = `translate(${Math.random() * 2 - 1}px, ${Math.random() * 2 - 1}px)`;
                setTimeout(() => {
                    canvas.style.transform = 'translate(0, 0)';
                }, 50);
            }
        }
    }, 100);
}

function showHelp() {
    const helpText = `
🎮 TRANSFORMER SCROLL SHOOTER 🎮

CONTROLS:
• WASD / Arrow Keys: Move
• SPACE: Shoot
• Q: Transform Vehicle
• R: Restart (when game over)
• P: Pause
• ESC: Show this help

VEHICLE MODES:
🚗 CAR: Balanced speed and firepower
🤿 SCUBA: Slow but powerful torpedoes
⛵ BOAT: Heavy cannon shots
✈️ PLANE: Fast with rapid laser fire

POWERUPS:
❤️ Health: Restore health
🛡️ Shield: Temporary protection
⚡ Rapid Fire: Increase fire rate
💥 Multi-Shot: Shoot multiple bullets
🔄 Transform: Instant mode change

SYNERGIES:
• Rapid Fire + Multi-Shot = Bullet Storm
• Shield + Transform = Adaptive Defense

Good luck, pilot! 🚀
    `;
    
    alert(helpText);
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.game = game;
    window.showHelp = showHelp;
}
