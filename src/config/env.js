/**
 * Centralised environment configuration
 * Loading all environment variables through a single module means:
 *  1. There is exactly one place that reads process.env.
 *  2. We can fail fast at startup if a required secret is missing, instead
 *  of discovering it later as an obscure runtime bug.
 */
const path = require('path');
require('dotenv').config();

const requiredInProduction = ['JWT_SECRET'];

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
