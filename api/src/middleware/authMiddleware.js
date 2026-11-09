// References: [3] RFC 7519 JWT, [12] jsonwebtoken (token verification),
// [20] OWASP Authorization Cheat Sheet (deny by default, role checks),
// [21] OWASP Session Management Cheat Sheet (server-side logout).
// README section 22 (References).
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/generateToken');
const { User } = require('../models/User');
const { RevokedToken } = require('../models/RevokedToken');
const { logEvent } = require('../utils/audit');

const NOT_AUTHORISED = 'Not authorised. Please log in to access this resource.';