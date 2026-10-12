const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const config = require('./config/env');
const { securityHeaders, noStore } = require('./middleware/securityHeaders');
const { globalLimiter } = require('./middleware/rateLimiters');
const { notFound, globalErrorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const gigRoutes = require('./routes/gigRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const incomeRoutes = require('./routes/incomeRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

//Hides the framework, and uses the real client IP when running
// behind one proxy (this is used for accurate rate limiting).
app.disable('x-powered-by');
app.set('trust proxy', 1);

// 1. Security headers (Helmet + strict CSP) and no-cache for API data
app.use(securityHeaders);
app.use(noStore);

// 2. CORS: only the known frontend origin(s) may call the API from a browser
app.use(
  cors({
    origin: config.cors.origin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })
);

// 3. Body parsing with size limits (blunts oversized-payload DoS)
app.use(express.json({ limit: '10kb' }));

// 4. Input sanitisation
//    - mongoSanitize removes keys starting with "$" or containing "." from
//      body, query and params, blocking NoSQL operator injection
//      such as { "email": { "$gt": "" } }.
//    - hpp stops HTTP parameter pollution (?category=a&category=b).
app.use(mongoSanitize());
app.use(hpp());

// 5. Global rate limit across the whole API
app.use('/api', globalLimiter);

// 6. Request logging (never logs bodies, so passwords/tokens stay out of logs)
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'HustleHub+ API is running.' });
});
app.use('/api/auth', authRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/admin', adminRoutes);

// 404 + single, safe error exit point
app.use(notFound);
app.use(globalErrorHandler);

module.exports = app;
