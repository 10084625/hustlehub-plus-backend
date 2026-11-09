const request = require('supertest');
const app = require('../src/app');

// These tests exercise the HTTP layer without a database: every request here
// is answered by middleware before the controllers access MongoDB.
describe('API security behaviour (no database needed)', () => {
  test('health check responds with the standard envelope', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'HustleHub+ API is running.' });
  });

  test('security headers and CSP are set', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('unknown route returns a safe 404 without echoing the path', async () => {
    const res = await request(app).get('/api/<script>alert(1)</script>');
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('script');
  });

  test.each([
    ['get', '/api/gigs'],
    ['post', '/api/gigs'],
    ['post', '/api/bookings'],
    ['get', '/api/transactions/mine'],
    ['get', '/api/income/summary'],
    ['get', '/api/admin/users'],
    ['get', '/api/income/tax-estimate'],
    ['post', '/api/auth/logout'],
    ['post', '/api/auth/logout-all'],
    ['get', '/api/auth/activity'],
    ['get', '/api/admin/audit-logs'],
    ['get', '/api/admin/ledger/verify'],
  ])('%s %s requires a JWT', async (method, path) => {
    const res = method === 'post' ? await request(app).post(path) : await request(app).get(path);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('Part 3: every response carries a random request id', async () => {
    const a = await request(app).get('/api/health');
    const b = await request(app).get('/api/health').set('X-Request-Id', 'attacker-chosen-id');
    expect(a.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(b.headers['x-request-id']).not.toBe('attacker-chosen-id');
  });

  test('Part 3: error responses include the request id for support, nothing internal', async () => {
    const res = await request(app).get('/api/gigs');
    expect(res.status).toBe(401);
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    expect(Object.keys(res.body).sort()).toEqual(['message', 'requestId', 'success']);
  });

  test('a garbage token is rejected', async () => {
    const res = await request(app).get('/api/gigs').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });

  test('register rejects unexpected fields before touching the database', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'mallory', email: 'm@example.com', password: 'StrongP@ss1', isAdmin: true });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unexpected field/);
  });

  test('register rejects self-assigned admin role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'mallory', email: 'm@example.com', password: 'StrongP@ss1', role: 'admin' });
    expect(res.status).toBe(400);
  });

  test('NoSQL operator injection in login is neutralised', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: 'x' });
    expect(res.status).toBe(400);
  });

  test('malformed JSON gets a controlled 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Request body is not valid JSON.');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });

  test('oversized body is refused', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.co', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });
});
