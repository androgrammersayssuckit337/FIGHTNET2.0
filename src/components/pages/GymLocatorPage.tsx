import { useState } from 'react';
import { Navigation, Info, MapPin } from 'lucide-react';
import { Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';

const LAS_VEGAS_CENTER = { lat: 36.1147, lng: -115.1728 };

interface Gym {
  id: number;
  name: string;
  distance: string;
  type: string;
  position: { lat: number; lng: number };
  address: string;
}

const REAL_GYMS: Gym[] = [
  { 
    id: 1, 
    name: 'Xtreme Couture MMA', 
    distance: '0.8 mi', 
    type: 'MMA, BJJ, Wrestling',
    position: { lat: 36.1215, lng: -115.1739 },
    address: '4055 W Desert Inn Rd, Las Vegas, NV 89102'
  },
  { 
    id: 2, 
    name: 'Syndicate MMA', 
    distance: '4.2 mi', 
    type: 'MMA, Muay Thai, BJJ',
    position: { lat: 36.0655, lng: -115.2425 },
    address: '6980 W Warm Springs Rd #190, Las Vegas, NV 89113'
  },
  { 
    id: 3, 
    name: 'Wand Fight Team', 
    distance: '2.5 mi', 
    type: 'MMA, Boxing, Kickboxing',
    position: { lat: 36.1264, lng: -115.2244 },
    address: '4215 W Sahara Avenue, Las Vegas, NV 89102'
  },
];

export function GymLocatorPage() {
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const map = useMap();
  const googleMapsKey = 
    process.env.GOOGLE_MAPS_PLATFORM_KEY || 
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 
    '';
  const isMapsConfigured = Boolean(googleMapsKey);

  const handleGymClick = (gym: Gym) => {
    setSelectedGym(gym);
    if (map) {
      map.panTo(gym.position);
      map.setZoom(15);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 h-[calc(100vh-80px)] md:h-full flex flex-col bg-[#0a0a0a]">
      <header className="mb-4 shrink-0 border-b border-[#222] pb-4">
        <h1 className="text-3xl font-display uppercase text-white tracking-tighter italic mb-1">Gym Locator</h1>
        <p className="text-zinc-600 uppercase tracking-[0.2em] text-[10px] font-black italic">Find training partners and facilities near you.</p>
      </header>

      <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
        {/* Actual Google Map or Placeholder */}
        <div className="flex-1 bg-black border border-zinc-800 rounded-lg relative min-h-[300px] overflow-hidden group">
          {isMapsConfigured ? (
            <Map
              defaultCenter={LAS_VEGAS_CENTER}
              defaultZoom={12}
              mapId="f81014e03f9f4bd5" // Optional: custom styles
              disableDefaultUI={true}
              gestureHandling={'greedy'}
              className="w-full h-full"
              colorScheme="DARK"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              {REAL_GYMS.map((gym) => (
                <Marker
                  key={gym.id}
                  position={gym.position}
                  onClick={() => setSelectedGym(gym)}
                />
              ))}

              {selectedGym && (
                <InfoWindow
                  position={selectedGym.position}
                  onCloseClick={() => setSelectedGym(null)}
                >
                  <div className="p-2 min-w-[200px] text-black">
                    <h3 className="font-bold uppercase text-sm mb-1">{selectedGym.name}</h3>
                    <p className="text-[10px] text-zinc-600 mb-2">{selectedGym.address}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-black italic uppercase">{selectedGym.type}</span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-zinc-950">
              <div className="w-16 h-16 bg-[#E31837]/10 rounded-full flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-[#E31837]" />
              </div>
              <h3 className="font-display text-2xl uppercase text-white mb-4 italic tracking-tighter">Maps Connectivity Offline</h3>
              
              <div className="max-w-md space-y-4">
                <p className="text-zinc-400 text-xs uppercase tracking-[0.2em] font-black italic">
                  Critical Error: ApiNotActivatedMapError
                </p>
                <div className="text-left bg-black/50 border border-white/5 p-6 rounded-2xl space-y-4">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    1. Ensure "Maps JavaScript API" is enabled in your Google Cloud Console.
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    2. Add your API key as <code className="text-[#E31837] bg-[#E31837]/10 px-1 rounded">GOOGLE_MAPS_PLATFORM_KEY</code> in Settings → Secrets.
                  </p>
                  <a 
                    href="https://console.cloud.google.com/google/maps-apis/api-list" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-[#E31837] text-white text-[10px] font-black text-center uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                  >
                    Enable API Now
                  </a>
                </div>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-4 left-4 bg-black/80 px-4 py-2 border border-zinc-800 rounded font-display text-[10px] text-[#E31837] backdrop-blur font-bold tracking-widest z-10">
            FIGHTNET LIVE MAPS
          </div>
        </div>

        {/* List */}
        <div className="w-full md:w-80 flex flex-col gap-4 overflow-y-auto shrink-0 pr-2 custom-scrollbar">
          {REAL_GYMS.map(gym => (
            <div 
              key={gym.id} 
              onClick={() => handleGymClick(gym)}
              className={`bg-zinc-900 border transition-all duration-300 rounded-lg p-4 cursor-pointer group ${
                selectedGym?.id === gym.id ? 'border-[#E31837] bg-zinc-800' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-bold uppercase tracking-tight leading-tight group-hover:text-[#E31837] transition-colors ${
                  selectedGym?.id === gym.id ? 'text-[#E31837]' : 'text-white'
                }`}>{gym.name}</h3>
                <span className="text-[10px] text-[#E31837] font-mono bg-[#E31837]/10 px-2 py-0.5 rounded font-bold">{gym.distance}</span>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4 font-semibold italic">{gym.type}</p>
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">
                  <Navigation className="w-3 h-3" /> Directions
                </button>
                <div className="text-zinc-700">
                  <Info className="w-3 h-3" />
                </div>
              </div>
            </div>
          ))}
          
          <div className="p-4 bg-red-950/20 border border-[#E31837]/20 rounded-lg">
             <p className="text-[9px] text-zinc-400 font-bold uppercase italic leading-relaxed">
               Showing certified FightNet training facilities in the Las Vegas area.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
