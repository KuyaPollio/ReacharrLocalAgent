import express from 'express';
import { radarrService } from '../services/radarrService';
import { sonarrService } from '../services/sonarrService';
import { localAgentMQTTService } from '../services/mqttClientService';

const router = express.Router();

// Test Radarr connection
router.post('/test-radarr', async (req, res) => {
  try {
    const { url, apiKey } = req.body;

    if (!url || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'URL and API key are required'
      });
    }

    // Initialize Radarr service temporarily for testing
    radarrService.initialize({ url, apiKey });
    
    // Test the connection
    const result = await radarrService.testConnection();
    
    res.json(result);
  } catch (error) {
    console.error('Test Radarr connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Radarr connection'
    });
  }
});

// Test Sonarr connection
router.post('/test-sonarr', async (req, res) => {
  try {
    const { url, apiKey } = req.body;

    if (!url || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'URL and API key are required'
      });
    }

    // Initialize Sonarr service temporarily for testing
    sonarrService.initialize({ url, apiKey });
    
    // Test the connection
    const result = await sonarrService.testConnection();
    
    res.json(result);
  } catch (error) {
    console.error('Test Sonarr connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Sonarr connection'
    });
  }
});

// Configure agent with Firebase authentication
router.post('/agent/configure', async (req, res) => {
  try {
    const config = req.body;

    // Validate configuration
    if (!config.agentId) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID is required'
      });
    }

    // Validate that the agent ID follows the user-specific format
    if (!config.agentId.includes('_')) {
      return res.status(400).json({
        success: false,
        message: 'Agent ID must be in format: {userId}_{agentIdentifier}'
      });
    }

    // Check that at least one service is configured
    const hasRadarr = config.radarrUrl && config.radarrApiKey;
    const hasSonarr = config.sonarrUrl && config.sonarrApiKey;

    if (!hasRadarr && !hasSonarr) {
      return res.status(400).json({
        success: false,
        message: 'At least one service (Radarr or Sonarr) must be configured'
      });
    }

    // Initialize services first (this always works)
    if (hasRadarr) {
      radarrService.initialize({
        url: config.radarrUrl,
        apiKey: config.radarrApiKey
      });
    }

    if (hasSonarr) {
      sonarrService.initialize({
        url: config.sonarrUrl,
        apiKey: config.sonarrApiKey
      });
    }

    let mqttStatus = 'not_attempted';
    let mqttMessage = 'MQTT connection not attempted in development mode';

    // Try to get MQTT credentials and initialize (but don't fail if it doesn't work)
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
      
      const mqttCredentials = await getMQTTCredentials(config.agentId, token);
      
      if (mqttCredentials) {
        try {
          await localAgentMQTTService.initialize(mqttCredentials, config);
          mqttStatus = 'connected';
          mqttMessage = 'Successfully connected to remote MQTT server';
        } catch (mqttError) {
          console.warn('MQTT initialization failed (this is expected in development):', mqttError);
          mqttStatus = 'failed';
          mqttMessage = 'MQTT connection failed - agent will work locally without remote features';
          
          // Still save the config to the MQTT service so it can be retrieved
          try {
            await localAgentMQTTService.saveConfigOnly(config);
          } catch (configSaveError) {
            console.warn('Failed to save config to MQTT service:', configSaveError);
          }
        }
      } else {
        mqttStatus = 'no_credentials';
        mqttMessage = 'Could not obtain MQTT credentials';
      }
    } catch (credentialsError) {
      console.warn('Failed to get MQTT credentials (this is expected in development):', credentialsError);
      mqttStatus = 'no_credentials';
      mqttMessage = 'MQTT credentials unavailable - agent will work locally';
    }

    // Always return success if the basic configuration is valid
    res.json({
      success: true,
      message: 'Agent configured successfully',
      mqtt: {
        status: mqttStatus,
        message: mqttMessage
      },
      services: {
        radarr: hasRadarr ? 'configured' : 'not_configured',
        sonarr: hasSonarr ? 'configured' : 'not_configured'
      }
    });

  } catch (error) {
    console.error('Configure agent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure agent'
    });
  }
});

