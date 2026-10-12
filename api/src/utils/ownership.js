const AppError = require('./AppError');

/**
 * Returns true if the logged-in user owns the resource (or is an admin).
 * `ownerId` can be an ObjectId or a populated document.
 */
const isOwnerOrAdmin = (user, ownerId) => {
  if (user.role === 'admin') return true;
  const id = ownerId && ownerId._id ? ownerId._id : ownerId;
  return Boolean(id) && id.toString() === user.id;
};

/**
 * For resources that belong to someone else we answer 404, not 403.
 * A 403 would confirm that the id exists, which lets an attacker map out
 * other users' records by guessing ids (an IDOR probing technique).
 */
const notFound = (thing) => new AppError(`${thing} not found.`, 404);

module.exports = { isOwnerOrAdmin, notFound };
