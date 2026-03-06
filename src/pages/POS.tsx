import { useEffect, useState } from "react";
import { Product } from "../types";
import { Search, ShoppingCart, Check, Plus, Minus, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage } from "../services/storage";

interface CartItem extends Product {
  cartQuantity: number;
  variantId?: string; // If a specific variant was chosen
  variantName?: string;
  sellPrice: number; // The actual price used (base or variant)
  stockDeduction: number; // How much to deduct from stock per unit
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Checkout State
  const [amountReceived, setAmountReceived] = useState("");
  const [changeDue, setChangeDue] = useState(0);

  // Calculate change due when amount received changes
  useEffect(() => {
    if (amountReceived) {
      const received = parseFloat(amountReceived);
      const total = cart.reduce((sum, item) => sum + item.sellPrice * item.cartQuantity, 0);
      setChangeDue(Math.max(0, received - total));
    } else {
      setChangeDue(0);
    }
  }, [amountReceived, cart]);
  
  // Variant Selection Modal State
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  // Quantity Input Modal State
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState("");

  useEffect(() => {
    fetchProducts();
    
    // Subscribe to real-time updates
    const unsubscribe = storage.subscribeProducts((updatedProducts) => {
      setProducts(updatedProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await storage.getProducts();
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch products", error);
    }
  };

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product);
    } else if (product.unit !== 'U') {
      setSelectedProductForQuantity(product);
      setQuantityInput("");
    } else {
      addToCart(product);
    }
  };

