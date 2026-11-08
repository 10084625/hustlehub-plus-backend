const crypto = require('crypto');
const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { Transaction, PLATFORM_FEE_RATE } = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { isOwnerOrAdmin, notFound } = require('../utils/ownership');
const { logEvent } = require('../utils/audit');

const round2 = (n) => Math.round(n * 100) / 100;

const newReference = () => `HH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const PARTY_FIELDS = 'username';