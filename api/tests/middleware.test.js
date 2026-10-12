const { authorize } = require('../src/middleware/authMiddleware');
const { allowOnlyFields } = require('../src/validators/common');
const { stripHtml } = require('../src/utils/sanitize');
const { isOwnerOrAdmin } = require('../src/utils/ownership');

const run = (mw, req) =>
  new Promise((resolve) => {
    mw(req, {}, (err) => resolve(err));
  });

describe('authorize (RBAC)', () => {
  test('allows a permitted role', async () => {
    expect(await run(authorize('freelancer'), { user: { role: 'freelancer' } })).toBeUndefined();
  });
  test('blocks a role that is not permitted with 403', async () => {
    const err = await run(authorize('freelancer'), { user: { role: 'client' } });
    expect(err.statusCode).toBe(403);
  });
  test('blocks a request with no user with 401', async () => {
    const err = await run(authorize('admin'), {});
    expect(err.statusCode).toBe(401);
  });
});

describe('allowOnlyFields (Part 1 feedback fix)', () => {
  const mw = allowOnlyFields({ body: ['email', 'password'] });
  test('accepts only documented fields', async () => {
    expect(await run(mw, { body: { email: 'a@b.co', password: 'x' }, query: {} })).toBeUndefined();
  });
  test('rejects an unexpected field such as role', async () => {
    const err = await run(mw, { body: { email: 'a@b.co', password: 'x', role: 'admin' }, query: {} });
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/unexpected field/);
  });
  test('rejects unexpected query parameters', async () => {
    const err = await run(mw, { body: {}, query: { debug: 'true' } });
    expect(err.statusCode).toBe(400);
  });
  test('rejects a body that is an array', async () => {
    const err = await run(mw, { body: [], query: {} });
    expect(err.statusCode).toBe(400);
  });
});
