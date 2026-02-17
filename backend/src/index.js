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

// Basic validation for DATABASE_URL to produce clearer errors early
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('\nMissing required environment variable: DATABASE_URL.');
  console.error('Copy `backend/.env.example` to `backend/.env` and set a valid DATABASE_URL.');
  console.error('Example: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public\n');
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//i.test(dbUrl)) {
  console.error('\nInvalid DATABASE_URL. It must start with "postgresql://" or "postgres://".');
  console.error('Current value appears malformed. Update `backend/.env` or set the environment variable correctly.\n');
  process.exit(1);
}

// Middleware
// Configure CORS to allow the frontend to call this API. Use `FRONTEND_URL` env var if provided.
// Accept both localhost and 127.0.0.1 variants when a single FRONTEND_URL is supplied for developer convenience.
const corsOrigin = process.env.FRONTEND_URL || '*';
let corsOptions;
if (corsOrigin === '*') {
  corsOptions = { origin: '*', credentials: true };
} else {
  // Build a small allowlist including common dev host variants
  const allowed = new Set();
  allowed.add(corsOrigin);
  try {
    const u = new URL(corsOrigin);
    // if host is localhost, also allow 127.0.0.1 on same port/path
    if (u.hostname === 'localhost') {
      const alt = `${u.protocol}//127.0.0.1${u.port ? `:${u.port}` : ''}`;
      allowed.add(alt);
    }
    if (u.hostname === '127.0.0.1') {
      const alt = `${u.protocol}//localhost${u.port ? `:${u.port}` : ''}`;
      allowed.add(alt);
    }
  } catch (e) {
    // ignore URL parsing errors - use raw value only
  }

  corsOptions = {
    origin: function (incomingOrigin, callback) {
      // Allow requests with no origin (e.g. curl, server-to-server)
      if (!incomingOrigin) return callback(null, true);
      if (allowed.has(incomingOrigin)) return callback(null, true);
      // Not allowed
      return callback(new Error('CORS policy: origin not allowed'));
    },
    credentials: true
  };
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(`CORS configured. Allowed origin: ${corsOrigin}`);

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
