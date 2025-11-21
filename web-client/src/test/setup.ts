import '@testing-library/jest-dom';

// Suppress act() warnings for provider initialization
// These warnings occur when context providers initialize state in useMemo hooks
// The state updates are expected and tests verify the correct behavior
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    
    // Suppress act() warnings from React Testing Library
    if (
      message.includes('An update to') &&
      message.includes('inside a test was not wrapped in act')
    ) {
      return;
    }
    
    // Suppress React act() warnings
    if (
      message.includes('When testing, code that causes React state updates should be wrapped into act')
    ) {
      return;
    }
    
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    
    // Suppress act() warnings that might come through as warnings
    if (
      message.includes('An update to') &&
      message.includes('inside a test was not wrapped in act')
    ) {
      return;
    }
    
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
