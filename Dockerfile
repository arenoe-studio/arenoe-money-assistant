
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm (optional, but we use npm here per user fallback)
# We will use npm ci for consistency

COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies for build
RUN npm ci

COPY . .

# Build TypeScript
RUN npm run build

# --- Production Stage ---
FROM node:20-slim AS runner

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

# Environment variables should be passed by the platform
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "run", "start"]
