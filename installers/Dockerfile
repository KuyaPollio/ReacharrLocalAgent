FROM node:18-alpine

LABEL maintainer="Reacharr Team <support@reacharr.com>"
LABEL description="Reacharr Local Agent - Connect your media servers to Reacharr cloud"

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --only=production && \
    npm cache clean --force

# Copy application code
COPY dist/ ./dist/
COPY config/ ./config/

# Create data directory
RUN mkdir -p /app/data

# Set up non-root user
RUN addgroup -g 1001 -S reacharr && \
    adduser -S reacharr -u 1001

# Change ownership
RUN chown -R reacharr:reacharr /app
USER reacharr

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js

EXPOSE 3000

CMD ["node", "dist/index.js"]
