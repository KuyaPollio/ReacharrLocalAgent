import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

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
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Basic routes
app.get('/', (req, res) => {
  res.json({ message: 'Reacharr Local Agent', version: '1.0.0' });
});

// Configuration endpoint
app.get('/api/config', (req, res) => {
  // TODO: Load and return agent configuration
  res.json({ configured: false });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Reacharr Local Agent...');
    
    app.listen(PORT, () => {
      console.log(`✅ Agent running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Failed to start agent:', error);
    process.exit(1);
  }
};

startServer(); 