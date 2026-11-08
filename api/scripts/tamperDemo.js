/**
 * DEMO ONLY: simulates an attacker editing the database directly.
 *   npm run demo:tamper
 *
 * Takes the newest transaction and changes its amounts in MongoDB WITHOUT
 * going through the API (so the signature is not updated). Afterwards:
 *   - Admin > Security > "Check ledger integrity" reports the record
 *   - an error-level "ledger.tamper_detected" event appears in the logs
 *   - the freelancer's income and tax estimate leave the record out
 * Run "npm run demo:tamper -- --undo" to put the original values back.
 */
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { Transaction } = require('../src/models/Transaction');

const run = async () => {
  await connectDB();
  const undo = process.argv.includes('--undo');
  const tx = await Transaction.findOne({}).sort({ createdAt: -1 }).lean();
  if (!tx) throw new Error('No transactions yet. Make a booking first.');

  const factor = undo ? 0.1 : 10;
  const update = {
    amount: Math.round(tx.amount * factor * 100) / 100,
    platformFee: Math.round(tx.platformFee * factor * 100) / 100,
    freelancerEarnings: Math.round(tx.freelancerEarnings * factor * 100) / 100,
  };
  // Raw driver update: deliberately bypasses Mongoose hooks, like an attacker would.
  await Transaction.collection.updateOne({ _id: tx._id }, { $set: update });
  console.log(`${undo ? 'Restored' : 'Tampered with'} ${tx.reference}: amount ${tx.amount} -> ${update.amount}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Demo failed:', err.message);
  process.exit(1);
});