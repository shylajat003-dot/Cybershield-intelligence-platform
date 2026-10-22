import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { env } from './config/env';
import { errorHandler } from './middleware/errorMiddleware';

import authRoutes from './routes/authRoutes';
import threatRoutes from './routes/threatRoutes';
import incidentRoutes from './routes/incidentRoutes';
import vulnerabilityRoutes from './routes/vulnerabilityRoutes';
import assetRoutes from './routes/assetRoutes';
import alertRoutes from './routes/alertRoutes';
import sourceRoutes from './routes/sourceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import miscRoutes from './routes/miscRoutes';
import mitreRoutes from './routes/mitreRoutes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/', authLimiter);

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'CyberShield API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/threats', threatRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/vulnerabilities', vulnerabilityRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mitre', mitreRoutes);
app.use('/api', miscRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Global error handler
app.use(errorHandler);

export default app;
