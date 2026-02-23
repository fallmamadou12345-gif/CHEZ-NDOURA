import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('boutique.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Products table
  // batch_price: Price paid for the batch
  // batch_quantity: Number of units in the batch (used to calc unit cost)
  // unit_sell_price: Price sold to customer
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT UNIQUE,
      batch_price REAL NOT NULL DEFAULT 0,
      batch_quantity INTEGER NOT NULL DEFAULT 1,
      unit_sell_price REAL NOT NULL DEFAULT 0,
      stock_quantity REAL NOT NULL DEFAULT 0, -- Changed to REAL to support fractional units (kg, L)
      min_stock_threshold REAL NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'U', -- 'U' (Unit), 'KG', 'G', 'L', 'ML'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Transactions table
  // type: 'PURCHASE' (stock in), 'SALE' (stock out), 'ADJUSTMENT'
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL, -- Changed to REAL
      unit_price REAL NOT NULL, -- For SALES: sell price. For PURCHASES: calculated unit cost.
      total_amount REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id)
    );
  `);

  // Expenses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL, -- 'RENT', 'UTILITIES', 'LOSS', 'SALARY', 'OTHER'
      description TEXT,
      amount REAL NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, -- In a real app, hash this!
      role TEXT NOT NULL -- 'ADMIN' or 'CASHIER'
    );
  `);

  // Seed default users if they don't exist
  const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  if (!adminExists) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('admin', 'admin', 'ADMIN');
  }

  const cashierExists = db.prepare("SELECT * FROM users WHERE username = 'caisse'").get();
  if (!cashierExists) {
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('caisse', 'caisse', 'CASHIER');
  }

  console.log('Database initialized');
}

export default db;
