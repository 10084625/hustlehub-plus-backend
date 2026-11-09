const { redactValue, maskEmail } = require('../src/utils/logger');

describe('Log redaction (Part 3 logging)', () => {
  test('secret fields are never written to logs', () => {
    const out = redactValue({
      password: 'StrongP@ss1',
      token: 'eyJhbGciOi...',
      headers: { authorization: 'Bearer abc', cookie: 'sid=1' },
      jwtSecret: 'x',
      signature: 'deadbeef',
      amount: 900,
    });
    expect(out.password).toBe('[REDACTED]');
    expect(out.token).toBe('[REDACTED]');
    expect(out.headers.authorization).toBe('[REDACTED]');
    expect(out.headers.cookie).toBe('[REDACTED]');
    expect(out.jwtSecret).toBe('[REDACTED]');
    expect(out.signature).toBe('[REDACTED]');
    expect(out.amount).toBe(900);
  });

  test('email addresses are masked', () => {
    expect(maskEmail('login failed for caleb.naidoo@example.com')).toBe('login failed for c***@example.com');
    expect(redactValue({ details: { email: 'reece@hustlehub.co.za' } }).details.email).toBe('r***@hustlehub.co.za');
  });

  test('deep or huge objects are cut off safely', () => {
    let deep = { v: 1 };
    for (let i = 0; i < 10; i += 1) deep = { child: deep };
    expect(JSON.stringify(redactValue(deep))).toContain('[TRUNCATED]');
    expect(redactValue({ list: Array.from({ length: 500 }, (_, i) => i) }).list).toHaveLength(50);
  });
});
