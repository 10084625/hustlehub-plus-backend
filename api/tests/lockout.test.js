const { keyFor, remainingLockSeconds, applyFailure } = require('../src/utils/lockout');

describe('Account lockout (Part 3 own security feature)', () => {
  const opts = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };
  const now = Date.UTC(2026, 10, 4, 10, 0, 0);

  test('emails are hashed and normalised, never stored as typed', () => {
    expect(keyFor('User@Example.com ')).toBe(keyFor('user@example.com'));
    expect(keyFor('user@example.com')).toMatch(/^[a-f0-9]{64}$/);
    expect(keyFor('user@example.com')).not.toContain('example');
  });

  test('locks on the fifth failure inside the window', () => {
    let state = {};
    for (let i = 1; i <= 4; i += 1) {
      state = applyFailure(state, now + i * 1000, opts);
      expect(state.lockedNow).toBe(false);
      expect(state.failedCount).toBe(i);
    }
    state = applyFailure(state, now + 5000, opts);
    expect(state.lockedNow).toBe(true);
    expect(remainingLockSeconds(state.lockedUntil, now + 5000)).toBe(15 * 60);
  });

  test('old failures outside the window stop counting', () => {
    const state = { failedCount: 4, lastFailedAt: new Date(now - 16 * 60 * 1000) };
    const next = applyFailure(state, now, opts);
    expect(next.lockedNow).toBe(false);
    expect(next.failedCount).toBe(1);
  });

  test('remaining lock time counts down and ends at zero', () => {
    const lockedUntil = new Date(now + 60_000);
    expect(remainingLockSeconds(lockedUntil, now)).toBe(60);
    expect(remainingLockSeconds(lockedUntil, now + 59_500)).toBe(1);
    expect(remainingLockSeconds(lockedUntil, now + 61_000)).toBe(0);
    expect(remainingLockSeconds(undefined, now)).toBe(0);
  });
});
