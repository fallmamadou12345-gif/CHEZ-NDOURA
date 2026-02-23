import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb } from "./src/db";
import db from "./src/db";

// Initialize Database
initDb();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes

  // --- Products ---
  app.get("/api/products", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM products ORDER BY name ASC");
      const products = stmt.all();
      // Calculate derived fields for display
      const productsWithMetrics = products.map((p: any) => {
        const unitCost = p.batch_quantity > 0 ? p.batch_price / p.batch_quantity : 0;
        const margin = p.unit_sell_price - unitCost;
        const marginPercent = p.unit_sell_price > 0 ? (margin / p.unit_sell_price) * 100 : 0;
        return { ...p, unit_cost: unitCost, margin, margin_percent: marginPercent };
      });
      res.json(productsWithMetrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/api/products", (req, res) => {
    try {
      const { name, sku, batch_price, batch_quantity, unit_sell_price, stock_quantity, min_stock_threshold, unit } = req.body;
      const stmt = db.prepare(`
        INSERT INTO products (name, sku, batch_price, batch_quantity, unit_sell_price, stock_quantity, min_stock_threshold, unit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(name, sku, batch_price, batch_quantity, unit_sell_price, stock_quantity || 0, min_stock_threshold || 5, unit || 'U');
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    try {
      const { name, sku, batch_price, batch_quantity, unit_sell_price, min_stock_threshold, unit } = req.body;
      const stmt = db.prepare(`
        UPDATE products 
        SET name = ?, sku = ?, batch_price = ?, batch_quantity = ?, unit_sell_price = ?, min_stock_threshold = ?, unit = ?
        WHERE id = ?
      `);
      stmt.run(name, sku, batch_price, batch_quantity, unit_sell_price, min_stock_threshold, unit, req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    try {
      const stmt = db.prepare("DELETE FROM products WHERE id = ?");
      stmt.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // --- Transactions (Sales / Purchases) ---
  app.post("/api/transactions", (req, res) => {
    const { product_id, type, quantity, unit_price } = req.body;
    
    // type: 'SALE' (quantity is positive, but removes from stock)
    // type: 'PURCHASE' (quantity is positive, adds to stock)
    
    if (!['SALE', 'PURCHASE', 'ADJUSTMENT'].includes(type)) {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    const trx = db.transaction(() => {
      // 1. Get current stock
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id) as any;
      if (!product) throw new Error("Product not found");

      let newStock = product.stock_quantity;
      let totalAmount = 0;

      if (type === 'SALE') {
        if (product.stock_quantity < quantity) {
           throw new Error("Insufficient stock");
        }
        newStock -= quantity;
        totalAmount = quantity * unit_price; // Revenue
      } else if (type === 'PURCHASE') {
        newStock += quantity;
        totalAmount = quantity * unit_price; // Cost
      } else if (type === 'ADJUSTMENT') {
        // Direct stock adjustment if needed, logic depends on implementation
        // For now, let's assume quantity is the CHANGE amount
        newStock += quantity; 
        totalAmount = 0;
      }

      // 2. Update Product Stock
      db.prepare("UPDATE products SET stock_quantity = ? WHERE id = ?").run(newStock, product_id);

      // 3. Record Transaction
      db.prepare(`
        INSERT INTO transactions (product_id, type, quantity, unit_price, total_amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(product_id, type, quantity, unit_price, totalAmount);

      return { newStock };
    });

    try {
      const result = trx();
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- Expenses ---
  app.get("/api/expenses", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM expenses ORDER BY date DESC");
      const expenses = stmt.all();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", (req, res) => {
    try {
      const { category, description, amount, date } = req.body;
      const stmt = db.prepare(`
        INSERT INTO expenses (category, description, amount, date)
        VALUES (?, ?, ?, ?)
      `);
      // Use provided date or current timestamp
      const info = stmt.run(category, description, amount, date || new Date().toISOString());
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.delete("/api/expenses/:id", (req, res) => {
    try {
      const stmt = db.prepare("DELETE FROM expenses WHERE id = ?");
      stmt.run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // --- Auth ---
  app.post("/api/login", (req, res) => {
    try {
      const { username, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
      
      if (user) {
        res.json({ 
          id: user.id, 
          username: user.username, 
          role: user.role 
        });
      } else {
        res.status(401).json({ error: "Identifiants incorrects" });
      }
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // --- Data Management ---
  app.get("/api/export", (req, res) => {
    try {
      const products = db.prepare("SELECT * FROM products").all();
      const transactions = db.prepare("SELECT * FROM transactions").all();
      const expenses = db.prepare("SELECT * FROM expenses").all();
      const users = db.prepare("SELECT id, username, role FROM users").all();

      const data = {
        timestamp: new Date().toISOString(),
        products,
        transactions,
        expenses,
        users
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=boutique_backup_${new Date().toISOString().split('T')[0]}.json`);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Export failed" });
    }
  });

  // --- Dashboard Stats ---
  app.get("/api/stats", (req, res) => {
    try {
      // Total Revenue (Sales)
      const revenue = db.prepare("SELECT SUM(total_amount) as total FROM transactions WHERE type = 'SALE'").get() as any;
      
      // Total Sales Count
      const salesCount = db.prepare("SELECT COUNT(*) as count FROM transactions WHERE type = 'SALE'").get() as any;

      // Low Stock Items
      const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_threshold").get() as any;

      // Total Expenses
      const expenses = db.prepare("SELECT SUM(amount) as total FROM expenses").get() as any;
      const totalExpenses = expenses.total || 0;

      // Profit Calculation (Simplified: Revenue - (Sold Qty * Unit Cost))
      // We need to sum profit per sale. 
      // Profit = (Sale Price - (Batch Price / Batch Qty)) * Qty Sold
      // This is complex in SQL alone if batch prices change, but for this MVP we use current product batch price.
      // A more advanced system would track FIFO/LIFO, but the CdC implies a simpler model based on the product sheet.
      
      const products = db.prepare("SELECT id, batch_price, batch_quantity FROM products").all() as any[];
      let grossProfit = 0;
      
      // Get all sales
      const sales = db.prepare("SELECT product_id, quantity, unit_price FROM transactions WHERE type = 'SALE'").all() as any[];
      
      sales.forEach(sale => {
        const prod = products.find(p => p.id === sale.product_id);
        if (prod && prod.batch_quantity > 0) {
          const unitCost = prod.batch_price / prod.batch_quantity;
          const profit = (sale.unit_price - unitCost) * sale.quantity;
          grossProfit += profit;
        }
      });

      const netProfit = grossProfit - totalExpenses;

      res.json({
        revenue: revenue.total || 0,
        salesCount: salesCount.count || 0,
        lowStockCount: lowStock.count || 0,
        grossProfit: grossProfit,
        totalExpenses: totalExpenses,
        netProfit: netProfit
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  
  // --- Reports ---
  app.get("/api/reports/performance", (req, res) => {
    try {
      // Best sellers by volume
      const bestSellers = db.prepare(`
        SELECT p.name, SUM(t.quantity) as total_sold
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE t.type = 'SALE'
        GROUP BY p.id
        ORDER BY total_sold DESC
        LIMIT 5
      `).all();

      // Most profitable products
      // Again, calculating based on current cost structure
      const allSales = db.prepare(`
        SELECT t.product_id, t.quantity, t.unit_price, p.name, p.batch_price, p.batch_quantity
        FROM transactions t
        JOIN products p ON t.product_id = p.id
        WHERE t.type = 'SALE'
      `).all() as any[];

      const profitMap: Record<string, number> = {};
      
      allSales.forEach(sale => {
        if (sale.batch_quantity > 0) {
          const unitCost = sale.batch_price / sale.batch_quantity;
          const profit = (sale.unit_price - unitCost) * sale.quantity;
          if (!profitMap[sale.name]) profitMap[sale.name] = 0;
          profitMap[sale.name] += profit;
        }
      });

      const mostProfitable = Object.entries(profitMap)
        .map(([name, profit]) => ({ name, profit }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);

      res.json({ bestSellers, mostProfitable });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
