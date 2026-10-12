import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The React app is served over HTTPS (same local certificate as the API) and
 * calls the API through a same-origin proxy at /api. That keeps the browser
 * talking to one origin only, so the Content Security Policy can say
 * connect-src 'self' and nothing else.
 */
const certDir = path.resolve(__dirname, '../api/certs');
const httpsOptions =
  fs.existsSync(path.join(certDir, 'key.pem')) && fs.existsSync(path.join(certDir, 'cert.pem'))
    ? { key: fs.readFileSync(path.join(certDir, 'key.pem')), cert: fs.readFileSync(path.join(certDir, 'cert.pem')) }
    : undefined;

const API_TARGET = process.env.VITE_API_PROXY_TARGET || 'https://localhost:5000';

// Content Security Policy for the built app (npm run build && npm run preview,
// and later the Docker/nginx image in Part 3). Only our own files may load:
// no inline scripts, no third-party scripts, styles, fonts or frames.
const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

// The Vite dev server injects a small inline script for hot reloading and
// adds styles at runtime, and talks to its websocket. In development only,
// those are allowed through a fixed nonce and the HMR socket. The policy is
// otherwise identical.
const DEV_NONCE = 'hustlehub-dev-only';
const DEV_CSP = PROD_CSP.replace("script-src 'self'", `script-src 'self' 'nonce-${DEV_NONCE}'`)
  .replace("style-src 'self'", `style-src 'self' 'nonce-${DEV_NONCE}'`)
  .replace("connect-src 'self'", "connect-src 'self' wss://localhost:3000");

const securityHeaders = (csp) => ({
  'Content-Security-Policy': csp,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
});

// xfwd passes the browser's IP to the API so per-IP rate limits still work behind the proxy.
const proxy = { '/api': { target: API_TARGET, changeOrigin: true, secure: false, xfwd: true } };

export default defineConfig(({ command }) => ({
  plugins: [react()],
  html: command === 'serve' ? { cspNonce: DEV_NONCE } : undefined,
  server: { port: 3000, strictPort: true, https: httpsOptions, headers: securityHeaders(DEV_CSP), proxy },
  preview: { port: 3000, strictPort: true, https: httpsOptions, headers: securityHeaders(PROD_CSP), proxy },
  build: { sourcemap: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
}));
