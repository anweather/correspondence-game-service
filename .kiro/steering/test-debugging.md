---
inclusion: always
---

# Test Debugging Guide

When tests fail to load or run, ALWAYS look for working examples in the codebase first. Don't reinvent solutions.

## Critical Rule: Learn from Working Tests

**BEFORE attempting to fix a failing test:**
1. Find a similar working test in the repo
2. Read and understand its structure
3. Document what makes it work
4. Apply the same pattern to your failing test

## Common Test Patterns in This Repo

### Frontend Context Tests (Vitest + React Testing Library)

**Working Example:** `web-client/src/context/__tests__/PlayerContext.test.tsx`

**Pattern:**
```typescript
// 1. Import test utilities
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';

// 2. Import component being tested
import { MyProvider, useMyContext } from '../MyContext';

// 3. Mock external dependencies BEFORE importing
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue(null) }),
}));

// 4. Create mock functions OUTSIDE the mock factory
const mockFunction = vi.fn();

// 5. Mock modules with class or object
vi.mock('../../api/someModule', () => {
  return {
    SomeClass: class MockClass {
      method = mockFunction;
    },
  };
});

// 6. Tests use simple wrapper
describe('MyContext', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MyProvider>{children}</MyProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something', () => {
    const { result } = renderHook(() => useMyContext(), { wrapper });
    expect(result.current.value).toBe(expected);
  });
});
```

### Key Lessons from NotificationContext Debugging

**Problem:** Test file showed "No test suite found"

**Root Cause:** Tried to mock `WebSocketContext` which `NotificationContext` imports and depends on. This created a circular dependency that prevented module loading.

**Solution:** 
- Don't mock contexts that your component depends on
- Only mock external dependencies (Clerk, API clients, etc.)
- Let dependent providers work naturally in tests

**Wrong Approach:**
```typescript
// DON'T DO THIS - mocking a context that the component imports
vi.mock('../WebSocketContext', () => ({
  WebSocketProvider: ({ children }: any) => children,
  useWebSocket: () => ({ connected: true }),
}));

import { NotificationProvider } from '../NotificationContext'; // imports WebSocketContext!
```

**Correct Approach:**
```typescript
// Mock only external dependencies
vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: vi.fn() }),
}));

// Import both and use them naturally
import { NotificationProvider } from '../NotificationContext';
import { WebSocketProvider } from '../WebSocketContext';

const wrapper = ({ children }) => (
  <WebSocketProvider>
    <NotificationProvider>{children}</NotificationProvider>
  </WebSocketProvider>
);
```

## Debugging Checklist

When a test fails to load:

1. **Check for working examples**
   - Search for similar test files: `find . -name "*.test.tsx" -o -name "*.test.ts"`
   - Look in the same directory first
   - Check parent directories for patterns

2. **Compare import order**
   - Mocks must be defined BEFORE imports
   - External dependencies mocked first
   - Component imports last

3. **Check for circular dependencies**
   - Don't mock modules that your component imports
   - If Component A imports Context B, don't mock Context B in A's tests
   - Use real providers in wrapper instead

4. **Verify mock structure**
   - Mock functions created outside factory
   - Mock factories return classes or objects
   - No JSX in mock factories without React import

5. **Test the test file**
   - Start with minimal test (just one `it` block)
   - Verify it runs before adding complexity
   - Add tests incrementally

## Backend Tests (Jest + Node)

**Working Example:** `tests/unit/application/PlayerProfileService.test.ts`

**Pattern:**
```typescript
// 1. Mock dependencies before imports
const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
};

// 2. Import after mocks
import { MyService } from '../../../src/application/services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MyService(mockRepository);
  });

  it('should do something', async () => {
    mockRepository.findById.mockResolvedValue({ id: '123' });
    const result = await service.doSomething('123');
    expect(result).toBeDefined();
  });
});
```

## When Tests Won't Load

**Error:** "No test suite found in file"

**Causes:**
1. Circular dependency in mocks
2. Syntax error in mock factory
3. Import before mock definition
4. File is empty (0 bytes)

**Solution:**
1. Check file size: `ls -la path/to/test.tsx`
2. Read a working test in same directory
3. Copy working test structure
4. Add your specific tests incrementally

## Remember

- **Don't solve the same problem twice**
- **Working examples are your best documentation**
- **When stuck, read working tests first**
- **Simple patterns work better than complex mocks**
