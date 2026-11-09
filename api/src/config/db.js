const mongoose = require('mongoose');

const config = require('./env');
const logger = require('../utils/logger');

/**
 * Connects to MongoDB.
 *
 * - strictQuery: fields not defined in a schema are ignored in filters.
 * - sanitizeFilter: Mongoose wraps any object that looks like a query
 *   operator (e.g. { "$gt": "" }) supplied inside a filter in $eq, so user
 *   input can never be interpreted as an operator. This is a second layer of
 *   NoSQL-injection defence behind express-mongo-sanitize.
 */
mongoose.set('strictQuery', true);
mongoose.set('sanitizeFilter', true);

const connectDB = async () => {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  logger.info('Connected to MongoDB', { event: 'db.connected' });
};

module.exports = connectDB;