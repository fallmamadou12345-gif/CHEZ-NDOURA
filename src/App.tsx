/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { NAV_ITEMS } from "./constants";
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Menu, X, LogOut, User as UserIcon } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import { User } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("/");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Check for persisted user session (simple localStorage implementation)
  useEffect(() => {
    const storedUser = localStorage.getItem("boutique_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem("boutique_user", JSON.stringify(loggedInUser));
    // Set default tab based on role
    if (loggedInUser.role === 'CASHIER') {
      setActiveTab("/pos");
    } else {
      setActiveTab("/");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("boutique_user");
    setActiveTab("/");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "/":
        return <Dashboard onNavigate={setActiveTab} />;
      case "/inventory":
        return <Inventory />;
      case "/pos":
        return <POS />;
      case "/expenses":
        return <Expenses />;
      case "/reports":
        return <Reports />;
      case "/settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  // Filter nav items based on role
  const getFilteredNavItems = () => {
    if (!user) return [];
    if (user.role === 'ADMIN') return NAV_ITEMS;
    if (user.role === 'CASHIER') {
      // Cashier sees everything EXCEPT Settings and maybe Reports?
      // Let's restrict Settings only for now.
      return NAV_ITEMS.filter(item => item.href !== '/settings');
    }
    return [];
  };

  const filteredNavItems = getFilteredNavItems();

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            Gestion Boutique
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {filteredNavItems.map((item) => (
            <button
              key={item.href}
              onClick={() => setActiveTab(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === item.href
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.title}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 px-4">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user.username}</p>
              <p className="text-xs text-slate-500 truncate">{user.role === 'ADMIN' ? 'Administrateur' : 'Caissière'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Gestion Boutique
        </h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-16 bottom-0 w-64 bg-white shadow-xl p-4 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex-1 space-y-1">
              {filteredNavItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    setActiveTab(item.href);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                    activeTab === item.href
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-4 mb-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user.username}</p>
                  <p className="text-xs text-slate-500">{user.role === 'ADMIN' ? 'Administrateur' : 'Caissière'}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

