import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Edit2, Trash2, Save, X, Camera, Loader2, Package, Tag, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { motion, AnimatePresence } from 'motion/react';

interface Product {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  tag: string;
  createdAt: Timestamp;
}

export function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    stock: 0,
    imageUrl: '',
    tag: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(prods);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products', auth);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `products/${auth.currentUser.uid}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      }, 
      (error) => {
        console.error("Upload Error:", error);
        setIsUploading(false);
        alert(`Upload failed: ${error.message}`);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
        setIsUploading(false);
        setUploadProgress(0);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ownerId: auth.currentUser.uid,
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        stock: Number(formData.stock),
        imageUrl: formData.imageUrl,
        tag: formData.tag,
        createdAt: serverTimestamp()
      };

      if (formData.id) {
        const docRef = doc(db, 'products', formData.id);
        await updateDoc(docRef, data);
      } else {
        await addDoc(collection(db, 'products'), data);
      }

      setIsEditing(false);
      setFormData({ id: '', name: '', description: '', price: 0, stock: 0, imageUrl: '', tag: '' });
    } catch (error) {
      handleFirestoreError(error, formData.id ? OperationType.UPDATE : OperationType.CREATE, 'products', auth);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products', auth);
    }
  };

  const filteredProducts = filter === 'mine' 
    ? products.filter(p => p.ownerId === auth.currentUser?.uid)
    : products;

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-12 bg-[#0a0a0a] min-h-full max-w-7xl mx-auto pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
           <div className="w-2 h-12 bg-[#E31837] italic shadow-[0_0_20px_rgba(227,24,55,0.4)]"></div>
           <div>
             <h1 className="text-3xl font-display uppercase italic text-white tracking-tighter leading-none mb-1">Combat Marketplace</h1>
             <p className="text-zinc-600 uppercase tracking-[0.2em] text-[8px] font-black italic">Official Gear & Fighter Inventory</p>
           </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="flex bg-black border border-white/5 p-1 rounded-xl">
             <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
             >
                Global Gear
             </button>
             <button 
              onClick={() => setFilter('mine')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'mine' ? 'bg-[#E31837] text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
             >
                My Inventory
             </button>
          </div>
          
          <button 
            onClick={() => {
              setFormData({ id: '', name: '', description: '', price: 0, stock: 0, imageUrl: '', tag: '' });
              setIsEditing(true);
            }}
            className="flex items-center gap-3 bg-white text-black px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-zinc-200 shadow-xl"
          >
            <Plus className="w-4 h-4" /> Stock Product
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          >
            <div className="bg-zinc-950 border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-zinc-900/50">
                <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                  <Package className="w-5 h-5 text-[#E31837]" /> {formData.id ? 'Refine Product' : 'Stock New Gear'}
                </h2>
                <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-black border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer group hover:border-[#E31837]/50 transition-all overflow-hidden relative"
                    >
                      {formData.imageUrl ? (
                        <>
                          <img src={formData.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-zinc-700 mb-2 group-hover:text-[#E31837] transition-colors" />
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Upload Photo</span>
                        </>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="w-6 h-6 text-[#E31837] animate-spin" />
                          <span className="text-[10px] font-black text-white">{Math.round(uploadProgress)}%</span>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Gear Name</label>
                      <input 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Price ($)</label>
                        <input 
                          required
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Stock Level</label>
                        <input 
                          required
                          type="number"
                          value={formData.stock}
                          onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                          className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Marketing Tag</label>
                      <input 
                        placeholder="e.g. BEST SELLER"
                        value={formData.tag}
                        onChange={e => setFormData({...formData, tag: e.target.value.toUpperCase()})}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none font-bold italic"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#E31837] outline-none resize-none h-24"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isUploading}
                  className="w-full bg-[#E31837] text-white font-black uppercase italic py-4 rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" /> Commit Gear Settings
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-4 text-zinc-600">
           <Loader2 className="w-8 h-8 animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-[0.2em]">Syncing Marketplace Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-zinc-950 border border-white/5 rounded-3xl overflow-hidden group flex flex-col hover:border-[#E31837]/30 transition-all duration-500 relative shadow-2xl">
              <div className="relative aspect-square overflow-hidden bg-black">
                <img src={product.imageUrl || 'https://via.placeholder.com/400?text=Combat+Gear'} alt={product.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 grayscale group-hover:grayscale-0" />
                
                {product.tag && (
                  <div className="absolute top-4 left-4 bg-[#E31837] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest z-10 italic">
                    {product.tag}
                  </div>
                )}

                {product.ownerId === auth.currentUser?.uid && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                     <button 
                      onClick={() => {
                        setFormData({
                          id: product.id,
                          name: product.name,
                          description: product.description,
                          price: product.price,
                          stock: product.stock,
                          imageUrl: product.imageUrl,
                          tag: product.tag
                        });
                        setIsEditing(true);
                      }}
                      className="bg-black/60 backdrop-blur-md p-2 rounded-xl text-white hover:text-[#E31837] transition-colors"
                     >
                        <Edit2 className="w-4 h-4" />
                     </button>
                     <button 
                      onClick={() => handleDelete(product.id)}
                      className="bg-black/60 backdrop-blur-md p-2 rounded-xl text-white hover:text-red-500 transition-colors"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black to-transparent opacity-60"></div>
              </div>
              
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-black text-sm text-white uppercase italic leading-tight tracking-tight">{product.name}</h3>
                    <div className="text-[#E31837] font-mono text-sm font-black whitespace-nowrap">${product.price.toFixed(2)}</div>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 uppercase font-bold tracking-widest">{product.description || 'No description provided.'}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                   <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{product.stock} IN STOCK</span>
                   </div>
                   <button className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#E31837] hover:text-white transition-all">
                      <ShoppingCart className="w-3.5 h-3.5" /> Acquire
                   </button>
                </div>
              </div>
            </div>
          ))}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center gap-4 text-zinc-700 bg-zinc-950/50 rounded-3xl border border-dashed border-white/10">
               <Package className="w-12 h-12" />
               <p className="text-xs font-black uppercase tracking-[0.3em]">No items in this sector of the marketplace.</p>
            </div>
          )}
        </div>
      )}

      {/* PRO Promotion */}
      <div className="bg-gradient-to-br from-[#111] to-black border border-white/5 p-12 rounded-3xl relative overflow-hidden group">
         <div className="absolute inset-0 bg-red-900/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center md:text-left">
               <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                  <Tag className="w-6 h-6 text-[#E31837]" />
                  <span className="text-[10px] font-black text-[#E31837] uppercase tracking-[0.4em]">Fighter Economics</span>
               </div>
               <h2 className="text-3xl md:text-4xl font-display uppercase italic text-white tracking-tighter mb-4 leading-none">Scale Your Commerce</h2>
               <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest leading-relaxed">FIGHTNET PRO members get zero transaction fees and priority placement in the global combat marketplace.</p>
            </div>
            <button className="bg-white text-black px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:bg-zinc-200 transition-all shadow-2xl shadow-white/5 whitespace-nowrap">
               Upgrade to PRO <DollarSign className="w-4 h-4 inline ml-1" />
            </button>
         </div>
      </div>
    </div>
  );
}
