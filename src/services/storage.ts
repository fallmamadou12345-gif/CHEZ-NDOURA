import { Product, Transaction, Expense, User } from "../types";

const STORAGE_KEYS = {
  PRODUCTS: "boutique_products",
  TRANSACTIONS: "boutique_transactions",
  EXPENSES: "boutique_expenses",
  USERS: "boutique_users",
};

// Helper to simulate async delay for realism (optional, but good for UI loading states)
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const storage = {
  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    await delay(100);
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return data ? JSON.parse(data) : [];
  },

  saveProduct: async (product: Omit<Product, "id" | "created_at">): Promise<Product> => {
    await delay(100);
    const products = await storage.getProducts();
    const newProduct: Product = {
      ...product,
      id: Date.now(), // Simple ID generation
      created_at: new Date().toISOString(),
      // Calculate derived fields
      unit_cost: product.batch_price / product.batch_quantity,
      margin: product.unit_sell_price - (product.batch_price / product.batch_quantity),
      margin_percent: ((product.unit_sell_price - (product.batch_price / product.batch_quantity)) / product.unit_sell_price) * 100
    };
    products.push(newProduct);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return newProduct;
  },

  updateProduct: async (id: number, updates: Partial<Product>): Promise<Product> => {
    await delay(100);
    const products = await storage.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error("Product not found");

    const updatedProduct = { ...products[index], ...updates };
    
    // Recalculate derived fields if price/qty changed
    if (updates.batch_price || updates.batch_quantity || updates.unit_sell_price) {
       updatedProduct.unit_cost = updatedProduct.batch_price / updatedProduct.batch_quantity;
       updatedProduct.margin = updatedProduct.unit_sell_price - updatedProduct.unit_cost;
       updatedProduct.margin_percent = (updatedProduct.margin / updatedProduct.unit_sell_price) * 100;
    }

    products[index] = updatedProduct;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return updatedProduct;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await delay(100);
    const products = await storage.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    await delay(100);
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: async (transaction: Omit<Transaction, "id" | "timestamp" | "total_amount">): Promise<Transaction> => {
    await delay(100);
    const transactions = await storage.getTransactions();
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      total_amount: transaction.quantity * transaction.unit_price,
    };
    transactions.push(newTransaction);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));

    // Update product stock
    const products = await storage.getProducts();
    const productIndex = products.findIndex(p => p.id === transaction.product_id);
    if (productIndex !== -1) {
      const product = products[productIndex];
      if (transaction.type === 'SALE') {
        product.stock_quantity -= transaction.quantity;
      } else if (transaction.type === 'PURCHASE') {
        product.stock_quantity += transaction.quantity;
      }
      products[productIndex] = product;
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    }

    return newTransaction;
  },

  // --- Expenses ---
  getExpenses: async (): Promise<Expense[]> => {
    await delay(100);
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : [];
  },

  saveExpense: async (expense: Omit<Expense, "id" | "date">): Promise<Expense> => {
    await delay(100);
    const expenses = await storage.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: Date.now(),
      date: new Date().toISOString(),
    };
    expenses.push(newExpense);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    return newExpense;
  },

  deleteExpense: async (id: number): Promise<void> => {
    await delay(100);
    const expenses = await storage.getExpenses();
    const filtered = expenses.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(filtered));
  },

  // --- Export/Import ---
  exportData: async () => {
    return {
      products: await storage.getProducts(),
      transactions: await storage.getTransactions(),
      expenses: await storage.getExpenses(),
      timestamp: new Date().toISOString(),
    };
  },
  
  importData: async (data: any) => {
    if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    if (data.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
    if (data.expenses) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
  },

  // --- Stats & Reports ---
  getDashboardStats: async () => {
    await delay(100);
    const transactions = await storage.getTransactions();
    const expenses = await storage.getExpenses();
    const products = await storage.getProducts();

    const sales = transactions.filter(t => t.type === 'SALE');
    const revenue = sales.reduce((sum, t) => sum + t.total_amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    // Calculate Gross Profit (Revenue - COGS)
    // COGS = Cost of Goods Sold. For each sale, we need the unit cost of the product.
    // In a real app, we'd track cost at transaction time. Here we use current product unit_cost.
    // This is an approximation if costs change over time, but sufficient for now.
    let cogs = 0;
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product && product.unit_cost) {
        cogs += product.unit_cost * sale.quantity;
      }
    });

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;
    const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_threshold).length;

    return {
      revenue,
      grossProfit,
      netProfit,
      totalExpenses,
      salesCount: sales.length,
      lowStockCount
    };
  },

  getPerformanceReport: async () => {
    await delay(100);
    const transactions = await storage.getTransactions();
    const products = await storage.getProducts();
    const sales = transactions.filter(t => t.type === 'SALE');

    // Best Sellers
    const productSales = new Map<number, number>();
    sales.forEach(t => {
      const current = productSales.get(t.product_id) || 0;
      productSales.set(t.product_id, current + t.quantity);
    });

    const bestSellers = Array.from(productSales.entries())
      .map(([id, total_sold]) => {
        const product = products.find(p => p.id === id);
        return {
          name: product?.name || 'Unknown',
          total_sold
        };
      })
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);

    // Most Profitable
    const productProfit = new Map<number, number>();
    sales.forEach(t => {
      const product = products.find(p => p.id === t.product_id);
      if (product && product.unit_cost) {
        const profit = (t.unit_price - product.unit_cost) * t.quantity;
        const current = productProfit.get(t.product_id) || 0;
        productProfit.set(t.product_id, current + profit);
      }
    });

    const mostProfitable = Array.from(productProfit.entries())
      .map(([id, profit]) => {
        const product = products.find(p => p.id === id);
        return {
          name: product?.name || 'Unknown',
          profit
        };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    return {
      bestSellers,
      mostProfitable
    };
  }
};
