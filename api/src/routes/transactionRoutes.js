const express = require('express');
const ctrl = require('../controllers/transactionController');
const { noInputValidation } = require('../validators/bookingValidators');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Transactions are read-only: there is deliberately no POST/PATCH/DELETE.
// They are only ever created by the booking process.
router.get('/mine', authorize('client', 'freelancer'), noInputValidation, ctrl.listMyTransactions);
router.get('/', authorize('admin'), noInputValidation, ctrl.listAllTransactions);

module.exports = router;
