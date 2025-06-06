import mqtt from 'mqtt';
import { EventEmitter } from 'events';
import radarrService from './radarrService';
import sonarrService from './sonarrService';
import configService, { AgentConfig } from './configService';

interface ServiceTestResult {
  success: boolean;
  message: string;
  version?: string;
}

interface MQTTCredentials {
  username: string;
  password: string;
  brokerUrl: string;
}

interface ServerCommand {
  command?: string;
  action?: string;
  service?: string;
  data: any;
  timestamp: number;
  requestId: string;
}

class LocalAgentMQTTService extends EventEmitter {
  private client: mqtt.MqttClient | null = null;
  private credentials: MQTTCredentials | null = null;
  private config: AgentConfig | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private dataCollectionInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    
    // Attempt to load configuration on startup
    this.loadPersistedConfig();
  }

  // Load persisted configuration and initialize services
  private async loadPersistedConfig(): Promise<void> {
    try {
      const savedConfig = await configService.loadConfig();
      if (savedConfig) {
        this.config = savedConfig;
        console.log('🔧 Loaded persisted configuration for agent:', savedConfig.agentId);
        
        // Initialize services with saved configuration
        if (savedConfig.radarrUrl && savedConfig.radarrApiKey) {
          radarrService.initialize({
            url: savedConfig.radarrUrl,
            apiKey: savedConfig.radarrApiKey
          });
          console.log('🎬 Radarr service initialized from persisted config');
        }

        if (savedConfig.sonarrUrl && savedConfig.sonarrApiKey) {
          sonarrService.initialize({
            url: savedConfig.sonarrUrl,
            apiKey: savedConfig.sonarrApiKey
          });
          console.log('📺 Sonarr service initialized from persisted config');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load persisted configuration:', error);
    }
  }

  // Initialize MQTT client with credentials and agent config
  async initialize(credentials: MQTTCredentials, config: AgentConfig): Promise<void> {
    this.credentials = credentials;
    this.config = config;

    // Save configuration to disk for persistence
    try {
      await configService.saveConfig(config);
      console.log('💾 Agent configuration saved to disk');
    } catch (error) {
      console.error('❌ Failed to save configuration to disk:', error);
    }

    // Initialize Radarr and Sonarr services if configured
    if (config.radarrUrl && config.radarrApiKey) {
      radarrService.initialize({
        url: config.radarrUrl,
        apiKey: config.radarrApiKey
      });
      console.log('🎬 Radarr service initialized');
    }

    if (config.sonarrUrl && config.sonarrApiKey) {
      sonarrService.initialize({
        url: config.sonarrUrl,
        apiKey: config.sonarrApiKey
      });
      console.log('📺 Sonarr service initialized');
    }

    // Connect to MQTT broker
    await this.connect();
    this.startDataCollection();
  }

  // Connect to MQTT broker
  private async connect(): Promise<void> {
    if (!this.credentials || !this.config) {
      throw new Error('MQTT credentials and config not set');
    }

    try {
      this.client = mqtt.connect(this.credentials.brokerUrl, {
        username: this.credentials.username,
        password: this.credentials.password,
        clientId: `reacharr-agent-${this.config.agentId}-${Date.now()}`,
        clean: true,
        reconnectPeriod: 30000,
        connectTimeout: 30000,
      });

      this.setupEventHandlers();
      await this.waitForConnection();
      
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  // Setup MQTT event handlers
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('✅ Agent connected to MQTT broker');
      this.isConnected = true;
      this.subscribeToTopics();
      this.sendStatusUpdate('online');
      this.emit('connected');
    });

    this.client.on('disconnect', () => {
      console.log('⚠️ Agent disconnected from MQTT broker');
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT error:', error);
      this.emit('error', error);
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('reconnect', () => {
      console.log('🔄 Agent reconnecting to MQTT broker...');
      this.emit('reconnecting');
    });
  }

  // Subscribe to relevant topics for this agent
  private subscribeToTopics(): void {
    if (!this.client || !this.isConnected || !this.config) return;

    const topics = [
      `reacharr/agents/${this.config.agentId}/commands`,
      'reacharr/server/broadcast',
    ];

    topics.forEach(topic => {
      this.client!.subscribe(topic, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`📡 Subscribed to ${topic}`);
        }
      });
    });
  }

  // Handle incoming MQTT messages
  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      
      if (topic.includes('/commands')) {
        this.handleServerCommand(payload);
      } else if (topic.includes('/broadcast')) {
        this.handleBroadcastMessage(payload);
      }
      
    } catch (error) {
      console.error('Failed to parse MQTT message:', error);
    }
  }

  // Handle commands from server
  private async handleServerCommand(command: ServerCommand): Promise<void> {
    const commandType = command.command || command.action || 'unknown';
    console.log(`📨 Received command: ${commandType}`);
    
    try {
      let response: any = {};

      switch (commandType) {
        case 'status':
          response = await this.getAgentStatus();
          break;
          
        case 'get-data':
          response = await this.getData(command.data.service, command.data.endpoint);
          break;
          
        case 'test-connection':
          response = await this.testConnections();
          break;
          
        case 'update-config':
          response = await this.updateConfig(command.data);
          break;

        case 'collect-radarr-data':
          response = await this.collectRadarrData();
          break;

        case 'collect-sonarr-data':
          response = await this.collectSonarrData();
          break;

        case 'force-sync':
          response = await this.forceSyncAllData();
          break;

        case 'add_item':
          response = await this.addItemToService(command);
          break;

        case 'get_server_config':
          response = await this.getServerConfig(command.service || command.data.service);
          break;

        case 'get_server_info':
          response = await this.getServerInfo(command.data);
          break;
          
        default:
          response = { error: `Unknown command: ${commandType}` };
      }

      // Send response back to server
      await this.sendResponse(command.requestId, commandType, response);
      
    } catch (error) {
      console.error(`Error handling command ${commandType}:`, error);
      await this.sendResponse(command.requestId, commandType, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Handle broadcast messages from server
  private handleBroadcastMessage(message: any): void {
    console.log(`📢 Received broadcast: ${message.type || 'unknown'}`);
    
    switch (message.type) {
      case 'shutdown':
        console.log('🛑 Shutdown command received');
        this.emit('shutdown');
        break;
        
      case 'update':
        console.log('🔄 Update command received');
        this.emit('update', message.data);
        break;
        
      case 'config-refresh':
        console.log('⚙️ Config refresh requested');
        this.emit('config-refresh');
        break;

      case 'force-data-sync':
        console.log('🔄 Force data sync requested');
        this.forceSyncAllData();
        break;
    }
  }

  // Start periodic data collection and status updates
  private startDataCollection(): void {
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
    }

    // Send initial status
    this.sendStatusUpdate('online');

    // Collect and send data every 30 seconds
    this.dataCollectionInterval = setInterval(async () => {
      if (this.isConnected) {
        try {
          // Send status update as heartbeat
          await this.sendStatusUpdate('online');
          
          // Collect and send service data
          await this.collectAndSendAllData();
        } catch (error) {
          console.error('Failed to collect and send data:', error);
        }
      }
    }, 30000); // 30 seconds

    console.log('🔄 Started periodic data collection (30s interval)');
  }

  // Collect and send all data
  private async collectAndSendAllData(): Promise<void> {
    console.log('📊 Starting periodic data collection...');

    const promises: Promise<any>[] = [];

    // Collect Radarr data if configured
    if (radarrService.isConfigured()) {
      promises.push(this.collectRadarrData());
      // Also send TMDB IDs for efficient collection updates
      promises.push(this.sendRadarrTMDBIds());
      // Send server configuration
      promises.push(this.sendRadarrServerConfig());
    }

    // Collect Sonarr data if configured
    if (sonarrService.isConfigured()) {
      promises.push(this.collectSonarrData());
      // Also send TMDB/TVDB IDs for efficient collection updates
      promises.push(this.sendSonarrTMDBIds());
      // Send server configuration
      promises.push(this.sendSonarrServerConfig());
    }

    await Promise.allSettled(promises);
    console.log('✅ Periodic data collection completed');
  }

  // Collect Radarr data and send to server
  private async collectRadarrData(): Promise<any> {
    try {
      console.log('📡 Collecting Radarr data...');
      const data = await radarrService.getComprehensiveData();
      await this.sendData('radarr', 'comprehensive', data);
      console.log('✅ Radarr data sent to server');
      return { success: true, dataPoints: Object.keys(data).length };
    } catch (error) {
      console.error('❌ Failed to collect Radarr data:', error);
      throw error;
    }
  }

  // Collect Sonarr data and send to server
  private async collectSonarrData(): Promise<any> {
    try {
      console.log('📡 Collecting Sonarr data...');
      const data = await sonarrService.getComprehensiveData();
      await this.sendData('sonarr', 'comprehensive', data);
      console.log('✅ Sonarr data sent to server');
      return { success: true, dataPoints: Object.keys(data).length };
    } catch (error) {
      console.error('❌ Failed to collect Sonarr data:', error);
      throw error;
    }
  }

  // Force sync all data immediately
  private async forceSyncAllData(): Promise<any> {
    try {
      console.log('🔄 Force syncing all data...');
      await this.collectAndSendAllData();
      return { success: true, message: 'All data synced successfully' };
    } catch (error) {
      console.error('❌ Failed to force sync data:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Send status update to server
  async sendStatusUpdate(status: 'online' | 'offline' | 'error', details?: any): Promise<void> {
    if (!this.isConnected || !this.client || !this.config) return;

    // Get real-time service status
    const radarrStatus: ServiceTestResult | null = radarrService.isConfigured() ? 
      await radarrService.testConnection().catch((): ServiceTestResult => ({ success: false, message: 'Connection failed' })) : null;
    const sonarrStatus: ServiceTestResult | null = sonarrService.isConfigured() ? 
      await sonarrService.testConnection().catch((): ServiceTestResult => ({ success: false, message: 'Connection failed' })) : null;

    const topic = `reacharr/agents/${this.config.agentId}/status`;
    const message = {
      agentId: this.config.agentId,
      timestamp: Date.now(),
      services: {
        radarr: this.config.radarrUrl ? {
          status: radarrStatus?.success ? 'connected' : 'disconnected',
          name: 'Radarr',
          message: radarrStatus?.success ? 'Service is running' : 'Service offline or unreachable',
          version: radarrStatus?.version,
          lastCheck: new Date().toISOString(),
          url: this.config.radarrUrl
        } : undefined,
        sonarr: this.config.sonarrUrl ? {
          status: sonarrStatus?.success ? 'connected' : 'disconnected',
          name: 'Sonarr',
          message: sonarrStatus?.success ? 'Service is running' : 'Service offline or unreachable',
          version: sonarrStatus?.version,
          lastCheck: new Date().toISOString(),
          url: this.config.sonarrUrl
        } : undefined,
        mqtt: {
          status: 'connected',
          name: 'Remote MQTT',
          message: 'Connected to remote server',
          lastCheck: new Date().toISOString()
        }
      },
      ...details
    };

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(message), (err) => {
        if (err) {
          console.error('Failed to send status update:', err);
          reject(err);
        } else {
          console.log(`📤 Sent status update: ${status}`);
          resolve();
        }
      });
    });
  }

  // Send response to server command
  async sendResponse(requestId: string, command: string, data: any): Promise<void> {
    if (!this.isConnected || !this.client || !this.config) return;

    const topic = `reacharr/agents/${this.config.agentId}/response`;
    const message = {
      requestId,
      command,
      data,
      timestamp: Date.now(),
      agentId: this.config.agentId
    };

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(message), (err) => {
        if (err) {
          console.error('Failed to send response:', err);
          reject(err);
        } else {
          console.log(`📤 Sent response for command: ${command}`);
          resolve();
        }
      });
    });
  }

  // Send data to server
  async sendData(service: 'radarr' | 'sonarr', endpoint: string, data: any): Promise<void> {
    if (!this.isConnected || !this.client || !this.config) return;

    const topic = `reacharr/agents/${this.config.agentId}/data/${service}`;
    const message = {
      endpoint,
      data,
      timestamp: Date.now(),
      agentId: this.config.agentId
    };

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, JSON.stringify(message), (err) => {
        if (err) {
          console.error(`Failed to send ${service} data:`, err);
          reject(err);
        } else {
          console.log(`📤 Sent ${service} data for endpoint: ${endpoint}`);
          resolve();
        }
      });
    });
  }

  // Get agent status
  private async getAgentStatus() {
    const radarrStatus: ServiceTestResult | null = radarrService.isConfigured() ? 
      await radarrService.testConnection().catch((): ServiceTestResult => ({ success: false, message: 'Connection failed' })) : null;
    const sonarrStatus: ServiceTestResult | null = sonarrService.isConfigured() ? 
      await sonarrService.testConnection().catch((): ServiceTestResult => ({ success: false, message: 'Connection failed' })) : null;

    return {
      agentId: this.config?.agentId,
      online: this.isConnected,
      timestamp: Date.now(),
      services: {
        radarr: {
          configured: !!this.config?.radarrUrl,
          url: this.config?.radarrUrl,
          connected: radarrStatus?.success || false,
          version: radarrStatus?.version
        },
        sonarr: {
          configured: !!this.config?.sonarrUrl,
          url: this.config?.sonarrUrl,
          connected: sonarrStatus?.success || false,
          version: sonarrStatus?.version
        }
      },
      system: {
        platform: process.platform,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };
  }

  // Get data from Radarr/Sonarr
  private async getData(service: 'radarr' | 'sonarr', endpoint: string) {
    try {
      if (service === 'radarr' && radarrService.isConfigured()) {
        switch (endpoint) {
          case 'movies':
            return await radarrService.getMovies();
          case 'activity':
            return await radarrService.getActivity();
          case 'health':
            return await radarrService.getHealth();
          case 'comprehensive':
            return await radarrService.getComprehensiveData();
          default:
            throw new Error(`Unknown Radarr endpoint: ${endpoint}`);
        }
      } else if (service === 'sonarr' && sonarrService.isConfigured()) {
        switch (endpoint) {
          case 'series':
            return await sonarrService.getSeries();
          case 'activity':
            return await sonarrService.getActivity();
          case 'health':
            return await sonarrService.getHealth();
          case 'comprehensive':
            return await sonarrService.getComprehensiveData();
          default:
            throw new Error(`Unknown Sonarr endpoint: ${endpoint}`);
        }
      } else {
        throw new Error(`Service ${service} not configured`);
      }
    } catch (error) {
      console.error(`Failed to get ${service} data from ${endpoint}:`, error);
      throw error;
    }
  }

  // Test connections to Radarr/Sonarr
  private async testConnections() {
    const results = {
      radarr: false,
      sonarr: false,
      details: {} as any
    };

    if (this.config?.radarrUrl && radarrService.isConfigured()) {
      try {
        const result = await radarrService.testConnection();
        results.radarr = result.success;
        results.details.radarr = result.message;
      } catch (error) {
        results.details.radarr = error instanceof Error ? error.message : 'Connection failed';
      }
    } else {
      results.details.radarr = 'Not configured';
    }

    if (this.config?.sonarrUrl && sonarrService.isConfigured()) {
      try {
        const result = await sonarrService.testConnection();
        results.sonarr = result.success;
        results.details.sonarr = result.message;
      } catch (error) {
        results.details.sonarr = error instanceof Error ? error.message : 'Connection failed';
      }
    } else {
      results.details.sonarr = 'Not configured';
    }

    return results;
  }

  // Update agent configuration
  private async updateConfig(newConfig: Partial<AgentConfig>) {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
      
      // Save updated configuration to disk
      try {
        await configService.saveConfig(this.config);
        console.log('💾 Updated configuration saved to disk');
      } catch (error) {
        console.error('❌ Failed to save updated configuration to disk:', error);
      }
      
      console.log('⚙️ Agent configuration updated');

      // Reinitialize services if URLs or API keys changed
      if (newConfig.radarrUrl || newConfig.radarrApiKey) {
        if (this.config.radarrUrl && this.config.radarrApiKey) {
          radarrService.initialize({
            url: this.config.radarrUrl,
            apiKey: this.config.radarrApiKey
          });
          console.log('🎬 Radarr service reinitialized');
        }
      }

      if (newConfig.sonarrUrl || newConfig.sonarrApiKey) {
        if (this.config.sonarrUrl && this.config.sonarrApiKey) {
          sonarrService.initialize({
            url: this.config.sonarrUrl,
            apiKey: this.config.sonarrApiKey
          });
          console.log('📺 Sonarr service reinitialized');
        }
      }

      return { success: true, config: this.config };
    }
    return { success: false, error: 'No existing config to update' };
  }

  // Wait for connection to be established
  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('MQTT connection timeout'));
      }, 30000);

      this.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // Check if client is connected
  isClientConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  // Disconnect from MQTT broker
  async disconnect(): Promise<void> {
    // Stop data collection
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Send offline status before disconnecting
    await this.sendStatusUpdate('offline').catch(() => {});

    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.end(true, () => {
          console.log('🔌 Agent disconnected from MQTT broker');
          resolve();
        });
      });
      this.client = null;
    }

    this.isConnected = false;
    this.emit('disconnected');
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      agentId: this.config?.agentId,
      credentials: this.credentials ? {
        username: this.credentials.username,
        brokerUrl: this.credentials.brokerUrl
      } : null,
      services: {
        radarr: {
          configured: radarrService.isConfigured(),
          url: this.config?.radarrUrl
        },
        sonarr: {
          configured: sonarrService.isConfigured(),
          url: this.config?.sonarrUrl
        }
      }
    };
  }

  // Get current configuration
  getConfig() {
    return this.config;
  }

  // Check if there's a persisted configuration available
  hasPersistedConfig(): boolean {
    return configService.hasValidConfig();
  }

  // Get the configuration file path (for debugging)
  getConfigPath(): string {
    return configService.getConfigPath();
  }

  // Get persisted configuration without loading into MQTT service
  async getPersistedConfig(): Promise<AgentConfig | null> {
    return await configService.loadConfig();
  }

  // Clear persisted configuration
  async clearPersistedConfig(): Promise<void> {
    await configService.clearConfig();
    console.log('🗑️ Persisted configuration cleared');
  }

  // Save configuration without connecting to MQTT (for development/fallback)
  async saveConfigOnly(config: AgentConfig): Promise<void> {
    this.config = config;
    
    // Save configuration to disk for persistence
    try {
      await configService.saveConfig(config);
      console.log('💾 Configuration saved to disk (MQTT not connected)');
    } catch (error) {
      console.error('❌ Failed to save configuration to disk:', error);
    }
    
    // Initialize Radarr and Sonarr services if configured
    if (config.radarrUrl && config.radarrApiKey) {
      radarrService.initialize({
        url: config.radarrUrl,
        apiKey: config.radarrApiKey
      });
      console.log('🎬 Radarr service initialized');
    }

    if (config.sonarrUrl && config.sonarrApiKey) {
      sonarrService.initialize({
        url: config.sonarrUrl,
        apiKey: config.sonarrApiKey
      });
      console.log('📺 Sonarr service initialized');
    }

    console.log('⚙️ Configuration saved (MQTT not connected)');
  }

  // Send only Radarr TMDB IDs for efficient collection updates
  private async sendRadarrTMDBIds(): Promise<any> {
    try {
      console.log('📡 Collecting Radarr TMDB IDs...');
      const movies = await radarrService.getMovies();
      
      const tmdbData = movies
        .filter(movie => movie.tmdbId && movie.tmdbId > 0)
        .map(movie => ({
          tmdbId: movie.tmdbId,
          imdbId: movie.imdbId,
          title: movie.title,
          year: movie.year,
          monitored: movie.monitored,
          hasFile: movie.hasFile,
          status: movie.status,
          added: movie.added,
          sizeOnDisk: movie.sizeOnDisk || 0
        }));

      await this.sendData('radarr', 'tmdb-ids', {
        movies: tmdbData,
        timestamp: new Date().toISOString(),
        totalCount: tmdbData.length
      });
      
      console.log(`✅ Sent ${tmdbData.length} Radarr TMDB IDs to server`);
      return { success: true, count: tmdbData.length };
    } catch (error) {
      console.error('❌ Failed to send Radarr TMDB IDs:', error);
      throw error;
    }
  }

  // Send only Sonarr TMDB/TVDB IDs for efficient collection updates
  private async sendSonarrTMDBIds(): Promise<any> {
    try {
      console.log('📡 Collecting Sonarr TMDB/TVDB IDs...');
      const series = await sonarrService.getSeries();
      
      const tmdbData = series
        .filter(show => show.tvdbId && show.tvdbId > 0)
        .map(show => ({
          tvdbId: show.tvdbId,
          imdbId: show.imdbId,
          title: show.title,
          year: show.year,
          firstAired: show.firstAired,
          monitored: show.monitored,
          status: show.status,
          ended: show.ended,
          added: show.added,
          seasonCount: show.statistics?.seasonCount || 0,
          episodeCount: show.statistics?.episodeCount || 0,
          episodeFileCount: show.statistics?.episodeFileCount || 0,
          sizeOnDisk: show.statistics?.sizeOnDisk || 0
        }));

      await this.sendData('sonarr', 'tmdb-ids', {
        series: tmdbData,
        timestamp: new Date().toISOString(),
        totalCount: tmdbData.length
      });
      
      console.log(`✅ Sent ${tmdbData.length} Sonarr TMDB/TVDB IDs to server`);
      return { success: true, count: tmdbData.length };
    } catch (error) {
      console.error('❌ Failed to send Sonarr TMDB IDs:', error);
      throw error;
    }
  }

  // Add item to Radarr/Sonarr
  private async addItemToService(command: ServerCommand): Promise<any> {
    try {
      if (command.service === 'radarr' && radarrService.isConfigured()) {
        return await radarrService.addItem(command.data);
      } else if (command.service === 'sonarr' && sonarrService.isConfigured()) {
        return await sonarrService.addItem(command.data);
      } else {
        throw new Error(`Service ${command.service} not configured`);
      }
    } catch (error) {
      console.error(`Failed to add item to ${command.service}:`, error);
      throw error;
    }
  }

  // Get server info
  private async getServerInfo(data: any): Promise<any> {
    try {
      return {
        agentId: this.config?.agentId,
        online: this.isConnected,
        timestamp: Date.now(),
        services: {
          radarr: {
            configured: radarrService.isConfigured(),
            url: this.config?.radarrUrl
          },
          sonarr: {
            configured: sonarrService.isConfigured(),
            url: this.config?.sonarrUrl
          }
        }
      };
    } catch (error) {
      console.error('Failed to get server info:', error);
      throw error;
    }
  }

  // Get server config
  private async getServerConfig(service: string): Promise<any> {
    try {
      if (service === 'radarr' && radarrService.isConfigured()) {
        return await radarrService.getServerConfig();
      } else if (service === 'sonarr' && sonarrService.isConfigured()) {
        return await sonarrService.getServerConfig();
      } else {
        throw new Error(`Service ${service} not configured`);
      }
    } catch (error) {
      console.error('Failed to get server config:', error);
      throw error;
    }
  }

  // Send Radarr server configuration
  private async sendRadarrServerConfig(): Promise<any> {
    try {
      const configResult = await radarrService.getServerConfig();
      // Extract the actual config data from the wrapper
      const config = configResult.success ? configResult.data : null;
      if (!config) {
        throw new Error('Failed to get Radarr server configuration');
      }
      
      await this.sendData('radarr', 'server-config', config);
      console.log('✅ Radarr server configuration sent to server');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send Radarr server configuration:', error);
      throw error;
    }
  }

  // Send Sonarr server configuration
  private async sendSonarrServerConfig(): Promise<any> {
    try {
      const configResult = await sonarrService.getServerConfig();
      // Extract the actual config data from the wrapper
      const config = configResult.success ? configResult.data : null;
      if (!config) {
        throw new Error('Failed to get Sonarr server configuration');
      }
      
      await this.sendData('sonarr', 'server-config', config);
      console.log('✅ Sonarr server configuration sent to server');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send Sonarr server configuration:', error);
      throw error;
    }
  }
}

export const localAgentMQTTService = new LocalAgentMQTTService();
export default localAgentMQTTService; 