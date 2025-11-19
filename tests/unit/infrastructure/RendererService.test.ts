import { RendererService } from '@infrastructure/rendering/RendererService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import { TicTacToeEngine } from '@adapters/plugins/tic-tac-toe/TicTacToeEngine';
import { GameState, Player } from '@domain/models';
import { BoardRenderData } from '@domain/interfaces';
import { GameNotFoundError } from '@domain/errors';

describe('RendererService', () => {
  let rendererService: RendererService;
  let pluginRegistry: PluginRegistry;
  let gameRepository: InMemoryGameRepository;
  let ticTacToeEngine: TicTacToeEngine;

  beforeEach(() => {
    pluginRegistry = new PluginRegistry();
    gameRepository = new InMemoryGameRepository();
    ticTacToeEngine = new TicTacToeEngine();
    pluginRegistry.register(ticTacToeEngine);
    rendererService = new RendererService(pluginRegistry, gameRepository);
  });

  describe('renderGame', () => {
    it('should render a game by ID', async () => {
      // Create a game state
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});
      await gameRepository.save(gameState);

      const svg = await rendererService.renderGame(gameState.gameId);

      expect(svg).toBeDefined();
      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should throw GameNotFoundError when game does not exist', async () => {
      await expect(
        rendererService.renderGame('non-existent-game')
      ).rejects.toThrow(GameNotFoundError);
    });
  });

  describe('renderState', () => {
    it('should render a game state directly', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toBeDefined();
      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should include game metadata in the rendering', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      // Should contain game type
      expect(svg).toContain('tic-tac-toe');
    });
  });

  describe('plugin delegation', () => {
    it('should call plugin renderBoard method', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      const renderBoardSpy = jest.spyOn(ticTacToeEngine, 'renderBoard');

      await rendererService.renderState(gameState);

      expect(renderBoardSpy).toHaveBeenCalledWith(gameState);
    });

    it('should call beforeRenderBoard hook if defined', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      // Add hook to engine
      const beforeRenderBoardSpy = jest.fn();
      ticTacToeEngine.beforeRenderBoard = beforeRenderBoardSpy;

      await rendererService.renderState(gameState);

      expect(beforeRenderBoardSpy).toHaveBeenCalledWith(gameState);
    });

    it('should call afterRenderBoard hook if defined', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      // Add hook to engine
      const afterRenderBoardSpy = jest.fn();
      ticTacToeEngine.afterRenderBoard = afterRenderBoardSpy;

      await rendererService.renderState(gameState);

      expect(afterRenderBoardSpy).toHaveBeenCalled();
      expect(afterRenderBoardSpy.mock.calls[0][0]).toEqual(gameState);
      expect(afterRenderBoardSpy.mock.calls[0][1]).toHaveProperty('viewBox');
    });
  });

  describe('frame layer creation', () => {
    it('should create a frame layer with game metadata', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      // Frame should contain game type
      expect(svg).toContain('tic-tac-toe');
      // Frame should contain game ID
      expect(svg).toContain(gameState.gameId);
    });

    it('should include timestamp in frame layer', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      // Should contain some date/time information
      expect(svg).toMatch(/\d{4}/); // Year
    });
  });

  describe('layer composition', () => {
    it('should compose layers by z-index', async () => {
      // Create a mock plugin with multiple layers
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 300, height: 300 },
            backgroundColor: '#ffffff',
            spaces: [],
            layers: [
              {
                name: 'background',
                zIndex: 0,
                elements: [
                  {
                    type: 'rect',
                    attributes: { x: 0, y: 0, width: 300, height: 300, fill: '#f0f0f0' },
                  },
                ],
              },
              {
                name: 'foreground',
                zIndex: 10,
                elements: [
                  {
                    type: 'circle',
                    attributes: { cx: 150, cy: 150, r: 50, fill: '#ff0000' },
                  },
                ],
              },
              {
                name: 'middle',
                zIndex: 5,
                elements: [
                  {
                    type: 'rect',
                    attributes: { x: 100, y: 100, width: 100, height: 100, fill: '#00ff00' },
                  },
                ],
              },
            ],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      // Verify SVG contains all layers
      expect(svg).toContain('background');
      expect(svg).toContain('foreground');
      expect(svg).toContain('middle');

      // Verify layers are in correct z-index order (background, middle, foreground)
      const backgroundIndex = svg.indexOf('background');
      const middleIndex = svg.indexOf('middle');
      const foregroundIndex = svg.indexOf('foreground');

      expect(backgroundIndex).toBeLessThan(middleIndex);
      expect(middleIndex).toBeLessThan(foregroundIndex);
    });
  });

  describe('SVG generation', () => {
    describe('RenderElement conversion', () => {
      it('should convert rect elements to SVG', async () => {
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 300, height: 300 },
            spaces: [],
            layers: [
              {
                name: 'test',
                zIndex: 0,
                elements: [
                  {
                    type: 'rect',
                    attributes: { x: 10, y: 20, width: 100, height: 50, fill: '#ff0000' },
                  },
                ],
              },
            ],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toContain('<rect');
      expect(svg).toContain('x="10"');
      expect(svg).toContain('y="20"');
      expect(svg).toContain('width="100"');
      expect(svg).toContain('height="50"');
      expect(svg).toContain('fill="#ff0000"');
    });

    it('should convert circle elements to SVG', async () => {
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 300, height: 300 },
            spaces: [],
            layers: [
              {
                name: 'test',
                zIndex: 0,
                elements: [
                  {
                    type: 'circle',
                    attributes: { cx: 150, cy: 150, r: 50, fill: '#00ff00' },
                  },
                ],
              },
            ],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toContain('<circle');
      expect(svg).toContain('cx="150"');
      expect(svg).toContain('cy="150"');
      expect(svg).toContain('r="50"');
      expect(svg).toContain('fill="#00ff00"');
    });

    it('should convert path elements to SVG', async () => {
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 300, height: 300 },
            spaces: [],
            layers: [
              {
                name: 'test',
                zIndex: 0,
                elements: [
                  {
                    type: 'path',
                    attributes: { d: 'M 10 10 L 100 100', stroke: '#0000ff', 'stroke-width': 2 },
                  },
                ],
              },
            ],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toContain('<path');
      expect(svg).toContain('d="M 10 10 L 100 100"');
      expect(svg).toContain('stroke="#0000ff"');
    });

    it('should convert text elements to SVG', async () => {
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 300, height: 300 },
            spaces: [],
            layers: [
              {
                name: 'test',
                zIndex: 0,
                elements: [
                  {
                    type: 'text',
                    attributes: { x: 50, y: 50, 'font-size': 20, fill: '#000000', text: 'Hello' },
                  },
                ],
              },
            ],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toContain('<text');
      expect(svg).toContain('x="50"');
      expect(svg).toContain('y="50"');
      expect(svg).toContain('Hello');
    });

    it('should convert image elements to SVG', async () => {
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 300, height: 300 },
            spaces: [],
            layers: [
              {
                name: 'test',
                zIndex: 0,
                elements: [
                  {
                    type: 'image',
                    attributes: { x: 10, y: 10, width: 50, height: 50, href: 'image.png' },
                  },
                ],
              },
            ],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toContain('<image');
      expect(svg).toContain('href="image.png"');
    });
  });

  describe('viewBox and dimensions', () => {
    it('should set viewBox from BoardRenderData', async () => {
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 500, height: 400 },
            spaces: [],
            layers: [],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      // ViewBox now includes frame padding (40px added to height)
      expect(svg).toContain('viewBox="0 0 500 440"');
    });

    it('should set width and height attributes', async () => {
      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = ticTacToeEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toContain('width=');
      expect(svg).toContain('height=');
    });

    it('should apply backgroundColor if provided', async () => {
      class MockGameEngine extends TicTacToeEngine {
        renderBoard(_state: GameState): BoardRenderData {
          return {
            viewBox: { width: 300, height: 300 },
            backgroundColor: '#f0f0f0',
            spaces: [],
            layers: [],
          };
        }
      }

      const mockEngine = new MockGameEngine();
      pluginRegistry.unregister('tic-tac-toe');
      pluginRegistry.register(mockEngine);

      const players: Player[] = [
        { id: 'p1', name: 'Alice', joinedAt: new Date() },
        { id: 'p2', name: 'Bob', joinedAt: new Date() },
      ];
      const gameState = mockEngine.initializeGame(players, {});

      const svg = await rendererService.renderState(gameState);

      expect(svg).toContain('#f0f0f0');
    });
  });
  });
});
