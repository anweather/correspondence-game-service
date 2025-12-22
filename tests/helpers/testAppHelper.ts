/**
 * Base test class and helpers for Express app testing with common configuration
 */

import { Express, Router } from 'express';
import { createApp, addApiRoutes, finalizeApp } from '@adapters/rest/app';
import { InMemoryPlayerIdentityRepository } from '@infrastructure/persistence/InMemoryPlayerIdentityRepository';
import { PlayerIdentityRepository } from '@domain/interfaces/PlayerIdentityRepository';

/**
 * Base test class for integration tests that need an Express app
 * Provides common setup and teardown for app-based tests
 */
export abstract class BaseAppTest {
  protected app!: Express;
  protected playerIdentityRepository!: PlayerIdentityRepository;

  /**
   * Sets up the Express app with common test configuration
   * Override this method to customize app setup
   */
  protected setupApp(
    options: {
      disableAuth?: boolean;
      playerIdentityRepository?: PlayerIdentityRepository;
    } = {}
  ): void {
    this.playerIdentityRepository =
      options.playerIdentityRepository || new InMemoryPlayerIdentityRepository();

    this.app = createApp(this.playerIdentityRepository, {
      disableAuth: options.disableAuth ?? true, // Default to disabled for tests
    });
  }

  /**
   * Adds routes to the app and finalizes it
   * Call this after setting up your routes
   */
  protected finalizeApp(router?: Router): void {
    if (router) {
      addApiRoutes(this.app, router);
    }
    finalizeApp(this.app);
  }

  /**
   * Complete app setup with routes in one call
   */
  protected setupAppWithRoutes(
    router: Router,
    options: {
      disableAuth?: boolean;
      playerIdentityRepository?: PlayerIdentityRepository;
    } = {}
  ): void {
    this.setupApp(options);
    this.finalizeApp(router);
  }

  /**
   * Override this for custom cleanup
   */
  protected teardownApp(): void {
    // Base implementation - override if needed
  }
}

/**
 * Utility functions for tests that don't use inheritance
 */

/**
 * Creates a test Express app with authentication disabled by default
 * @param options - Configuration options
 * @returns Object containing the app and repositories
 */
export function createTestApp(
  options: {
    disableAuth?: boolean;
    playerIdentityRepository?: PlayerIdentityRepository;
  } = {}
): {
  app: Express;
  playerIdentityRepository: PlayerIdentityRepository;
} {
  const playerIdentityRepository =
    options.playerIdentityRepository || new InMemoryPlayerIdentityRepository();

  const app = createApp(playerIdentityRepository, {
    disableAuth: options.disableAuth ?? true, // Default to disabled for tests
  });

  return {
    app,
    playerIdentityRepository,
  };
}

/**
 * Creates a fully configured test Express app with routes
 * @param router - Express router to add to the app
 * @param options - Configuration options
 * @returns Object containing the app and repositories
 */
export function createTestAppWithRoutes(
  router: Router,
  options: {
    disableAuth?: boolean;
    playerIdentityRepository?: PlayerIdentityRepository;
  } = {}
): {
  app: Express;
  playerIdentityRepository: PlayerIdentityRepository;
} {
  const { app, playerIdentityRepository } = createTestApp(options);

  addApiRoutes(app, router);
  finalizeApp(app);

  return {
    app,
    playerIdentityRepository,
  };
}
