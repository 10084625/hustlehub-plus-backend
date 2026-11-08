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