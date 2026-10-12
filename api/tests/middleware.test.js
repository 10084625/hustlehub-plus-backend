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