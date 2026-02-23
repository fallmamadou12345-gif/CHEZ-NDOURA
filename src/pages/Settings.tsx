import { Download, Save, ShieldAlert } from "lucide-react";

export default function Settings() {
  const handleExport = () => {
    window.location.href = "/api/export";
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Paramètres</h2>
        <p className="text-slate-500">Configuration et gestion des données.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Management */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Save className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sauvegarde des Données</h3>
              <p className="text-sm text-slate-500">Exportez vos données pour les sécuriser</p>
            </div>
          </div>
          
          <p className="text-slate-600 mb-6 text-sm">
            Il est recommandé de télécharger une copie de vos données régulièrement (produits, ventes, dépenses).
            Ce fichier JSON contient tout l'historique de votre boutique.
          </p>

          <button 
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            <Download className="w-5 h-5" />
            Télécharger la Sauvegarde (.json)
          </button>
        </div>

        {/* System Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-slate-50 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Information Système</h3>
              <p className="text-sm text-slate-500">État de l'application</p>
            </div>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Version</span>
              <span className="font-medium text-slate-900">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Devise</span>
              <span className="font-medium text-slate-900">FCFA (XOF)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Statut</span>
              <span className="font-medium text-emerald-600">En ligne</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Base de données</span>
              <span className="font-medium text-slate-900">SQLite (Local)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
