import { LucideIcon } from "lucide-react";

export type Role = 'ADMIN' | 'CASHIER';

export interface User {
  id: string | number;
  name: string;
  role: Role;
  pin?: string;
  created_at?: string;
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
  image?: string;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock_equivalent: number;
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
  totalStockValue: number;
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
