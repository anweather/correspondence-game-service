# Technology Stack

## Core Technologies

- **Language**: TypeScript (strict mode enabled)
- **Runtime**: Node.js
- **Web Framework**: Express
- **Testing**: Jest with TypeScript support
- **Image Generation**: SVG.js (or similar SVG library)

## Architecture Pattern

**Hexagonal Architecture (Ports and Adapters)**

The codebase follows hexagonal architecture with clear separation:
- **Domain Layer** (`src/domain`): Core game logic, interfaces, domain models
- **Application Layer** (`src/application`): Service orchestration, use cases
- **Infrastructure Layer** (`src/infrastructure`): Persistence, external services
- **Adapters Layer** (`src/adapters`): REST API controllers, repository implementations

## Development Approach

**Test-Driven Development (TDD)** is mandatory:
1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass
3. **Refactor**: Improve while keeping tests green

## Persistence Strategy

- **Phase 1 (Current)**: In-memory storage with Map-based repositories
- **Phase 2 (Future)**: File-based JSON persistence
- **Phase 3 (Future)**: Database (PostgreSQL/MongoDB)

## Common Commands

```bash
# Install dependencies
npm install

# Run tests (watch mode)
npm test

# Run tests (single run)
npm test -- --run

# Run tests with coverage
npm run test:coverage

# Build TypeScript
npm run build

# Start development server
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

## Code Quality Tools

- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Jest**: Testing framework with coverage reporting
- **Pre-commit hooks**: Automated linting and testing

## Key Dependencies

- `express`: Web framework
- `typescript`: Type safety and compilation
- `jest` + `ts-jest`: Testing framework
- `svg.js` or `node-canvas`: Board rendering
- Development tools: `eslint`, `prettier`, `ts-node`

## TypeScript Configuration

- Strict mode enabled for maximum type safety
- Target: ES2020 or later
- Module: CommonJS (Node.js compatibility)
- Source maps enabled for debugging
- Separate `tsconfig.json` for tests if needed
