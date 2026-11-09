const { signTransaction, verifyTransaction } = require('../src/utils/ledger');

const base = {
  reference: 'HH-TEST-ABC123',
  booking: '6ac735549e27884281dd7d45',
  client: '6ac735429e27884281dd7d37',
  freelancer: '6ac735429e27884281dd7d38',
  amount: 900,
  platformFee: 90,
  freelancerEarnings: 810,
  currency: 'ZAR',
  paymentMethod: 'simulated',
  status: 'completed',
};

describe('Tamper-evident ledger (Part 3 own security feature)', () => {
  const signed = { ...base, signature: signTransaction(base) };

  test('a freshly signed transaction verifies', () => {
    expect(signed.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyTransaction(signed)).toBe('valid');
  });

  test.each([
    ['amount', { amount: 9000 }],
    ['freelancer earnings', { freelancerEarnings: 8100 }],
    ['platform fee', { platformFee: 0 }],
    ['freelancer (earnings moved to someone else)', { freelancer: '6ac735429e27884281dd7d99' }],
    ['reference', { reference: 'HH-OTHER' }],
  ])('changing the %s is detected', (_, change) => {
    expect(verifyTransaction({ ...signed, ...change })).toBe('tampered');
  });

  test('a signature made with another secret is rejected', () => {
    const forged = { ...base, signature: signTransaction(base, 'attacker-guess-secret-that-is-long-enough') };
    expect(verifyTransaction(forged)).toBe('tampered');
  });

  test('a garbage signature is rejected without throwing', () => {
    expect(verifyTransaction({ ...base, signature: 'abc' })).toBe('tampered');
  });

  test('records from before Part 3 are reported as unsigned', () => {
    expect(verifyTransaction(base)).toBe('unsigned');
  });

  test('amount formatting does not change the signature (900 vs 900.00)', () => {
    expect(signTransaction({ ...base, amount: 900.0 })).toBe(signTransaction(base));
  });
});
