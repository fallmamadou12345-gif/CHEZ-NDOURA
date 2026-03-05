import { useEffect, useState } from "react";
import { Transaction } from "../types";
import { storage } from "../services/storage";
import { ArrowUpRight, ArrowDownLeft, Search, Calendar } from "lucide-react";

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "SALE" | "PURCHASE">("ALL");
  const [productsMap, setProductsMap] = useState<Record<string, string>>({});

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

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = productsMap[String(t.product_id)]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.id.toString().includes(searchTerm);
    const matchesType = filterType === "ALL" || t.type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement de l'historique...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Historique des Transactions</h2>
        <p className="text-slate-500">Consultez toutes les ventes et les entrées de stock.</p>
      </div>

      {/* Filters */}
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
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filterType === "ALL" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilterType("SALE")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filterType === "SALE" ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Ventes
          </button>
          <button
            onClick={() => setFilterType("PURCHASE")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filterType === "PURCHASE" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Achats
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
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Quantité</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Prix Unitaire</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                    {new Date(t.timestamp).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    {t.type === 'SALE' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <ArrowUpRight className="w-3 h-3 mr-1" /> Vente
                      </span>
                    ) : t.type === 'PURCHASE' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <ArrowDownLeft className="w-3 h-3 mr-1" /> Achat
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        Autre
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {productsMap[String(t.product_id)] || `Produit #${t.product_id}`}
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
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Aucune transaction trouvée.
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
