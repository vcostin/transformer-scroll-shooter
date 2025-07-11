// Options Menu System
class OptionsMenu {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.selectedOption = 0;
        this.options = [
            {
                name: 'Master Volume',
                type: 'slider',
                value: () => this.game.audio.masterVolume,
                setValue: (val) => this.game.audio.setMasterVolume(val),
                min: 0,
                max: 1,
                step: 0.1
            },
            {
                name: 'Sound Effects',
                type: 'slider',
                value: () => this.game.audio.sfxVolume,
                setValue: (val) => this.game.audio.setSfxVolume(val),
                min: 0,
                max: 1,
                step: 0.1
            },
            {
                name: 'Music Volume',
                type: 'slider',
                value: () => this.game.audio.musicVolume,
                setValue: (val) => this.game.audio.setMusicVolume(val),
                min: 0,
                max: 1,
                step: 0.1
            },
            {
                name: 'Audio Enabled',
                type: 'toggle',
                value: () => this.game.audio.enabled,
                setValue: (val) => this.game.audio.setEnabled(val)
            },
            {
                name: 'Show FPS',
                type: 'toggle',
                value: () => this.game.showFPS,
                setValue: (val) => this.game.showFPS = val
            },
            {
                name: 'Difficulty',
                type: 'select',
                value: () => this.game.difficulty,
                setValue: (val) => this.game.difficulty = val,
                options: ['Easy', 'Normal', 'Hard', 'Insane']
            },
            {
                name: 'Show Help',
                type: 'button',
                action: () => this.showHelp()
            },
            {
                name: 'Close Menu',
                type: 'button',
                action: () => this.close()
            }
        ];
        
