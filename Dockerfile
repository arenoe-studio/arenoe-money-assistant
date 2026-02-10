
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies like tsup)
RUN npm ci

COPY . .

# Build with tsup
RUN npm run build

# --- Production Stage ---
FROM node:20-slim AS runner

WORKDIR /app

COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built assets
COPY --from=builder /app/dist ./dist
# Drizzle migrations might be needed at runtime
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./

# Environment configuration
ENV NODE_ENV=production
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start the bot
CMD ["npm", "run", "start"]