  const addToCart = (product: Product, variantId?: string, quantity: number = 1) => {
    let price = product.unit_sell_price;
    let name = product.name;
    let stockDeduction = 1;
    let variantName = undefined;

    if (variantId && product.variants) {
      const variant = product.variants.find(v => v.id === variantId);
      if (variant) {
        price = variant.price;
        name = `${product.name} (${variant.name})`;
        variantName = variant.name;
        stockDeduction = variant.stock_equivalent;
      }
    }

    setCart((prev) => {
      // Check if same product AND same variant
      const existing = prev.find((item) => item.id === product.id && item.variantId === variantId);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.variantId === variantId
            ? { ...item, cartQuantity: item.cartQuantity + quantity }
            : item
        );
      }
      return [...prev, { 
        ...product, 
        cartQuantity: quantity, 
        variantId, 
        variantName,
        sellPrice: price,
        stockDeduction
      }];
    });
    
    setSelectedProductForVariant(null);
    setSelectedProductForQuantity(null);
  };

  const removeFromCart = (productId: number | string, variantId?: string) => {
    setCart((prev) => prev.filter((item) => !(item.id === productId && item.variantId === variantId)));
  };

  const updateQuantity = (productId: number | string, variantId: string | undefined, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId && item.variantId === variantId) {
          const newQty = Math.max(0.1, item.cartQuantity + delta);
          return { ...item, cartQuantity: parseFloat(newQty.toFixed(2)) };
        }
        return item;
      })
    );
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.sellPrice * item.cartQuantity,
    0
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);

    try {
      // Process each item as a transaction
      for (const item of cart) {
        await storage.saveTransaction({
          product_id: item.id,
          type: "SALE",
          quantity: item.cartQuantity * item.stockDeduction, // Deduct actual stock amount
          unit_price: item.sellPrice / item.stockDeduction, // Unit price relative to stock unit
        });
      }

      setSuccess(true);
      setCart([]);
      setAmountReceived(""); // Reset amount received
      fetchProducts(); // Refresh stock
      setTimeout(() => {
        setSuccess(false);
        setProcessing(false);
      }, 2000);
    } catch (error) {
      alert("Erreur lors de la transaction");
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                disabled={product.stock_quantity <= 0}
                className={`flex flex-col items-start p-0 rounded-xl border transition-all text-left overflow-hidden relative ${
                  product.stock_quantity > 0
                    ? "border-slate-100 hover:border-indigo-500 hover:shadow-md bg-white"
                    : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                }`}
              >
                {product.variants && product.variants.length > 0 && (
                  <div className="absolute top-2 right-2 z-10 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                    + Options
                  </div>
                )}
                <div className="w-full aspect-[4/3] bg-slate-100 relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                  {product.stock_quantity <= 0 && (
                    <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                      <span className="text-white font-bold text-sm px-3 py-1 bg-red-500 rounded-full">Épuisé</span>
                    </div>
                  )}
                </div>
                <div className="p-4 w-full">
                  <div className="font-semibold text-slate-900 line-clamp-2 mb-1 h-10 leading-tight">{product.name}</div>
                  <div className="text-xs text-slate-500 mb-2">{product.sku || "Sans code"}</div>
                  <div className="mt-auto w-full flex justify-between items-end">
                    <span className="font-bold text-indigo-600">{product.unit_sell_price.toLocaleString('fr-FR')} FCFA</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock_quantity > 5 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {product.stock_quantity} {product.unit}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Variant Selection Modal */}
      {selectedProductForVariant && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProductForVariant(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 text-center">
                Choisir le format
              </h3>
              <p className="text-center text-slate-500 text-sm">{selectedProductForVariant.name}</p>
            </div>
            <div className="p-4 space-y-3">
              {/* Base Option */}
              <button
                onClick={() => addToCart(selectedProductForVariant)}
                className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <div className="text-left">
                  <div className="font-bold text-slate-900 group-hover:text-indigo-700">Standard ({selectedProductForVariant.unit})</div>
                  <div className="text-xs text-slate-500">Prix de base</div>
                </div>
                <div className="font-bold text-indigo-600">{selectedProductForVariant.unit_sell_price.toLocaleString('fr-FR')} FCFA</div>
              </button>

              {/* Variants */}
              {selectedProductForVariant.variants?.map(variant => (
                <button
                  key={variant.id}
                  onClick={() => addToCart(selectedProductForVariant, variant.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                >
                  <div className="text-left">
                    <div className="font-bold text-slate-900 group-hover:text-indigo-700">{variant.name}</div>
                    <div className="text-xs text-slate-500">Retire ~{variant.stock_equivalent} {selectedProductForVariant.unit} du stock</div>
                  </div>
                  <div className="font-bold text-indigo-600">{variant.price.toLocaleString('fr-FR')} FCFA</div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-slate-50 text-center">
              <button onClick={() => setSelectedProductForVariant(null)} className="text-slate-500 hover:text-slate-700 text-sm font-medium">
                Annuler
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quantity Input Modal */}
      {selectedProductForQuantity && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProductForQuantity(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 text-center">
                Quantité ({selectedProductForQuantity.unit})
              </h3>
              <p className="text-center text-slate-500 text-sm">{selectedProductForQuantity.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="number"
                autoFocus
                step="any"
                placeholder={`Ex: 1.5 ${selectedProductForQuantity.unit}`}
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && quantityInput) {
                    addToCart(selectedProductForQuantity, undefined, parseFloat(quantityInput));
                  }
                }}
                className="w-full px-4 py-3 text-2xl text-center border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-900"
              />
              <button
                onClick={() => {
                  if (quantityInput) {
                    addToCart(selectedProductForQuantity, undefined, parseFloat(quantityInput));
                  }
                }}
                disabled={!quantityInput}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                Ajouter au panier
              </button>
            </div>
            <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
              <button onClick={() => setSelectedProductForQuantity(null)} className="text-slate-500 hover:text-slate-700 text-sm font-medium">
                Annuler
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Panier en cours
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
              <p>Le panier est vide</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={`${item.id}-${item.variantId || 'base'}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="font-medium text-slate-900 truncate">
                      {item.name}
                      {item.variantName && <span className="text-xs text-slate-500 ml-1">({item.variantName})</span>}
                    </div>
                    <div className="text-sm text-indigo-600 font-medium">{item.sellPrice.toLocaleString('fr-FR')} FCFA</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border border-slate-200">
                      <button 
                        onClick={() => updateQuantity(item.id, item.variantId, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input 
                        type="number" 
                        min="0.001"
                        step="0.01"
                        value={item.cartQuantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setCart(prev => prev.map(p => (p.id === item.id && p.variantId === item.variantId) ? { ...p, cartQuantity: val } : p));
                          } else if (e.target.value === "") {
                             // Allow empty temporary state for typing
                             // We might need a local state for input if we want perfect typing experience, 
                             // but for now let's just handle valid numbers or keep previous if invalid
                          }
                        }}
                        className="w-20 text-center text-sm font-medium border-x border-slate-200 py-1 outline-none"
                        placeholder="Qté"
                      />
                      <button 
                        onClick={() => updateQuantity(item.id, item.variantId, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id, item.variantId)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      &times;
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Total à payer</span>
              <span className="text-3xl font-bold text-slate-900">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Reçu</label>
                <input
                  type="number"
                  placeholder="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Monnaie</label>
                <div className={`w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold ${changeDue > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                  {changeDue.toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing || (amountReceived !== "" && parseFloat(amountReceived) < totalAmount)}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              success 
                ? "bg-emerald-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
            } ${processing || cart.length === 0 || (amountReceived !== "" && parseFloat(amountReceived) < totalAmount) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {processing ? (
              "Traitement..."
            ) : success ? (
              <>
                <Check className="w-6 h-6" />
                Vente Validée !
              </>
            ) : (
              "Encaisser"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
