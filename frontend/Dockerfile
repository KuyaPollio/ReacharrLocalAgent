# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy CA certificate if it exists (using shell in RUN command)
COPY . /tmp/build-context/
RUN mkdir -p /tmp/certs && \
    if [ -f /tmp/build-context/certs/ca.crt ]; then \
        cp /tmp/build-context/certs/ca.crt /tmp/certs/ca.crt; \
        echo "CA certificate found and staged for copying"; \
    else \
        echo "No CA certificate found - will skip"; \
    fi && \
    rm -rf /tmp/build-context

# Expose port 3000
EXPOSE 3000

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"] 