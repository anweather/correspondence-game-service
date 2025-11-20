# Web Client

React-based web interface for the Async Boardgame Service.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for build tooling and dev server
- **Vitest** for testing
- **React Testing Library** for component testing
- **CSS Modules** for styling

## Development

```bash
# Install dependencies
npm install

# Start development server (with API proxy to localhost:3000)
npm run dev

# Run tests
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Project Structure

```
src/
├── api/              # API client wrapper
├── components/       # React components
│   ├── common/       # Reusable UI components
│   ├── GameList/     # Game list component
│   ├── GameDetail/   # Game detail component
│   ├── PlayerPanel/  # Player impersonation panel
│   └── MoveInput/    # Move input components
├── views/            # Page-level components
├── context/          # React Context providers
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── styles/           # Global styles and CSS variables
├── test/             # Test utilities and setup
└── __tests__/        # Test files
```

## Configuration

- **Vite Config**: `vite.config.ts` - includes API proxy to Express server on port 3000
- **TypeScript**: `tsconfig.app.json` - strict mode enabled
- **Testing**: Vitest with jsdom environment and React Testing Library

## API Proxy

The development server proxies `/api/*` requests to `http://localhost:3000` where the Express backend runs.
