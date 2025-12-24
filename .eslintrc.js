module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    jest: true,
    es6: true
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'web-client/',
    '**/scripts/**/*.ts'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off'
  },
  overrides: [
    {
      // Relaxed rules for test files
      files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
      parserOptions: {
        project: './tsconfig.test.json'
      },
      rules: {
        // Allow 'any' type in tests for mocks and test data
        '@typescript-eslint/no-explicit-any': 'off',
        
        // Allow non-null assertions in tests (we control the data)
        '@typescript-eslint/no-non-null-assertion': 'off',
        
        // Allow empty functions in mock implementations
        '@typescript-eslint/no-empty-function': 'off',
        
        // Allow unused expressions (useful for expect().rejects patterns)
        '@typescript-eslint/no-unused-expressions': 'off',
        
        // Relax magic numbers rule (test data often has literal numbers)
        '@typescript-eslint/no-magic-numbers': 'off',
        
        // Allow require statements for dynamic test imports
        '@typescript-eslint/no-var-requires': 'off',
        
        // Allow console in tests for debugging
        'no-console': 'off',
        
        // Allow floating promises in tests (Jest handles them)
        '@typescript-eslint/no-floating-promises': 'off'
      }
    }
  ]
};
