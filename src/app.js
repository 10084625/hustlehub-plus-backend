const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const { notFound, globalErrorHandler } = require('./middleware/errorMiddleware');

const app = express();






app.use(helmet());

app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);




app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}
