const express = require('express');
const ctrl = require('../controllers/adminController');
const { userIdValidation, noInputValidation, auditLogValidation } = require('../validators/bookingValidators');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Everything under /api/admin is admin-only.
router.use(protect, authorize('admin'));

router.get('/users', noInputValidation, ctrl.listUsers);
router.patch('/users/:id/status', userIdValidation, ctrl.setUserStatus);
router.get('/stats', noInputValidation, ctrl.getStats);

// Part 3: security monitoring
router.get('/audit-logs', auditLogValidation, ctrl.listAuditLogs);
router.get('/ledger/verify', noInputValidation, ctrl.verifyLedger);

module.exports = router;