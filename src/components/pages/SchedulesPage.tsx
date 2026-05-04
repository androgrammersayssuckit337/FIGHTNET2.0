import React, { useState } from 'react';
import { Calendar, MapPin, Ticket, X } from 'lucide-react';
import { Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';

interface Fight {
  id: number;
  event: string;
  location: string;
  date: string;
  time: string;
  mainCard: string[];
  position: { lat: number; lng: number };
}

const UPCOMING_FIGHTS: Fight[] = [
  { 
    id: 1, 
    event: 'UFC 305: Pantoja vs Erceg', 
    location: 'Perth, Australia', 
    date: '05.04', 
    time: '10:00 PM EST', 
    mainCard: ['Pantoja vs Erceg', 'Martinez vs Aldo'],
    position: { lat: -31.9505, lng: 115.8605 }
  },
  { 
    id: 2, 
    event: 'PFL 4: Regular Season', 
    location: 'Uncasville, CT', 
    date: '06.13', 
    time: '6:30 PM EST', 
    mainCard: ['Wilkinson vs Gouti', 'Collard vs Madge'],
    position: { lat: 41.4884, lng: -72.0863 }
  },
  { 
    id: 3, 
    event: 'Bellator Champions Series', 
    location: 'Dublin, Ireland', 
    date: '06.22', 
    time: '1:00 PM EST', 
    mainCard: ['Eblen vs Edwards', 'Karakhanyan vs Burnell'],
    position: { lat: 53.3498, lng: -6.2603 }
  },
];

export function SchedulesPage() {
  const [fights, setFights] = useState<Fight[]>(UPCOMING_FIGHTS);
  const [selectedFight, setSelectedFight] = useState<Fight | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
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
  const isMapsConfigured = import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newFight: Fight = {
      id: fights.length + 1,
      event: formData.event,
      location: formData.location,
      date: formData.date,
      time: formData.time,
      mainCard: formData.mainCard.split(',').map(bout => bout.trim()).filter(Boolean),
      position: { 
        lat: parseFloat(formData.lat) || 0, 
        lng: parseFloat(formData.lng) || 0 
      }
    };
    setFights([...fights, newFight]);
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
      <header className="mb-8 border-b border-[#222] pb-4">
        <h1 className="text-3xl font-display uppercase text-white tracking-tighter italic mb-1">Fight Schedules</h1>
        <p className="text-zinc-600 uppercase tracking-[0.2em] text-[10px] font-black italic">Upcoming Pro & Semi-Pro Events</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {fights.map((fight) => (
            <div 
              key={fight.id} 
              onClick={() => handleFightClick(fight)}
              className={`bg-zinc-900 border transition-all duration-300 rounded-lg overflow-hidden cursor-pointer group ${
                selectedFight?.id === fight.id ? 'border-[#E31837] ring-1 ring-[#E31837]/30' : 'border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-[#E31837] font-mono text-[10px] font-black tracking-widest uppercase">
                    <Calendar className="w-3 h-3" /> {fight.date} • {fight.time}
                  </div>
                  <h2 className={`text-xl font-display uppercase tracking-tight transition-colors ${
                    selectedFight?.id === fight.id ? 'text-[#E31837]' : 'text-white'
                  }`}>{fight.event}</h2>
                  <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold uppercase italic">
                    <MapPin className="w-3 h-3" /> {fight.location}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <div className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter mb-1 italic">Featured Bouts</div>
                  {fight.mainCard.map((bout, idx) => (
                    <div key={idx} className="text-[10px] text-zinc-300 font-bold uppercase px-3 py-1 bg-black/40 rounded border border-zinc-800">
                      {bout}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#222] pt-4 md:pt-0 md:pl-6 shrink-0">
                  <button className="bg-white text-black px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded hover:bg-zinc-200 transition flex items-center gap-2">
                    <Ticket className="w-4 h-4" /> Tickets
                  </button>
                </div>
              </div>
            </div>
          ))}

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
            >
              {fights.map((fight) => (
                <Marker
                  key={fight.id}
                  position={fight.position}
                  onClick={() => setSelectedFight(fight)}
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
                  </div>
                </InfoWindow>
              )}
            </Map>
           ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 bg-[#E31837]/10 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-[#E31837]" />
              </div>
              <h3 className="font-display text-lg uppercase text-white mb-2">Event Map Locked</h3>
              <p className="text-zinc-500 text-[9px] max-w-[180px] uppercase tracking-widest font-bold leading-relaxed">Add VITE_GOOGLE_MAPS_API_KEY to environment to unlock global event tracking.</p>
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
