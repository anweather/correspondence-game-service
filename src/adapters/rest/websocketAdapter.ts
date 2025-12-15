/**
 * WebSocket adapter for real-time game updates
 * Requirements: 14.1, 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import { parse as parseUrl } from 'url';
import { IWebSocketService, WebSocketMessageType } from '@domain/interfaces/IWebSocketService';
import { PlayerIdentityRepository } from '@domain/interfaces/PlayerIdentityRepository';
import { getLogger } from '@infrastructure/logging/Logger';
import { JwtValidator } from '@infrastructure/auth/JwtValidator';
import { randomBytes } from 'crypto';

/**
 * Client message types
 */
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  gameId?: string;
}

/**
 * Server response message types
 */
interface ServerResponseMessage {
  type: 'subscribed' | 'unsubscribed' | 'error';
  gameId?: string;
  message?: string;
  timestamp?: Date;
}

/**
 * Setup WebSocket server on an HTTP server
 * Requirements: 14.1, 15.1
 *
 * @param httpServer - HTTP server instance
 * @param wsManager - WebSocket manager instance
 * @param playerIdentityRepo - Player identity repository for authentication
 * @returns WebSocket server instance
 */
export function setupWebSocketServer(
  httpServer: HttpServer,
  wsManager: IWebSocketService,
  playerIdentityRepo: PlayerIdentityRepository
): WebSocketServer {
  const logger = getLogger();
  const jwtValidator = new JwtValidator();

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  logger.info('WebSocket server created');

  // Handle HTTP upgrade requests
  httpServer.on('upgrade', async (request, socket, head) => {
    const { pathname, query } = parseUrl(request.url || '', true);

    // Only handle /api/ws path
    if (pathname !== '/api/ws') {
      socket.destroy();
      return;
    }

    // Authenticate the connection
    // Requirement: 15.1 - Authentication requirement
    const token = query.token as string;

    if (!token) {
      logger.warn('WebSocket connection rejected: No authentication token provided');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Validate JWT token using proper Clerk validation
    // Requirements: 15.1, 15.2, 15.3
    let userId: string | null = null;

    try {
      // Handle test tokens for testing environment
      if (process.env.NODE_ENV === 'test' && token.startsWith('test-token-')) {
        // Test token format for testing
        const suffix = token.replace('test-token-', '');
        userId = `test-user-${suffix}`;

        // Verify user exists by checking external auth
        const playerIdentity = await playerIdentityRepo.findByExternalId('test', userId);
        if (!playerIdentity) {
          logger.warn('WebSocket connection rejected: Test user not found', { userId });
          userId = null;
        } else {
          logger.info('WebSocket connection authenticated with test token', { userId });
        }
      } else {
        // Use proper JWT validation for production tokens
        const validationResult = await jwtValidator.validateToken(token);

        if (validationResult.isValid && validationResult.userId) {
          // Verify user exists in our system
          const playerIdentity = await playerIdentityRepo.findByExternalId(
            'clerk',
            validationResult.userId
          );
          if (playerIdentity) {
            userId = playerIdentity.id;
            logger.info('WebSocket connection authenticated with JWT token', {
              externalUserId: validationResult.userId,
              internalUserId: userId,
            });
          } else {
            logger.warn('WebSocket connection rejected: User not found in system', {
              externalUserId: validationResult.userId,
            });
          }
        } else {
          logger.warn('WebSocket connection rejected: JWT validation failed', {
            error: validationResult.error,
          });
        }
      }
    } catch (error) {
      logger.error('Error validating WebSocket token', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!userId) {
      logger.warn('WebSocket connection rejected: Invalid authentication token');
      // Close the socket with proper WebSocket close frame
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Authentication successful, upgrade connection
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, userId);
    });
  });

  // Handle WebSocket connections
  // Requirement: 14.1, 15.1
  wss.on('connection', (ws: WebSocket, _request: any, userId: string) => {
    const connectionId = randomBytes(16).toString('hex');

    logger.info('WebSocket connection established', {
      userId,
      connectionId,
    });

    // Register connection with WebSocket manager
    // Cast to access extended method that accepts WebSocket
    (wsManager as any).registerConnection(userId, connectionId, ws);

    // Handle incoming messages
    // Requirement: 15.2, 15.3
    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());

        logger.debug('WebSocket message received', {
          userId,
          connectionId,
          type: message.type,
        });

        switch (message.type) {
          case 'subscribe':
            // Requirement: 15.2 - Subscribe to game updates
            if (!message.gameId) {
              sendError(ws, 'gameId is required for subscribe');
              return;
            }

            wsManager.subscribe(userId, message.gameId);

            sendResponse(ws, {
              type: 'subscribed',
              gameId: message.gameId,
              timestamp: new Date(),
            });

            logger.info('User subscribed to game', {
              userId,
              gameId: message.gameId,
            });
            break;

          case 'unsubscribe':
            // Requirement: 15.2 - Unsubscribe from game updates
            if (!message.gameId) {
              sendError(ws, 'gameId is required for unsubscribe');
              return;
            }

            wsManager.unsubscribe(userId, message.gameId);

            sendResponse(ws, {
              type: 'unsubscribed',
              gameId: message.gameId,
              timestamp: new Date(),
            });

            logger.info('User unsubscribed from game', {
              userId,
              gameId: message.gameId,
            });
            break;

          case 'ping':
            // Requirement: 15.3 - Ping/pong keepalive
            sendPong(ws);
            logger.debug('Ping received, pong sent', { userId, connectionId });
            break;

          default:
            sendError(ws, `Unknown message type: ${(message as any).type}`);
        }
      } catch (error) {
        logger.error('Error processing WebSocket message', {
          userId,
          connectionId,
          error: error instanceof Error ? error.message : String(error),
        });
        sendError(ws, 'Invalid message format');
      }
    });

    // Handle connection close
    // Requirement: 15.4, 15.5 - Connection cleanup
    ws.on('close', () => {
      logger.info('WebSocket connection closed', {
        userId,
        connectionId,
      });

      // Unregister connection (this will clean up subscriptions)
      wsManager.unregisterConnection(connectionId);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', {
        userId,
        connectionId,
        error: error.message,
      });
    });
  });

  logger.info('WebSocket server setup complete');

  return wss;
}

/**
 * Send a response message to the client
 */
function sendResponse(ws: WebSocket, message: ServerResponseMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Send an error message to the client
 */
function sendError(ws: WebSocket, message: string): void {
  sendResponse(ws, {
    type: 'error',
    message,
    timestamp: new Date(),
  });
}

/**
 * Send a pong message in response to ping
 * Requirement: 15.3
 */
function sendPong(ws: WebSocket): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: WebSocketMessageType.PONG,
        timestamp: new Date(),
      })
    );
  }
}
