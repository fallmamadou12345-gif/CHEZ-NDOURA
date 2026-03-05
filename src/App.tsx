/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { NAV_ITEMS } from "./constants";
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Menu, X } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";

import History from "./pages/History";

export default function App() {
  const [activeTab, setActiveTab] = useState("/");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      case "/history":
        return <History />;
      case "/settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-white">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-400" />
            CHEZ NDOURA
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => setActiveTab(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                activeTab === item.href
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.title}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 text-center">
            v1.1.0 • Connecté
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          CHEZ NDOURA
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
              {NAV_ITEMS.map((item) => (
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

