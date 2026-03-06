import { useEffect, useState } from "react";
import { DashboardStats } from "../types";
import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp, TrendingDown, Wallet, Package } from "lucide-react";
import { motion } from "motion/react";
import { storage } from "../services/storage";

interface DashboardProps {
  onNavigate: (path: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadStats = async () => {
      try {
        const data = await storage.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();

    // Subscribe to updates (products, transactions, expenses)
    // We subscribe to all because dashboard stats depend on all of them
    const unsubProducts = storage.subscribeProducts(async () => {
      const data = await storage.getDashboardStats();
      setStats(data);
    });
    
    const unsubTransactions = storage.subscribeTransactions(async () => {
      const data = await storage.getDashboardStats();
      setStats(data);
    });

    const unsubExpenses = storage.subscribeExpenses(async () => {
      const data = await storage.getDashboardStats();
      setStats(data);
    });

    return () => {
      unsubProducts();
      unsubTransactions();
      unsubExpenses();
    };
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subtext, onClick }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 cursor-pointer transition-all hover:shadow-md ${onClick ? 'hover:border-indigo-200' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement des données...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Tableau de Bord</h2>
        <p className="text-slate-500">Vue d'ensemble de l'activité de votre boutique.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Chiffre d'Affaires"
          value={`${stats?.revenue.toLocaleString('fr-FR')} FCFA`}
          icon={DollarSign}
          color="bg-blue-500"
          subtext="Total des ventes enregistrées"
          onClick={() => onNavigate('/reports')}
        />
        <StatCard
          title="Bénéfice Brut"
          value={`${stats?.grossProfit.toLocaleString('fr-FR')} FCFA`}
          icon={TrendingUp}
          color="bg-emerald-500"
          subtext="Marge sur ventes (avant frais)"
          onClick={() => onNavigate('/reports')}
        />
        <StatCard
          title="Total Dépenses"
          value={`${stats?.totalExpenses.toLocaleString('fr-FR')} FCFA`}
          icon={TrendingDown}
          color="bg-red-500"
          subtext="Charges, loyer, pertes..."
          onClick={() => onNavigate('/expenses')}
        />
        <StatCard
          title="Bénéfice Net"
          value={`${stats?.netProfit.toLocaleString('fr-FR')} FCFA`}
          icon={Wallet}
          color={stats?.netProfit && stats.netProfit >= 0 ? "bg-indigo-600" : "bg-orange-600"}
          subtext="Résultat final (Brut - Dépenses)"
          onClick={() => onNavigate('/reports')}
        />
        <StatCard
          title="Ventes Réalisées"
          value={stats?.salesCount}
          icon={ShoppingBag}
          color="bg-violet-500"
          subtext="Nombre de transactions"
          onClick={() => onNavigate('/reports')}
        />
        <StatCard
          title="Stock Faible"
          value={stats?.lowStockCount}
          icon={AlertTriangle}
          color="bg-amber-500"
          subtext="Produits sous le seuil d'alerte"
          onClick={() => onNavigate('/inventory')}
        />
        <StatCard
          title="Valeur du Stock"
          value={`${stats?.totalStockValue.toLocaleString('fr-FR')} FCFA`}
          icon={Package}
          color="bg-cyan-500"
          subtext="Valeur totale des produits en stock"
          onClick={() => onNavigate('/inventory')}
        />
      </div>

      {/* Quick Actions or Recent Activity could go here */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <h3 className="text-lg font-medium text-slate-900 mb-2">Bienvenue dans votre gestionnaire</h3>
        <p className="text-slate-500 max-w-lg mx-auto">
          Utilisez le menu latéral pour accéder à la caisse, gérer votre inventaire ou consulter les rapports détaillés.
        </p>
      </div>
    </div>
  );
}
