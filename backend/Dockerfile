# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including TypeScript
RUN npm install

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy CA certificate for MQTT TLS connection (if available)
COPY certs/ca.crt /app/certs/ca.crt

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S reacharr-agent -u 1001

# Create data directory and set permissions for certs
RUN mkdir -p /app/data && chown reacharr-agent:nodejs /app/data
RUN mkdir -p /app/certs && chown reacharr-agent:nodejs /app/certs

USER reacharr-agent

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/index.js"] 