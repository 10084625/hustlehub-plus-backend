const helmet = require('helmet');

/**
 * Security headers for the API.
 *
 * This server only ever returns JSON, so its Content Security Policy is as
 * strict as possible: nothing may be loaded, framed, or submitted from a
 * response. If an attacker somehow got HTML into a response, the browser
 * would still refuse to run scripts, load images, or embed it in a frame.
 * The React app has its own CSP (see client/vite.config.js).
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: false },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
});

// API responses can contain personal and financial data: never cache them.
const noStore = (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
};

module.exports = { securityHeaders, noStore };
