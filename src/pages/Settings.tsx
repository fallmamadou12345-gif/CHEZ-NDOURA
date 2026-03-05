import { Download, Save, ShieldAlert, Upload, Cloud, HardDrive, Link, LogOut, Users, UserPlus, Trash2 } from "lucide-react";
import { storage } from "../services/storage";
import React, { useRef, useState, useEffect } from "react";
import { User } from "../types";
import { useAuth } from "../context/AuthContext";

// Check if Firebase is configured via Env (Render)
const isEnvConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

export default function Settings() {
  const { user: currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLocalConfigured, setIsLocalConfigured] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: "", pin: "" });
  const [adminPin, setAdminPin] = useState("");
  
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
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const data = await storage.getUsers();
    setUsers(data);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.pin) return;
    if (newUser.pin.length !== 4) {
      alert("Le code PIN doit faire 4 chiffres");
      return;
    }

    try {
      await storage.saveUser({
        name: newUser.name,
        pin: newUser.pin,
        role: 'CASHIER'
      });
      setNewUser({ name: "", pin: "" });
      fetchUsers();
      alert("Caissier ajouté avec succès !");
    } catch (error) {
      alert("Erreur lors de l'ajout");
    }
  };

  const handleUpdateAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.length !== 4) {
      alert("Le code PIN doit faire 4 chiffres");
      return;
    }
    
    // Find admin user
    const adminUser = users.find(u => u.role === 'ADMIN');
    if (adminUser) {
      try {
        await storage.updateUser(adminUser.id, { pin: adminPin });
        alert("Code PIN Administrateur mis à jour !");
        setAdminPin("");
        fetchUsers();
      } catch (error) {
        alert("Erreur lors de la mise à jour");
      }
    } else {
      // Should not happen if AuthContext creates default admin, but just in case
      alert("Compte administrateur introuvable. Veuillez vous reconnecter.");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Supprimer cet utilisateur ?")) {
      await storage.deleteUser(id);
      fetchUsers();
    }
  };

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
          {/* ... existing form ... */}
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

      {/* User Management Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Gestion des Utilisateurs</h3>
            <p className="text-sm text-slate-500">Ajoutez des caissiers et gérez les accès</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Add User Form */}
          <div className="md:col-span-1 space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Nouveau Caissier
              </h4>
              <form onSubmit={handleAddUser} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nom</label>
                  <input 
                    type="text" 
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    placeholder="Ex: Moussa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Code PIN (4 chiffres)</label>
                  <input 
                    type="text" 
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={newUser.pin}
                    onChange={e => setNewUser({...newUser, pin: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono tracking-widest"
                    placeholder="0000"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Ajouter
                </button>
              </form>
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="font-medium text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                Modifier PIN Admin
              </h4>
              <form onSubmit={handleUpdateAdminPin} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nouveau Code PIN Admin</label>
                  <input 
                    type="text" 
                    required
                    maxLength={4}
                    pattern="\d{4}"
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value)}
                    className="w-full px-3 py-2 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none font-mono tracking-widest bg-orange-50/30"
                    placeholder="Nouveau PIN"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Mettre à jour Admin
                </button>
              </form>
            </div>
          </div>

          {/* User List */}
          <div className="md:col-span-2">
            <h4 className="font-medium text-slate-900 mb-4">Utilisateurs Actifs</h4>
            <div className="space-y-2">
              {/* Always show Admin */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">A</div>
                  <div>
                    <div className="font-medium text-slate-900">Administrateur</div>
                    <div className="text-xs text-slate-500">Accès Total • PIN: ****</div>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Admin</span>
              </div>

              {users.filter(u => u.role !== 'ADMIN').map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">Caissier • PIN: {user.pin}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {users.filter(u => u.role !== 'ADMIN').length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm italic">
                  Aucun caissier configuré.
                </div>
              )}
            </div>
          </div>
        </div>
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
