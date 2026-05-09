import { ShoppingCart } from 'lucide-react';

const MOCK_PRODUCTS = [
  { id: 1, name: 'Pro Fighter Rashguard', price: '$45.00', img: 'https://images.unsplash.com/photo-1599839619722-39751411ea63?w=400&q=80', tag: 'BEST SELLER' },
  { id: 2, name: 'FightNet Official Gloves', price: '$85.00', img: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&q=80' },
  { id: 3, name: 'Training Shorts - Black', price: '$35.00', img: 'https://images.unsplash.com/photo-1594882645126-14020914d58d?w=400&q=80' },
  { id: 4, name: 'Corner Man Tee', price: '$25.00', img: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&q=80', tag: 'NEW' },
];

export function StorePage() {
  return (
    <div className="p-4 md:p-8 space-y-8 min-h-full bg-[#0a0a0a]">
      <header className="mb-8 flex justify-between items-end border-b border-[#222] pb-4">
        <div>
          <h1 className="text-3xl font-display uppercase text-white tracking-tighter italic mb-1">FightNet Gear</h1>
          <p className="text-zinc-600 uppercase tracking-[0.2em] text-[9px] font-black italic">Wear the movement. Built for the grind.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#E31837] text-white px-4 py-2 text-[10px] rounded font-bold uppercase tracking-widest hover:bg-red-700 transition-colors">
          <ShoppingCart className="w-4 h-4" /> Cart (0)
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_PRODUCTS.map(product => (
          <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden group flex flex-col justify-between hover:border-zinc-600 cursor-pointer transition-colors">
             <div className="relative aspect-square bg-[#050505] overflow-hidden flex items-center justify-center">
               <img src={product.img} alt={product.name} className="object-cover w-full h-full opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 grayscale group-hover:grayscale-0 mix-blend-luminosity hover:mix-blend-normal" />
               {product.tag && (
                 <div className="absolute top-2 left-2 bg-[#E31837] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest z-10">
                   {product.tag}
                 </div>
               )}
             </div>
             
             <div className="p-4">
               <h3 className="font-bold text-sm text-white uppercase tracking-tight leading-none mb-1">{product.name}</h3>
               <p className="font-mono text-xs text-zinc-500">{product.price}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
