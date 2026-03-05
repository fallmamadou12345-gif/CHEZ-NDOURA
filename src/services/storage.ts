import { Product, Transaction, Expense } from "../types";
import { db, isFirebaseReady } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  Timestamp,
  getDoc,
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";

const COLLECTIONS = {
  PRODUCTS: "products",
  TRANSACTIONS: "transactions",
  EXPENSES: "expenses",
  USERS: "users",
};

// Check if Firebase is configured
const isFirebaseConfigured = isFirebaseReady;

// Local Storage Keys
const LS_KEYS = {
  PRODUCTS: "products",
  TRANSACTIONS: "transactions",
  EXPENSES: "expenses",
  USERS: "users",
};

// Helper for Local Storage Events
const dispatchStorageEvent = (key: string) => {
  window.dispatchEvent(new Event(`storage-${key}`));
};

export const storage = {
  // --- Users ---
  getUsers: async (): Promise<User[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, COLLECTIONS.USERS));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as User));
      } catch (error) {
        console.error("Error getting users:", error);
        return [];
      }
    } else {
      const data = localStorage.getItem(LS_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    }
  },

  saveUser: async (user: Omit<User, "id" | "created_at">): Promise<User> => {
    const newUserData = {
      ...user,
      created_at: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), newUserData);
      return { id: docRef.id, ...newUserData } as unknown as User;
    } else {
      const users = await storage.getUsers();
      const newUser = { id: Date.now().toString(), ...newUserData } as unknown as User;
      users.push(newUser);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
      return newUser;
    }
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, COLLECTIONS.USERS, id), updates);
    } else {
      const users = await storage.getUsers();
      const index = users.findIndex(u => u.id === id);
      if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
      }
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, COLLECTIONS.USERS, id));
    } else {
      const users = await storage.getUsers();
      const newUsers = users.filter(u => u.id !== id);
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(newUsers));
    }
  },

  // --- Products ---
  getProducts: async (): Promise<Product[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, COLLECTIONS.PRODUCTS));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Product));
      } catch (error) {
        console.error("Error getting products:", error);
        return [];
      }
    } else {
      // Local Storage
      const data = localStorage.getItem(LS_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    }
  },

  subscribeProducts: (callback: (products: Product[]) => void): Unsubscribe => {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, COLLECTIONS.PRODUCTS));
      return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Product));
        callback(products);
      }, (error) => {
        console.error("Error subscribing to products:", error);
      });
    } else {
      // Local Storage Subscription
      const handler = () => {
        const data = localStorage.getItem(LS_KEYS.PRODUCTS);
        callback(data ? JSON.parse(data) : []);
      };
      window.addEventListener(`storage-${LS_KEYS.PRODUCTS}`, handler);
      // Initial call
      handler();
      return () => window.removeEventListener(`storage-${LS_KEYS.PRODUCTS}`, handler);
    }
  },

  saveProduct: async (product: Omit<Product, "id" | "created_at">): Promise<Product> => {
    const newProductData = {
      ...product,
      created_at: new Date().toISOString(),
      // Calculate derived fields
      unit_cost: product.batch_price / product.batch_quantity,
      margin: product.unit_sell_price - (product.batch_price / product.batch_quantity),
      margin_percent: ((product.unit_sell_price - (product.batch_price / product.batch_quantity)) / product.unit_sell_price) * 100
    };
    
    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), newProductData);
      return { id: docRef.id, ...newProductData } as unknown as Product;
    } else {
      // Local Storage
      const products = await storage.getProducts();
      const newProduct = { id: Date.now().toString(), ...newProductData } as unknown as Product;
      products.push(newProduct);
      localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
      dispatchStorageEvent(LS_KEYS.PRODUCTS);
      return newProduct;
    }
  },

  updateProduct: async (id: number | string, updates: Partial<Product>): Promise<Product> => {
    if (isFirebaseConfigured && db) {
      const productRef = doc(db, COLLECTIONS.PRODUCTS, String(id));
      
      // Recalculate derived fields if price/qty changed in updates
      const derivedUpdates: any = { ...updates };
      if (updates.batch_price !== undefined || updates.batch_quantity !== undefined || updates.unit_sell_price !== undefined) {
         const snapshot = await getDoc(productRef);
         if (snapshot.exists()) {
           const current = snapshot.data() as Product;
           const merged = { ...current, ...updates };
           derivedUpdates.unit_cost = merged.batch_price / merged.batch_quantity;
           derivedUpdates.margin = merged.unit_sell_price - merged.unit_cost;
           derivedUpdates.margin_percent = (merged.margin / merged.unit_sell_price) * 100;
         }
      }
  
      await updateDoc(productRef, derivedUpdates);
      return { id, ...derivedUpdates } as unknown as Product;
    } else {
      // Local Storage
      const products = await storage.getProducts();
      const index = products.findIndex(p => String(p.id) === String(id));
      if (index !== -1) {
        const current = products[index];
        const merged = { ...current, ...updates };
        
        // Recalculate derived
        if (updates.batch_price !== undefined || updates.batch_quantity !== undefined || updates.unit_sell_price !== undefined) {
          merged.unit_cost = merged.batch_price / merged.batch_quantity;
          merged.margin = merged.unit_sell_price - merged.unit_cost;
          merged.margin_percent = (merged.margin / merged.unit_sell_price) * 100;
        }
        
        products[index] = merged;
        localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
        dispatchStorageEvent(LS_KEYS.PRODUCTS);
        return merged;
      }
      throw new Error("Product not found");
    }
  },

  deleteProduct: async (id: number | string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, String(id)));
    } else {
      const products = await storage.getProducts();
      const newProducts = products.filter(p => String(p.id) !== String(id));
      localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(newProducts));
      dispatchStorageEvent(LS_KEYS.PRODUCTS);
    }
  },

  // --- Transactions ---
  getTransactions: async (): Promise<Transaction[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Transaction));
      } catch (error) {
        console.error("Error getting transactions:", error);
        return [];
      }
    } else {
      const data = localStorage.getItem(LS_KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    }
  },

  subscribeTransactions: (callback: (transactions: Transaction[]) => void): Unsubscribe => {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy("timestamp", "desc"));
      return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Transaction));
        callback(transactions);
      }, (error) => {
        console.error("Error subscribing to transactions:", error);
      });
    } else {
      const handler = () => {
        const data = localStorage.getItem(LS_KEYS.TRANSACTIONS);
        callback(data ? JSON.parse(data) : []);
      };
      window.addEventListener(`storage-${LS_KEYS.TRANSACTIONS}`, handler);
      handler();
      return () => window.removeEventListener(`storage-${LS_KEYS.TRANSACTIONS}`, handler);
    }
  },

  saveTransaction: async (transaction: Omit<Transaction, "id" | "timestamp" | "total_amount">): Promise<Transaction> => {
    const newTransactionData = {
      ...transaction,
      timestamp: new Date().toISOString(),
      total_amount: transaction.quantity * transaction.unit_price,
    };
    
    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), newTransactionData);
  
      // Update product stock
      const productRef = doc(db, COLLECTIONS.PRODUCTS, String(transaction.product_id));
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const product = productSnap.data() as Product;
        let newStock = product.stock_quantity;
        
        if (transaction.type === 'SALE') {
          newStock -= transaction.quantity;
        } else if (transaction.type === 'PURCHASE') {
          newStock += transaction.quantity;
        }
        
        await updateDoc(productRef, { stock_quantity: newStock });
      }
  
      return { id: docRef.id, ...newTransactionData } as unknown as Transaction;
    } else {
      // Local Storage
      const transactions = await storage.getTransactions();
      const newTransaction = { id: Date.now().toString(), ...newTransactionData } as unknown as Transaction;
      transactions.unshift(newTransaction); // Add to beginning
      localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(transactions));
      dispatchStorageEvent(LS_KEYS.TRANSACTIONS);

      // Update product stock
      const products = await storage.getProducts();
      const productIndex = products.findIndex(p => String(p.id) === String(transaction.product_id));
      
      if (productIndex !== -1) {
        const product = products[productIndex];
        let newStock = product.stock_quantity;
        
        if (transaction.type === 'SALE') {
          newStock -= transaction.quantity;
        } else if (transaction.type === 'PURCHASE') {
          newStock += transaction.quantity;
        }
        
        products[productIndex] = { ...product, stock_quantity: newStock };
        localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(products));
        dispatchStorageEvent(LS_KEYS.PRODUCTS);
      }

      return newTransaction;
    }
  },

  // --- Expenses ---
  getExpenses: async (): Promise<Expense[]> => {
    if (isFirebaseConfigured && db) {
      try {
        const q = query(collection(db, COLLECTIONS.EXPENSES), orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Expense));
      } catch (error) {
        console.error("Error getting expenses:", error);
        return [];
      }
    } else {
      const data = localStorage.getItem(LS_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    }
  },

  subscribeExpenses: (callback: (expenses: Expense[]) => void): Unsubscribe => {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, COLLECTIONS.EXPENSES), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Expense));
        callback(expenses);
      }, (error) => {
        console.error("Error subscribing to expenses:", error);
      });
    } else {
      const handler = () => {
        const data = localStorage.getItem(LS_KEYS.EXPENSES);
        callback(data ? JSON.parse(data) : []);
      };
      window.addEventListener(`storage-${LS_KEYS.EXPENSES}`, handler);
      handler();
      return () => window.removeEventListener(`storage-${LS_KEYS.EXPENSES}`, handler);
    }
  },

  saveExpense: async (expense: Omit<Expense, "id" | "date">): Promise<Expense> => {
    const newExpenseData = {
      ...expense,
      date: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      const docRef = await addDoc(collection(db, COLLECTIONS.EXPENSES), newExpenseData);
      return { id: docRef.id, ...newExpenseData } as unknown as Expense;
    } else {
      const expenses = await storage.getExpenses();
      const newExpense = { id: Date.now().toString(), ...newExpenseData } as unknown as Expense;
      expenses.unshift(newExpense);
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(expenses));
      dispatchStorageEvent(LS_KEYS.EXPENSES);
      return newExpense;
    }
  },

  deleteExpense: async (id: number | string): Promise<void> => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, COLLECTIONS.EXPENSES, String(id)));
    } else {
      const expenses = await storage.getExpenses();
      const newExpenses = expenses.filter(e => String(e.id) !== String(id));
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(newExpenses));
      dispatchStorageEvent(LS_KEYS.EXPENSES);
    }
  },

  // --- Export/Import ---
  exportData: async () => {
    return {
      products: await storage.getProducts(),
      transactions: await storage.getTransactions(),
      expenses: await storage.getExpenses(),
      users: await storage.getUsers(),
      timestamp: new Date().toISOString(),
    };
  },
  
  importData: async (data: any) => {
    if (isFirebaseConfigured && db) {
      if (data.products) {
        for (const p of data.products) {
          const { id, ...rest } = p; 
          await addDoc(collection(db, COLLECTIONS.PRODUCTS), rest);
        }
      }
      if (data.users) {
        for (const u of data.users) {
          const { id, ...rest } = u;
          await addDoc(collection(db, COLLECTIONS.USERS), rest);
        }
      }
      // ... (simplified for cloud import)
    } else {
      // Local Storage Import (Replace or Merge?)
      // Let's replace for simplicity as per user request usually
      if (data.products) localStorage.setItem(LS_KEYS.PRODUCTS, JSON.stringify(data.products));
      if (data.transactions) localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
      if (data.expenses) localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(data.expenses));
      if (data.users) localStorage.setItem(LS_KEYS.USERS, JSON.stringify(data.users));
      
      dispatchStorageEvent(LS_KEYS.PRODUCTS);
      dispatchStorageEvent(LS_KEYS.TRANSACTIONS);
      dispatchStorageEvent(LS_KEYS.EXPENSES);
    }
  },

  // --- Stats & Reports ---
  getDashboardStats: async () => {
    const transactions = await storage.getTransactions();
    const expenses = await storage.getExpenses();
    const products = await storage.getProducts();

    const sales = transactions.filter(t => t.type === 'SALE');
    const revenue = sales.reduce((sum, t) => sum + t.total_amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    let cogs = 0;
    sales.forEach(sale => {
      const product = products.find(p => String(p.id) === String(sale.product_id));
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
    const transactions = await storage.getTransactions();
    const products = await storage.getProducts();
    const sales = transactions.filter(t => t.type === 'SALE');

    // Best Sellers
    const productSales = new Map<string, number>();
    sales.forEach(t => {
      const pid = String(t.product_id);
      const current = productSales.get(pid) || 0;
      productSales.set(pid, current + t.quantity);
    });

    const bestSellers = Array.from(productSales.entries())
      .map(([id, total_sold]) => {
        const product = products.find(p => String(p.id) === id);
        return {
          name: product?.name || 'Unknown',
          total_sold
        };
      })
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);

    // Most Profitable
    const productProfit = new Map<string, number>();
    sales.forEach(t => {
      const pid = String(t.product_id);
      const product = products.find(p => String(p.id) === pid);
      if (product && product.unit_cost) {
        const profit = (t.unit_price - product.unit_cost) * t.quantity;
        const current = productProfit.get(pid) || 0;
        productProfit.set(pid, current + profit);
      }
    });

    const mostProfitable = Array.from(productProfit.entries())
      .map(([id, profit]) => {
        const product = products.find(p => String(p.id) === id);
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
