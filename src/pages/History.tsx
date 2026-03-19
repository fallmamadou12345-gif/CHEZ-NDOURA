import { useEffect, useState } from "react";
import { Transaction } from "../types";
import { storage } from "../services/storage";
import { ArrowUpRight, ArrowDownLeft, Search, Calendar, Trash2, AlertCircle } from "lucide-react";

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "SALE" | "PURCHASE" | "WITHDRAWAL">("ALL");
  const [productsMap, setProductsMap] = useState<Record<string, string>>({});
  
  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Initial fetch for products (we can subscribe if needed, but fetch is okay for names map)
        const prods = await storage.getProducts();
        const pMap: Record<string, string> = {};
        prods.forEach(p => pMap[String(p.id)] = p.name);
        setProductsMap(pMap);
      } catch (error) {
        console.error("Failed to load products", error);
      }
    };
    loadData();

    // Subscribe to transactions
    const unsubscribe = storage.subscribeTransactions((txs) => {
      // Sort transactions by date (newest first)
      setTransactions(txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string | number, type: string) => {
    if (confirm(`Êtes-vous sûr de vouloir annuler cette ${type === 'SALE' ? 'vente' : 'transaction'} ?\nLe stock sera automatiquement ajusté.`)) {
      try {
        await storage.deleteTransaction(id);
        // No need to fetch, subscription handles it
      } catch (error) {
        alert("Erreur lors de l'annulation");
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = productsMap[String(t.product_id)]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.id.toString().includes(searchTerm);
    const matchesType = filterType === "ALL" || t.type === filterType;
    
    // Date filtering
    let matchesDate = true;
    const txDate = new Date(t.timestamp);
    txDate.setHours(0, 0, 0, 0); // Normalize to start of day for comparison
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (txDate < start) matchesDate = false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (txDate > end) matchesDate = false;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Calculate totals
  const totalSales = filteredTransactions.filter(t => t.type === 'SALE').reduce((sum, t) => sum + t.total_amount, 0);
  const totalPurchases = filteredTransactions.filter(t => t.type === 'PURCHASE').reduce((sum, t) => sum + t.total_amount, 0);
  const totalWithdrawals = filteredTransactions.filter(t => t.type === 'WITHDRAWAL').reduce((sum, t) => sum + t.total_amount, 0);

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement de l'historique...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Historique des Transactions</h2>
        <p className="text-slate-500">Consultez toutes les ventes, achats et retraits avec filtrage par période.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(filterType === 'ALL' || filterType === 'SALE') && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-emerald-600 text-sm font-medium mb-1">Total des Ventes</p>
              <p className="text-2xl font-bold text-emerald-700">{totalSales.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <ArrowUpRight className="w-6 h-6" />
            </div>
          </div>
        )}
        {(filterType === 'ALL' || filterType === 'PURCHASE') && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium mb-1">Total des Achats</p>
              <p className="text-2xl font-bold text-blue-700">{totalPurchases.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>
        )}
        {(filterType === 'ALL' || filterType === 'WITHDRAWAL') && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium mb-1">Total des Retraits</p>
              <p className="text-2xl font-bold text-red-700">{totalWithdrawals.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <ArrowDownLeft className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher par produit ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex gap-2 items-center bg-white border border-slate-200 rounded-xl px-3 py-1">
            <Calendar className="text-slate-400 w-5 h-5" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-none focus:ring-0 text-sm text-slate-600 outline-none"
            />
            <span className="text-slate-400">au</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-none focus:ring-0 text-sm text-slate-600 outline-none"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 ml-2"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === "ALL" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilterType("SALE")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === "SALE" ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Ventes
          </button>
          <button
            onClick={() => setFilterType("PURCHASE")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === "PURCHASE" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Achats
          </button>
          <button
            onClick={() => setFilterType("WITHDRAWAL")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              filterType === "WITHDRAWAL" ? "bg-red-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Retraits
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produit / Client</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Quantité</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Prix Unitaire</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                    {new Date(t.timestamp).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      {t.type === 'SALE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <ArrowUpRight className="w-3 h-3 mr-1" /> Vente
                        </span>
                      ) : t.type === 'PURCHASE' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <ArrowDownLeft className="w-3 h-3 mr-1" /> Achat
                        </span>
                      ) : t.type === 'WITHDRAWAL' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <ArrowDownLeft className="w-3 h-3 mr-1" /> Retrait
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          Autre
                        </span>
                      )}
                      
                      {t.payment_method && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                          t.payment_method === 'CASH' ? 'bg-slate-100 text-slate-600' :
                          t.payment_method === 'WAVE' ? 'bg-blue-50 text-blue-600' :
                          t.payment_method === 'ORANGE_MONEY' ? 'bg-orange-50 text-orange-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {t.payment_method === 'ORANGE_MONEY' ? 'ORANGE M.' : t.payment_method}
                          {t.status === 'PENDING' && ` (Reste: ${(t.total_amount - (t.payments?.reduce((s, p) => s + p.amount, 0) || 0)).toLocaleString('fr-FR')})`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {t.type === 'WITHDRAWAL' ? 'Retrait de Caisse' : (productsMap[String(t.product_id)] || `Produit #${t.product_id}`)}
                    </div>
                    {t.customer_name && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Client: {t.customer_name}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {t.quantity}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {t.unit_price.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    {t.total_amount.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(t.id, t.type)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Annuler cette transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Aucune transaction trouvée pour cette période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
