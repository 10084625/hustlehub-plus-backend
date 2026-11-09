const express = require('express');
const { getIncomeSummary, getTaxEstimate } = require('../controllers/incomeController');
const { noInputValidation, taxEstimateValidation } = require('../validators/bookingValidators');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, authorize('freelancer'), noInputValidation, getIncomeSummary);

// Part 3: estimated income tax for the current South African tax year
router.get('/tax-estimate', protect, authorize('freelancer'), taxEstimateValidation, getTaxEstimate);

module.exports = router;