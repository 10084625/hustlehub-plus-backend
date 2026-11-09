const express = require('express');
const { register, login, getProfile, logout, logoutAll, getActivity } = require('../controllers/authController');
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

// Part 3: server-side sign-out and the user's own account activity
router.post('/logout', protect, noInputValidation, logout);
router.post('/logout-all', protect, noInputValidation, logoutAll);
router.get('/activity', protect, noInputValidation, getActivity);

module.exports = router;