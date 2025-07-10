# Transformer Scroll Shooter

[![Deploy to GitHub Pages](https://github.com/vcostin/transformer-scroll-shooter/actions/workflows/deploy.yml/badge.svg)](https://github.com/vcostin/transformer-scroll-shooter/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/vcostin/transformer-scroll-shooter.svg)](https://github.com/vcostin/transformer-scroll-shooter/releases)
[![GitHub stars](https://img.shields.io/github/stars/vcostin/transformer-scroll-shooter.svg)](https://github.com/vcostin/transformer-scroll-shooter/stargazers)

A retro-style side-scrolling shooter game featuring a transforming vehicle with old-school parallax backgrounds.

🎮 **[▶️ PLAY NOW](https://vcostin.github.io/transformer-scroll-shooter/)** 🎮

## 🎮 Game Features

### Core Gameplay
- **Transforming Vehicle**: Switch between 4 different modes (Car, Scuba, Boat, Plane)
- **Scroll Shooter Mechanics**: Classic side-scrolling action with enemies and projectiles
- **Power-up System**: Collect offensive and defensive power-ups with synergy effects
- **Parallax Backgrounds**: Multi-layered scrolling backgrounds for that retro feel

### Vehicle Modes
Each transformation mode has unique characteristics:

1. **🚗 Car Mode**
   - Balanced speed and firepower
   - Standard yellow bullets
   - Good all-around performance

2. **🤿 Scuba Mode**
   - Slower movement but powerful
   - Blue torpedo projectiles
   - High damage output

3. **⛵ Boat Mode**
   - Moderate speed
   - Orange cannon balls
   - Heavy hitting shots

4. **✈️ Plane Mode**
   - Fastest movement
   - Purple laser beams
   - Rapid fire capability

### Power-up System
- **❤️ Health**: Restore 25 HP
- **🛡️ Shield**: Temporary energy protection
- **⚡ Rapid Fire**: Dramatically increase fire rate (10s)
- **💥 Multi-Shot**: Fire 3 bullets simultaneously (10s)
- **🔄 Transform**: Instant transformation to next mode

### Synergy Effects
Power-ups can combine for enhanced effects:
- **Bullet Storm**: Rapid Fire + Multi-Shot = Even faster firing with spread
- **Adaptive Defense**: Shield + Transform = Enhanced protection during transformation

## 🎯 Controls

### Keyboard
- **WASD** or **Arrow Keys**: Move vehicle
- **SPACE**: Shoot
- **Q**: Transform to next mode
- **R**: Restart game (when game over)
- **P**: Pause/Unpause
- **ESC**: Show help

### Mobile (Touch)
- **Tap screen**: Shoot
- **Drag**: Move vehicle
- **Virtual buttons**: Transform and Shoot

## 🛠️ Technical Details

### File Structure
```
/
├── index.html          # Main HTML file
└── js/
    ├── main.js          # Game initialization and controls
    ├── game.js          # Core game engine
    ├── player.js        # Player/transformer vehicle logic
    ├── enemies.js       # Enemy AI and bullet system
    ├── powerups.js      # Power-up system with synergies
    ├── background.js    # Parallax background system
    └── effects.js       # Visual effects and animations
```

### Technologies Used
- **HTML5 Canvas** for rendering
- **Vanilla JavaScript** for game logic
- **CSS3** for styling and UI
- **Responsive design** for mobile support

## 🚀 Getting Started

### Play Online
🎮 **[Play the game live on GitHub Pages!](https://vcostin.github.io/transformer-scroll-shooter/)**

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/vcostin/transformer-scroll-shooter.git
   cd transformer-scroll-shooter
   ```

2. Open `index.html` in a modern web browser, or use a local server:
   ```bash
   # Option 1: Simple HTTP server
   npx http-server . -p 8080 -o
   
   # Option 2: Live reload server
   npx live-server --port=8080 --open=/
   ```

3. Start playing immediately - no build process required!

## 🎨 Background Art System

The game features a 4-layer parallax scrolling system:

1. **Stars**: Twinkling background stars with slow movement
2. **Far Mountains**: Distant mountain silhouettes
3. **Mid-ground Buildings**: City buildings with lit windows
4. **Foreground Structures**: Detailed towers and factories with antennas and smokestacks

Each layer scrolls at different speeds to create depth and the classic retro gaming feel.

## 🔮 Future Enhancements

Potential features for future development:
- **Sound effects and music**
- **Boss enemies**
- **Multiple levels with different environments**
- **Local high score system**
- **Additional vehicle modes**
- **More complex synergy combinations**
- **Particle effects optimization**
- **Power-up upgrade trees**

## 🎯 Game Design Philosophy

This game captures the essence of classic arcade shooters while adding modern touches:
- **Simple controls** but **deep mechanics**
- **Visual feedback** for all actions
- **Progression through power-ups** rather than just score
- **Strategic transformation** timing
- **Retro aesthetics** with **smooth animations**

## 🐛 Known Issues

- Canvas performance may vary on older devices
- Touch controls could use refinement
- No audio system implemented yet

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Ideas for Contributions
- 🎵 Add sound effects and background music
- 🎨 Create new visual effects and animations
- 🤖 Implement boss enemies
- 📱 Improve mobile touch controls
- 🏆 Add local high score system
- 🌍 Create new background environments

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **Use** the code freely for personal or commercial projects
- ✅ **Modify** and distribute the code
- ✅ **Create** derivative works
- ❗ **Include** the original copyright notice

## 🙏 Acknowledgments

- Inspired by classic arcade shooters like R-Type and Gradius
- Built with modern web technologies for nostalgic gameplay
- Special thanks to the retro gaming community for inspiration

## 📊 Project Stats

![GitHub repo size](https://img.shields.io/github/repo-size/vcostin/transformer-scroll-shooter)
![GitHub code size](https://img.shields.io/github/languages/code-size/vcostin/transformer-scroll-shooter)
![GitHub last commit](https://img.shields.io/github/last-commit/vcostin/transformer-scroll-shooter)

---

**Happy gaming! Transform and conquer! 🚁🚗⛵🤿**
