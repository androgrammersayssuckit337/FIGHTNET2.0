import React from 'react';
import { MapPin, Navigation } from 'lucide-react';

const MOCK_GYMS = [
  { id: 1, name: 'Elite MMA Gym', distance: '2.3 mi', type: 'MMA, BJJ, Muay Thai' },
  { id: 2, name: 'Striking House', distance: '5.1 mi', type: 'Boxing, Kickboxing' },
  { id: 3, name: 'Ground Team Academy', distance: '8.4 mi', type: 'BJJ (No-Gi/Gi)' },
];

export function GymLocatorPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 h-[calc(100vh-80px)] md:h-full flex flex-col bg-[#0a0a0a]">
      <header className="mb-4 shrink-0 border-b border-[#222] pb-4">
        <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1">Gym Locator</h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Find training partners and facilities near you.</p>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Mock Map */}
        <div className="flex-1 bg-black border border-zinc-800 rounded-lg relative min-h-[300px] overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&q=80')] bg-cover bg-center opacity-30 grayscale group-hover:grayscale-0 group-hover:opacity-50 transition-all duration-700 mix-blend-luminosity"></div>
          <div className="absolute inset-0 bg-[#E31837]/5 mix-blend-multiply"></div>
          
          {/* Map markers mock */}
          <div className="absolute top-1/4 left-1/3 text-[#E31837] animate-bounce">
            <MapPin className="w-8 h-8 drop-shadow-[0_0_10px_rgba(227,24,55,0.8)] fill-[#E31837]" />
          </div>
          <div className="absolute top-1/2 left-2/3 text-red-900/80">
            <MapPin className="w-6 h-6 fill-[#E31837]/50" />
          </div>
          <div className="absolute bottom-1/3 left-1/4 text-red-900/80">
            <MapPin className="w-5 h-5 fill-[#E31837]/50" />
          </div>
          
          <div className="absolute bottom-4 right-4 bg-black/80 px-4 py-2 border border-zinc-800 rounded font-mono text-[10px] text-[#E31837] backdrop-blur font-bold tracking-widest">
            FIGHTNET MAPS
          </div>
        </div>

        {/* List */}
        <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto shrink-0 pr-2">
          {MOCK_GYMS.map(gym => (
            <div key={gym.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-[#E31837] transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold uppercase tracking-tight text-white leading-tight">{gym.name}</h3>
                <span className="text-[10px] text-[#E31837] font-mono bg-[#E31837]/10 px-2 py-0.5 rounded font-bold">{gym.distance}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">{gym.type}</p>
              <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                <Navigation className="w-3 h-3" /> Get Directions
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
