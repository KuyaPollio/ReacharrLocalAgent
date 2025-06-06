import fs from 'fs';
import path from 'path';

interface AgentConfig {
  agentId: string;
  radarrUrl?: string;
  sonarrUrl?: string;
  radarrApiKey?: string;
  sonarrApiKey?: string;
}

class ConfigService {
  private configPath: string;
  private config: AgentConfig | null = null;

  constructor() {
    // Store config in the user's data directory or fallback to current directory
    const configDir = process.env.CONFIG_DIR || path.join(process.cwd(), 'data');
    
    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    this.configPath = path.join(configDir, 'agent-config.json');
  }

  /**
   * Load configuration from disk
   */
  async loadConfig(): Promise<AgentConfig | null> {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        console.log('📁 Configuration loaded from disk:', this.configPath);
        return this.config;
      } else {
        console.log('📁 No existing configuration file found');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      return null;
    }
  }

  /**
   * Save configuration to disk
   */
  async saveConfig(config: AgentConfig): Promise<void> {
    try {
      this.config = config;
      const configData = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf8');
      console.log('💾 Configuration saved to disk:', this.configPath);
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Update existing configuration
   */
  async updateConfig(partialConfig: Partial<AgentConfig>): Promise<AgentConfig> {
    if (!this.config) {
      // If no existing config, create a new one with a default agentId
      this.config = {
        agentId: partialConfig.agentId || this.generateAgentId(),
        ...partialConfig
      };
    } else {
      this.config = {
        ...this.config,
        ...partialConfig
      };
    }

    await this.saveConfig(this.config);
    return this.config;
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig | null {
    return this.config;
  }

  /**
   * Check if configuration exists and is valid
   */
  hasValidConfig(): boolean {
    return this.config !== null && this.config.agentId !== undefined;
  }

  /**
   * Clear configuration
   */
  async clearConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        fs.unlinkSync(this.configPath);
        console.log('🗑️ Configuration file deleted');
      }
      this.config = null;
    } catch (error) {
      console.error('❌ Failed to clear configuration:', error);
      throw error;
    }
  }

  /**
   * Generate a unique agent ID
   */
  private generateAgentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `agent-${timestamp}-${random}`;
  }

  /**
   * Get config file path (for debugging)
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

export const configService = new ConfigService();
export default configService;
export { AgentConfig }; 