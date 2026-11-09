const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validators/authValidators');
const { noInputValidation } = require('../validators/bookingValidators');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, authIpLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// Public, rate limited (per IP and per IP+email)
router.post('/register', authIpLimiter, authLimiter, registerValidation, register);
router.post('/login', authIpLimiter, authLimiter, loginValidation, login);

// Any logged-in user
router.get('/profile', protect, noInputValidation, getProfile);

module.exports = router;
