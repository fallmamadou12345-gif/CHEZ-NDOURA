import { LucideIcon } from "lucide-react";

export interface User {
  id: number;
  username: string;
  role: 'ADMIN' | 'CASHIER';
}

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface Product {
  id: number | string;
  name: string;
  sku: string;
  batch_price: number;
  batch_quantity: number;
  unit_sell_price: number;
  stock_quantity: number;
  min_stock_threshold: number;
  unit: string;
  // Derived
  unit_cost?: number;
  margin?: number;
  margin_percent?: number;
}

export interface Transaction {
  id: number | string;
  product_id: number | string;
  type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT';
  quantity: number;
  unit_price: number;
  total_amount: number;
  timestamp: string;
}

export interface DashboardStats {
  revenue: number;
  salesCount: number;
  lowStockCount: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

export interface Expense {
  id: number | string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface PerformanceReport {
  bestSellers: { name: string; total_sold: number }[];
  mostProfitable: { name: string; profit: number }[];
}
