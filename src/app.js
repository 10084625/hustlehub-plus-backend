const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const { notFound, globalErrorHandler } = require('./middleware/errorMiddleware');

const app = express();