// Get agent status
router.get('/agent/status', async (req, res) => {
  try {
    const status = localAgentMQTTService.getStatus();
    
    // Get current connection status for services
    let radarrConnected = false;
    let sonarrConnected = false;
    let radarrVersion: string | undefined = undefined;
    let sonarrVersion: string | undefined = undefined;
    
    // Test connections if services are configured
    if (status.services?.radarr?.configured) {
      try {
        const radarrTest = await radarrService.testConnection();
        radarrConnected = radarrTest.success;
        radarrVersion = radarrTest.version;
      } catch (error) {
        radarrConnected = false;
      }
    }
    
    if (status.services?.sonarr?.configured) {
      try {
        const sonarrTest = await sonarrService.testConnection();
        sonarrConnected = sonarrTest.success;
        sonarrVersion = sonarrTest.version;
      } catch (error) {
        sonarrConnected = false;
      }
    }
    
    // Transform the status to match the frontend interface
    const transformedStatus = {
      agentId: status.agentId || 'unknown',
      online: status.connected,
      timestamp: Date.now(),
      services: {
        radarr: {
          name: 'Radarr',
          status: radarrConnected ? 'connected' : (status.services?.radarr?.configured ? 'disconnected' : 'unknown'),
          message: radarrConnected ? 'Service is running' : (status.services?.radarr?.configured ? 'Service offline or unreachable' : 'Service not configured'),
          version: radarrVersion,
          lastCheck: new Date().toISOString(),
          url: status.services?.radarr?.url
        },
        sonarr: {
          name: 'Sonarr',
          status: sonarrConnected ? 'connected' : (status.services?.sonarr?.configured ? 'disconnected' : 'unknown'),
          message: sonarrConnected ? 'Service is running' : (status.services?.sonarr?.configured ? 'Service offline or unreachable' : 'Service not configured'),
          version: sonarrVersion,
          lastCheck: new Date().toISOString(),
          url: status.services?.sonarr?.url
        },
        mqtt: {
          name: 'Remote MQTT',
          status: status.connected ? 'connected' : 'disconnected',
          message: status.connected ? 'Connected to remote server' : 'Not connected to remote server',
          lastCheck: new Date().toISOString()
        }
      }
    };
    
    res.json(transformedStatus);
  } catch (error) {
    console.error('Get agent status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent status'
    });
  }
});

// Get current configuration
router.get('/agent/config', (req, res) => {
  try {
    const config = localAgentMQTTService.getConfig();
    res.json(config || {
      agentId: '',
      radarrUrl: '',
      radarrApiKey: '',
      sonarrUrl: '',
      sonarrApiKey: ''
    });
  } catch (error) {
    console.error('Get agent config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agent configuration'
    });
  }
});

// Get Radarr data
router.get('/radarr/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;

    if (!radarrService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Radarr is not configured'
      });
    }

    let data;
    switch (endpoint) {
      case 'movies':
        data = await radarrService.getMovies();
        break;
      case 'activity':
        data = await radarrService.getActivity();
        break;
      case 'health':
        data = await radarrService.getHealth();
        break;
      case 'status':
        data = await radarrService.getSystemStatus();
        break;
      case 'comprehensive':
        data = await radarrService.getComprehensiveData();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown endpoint: ${endpoint}`
        });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error(`Get Radarr ${req.params.endpoint} error:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to get Radarr ${req.params.endpoint}`
    });
  }
});

// Get Sonarr data
router.get('/sonarr/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;

    if (!sonarrService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Sonarr is not configured'
      });
    }

    let data;
    switch (endpoint) {
      case 'series':
        data = await sonarrService.getSeries();
        break;
      case 'activity':
        data = await sonarrService.getActivity();
        break;
      case 'health':
        data = await sonarrService.getHealth();
        break;
      case 'status':
        data = await sonarrService.getSystemStatus();
        break;
      case 'comprehensive':
        data = await sonarrService.getComprehensiveData();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unknown endpoint: ${endpoint}`
        });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error(`Get Sonarr ${req.params.endpoint} error:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to get Sonarr ${req.params.endpoint}`
    });
  }
});

