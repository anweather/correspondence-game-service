import { TicTacToeEngine } from '@adapters/plugins/tic-tac-toe/TicTacToeEngine';
import { Player, Move } from '@domain/models';
import { RendererService } from '@infrastructure/rendering/RendererService';
import { PluginRegistry } from '@application/PluginRegistry';
import { InMemoryGameRepository } from '@infrastructure/persistence/InMemoryGameRepository';
import * as fs from 'fs';
import * as path from 'path';

describe('Manual SVG Rendering', () => {
  it('should generate and save a sample SVG', async () => {
    // Create sample players
    const players: Player[] = [
      { id: 'player-1', name: 'Alice', joinedAt: new Date() },
      { id: 'player-2', name: 'Bob', joinedAt: new Date() },
    ];

    // Initialize engine and create game
    const engine = new TicTacToeEngine();
    let gameState = engine.initializeGame(players, {});

    // Play a few moves to create an interesting board state
    const moves: Array<{ playerId: string; row: number; col: number }> = [
      { playerId: 'player-1', row: 1, col: 1 }, // X in center
      { playerId: 'player-2', row: 0, col: 0 }, // O in top-left
      { playerId: 'player-1', row: 0, col: 2 }, // X in top-right
      { playerId: 'player-2', row: 2, col: 0 }, // O in bottom-left
      { playerId: 'player-1', row: 2, col: 2 }, // X in bottom-right
    ];

    moves.forEach((m, index) => {
      const move: Move = {
        playerId: m.playerId,
        timestamp: new Date(),
        action: 'place',
        parameters: { row: m.row, col: m.col },
      };
      gameState = engine.applyMove(gameState, m.playerId, move);
      if (index < moves.length - 1) {
        gameState = engine.advanceTurn(gameState);
      }
    });

    // Set up renderer
    const registry = new PluginRegistry();
    registry.register(engine);
    const repository = new InMemoryGameRepository();
    const renderer = new RendererService(registry, repository);

    // Render the game state to SVG
    const svg = await renderer.renderState(gameState);

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../../output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save SVG to file
    const outputPath = path.join(outputDir, 'tic-tac-toe-sample.svg');
    fs.writeFileSync(outputPath, svg);

    console.log(`\n✓ SVG rendered successfully!`);
    console.log(`  File: ${outputPath}`);
    console.log(`\nGame state:`);
    console.log(`  X positions: center, top-right, bottom-right`);
    console.log(`  O positions: top-left, bottom-left`);
    console.log(`  Empty: top-center, middle-left, middle-right, bottom-center\n`);

    // Verify SVG was created
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });
});
