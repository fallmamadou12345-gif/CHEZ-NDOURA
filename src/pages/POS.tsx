import { useEffect, useState } from "react";
import { Product } from "../types";
import { Search, ShoppingCart, Check, Plus, Minus, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { storage } from "../services/storage";

interface CartItem extends Product {
  cartQuantity: number;
}

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, cartQuantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const newQty = Math.max(0.1, item.cartQuantity + delta);
          return { ...item, cartQuantity: parseFloat(newQty.toFixed(2)) };
        }
        return item;
      })
    );
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.unit_sell_price * item.cartQuantity,
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
          quantity: item.cartQuantity,
          unit_price: item.unit_sell_price,
        });
      }

      setSuccess(true);
      setCart([]);
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
                onClick={() => addToCart(product)}
                disabled={product.stock_quantity <= 0}
                className={`flex flex-col items-start p-0 rounded-xl border transition-all text-left overflow-hidden ${
                  product.stock_quantity > 0
                    ? "border-slate-100 hover:border-indigo-500 hover:shadow-md bg-white"
                    : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
                }`}
              >
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
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="font-medium text-slate-900 truncate">{item.name}</div>
                    <div className="text-sm text-indigo-600 font-medium">{item.unit_sell_price.toLocaleString('fr-FR')} FCFA</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border border-slate-200">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input 
                        type="number" 
                        value={item.cartQuantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setCart(prev => prev.map(p => p.id === item.id ? { ...p, cartQuantity: val } : p));
                          }
                        }}
                        className="w-16 text-center text-sm font-medium border-x border-slate-200 py-1 outline-none"
                      />
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
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
          <div className="flex justify-between items-center mb-6">
            <span className="text-slate-500">Total à payer</span>
            <span className="text-3xl font-bold text-slate-900">{totalAmount.toLocaleString('fr-FR')} FCFA</span>
          </div>
          
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || processing}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              success 
                ? "bg-emerald-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
            } ${processing || cart.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {processing ? (
              "Traitement..."
            ) : success ? (
              <>
                <Check className="w-6 h-6" />
                Vente Validée !
              </>
            ) : (
              "Valider la Vente"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
