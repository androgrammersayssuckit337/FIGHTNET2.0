import React from 'react';
import { Calendar, MapPin, Ticket } from 'lucide-react';

const UPCOMING_FIGHTS = [
  { id: 1, event: 'UFC 305: Pantoja vs Erceg', location: 'Perth, Australia', date: '05.04', time: '10:00 PM EST', mainCard: ['Pantoja vs Erceg', 'Martinez vs Aldo'] },
  { id: 2, event: 'PFL 4: Regular Season', location: 'Uncasville, CT', date: '06.13', time: '6:30 PM EST', mainCard: ['Wilkinson vs Gouti', 'Collard vs Madge'] },
  { id: 3, event: 'Bellator Champions Series', location: 'Dublin, Ireland', date: '06.22', time: '1:00 PM EST', mainCard: ['Eblen vs Edwards', 'Karakhanyan vs Burnell'] },
];

export function SchedulesPage() {
  return (
    <div className="p-4 md:p-8 space-y-8 min-h-full bg-[#0a0a0a]">
      <header className="mb-8 border-b border-[#222] pb-4">
        <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1">Fight Schedules</h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Upcoming Pro & Semi-Pro Events</p>
      </header>

      <div className="space-y-4">
        {UPCOMING_FIGHTS.map((fight) => (
          <div key={fight.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden group hover:border-[#E31837] transition-all">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-[#E31837] font-mono text-xs font-bold tracking-widest uppercase">
                  <Calendar className="w-3 h-3" /> {fight.date} • {fight.time}
                </div>
                <h2 className="text-xl font-black uppercase text-white tracking-tight">{fight.event}</h2>
                <div className="flex items-center gap-1 text-zinc-500 text-xs italic">
                  <MapPin className="w-3 h-3" /> {fight.location}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <div className="text-[10px] text-zinc-600 uppercase font-bold tracking-tighter mb-1">Featured Bouts</div>
                {fight.mainCard.map((bout, idx) => (
                  <div key={idx} className="text-xs text-zinc-300 font-medium px-3 py-1 bg-black/40 rounded border border-zinc-800">
                    {bout}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#222] pt-4 md:pt-0 md:pl-6 shrink-0">
                <button className="bg-white text-black px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded hover:bg-zinc-200 transition flex items-center gap-2">
                  <Ticket className="w-4 h-4" /> Buy Tickets
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-zinc-900/50 border border-zinc-800 rounded-lg text-center max-w-2xl mx-auto">
        <h3 className="text-sm font-bold uppercase text-white mb-2 italic">Are you a promoter?</h3>
        <p className="text-xs text-zinc-500 mb-4">List your regional semi-pro events on FightNet to get noticed by scouting agents and local fans.</p>
        <button className="text-[10px] font-black text-[#E31837] uppercase tracking-widest border border-[#E31837]/30 px-4 py-2 rounded hover:bg-[#E31837]/10 transition">
          Register Event
        </button>
      </div>
    </div>
  );
}
