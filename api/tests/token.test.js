const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../src/utils/generateToken');

const secret = process.env.JWT_SECRET;
const user = { _id: '6ac735429e27884281dd7d37', role: 'freelancer' };

describe('JWT generation and verification (Part 1 feedback fix)', () => {
    //It passes a mock user through generateToken and feeds the result directly into verifyToken.
  test('a token we generate verifies and carries id + role only', () => {
    const decoded = verifyToken(generateToken(user));
    expect(decoded.sub).toBe(user._id);
    expect(decoded.role).toBe('freelancer');
    expect(decoded.iss).toBe('hustlehub-plus-api');
    expect(decoded.aud).toBe('hustlehub-plus-client');
    expect(decoded.email).toBeUndefined();
  });

  test('a token from a different issuer is rejected', () => {
    const forged = jwt.sign({ role: 'admin' }, secret, { subject: 'x', issuer: 'evil', audience: 'hustlehub-plus-client' });
    expect(() => verifyToken(forged)).toThrow(/issuer/);
  });

  test('a token for a different audience is rejected', () => {
    const forged = jwt.sign({ role: 'admin' }, secret, { subject: 'x', issuer: 'hustlehub-plus-api', audience: 'other-app' });
    expect(() => verifyToken(forged)).toThrow(/audience/);
  });

  test('a token signed with another algorithm is rejected', () => {
    const forged = jwt.sign({ role: 'admin' }, secret, {
      algorithm: 'HS512',
      subject: 'x',
      issuer: 'hustlehub-plus-api',
      audience: 'hustlehub-plus-client',
    });
    expect(() => verifyToken(forged)).toThrow(/invalid algorithm/);
  });

  test('an unsigned "alg: none" token is rejected', () => {
    const forged = jwt.sign({ role: 'admin' }, null, { algorithm: 'none', subject: 'x' });
    expect(() => verifyToken(forged)).toThrow();
  });

  test('a token signed with the wrong secret is rejected', () => {
    const forged = jwt.sign({ role: 'admin' }, 'some-other-secret-that-is-long-enough-123', {
      subject: 'x',
      issuer: 'hustlehub-plus-api',
      audience: 'hustlehub-plus-client',
    });
    expect(() => verifyToken(forged)).toThrow(/signature/);
  });
});
