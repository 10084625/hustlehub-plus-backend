// Test-only configuration. These values never touch a real database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_that_is_definitely_longer_than_32_characters';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/hustlehub-test-unused';
process.env.LEDGER_HMAC_SECRET = 'test_ledger_secret_also_longer_than_32_characters_xyz';
