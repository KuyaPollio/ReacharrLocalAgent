import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import agentRoutes from './routes/agentRoutes';
import localAgentMQTTService from './services/mqttClientService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));

// Logging middleware
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    hasPersistedConfig: localAgentMQTTService.hasPersistedConfig(),
    configPath: localAgentMQTTService.getConfigPath()
  });
});

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Reacharr Local Agent Backend', 
    version: '1.0.0',
    endpoints: ['/health', '/api/*'],
    hasPersistedConfig: localAgentMQTTService.hasPersistedConfig()
  });
});

// API routes
app.use('/api', agentRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Endpoint ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Reacharr Local Agent Backend...');
    
    // Check for persisted configuration
    const hasConfig = localAgentMQTTService.hasPersistedConfig();
    const configPath = localAgentMQTTService.getConfigPath();
    
    console.log(`📁 Configuration file: ${configPath}`);
    console.log(`🔧 Persisted configuration available: ${hasConfig ? 'Yes' : 'No'}`);
    
    if (hasConfig) {
      const config = await localAgentMQTTService.getPersistedConfig();
      if (config) {
        console.log(`🤖 Agent ID: ${config.agentId}`);
        console.log(`🎬 Radarr configured: ${config.radarrUrl ? 'Yes' : 'No'}`);
        console.log(`📺 Sonarr configured: ${config.sonarrUrl ? 'Yes' : 'No'}`);
      }
    } else {
      console.log('⚠️ No configuration found. Agent needs to be configured via API.');
    }
    
    app.listen(PORT, () => {
      console.log(`✅ Backend running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3001'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start backend:', error);
    process.exit(1);
  }
};

startServer(); 