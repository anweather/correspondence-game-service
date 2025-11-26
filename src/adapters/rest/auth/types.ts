/**
 * Type definitions for authentication middleware
 */

import { Request } from 'express';
import { AuthenticatedUser } from '../../../domain/interfaces/authentication';

/**
 * Extended Express Request with optional authenticated user
 * Used by authentication middleware to populate user context
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
