#!/bin/bash

# Download the production CA certificate for local agent DEVELOPMENT
# NOTE: For production use, download the pre-built Docker images which have 
#       certificates already embedded via GitHub Actions workflow.
#
# This script is primarily for developers running the local agent from source.

set -e

CERTS_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERTS_DIR"

echo "🚧 DEVELOPMENT MODE: Downloading production CA certificate from reacharr.com..."
echo ""
echo "💡 For production use:"
echo "   - Download pre-built Docker images from GitHub releases"
echo "   - Certificates are automatically embedded during build process"
echo "   - No manual certificate download required"
echo ""

# Download the CA certificate from your production server via HTTPS
curl -sS -o "$CERTS_DIR/ca.crt" "https://reacharr.com/mqtt/ca.crt" || {
    echo "❌ Failed to download CA certificate from reacharr.com"
    echo ""
    echo "💡 Alternatives:"
    echo "   1. Try HTTP: curl -o certs/ca.crt http://reacharr.com/mqtt/ca.crt"
    echo "   2. Manual copy: scp user@reacharr.com:/path/to/reacharr/mqtt/config/ca.crt certs/"
    echo "   3. Use pre-built Docker images (recommended for production)"
    echo ""
    exit 1
}

# Verify the certificate is valid
if openssl x509 -in "$CERTS_DIR/ca.crt" -noout -text > /dev/null 2>&1; then
    echo "✅ Production CA certificate downloaded and verified!"
    echo "📁 Saved to: $CERTS_DIR/ca.crt"
    echo "🔒 Local agent can now connect securely to mqtts://reacharr.com:8883"
    
    # Show certificate details
    echo ""
    echo "📋 Certificate details:"
    openssl x509 -in "$CERTS_DIR/ca.crt" -noout -subject -dates
    echo ""
    echo "🎯 For development: You can now run 'docker-compose up -d'"
    echo "🏭 For production: Use pre-built images instead"
else
    echo "❌ Downloaded file is not a valid certificate"
    rm -f "$CERTS_DIR/ca.crt"
    exit 1
fi 