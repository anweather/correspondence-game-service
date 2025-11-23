module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/games'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'games/**/*.ts',
    'games/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!games/**/*.d.ts',
    '!games/**/*.test.ts',
    '!games/**/*.test.tsx',
    '!games/**/*.spec.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@adapters/(.*)$': '<rootDir>/src/adapters/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@games/tic-tac-toe/shared$': '<rootDir>/games/tic-tac-toe/shared',
    '^@games/tic-tac-toe/engine$': '<rootDir>/games/tic-tac-toe/engine',
    '^@games/tic-tac-toe/ui$': '<rootDir>/games/tic-tac-toe/ui',
    '^@games/(.*)$': '<rootDir>/games/$1'
  },
  verbose: true
};
