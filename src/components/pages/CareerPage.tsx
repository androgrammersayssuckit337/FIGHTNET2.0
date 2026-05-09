import React, { useState, useRef } from 'react';
import { Target, Award, Zap, Edit2, Save, X, Camera, Video, Shield, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    bio: userProfile?.bio || '',
    gym: userProfile?.gym || '',
    record: userProfile?.record || '',
    weightClass: userProfile?.weightClass || '',
    hometown: userProfile?.hometown || '',
    profileImageUrl: userProfile?.profileImageUrl || '',
    coverImageUrl: userProfile?.coverImageUrl || '',
    role: userProfile?.role || 'fan',
    socialLinks: {
      instagram: userProfile?.socialLinks?.instagram || '',
      twitter: userProfile?.socialLinks?.twitter || '',
      youtube: userProfile?.socialLinks?.youtube || '',
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Max 5MB.");
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}s/${auth.currentUser.uid}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload Error:", error);
        setIsUploading(false);
        alert(`Upload failed: ${error.message}`);
      }, 
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          if (type === 'profile') {
            setFormData(prev => ({ ...prev, profileImageUrl: downloadURL }));
          } else {
            setFormData(prev => ({ ...prev, coverImageUrl: downloadURL }));
          }
          setIsUploading(false);
          setUploadProgress(0);
          
          if (!isEditing && auth.currentUser) {
              const userRef = doc(db, 'users', auth.currentUser.uid);
              await updateDoc(userRef, { [type === 'profile' ? 'profileImageUrl' : 'coverImageUrl']: downloadURL });
          }
        } catch (err) {
          const error = err as Error;
          setIsUploading(false);
          alert(`Failed to get URL: ${error.message}`);
        }
      }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { role, ...updateData } = formData;
      await updateDoc(userRef, updateData);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users', auth);
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-12 bg-[#0a0a0a] min-h-full scrollbar-hide max-w-7xl mx-auto pb-24">
      {/* Dynamic Cover Section */}
      <div className="relative h-64 md:h-80 w-full rounded-3xl overflow-hidden group">
        <img 
          src={formData.coverImageUrl || 'https://images.unsplash.com/photo-1544333323-537245cb7c7d?w=1200&q=80'} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          alt="Cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/20 to-transparent"></div>
        
        {isEditing && (
          <div className="absolute top-4 right-4 flex gap-2">
            {isUploading && (
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-3 border border-[#E31837]/30">
                 <Loader2 className="w-4 h-4 text-[#E31837] animate-spin" />
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">{Math.round(uploadProgress)}%</span>
              </div>
            )}
            <button 
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-black/60 hover:bg-[#E31837] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-md disabled:opacity-50"
            >
              <Camera className="w-4 h-4" /> Change Cover
            </button>
          </div>
        )}
        
        <div className="absolute bottom-6 left-8 flex items-end gap-6">
           <div className="relative group">
              <img 
                src={formData.profileImageUrl || `https://ui-avatars.com/api/?name=${formData.displayName}&background=0c0c0c&color=fff`} 
                className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-[#0a0a0a] object-cover shadow-2xl" 
                alt="Profile"
              />
              {isEditing && (
                <button 
                  onClick={() => profileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              )}
           </div>
           <div className="pb-2">
              <h1 className="text-3xl md:text-5xl font-display uppercase italic text-white tracking-tighter leading-none">{formData.displayName || 'Unnamed Combatant'}</h1>
              <p className="text-[#E31837] text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
                <Shield className="w-4 h-4" /> {formData.role} Circuit Member
              </p>
           </div>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="flex items-center gap-4">
           <div className="w-2 h-12 bg-[#E31837] italic shadow-[0_0_20px_rgba(227,24,55,0.4)]"></div>
           <div>
             <h1 className="text-xl font-display uppercase text-white tracking-tighter italic leading-none mb-1">Career Configuration</h1>
             <p className="text-zinc-600 uppercase tracking-[0.2em] text-[8px] font-black italic">Advanced Identity Metrics & Agent Visibility</p>
           </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-3 px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isEditing ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white text-black hover:bg-zinc-200 shadow-xl'}`}
          >
            {isEditing ? <><X className="w-4 h-4" /> Discard Updates</> : <><Edit2 className="w-4 h-4" /> Refine Persona</>}
          </button>
        </div>
      </header>

      <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'cover')} className="hidden" accept="image/*" />
      <input type="file" ref={profileInputRef} onChange={(e) => handleFileUpload(e, 'profile')} className="hidden" accept="image/*" />

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
                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl space-y-6">
                      <div className="space-y-4">
                         <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Combat Classification</label>
                         <div className="grid grid-cols-1 gap-3">
                            {['fighter', 'fan', 'sponsor'].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setFormData({...formData, role: role as 'fighter' | 'fan' | 'sponsor'})}
                                className={`px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left transition-all ${formData.role === role ? 'bg-[#E31837] border-[#E31837] text-white shadow-lg shadow-red-900/20' : 'bg-black border-white/5 text-zinc-500 hover:border-zinc-700'}`}
                              >
                                {role} Roster
                              </button>
                            ))}
                         </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/5">
                         <label className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Social Presence</label>
                         <div className="space-y-3">
                            <input 
                              value={formData.socialLinks.instagram}
                              onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, instagram: e.target.value}})}
                              placeholder="Instagram @handle"
                              className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-[11px] text-white focus:border-[#E31837] outline-none transition-all"
                            />
                            <input 
                              value={formData.socialLinks.twitter}
                              onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, twitter: e.target.value}})}
                              placeholder="Twitter @handle"
                              className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-[11px] text-white focus:border-[#E31837] outline-none transition-all"
                            />
                            <input 
                              value={formData.socialLinks.youtube}
                              onChange={e => setFormData({...formData, socialLinks: {...formData.socialLinks, youtube: e.target.value}})}
                              placeholder="YouTube Channel ID"
                              className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-[11px] text-white focus:border-[#E31837] outline-none transition-all"
                            />
                         </div>
                      </div>
                   </div>
                </div>

                {/* Extended Bio and Stats */}
                <div className="lg:col-span-2 space-y-8">
                   <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl shadow-2xl space-y-8">
                      <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3">
                        <Zap className="w-5 h-5 text-[#E31837]" /> Identity Parameters
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Combat Moniker</label>
                            <input 
                              value={formData.displayName} 
                              onChange={e => setFormData({...formData, displayName: e.target.value})}
                              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] outline-none"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Official Record</label>
                            <input 
                              value={formData.record} 
                              onChange={e => setFormData({...formData, record: e.target.value})}
                              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] outline-none font-mono"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Current Weight Class</label>
                            <input 
                              value={formData.weightClass} 
                              onChange={e => setFormData({...formData, weightClass: e.target.value})}
                              placeholder="Lightweight (155 lb)"
                              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] outline-none"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Hometown / Origin</label>
                            <input 
                              value={formData.hometown} 
                              onChange={e => setFormData({...formData, hometown: e.target.value})}
                              placeholder="Las Vegas, NV"
                              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] outline-none"
                            />
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest ml-1">Career Statement</label>
                         <textarea 
                           value={formData.bio} 
                           onChange={e => setFormData({...formData, bio: e.target.value})}
                           className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-[#E31837] outline-none resize-none min-h-[150px]"
                         />
                      </div>

                      <button type="submit" className="w-full bg-[#E31837] text-white font-black uppercase italic tracking-tighter text-sm py-5 rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-900/40 flex items-center justify-center gap-3">
                        <Save className="w-5 h-5" /> Commit Persona Upgrades
                      </button>
                   </div>
                </div>
             </div>
          </motion.form>
        ) : (
          <motion.div 
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
               <div className="lg:col-span-1 space-y-6">
                  <div className="bg-zinc-950 border border-white/5 p-6 rounded-3xl space-y-6">
                     <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest border-b border-white/5 pb-4">Social Network</p>
                     <div className="space-y-4">
                        {formData.socialLinks.instagram && (
                          <a href={`https://instagram.com/${formData.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-[#E31837] transition-colors">
                            <Camera className="w-4 h-4" />
                            <span className="text-xs font-bold font-mono">@{formData.socialLinks.instagram}</span>
                          </a>
                        )}
                        {formData.socialLinks.twitter && (
                          <a href={`https://twitter.com/${formData.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-[#E31837] transition-colors">
                            <Zap className="w-4 h-4" />
                            <span className="text-xs font-bold font-mono">@{formData.socialLinks.twitter}</span>
                          </a>
                        )}
                        {formData.socialLinks.youtube && (
                          <a href={`https://youtube.com/${formData.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-white hover:text-[#E31837] transition-colors">
                            <Video className="w-4 h-4" />
                            <span className="text-xs font-bold font-mono">YouTube</span>
                          </a>
                        )}
                        <div className="flex items-center gap-3 text-zinc-600">
                           <Shield className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase">Verified Identity</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-zinc-950 border border-white/5 p-6 rounded-3xl space-y-6">
                     <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest border-b border-white/5 pb-4">Gym Access</p>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-[#E31837]">
                           <Zap className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-xs font-black text-white uppercase italic">{userProfile?.gym || 'Private Camp'}</p>
                           <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Primary Training</p>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-3 space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     {[
                       { label: 'RECORD', value: userProfile?.record || '0-0-0', icon: Award },
                       { label: 'WEIGHT', value: userProfile?.weightClass || 'TBD', icon: Zap },
                       { label: 'ORIGIN', value: userProfile?.hometown || 'Global', icon: Target },
                       { label: 'STATUS', value: 'ACTIVE', icon: Shield, color: 'text-green-500' }
                     ].map((stat, i) => (
                       <div key={i} className="bg-zinc-950 border border-white/5 p-4 rounded-2xl group hover:border-[#E31837]/30 transition-colors">
                          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                          <div className="flex items-center gap-2">
                             <stat.icon className={`w-3.5 h-3.5 ${stat.color || 'text-[#E31837]'} font-black`} />
                             <p className="text-sm font-black text-white italic truncate">{stat.value}</p>
                          </div>
                       </div>
                     ))}
                  </div>

                  <div className="bg-zinc-950 border border-white/5 p-8 rounded-3xl space-y-6">
                     <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest border-b border-white/5 pb-4">Career Biography</p>
                     <p className="text-zinc-300 text-lg leading-relaxed font-medium tracking-tight italic">
                        "{userProfile?.bio || 'No career statement provided. Define your legacy in the refined persona settings.'}"
                     </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden group">
                       <Video className="w-8 h-8 text-[#E31837] mb-4 relative z-10" />
                       <h3 className="text-xl font-black uppercase italic text-white tracking-tighter mb-2 relative z-10">AI Promo Veo</h3>
                       <p className="text-xs text-zinc-500 mb-6 relative z-10 leading-relaxed uppercase font-bold tracking-widest">Generate cinematic fight promos for agents and scouting networks.</p>
                       <button onClick={() => setShowVideoModal(true)} className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-zinc-200 transition-all relative z-10">Launch Engine</button>
                    </div>

                    <div className="bg-[#0c0c0c] border border-[#E31837]/30 p-8 rounded-3xl relative group">
                       <Zap className="w-8 h-8 text-[#E31837] mb-4" />
                       <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Priority Roster</p>
                       <h3 className="text-xl font-black uppercase italic text-white tracking-tighter mb-2">Upgrade to PRO</h3>
                       <div className="text-2xl font-black text-white italic mb-6 tracking-tighter">$9.99<span className="text-[10px] text-zinc-600 ml-1">/MO</span></div>
                       <Link to="/app/settings" className="block w-full py-4 bg-[#E31837] text-white font-black uppercase text-[10px] tracking-[0.2em] text-center rounded-xl hover:bg-red-700 transition-all shadow-xl shadow-red-900/20">Secure Access</Link>
                    </div>
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
