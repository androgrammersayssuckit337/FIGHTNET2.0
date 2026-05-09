import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { Moon, Sun, Monitor, Zap, CheckCircle2, Shield, CreditCard, Sparkles } from 'lucide-react';

export function SettingsPage() {
  const { userProfile } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleThemeChange = async (theme: 'dark' | 'light' | 'cyberpunk') => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { theme });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth);
    }
  };

  const handleUpgradeToPro = async () => {
    if (!auth.currentUser) return;
    setIsUpgrading(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { isPro: true });
      alert("Welcome to FightNet PRO! Your account has been upgraded.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-12 bg-[#0a0a0a] min-h-full max-w-5xl mx-auto">
      <header className="border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
           <div className="w-2 h-10 bg-white italic"></div>
           <div>
             <h1 className="text-2xl font-display uppercase text-white tracking-tighter italic">Network Settings</h1>
             <p className="text-zinc-600 uppercase tracking-widest text-[9px] font-black italic">Manage your connection and account parameters</p>
           </div>
        </div>
      </header>

      <section className="space-y-8">
        <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#E31837]" /> Visual Infrastructure
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'dark', label: 'VOID BLACK', icon: Moon, description: 'Standard high-contrast combat mode.' },
            { id: 'light', label: 'ARENA WHITE', icon: Sun, description: 'High visibility for daytime operation.' },
            { id: 'cyberpunk', label: 'NEON EDGE', icon: Monitor, description: 'Enhanced legacy styling with red accents.' }
          ].map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id as 'dark' | 'light' | 'cyberpunk')}
              className={`p-6 rounded-2xl border flex flex-col items-start text-left transition-all group ${
                userProfile?.theme === theme.id 
                  ? 'border-[#E31837] bg-zinc-900 shadow-xl shadow-red-900/10' 
                  : 'border-white/5 bg-zinc-950 hover:border-zinc-700'
              }`}
            >
              <theme.icon className={`w-6 h-6 mb-4 ${userProfile?.theme === theme.id ? 'text-[#E31837]' : 'text-zinc-500'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-white mb-1">{theme.label}</p>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tight leading-relaxed">{theme.description}</p>
              
              {userProfile?.theme === theme.id && (
                <div className="mt-4 flex items-center gap-2 text-[#E31837]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[8px] font-black uppercase tracking-widest">Active Matrix</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <h2 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#E31837]" /> Authorization Tier
        </h2>

        {userProfile?.isPro ? (
          <div className="bg-zinc-950 border border-[#E31837]/30 p-8 rounded-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4">
                <Shield className="w-12 h-12 text-[#E31837]/20" />
             </div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                   <div className="bg-[#E31837] text-white px-3 py-1 rounded-sm text-[10px] font-black uppercase italic shadow-[0_0_15px_rgba(227,24,55,0.4)]">FightNet PRO</div>
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Active Subscription</span>
                </div>
                <h3 className="text-2xl font-black uppercase text-white italic tracking-tighter mb-4">Professional Roster Access</h3>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest max-w-xl leading-relaxed mb-8">You have full access to agent messaging, premium analytics, and priority scouting placement. Your legacy is being monitored by the global circuit.</p>
                
                <button className="text-zinc-600 hover:text-white text-[10px] font-black uppercase tracking-widest underline underline-offset-4 decoration-zinc-800 transition-colors">Manage Subscription Details</button>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
             <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl flex flex-col">
                <h3 className="text-xl font-black uppercase italic text-white tracking-tighter mb-6">Upgrade to PRO</h3>
                <div className="space-y-4 mb-8 flex-1">
                   {[
                     'Unlimited Video Tape Uploads',
                     'Direct Messaging to Global Sponsors',
                     'Priority Agent Review Queue',
                     'Advanced Combat Analytics Dashboard',
                     'Exclusive Networking Inner-Circle'
                   ].map((feature, i) => (
                     <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-[#E31837] mt-0.5" />
                        <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{feature}</span>
                     </div>
                   ))}
                </div>
                <div className="flex items-baseline gap-2 mb-8">
                   <span className="text-4xl font-black text-white italic tracking-tighter">$9.99</span>
                   <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">/ Per Month</span>
                </div>
             </div>

             <div className="bg-[#0c0c0c] border border-white/5 p-8 rounded-3xl flex flex-col justify-center">
                <div className="mb-8">
                   <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4 block">Secure Payment Initialization</label>
                   <div className="space-y-4">
                      <div className="bg-black border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-all cursor-pointer">
                         <div className="flex items-center gap-4">
                            <CreditCard className="w-5 h-5 text-zinc-500" />
                            <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Credit or Debit Card</span>
                         </div>
                         <div className="w-4 h-4 rounded-full border-2 border-zinc-800"></div>
                      </div>
                      <div className="bg-black border border-white/5 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-700 transition-all cursor-pointer">
                         <div className="flex items-center gap-4 text-white">
                            <Monitor className="w-5 h-5 text-[#E31837]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Apple / Google Pay</span>
                         </div>
                         <div className="w-4 h-4 rounded-full border-2 border-[#E31837] bg-[#E31837]"></div>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={handleUpgradeToPro}
                  disabled={isUpgrading}
                  className="w-full bg-[#E31837] hover:bg-red-700 text-white font-black uppercase italic tracking-tighter py-5 rounded-2xl shadow-xl shadow-red-900/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isUpgrading ? (
                    <span className="animate-pulse">Authorizing...</span>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-white" />
                      Establish Pro Authority
                    </>
                  )}
                </button>
                <p className="text-[8px] text-zinc-700 text-center font-bold uppercase tracking-widest mt-6 leading-relaxed">By clicking, you authorize a recurring monthly charge. FightNet legacy tracking is continuous.</p>
             </div>
          </div>
        )}
      </section>

      <section className="pt-12 border-t border-white/5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.4em]">Network Ver 4.2.0-Alpha</p>
          <div className="flex gap-8">
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Privacy Protocol</span>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Service Terms</span>
            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-[#E31837]">Erase Identity (Permanent)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
