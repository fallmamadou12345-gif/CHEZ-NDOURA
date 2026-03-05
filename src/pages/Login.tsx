import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Store, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'CASHIER' | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (login(selectedRole, pin)) {
      // Success is handled by state change in App.tsx
    } else {
      setError('Code PIN incorrect');
      setPin('');
    }
  };

  const handleRoleSelect = (role: 'ADMIN' | 'CASHIER') => {
    setSelectedRole(role);
    setError('');
    setPin('');
    // Auto-login for cashier (no pin for now to keep it simple, or add one later)
    if (role === 'CASHIER') {
      login('CASHIER');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
      >
        <div className="bg-indigo-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CHEZ NDOURA</h1>
          <p className="text-indigo-100 mt-1">Gestion de Boutique</p>
        </div>

        <div className="p-8">
          {!selectedRole ? (
            <div className="space-y-4">
              <h2 className="text-center text-slate-500 mb-6">Qui êtes-vous ?</h2>
              
              <button 
                onClick={() => handleRoleSelect('ADMIN')}
                className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900">Gérant</div>
                  <div className="text-sm text-slate-500">Accès complet</div>
                </div>
              </button>

              <button 
                onClick={() => handleRoleSelect('CASHIER')}
                className="w-full p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <User className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900">Caissier</div>
                  <div className="text-sm text-slate-500">Ventes uniquement</div>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="text-sm text-slate-400 hover:text-slate-600 mb-4"
                >
                  ← Retour
                </button>
                <h2 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  Code PIN Gérant
                </h2>
              </div>

              <div>
                <input
                  autoFocus
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={4}
                  className="w-full text-center text-3xl tracking-[1em] font-mono py-4 border-b-2 border-slate-200 focus:border-indigo-600 outline-none bg-transparent transition-colors"
                  placeholder="••••"
                />
                {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200"
              >
                Connexion
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
