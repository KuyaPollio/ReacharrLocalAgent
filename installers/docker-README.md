# Reacharr Agent - Docker Setup

## Quick Start with Docker Compose

1. **Download the setup files:**
   ```bash
   curl -L https://github.com/reacharr/local-agent/releases/latest/download/docker-setup.zip -o docker-setup.zip
   unzip docker-setup.zip
   cd reacharr-agent-docker
   ```

2. **Configure the agent:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your configuration
   ```

3. **Add Firebase credentials:**
   - Download `firebase-service-account.json` from Firebase Console
   - Place it in the same directory as `docker-compose.yml`

4. **Start the agent:**
   ```bash
   docker-compose up -d
   ```

## Configuration

### Environment Variables (.env)
```env
# Remote Server Configuration
REMOTE_MQTT_URL=wss://reacharr.com:8883/mqtt
REMOTE_MQTT_USERNAME=your_username
REMOTE_MQTT_PASSWORD=your_password

# Local Services (adjust if in containers)
SONARR_URL=http://sonarr:8989
SONARR_API_KEY=your_sonarr_api_key

RADARR_URL=http://radarr:7878
RADARR_API_KEY=your_radarr_api_key

# Agent Configuration
AGENT_NAME=Docker Agent
AGENT_LOCATION=Docker Host
AGENT_DESCRIPTION=Dockerized Reacharr Agent
```

### Networking

If your Sonarr/Radarr are running in containers:
- Use container names in URLs (e.g., `http://sonarr:8989`)
- Make sure they're on the same Docker network
- Uncomment the services in `docker-compose.yml` if needed

If running on the host:
- Use `host.docker.internal` (Docker Desktop) or host IP
- Example: `http://host.docker.internal:8989`

## Management

### View logs:
```bash
docker-compose logs -f reacharr-agent
```

### Update the agent:
```bash
docker-compose pull
docker-compose up -d
```

### Stop the agent:
```bash
docker-compose down
```

### Reset configuration:
```bash
docker-compose down
docker volume rm reacharr-agent_data
docker-compose up -d
```

## Troubleshooting

### Common Issues

1. **Can't connect to Sonarr/Radarr:**
   - Check if URLs are correct for your setup
   - Verify Docker networking configuration
   - Use `docker network ls` and `docker network inspect` to debug

2. **Permission issues:**
   - Make sure the Firebase service account file is readable
   - Check volume mount permissions

3. **Agent not connecting to Reacharr:**
   - Verify MQTT credentials and URL
   - Check firewall settings
   - Review agent logs for connection errors

### Debug Mode

Run with debug logging:
```bash
echo "LOG_LEVEL=debug" >> .env
docker-compose up -d
docker-compose logs -f reacharr-agent
```

## Security

- The agent runs as non-root user (UID 1001)
- Firebase credentials are mounted read-only
- No privileged access required
- Network access is limited to configured services

## Support

- Documentation: https://docs.reacharr.com
- Discord: https://discord.gg/reacharr
- Issues: https://github.com/reacharr/local-agent/issues
