import { Download, Save, ShieldAlert, Upload } from "lucide-react";
import { storage } from "../services/storage";
import { useRef } from "react";

export default function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    const data = await storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boutique_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (confirm("Attention : L'importation va REMPLACER toutes les données actuelles. Voulez-vous continuer ?")) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          await storage.importData(json);
          alert("Données importées avec succès ! La page va se recharger.");
          window.location.reload();
        } catch (error) {
          alert("Erreur lors de l'importation du fichier. Vérifiez le format.");
          console.error(error);
        }
      };
      reader.readAsText(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
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
              <h3 className="text-lg font-bold text-slate-900">Sauvegarde & Restauration</h3>
              <p className="text-sm text-slate-500">Gérez vos fichiers de données</p>
            </div>
          </div>
          
          <p className="text-slate-600 mb-6 text-sm">
            Vos données sont stockées dans ce navigateur. Pour ne pas les perdre ou pour les transférer sur un autre appareil, utilisez les boutons ci-dessous.
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleExport}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              Sauvegarder les Données (.json)
            </button>

            <div className="relative">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
              <button 
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 text-slate-600 rounded-xl font-medium transition-colors"
              >
                <Upload className="w-5 h-5" />
                Restaurer une Sauvegarde
              </button>
            </div>
          </div>
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
              <span className="text-slate-500">Stockage</span>
              <span className="font-medium text-slate-900">Navigateur (Local)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
