# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Rebuild better-sqlite3 for Alpine
RUN npm rebuild better-sqlite3

# Copy built application
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/main.js"]
