import { describe, it, expect, beforeEach, vi } from 'vitest';
import Background from '../src/rendering/background.js';

// Mock canvas context
const mockCanvasContext = {
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn()
    })),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    set fillStyle(value) { this._fillStyle = value; },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(value) { this._strokeStyle = value; },
    get strokeStyle() { return this._strokeStyle; },
    set globalAlpha(value) { this._globalAlpha = value; },
    get globalAlpha() { return this._globalAlpha; },
    set lineWidth(value) { this._lineWidth = value; },
    get lineWidth() { return this._lineWidth; },
    _fillStyle: '',
    _strokeStyle: '',
    _globalAlpha: 1,
    _lineWidth: 1
};

// Mock game object
const mockGame = {
    width: 800,
    height: 600
};

describe('Background', () => {
    let background;

    beforeEach(() => {
        background = new Background(mockGame);
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with game reference', () => {
            expect(background.game).toBe(mockGame);
        });

        it('should create layers array', () => {
            expect(background.layers).toBeDefined();
            expect(Array.isArray(background.layers)).toBe(true);
            expect(background.layers.length).toBe(4);
        });

        it('should create stars array', () => {
            expect(background.stars).toBeDefined();
            expect(Array.isArray(background.stars)).toBe(true);
            expect(background.stars.length).toBe(100);
        });

        it('should call createLayers method', () => {
            const createLayersSpy = vi.spyOn(Background.prototype, 'createLayers');
            new Background(mockGame);
            expect(createLayersSpy).toHaveBeenCalled();
        });

        it('should call createStars method', () => {
            const createStarsSpy = vi.spyOn(Background.prototype, 'createStars');
            new Background(mockGame);
            expect(createStarsSpy).toHaveBeenCalled();
        });
    });

    describe('createLayers', () => {
        it('should create 4 layers with correct properties', () => {
            const layers = background.layers;
            
            expect(layers.length).toBe(4);
            expect(layers[0].name).toBe('farBackground');
            expect(layers[1].name).toBe('midBackground');
            expect(layers[2].name).toBe('nearBackground');
            expect(layers[3].name).toBe('clouds');
        });

        it('should set correct speeds for each layer', () => {
            const layers = background.layers;
            
            expect(layers[0].speed).toBe(20);
            expect(layers[1].speed).toBe(40);
            expect(layers[2].speed).toBe(80);
            expect(layers[3].speed).toBe(15);
        });

        it('should set correct Y positions for each layer', () => {
            const layers = background.layers;
            
            expect(layers[0].y).toBe(mockGame.height * 0.7);
            expect(layers[1].y).toBe(mockGame.height * 0.6);
            expect(layers[2].y).toBe(mockGame.height * 0.8);
            expect(layers[3].y).toBe(mockGame.height * 0.2);
        });

        it('should set correct colors for each layer', () => {
            const layers = background.layers;
            
            expect(layers[0].color).toBe('#1a1a2e');
            expect(layers[1].color).toBe('#16213e');
            expect(layers[2].color).toBe('#0e3460');
            expect(layers[3].color).toBe('#444466');
        });

        it('should generate elements for each layer', () => {
            const layers = background.layers;
            
            layers.forEach(layer => {
                expect(layer.elements).toBeDefined();
                expect(Array.isArray(layer.elements)).toBe(true);
                expect(layer.elements.length).toBeGreaterThan(0);
            });
        });
    });

    describe('createStars', () => {
        it('should create 100 stars', () => {
            expect(background.stars.length).toBe(100);
        });

        it('should create stars with correct properties', () => {
            const star = background.stars[0];
            
            expect(star.x).toBeGreaterThanOrEqual(0);
            expect(star.x).toBeLessThanOrEqual(mockGame.width * 2);
            expect(star.y).toBeGreaterThanOrEqual(0);
            expect(star.y).toBeLessThanOrEqual(mockGame.height * 0.6);
            expect(star.size).toBeGreaterThanOrEqual(1);
            expect(star.size).toBeLessThanOrEqual(3);
            expect(star.speed).toBeGreaterThanOrEqual(5);
            expect(star.speed).toBeLessThanOrEqual(15);
            expect(star.twinkle).toBeGreaterThanOrEqual(0);
            expect(star.twinkle).toBeLessThanOrEqual(Math.PI * 2);
        });

        it('should create stars with random properties', () => {
            const stars = background.stars;
            const xValues = stars.map(s => s.x);
            const yValues = stars.map(s => s.y);
            
            // Check that not all stars have the same position
            expect(new Set(xValues).size).toBeGreaterThan(1);
            expect(new Set(yValues).size).toBeGreaterThan(1);
        });
    });

    describe('generateMountains', () => {
        it('should generate mountains with correct properties', () => {
            const mountains = background.generateMountains(5, 0.3);
            
            expect(mountains.length).toBe(5);
            mountains.forEach(mountain => {
                expect(mountain.x).toBeDefined();
                expect(mountain.width).toBeDefined();
                expect(mountain.height).toBeDefined();
                expect(mountain.opacity).toBe(0.3);
            });
        });

        it('should generate mountains with random dimensions', () => {
            const mountains = background.generateMountains(20, 0.5);
            const heights = mountains.map(m => m.height);
            
            // Heights should vary due to Math.random() * 100 + 50
            expect(new Set(heights).size).toBeGreaterThan(1);
        });
    });

    describe('generateBuildings', () => {
        it('should generate buildings with correct properties', () => {
            const buildings = background.generateBuildings(5, 0.4);
            
            expect(buildings.length).toBe(5);
            buildings.forEach(building => {
                expect(building.x).toBeDefined();
                expect(building.width).toBeDefined();
                expect(building.height).toBeDefined();
                expect(building.opacity).toBe(0.4);
                expect(building.windows).toBeDefined();
                expect(Array.isArray(building.windows)).toBe(true);
            });
        });

        it('should generate buildings with windows', () => {
            const buildings = background.generateBuildings(3, 0.5);
            
            buildings.forEach(building => {
                expect(building.windows.length).toBeGreaterThanOrEqual(4);
                expect(building.windows.length).toBeLessThanOrEqual(12);
                
                building.windows.forEach(window => {
                    expect(window.x).toBeDefined();
                    expect(window.y).toBeDefined();
                    expect(window.width).toBe(0.05);
                    expect(window.height).toBe(0.08);
                    expect(typeof window.lit).toBe('boolean');
                });
            });
        });
    });

    describe('generateStructures', () => {
        it('should generate structures with correct properties', () => {
            const structures = background.generateStructures(5, 0.6);
            
            expect(structures.length).toBe(5);
            structures.forEach(structure => {
                expect(structure.x).toBeDefined();
                expect(structure.width).toBeDefined();
                expect(structure.height).toBeDefined();
                expect(structure.opacity).toBe(0.6);
                expect(structure.details).toBeDefined();
            });
        });

        it('should generate structures with details', () => {
            const structures = background.generateStructures(3, 0.7);
            
            structures.forEach(structure => {
                expect(typeof structure.details.antennas).toBe('boolean');
                expect(typeof structure.details.lights).toBe('boolean');
            });
        });
    });

    describe('generateClouds', () => {
        it('should generate clouds with correct properties', () => {
            const clouds = background.generateClouds(5);
            
            expect(clouds.length).toBe(5);
            clouds.forEach(cloud => {
                expect(cloud.x).toBeDefined();
                expect(cloud.y).toBeDefined();
                expect(cloud.width).toBeDefined();
                expect(cloud.height).toBeDefined();
                expect(cloud.opacity).toBeGreaterThanOrEqual(0.1);
                expect(cloud.opacity).toBeLessThanOrEqual(0.4);
            });
        });

        it('should generate clouds within height bounds', () => {
            const clouds = background.generateClouds(10);
            
            clouds.forEach(cloud => {
                expect(cloud.y).toBeGreaterThanOrEqual(0);
                expect(cloud.y).toBeLessThanOrEqual(mockGame.height * 0.3);
            });
        });
    });

    describe('generateWindows', () => {
        it('should generate windows with correct properties', () => {
            const windows = background.generateWindows();
            
            expect(windows.length).toBeGreaterThanOrEqual(4);
            expect(windows.length).toBeLessThanOrEqual(12);
            
            windows.forEach(window => {
                expect(window.x).toBeGreaterThanOrEqual(0.1);
                expect(window.x).toBeLessThanOrEqual(0.9);
                expect(window.y).toBeGreaterThanOrEqual(0.1);
                expect(window.y).toBeLessThanOrEqual(0.9);
                expect(window.width).toBe(0.05);
                expect(window.height).toBe(0.08);
                expect(typeof window.lit).toBe('boolean');
            });
        });
    });

    describe('generateStructureDetails', () => {
        it('should generate structure details with correct properties', () => {
            const details = background.generateStructureDetails();
            
            expect(typeof details.antennas).toBe('boolean');
            expect(typeof details.lights).toBe('boolean');
        });
    });

    describe('update', () => {
        it('should update layer element positions', () => {
            const initialX = background.layers[0].elements[0].x;
            
            background.update(1000);
            
            expect(background.layers[0].elements[0].x).toBeLessThan(initialX);
        });

        it('should update star positions and twinkle', () => {
            const initialX = background.stars[0].x;
            const initialTwinkle = background.stars[0].twinkle;
            
            background.update(1000);
            
            expect(background.stars[0].x).toBeLessThan(initialX);
            expect(background.stars[0].twinkle).toBeGreaterThan(initialTwinkle);
        });

        it('should wrap around elements when they go off screen', () => {
            // Set element to far left
            background.layers[0].elements[0].x = -200;
            background.layers[0].elements[0].width = 100;
            
            background.update(1000);
            
            expect(background.layers[0].elements[0].x).toBeGreaterThan(mockGame.width);
        });

        it('should wrap around stars when they go off screen', () => {
            // Set star to far left
            background.stars[0].x = -10;
            
            background.update(1000);
            
            expect(background.stars[0].x).toBeGreaterThan(mockGame.width);
        });

        it('should handle zero deltaTime', () => {
            const initialX = background.layers[0].elements[0].x;
            
            background.update(0);
            
            expect(background.layers[0].elements[0].x).toBe(initialX);
        });
    });

    describe('render', () => {
        it('should create and fill gradient background', () => {
            const gradient = { addColorStop: vi.fn() };
            mockCanvasContext.createLinearGradient.mockReturnValue(gradient);
            
            background.render(mockCanvasContext);
            
            expect(mockCanvasContext.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, mockGame.height);
            expect(gradient.addColorStop).toHaveBeenCalledWith(0, '#0a0a1a');
            expect(gradient.addColorStop).toHaveBeenCalledWith(0.7, '#1a1a2e');
            expect(gradient.addColorStop).toHaveBeenCalledWith(1, '#2a2a3e');
            expect(mockCanvasContext.fillRect).toHaveBeenCalledWith(0, 0, mockGame.width, mockGame.height);
        });

        it('should call renderStars and renderLayer methods', () => {
            const renderStarsSpy = vi.spyOn(background, 'renderStars');
            const renderLayerSpy = vi.spyOn(background, 'renderLayer');
            
            background.render(mockCanvasContext);
            
            expect(renderStarsSpy).toHaveBeenCalledWith(mockCanvasContext);
            expect(renderLayerSpy).toHaveBeenCalledTimes(background.layers.length);
        });
    });

    describe('renderStars', () => {
        it('should render all stars with twinkling effect', () => {
            background.renderStars(mockCanvasContext);
            
            expect(mockCanvasContext.save).toHaveBeenCalled();
            expect(mockCanvasContext.restore).toHaveBeenCalled();
            expect(mockCanvasContext.fillRect).toHaveBeenCalledTimes(background.stars.length);
        });

        it('should set white color for stars', () => {
            background.renderStars(mockCanvasContext);
            
            expect(mockCanvasContext.fillStyle).toBe('#ffffff');
        });
    });

    describe('renderLayer', () => {
        it('should render different layer types correctly', () => {
            const renderMountainSpy = vi.spyOn(background, 'renderMountain');
            const renderBuildingSpy = vi.spyOn(background, 'renderBuilding');
            const renderStructureSpy = vi.spyOn(background, 'renderStructure');
            const renderCloudSpy = vi.spyOn(background, 'renderCloud');
            
            background.layers.forEach(layer => {
                background.renderLayer(mockCanvasContext, layer);
            });
            
            expect(renderMountainSpy).toHaveBeenCalled();
            expect(renderBuildingSpy).toHaveBeenCalled();
            expect(renderStructureSpy).toHaveBeenCalled();
            expect(renderCloudSpy).toHaveBeenCalled();
        });

        it('should save and restore canvas context', () => {
            background.renderLayer(mockCanvasContext, background.layers[0]);
            
            expect(mockCanvasContext.save).toHaveBeenCalled();
            expect(mockCanvasContext.restore).toHaveBeenCalled();
        });
    });

    describe('renderMountain', () => {
        it('should render mountain with correct properties', () => {
            const mountain = { x: 100, width: 200, height: 150, opacity: 0.5 };
            const layer = { y: 400, color: '#1a1a2e' };
            
            background.renderMountain(mockCanvasContext, mountain, layer);
            
            expect(mockCanvasContext.globalAlpha).toBe(0.5);
            expect(mockCanvasContext.fillStyle).toBe('#1a1a2e');
            expect(mockCanvasContext.fillRect).toHaveBeenCalledWith(100, 400, 200, 150);
        });
    });

    describe('renderBuilding', () => {
        it('should render building with windows', () => {
            const building = {
                x: 100,
                width: 80,
                height: 120,
                opacity: 0.6,
                windows: [
                    { x: 0.2, y: 0.3, width: 0.05, height: 0.08, lit: true },
                    { x: 0.6, y: 0.3, width: 0.05, height: 0.08, lit: false }
                ]
            };
            const layer = { y: 300, color: '#16213e' };
            
            background.renderBuilding(mockCanvasContext, building, layer);
            
            expect(mockCanvasContext.globalAlpha).toBe(0.6);
            expect(mockCanvasContext.fillRect).toHaveBeenCalledWith(100, 300, 80, 120);
        });

        it('should render lit windows', () => {
            const building = {
                x: 100,
                width: 80,
                height: 120,
                opacity: 0.6,
                windows: [
                    { x: 0.2, y: 0.3, width: 0.05, height: 0.08, lit: true }
                ]
            };
            const layer = { y: 300, color: '#2a2a3e' };
            
            background.renderBuilding(mockCanvasContext, building, layer);
            
            expect(mockCanvasContext.fillStyle).toBe('#ffff88');
            expect(mockCanvasContext.fillRect).toHaveBeenCalledWith(
                100 + 0.2 * 80, 300 + 0.3 * 120, 0.05 * 80, 0.08 * 120
            );
        });
    });

    describe('renderStructure', () => {
        it('should render structure with details', () => {
            const structure = {
                x: 150,
                width: 60,
                height: 100,
                opacity: 0.7,
                details: { antennas: true, lights: true }
            };
            const layer = { y: 200, color: '#0e3460' };
            
            background.renderStructure(mockCanvasContext, structure, layer);
            
            expect(mockCanvasContext.globalAlpha).toBe(0.7);
            expect(mockCanvasContext.fillRect).toHaveBeenCalledWith(150, 200, 60, 100);
        });

        it('should render antennas when present', () => {
            const structure = {
                x: 150,
                width: 60,
                height: 100,
                opacity: 0.7,
                details: { antennas: true, lights: false }
            };
            const layer = { y: 200, color: '#3a3a4e' };
            
            background.renderStructure(mockCanvasContext, structure, layer);
            
            expect(mockCanvasContext.strokeStyle).toBe('#666');
            expect(mockCanvasContext.lineWidth).toBe(2);
            expect(mockCanvasContext.beginPath).toHaveBeenCalled();
            expect(mockCanvasContext.moveTo).toHaveBeenCalledWith(180, 200);
            expect(mockCanvasContext.lineTo).toHaveBeenCalledWith(180, 180);
            expect(mockCanvasContext.stroke).toHaveBeenCalled();
        });

        it('should render lights when present', () => {
            const structure = {
                x: 150,
                width: 60,
                height: 100,
                opacity: 0.7,
                details: { antennas: false, lights: true }
            };
            const layer = { y: 200, color: '#3a3a4e' };
            
            background.renderStructure(mockCanvasContext, structure, layer);
            
            expect(mockCanvasContext.fillStyle).toBe('#ff4444');
            expect(mockCanvasContext.fillRect).toHaveBeenCalledWith(178, 182, 4, 4);
        });
    });

    describe('renderCloud', () => {
        it('should render cloud with correct shape', () => {
            const cloud = {
                x: 200,
                y: 50,
                width: 90,
                height: 30,
                opacity: 0.2
            };
            const layer = { color: '#444466' };
            
            background.renderCloud(mockCanvasContext, cloud, layer);
            
            expect(mockCanvasContext.globalAlpha).toBe(0.2);
            expect(mockCanvasContext.fillStyle).toBe('#444466');
            expect(mockCanvasContext.beginPath).toHaveBeenCalled();
            expect(mockCanvasContext.arc).toHaveBeenCalledTimes(3);
            expect(mockCanvasContext.fill).toHaveBeenCalled();
        });

        it('should render cloud with three overlapping circles', () => {
            const cloud = {
                x: 200,
                y: 50,
                width: 90,
                height: 30,
                opacity: 0.2
            };
            const layer = { color: '#444466' };
            
            background.renderCloud(mockCanvasContext, cloud, layer);
            
            expect(mockCanvasContext.arc).toHaveBeenCalledWith(200, 50, 30, 0, Math.PI * 2);
            expect(mockCanvasContext.arc).toHaveBeenCalledWith(230, 50, 30, 0, Math.PI * 2);
            expect(mockCanvasContext.arc).toHaveBeenCalledWith(260, 50, 30, 0, Math.PI * 2);
        });
    });

    describe('edge cases', () => {
        it('should handle empty layers gracefully', () => {
            background.layers = [];
            
            expect(() => background.update(1000)).not.toThrow();
            expect(() => background.render(mockCanvasContext)).not.toThrow();
        });

        it('should handle empty stars gracefully', () => {
            background.stars = [];
            
            expect(() => background.update(1000)).not.toThrow();
            expect(() => background.render(mockCanvasContext)).not.toThrow();
        });

        it('should handle negative deltaTime', () => {
            const initialX = background.layers[0].elements[0].x;
            
            background.update(-1000);
            
            expect(background.layers[0].elements[0].x).toBeGreaterThan(initialX);
        });
    });
});
