import React, { useState, useEffect } from 'react';
import { Star, Zap, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';

interface Sponsorship {
  id: string;
  sponsorId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  pitch: string;
  createdAt: number;
}

const MOCK_SPONSORS = [
  { id: '1', name: 'IRON PEAK Performance', match: 98, img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&q=80', req: '7-0 Record minimum' },
  { id: '2', name: 'VTX Supplements', match: 92, img: 'https://images.unsplash.com/photo-1594882645126-14020914d58d?w=300&q=80', req: 'Heavyweight / LHW' },
  { id: '3', name: 'Grind Athletics', match: 85, img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=300&q=80', req: 'Strong social presence' }
];

export function SponsorsPage() {
  const { currentUser } = useAuth();
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [pitch, setPitch] = useState('');
  const [applications, setApplications] = useState<Sponsorship[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'sponsorships'),
      where('fighterId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now())
      } as Sponsorship));
      setApplications(apps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sponsorships', auth);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleApply = async (sponsorId: string) => {
    if (!currentUser || !pitch.trim()) return;
    
    try {
      await addDoc(collection(db, 'sponsorships'), {
        fighterId: currentUser.uid,
        sponsorId,
        status: 'pending',
        pitch,
        createdAt: serverTimestamp()
      });
      setApplyingTo(null);
      setPitch('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sponsorships', auth);
    }
  };

  const statusIcons = {
    pending: <Clock className="w-3.5 h-3.5 text-yellow-500" />,
    approved: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
    rejected: <XCircle className="w-3.5 h-3.5 text-[#E31837]" />,
    cancelled: <XCircle className="w-3.5 h-3.5 text-zinc-600" />
  };

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-full bg-[#0a0a0a]">
      <header className="mb-8 border-b border-white/5 pb-4">
        <h1 className="text-2xl font-black uppercase text-white tracking-tighter italic mb-1 uppercase tracking-tighter">Sponsor Advocate</h1>
        <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Connect with brands that believe in you</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 p-6 rounded-2xl shadow-2xl">
          <h2 className="text-sm font-black uppercase border-b border-white/5 pb-4 mb-6 flex items-center justify-between tracking-widest text-white italic">
            <span>Marketplace Proposals</span>
            <span className="text-[10px] tracking-[0.2em] text-[#E31837] font-bold italic">AI MATCHED ENGINE</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {MOCK_SPONSORS.map(sponsor => (
              <div key={sponsor.id} className="bg-[#050505] border border-white/5 flex flex-col group relative overflow-hidden rounded-xl hover:border-[#E31837]/30 transition-all duration-500">
                <div className="h-40 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity grayscale group-hover:grayscale-0 scale-105 group-hover:scale-100 transition-transform duration-700" style={{ backgroundImage: `url(${sponsor.img})` }}></div>
                <div className="p-5 flex-1 flex flex-col z-10 border-t border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-sm tracking-tight uppercase max-w-[70%] leading-tight text-white italic">{sponsor.name}</h3>
                    <div className="bg-[#E31837]/20 text-[#E31837] text-[10px] px-2.5 py-0.5 font-black rounded italic">
                      {sponsor.match}% FIT
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-6">{sponsor.req}</p>
                  
                  <div className="mt-auto">
                    {applyingTo === sponsor.id ? (
                      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <textarea 
                           value={pitch}
                           onChange={e => setPitch(e.target.value)}
                           placeholder="What sets you apart from the roster?" 
                           className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#E31837] min-h-[80px] resize-none"
                         />
                         <div className="flex gap-2">
                           <button onClick={() => setApplyingTo(null)} className="flex-1 py-2 text-[10px] font-black uppercase rounded-lg text-zinc-600 hover:text-white transition-colors">Cancel</button>
                           <button 
                            onClick={() => handleApply(sponsor.id)} 
                            disabled={!pitch.trim()}
                            className="flex-1 bg-[#E31837] py-2 text-[10px] font-black text-white uppercase rounded-lg hover:bg-red-700 disabled:opacity-50 transition shadow-lg shadow-red-900/20 italic"
                           >
                             Transmit Data
                           </button>
                         </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setApplyingTo(sponsor.id)}
                        disabled={applications.some(a => a.sponsorId === sponsor.id && a.status === 'pending')}
                        className="w-full border border-white/10 rounded-lg py-2.5 text-[10px] uppercase tracking-[0.2em] font-black hover:border-[#E31837] hover:text-[#E31837] transition-all text-white bg-zinc-950 flex items-center justify-center gap-2"
                      >
                        {applications.some(a => a.sponsorId === sponsor.id && a.status === 'pending') ? 'PENDING REVIEW' : 'SECURE SPONSOR'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#050505] border border-white/5 rounded-2xl p-6 shadow-2xl h-fit">
           <h2 className="text-xs font-black uppercase border-b border-white/5 pb-4 mb-6 flex items-center gap-2 italic tracking-widest text-[#E31837]">
             <Clock className="w-4 h-4" /> STATUS LOG
           </h2>
           <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-[10px] uppercase font-black tracking-widest text-zinc-700 italic">No active applications</p>
                </div>
              ) : applications.map(app => (
                <div key={app.id} className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl hover:border-zinc-800 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <span className="text-[11px] font-black uppercase text-white italic tracking-tighter">
                        {MOCK_SPONSORS.find(s => s.id === app.sponsorId)?.name || 'Advocate Network'}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-white/5">
                        {statusIcons[app.status]}
                        <span className={`text-[8px] font-black uppercase tracking-widest ${
                          app.status === 'approved' ? 'text-green-500' : 
                          app.status === 'rejected' ? 'text-[#E31837]' : 'text-zinc-500'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                   </div>
                   <p className="text-[10px] text-zinc-600 line-clamp-1 mb-2 font-medium italic">{app.pitch}</p>
                   <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-widest">{formatDistanceToNow(app.createdAt)} ago</p>
                </div>
              ))}
           </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 p-8 flex flex-col md:flex-row items-center justify-between rounded-2xl shadow-2xl group relative overflow-hidden">
         <div className="absolute inset-0 bg-red-900/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
         <div className="mb-6 md:mb-0 relative z-10">
           <h3 className="font-black text-xl uppercase mb-2 flex items-center gap-3 italic tracking-tighter text-white">
             <Star className="w-6 h-6 text-[#E31837] fill-[#E31837]" /> NEED A PROFESSIONAL AGENT?
           </h3>
           <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest max-w-xl">FightNet PRO members get dedicated sponsorship advocates and brand negotiators to accelerate career earnings.</p>
         </div>
         <button className="bg-white text-black px-10 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-200 transition-all shadow-xl shadow-white/5 relative z-10">
             UPGRADE TO PRO <Zap className="w-4 h-4 ml-1 inline text-[#E31837] fill-[#E31837]" />
         </button>
      </div>
    </div>
  );
}
