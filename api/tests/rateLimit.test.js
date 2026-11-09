const express = require('express');
const request = require('supertest');
const { secondsUntilReset, buildLimiter } = require('../src/middleware/rateLimiters');

// Part 2 feedback: "Your rate-limit response reports the full limit window as
// the retry time, even when part of that window has already passed. Return
// the actual remaining wait time."
describe('Rate-limit retry time (Part 2 feedback fix)', () => {
  test('returns the time left until the reset, not the full window', () => {
    const now = 1_000_000;
    const resetTime = new Date(now + 40_000); // 40 s left of a 60 s window
    expect(secondsUntilReset(resetTime, 60_000, now)).toBe(40);
  });

  test('rounds part-seconds up so clients never retry too early', () => {
    const now = 1_000_000;
    expect(secondsUntilReset(new Date(now + 12_300), 60_000, now)).toBe(13);
  });

  test('never reports zero or a negative wait', () => {
    const now = 1_000_000;
    expect(secondsUntilReset(new Date(now - 5_000), 60_000, now)).toBe(1);
  });

  test('falls back to the window only if the store gives no reset time', () => {
    expect(secondsUntilReset(undefined, 60_000)).toBe(60);
  });

  test('a real 429 reports the remaining time after part of the window has passed', async () => {
    let fakeNow = Date.UTC(2026, 10, 4, 10, 0, 0);
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);

    const app = express();
    app.set('trust proxy', 1);
    app.get('/limited', buildLimiter({ name: 'test', max: 1, windowMin: 1, message: 'Too many.' }), (req, res) => res.json({ ok: true }));

    expect((await request(app).get('/limited')).status).toBe(200);

    fakeNow += 25_000; // 25 seconds later
    const res = await request(app).get('/limited');
    spy.mockRestore();

    expect(res.status).toBe(429);
    expect(res.body.retryAfterSeconds).toBe(35); // 60 - 25, not 60
    expect(res.headers['retry-after']).toBe('35'); // header and body agree
    expect(res.body).toEqual({ success: false, message: 'Too many.', retryAfterSeconds: 35 });
  });
});
