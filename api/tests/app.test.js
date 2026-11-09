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
  ])('%s %s requires a JWT', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
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
