// Main API server entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { connectDatabase } from '@creatoriq/database';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limiter';

// Routes
import { authRoutes } from './routes/auth';
import { channelRoutes } from './routes/channels';
import { analysisRoutes } from './routes/analysis';
import { userRoutes } from './routes/users';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // You could add database health check here
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message 
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/channels', authMiddleware, channelRoutes);
app.use('/api/analysis', authMiddleware, analysisRoutes);
app.use('/api/users', authMiddleware, userRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Global error handler
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 CreatorIQ API server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
