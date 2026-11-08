/**
 * One-off upgrade step for databases that already hold Part 2 transactions.
 *   npm run ledger:sign-legacy
 *
 * Transactions created before Part 3 have no signature, so the integrity
 * check reports them as "unsigned". This script signs them once, using the
 * values as they are now. Run it straight after upgrading, before anyone
 * could have changed the data.
 */
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { Transaction } = require('../src/models/Transaction');
const { signTransaction } = require('../src/utils/ledger');

const run = async () => {
  await connectDB();
  const legacy = await Transaction.find({ signature: { $exists: false } }).lean();
  await Promise.all(
    legacy.map((t) => Transaction.collection.updateOne({ _id: t._id }, { $set: { signature: signTransaction(t) } }))
  );
  console.log(`Signed ${legacy.length} legacy transaction(s).`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Signing failed:', err.message);
  process.exit(1);
});