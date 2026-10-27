const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const logger = require('./config/logger');
const { requestLogger } = require('./middleware/auditLog.middleware');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const apiRoutes = require('./routes');

const app = express();

// Security & parsing middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger(logger));

// Global API rate limiting (in addition to the stricter login limiter)
app.use(
  '/api',
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, statusCode: 429, message: 'Too many requests. Please slow down.' },
  })
);

// Static file serving for uploaded documents/photos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Versioned API
app.use('/api/v1', apiRoutes);

app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Mining Management ERP API', version: '1.0.0' });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
