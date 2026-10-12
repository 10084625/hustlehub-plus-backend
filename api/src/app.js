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
