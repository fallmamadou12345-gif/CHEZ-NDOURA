import { useEffect, useState } from "react";
import { Transaction, PaymentMethod } from "../types";
import { storage } from "../services/storage";
import { Search, CheckCircle2, AlertCircle, Phone } from "lucide-react";

export default function Credits() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [productsMap, setProductsMap] = useState<Record<string, string>>({});
  
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const prods = await storage.getProducts();
        const pMap: Record<string, string> = {};
        prods.forEach(p => pMap[String(p.id)] = p.name);
        setProductsMap(pMap);
      } catch (error) {
        console.error("Failed to load products", error);
      }
    };
    loadData();

    const unsubscribe = storage.subscribeTransactions((txs) => {
      // Filter only pending credits
      const pendingCredits = txs.filter(t => t.payment_method === 'CREDIT' && t.status === 'PENDING');
      setTransactions(pendingCredits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSettle = async () => {
    if (!selectedTx) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Veuillez entrer un montant valide.");
      return;
    }
    
    const paid = selectedTx.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const remaining = selectedTx.total_amount - paid;
    
    if (amount > remaining) {
      alert("Le montant saisi est supérieur au reste à payer.");
      return;
    }

    setProcessing(true);
    try {
      await storage.addCreditPayment(selectedTx.id, amount, settlePaymentMethod);
      setSettleModalOpen(false);
      setSelectedTx(null);
      setPaymentAmount("");
    } catch (error) {
      alert("Erreur lors du règlement du crédit.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (t.customer_name?.toLowerCase().includes(searchLower)) ||
      (t.customer_phone?.toLowerCase().includes(searchLower)) ||
      (productsMap[String(t.product_id)]?.toLowerCase().includes(searchLower))
    );
  });

  const totalPending = filteredTransactions.reduce((sum, t) => {
    const paid = t.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    return sum + (t.total_amount - paid);
  }, 0);

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement des crédits...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Ventes à Crédit</h2>
        <p className="text-slate-500">Gérez les paiements en attente de vos clients.</p>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-red-600 text-sm font-medium mb-1">Total des Crédits en Attente</p>
          <p className="text-2xl font-bold text-red-700">{totalPending.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Rechercher par client, téléphone ou produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Payé</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Reste</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => {
                const paid = t.payments?.reduce((s, p) => s + p.amount, 0) || 0;
                const remaining = t.total_amount - paid;
                return (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 text-sm whitespace-nowrap">
                    {new Date(t.timestamp).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{t.customer_name || 'Inconnu'}</div>
                    {t.customer_phone && (
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" /> {t.customer_phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {productsMap[String(t.product_id)] || `Produit #${t.product_id}`}
                    <div className="text-xs text-slate-400 mt-1">Qté: {t.quantity}</div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-600">
                    {t.total_amount.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600">
                    {paid.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">
                    {remaining.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setSelectedTx(t);
                        setSettlePaymentMethod('CASH');
                        setPaymentAmount(remaining.toString());
                        setSettleModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Régler
                    </button>
                  </td>
                </tr>
              )})}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Aucun crédit en attente trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {settleModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Régler le crédit</h3>
              <p className="text-sm text-slate-500 mt-1">
                Client: <span className="font-medium text-slate-700">{selectedTx.customer_name}</span>
              </p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
                <span className="text-slate-600 font-medium">Reste à payer</span>
                <span className="text-2xl font-bold text-slate-900">
                  {(selectedTx.total_amount - (selectedTx.payments?.reduce((s, p) => s + p.amount, 0) || 0)).toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant à régler</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-900 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Mode de paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSettlePaymentMethod('CASH')}
                    className={`py-2 flex flex-col items-center justify-center gap-1 text-xs font-bold rounded-lg border transition-colors ${settlePaymentMethod === 'CASH' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <div className="w-8 h-8 flex items-center justify-center bg-emerald-100 text-emerald-600 rounded-full mb-1">
                      <span className="text-lg font-bold">💵</span>
                    </div>
                    Espèces
                  </button>
                  <button
                    onClick={() => setSettlePaymentMethod('WAVE')}
                    className={`py-2 flex flex-col items-center justify-center gap-1 text-xs font-bold rounded-lg border transition-colors ${settlePaymentMethod === 'WAVE' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <img src="https://play-lh.googleusercontent.com/B2sfLVgRWgV_bk5rtF51w6AieJWXc0qWbyWoaA8pMNp-is41AmvhJYVr95Dq9hT97Es" alt="Wave" className="w-8 h-8 rounded-md object-cover mb-1" referrerPolicy="no-referrer" />
                    Wave
                  </button>
                  <button
                    onClick={() => setSettlePaymentMethod('ORANGE_MONEY')}
                    className={`py-2 flex flex-col items-center justify-center gap-1 text-xs font-bold rounded-lg border transition-colors ${settlePaymentMethod === 'ORANGE_MONEY' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <img src="https://play-lh.googleusercontent.com/VGOxVRf_AtRYSFbYCr1qZ-eZDDldQxt8dpjQ62MFpoS9JXK-f2l1DIKxjt8TJ8MX-txu" alt="Orange Money" className="w-8 h-8 rounded-md object-cover mb-1" referrerPolicy="no-referrer" />
                    Orange M.
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSettleModalOpen(false)}
                className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                disabled={processing}
              >
                Annuler
              </button>
              <button
                onClick={handleSettle}
                disabled={processing}
                className="flex-1 py-2.5 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {processing ? "Traitement..." : "Valider le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
