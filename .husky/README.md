# Git Hooks

This directory contains Git hooks managed by Husky.

## Pre-commit Hook

The pre-commit hook runs automatically before each commit and performs:

1. **Linting** - Runs ESLint with auto-fix on staged files
2. **Formatting** - Runs Prettier to format staged files
3. **Testing** - Runs tests related to staged files

This ensures code quality and prevents broken code from being committed.

## Bypassing Hooks

In rare cases where you need to bypass the pre-commit hook:

```bash
git commit --no-verify -m "your message"
```

**Note:** Only bypass hooks when absolutely necessary, as they help maintain code quality.
