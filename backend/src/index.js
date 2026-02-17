import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import routeRoutes from './routes/routeRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Troop API - Sistema de Agendamento de Vans',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      health: '/health'
    }
  });
});

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// Auth routes
app.use('/auth', authRoutes);

// Route routes (van management)
app.use('/routes', routeRoutes);

// Bookings routes
app.use('/bookings', bookingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada' 
  });
});
// Global error handler
app.use(errorMiddleware);

// Start server
async function startServer() {
  try {
    // Conectar ao banco
    await prisma.$connect();
    console.log('✓ Conectado ao banco de dados PostgreSQL');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`✓ Servidor rodando na porta ${PORT}`);
      console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\nEndpoints disponíveis:`);
      console.log(`  - GET  http://localhost:${PORT}/`);
      console.log(`  - GET  http://localhost:${PORT}/health`);
      console.log(`  - POST http://localhost:${PORT}/auth/register`);
      console.log(`  - POST http://localhost:${PORT}/auth/login`);
      console.log(`  - GET  http://localhost:${PORT}/auth/me (protegida)`);
    });
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nEncerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nEncerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
