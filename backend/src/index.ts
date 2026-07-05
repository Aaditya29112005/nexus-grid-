import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PORT } from './config';
import { initRedis } from './services/redis';
import { registerSocketHandlers } from './socket/handlers';
import { apiRouter } from './controllers/api';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Setup Socket.IO with CORS
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API router mount
  app.use('/api', apiRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  try {
    // Connect to Redis and Seed/Cache Board State
    await initRedis();

    // Register WebSockets handlers
    registerSocketHandlers(io);

    // Start listening
    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Fatal server startup error:', error);
    process.exit(1);
  }
}

startServer();
