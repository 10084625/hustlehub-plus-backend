const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * userModel 
 *
 * This permits in-memory or file-based storage. We use a JSON file on disk so that registered users survive
 * a server restart, while keeping all file I/O isolated in this one module.
 * Nothing outside this file ever touches users.json directly - that keeps
 * the "model" swappable for a real MongoDB model later with minimal
 * changes to controllers.
 *
 * IMPORTANT: password hashes only. Plain-text passwords are never
 * received by this module - hashing happens in the controller before
 * a user object reaches here.
 */
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

const ensureStoreExists = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
};
