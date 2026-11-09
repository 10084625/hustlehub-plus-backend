const express = require('express');
const { getIncomeSummary } = require('../controllers/incomeController');
const { noInputValidation } = require('../validators/bookingValidators');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/summary', protect, authorize('freelancer'), noInputValidation, getIncomeSummary);

module.exports = router;
