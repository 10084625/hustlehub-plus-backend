const { trusted } = require('mongoose');
const { Gig } = require('../models/Gig');
const { Booking } = require('../models/Booking');
const { isOwnerOrAdmin, notFound } = require('../utils/ownership');
const { logEvent } = require('../utils/audit');

const PUBLIC_FREELANCER_FIELDS = 'username';

// Escapes regex special characters so search text is matched literally and
// cannot be used for ReDoS or regex injection.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/gigs - any logged-in user. Lists ACTIVE gigs only.
 */
const listGigs = async (req, res, next) => {
  try {
    const { search, category, minPrice, maxPrice, page = 1, limit = 12 } = req.validated.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    // Server-built operators are wrapped in trusted() because the global
    // sanitizeFilter setting neutralises any $operator it was not told to trust.
    if (search) filter.title = trusted({ $regex: escapeRegex(search), $options: 'i' });
    if (minPrice !== undefined || maxPrice !== undefined) {
      const range = {};
      if (minPrice !== undefined) range.$gte = minPrice;
      if (maxPrice !== undefined) range.$lte = maxPrice;
      filter.price = trusted(range);
    }

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('freelancer', PUBLIC_FREELANCER_FIELDS),
      Gig.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Gigs retrieved successfully.',
      data: { gigs, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } },
    });
  } catch (err) {
    return next(err);
  }
};