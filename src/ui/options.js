/**
 * Options Menu System - ES Module Version
 * Handles game settings and configuration UI
 */

export class OptionsMenu {
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
                options: ['Easy', 'Normal', 'Hard', 'Extreme']
            }
        ];
        
        this.overlay = null;
        this.createOverlay();
    }
    
    createOverlay() {
        // Create overlay div for options menu
        this.overlay = document.createElement('div');
        this.overlay.id = 'optionsOverlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: none;
            z-index: 1000;
            font-family: 'Courier New', monospace;
            color: white;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #1a1a2e;
            padding: 30px;
            border-radius: 10px;
            border: 2px solid #00ffff;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
            min-width: 400px;
        `;
        
        content.innerHTML = `
            <h2 style="text-align: center; margin-top: 0; color: #00ffff;">Game Options</h2>
            <div id="optionsContent"></div>
            <div style="text-align: center; margin-top: 20px;">
                <button id="closeOptions" style="
                    background-color: #00ffff;
                    color: #1a1a2e;
                    border: none;
                    padding: 10px 20px;
                    font-family: 'Courier New', monospace;
                    font-size: 16px;
                    cursor: pointer;
                    border-radius: 5px;
                ">Close</button>
            </div>
        `;
        
        this.overlay.appendChild(content);
        document.body.appendChild(this.overlay);
        
        // Setup close button
        document.getElementById('closeOptions').addEventListener('click', () => {
            this.close();
        });
    }
    
    open() {
        this.isOpen = true;
        this.overlay.style.display = 'block';
        this.game.paused = true;
        this.updateDisplay();
    }
    
    close() {
        this.isOpen = false;
        this.overlay.style.display = 'none';
        this.game.paused = false;
        this.saveSettings();
    }
    
    updateDisplay() {
        const content = document.getElementById('optionsContent');
        content.innerHTML = '';
        
        this.options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = `
                margin: 15px 0;
                padding: 10px;
                background-color: ${index === this.selectedOption ? '#333' : 'transparent'};
                border-radius: 5px;
            `;
            
            const label = document.createElement('label');
            label.textContent = option.name;
            label.style.cssText = `
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            `;
            
            optionDiv.appendChild(label);
            
            if (option.type === 'slider') {
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.min = option.min;
                slider.max = option.max;
                slider.step = option.step;
                slider.value = option.value();
                slider.style.cssText = `
                    width: 100%;
                    accent-color: #00ffff;
                `;
                
                const valueDisplay = document.createElement('span');
                valueDisplay.textContent = Math.round(option.value() * 100) + '%';
                valueDisplay.style.cssText = `
                    margin-left: 10px;
                    color: #00ffff;
                `;
                
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    option.setValue(value);
                    valueDisplay.textContent = Math.round(value * 100) + '%';
                });
                
                optionDiv.appendChild(slider);
                optionDiv.appendChild(valueDisplay);
                
            } else if (option.type === 'toggle') {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = option.value();
                checkbox.style.cssText = `
                    accent-color: #00ffff;
                    margin-right: 10px;
                `;
                
                checkbox.addEventListener('change', (e) => {
                    option.setValue(e.target.checked);
                });
                
                optionDiv.appendChild(checkbox);
                
            } else if (option.type === 'select') {
                const select = document.createElement('select');
                select.style.cssText = `
                    width: 100%;
                    background-color: #333;
                    color: white;
                    border: 1px solid #00ffff;
                    padding: 5px;
                    font-family: 'Courier New', monospace;
                `;
                
                option.options.forEach(optionValue => {
                    const optionElement = document.createElement('option');
                    optionElement.value = optionValue;
                    optionElement.textContent = optionValue;
                    optionElement.selected = option.value() === optionValue;
                    select.appendChild(optionElement);
                });
                
                select.addEventListener('change', (e) => {
                    option.setValue(e.target.value);
                });
                
                optionDiv.appendChild(select);
            }
            
            content.appendChild(optionDiv);
        });
    }
    
    handleInput(keyCode) {
        if (!this.isOpen) return false;
        
        switch (keyCode) {
            case 'Escape':
                this.close();
                return true;
                
            case 'ArrowUp':
                this.selectedOption = Math.max(0, this.selectedOption - 1);
                this.updateDisplay();
                return true;
                
            case 'ArrowDown':
                this.selectedOption = Math.min(this.options.length - 1, this.selectedOption + 1);
                this.updateDisplay();
                return true;
                
            case 'Enter':
                // Handle enter key for selected option
                return true;
        }
        
        return false;
    }
    
    saveSettings() {
        const settings = {};
        
        this.options.forEach(option => {
            const key = option.name.toLowerCase().replace(/\s+/g, '');
            settings[key] = option.value();
        });
        
        localStorage.setItem('gameSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('gameSettings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                
                this.options.forEach(option => {
                    const key = option.name.toLowerCase().replace(/\s+/g, '');
                    if (settings.hasOwnProperty(key)) {
                        option.setValue(settings[key]);
                    }
                });
            }
        } catch (e) {
            console.warn('Could not load settings:', e);
        }
    }
}

// Default export
export default OptionsMenu;
