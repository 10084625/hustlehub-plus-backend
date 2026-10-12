const express = require('express');
const ctrl = require('../controllers/gigController');
const v = require('../validators/gigValidators');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Every gig route requires a valid JWT.
router.use(protect);

// Browsing: any role
router.get('/', v.listGigsValidation, ctrl.listGigs);

// Freelancer's own gigs. Declared before "/:id" so "mine" is not read as an id.
router.get('/mine', authorize('freelancer'), v.gigListMineValidation, ctrl.listMyGigs);

router.get('/:id', v.gigIdValidation, ctrl.getGig);

// Managing gigs
router.post('/', authorize('freelancer'), v.createGigValidation, ctrl.createGig);
router.patch('/:id', authorize('freelancer'), v.updateGigValidation, ctrl.updateGig);
router.delete('/:id', authorize('freelancer', 'admin'), v.gigIdValidation, ctrl.deleteGig);

module.exports = router;
