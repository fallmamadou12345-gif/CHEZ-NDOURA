import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Receipt } from "lucide-react";
import { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { title: "Tableau de Bord", href: "/", icon: LayoutDashboard },
  { title: "Caisse (POS)", href: "/pos", icon: ShoppingCart },
  { title: "Stocks & Produits", href: "/inventory", icon: Package },
  { title: "Dépenses & Frais", href: "/expenses", icon: Receipt },
  { title: "Rapports", href: "/reports", icon: BarChart3 },
  { title: "Paramètres", href: "/settings", icon: Settings },
];
