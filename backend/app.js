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

const app = express();

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false // Allows serving local files to frontend
  })
);

// CORS setup
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Sanitize MongoDB data
app.use(mongoSanitize());

// Prevent XSS attacks
app.use(xss());

// Rate limiting (100 requests per 10 minutes)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 150,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});
app.use('/api/', limiter);

// Serve uploads directory statically for local storage fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger API Documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/properties', propertyRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Leasify API is running smoothly' });
});

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
