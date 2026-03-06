import React, { useState } from "react";
import { NAV_ITEMS } from "./constants";
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Menu, X, Lock, LogOut } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import POS from "./pages/POS";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import History from "./pages/History";
import { AuthProvider, useAuth } from "./context/AuthContext";

function LoginScreen() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(pin);
    if (!success) {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">CHEZ NDOURA</h1>
        <p className="text-slate-500 mb-8">Veuillez entrer votre code PIN</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            className={`w-full text-center text-3xl tracking-[1em] font-bold py-4 border-2 rounded-xl outline-none transition-colors ${error ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 focus:border-blue-500'}`}
            placeholder="••••"
            maxLength={4}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">Code PIN incorrect</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors"
          >
            Déverrouiller
          </button>
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("/");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "/":
        return <Dashboard onNavigate={setActiveTab} />;
      case "/inventory":
        return isAdmin ? <Inventory /> : <div className="p-8 text-center text-slate-500">Accès réservé aux administrateurs</div>;
      case "/pos":
        return <POS />;
      case "/expenses":
        return isAdmin ? <Expenses /> : <div className="p-8 text-center text-slate-500">Accès réservé aux administrateurs</div>;
      case "/reports":
        return isAdmin ? <Reports /> : <div className="p-8 text-center text-slate-500">Accès réservé aux administrateurs</div>;
      case "/history":
        return <History />;
      case "/settings":
        return isAdmin ? <Settings /> : <div className="p-8 text-center text-slate-500">Accès réservé aux administrateurs</div>;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  // Filter nav items based on role
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (isAdmin) return true;
    // Cashier only sees POS and History
    return ["/pos", "/history"].includes(item.href);
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-white">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-400" />
            CHEZ NDOURA
          </h1>
          <div className="mt-4 flex items-center gap-3 bg-slate-800 p-3 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.role === 'ADMIN' ? 'Administrateur' : 'Caissier'}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
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
        <div className="p-4 border-t border-slate-800 space-y-4">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl w-full transition-colors text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
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
            <div className="p-4 border-b border-slate-100 mb-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.role === 'ADMIN' ? 'Administrateur' : 'Caissier'}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto">
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
            <div className="pt-4 border-t border-slate-100 mt-auto">
              <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl w-full transition-colors text-sm font-medium"
              >
                <LogOut className="w-5 h-5" />
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

