import Database from 'better-sqlite3';
import { config } from '../config.ts';

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

export function initDb() {
  // Bots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      strategy TEXT NOT NULL,
      symbol TEXT NOT NULL,
      status TEXT NOT NULL, -- 'RUNNING', 'STOPPED', 'ERROR'
      config TEXT NOT NULL, -- JSON config
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      bot_id TEXT,
      symbol TEXT NOT NULL,
      side TEXT NOT NULL,
      price REAL NOT NULL,
      size REAL NOT NULL,
      status TEXT NOT NULL, -- 'NEW', 'FILLED', 'CANCELLED'
      hl_order_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Fills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fills (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      price REAL NOT NULL,
      size REAL NOT NULL,
      fee REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PnL Snapshots
  db.exec(`
    CREATE TABLE IF NOT EXISTS pnl_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT,
      total_pnl REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Risk Events
  db.exec(`
    CREATE TABLE IF NOT EXISTS risk_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export default db;
