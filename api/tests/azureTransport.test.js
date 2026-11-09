const { AzureTransport, toDimensions } = require('../src/utils/azureTransport');
const { redactValue } = require('../src/utils/logger');

const fakeClient = () => ({ trackTrace: jest.fn(), trackException: jest.fn() });
const send = (transport, info) => new Promise((resolve) => transport.log(info, resolve));

describe('Azure Application Insights transport (Part 3 cloud logging)', () => {
  test('a warning event becomes an Azure trace with searchable dimensions', async () => {
    const client = fakeClient();
    await send(new AzureTransport({ client }), {
      level: 'warn',
      message: 'auth.login.failed',
      event: 'auth.login.failed',
      requestId: 'abc-123',
      details: { reason: 'wrong_password', failedCount: 2 },
    });
    const [trace] = client.trackTrace.mock.calls[0];
    expect(trace.severity).toBe('Warning');
    expect(trace.message).toBe('auth.login.failed');
    expect(trace.properties.event).toBe('auth.login.failed');
    expect(trace.properties.requestId).toBe('abc-123');
    expect(JSON.parse(trace.properties.details)).toEqual({ reason: 'wrong_password', failedCount: 2 });
    expect(client.trackException).not.toHaveBeenCalled();
  });

  test('errors also appear on the Azure Failures page', async () => {
    const client = fakeClient();
    await send(new AzureTransport({ client }), { level: 'error', message: 'ledger.tamper_detected', event: 'ledger.tamper_detected' });
    expect(client.trackTrace.mock.calls[0][0].severity).toBe('Error');
    expect(client.trackException).toHaveBeenCalledTimes(1);
  });

  test('access-log lines are skipped (Azure records requests itself)', async () => {
    const client = fakeClient();
    await send(new AzureTransport({ client }), { level: 'http', message: 'GET /api/health 200', event: 'http.request' });
    expect(client.trackTrace).not.toHaveBeenCalled();
  });

  test('all dimensions are text, as Azure requires', () => {
    const d = toDimensions({ level: 'info', message: 'x', status: 200, ok: true, details: { a: 1 }, missing: undefined });
    expect(d).toEqual({ status: '200', ok: 'true', details: '{"a":1}' });
  });

  test('nothing secret can reach Azure: entries are redacted before the transport', async () => {
    const client = fakeClient();
    const entry = redactValue({ level: 'info', message: 'x', event: 'auth.login.success', password: 'StrongP@ss1', details: { email: 'caleb@example.com' } });
    await send(new AzureTransport({ client }), entry);
    const sent = JSON.stringify(client.trackTrace.mock.calls[0][0]);
    expect(sent).not.toContain('StrongP@ss1');
    expect(sent).not.toContain('caleb@example.com');
    expect(sent).toContain('c***@example.com');
  });
});