        this.createMenuElement();
    }
    
    createMenuElement() {
        // Create menu overlay
        this.menuOverlay = document.createElement('div');
        this.menuOverlay.id = 'optionsMenu';
        this.menuOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            font-family: 'Courier New', monospace;
        `;
        
        // Create menu container
        this.menuContainer = document.createElement('div');
        this.menuContainer.style.cssText = `
            background: linear-gradient(135deg, #001122, #003366);
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 30px;
            min-width: 400px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        `;
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'OPTIONS';
        title.style.cssText = `
            color: #00ff00;
            text-align: center;
            margin: 0 0 20px 0;
            text-shadow: 0 0 10px #00ff00;
            font-size: 24px;
        `;
        
        this.menuContainer.appendChild(title);
        
        // Create version display
        const version = document.createElement('div');
        version.textContent = `v${typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '1.1.0'}`;
        version.style.cssText = `
            color: #666;
            text-align: center;
            margin: -10px 0 20px 0;
            font-size: 12px;
        `;
        this.menuContainer.appendChild(version);
        
        // Create options list
        this.optionsList = document.createElement('div');
        this.renderOptions();
        this.menuContainer.appendChild(this.optionsList);
        
        // Create instructions
        const instructions = document.createElement('div');
        instructions.textContent = 'Use ARROW KEYS to navigate, ENTER to select, ESC to close';
        instructions.style.cssText = `
            color: #ffff00;
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            text-shadow: 0 0 5px #ffff00;
        `;
        this.menuContainer.appendChild(instructions);
        
        this.menuOverlay.appendChild(this.menuContainer);
        document.body.appendChild(this.menuOverlay);
    }
    
    renderOptions() {
        this.optionsList.innerHTML = '';
        
        this.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                margin: 5px 0;
                border: 1px solid ${index === this.selectedOption ? '#00ff00' : '#333'};
                background: ${index === this.selectedOption ? 'rgba(0, 255, 0, 0.1)' : 'transparent'};
                color: ${index === this.selectedOption ? '#00ff00' : '#fff'};
                border-radius: 5px;
                cursor: pointer;
            `;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = option.name;
            nameSpan.style.cssText = `
                font-weight: bold;
                text-shadow: 0 0 5px currentColor;
            `;
            
            const valueSpan = document.createElement('span');
            
            if (option.type === 'slider') {
                const value = option.value();
                const percentage = Math.round(value * 100);
                valueSpan.textContent = `${percentage}%`;
                
                // Add visual slider bar
                const sliderBar = document.createElement('div');
                sliderBar.style.cssText = `
                    width: 100px;
                    height: 8px;
                    background: #333;
                    border-radius: 4px;
                    margin-left: 10px;
                    position: relative;
                `;
                
                const sliderFill = document.createElement('div');
                sliderFill.style.cssText = `
                    width: ${percentage}%;
                    height: 100%;
                    background: #00ff00;
                    border-radius: 4px;
                    box-shadow: 0 0 8px #00ff00;
                `;
                
                sliderBar.appendChild(sliderFill);
                valueSpan.appendChild(sliderBar);
            } else if (option.type === 'toggle') {
                valueSpan.textContent = option.value() ? 'ON' : 'OFF';
                valueSpan.style.color = option.value() ? '#00ff00' : '#ff0000';
            } else if (option.type === 'select') {
                valueSpan.textContent = option.value();
            } else if (option.type === 'button') {
                valueSpan.textContent = '►';
            }
            
            optionElement.appendChild(nameSpan);
            optionElement.appendChild(valueSpan);
            this.optionsList.appendChild(optionElement);
            
            // Add click handler
            optionElement.addEventListener('click', () => {
                this.selectedOption = index;
                this.selectOption();
            });
        });
    }
    
    open() {
        this.isOpen = true;
        this.menuOverlay.style.display = 'flex';
        this.game.paused = true;
        this.renderOptions();
    }
    
    close() {
        this.isOpen = false;
        this.menuOverlay.style.display = 'none';
        this.game.paused = false;
        this.saveSettings();
    }
    
    handleInput(key) {
        if (!this.isOpen) return false;
        
        switch(key) {
            case 'ArrowUp':
                this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
                this.renderOptions();
                this.game.audio.playSound('powerup', 0.3);
                return true;
                
            case 'ArrowDown':
                this.selectedOption = (this.selectedOption + 1) % this.options.length;
                this.renderOptions();
                this.game.audio.playSound('powerup', 0.3);
                return true;
                
            case 'ArrowLeft':
                this.adjustOption(-1);
                return true;
                
            case 'ArrowRight':
                this.adjustOption(1);
                return true;
                
            case 'Enter':
                this.selectOption();
                return true;
                
            case 'Escape':
                this.close();
                return true;
        }
        
        return false;
    }
    
    adjustOption(direction) {
        const option = this.options[this.selectedOption];
        
        if (option.type === 'slider') {
            const currentValue = option.value();
            const newValue = Math.max(option.min, Math.min(option.max, currentValue + (direction * option.step)));
            option.setValue(newValue);
            this.renderOptions();
            this.game.audio.playSound('powerup', 0.3);
        } else if (option.type === 'toggle') {
            option.setValue(!option.value());
            this.renderOptions();
            this.game.audio.playSound('transform', 0.5);
        } else if (option.type === 'select') {
            const currentIndex = option.options.indexOf(option.value());
            const newIndex = (currentIndex + direction + option.options.length) % option.options.length;
            option.setValue(option.options[newIndex]);
            this.renderOptions();
            this.game.audio.playSound('transform', 0.5);
        }
    }
    
    selectOption() {
        const option = this.options[this.selectedOption];
        
        if (option.type === 'toggle') {
            option.setValue(!option.value());
            this.renderOptions();
            this.game.audio.playSound('transform', 0.5);
        } else if (option.type === 'button' && option.action) {
            option.action();
            this.game.audio.playSound('powerup', 0.8);
        }
    }
    
    saveSettings() {
        const settings = {
            masterVolume: this.game.audio.masterVolume,
            sfxVolume: this.game.audio.sfxVolume,
            musicVolume: this.game.audio.musicVolume,
            audioEnabled: this.game.audio.enabled,
            showFPS: this.game.showFPS,
            difficulty: this.game.difficulty
        };
        
        localStorage.setItem('transformerShooterSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('transformerShooterSettings') || '{}');
            
            if (settings.masterVolume !== undefined) this.game.audio.setMasterVolume(settings.masterVolume);
            if (settings.sfxVolume !== undefined) this.game.audio.setSfxVolume(settings.sfxVolume);
            if (settings.musicVolume !== undefined) this.game.audio.setMusicVolume(settings.musicVolume);
            if (settings.audioEnabled !== undefined) this.game.audio.setEnabled(settings.audioEnabled);
            if (settings.showFPS !== undefined) this.game.showFPS = settings.showFPS;
            if (settings.difficulty !== undefined) this.game.difficulty = settings.difficulty;
        } catch (e) {
            console.warn('Could not load settings');
        }
    }
    
    showHelp() {
        // Create help overlay
        const helpOverlay = document.createElement('div');
        helpOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1001;
            font-family: 'Courier New', monospace;
        `;
        
        const helpContent = document.createElement('div');
        helpContent.style.cssText = `
            background: linear-gradient(135deg, #001122, #003366);
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 30px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
            color: #fff;
        `;
        
        helpContent.innerHTML = `
            <h2 style="color: #00ff00; text-align: center; margin: 0 0 20px 0; text-shadow: 0 0 10px #00ff00;">
                🎮 TRANSFORMER SCROLL SHOOTER 🎮
            </h2>
            
            <div style="line-height: 1.6;">
                <h3 style="color: #ffff00; margin: 15px 0 10px 0; text-shadow: 0 0 5px #ffff00;">CONTROLS:</h3>
                <p style="margin: 5px 0;">• WASD / Arrow Keys: Move</p>
                <p style="margin: 5px 0;">• SPACE: Shoot</p>
                <p style="margin: 5px 0;">• Q: Transform Vehicle</p>
                <p style="margin: 5px 0;">• R: Restart (when game over)</p>
                <p style="margin: 5px 0;">• ESC: Options Menu</p>
                
                <h3 style="color: #ffff00; margin: 15px 0 10px 0; text-shadow: 0 0 5px #ffff00;">VEHICLE MODES:</h3>
                <p style="margin: 5px 0;">🚗 CAR: Balanced speed and firepower</p>
                <p style="margin: 5px 0;">🤿 SCUBA: Slow but powerful torpedoes</p>
                <p style="margin: 5px 0;">⛵ BOAT: Heavy cannon shots</p>
                <p style="margin: 5px 0;">✈️ PLANE: Fast with rapid laser fire</p>
                
                <h3 style="color: #ffff00; margin: 15px 0 10px 0; text-shadow: 0 0 5px #ffff00;">POWERUPS:</h3>
                <p style="margin: 5px 0;">❤️ Health: Restore health</p>
                <p style="margin: 5px 0;">🛡️ Shield: Temporary protection</p>
                <p style="margin: 5px 0;">⚡ Rapid Fire: Increase fire rate</p>
                <p style="margin: 5px 0;">💥 Multi-Shot: Shoot multiple bullets</p>
                <p style="margin: 5px 0;">🔄 Transform: Instant mode change</p>
                
                <h3 style="color: #ffff00; margin: 15px 0 10px 0; text-shadow: 0 0 5px #ffff00;">SYNERGIES:</h3>
                <p style="margin: 5px 0;">• Rapid Fire + Multi-Shot = Bullet Storm</p>
                <p style="margin: 5px 0;">• Shield + Transform = Adaptive Defense</p>
                
                <p style="color: #00ff00; margin-top: 20px; text-align: center; font-weight: bold;">
                    Good luck, pilot! 🚀
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button id="closeHelpBtn" style="
                    background: #003366;
                    border: 2px solid #00ff00;
                    color: #00ff00;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-family: 'Courier New', monospace;
                    font-size: 14px;
                    cursor: pointer;
                    text-shadow: 0 0 5px #00ff00;
                ">CLOSE</button>
            </div>
        `;
        
        helpOverlay.appendChild(helpContent);
        document.body.appendChild(helpOverlay);
        
        // Close button handler
        const closeBtn = helpContent.querySelector('#closeHelpBtn');
        const closeHelp = () => {
            document.body.removeChild(helpOverlay);
        };
        
        closeBtn.addEventListener('click', closeHelp);
        
        // ESC to close
        const handleKeyDown = (e) => {
            if (e.code === 'Escape') {
                closeHelp();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        // Click outside to close
        helpOverlay.addEventListener('click', (e) => {
            if (e.target === helpOverlay) {
                closeHelp();
            }
        });
    }
}
