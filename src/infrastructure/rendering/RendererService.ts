import { GameState } from '@domain/models';
import { BoardRenderData, RenderLayer, RenderElement } from '@domain/interfaces';
import { PluginRegistry } from '@application/PluginRegistry';
import { GameRepository } from '@domain/interfaces';
import { GameNotFoundError } from '@domain/errors';

/**
 * Service for rendering game boards as SVG images
 */
export class RendererService {
  constructor(
    private readonly pluginRegistry: PluginRegistry,
    private readonly gameRepository: GameRepository
  ) {}

  /**
   * Render a game by its ID
   */
  async renderGame(gameId: string): Promise<string> {
    const gameState = await this.gameRepository.findById(gameId);

    if (!gameState) {
      throw new GameNotFoundError(gameId);
    }

    return this.renderState(gameState);
  }

  /**
   * Render a game state directly
   */
  async renderState(state: GameState): Promise<string> {
    const plugin = this.pluginRegistry.get(state.gameType);

    if (!plugin) {
      throw new Error(`No plugin found for game type: ${state.gameType}`);
    }

    // Call beforeRenderBoard hook if defined
    if (plugin.beforeRenderBoard) {
      plugin.beforeRenderBoard(state);
    }

    // Get board render data from plugin
    const boardRenderData = plugin.renderBoard(state);

    // Call afterRenderBoard hook if defined
    if (plugin.afterRenderBoard) {
      plugin.afterRenderBoard(state, boardRenderData);
    }

    // Generate SVG
    const svg = this.generateSVG(state, boardRenderData);

    return svg;
  }

  /**
   * Generate SVG from board render data
   */
  private generateSVG(state: GameState, renderData: BoardRenderData): string {
    const boardWidth = renderData.viewBox.width;
    const boardHeight = renderData.viewBox.height;

    // Add padding for frame metadata
    const framePadding = 40; // Space for metadata below the board
    const totalWidth = boardWidth;
    const totalHeight = boardHeight + framePadding;

    // Start SVG document with expanded dimensions
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`;

    // Apply background color if provided
    if (renderData.backgroundColor) {
      svg += `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${renderData.backgroundColor}" />`;
    }

    // Wrap board layers in a group (no offset needed, board starts at 0,0)
    svg += `<g id="board">`;

    // Sort plugin layers by z-index
    const sortedLayers = renderData.layers.sort((a, b) => a.zIndex - b.zIndex);

    // Render each board layer
    for (const layer of sortedLayers) {
      svg += `<g id="${layer.name}">`;

      for (const element of layer.elements) {
        svg += this.renderElement(element);
      }

      svg += '</g>';
    }

    svg += '</g>'; // Close board group

    // Create and render frame layer below the board
    const frameLayer = this.createFrameLayer(state, renderData, boardHeight);
    svg += `<g id="${frameLayer.name}">`;
    for (const element of frameLayer.elements) {
      svg += this.renderElement(element);
    }
    svg += '</g>';

    // Close SVG
    svg += '</svg>';

    return svg;
  }

  /**
   * Create a frame layer with game metadata positioned below the board
   */
  private createFrameLayer(
    state: GameState,
    renderData: BoardRenderData,
    boardHeight: number
  ): RenderLayer {
    const { width } = renderData.viewBox;
    const padding = 10;
    const fontSize = 11;
    const yOffset = boardHeight + 15; // Position below the board

    return {
      name: 'frame',
      zIndex: 1000, // High z-index to render on top
      elements: [
        // Separator line
        {
          type: 'path',
          attributes: {
            d: `M 0 ${boardHeight + 5} L ${width} ${boardHeight + 5}`,
            stroke: '#e0e0e0',
            strokeWidth: 1,
          },
        },
        // Game type label (left side)
        {
          type: 'text',
          attributes: {
            x: padding,
            y: yOffset,
            'font-size': fontSize,
            'font-family': 'Arial, sans-serif',
            fill: '#666666',
            text: `${state.gameType}`,
          },
        },
        // Game ID (center)
        {
          type: 'text',
          attributes: {
            x: width / 2,
            y: yOffset,
            'font-size': fontSize - 1,
            'font-family': 'Arial, sans-serif',
            fill: '#999999',
            'text-anchor': 'middle',
            text: `${state.gameId}`,
          },
        },
        // Timestamp (right side)
        {
          type: 'text',
          attributes: {
            x: width - padding,
            y: yOffset,
            'font-size': fontSize - 1,
            'font-family': 'Arial, sans-serif',
            fill: '#999999',
            'text-anchor': 'end',
            text: new Date(state.updatedAt).toISOString().split('T')[0],
          },
        },
      ],
    };
  }

  /**
   * Render a single element to SVG string
   */
  private renderElement(element: RenderElement): string {
    const { type, attributes } = element;

    switch (type) {
      case 'rect':
        return this.renderRect(attributes);
      case 'circle':
        return this.renderCircle(attributes);
      case 'path':
        return this.renderPath(attributes);
      case 'text':
        return this.renderText(attributes);
      case 'image':
        return this.renderImage(attributes);
      default:
        console.warn(`Unknown element type: ${type}`);
        return '';
    }
  }

  /**
   * Render a rectangle element
   */
  private renderRect(attributes: Record<string, any>): string {
    const attrs = this.buildAttributeString(attributes);
    return `<rect ${attrs} />`;
  }

  /**
   * Render a circle element
   */
  private renderCircle(attributes: Record<string, any>): string {
    const attrs = this.buildAttributeString(attributes);
    return `<circle ${attrs} />`;
  }

  /**
   * Render a path element
   */
  private renderPath(attributes: Record<string, any>): string {
    const attrs = this.buildAttributeString(attributes);
    return `<path ${attrs} />`;
  }

  /**
   * Render a text element
   */
  private renderText(attributes: Record<string, any>): string {
    const text = attributes.text || '';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { text: _text, ...otherAttrs } = attributes;
    const attrs = this.buildAttributeString(otherAttrs);
    return `<text ${attrs}>${this.escapeXml(text)}</text>`;
  }

  /**
   * Render an image element
   */
  private renderImage(attributes: Record<string, any>): string {
    const attrs = this.buildAttributeString(attributes);
    return `<image ${attrs} />`;
  }

  /**
   * Build attribute string from object
   */
  private buildAttributeString(attributes: Record<string, any>): string {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}="${this.escapeXml(String(value))}"`)
      .join(' ');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
