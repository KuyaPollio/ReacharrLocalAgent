#!/bin/bash

# Reacharr Local Agent Installer for Linux/macOS
# Run with: curl -sSL https://install.reacharr.com | bash

VERSION="1.0.0"
INSTALL_DIR="/opt/reacharr-agent"
SERVICE_NAME="reacharr-agent"
USER_INSTALL=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    INSTALL_DIR="/usr/local/reacharr-agent"
else
    echo -e "${RED}❌ Unsupported OS: $OSTYPE${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Reacharr Local Agent Installer v$VERSION${NC}"
echo -e "${BLUE}Platform: $OS${NC}"

# Check for root privileges
if [[ $EUID -eq 0 ]]; then
    echo -e "${GREEN}✅ Running with root privileges${NC}"
    USER_INSTALL=false
else
    echo -e "${YELLOW}⚠️  Running without root privileges - installing to user directory${NC}"
    INSTALL_DIR="$HOME/.local/reacharr-agent"
    USER_INSTALL=true
fi

# Create installation directory
echo -e "${YELLOW}📁 Creating installation directory: $INSTALL_DIR${NC}"
mkdir -p "$INSTALL_DIR"

# Download and extract
DOWNLOAD_URL="https://github.com/reacharr/releases/latest/download/reacharr-agent-${OS}-v${VERSION}.zip"
TEMP_ZIP="/tmp/reacharr-agent.zip"

echo -e "${YELLOW}📥 Downloading Reacharr Agent...${NC}"
if command -v curl &> /dev/null; then
    curl -L "$DOWNLOAD_URL" -o "$TEMP_ZIP"
elif command -v wget &> /dev/null; then
    wget "$DOWNLOAD_URL" -O "$TEMP_ZIP"
else
    echo -e "${RED}❌ Neither curl nor wget found. Please install one of them.${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Extracting files...${NC}"
if command -v unzip &> /dev/null; then
    unzip -q "$TEMP_ZIP" -d "$INSTALL_DIR"
else
    echo -e "${RED}❌ unzip command not found. Please install unzip.${NC}"
    exit 1
fi

rm "$TEMP_ZIP"

# Set permissions
chmod +x "$INSTALL_DIR"/*.sh
chmod +x "$INSTALL_DIR/reacharr-agent-$OS"

# Create configuration
if [[ ! -f "$INSTALL_DIR/.env" ]]; then
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    echo -e "${GREEN}📝 Created configuration file: $INSTALL_DIR/.env${NC}"
fi

# Install service
if [[ "$USER_INSTALL" == false && "$OS" == "linux" ]]; then
    echo -e "${YELLOW}🔧 Installing systemd service...${NC}"
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Reacharr Local Agent
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
ExecStart=$INSTALL_DIR/reacharr-agent-$OS
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    
    echo -e "${GREEN}✅ Service installed and enabled${NC}"
    
elif [[ "$USER_INSTALL" == false && "$OS" == "macos" ]]; then
    echo -e "${YELLOW}🔧 Installing launchd service...${NC}"
    
    cat > /Library/LaunchDaemons/com.reacharr.agent.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.reacharr.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/reacharr-agent-$OS</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/reacharr-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/reacharr-agent.error.log</string>
</dict>
</plist>
EOF

    launchctl load /Library/LaunchDaemons/com.reacharr.agent.plist
    echo -e "${GREEN}✅ Service installed and loaded${NC}"
fi

# Create convenient commands
if [[ "$USER_INSTALL" == false ]]; then
    # System-wide installation
    cat > /usr/local/bin/reacharr-agent << 'EOF'
#!/bin/bash
case "$1" in
    start)
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            systemctl start reacharr-agent
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            launchctl load /Library/LaunchDaemons/com.reacharr.agent.plist
        fi
        ;;
    stop)
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            systemctl stop reacharr-agent
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            launchctl unload /Library/LaunchDaemons/com.reacharr.agent.plist
        fi
        ;;
    status)
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            systemctl status reacharr-agent
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            launchctl list | grep reacharr
        fi
        ;;
    logs)
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            journalctl -u reacharr-agent -f
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            tail -f /var/log/reacharr-agent.log
        fi
        ;;
    config)
        ${EDITOR:-nano} "$INSTALL_DIR/.env"
        ;;
    *)
        echo "Usage: reacharr-agent {start|stop|status|logs|config}"
        ;;
esac
EOF
    chmod +x /usr/local/bin/reacharr-agent
fi

echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${WHITE}1. Configure the agent: $INSTALL_DIR/.env${NC}"
echo -e "${WHITE}2. Add Firebase service account: $INSTALL_DIR/firebase-service-account.json${NC}"

if [[ "$USER_INSTALL" == false ]]; then
    echo -e "${WHITE}3. Start the service:${NC}"
    if [[ "$OS" == "linux" ]]; then
        echo -e "${WHITE}   systemctl start reacharr-agent${NC}"
    elif [[ "$OS" == "macos" ]]; then
        echo -e "${WHITE}   launchctl load /Library/LaunchDaemons/com.reacharr.agent.plist${NC}"
    fi
    echo ""
    echo -e "${BLUE}Quick Commands:${NC}"
    echo -e "${WHITE}  reacharr-agent start   - Start the agent${NC}"
    echo -e "${WHITE}  reacharr-agent stop    - Stop the agent${NC}"
    echo -e "${WHITE}  reacharr-agent status  - Check status${NC}"
    echo -e "${WHITE}  reacharr-agent logs    - View logs${NC}"
    echo -e "${WHITE}  reacharr-agent config  - Edit configuration${NC}"
else
    echo -e "${WHITE}3. Run manually: $INSTALL_DIR/start.sh${NC}"
fi

echo ""
echo -e "${YELLOW}Documentation: https://docs.reacharr.com${NC}"
echo -e "${YELLOW}Support: https://discord.gg/reacharr${NC}"
