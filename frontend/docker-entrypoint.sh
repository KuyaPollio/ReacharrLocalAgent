#!/bin/sh

# Set default backend URL if not provided
BACKEND_URL=${BACKEND_URL:-http://agent:3000}

echo "🔧 Configuring nginx with BACKEND_URL: $BACKEND_URL"

# Copy CA certificate if available (for MQTT TLS connection)
if [ -f "/tmp/certs/ca.crt" ]; then
    echo "📜 Copying CA certificate for MQTT TLS connection..."
    cp /tmp/certs/ca.crt /usr/share/nginx/html/ca.crt
    echo "✅ CA certificate copied successfully"
else
    echo "ℹ️  No CA certificate found at /tmp/certs/ca.crt - skipping"
fi

# Create nginx config from template by manually replacing the placeholder
cat > /etc/nginx/conf.d/default.conf << EOF
server {
    listen 3000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Increase buffer sizes to handle larger headers
    proxy_buffer_size   128k;
    proxy_buffers   4 256k;
    proxy_busy_buffers_size   256k;
    large_client_header_buffers 4 16k;

    # Handle React Router
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API calls to the agent backend service
    location /api/ {
        proxy_pass $BACKEND_URL/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_cache off;
        proxy_redirect off;
        
        # Additional timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types
        text/plain
        text/css
        text/js
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
}
EOF

echo "✅ Configuration generated successfully. Backend URL: $BACKEND_URL"
echo "📝 Nginx config preview:"
head -20 /etc/nginx/conf.d/default.conf

# Test nginx configuration
nginx -t

# Start nginx in the foreground
echo "🚀 Starting nginx..."
exec nginx -g "daemon off;" 