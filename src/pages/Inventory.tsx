import { useEffect, useState, FormEvent } from "react";
import { Product } from "../types";
import { Plus, Search, Edit2, Trash2, AlertCircle, PackagePlus } from "lucide-react";
import { motion } from "motion/react";
import { storage } from "../services/storage";

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);

  // Product Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    batch_price: "",
    batch_quantity: "1",
    unit_sell_price: "",
    stock_quantity: "0",
    min_stock_threshold: "5",
    unit: "U",
    image: "",
  });

  // Restock Form State
  const [restockData, setRestockData] = useState({
    quantity: "",
    total_cost: "",
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await storage.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchProducts();

    // Subscribe to real-time updates
    const unsubscribe = storage.subscribeProducts((updatedProducts) => {
      setProducts(updatedProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");
    setIsSubmitting(true);
    
    // Helper to parse numbers with comma support
    const parseNumber = (val: string) => {
      if (!val) return 0;
      // Handle both comma and dot
      return parseFloat(val.toString().replace(',', '.'));
    };

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        batch_price: parseNumber(formData.batch_price),
        batch_quantity: parseInt(formData.batch_quantity) || 1,
        unit_sell_price: parseNumber(formData.unit_sell_price),
        stock_quantity: parseNumber(formData.stock_quantity),
        min_stock_threshold: parseNumber(formData.min_stock_threshold),
        unit: formData.unit,
        image: formData.image,
      };

      console.log("Saving product payload:", payload);

      if (editingProduct) {
        await storage.updateProduct(editingProduct.id, payload);
      } else {
        await storage.saveProduct(payload);
      }
      
      // Success
      setIsModalOpen(false);
      setEditingProduct(null);
      resetForm();
    } catch (error: any) {
      console.error("Save error:", error);
      alert(`Erreur lors de l'enregistrement: ${error.message || "Erreur inconnue"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestockSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;

    const quantity = parseInt(restockData.quantity);
    const totalCost = parseFloat(restockData.total_cost);
    const unitCost = totalCost / quantity;

    try {
      // 1. Record the transaction (Stock IN)
      await storage.saveTransaction({
        product_id: restockProduct.id,
        type: "PURCHASE",
        quantity: quantity,
        unit_price: unitCost,
      });

      // 2. Update the product's reference batch price/qty
      await storage.updateProduct(restockProduct.id, {
        batch_price: totalCost,
        batch_quantity: quantity,
        // Stock is automatically updated by saveTransaction in storage service
      });

      setIsRestockModalOpen(false);
      setRestockProduct(null);
      setRestockData({ quantity: "", total_cost: "" });
      fetchProducts();
    } catch (error) {
      alert("Erreur lors du réapprovisionnement");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      await storage.deleteProduct(id);
      fetchProducts();
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku || "",
      batch_price: product.batch_price.toString(),
      batch_quantity: product.batch_quantity.toString(),
      unit_sell_price: product.unit_sell_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      min_stock_threshold: product.min_stock_threshold.toString(),
      unit: product.unit || "U",
      image: product.image || "",
    });
    setIsModalOpen(true);
  };

  const openRestock = (product: Product) => {
    setRestockProduct(product);
    setRestockData({ quantity: "", total_cost: "" });
    setIsRestockModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      batch_price: "",
      batch_quantity: "1",
      unit_sell_price: "",
      stock_quantity: "0",
      min_stock_threshold: "5",
      unit: "U",
      image: "",
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Stocks & Produits</h2>
          <p className="text-slate-500">Gérez votre catalogue et vos niveaux de stock.</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau Produit
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Rechercher par nom ou code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Img</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produit</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Prix Achat (Lot)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Coût Unitaire</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Prix Vente</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Marge</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <PackagePlus className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{product.name}</div>
                    {product.sku && <div className="text-xs text-slate-400">{product.sku}</div>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stock_quantity <= product.min_stock_threshold 
                        ? "bg-red-100 text-red-800" 
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {product.stock_quantity} {product.unit}
                      {product.stock_quantity <= product.min_stock_threshold && <AlertCircle className="w-3 h-3 ml-1" />}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {product.batch_price.toLocaleString('fr-FR')} FCFA <span className="text-xs text-slate-400">/ {product.batch_quantity}</span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600">
                    {product.unit_cost?.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">
                    {product.unit_sell_price.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-emerald-600 font-medium">{product.margin?.toLocaleString('fr-FR')} FCFA</div>
                    <div className="text-xs text-slate-400">{product.margin_percent?.toFixed(1)}%</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button onClick={() => openRestock(product)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Réapprovisionner">
                        <PackagePlus className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(product)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Modifier">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Aucun produit trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? "Modifier le produit" : "Nouveau produit"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Image du Produit (URL)</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://exemple.com/image.jpg"
                      value={formData.image || ""}
                      onChange={e => setFormData({...formData, image: e.target.value})}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                    {formData.image && (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        <img src={formData.image} alt="Aperçu" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Copiez le lien d'une image depuis Google Images ou autre.</p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom du produit</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code / SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({...formData, sku: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Actuel</label>
                  <div className="flex gap-2">
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.stock_quantity}
                      onChange={e => setFormData({...formData, stock_quantity: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                    <select
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-slate-50"
                    >
                      <option value="U">Unité</option>
                      <option value="KG">Kg</option>
                      <option value="G">Gramme</option>
                      <option value="L">Litre</option>
                      <option value="ML">ml</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-4 border border-slate-100">
                <h4 className="text-sm font-semibold text-slate-900">Configuration Prix & Lot</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Prix d'Achat (Lot)</label>
                    <input
                      required
                      type="number"
                      step="0.01"
                      value={formData.batch_price}
                      onChange={e => setFormData({...formData, batch_price: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Qté dans le Lot</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={formData.batch_quantity}
                      onChange={e => setFormData({...formData, batch_quantity: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-200">
                     <p className="text-xs text-slate-500 flex justify-between">
                       <span>Coût unitaire calculé :</span>
                       <span className="font-medium text-slate-900">
                         {(parseFloat(formData.batch_price || "0") / parseInt(formData.batch_quantity || "1")).toLocaleString('fr-FR')} FCFA
                       </span>
                     </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prix de Vente (Unitaire)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={formData.unit_sell_price}
                    onChange={e => setFormData({...formData, unit_sell_price: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Seuil Alerte Stock</label>
                  <input
                    required
                    type="number"
                    value={formData.min_stock_threshold}
                    onChange={e => setFormData({...formData, min_stock_threshold: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 text-white rounded-lg font-medium transition-colors shadow-sm ${
                    isSubmitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockModalOpen && restockProduct && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">
                Réapprovisionner : {restockProduct.name}
              </h3>
              <button onClick={() => setIsRestockModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Saisissez les détails du nouveau lot entrant. Cela mettra à jour le stock et le coût de revient de référence.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantité reçue</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={restockData.quantity}
                  onChange={e => setRestockData({...restockData, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Ex: 50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coût Total du Lot (Achat)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={restockData.total_cost}
                  onChange={e => setRestockData({...restockData, total_cost: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  placeholder="Ex: 250.00"
                />
              </div>

              {restockData.quantity && restockData.total_cost && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  Nouveau coût unitaire : <strong>{(parseFloat(restockData.total_cost) / parseInt(restockData.quantity)).toLocaleString('fr-FR')} FCFA</strong>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  Confirmer l'entrée
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
