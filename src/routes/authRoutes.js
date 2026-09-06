const express = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { registerRules, loginRules, handleValidationErrors } = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');