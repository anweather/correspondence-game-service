# Development Tooling

This document describes the development tooling setup for the Async Boardgame Service.

## Overview

The project uses a comprehensive set of development tools to ensure code quality, consistency, and maintainability:

- **ESLint** - Code quality and linting
- **Prettier** - Code formatting
- **Jest** - Testing with coverage reporting
- **Husky** - Git hooks automation
- **lint-staged** - Run linters on staged files

## ESLint Configuration

ESLint is configured with TypeScript support and strict rules for production code.

### Key Features

- TypeScript parser with project-aware type checking
- Recommended ESLint and TypeScript-ESLint rules
- Relaxed rules for test files (allows `any`, mocks, etc.)
- Separate tsconfig for test files to avoid parsing errors

### Running ESLint

```bash
# Check for linting issues
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Configuration Files

- `.eslintrc.js` - Main ESLint configuration
- `tsconfig.json` - TypeScript config for source files
- `tsconfig.test.json` - TypeScript config for test files

## Prettier Configuration

Prettier ensures consistent code formatting across the project.

### Settings

- Single quotes
- Semicolons enabled
- 100 character line width
- 2 space indentation
- ES5 trailing commas

### Running Prettier

```bash
# Format all files
npm run format

# Check formatting without modifying files
npm run format:check
```

### Configuration File

- `.prettierrc.js` - Prettier configuration

## Jest Configuration

Jest is configured for TypeScript testing with comprehensive coverage reporting.

### Coverage Thresholds

All thresholds are set to **80%**:
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

Current coverage: **97.84%** (well above threshold)

### Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Type check without emitting files
npm run typecheck
```

### Coverage Reports

Coverage reports are generated in multiple formats:
- **Text** - Console output
- **LCOV** - For CI/CD integration
- **HTML** - Interactive browser report in `coverage/` directory
- **JSON** - Machine-readable format

### Configuration File

- `jest.config.js` - Jest configuration with coverage settings

## Git Hooks (Husky)

Husky manages Git hooks to automate quality checks before commits.

### Pre-commit Hook

The pre-commit hook automatically runs on every commit:

1. **ESLint** - Lints and auto-fixes staged TypeScript files
2. **Prettier** - Formats staged TypeScript files
3. **Jest** - Runs tests related to staged files

This ensures:
- No linting errors are committed
- All code is properly formatted
- Related tests pass before commit

### Bypassing Hooks

Only in exceptional cases:

```bash
git commit --no-verify -m "your message"
```

### Configuration

- `.husky/pre-commit` - Pre-commit hook script
- `package.json` - lint-staged configuration

## lint-staged Configuration

lint-staged runs tools only on staged files for faster execution.

### Configuration (in package.json)

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write",
      "npm run test:run -- --bail --findRelatedTests"
    ]
  }
}
```

## NPM Scripts

All development commands are available as npm scripts:

### Development

```bash
npm run dev          # Start development server
npm run build        # Build TypeScript to JavaScript
npm start            # Run production build
```

### Testing

```bash
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
```

### Code Quality

```bash
npm run lint         # Check for linting issues
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format all files
npm run format:check # Check formatting
npm run typecheck    # Type check without building
```

## IDE Integration

### VS Code

Recommended extensions:
- ESLint
- Prettier - Code formatter
- Jest Runner

Settings are configured in `.vscode/settings.json` (if present).

### Other IDEs

Most modern IDEs support ESLint and Prettier through plugins. Configure them to:
- Use the project's ESLint config
- Use the project's Prettier config
- Format on save (optional but recommended)

## Continuous Integration

The tooling is designed to work seamlessly in CI/CD pipelines:

```bash
# Typical CI workflow
npm ci                    # Install dependencies
npm run typecheck         # Type check
npm run lint              # Lint check
npm run format:check      # Format check
npm run test:run          # Run all tests
npm run test:coverage     # Generate coverage report
```

## Best Practices

1. **Always run tests before committing** - The pre-commit hook does this automatically
2. **Fix linting issues immediately** - Use `npm run lint:fix` for auto-fixes
3. **Maintain test coverage above 80%** - Current coverage is 97.84%
4. **Use meaningful commit messages** - Follow conventional commits format
5. **Don't bypass pre-commit hooks** - They catch issues early

## Troubleshooting

### ESLint parsing errors for test files

If you see parsing errors for test files, ensure:
- `tsconfig.test.json` includes the test directory
- `.eslintrc.js` overrides use `tsconfig.test.json` for test files

### Pre-commit hook not running

Ensure Husky is installed:
```bash
npm run prepare
```

### Tests failing in pre-commit

The hook runs tests related to staged files. If tests fail:
1. Fix the failing tests
2. Stage the fixes
3. Commit again

Or run all tests manually:
```bash
npm run test:run
```

## Maintenance

### Updating Dependencies

Keep tooling dependencies up to date:

```bash
npm update --save-dev eslint prettier jest husky lint-staged
```

### Adjusting Coverage Thresholds

Edit `jest.config.js` to adjust coverage thresholds if needed.

### Adding New Linting Rules

Edit `.eslintrc.js` to add or modify linting rules.
