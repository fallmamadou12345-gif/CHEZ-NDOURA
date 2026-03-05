import { useEffect, useState } from "react";
import { PerformanceReport } from "../types";
import { BarChart3, TrendingUp, Award } from "lucide-react";
import { storage } from "../services/storage";

export default function Reports() {
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const data = await storage.getPerformanceReport();
        setReport(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement des rapports...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Rapports de Performance</h2>
        <p className="text-slate-500">Analysez vos meilleures ventes et votre rentabilité.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Best Sellers */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Ventes (Volume)</h3>
              <p className="text-sm text-slate-500">Produits les plus vendus</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {report?.bestSellers.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-xs font-bold text-slate-400 shadow-sm">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.total_sold} unités</span>
              </div>
            ))}
            {report?.bestSellers.length === 0 && (
              <p className="text-center text-slate-400 py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Most Profitable */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Top Rentabilité</h3>
              <p className="text-sm text-slate-500">Produits générant le plus de marge</p>
            </div>
          </div>

          <div className="space-y-4">
            {report?.mostProfitable.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-xs font-bold text-slate-400 shadow-sm">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
                <span className="font-bold text-emerald-600">+{item.profit.toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))}
             {report?.mostProfitable.length === 0 && (
              <p className="text-center text-slate-400 py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
