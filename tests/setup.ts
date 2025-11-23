/**
 * Global test setup
 * Runs before all tests
 */

import { initializeLogger } from '../src/infrastructure/logging/Logger';

// Initialize logger for all tests with debug level and pretty format
initializeLogger('debug', 'pretty');
