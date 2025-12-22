# Stage 1: Build backend TypeScript
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy backend package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source code
COPY src ./src

# Copy games directory (needed for @games/* path aliases in tsconfig.json)
COPY games ./games

# Build backend TypeScript
RUN npm run build

# Stage 2: Build web client
FROM node:20-alpine AS web-builder

WORKDIR /app

# Accept Clerk publishable key as build arg
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

# Copy root tsconfig.json (needed by games/*/tsconfig.json extends)
COPY tsconfig.json ./

# Copy web client package files
COPY web-client/package*.json ./web-client/

# Install web client dependencies
RUN cd web-client && npm ci

# Copy web client configuration files
COPY web-client/tsconfig.json web-client/tsconfig.app.json web-client/tsconfig.node.json ./web-client/
COPY web-client/vite.config.ts web-client/index.html ./web-client/

# Copy web client source code
COPY web-client/src ./web-client/src
COPY web-client/public ./web-client/public

# Copy games directory (needed for path aliases in vite.config.ts)
COPY games ./games

# Build web client (Vite will embed VITE_CLERK_PUBLISHABLE_KEY at build time)
RUN cd web-client && npm run build

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy backend package files
COPY package*.json ./
COPY package-lock.json ./

# Install production dependencies and tsconfig-paths together (faster than separate installs)
RUN npm ci --omit=dev --ignore-scripts --prefer-offline && \
    npm install tsconfig-paths --prefer-offline

# Copy built backend artifacts from backend-builder with correct ownership
COPY --from=backend-builder --chown=nodejs:nodejs /app/dist ./dist

# Copy SQL migration files (not compiled by TypeScript, copy from source) with correct ownership
COPY --from=backend-builder --chown=nodejs:nodejs /app/src/infrastructure/persistence/migrations ./dist/src/infrastructure/persistence/migrations

# Create a production tsconfig for path alias resolution
RUN echo '{"compilerOptions":{"baseUrl":"./dist","paths":{"@domain/*":["src/domain/*"],"@application/*":["src/application/*"],"@infrastructure/*":["src/infrastructure/*"],"@adapters/*":["src/adapters/*"],"@games/*":["games/*"]}}}' > tsconfig.json

# Copy built web client artifacts from web-builder with correct ownership
COPY --from=web-builder --chown=nodejs:nodejs /app/web-client/dist ./web-client/dist

# Set ownership for remaining files and switch to non-root user
RUN chown nodejs:nodejs /app/tsconfig.json && \
    chown nodejs:nodejs /app

USER nodejs

# Expose application port
EXPOSE 3000

# Add health check using /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1))"

# Start the application with tsconfig-paths support for path aliases
CMD ["node", "-r", "tsconfig-paths/register", "dist/src/index.js"]
