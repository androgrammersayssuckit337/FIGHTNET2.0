import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Ticket, X, Activity, Trophy, Clock, Zap } from 'lucide-react';
import { Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/error';

interface Fight {
  id: string;
  event: string;
  location: string;
  date: string;
  time: string;
  mainCard: string[];
  position: { lat: number; lng: number };
  status: 'upcoming' | 'live' | 'finished';
  liveScores?: Array<{
    bout: string;
    score: string;
    round: string;
    status: string;
  }>;
}

const INITIAL_FIGHTS = [
  { 
    event: 'UFC 305: Pantoja vs Erceg', 
    location: 'Perth, Australia', 
    date: '05.04', 
    time: '10:00 PM EST', 
    mainCard: ['Pantoja vs Erceg', 'Martinez vs Aldo'],
    position: { lat: -31.9505, lng: 115.8605 },
    status: 'finished' as const
  },
  { 
    event: 'PFL 4: Regular Season', 
    location: 'Uncasville, CT', 
    date: '06.13', 
    time: '6:30 PM EST', 
    mainCard: ['Wilkinson vs Gouti', 'Collard vs Madge'],
    position: { lat: 41.4884, lng: -72.0863 },
    status: 'live' as const,
    liveScores: [
      { bout: 'Wilkinson vs Gouti', score: '29-28, 29-28, 30-27', round: 'End of R3', status: 'Decision' },
      { bout: 'Collard vs Madge', score: '10-9', round: 'R2 2:45', status: 'Live' }
    ]
  },
  { 
    event: 'Bellator Champions Series', 
    location: 'Dublin, Ireland', 
    date: '06.22', 
    time: '1:00 PM EST', 
    mainCard: ['Eblen vs Edwards', 'Karakhanyan vs Burnell'],
    position: { lat: 53.3498, lng: -6.2603 },
    status: 'upcoming' as const
  },
];

export function SchedulesPage() {
  const [fights, setFights] = useState<Fight[]>([]);
  const [selectedFight, setSelectedFight] = useState<Fight | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    event: '',
    location: '',
    date: '',
    time: '',
    mainCard: '',
    lat: '36.1699',
    lng: '-115.1398'
  });

  const map = useMap();
  const googleMapsKey = 
    process.env.GOOGLE_MAPS_PLATFORM_KEY || 
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || 
    '';
  const isMapsConfigured = Boolean(googleMapsKey);

  useEffect(() => {
    const q = query(collection(db, 'schedules'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fightData: Fight[] = [];
        snapshot.forEach((doc) => {
          fightData.push({ id: doc.id, ...doc.data() } as Fight);
        });
        
        // If empty, seed initial data for demo
        if (fightData.length === 0 && isLoading) {
          INITIAL_FIGHTS.forEach(async (f) => {
            try {
              await addDoc(collection(db, 'schedules'), {
                ...f,
                createdAt: serverTimestamp()
              });
            } catch (err) {
              console.error("Seeding failed:", err);
            }
          });
        }

        setFights(fightData.sort((_, b) => b.status === 'live' ? 1 : -1));
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'schedules', auth);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'schedules'), {
        event: formData.event,
        location: formData.location,
        date: formData.date,
        time: formData.time,
        mainCard: formData.mainCard.split(',').map(bout => bout.trim()).filter(Boolean),
        position: { 
          lat: parseFloat(formData.lat) || 0, 
          lng: parseFloat(formData.lng) || 0 
        },
        status: 'upcoming',
        createdAt: serverTimestamp()
      });
      setIsFormOpen(false);
      setFormData({
        event: '',
        location: '',
        date: '',
        time: '',
        mainCard: '',
        lat: '36.1699',
        lng: '-115.1398'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'schedules', auth);
    }
  };

  const handleFightClick = (fight: Fight) => {
    setSelectedFight(fight);
    if (map) {
      map.panTo(fight.position);
      map.setZoom(8);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-full bg-[#0a0a0a]">
      <header className="mb-8 border-b border-[#222] pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display uppercase text-white tracking-tighter italic mb-1">Fight Schedules</h1>
          <p className="text-zinc-600 uppercase tracking-[0.2em] text-[10px] font-black italic">Upcoming Pro & Semi-Pro Events</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 border border-white/5 rounded-lg">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Real-time Data Active</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-zinc-600">
               <Clock className="w-6 h-6 animate-spin" />
               <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Schedule Matrix...</span>
            </div>
          ) : fights.map((fight) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={fight.id} 
              onClick={() => handleFightClick(fight)}
              className={`bg-zinc-900 border transition-all duration-300 rounded-lg overflow-hidden cursor-pointer group relative ${
                selectedFight?.id === fight.id ? 'border-[#E31837] ring-1 ring-[#E31837]/30' : 'border-zinc-800 hover:border-zinc-700'
              } ${fight.status === 'live' ? 'shadow-[0_0_30px_rgba(227,24,55,0.15)]' : ''}`}
            >
              {fight.status === 'live' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E31837] to-transparent animate-shimmer"></div>
              )}

              <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[#E31837] font-mono text-[10px] font-black tracking-widest uppercase">
                      <Calendar className="w-3 h-3" /> {fight.date} • {fight.time}
                    </div>
                    {fight.status === 'live' && (
                      <div className="flex items-center gap-1.5 bg-[#E31837] text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter italic animate-pulse">
                         <Activity className="w-2.5 h-2.5" /> Live Now
                      </div>
                    )}
                    {fight.status === 'finished' && (
                      <div className="flex items-center gap-1.5 bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter italic">
                         <Trophy className="w-2.5 h-2.5" /> Events Concluded
                      </div>
                    )}
                  </div>

                  <h2 className={`text-xl font-display uppercase tracking-tight transition-colors ${
                    selectedFight?.id === fight.id ? 'text-[#E31837]' : 'text-white'
                  }`}>{fight.event}</h2>
                  
                  <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold uppercase italic">
                    <MapPin className="w-3 h-3" /> {fight.location}
                  </div>
                </div>

                {/* Score/Bout Section */}
                <div className="flex flex-col gap-2 min-w-[240px]">
                  {fight.status === 'live' && fight.liveScores ? (
                    <div className="space-y-2">
                       <div className="text-[9px] text-[#E31837] uppercase font-black tracking-widest mb-1 italic flex items-center gap-2">
                          <Zap className="w-3 h-3" /> Live Scoring
                       </div>
                       {fight.liveScores.map((score, idx) => (
                         <div key={idx} className="bg-black/60 border border-[#E31837]/30 p-2.5 rounded-lg flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[10px] font-black text-white italic uppercase tracking-tight">
                               <span>{score.bout}</span>
                               <span className="text-[#E31837]">{score.status}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                               <span>{score.round}</span>
                               <span className="text-zinc-500">{score.score}</span>
                            </div>
                         </div>
                       ))}
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter mb-1 italic">Featured Bouts</div>
                      <div className="flex flex-wrap gap-2">
                        {fight.mainCard.map((bout, idx) => (
                          <div key={idx} className="text-[10px] text-zinc-300 font-bold uppercase px-3 py-1 bg-black/40 rounded border border-zinc-800">
                            {bout}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#222] pt-4 md:pt-0 md:pl-6 shrink-0 h-full self-center">
                  <button className="bg-white text-black px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded hover:bg-zinc-200 transition flex items-center gap-2 whitespace-nowrap shadow-xl">
                    <Ticket className="w-4 h-4" /> {fight.status === 'finished' ? 'Results' : 'Tickets'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          </AnimatePresence>

          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center mt-8">
            <h3 className="text-[10px] font-black uppercase text-white mb-2 italic tracking-[0.2em]">Are you a promoter?</h3>
            <p className="text-[10px] text-zinc-600 mb-4 font-bold uppercase leading-relaxed">List your regional semi-pro events on FightNet to get noticed by scouting agents and local fans.</p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="text-[10px] font-black text-[#E31837] uppercase tracking-widest border border-[#E31837]/30 px-6 py-2 rounded hover:bg-[#E31837]/10 transition italic">
              Register Event
            </button>
          </div>
        </div>

        <div className="lg:col-span-1 min-h-[400px] bg-black border border-zinc-800 rounded-lg overflow-hidden sticky top-8 h-[calc(100vh-160px)]">
           {isMapsConfigured ? (
             <Map
              defaultCenter={{ lat: 20, lng: 0 }}
              defaultZoom={2}
              mapId="f81014e03f9f4bd5"
              disableDefaultUI={true}
              gestureHandling={'greedy'}
              className="w-full h-full"
              colorScheme="DARK"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            >
              {fights.map((fight) => (
                <Marker
                  key={fight.id}
                  position={fight.position}
                  onClick={() => handleFightClick(fight)}
                />
              ))}

              {selectedFight && (
                <InfoWindow
                  position={selectedFight.position}
                  onCloseClick={() => setSelectedFight(null)}
                >
                  <div className="p-2 min-w-[200px] text-black">
                    <h3 className="font-bold uppercase text-sm mb-1">{selectedFight.event}</h3>
                    <p className="text-[10px] text-zinc-600 mb-2">{selectedFight.location}</p>
                    <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-sm inline-block ${
                      selectedFight.status === 'live' ? 'bg-[#E31837] text-white' : 'bg-zinc-200 text-zinc-800'
                    }`}>
                       {selectedFight.status}
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
              <h3 className="font-display text-2xl uppercase text-white mb-4 italic tracking-tighter">Event Map Locked</h3>
              
              <div className="max-w-md space-y-4">
                <p className="text-zinc-400 text-xs uppercase tracking-[0.2em] font-black italic">
                  Critical Error: ApiNotActivatedMapError or ApiTargetBlockedMapError
                </p>
                <div className="text-left bg-black/50 border border-white/5 p-6 rounded-2xl space-y-4">
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    1. Ensure <span className="text-white">"Maps JavaScript API"</span> is enabled in your Google Cloud Console.
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    2. Check <span className="text-white">API Restrictions</span> on your key to allow "Maps JavaScript API".
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                    3. Add your key as <code className="text-[#E31837] bg-[#E31837]/10 px-1 rounded">GOOGLE_MAPS_PLATFORM_KEY</code> in Settings → Secrets.
                  </p>
                  <a 
                    href="https://console.cloud.google.com/google/maps-apis/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full py-3 bg-[#E31837] text-white text-[10px] font-black text-center uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20"
                  >
                    Configure API Key Restrictions
                  </a>
                </div>
              </div>
            </div>
           )}
          
          <div className="absolute top-4 left-4 z-10">
             <div className="bg-black/80 backdrop-blur-md border border-zinc-800 p-3 rounded-lg flex items-center gap-3">
                <div className="w-2 h-2 bg-[#E31837] rounded-full animate-pulse"></div>
                <span className="text-[9px] font-black uppercase italic text-white tracking-[0.2em]">Global Event Map</span>
             </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#222] rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[#222] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-[#E31837] italic shadow-[0_0_15px_rgba(227,24,55,0.5)]"></div>
                  <h2 className="text-xl font-display uppercase italic text-white tracking-tighter">Register New Event</h2>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Event Name</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. FightNight: Redemption"
                      value={formData.event}
                      onChange={e => setFormData({...formData, event: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E31837] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Location</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Las Vegas, NV"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E31837] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Date</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. 07.15"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E31837] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Time</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. 8:00 PM EST"
                      value={formData.time}
                      onChange={e => setFormData({...formData, time: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E31837] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Main Card Bouts (Comma separated)</label>
                  <textarea 
                    required
                    placeholder="e.g. Silva vs Jones, McGregor vs Chandler"
                    value={formData.mainCard}
                    onChange={e => setFormData({...formData, mainCard: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E31837] transition-colors h-20 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Latitude</label>
                    <input 
                      type="text"
                      value={formData.lat}
                      onChange={e => setFormData({...formData, lat: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-[10px] font-mono text-zinc-400 focus:outline-none focus:border-[#E31837] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Longitude</label>
                    <input 
                      type="text"
                      value={formData.lng}
                      onChange={e => setFormData({...formData, lng: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-[10px] font-mono text-zinc-400 focus:outline-none focus:border-[#E31837] transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 px-6 py-3 border border-zinc-800 text-zinc-400 font-black uppercase tracking-widest text-[10px] rounded-lg hover:border-zinc-700 hover:text-white transition-all italic"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-[#E31837] text-white px-6 py-3 font-black uppercase tracking-widest text-[10px] rounded-lg hover:bg-red-700 transition-all shadow-[0_10px_30px_rgba(227,24,55,0.3)] italic"
                  >
                    Publish Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
