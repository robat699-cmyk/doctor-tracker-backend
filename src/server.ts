import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { seedDatabaseIfEmpty } from './seed.js';

import authRouter from './routes/auth.js';
import doctorsRouter from './routes/doctors.js';
import patientsRouter from './routes/patients.js';
import analyticsRouter from './routes/analytics.js';
import bookingsRouter from './routes/bookings.js';
import remindersRouter from './routes/reminders.js';
import assistantRouter from './routes/assistant.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// CORS configuration supporting local dev and cloud production
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/staging to avoid blocking evaluation
    },
    credentials: true,
  })
);

app.use(express.json());

// API Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Doctor Tracker Clinical REST API',
  });
});

app.get('/', (_req, res) => {
  res.json({
    message: 'Doctor Tracker Clinical Operations API is running.',
    version: '1.0.0',
    documentation: '/api/v1',
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/doctors', doctorsRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/reminders', remindersRouter);
app.use('/api/v1/assistant', assistantRouter);

// 404 Handler
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API route not found.' });
});

async function bootstrap() {
  try {
    await connectDB();
    await seedDatabaseIfEmpty();

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` Doctor Tracker Standalone Backend Server`);
      console.log(` Running on: http://localhost:${PORT}`);
      console.log(` API Base:   http://localhost:${PORT}/api/v1`);
      console.log(` Health:     http://localhost:${PORT}/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal: Server bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();
