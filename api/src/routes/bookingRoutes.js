const express = require('express');
const ctrl = require('../controllers/bookingController');
const v = require('../validators/bookingValidators');
const { protect, authorize } = require('../middleware/authMiddleware');
const { bookingLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.use(protect);

// Only clients can book. Rate limited per user.
router.post('/', authorize('client'), bookingLimiter, v.createBookingValidation, ctrl.createBooking);

router.get('/mine', authorize('client', 'freelancer'), v.noInputValidation, ctrl.listMyBookings);
router.get('/', authorize('admin'), v.noInputValidation, ctrl.listAllBookings);
router.get('/:id', v.bookingIdValidation, ctrl.getBooking);
router.patch('/:id/complete', authorize('freelancer'), v.bookingIdValidation, ctrl.completeBooking);

module.exports = router;