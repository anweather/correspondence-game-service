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
    const { width, height } = renderData.viewBox;
    
    // Start SVG document
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    // Apply background color if provided
    if (renderData.backgroundColor) {
      svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${renderData.backgroundColor}" />`;
    }

    // Create frame layer with metadata
    const frameLayer = this.createFrameLayer(state, renderData);
    
    // Combine all layers (frame + plugin layers)
    const allLayers = [frameLayer, ...renderData.layers];
    
    // Sort layers by z-index
    const sortedLayers = allLayers.sort((a, b) => a.zIndex - b.zIndex);

    // Render each layer
    for (const layer of sortedLayers) {
      svg += `<g id="${layer.name}">`;
      
      for (const element of layer.elements) {
        svg += this.renderElement(element);
      }
      
      svg += '</g>';
    }

    // Close SVG
    svg += '</svg>';

    return svg;
  }

  /**
   * Create a frame layer with game metadata
   */
  private createFrameLayer(state: GameState, renderData: BoardRenderData): RenderLayer {
    const { width } = renderData.viewBox;
    const padding = 10;
    const fontSize = 12;

    return {
      name: 'frame',
      zIndex: 1000, // High z-index to render on top
      elements: [
        // Game type label
        {
          type: 'text',
          attributes: {
            x: padding,
            y: padding + fontSize,
            'font-size': fontSize,
            'font-family': 'Arial, sans-serif',
            fill: '#333333',
            text: `Game: ${state.gameType}`,
          },
        },
        // Game ID label
        {
          type: 'text',
          attributes: {
            x: padding,
            y: padding + fontSize * 2 + 5,
            'font-size': fontSize - 2,
            'font-family': 'Arial, sans-serif',
            fill: '#666666',
            text: `ID: ${state.gameId}`,
          },
        },
        // Timestamp
        {
          type: 'text',
          attributes: {
            x: width - padding,
            y: padding + fontSize,
            'font-size': fontSize - 2,
            'font-family': 'Arial, sans-serif',
            fill: '#666666',
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
    const { text: _, ...otherAttrs } = attributes;
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
