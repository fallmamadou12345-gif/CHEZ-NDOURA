import { useEffect, useState } from "react";
import { DashboardStats } from "../types";
import { DollarSign, ShoppingBag, AlertTriangle, TrendingUp, TrendingDown, Wallet, Package, Banknote, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { storage } from "../services/storage";

interface DashboardProps {
  onNavigate: (path: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({
    amount: '',
    payment_method: 'CASH' as 'CASH' | 'WAVE' | 'ORANGE_MONEY',
    reason: 'Achat de nouveaux produits'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalData.amount) return;
    
    setIsSubmitting(true);
    try {
      await storage.saveTransaction({
        product_id: 'WITHDRAWAL',
        type: 'WITHDRAWAL',
        quantity: 1,
        unit_price: Number(withdrawalData.amount),
        total_amount: Number(withdrawalData.amount),
        payment_method: withdrawalData.payment_method
      });
      
      setIsWithdrawalModalOpen(false);
      setWithdrawalData({ amount: '', payment_method: 'CASH', reason: 'Achat de nouveaux produits' });
      
      // Reload stats
      const data = await storage.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const StatCard = ({ title, value, icon: Icon, imageUrl, color, subtext, onClick }: any) => (
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
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${imageUrl ? 'bg-transparent' : color}`}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full rounded-xl object-cover shadow-sm" referrerPolicy="no-referrer" />
          ) : Icon ? (
            <Icon className="w-6 h-6 text-white" />
          ) : null}
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

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-900">Caisse par Mode de Paiement</h3>
          <button
            onClick={() => setIsWithdrawalModalOpen(true)}
            className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm"
          >
            <Banknote className="w-4 h-4" />
            <span>Retrait / Vider Caisse</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Caisse Espèces"
            value={`${stats?.totalCash.toLocaleString('fr-FR')} FCFA`}
            icon={Banknote}
            color="bg-emerald-600"
            subtext="Total des ventes en espèces"
          />
          <StatCard
            title="Caisse Wave"
            value={`${stats?.totalWave.toLocaleString('fr-FR')} FCFA`}
            imageUrl="https://play-lh.googleusercontent.com/B2sfLVgRWgV_bk5rtF51w6AieJWXc0qWbyWoaA8pMNp-is41AmvhJYVr95Dq9hT97Es"
            color="bg-blue-500"
            subtext="Total des paiements Wave"
          />
          <StatCard
            title="Caisse Orange Money"
            value={`${stats?.totalOrangeMoney.toLocaleString('fr-FR')} FCFA`}
            imageUrl="https://play-lh.googleusercontent.com/VGOxVRf_AtRYSFbYCr1qZ-eZDDldQxt8dpjQ62MFpoS9JXK-f2l1DIKxjt8TJ8MX-txu"
            color="bg-orange-500"
            subtext="Total des paiements Orange Money"
          />
        </div>
      </div>

      {/* Quick Actions or Recent Activity could go here */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <h3 className="text-lg font-medium text-slate-900 mb-2">Bienvenue dans votre gestionnaire</h3>
        <p className="text-slate-500 max-w-lg mx-auto">
          Utilisez le menu latéral pour accéder à la caisse, gérer votre inventaire ou consulter les rapports détaillés.
        </p>
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Retrait de Caisse</h3>
              <button onClick={() => setIsWithdrawalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleWithdrawal} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Enregistrez un retrait (ex: pour l'achat de nouveaux produits). Cela déduira le montant de la caisse sélectionnée.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Caisse</label>
                <select
                  value={withdrawalData.payment_method}
                  onChange={e => setWithdrawalData({...withdrawalData, payment_method: e.target.value as any})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="CASH">Espèces ({stats?.totalCash.toLocaleString('fr-FR')} FCFA)</option>
                  <option value="WAVE">Wave ({stats?.totalWave.toLocaleString('fr-FR')} FCFA)</option>
                  <option value="ORANGE_MONEY">Orange Money ({stats?.totalOrangeMoney.toLocaleString('fr-FR')} FCFA)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant à retirer (FCFA)</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={withdrawalData.amount}
                  onChange={e => setWithdrawalData({...withdrawalData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono"
                  placeholder="Ex: 50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
                <input
                  required
                  type="text"
                  value={withdrawalData.reason}
                  onChange={e => setWithdrawalData({...withdrawalData, reason: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Ex: Achat de marchandises"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawalModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Enregistrement..." : "Valider le retrait"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
