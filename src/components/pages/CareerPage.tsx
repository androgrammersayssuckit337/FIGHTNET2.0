import React, { useState, useRef } from 'react';
import { Target, Award, Zap, Edit2, Save, X, Camera, Loader2, Sparkles, Video } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { motion, AnimatePresence } from 'motion/react';
import { PromoGenerator } from '../PromoGenerator';

export function CareerPage() {
  const { userProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    gym: userProfile?.gym || '',
    record: userProfile?.record || '',
    profileImageUrl: userProfile?.profileImageUrl || '',
    role: userProfile?.role || 'fan',
  });

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `profiles/${auth.currentUser.uid}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    console.log("uploading to:", fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
        console.log(`Upload progress: ${progress}%`);
      }, 
      (error) => {
        console.error("Firebase Storage Upload Error:", error);
        setIsUploading(false);
        alert(`Upload failed: ${error.message}. Check storage rules.`);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("File available at:", downloadURL);
          setFormData(prev => ({ ...prev, profileImageUrl: downloadURL }));
          setIsUploading(false);
          setUploadProgress(0);
          
          if (!isEditing && auth.currentUser) {
              const userRef = doc(db, 'users', auth.currentUser.uid);
              await updateDoc(userRef, { profileImageUrl: downloadURL });
              window.location.reload();
          }
        } catch (err: any) {
          console.error("Error getting download URL:", err);
          setIsUploading(false);
          alert(`Failed to get download URL: ${err.message}`);
        }
      }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, formData);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-12 bg-[#0a0a0a] min-h-full scrollbar-hide max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
           <div className="w-2 h-12 bg-[#E31837] italic shadow-[0_0_20px_rgba(227,24,55,0.4)]"></div>
           <div>
             <h1 className="text-3xl font-display uppercase text-white tracking-tighter italic leading-none mb-2">Combat Persona</h1>
             <p className="text-zinc-600 uppercase tracking-[0.2em] text-[10px] font-black italic">Refining the Bridge to Professional Glory</p>
           </div>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isEditing ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white text-black hover:bg-zinc-200 shadow-xl'}`}
        >
          {isEditing ? <><X className="w-4 h-4" /> Discard Changes</> : <><Edit2 className="w-4 h-4" /> Refine Identity</>}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.form 
            key="editing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleUpdateProfile} 
            className="space-y-8"
          >
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Image and Basic Info */}
                <div className="lg:col-span-1 space-y-8">
                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl flex flex-col items-center text-center shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-b from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative group mb-6">
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#E31837] to-red-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <img 
                         src={formData.profileImageUrl || `https://ui-avatars.com/api/?name=${formData.displayName}&background=0c0c0c&color=fff`} 
                         className="relative w-40 h-40 rounded-full border-4 border-black object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105" 
                         alt="Profile"
                        />
                        <button 
                         type="button"
                         onClick={() => fileInputRef.current?.click()}
                         className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          {isUploading ? (
                            <Loader2 className="w-8 h-8 animate-spin text-white" />
                          ) : (
                            <Camera className="w-8 h-8 text-white" />
                          )}
                        </button>
                        <input 
                         type="file" 
                         ref={fileInputRef} 
                         onChange={handleProfilePicUpload} 
                         className="hidden" 
                         accept="image/*"
                        />
                      </div>
                      <h3 className="text-xl font-black uppercase italic text-white mb-2 relative z-10">{formData.displayName || 'Unnamed Combatant'}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest max-w-[200px] relative z-10">Update your visual identity for agent discovery</p>
                      
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-zinc-900 h-1 rounded-full mt-6 overflow-hidden relative z-10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="bg-[#E31837] h-full shadow-[0_0_10px_#E31837]" 
                          />
                        </div>
                      )}
                   </div>

                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl space-y-6">
                      <div className="space-y-4">
                         <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Fighter Status</label>
                         <div className="grid grid-cols-1 gap-3">
                            {['fighter', 'fan', 'sponsor'].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setFormData({...formData, role: role as any})}
                                className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left transition-all ${formData.role === role ? 'bg-[#E31837] border-[#E31837] text-white shadow-lg' : 'bg-black border-white/5 text-zinc-500 hover:border-zinc-700'}`}
                              >
                                {role} Account
                              </button>
                            ))}
                         </div>
                         <p className="text-[9px] text-zinc-600 font-bold mt-2 italic">Role updates help agents categorize your performance tape.</p>
                      </div>
                   </div>
                </div>

                {/* Extended Bio and Stats */}
                <div className="lg:col-span-2 space-y-8">
                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative z-10 space-y-8">
                         <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                           <Zap className="w-5 h-5 text-[#E31837]" />
                           Vital Combat Data
                         </h2>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Display Name</label>
                               <input 
                                 value={formData.displayName} 
                                 onChange={e => setFormData({...formData, displayName: e.target.value})}
                                 placeholder="The Shadow"
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Current Record (W-L-D)</label>
                               <input 
                                 value={formData.record} 
                                 onChange={e => setFormData({...formData, record: e.target.value})}
                                 placeholder="12-0-3"
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all font-mono"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Primary Training Facility</label>
                               <input 
                                 value={formData.gym} 
                                 onChange={e => setFormData({...formData, gym: e.target.value})}
                                 placeholder="MMA Factory LA"
                                 className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all"
                               />
                            </div>
                         </div>

                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Combat Bio / Mission Statement</label>
                            <textarea 
                              value={formData.bio} 
                              onChange={e => setFormData({...formData, bio: e.target.value})}
                              placeholder="Tell promoters and fans who you are, what you fight for, and why you're the next big prospect."
                              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] focus:ring-1 focus:ring-[#E31837] outline-none transition-all resize-none min-h-[150px] leading-relaxed"
                            />
                         </div>

                         <div className="pt-4">
                            <button type="submit" className="flex items-center gap-3 bg-[#E31837] text-white font-black uppercase italic tracking-tighter text-sm px-10 py-4 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-900/40 group/save">
                              <Save className="w-5 h-5 group-hover/save:scale-110 transition-transform" />
                              Lock Identity Updates
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </motion.form>
        ) : (
          <motion.div 
            key="display"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="space-y-12"
          >
          <div className="flex flex-col md:flex-row gap-8 mb-12 items-center md:items-start">
             <div className="relative">
                <img 
                  src={userProfile?.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile?.displayName}&background=0c0c0c&color=fff`} 
                  className="w-32 h-32 rounded-full border-4 border-zinc-800 object-cover" 
                  alt="Profile"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#E31837] text-white p-1.5 rounded-full border-2 border-[#0a0a0a]">
                   <Award className="w-4 h-4" />
                </div>
             </div>
             <div className="text-center md:text-left">
                <h2 className="text-3xl font-black uppercase text-white italic tracking-tighter mb-2">{userProfile?.displayName}</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                   <div className="text-[10px] uppercase font-bold tracking-widest text-[#E31837] bg-red-900/10 px-2 py-1 rounded">ROLE: {userProfile?.role}</div>
                   <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded">GYM: {userProfile?.gym || 'NOT LISTED'}</div>
                   <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 bg-zinc-800 px-2 py-1 rounded">RECORD: {userProfile?.record || '0-0-0'}</div>
                </div>
                <p className="mt-4 text-sm text-zinc-400 max-w-lg leading-relaxed">{userProfile?.bio || 'No bio provided. Update your fighter profile to get noticed.'}</p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center text-center space-y-4 hover:border-[#E31837] transition-colors rounded-lg">
              <Target className="w-8 h-8 text-[#E31837]" />
              <h2 className="text-lg font-black uppercase tracking-tight">Record: {userProfile?.record || '0-0-0'}</h2>
              <p className="text-xs text-zinc-400 max-w-sm">Verified bout tracking and performance analytics. Get regional promoters' eyes on you.</p>
              <div className="text-[10px] font-bold text-zinc-500 uppercase mt-2">Gym: {userProfile?.gym || 'Private'}</div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center text-center space-y-4 hover:border-[#E31837] transition-colors relative overflow-hidden rounded-lg">
              <Award className="w-8 h-8 text-[#E31837] relative z-10" />
              <h2 className="text-lg font-black uppercase tracking-tight relative z-10">Pro Status Assessment</h2>
              <p className="text-xs text-zinc-400 max-w-sm relative z-10">Submit your tape and stats to our advocating agents to see if you're ready to bridge to Pro.</p>
              <button className="bg-[#E31837] px-6 py-2 uppercase text-[10px] font-bold mt-4 hover:bg-red-700 text-white w-full rounded relative z-10 border border-white/10 shadow-[0_0_15px_rgba(227,24,55,0.2)]">Submit Tape</button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col items-center text-center space-y-4 hover:border-[#E31837] transition-colors relative overflow-hidden rounded-lg">
              <Video className="w-8 h-8 text-[#E31837] relative z-10" />
              <h2 className="text-lg font-black uppercase tracking-tight relative z-10">Promo Generator AI</h2>
              <p className="text-xs text-zinc-400 max-w-sm relative z-10">Generate a cinematic promotional video for your next fight using Google Veo.</p>
              <button onClick={() => setShowVideoModal(true)} className="bg-white px-6 py-2 uppercase text-[10px] text-black font-bold mt-4 hover:bg-zinc-200 w-full rounded relative z-10 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]">Create Promo</button>
            </div>
          </div>

          <div className="bg-[#0c0c0c] border border-[#E31837]/30 p-8 mt-12 rounded-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-display uppercase text-white mb-2 flex items-center gap-2 italic tracking-tighter"><Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" /> FightNet Pro</h2>
                <p className="text-zinc-400 mb-4 text-sm max-w-lg">Unlimited tape uploads, premium analytics, direct messaging to sponsors, and priority agent review process.</p>
                <div className="text-[#E31837] font-black text-3xl tracking-tighter mb-4">$9.99<span className="text-[10px] text-zinc-500 font-sans uppercase tracking-widest ml-1">/mo</span></div>
                <button className="bg-white text-black px-6 py-2 font-bold uppercase tracking-tighter text-[11px] rounded hover:bg-zinc-200 transition">Upgrade to Pro</button>
              </div>
              <div className="hidden md:block w-32 h-32 rounded-full border border-zinc-800 overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-500">
                 <div className="absolute inset-0 bg-cover bg-center mix-blend-screen" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1599552611410-ded85cb2cb39?w=300&q=80)'}}></div>
                 <div className="absolute inset-0 bg-[#E31837]/20 mix-blend-multiply"></div>
              </div>
            </div>
          </div>

          <PromoGenerator 
            isOpen={showVideoModal} 
            onClose={() => setShowVideoModal(false)} 
            fighterName={userProfile?.displayName || 'The Contender'} 
          />
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