// Force data sync
router.post('/agent/sync', async (req, res) => {
  try {
    if (!localAgentMQTTService.isClientConnected()) {
      return res.status(400).json({
        success: false,
        message: 'Agent is not connected to server'
      });
    }

    // Trigger immediate data collection
    const results: Array<{
      service: string;
      success: boolean;
      error?: string;
    }> = [];

    if (radarrService.isConfigured()) {
      try {
        const radarrData = await radarrService.getComprehensiveData();
        await localAgentMQTTService.sendData('radarr', 'comprehensive', radarrData);
        results.push({ service: 'radarr', success: true });
      } catch (error) {
        results.push({ service: 'radarr', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    if (sonarrService.isConfigured()) {
      try {
        const sonarrData = await sonarrService.getComprehensiveData();
        await localAgentMQTTService.sendData('sonarr', 'comprehensive', sonarrData);
        results.push({ service: 'sonarr', success: true });
      } catch (error) {
        results.push({ service: 'sonarr', success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    res.json({
      success: true,
      message: 'Data sync completed',
      results
    });

  } catch (error) {
    console.error('Force sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync data'
    });
  }
});

// Get agent configuration status
router.get('/config/status', async (req, res) => {
  try {
    const hasPersistedConfig = localAgentMQTTService.hasPersistedConfig();
    const configPath = localAgentMQTTService.getConfigPath();
    const currentConfig = localAgentMQTTService.getConfig();
    const persistedConfig = await localAgentMQTTService.getPersistedConfig();
    
    res.json({
      hasPersistedConfig,
      configPath,
      currentConfig: currentConfig ? {
        agentId: currentConfig.agentId,
        hasRadarr: !!currentConfig.radarrUrl,
        hasSonarr: !!currentConfig.sonarrUrl
      } : null,
      persistedConfig: persistedConfig ? {
        agentId: persistedConfig.agentId,
        hasRadarr: !!persistedConfig.radarrUrl,
        hasSonarr: !!persistedConfig.sonarrUrl,
        radarrUrl: persistedConfig.radarrUrl,
        sonarrUrl: persistedConfig.sonarrUrl
      } : null
    });
  } catch (error) {
    console.error('Failed to get config status:', error);
    res.status(500).json({ error: 'Failed to get configuration status' });
  }
});

// Clear persisted configuration
router.delete('/config/persisted', async (req, res) => {
  try {
    await localAgentMQTTService.clearPersistedConfig();
    res.json({ message: 'Persisted configuration cleared successfully' });
  } catch (error) {
    console.error('Failed to clear persisted config:', error);
    res.status(500).json({ error: 'Failed to clear persisted configuration' });
  }
});

// Helper function to get MQTT credentials from remote server using Firebase authentication
async function getMQTTCredentials(agentId: string, firebaseToken?: string) {
  try {
    const remoteServerUrl = process.env.REMOTE_SERVER_URL || 'https://reacharr.com';
    
    if (!firebaseToken) {
      console.warn('No Firebase token provided, using fallback MQTT credentials');
      // Fallback to old method for development
      return {
        username: `agent_${agentId}`,
        password: process.env.MQTT_PASSWORD || 'reacharr_agent_password',
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://reacharr.com:1883'
      };
    }

    console.log(`🔑 Requesting MQTT credentials for agent ${agentId} from ${remoteServerUrl}`);

    // Request MQTT credentials from the remote server with Firebase authentication
    const response = await fetch(`${remoteServerUrl}/api/mqtt/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseToken}`
      },
      body: JSON.stringify({
        userType: 'agent',
        agentId: agentId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result && typeof result === 'object' && 'success' in result && result.success && 'credentials' in result && result.credentials) {
      console.log(`✅ Successfully obtained MQTT credentials for agent ${agentId}`);
      return {
        username: (result.credentials as any).username,
        password: (result.credentials as any).password,
        brokerUrl: (result.credentials as any).brokerUrl
      };
    } else {
      throw new Error('Invalid response format from remote server');
    }
    
  } catch (error) {
    console.error('Failed to get MQTT credentials:', error);
    
    // Return fallback credentials for development
    console.warn('Using fallback MQTT credentials');
    return {
      username: `agent_${agentId}`,
      password: process.env.MQTT_PASSWORD || 'reacharr_agent_password',
      brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://reacharr.com:1883'
    };
  }
}

export default router; 