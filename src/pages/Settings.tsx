import { Download, Save, ShieldAlert, Upload, Cloud, HardDrive, Link, LogOut } from "lucide-react";
import { storage } from "../services/storage";
import React, { useRef, useState, useEffect } from "react";

// Check if Firebase is configured via Env (Render)
const isEnvConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function Settings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLocalConfigured, setIsLocalConfigured] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  
  // Form State
  const [config, setConfig] = useState({
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  });

  useEffect(() => {
    // Check if local config exists
    const localSettings = localStorage.getItem("firebase_settings");
    if (localSettings) {
      setIsLocalConfigured(true);
      setConfig(JSON.parse(localSettings));
    }
  }, []);

  const isFirebaseActive = isEnvConfigured || isLocalConfigured;

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

  const handleSaveConfig = () => {
    if (!config.apiKey || !config.projectId) {
      alert("Veuillez remplir au moins l'API Key et le Project ID.");
      return;
    }
    localStorage.setItem("firebase_settings", JSON.stringify(config));
    alert("Configuration enregistrée ! L'application va se recharger pour se connecter au Cloud.");
    window.location.reload();
  };

  const handleDisconnect = () => {
    if (confirm("Voulez-vous vraiment vous déconnecter du Cloud ? L'application repassera en mode local.")) {
      localStorage.removeItem("firebase_settings");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Paramètres</h2>
        <p className="text-slate-500">Configuration et gestion des données.</p>
      </div>

      {/* Cloud Status Banner */}
      <div className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${isFirebaseActive ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
        <div className="flex gap-3">
          {isFirebaseActive ? <Cloud className="w-6 h-6 shrink-0 mt-1" /> : <HardDrive className="w-6 h-6 shrink-0 mt-1" />}
          <div>
            <h4 className="font-bold flex items-center gap-2">
              {isFirebaseActive ? "Mode Cloud (Synchronisé)" : "Mode Local (Non Synchronisé)"}
              {isFirebaseActive && <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full">En ligne</span>}
            </h4>
            <p className="text-sm mt-1">
              {isFirebaseActive ? (
                <>
                  Vos données sont synchronisées en temps réel avec le Cloud.
                  <br />
                  Vous et le caissier voyez les mêmes informations.
                </>
              ) : (
                <>
                  Vos données sont stockées <strong>uniquement sur cet appareil</strong>.
                  <br />
                  Pour synchroniser avec le caissier, configurez le Cloud ci-dessous.
                </>
              )}
            </p>
          </div>
        </div>
        
        {!isEnvConfigured && (
          <div className="shrink-0">
            {isLocalConfigured ? (
              <button 
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Déconnecter
              </button>
            ) : (
              <button 
                onClick={() => setShowConfigForm(!showConfigForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Link className="w-4 h-4" />
                Connecter au Cloud
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cloud Configuration Form */}
      {showConfigForm && !isFirebaseActive && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 ring-4 ring-blue-50/50">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            Configuration Firebase Cloud
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Entrez les informations de votre projet Firebase pour activer la synchronisation.
            <br />
            Ces informations se trouvent dans la console Firebase (Project Settings).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
              <input 
                type="text" 
                value={config.apiKey}
                onChange={e => setConfig({...config, apiKey: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="AIzaSy..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Project ID</label>
              <input 
                type="text" 
                value={config.projectId}
                onChange={e => setConfig({...config, projectId: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="mon-projet-id"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Auth Domain</label>
              <input 
                type="text" 
                value={config.authDomain}
                onChange={e => setConfig({...config, authDomain: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="mon-projet.firebaseapp.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Storage Bucket</label>
              <input 
                type="text" 
                value={config.storageBucket}
                onChange={e => setConfig({...config, storageBucket: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="mon-projet.appspot.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Messaging Sender ID</label>
              <input 
                type="text" 
                value={config.messagingSenderId}
                onChange={e => setConfig({...config, messagingSenderId: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="123456789"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">App ID</label>
              <input 
                type="text" 
                value={config.appId}
                onChange={e => setConfig({...config, appId: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-sm"
                placeholder="1:123456789:web:abcdef..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowConfigForm(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={handleSaveConfig}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              Enregistrer & Connecter
            </button>
          </div>
        </div>
      )}

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
            Vos données sont stockées {isFirebaseActive ? "dans le Cloud" : "dans ce navigateur"}. 
            Pour ne pas les perdre ou pour les transférer sur un autre appareil, utilisez les boutons ci-dessous.
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
              <span className="font-medium text-slate-900">1.1.0</span>
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
              <span className={`font-medium ${isFirebaseActive ? "text-blue-600" : "text-amber-600"}`}>
                {isFirebaseActive ? "Cloud (Firebase)" : "Local (Navigateur)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
