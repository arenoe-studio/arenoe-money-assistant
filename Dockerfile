
FROM node:20-slim AS builder

WORKDIR /app

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

# Environment configuration
ENV NODE_ENV=production
ENV PORT=8000

# Expose the port for the platform
EXPOSE 8000

# Start the bot
CMD ["npm", "run", "start"]
