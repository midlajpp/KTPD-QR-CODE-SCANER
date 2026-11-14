import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust environment variable resolution
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import fieldRoutes from './routes/fieldRoutes.js';
import designRoutes from './routes/designRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import MemberField from './models/MemberField.js';
import { syncMemberIds, restoreSandboxDataIfEmpty } from './services/migrationService.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Production CORS setup supporting Netlify frontend & custom domains
const rawAllowedOrigins = [
  process.env.CLIENT_URL,
  process.env.PUBLIC_BASE_URL,
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
]
  .filter(Boolean)
  .map((origin) => origin.trim().replace(/\/+$/, ''));

const staticOrigins = [
  ...rawAllowedOrigins,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl, Postman)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '');

      // Check explicit allowed origins or non-production modes
      if (
        staticOrigins.includes(normalizedOrigin) ||
        process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test'
      ) {
        return callback(null, true);
      }

      // Automatically allow Netlify domain and preview deployments (*.netlify.app)
      try {
        const originUrl = new URL(origin);
        if (/\.netlify\.app$/i.test(originUrl.hostname)) {
          return callback(null, true);
        }
      } catch {
        // Continue to rejection
      }

      console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
      return callback(new Error(`Origin ${origin} blocked by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-access-token']
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging in non-test mode
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limiting for general API calls
app.use('/api', apiLimiter);

// Root status endpoint for platform health probes and Render verification
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'KTPD Membership Management API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date().toISOString()
  });
});

// Dedicated health check endpoints for Render and monitoring tools
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    system: 'KTPD Membership Management API',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Ensure uploads directory exists and serve static uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const designUploadsDir = path.join(uploadsDir, 'design');
if (!fs.existsSync(designUploadsDir)) {
  fs.mkdirSync(designUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/fields', fieldRoutes);
app.use('/api/design', designRoutes);
app.use('/api/accounts', accountRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

import Admin from './models/Admin.js';

// Auto-seed or verify Super Admin account from environment variables
const ensureAdminExists = async () => {
  try {
    const email = process.env.ADMIN_EMAIL ? process.env.ADMIN_EMAIL.trim().toLowerCase() : null;
    const username = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      return;
    }

    // Check if a Super Admin account with this email already exists
    const existingSuperAdmin = await Admin.findOne({ email });
    if (existingSuperAdmin) {
      console.log(`[KTPD Server] Super Admin account verified: ${email}. Preserving existing credentials.`);
      return;
    }

    // Check if username is taken by a different account
    const existingByUsername = await Admin.findOne({ username });
    let finalUsername = username;
    if (existingByUsername) {
      finalUsername = email.split('@')[0].replace(/[^a-z0-9_]/g, '_');
    }

    if (!password) {
      console.warn('[KTPD Server] ADMIN_PASSWORD is not set. Cannot provision initial Super Admin.');
      return;
    }

    const passwordHash = await Admin.hashPassword(password);
    await Admin.create({
      username: finalUsername,
      email,
      passwordHash,
      role: 'superadmin',
      fullName: process.env.ADMIN_FULL_NAME || 'Super Admin',
      status: 'active'
    });
    console.log(`[KTPD Server] Successfully created initial Super Admin account: ${email} (${finalUsername})`);
  } catch (err) {
    console.error('[KTPD Server] Error checking Super Admin account:', err.message);
  }
};

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Start server when run directly
if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(async () => {
      await MemberField.initializeDefaultFields();
      await restoreSandboxDataIfEmpty();
      await ensureAdminExists();
      await syncMemberIds();
      app.listen(PORT, HOST, () => {
        console.log(`[KTPD Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
        console.log(`[KTPD Server] Bound to host ${HOST} (Render production compatible)`);
        console.log(`[KTPD Server] Health Endpoint: http://localhost:${PORT}/health`);
        console.log(`[KTPD Server] API Ready: http://localhost:${PORT}/api`);
      });
    })
    .catch((err) => {
      console.error('[KTPD Server] Failed to initialize database connection:', err.message);
    });
}

export default app;

