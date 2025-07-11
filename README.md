# Transformer Scroll Shooter

[![Deploy to GitHub Pages](https://github.com/vcostin/transformer-scroll-shooter/actions/workflows/deploy.yml/badge.svg)](https://github.com/vcostin/transformer-scroll-shooter/actions/workflows/deploy.yml)
[![Test Suite](https://github.com/vcostin/transformer-scroll-shooter/actions/workflows/test.yml/badge.svg)](https://github.com/vcostin/transformer-scroll-shooter/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/vcostin/transformer-scroll-shooter.svg)](https://github.com/vcostin/transformer-scroll-shooter/releases)

A retro-style side-scrolling shooter game featuring a transforming vehicle with comprehensive testing and modern build system.

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

### Modern Architecture
- **🏗️ Vite Build System**: Modern build tooling with ES modules
- **📦 ES Modules**: Clean, maintainable code structure
- **🧪 Comprehensive Testing**: 190+ tests with Vitest
- **🚀 CI/CD Pipeline**: Automated testing and deployment
- **📊 Coverage Reports**: Built-in coverage tracking
- **🔄 Version Management**: Automated with build-time constants

### Project Structure
```
/
├── index.html              # Main HTML entry point
├── src/                    # Modern ES module source
│   ├── main.js            # Game initialization and setup
│   ├── constants/         # Game configuration and constants
│   ├── entities/          # Game entities (player, enemies, bullets)
│   ├── utils/             # Utility functions (collision, math)
│   └── ui/                # User interface components
├── test/                   # Comprehensive test suite
├── dist/                   # Built production files
└── .github/workflows/      # CI/CD automation
```

### Technologies Used
- **⚡ Vite**: Modern build tool and dev server
- **🧪 Vitest**: Unit testing framework
- **🎨 HTML5 Canvas**: High-performance rendering
- **📱 Responsive Design**: Mobile-first approach
- **🔧 ES2022**: Modern JavaScript features
- **🚀 GitHub Actions**: Automated CI/CD

## 🚀 Getting Started

### Play Online
🎮 **[Play the game live on GitHub Pages!](https://vcostin.github.io/transformer-scroll-shooter/)**

### Local Development
1. **Clone the repository:**
   ```bash
   git clone https://github.com/vcostin/transformer-scroll-shooter.git
   cd transformer-scroll-shooter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Run tests:**
   ```bash
   npm test              # Interactive mode
   npm run test:run      # Single run
   npm run test:coverage # With coverage report
   ```

### Version Management
The game uses modern build-time version injection:

- **📦 Single source**: `package.json` contains version information
- **🔄 Build-time injection**: Version constants injected during build
- **🏷️ npm version**: Use `npm version patch|minor|major` for releases
- **🚀 Auto-deployment**: GitHub Actions handles CI/CD

To release a new version:
```bash
npm version patch    # Bug fixes (1.0.0 → 1.0.1)
npm version minor    # New features (1.0.0 → 1.1.0)
npm version major    # Breaking changes (1.0.0 → 2.0.0)
git push --tags      # Push version tag
```

## 🎨 Background Art System

The game features a 4-layer parallax scrolling system:

1. **Stars**: Twinkling background stars with slow movement
2. **Far Mountains**: Distant mountain silhouettes
3. **Mid-ground Buildings**: City buildings with lit windows
4. **Foreground Structures**: Detailed towers and factories with antennas and smokestacks

Each layer scrolls at different speeds to create depth and the classic retro gaming feel.

## 🔮 Future Enhancements

Potential features for future development:
- **🎵 Audio System**: Sound effects and background music
- **👾 Boss Enemies**: Epic boss battles with unique patterns
- **🌍 Multiple Levels**: Different environments and challenges
- **🏆 Scoring System**: Leaderboards and achievements
- **🚁 Additional Modes**: More transformation modes
- **⚡ Advanced Power-ups**: Complex synergy combinations
- **🌟 Particle Effects**: Enhanced visual effects
- **📱 Mobile UX**: Refined touch controls

## 🧪 Testing & Quality

This project maintains high code quality with comprehensive testing:

- **🧪 190+ Unit Tests**: Extensive test coverage
- **📊 Coverage Reports**: Built-in coverage tracking
- **🔍 GitHub Actions**: Automated testing on every commit
- **🛡️ Quality Gates**: Tests must pass before deployment
- **📋 Test Categories**: Game logic, collision detection, UI, integration

Run tests locally:
```bash
npm test              # Interactive test runner
npm run test:run      # Single test run
npm run test:coverage # Generate coverage report
```

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
- Audio system not yet implemented

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes with tests
4. **Run** the test suite (`npm test`)
5. **Commit** your changes (`git commit -m 'Add amazing feature'`)
6. **Push** to the branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### Development Guidelines
- 🧪 **Write tests** for new features
- 📝 **Follow ES2022** standards
- 🎨 **Maintain code style** consistency
- 📊 **Keep test coverage** above 90%
- 🔄 **Use npm version** for releases

### Ideas for Contributions
- 🎵 Add comprehensive audio system
- 🎨 Create advanced visual effects
- 🤖 Implement boss enemy patterns
- 📱 Enhance mobile touch controls
- 🏆 Add persistent high score system
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
