const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middleware/error');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Route files
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const apartmentRoutes = require('./routes/apartmentRoutes');
const billRoutes = require('./routes/billRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const invitationRoutes = require('./routes/invitationRoutes');

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false // Allows serving local files to frontend
  })
);

const mongoose = require('mongoose');

// CORS setup supporting local frontend ports
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true
  })
);

// Database connection readiness middleware
app.use('/api', (req, res, next) => {
  if (req.path === '/v1/auth/login' || req.path.startsWith('/v1/')) {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please verify MongoDB Atlas cluster is active and accessible.'
      });
    }
  }
  next();
});

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize MongoDB data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Rate limiting (generous in development, strict in production)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: process.env.NODE_ENV === 'development' ? 5000 : 150,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Serve uploads directory statically for local storage fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger API Documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount routes with /api/v1 and /api aliases
app.use(['/api/v1/auth', '/api/auth'], authRoutes);
app.use(['/api/v1/properties', '/api/properties'], propertyRoutes);
app.use(['/api/v1/apartments', '/api/apartments'], apartmentRoutes);
app.use(['/api/v1/tenants', '/api/tenants'], tenantRoutes);
app.use(['/api/v1/bills', '/api/bills'], billRoutes);
app.use(['/api/v1/payments', '/api/payments'], paymentRoutes);
app.use(['/api/v1/maintenance', '/api/maintenance'], maintenanceRoutes);
app.use(['/api/v1/reports', '/api/reports'], reportRoutes);
app.use(['/api/v1/notifications', '/api/notifications'], notificationRoutes);
app.use(['/api/v1/audit-logs', '/api/audit-logs'], auditLogRoutes);
app.use(['/api/v1/invitations', '/api/invitations'], invitationRoutes);

// Health check endpoints
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Leasify API is running smoothly',
    port: process.env.PORT || 5001,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
