const mongoose = require('mongoose');

const ROLES = Object.freeze(['client', 'freelancer', 'admin']);
// Roles a person can pick for themselves at sign-up. "admin" is never
// self-assignable; admins are created with the seed script only.
const SELF_ASSIGNABLE_ROLES = Object.freeze(['client', 'freelancer']);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 30, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    // select:false means the hash is never returned by a query unless a
    // controller explicitly asks for it with .select('+password').
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'client' },
    isActive: { type: Boolean, default: true },
    // Part 3: every token carries this number. Increasing it ("sign out
    // everywhere", or an admin suspension) makes all older tokens invalid.
    tokenVersion: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Whenever a user document is turned into JSON for a response, strip
// internal and sensitive fields.
userSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.password;
    delete ret.tokenVersion;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES, SELF_ASSIGNABLE_ROLES };