# Way of Working

## Test-Driven Development Rules

### Never Comment Out Tests
- **NEVER** comment out failing tests to make the build pass
- If a test is failing, either fix the implementation or fix the test
- If a test needs to be temporarily disabled, use `test.skip()` with a clear reason and tracking issue
- Commented-out tests indicate technical debt and mask real problems

### Test Quality Standards
- All tests must pass before committing code
- Run the full test suite before any commit: `npm test -- --run`
- Maintain test coverage above 80% overall
- Write meaningful test descriptions that explain the behavior being tested
- Follow the Red-Green-Refactor cycle strictly

## Commit Guidelines

### When to Commit
- **DO commit** after completing each major task from the implementation plan
- **DO commit** when all tests are passing
- **DO NOT commit** after minor subtasks unless they represent a stable checkpoint
- **DO NOT commit** with failing tests or commented-out tests

### Major Tasks (Commit Points)
Major tasks typically include:
- Completing a full TDD cycle for a component (tests + implementation + refactor)
- Finishing an entire service class with all its tests
- Completing a full API endpoint with integration tests
- Finishing a game plugin implementation
- Completing a significant refactoring with all tests passing

### Minor Tasks (No Commit)
Minor tasks that are part of a larger unit of work:
- Writing individual test cases (before implementation)
- Implementing a single method
- Adding a single interface definition
- Small refactorings within a larger task

### Commit Message Format
```
<type>: <short summary>

<optional detailed description>

- Requirement(s): <requirement IDs>
- Tests: <test coverage info>
```

Types: `feat`, `test`, `refactor`, `fix`, `docs`, `chore`

Example:
```
feat: implement GameManagerService with full test coverage

Added GameManagerService with methods for creating games, joining games,
and listing available game types. All methods include comprehensive unit
tests following TDD approach.

- Requirements: 1.1, 1.2, 1.3, 1.5, 1a.1-1a.5, 8.1-8.4
- Tests: 15 unit tests, 100% coverage for GameManagerService
```

## Pre-Commit Checklist

Before every commit, verify:
- [ ] All tests pass (`npm test -- --run`)
- [ ] No tests are commented out
- [ ] No `test.skip()` without documented reason
- [ ] Code is formatted (`npm run format`)
- [ ] Code is linted (`npm run lint`)
- [ ] Test coverage meets minimum threshold
- [ ] Commit represents a complete, stable unit of work

## Development Workflow

1. **Red**: Write failing test(s) for the feature
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Improve code quality while keeping tests green
4. **Verify**: Run full test suite
5. **Commit**: If major task complete and all tests pass
6. **Repeat**: Move to next task

## Handling Failing Tests

If tests are failing:
1. **Understand why**: Read the test failure message carefully
2. **Fix the root cause**: Don't patch around the problem
3. **Never skip**: Don't comment out or skip tests to make progress
4. **Ask for help**: If stuck, discuss the approach before bypassing tests

## Code Review Standards

When reviewing code (or self-reviewing):
- Verify all tests are present and passing
- Check for commented-out or skipped tests
- Ensure test coverage is adequate
- Confirm commit represents a complete unit of work
- Validate that TDD approach was followed
