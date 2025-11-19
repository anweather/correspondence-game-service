import {
  GameState,
  Player,
  Move,
  GameLifecycle,
  Board,
  Space,
  Token,
} from '@domain/models';
import {
  BaseGameEngine,
  ValidationResult,
  BoardRenderData,
  GameConfig,
} from '@domain/interfaces';

/**
 * Tic-Tac-Toe specific move parameters
 */
export interface TicTacToeMove extends Move<{ row: number; col: number }> {
  action: 'place';
}

/**
 * Tic-Tac-Toe specific game state metadata
 */
export interface TicTacToeMetadata {
  boardSize: number;
}

/**
 * Tic-Tac-Toe game engine implementation
 */
export class TicTacToeEngine extends BaseGameEngine {
  private readonly BOARD_SIZE = 3;

  getGameType(): string {
    return 'tic-tac-toe';
  }

  getMinPlayers(): number {
    return 2;
  }

  getMaxPlayers(): number {
    return 2;
  }

  getDescription(): string {
    return 'Classic Tic-Tac-Toe game on a 3x3 grid. Players take turns placing X and O tokens, aiming to get three in a row.';
  }

  initializeGame(players: Player[], config: GameConfig): GameState {
    const gameId = config.customSettings?.gameId || `ttt-${Date.now()}`;
    
    // Create 3x3 board with empty spaces
    const spaces: Space[] = [];
    for (let row = 0; row < this.BOARD_SIZE; row++) {
      for (let col = 0; col < this.BOARD_SIZE; col++) {
        spaces.push({
          id: `${row},${col}`,
          position: { x: col, y: row },
          tokens: [],
        });
      }
    }

    const board: Board = {
      spaces,
      metadata: {},
    };

    return {
      gameId,
      gameType: this.getGameType(),
      lifecycle: GameLifecycle.ACTIVE,
      players,
      currentPlayerIndex: 0,
      phase: 'main',
      board,
      moveHistory: [],
      metadata: {
        boardSize: this.BOARD_SIZE,
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  validateMove(
    state: GameState,
    playerId: string,
    move: Move
  ): ValidationResult {
    const { row, col } = move.parameters as { row: number; col: number };

    // Check if it's the player's turn
    const currentPlayer = this.getCurrentPlayer(state);
    if (playerId !== currentPlayer) {
      return {
        valid: false,
        reason: 'Not your turn',
      };
    }

    // Check bounds
    if (row < 0 || row >= this.BOARD_SIZE || col < 0 || col >= this.BOARD_SIZE) {
      return {
        valid: false,
        reason: 'Position out of bounds',
      };
    }

    // Check if space is empty
    const spaceId = `${row},${col}`;
    const space = state.board.spaces.find(s => s.id === spaceId);
    
    if (!space) {
      return {
        valid: false,
        reason: 'Invalid space',
      };
    }

    if (space.tokens.length > 0) {
      return {
        valid: false,
        reason: 'Space is already occupied',
      };
    }

    return { valid: true };
  }

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    const { row, col } = move.parameters as { row: number; col: number };
    const spaceId = `${row},${col}`;

    // Determine token type based on player index
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    const tokenType = playerIndex === 0 ? 'X' : 'O';

    // Create new token
    const token: Token = {
      id: `token-${Date.now()}`,
      type: tokenType,
      ownerId: playerId,
    };

    // Create new board with token placed
    const newSpaces = state.board.spaces.map(space => {
      if (space.id === spaceId) {
        return {
          ...space,
          tokens: [...space.tokens, token],
        };
      }
      return space;
    });

    return {
      ...state,
      board: {
        ...state.board,
        spaces: newSpaces,
      },
      moveHistory: [...state.moveHistory, move],
      version: state.version + 1,
      updatedAt: new Date(),
    };
  }

  isGameOver(state: GameState): boolean {
    // Check if there's a winner
    if (this.getWinner(state) !== null) {
      return true;
    }

    // Check if board is full (draw)
    const allSpacesFilled = state.board.spaces.every(
      space => space.tokens.length > 0
    );

    return allSpacesFilled;
  }

  getWinner(state: GameState): string | null {
    // Check all possible winning combinations
    const winPatterns = [
      // Rows
      ['0,0', '0,1', '0,2'],
      ['1,0', '1,1', '1,2'],
      ['2,0', '2,1', '2,2'],
      // Columns
      ['0,0', '1,0', '2,0'],
      ['0,1', '1,1', '2,1'],
      ['0,2', '1,2', '2,2'],
      // Diagonals
      ['0,0', '1,1', '2,2'],
      ['0,2', '1,1', '2,0'],
    ];

    for (const pattern of winPatterns) {
      const spaces = pattern.map(id => 
        state.board.spaces.find(s => s.id === id)
      );

      // Check if all spaces in pattern have tokens
      if (spaces.every(s => s && s.tokens.length > 0)) {
        const tokens = spaces.map(s => s!.tokens[0]);
        
        // Check if all tokens are the same type and have the same owner
        const firstToken = tokens[0];
        if (tokens.every(t => t.type === firstToken.type && t.ownerId === firstToken.ownerId)) {
          return firstToken.ownerId!;
        }
      }
    }

    return null;
  }

  renderBoard(state: GameState): BoardRenderData {
    const cellSize = 100;
    const boardSize = this.BOARD_SIZE * cellSize;
    const lineWidth = 2;

    // Map spaces to render data
    const spaces = state.board.spaces.map(space => ({
      id: space.id,
      position: { x: space.position.x, y: space.position.y },
      tokens: space.tokens.map(token => ({
        id: token.id,
        type: token.type,
        ownerId: token.ownerId,
      })),
    }));

    // Create grid layer with borders and dividers
    const gridElements: any[] = [];
    
    // Vertical lines
    for (let i = 1; i < this.BOARD_SIZE; i++) {
      gridElements.push({
        type: 'path',
        attributes: {
          d: `M ${i * cellSize} 0 L ${i * cellSize} ${boardSize}`,
          stroke: '#333333',
          strokeWidth: lineWidth,
        },
      });
    }
    
    // Horizontal lines
    for (let i = 1; i < this.BOARD_SIZE; i++) {
      gridElements.push({
        type: 'path',
        attributes: {
          d: `M 0 ${i * cellSize} L ${boardSize} ${i * cellSize}`,
          stroke: '#333333',
          strokeWidth: lineWidth,
        },
      });
    }
    
    // Border
    gridElements.push({
      type: 'rect',
      attributes: {
        x: 0,
        y: 0,
        width: boardSize,
        height: boardSize,
        fill: 'none',
        stroke: '#333333',
        strokeWidth: lineWidth * 2,
      },
    });

    // Create token layer with X and O symbols
    const tokenElements: any[] = [];
    
    state.board.spaces.forEach(space => {
      if (space.tokens.length > 0) {
        const token = space.tokens[0];
        const centerX = space.position.x * cellSize + cellSize / 2;
        const centerY = space.position.y * cellSize + cellSize / 2;
        const padding = 20;
        
        if (token.type === 'X') {
          // Draw X as two diagonal lines
          tokenElements.push({
            type: 'path',
            attributes: {
              d: `M ${centerX - cellSize / 2 + padding} ${centerY - cellSize / 2 + padding} L ${centerX + cellSize / 2 - padding} ${centerY + cellSize / 2 - padding}`,
              stroke: '#e74c3c',
              strokeWidth: 8,
              strokeLinecap: 'round',
            },
          });
          tokenElements.push({
            type: 'path',
            attributes: {
              d: `M ${centerX + cellSize / 2 - padding} ${centerY - cellSize / 2 + padding} L ${centerX - cellSize / 2 + padding} ${centerY + cellSize / 2 - padding}`,
              stroke: '#e74c3c',
              strokeWidth: 8,
              strokeLinecap: 'round',
            },
          });
        } else if (token.type === 'O') {
          // Draw O as a circle
          tokenElements.push({
            type: 'circle',
            attributes: {
              cx: centerX,
              cy: centerY,
              r: cellSize / 2 - padding,
              fill: 'none',
              stroke: '#3498db',
              strokeWidth: 8,
            },
          });
        }
      }
    });

    return {
      viewBox: { width: boardSize, height: boardSize },
      backgroundColor: '#ffffff',
      spaces,
      layers: [
        {
          name: 'grid',
          zIndex: 1,
          elements: gridElements,
        },
        {
          name: 'tokens',
          zIndex: 2,
          elements: tokenElements,
        },
      ],
    };
  }
}
