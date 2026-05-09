import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
import { 
  collection, 
  query, 
  where,
  orderBy, 
  onSnapshot, 
  addDoc,
  getDocs,
  doc, 
  getDoc, 
  serverTimestamp, 
  updateDoc, 
  increment as firestoreIncrement 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Share2, Trophy, MapPin, ExternalLink, Camera, Shield, Video, BarChart, Filter, ChevronRight, Activity, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'video' | 'image';
  likesCount: number;
  createdAt: number;
  authorName?: string;
  authorImage?: string;
  authorRole?: string;
  authorRecord?: string;
  authorGym?: string;
}

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorImage: string;
  content: string;
  createdAt: number;
}

interface FighterStats {
  wins: number;
  losses: number;
  draws: number;
  winRatio: number;
  totalFights: number;
}

interface FighterProfile {
  id: string;
  displayName: string;
  role: 'fighter' | 'fan' | 'sponsor';
  profileImageUrl: string;
  record: string;
  weightClass: string;
  gym: string;
  bio: string;
  isPro: boolean;
  stats: FighterStats;
  highlights: Post[];
}

export function FeedPage() {
  const { currentUser, userProfile } = useAuth();
  const [view, setView] = useState<'feed' | 'scout'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [fighters, setFighters] = useState<FighterProfile[]>([]);
  const [isLoadingFighters, setIsLoadingFighters] = useState(false);
  
  // Scouting Filters
  const [weightFilter, setWeightFilter] = useState('All');
  const [minWinRatio, setMinWinRatio] = useState(0);
  
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickVideoInputRef = useRef<HTMLInputElement>(null);

  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [suggestedUsers, setSuggestedUsers] = useState<Array<{id: string, displayName: string, role: string, profileImageUrl?: string}>>([]);

  const parseRecord = (record: string): FighterStats => {
    if (!record) return { wins: 0, losses: 0, draws: 0, winRatio: 0, totalFights: 0 };
    const parts = record.split('-').map(n => parseInt(n.trim()) || 0);
    const wins = parts[0] || 0;
    const losses = parts[1] || 0;
    const draws = parts[2] || 0;
    const total = wins + losses + draws;
    const ratio = total > 0 ? (wins / total) * 100 : 0;
    return { wins, losses, draws, winRatio: ratio, totalFights: total };
  };

  useEffect(() => {
    if (view === 'scout') {
      const fetchFighters = async () => {
        setIsLoadingFighters(true);
        try {
          // Fetch all fighters
          const fighterQuery = query(collection(db, 'users'), where('role', '==', 'fighter'));
          const fighterSnap = await getDocs(fighterQuery);
          
          // Fetch all video posts to associate highlights
          const videoQuery = query(
            collection(db, 'posts'), 
            where('mediaType', '==', 'video'),
            where('status', '==', 'published')
          );
          const videoSnap = await getDocs(videoQuery);
          const allVideos = videoSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post));

          const profiles = fighterSnap.docs.map(doc => {
            const data = doc.data();
            const stats = parseRecord(data.record || '');
            const highlights = allVideos.filter(v => v.authorId === doc.id).slice(0, 3);
            
            return {
              id: doc.id,
              displayName: data.displayName,
              role: data.role,
              profileImageUrl: data.profileImageUrl,
              record: data.record || '0-0-0',
              weightClass: data.weightClass || 'TBD',
              gym: data.gym || 'Private',
              bio: data.bio || '',
              isPro: data.isPro || false,
              stats,
              highlights
            } as FighterProfile;
          });

          setFighters(profiles);
        } catch (error) {
          console.error("Scouting fetch failed:", error);
        } finally {
          setIsLoadingFighters(false);
        }
      };
      fetchFighters();
    }
  }, [view]);

  const filteredFighters = useMemo(() => {
    return fighters.filter(f => {
      const matchesWeight = weightFilter === 'All' || f.weightClass.includes(weightFilter);
      const matchesRatio = f.stats.winRatio >= minWinRatio;
      return matchesWeight && matchesRatio;
    }).sort((a, b) => b.stats.winRatio - a.stats.winRatio);
  }, [fighters, weightFilter, minWinRatio]);

  const weightClasses = useMemo(() => {
    const weights = new Set<string>();
    fighters.forEach(f => { if (f.weightClass) weights.add(f.weightClass); });
    return ['All', ...Array.from(weights)];
  }, [fighters]);

  useEffect(() => {
    if (showMentions) {
      const fetchSuggested = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'fighter'));
          const snapshot = await getDocs(q);
          const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const filtered = users.filter((u: Record<string, unknown>) => 
            typeof u.displayName === 'string' && u.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
          ).slice(0, 5);
          setSuggestedUsers(filtered as Array<{id: string, displayName: string, role: string, profileImageUrl?: string}>);
        } catch (error) {
          console.error("Error fetching mentions", error);
        }
      };
      fetchSuggested();
    }
  }, [mentionQuery, showMentions]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'posts'), 
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
        } as Post;
      });
      
      const hydratedPosts = await Promise.all(postsData.map(async (post) => {
         try {
           const userDoc = await getDoc(doc(db, 'users', post.authorId));
           if (userDoc.exists()) {
             const userData = userDoc.data();
             return { 
               ...post, 
               authorName: userData.displayName, 
               authorImage: userData.profileImageUrl,
               authorRole: userData.role,
               authorRecord: userData.record,
               authorGym: userData.gym
             };
           }
         } catch(e) { console.error('Failed to fetch author', e) }
         return post;
      }));

      setPosts(hydratedPosts);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts', auth);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleFileUpload = async (file: File) => {
    if (!currentUser) throw new Error('Not authenticated');
    setIsSubmitting(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `posts/${currentUser.uid}/${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    
    console.log("Starting upload to:", fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}%`);
        }, 
        (error) => {
          console.error("Firebase Storage Upload Error:", error);
          const msg = error.code === 'storage/unauthorized' 
            ? "File too large (Max 50MB) or incorrect type." 
            : error.message;
          alert(`Upload failed: ${msg}`);
          reject(error);
        }, 
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("File available at:", downloadURL);
            resolve(downloadURL);
          } catch (err) {
            console.error("Error getting download URL:", err);
            reject(err);
          }
        }
      );
    });
  };

  const handleQuickVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      setIsSubmitting(true);
      try {
        const mediaUrl = await handleFileUpload(file);
        await addDoc(collection(db, 'posts'), {
          authorId: currentUser.uid,
          content: `Just uploaded a new fight video: ${file.name}`,
          createdAt: serverTimestamp(),
          likesCount: 0,
          mediaUrl,
          mediaType: 'video',
          status: 'published'
        });
        setUploadProgress(0);
        if (quickVideoInputRef.current) quickVideoInputRef.current.value = '';
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'posts', auth);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewPostContent(value);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const q = lastWord.substring(1);
      setMentionQuery(q);
      setShowMentions(true);
      setMentionCursorPosition(cursorPosition);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (user: {id: string, displayName: string, role: string, profileImageUrl?: string}) => {
    const value = newPostContent;
    const textBeforeCursor = value.substring(0, mentionCursorPosition);
    const words = textBeforeCursor.split(/\s/);
    words.pop(); // remove the partial mention
    
    const mentionText = `@[${user.displayName}](${user.id}) `;
    
    const newTextBefore = words.length > 0 ? words.join(' ') + ' ' + mentionText : mentionText;
    const textAfter = value.substring(mentionCursorPosition);
    
    setNewPostContent(newTextBefore + textAfter);
    setShowMentions(false);
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      parts.push(
        <Link key={match.index} to={`/app/profile/${match[2]}`} className="text-[#E31837] font-bold hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
          @{match[1]}
        </Link>
      );
      lastIndex = mentionRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !currentUser) return;

    setIsSubmitting(true);
    let mediaUrl = '';
    const file = selectedFile;

    try {
      if (file) {
        mediaUrl = await handleFileUpload(file);
      }

      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        content: newPostContent,
        createdAt: serverTimestamp(),
        likesCount: 0,
        mediaUrl,
        mediaType: file ? (file.type.startsWith('video') ? 'video' : 'image') : '',
        status: 'published'
      });
      
      setNewPostContent('');
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploadProgress(0);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts', auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likesCount: firestoreIncrement(1)
      });
    } catch (error) {
      console.error("Like failed:", error);
    }
  };

  const [isShareOpen, setIsShareOpen] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const toggleComments = (postId: string) => {
    const next = new Set(openComments);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
    }
    setOpenComments(next);
  };

  const handleShare = async (post: Post) => {
    const shareData = {
      title: 'FightNet',
      text: `Check out this post by ${post.authorName} on FightNet: "${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`,
      url: `${window.location.origin}/app?post=${post.id}`,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.error('Share failed:', error);
      }
    } else {
      setIsShareOpen(post.id);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('TRANSMISSION COPIED TO CLIPBOARD');
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#0a0a0a]">
      {/* Feed Section */}
      <section className="flex-1 border-r border-white/5 p-4 md:p-8 space-y-8 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-[#E31837] italic shadow-[0_0_15px_rgba(227,24,55,0.5)]"></div>
             <h2 className="text-3xl font-display uppercase italic text-white tracking-tighter">Combat Control</h2>
          </div>
          
          <div className="flex items-center bg-zinc-950 p-1 border border-white/5 rounded-xl shadow-lg">
             <button 
               onClick={() => setView('feed')}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'feed' ? 'bg-[#E31837] text-white shadow-[0_0_20px_rgba(227,24,55,0.3)]' : 'text-zinc-500 hover:text-white'}`}
             >
               <Activity className="w-3.5 h-3.5" />
               Live Feed
             </button>
             <button 
               onClick={() => setView('scout')}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${view === 'scout' ? 'bg-[#E31837] text-white shadow-[0_0_20px_rgba(227,24,55,0.3)]' : 'text-zinc-500 hover:text-white'}`}
             >
               <BarChart className="w-3.5 h-3.5" />
               Scouting Matrix
             </button>
          </div>
        </div>

        {view === 'scout' ?
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Filter Suite */}
            <div className="flex flex-wrap items-center gap-6 p-6 bg-zinc-950 border border-white/5 rounded-2xl shadow-xl">
               <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-[#E31837]" />
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Weight Class</span>
                  <select 
                    value={weightFilter}
                    onChange={(e) => setWeightFilter(e.target.value)}
                    className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-white focus:border-[#E31837] outline-none transition-all"
                  >
                    {weightClasses.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
               </div>

               <div className="flex items-center gap-6 flex-1 min-w-[240px]">
                  <BarChart className="w-4 h-4 text-[#E31837]" />
                  <div className="flex-1 space-y-2">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-zinc-500">Min. Win Ratio</span>
                        <span className="text-[#E31837]">{minWinRatio}%</span>
                     </div>
                     <input 
                       type="range"
                       min="0"
                       max="100"
                       step="5"
                       value={minWinRatio}
                       onChange={(e) => setMinWinRatio(parseInt(e.target.value))}
                       className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#E31837]"
                     />
                  </div>
               </div>


            </div>

            {/* Fighter Matrix Grid */}
            <div className="grid grid-cols-1 gap-8">
               {isLoadingFighters ? (
                 <div className="p-24 flex flex-col items-center justify-center gap-4">
                    <Zap className="w-8 h-8 text-[#E31837] animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em]">Synchronizing Fighter Database...</span>
                 </div>
               ) : filteredFighters.length > 0 ? (
                 filteredFighters.map((fighter, i) => (
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: i * 0.1 }}
                     key={fighter.id} 
                     className="group relative bg-[#0c0c0c] border border-white/5 rounded-3xl overflow-hidden hover:border-[#E31837]/30 transition-all shadow-2xl"
                   >
                     <div className="flex flex-col xl:flex-row">
                        {/* Profile Persona */}
                        <div className="p-8 xl:w-80 border-b xl:border-b-0 xl:border-r border-white/5 bg-zinc-950/50">
                           <div className="flex items-center gap-4 mb-6">
                              <Link to={`/app/profile/${fighter.id}`} className="relative shrink-0 hover:scale-105 transition-transform duration-300">
                                 <img src={fighter.profileImageUrl || `https://ui-avatars.com/api/?name=${fighter.displayName}&background=000&color=fff`} className="w-16 h-16 rounded-2xl object-cover border border-white/10" alt="" />
                                 {fighter.isPro && (
                                   <div className="absolute -top-2 -right-2 bg-[#E31837] text-white p-1 rounded-lg shadow-lg border border-white/10 z-10">
                                      <Zap className="w-3 h-3 fill-white" />
                                   </div>
                                 )}
                              </Link>
                              <div>
                                 <Link to={`/app/profile/${fighter.id}`} className="hover:text-[#E31837] transition-colors">
                                    <h3 className="text-lg font-black italic text-white uppercase tracking-tighter leading-tight">{fighter.displayName}</h3>
                                 </Link>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">{fighter.weightClass}</span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                                    <span className="text-[9px] font-black uppercase text-[#E31837] tracking-widest">{fighter.record}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="space-y-1.5">
                                 <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                    <span className="text-zinc-600">Win Probability</span>
                                    <span className="text-white">{Math.round(fighter.stats.winRatio)}%</span>
                                 </div>
                                 <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-gradient-to-r from-red-600 to-[#E31837] shadow-[0_0_10px_#E31837]" 
                                      style={{ width: `${fighter.stats.winRatio}%` }}
                                    ></div>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-6">
                                 <div className="bg-black border border-white/5 p-3 rounded-xl">
                                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Affiliation</p>
                                    <p className="text-[10px] font-black text-white uppercase truncate">{fighter.gym}</p>
                                 </div>
                                 <div className="bg-black border border-white/5 p-3 rounded-xl">
                                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Total Fights</p>
                                    <p className="text-[10px] font-black text-white uppercase">{fighter.stats.totalFights}</p>
                                 </div>
                              </div>
                           </div>
                           
                           <Link to={`/app/profile/${fighter.id}`} className="mt-8 flex items-center justify-between w-full p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all group/link">
                              View Intelligence
                              <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                           </Link>
                        </div>

                        {/* Highlight Matrix */}
                        <div className="flex-1 p-8">
                           <div className="flex items-center gap-2 mb-6">
                              <Video className="w-4 h-4 text-[#E31837]" />
                              <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.3em]">Combat Reel / Highlights</h4>
                           </div>
                           
                           <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                              {fighter.highlights.length > 0 ? fighter.highlights.map(vid => (
                                 <div key={vid.id} className="min-w-[280px] group/vid relative aspect-video rounded-2xl overflow-hidden border border-white/5 shadow-xl">
                                    <video 
                                      src={vid.mediaUrl} 
                                      className="w-full h-full object-cover"
                                      muted
                                      onMouseOver={(e) => e.currentTarget.play()}
                                      onMouseOut={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                       <p className="text-[10px] font-bold text-white uppercase tracking-tight line-clamp-2">{vid.content}</p>
                                       <div className="mt-2 flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                             <div className="flex items-center gap-1 text-[#E31837]">
                                                <Heart className="w-3 h-3 fill-[#E31837]" />
                                                <span className="text-[9px] font-black">{vid.likesCount}</span>
                                             </div>
                                          </div>
                                          <span className="text-[8px] text-zinc-500 font-bold uppercase">{formatDistanceToNow(vid.createdAt)} ago</span>
                                       </div>
                                    </div>
                                 </div>
                              )) : (
                                 <div className="w-full py-12 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-2xl opacity-40">
                                    <Shield className="w-8 h-8 mb-3" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No verified tapes found</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                   </motion.div>
                 ))
               ) : (
                 <div className="p-32 text-center bg-zinc-950 border border-white/5 rounded-3xl">
                    <Filter className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                    <h3 className="text-xl font-black italic uppercase text-white tracking-tighter mb-2">No Matching Prospects</h3>
                    <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Adjust your matrix filters to broaden the search.</p>
                 </div>
               )}
            </div>
          </div>
        : (
          <div className="flex flex-col gap-12">
            <div className="space-y-12">
              {userProfile && (
                <form onSubmit={handleCreatePost} className="bg-zinc-950 border border-white/10 rounded-xl p-6 shadow-2xl relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E31837]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex gap-5 relative z-10">
              <img src={userProfile.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile.displayName}&background=111&color=fff`} alt="" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
              <div className="flex-1 relative">
                <textarea 
                  value={newPostContent}
                  onChange={handleContentChange}
                  placeholder="Drop a highlight, training clip, or career news..."
                  className="w-full bg-transparent text-lg font-medium text-white placeholder-zinc-700 underline-offset-8 decoration-[#E31837]/20 focus:outline-none resize-none mb-4 min-h-[100px]"
                />
                
                {showMentions && suggestedUsers.length > 0 && (
                  <div className="absolute top-16 left-0 w-64 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden text-sm max-h-48 overflow-y-auto">
                    {suggestedUsers.map(u => (
                      <div 
                        key={u.id}
                        onClick={() => handleSelectMention(u)}
                        className="flex items-center gap-3 p-3 hover:bg-zinc-800 cursor-pointer transition-colors"
                      >
                        <img src={u.profileImageUrl || `https://ui-avatars.com/api/?name=${u.displayName}&background=111&color=fff`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
                        <div>
                          <p className="font-bold text-white text-xs">{u.displayName}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{u.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {previewUrl && (
                  <div className="relative mb-4 group/preview">
                    {selectedFile?.type.startsWith('video') ? (
                      <video src={previewUrl} className="max-h-60 rounded-lg border border-white/10" controls />
                    ) : (
                      <img src={previewUrl} className="max-h-60 rounded-lg border border-white/10 object-contain" alt="Preview" />
                    )}
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white hover:bg-[#E31837] transition-colors"
                    >
                      <Share2 className="w-4 h-4 rotate-45" /> {/* Using share bit rotated as an X if needed, or I'll just use a generic icon */}
                    </button>
                  </div>
                )}
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                   <div className="w-full bg-zinc-900 h-1.5 rounded-full mb-4 overflow-hidden">
                     <div className="bg-[#E31837] h-full transition-all shadow-[0_0_10px_#E31837]" style={{ width: `${uploadProgress}%` }}></div>
                   </div>
                )}

                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                   <div className="flex items-center gap-6">
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-zinc-500 hover:text-[#E31837] text-[10px] font-black uppercase flex items-center gap-2 transition-all group/btn"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Add Tape / Snap</span>
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="video/*,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            const url = URL.createObjectURL(file);
                            setPreviewUrl(url);
                            
                            const isVid = file.type.includes('video');
                            setNewPostContent(prev => prev || `Fresh ${isVid ? 'tape' : 'shot'}: ${file.name}`);
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={() => quickVideoInputRef.current?.click()}
                        className="text-zinc-500 hover:text-[#E31837] text-[10px] font-black uppercase flex items-center gap-2 transition-all group/btn"
                      >
                        <Video className="w-4 h-4" />
                        <span>Quick Video Upload</span>
                      </button>
                      <input 
                        type="file" 
                        ref={quickVideoInputRef} 
                        className="hidden" 
                        accept="video/*"
                        onChange={handleQuickVideoUpload}
                      />
                   </div>
                   <button 
                    type="submit" 
                    disabled={isSubmitting || (!newPostContent.trim() && !selectedFile)}
                    className="bg-[#E31837] text-white px-8 py-2.5 font-black uppercase italic tracking-tighter rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-900/20"
                   >
                     {isSubmitting ? 'Locking in...' : 'Publish'}
                   </button>
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-12">
          {posts.map(post => (
            <div key={post.id} className="group relative bg-[#0a0a0a] animate-in fade-in slide-in-from-bottom-8 duration-700">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                 <div className="flex items-center gap-4">
                   <div className="relative">
                      <img src={post.authorImage || `https://ui-avatars.com/api/?name=${post.authorName}&background=000&color=fff`} className="w-12 h-12 rounded-full border-2 border-white/5 object-cover" alt="" />
                      {post.authorRole === 'fighter' && (
                        <div className="absolute -bottom-1 -right-1 bg-[#E31837] text-white p-0.5 rounded-full border-2 border-black">
                          <Trophy className="w-3 h-3" />
                        </div>
                      )}
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                        <h3 className="font-black text-white text-base tracking-tight uppercase italic">{post.authorName}</h3>
                        {post.authorRole === 'fighter' && post.authorRecord && (
                          <span className="text-[10px] bg-red-900/20 text-[#E31837] px-1.5 py-0.5 font-black rounded uppercase">{post.authorRecord}</span>
                        )}
                     </div>
                     <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{formatDistanceToNow(post.createdAt)} ago</span>
                        {post.authorGym && (
                          <span className="flex items-center gap-1 text-[10px] text-zinc-700 font-bold uppercase">
                            <MapPin className="w-2.5 h-2.5" />
                            {post.authorGym}
                          </span>
                        )}
                     </div>
                   </div>
                 </div>
                 <button 
                   onClick={() => handleShare(post)}
                   className="text-zinc-800 hover:text-white transition-colors p-1"
                 >
                   <Share2 className="w-4 h-4" />
                 </button>
              </div>
               
              <div className="mb-6">
                 <p className="text-zinc-200 text-lg md:text-xl font-medium leading-relaxed tracking-tight whitespace-pre-wrap">{renderContent(post.content)}</p>
              </div>

               {/* Media Display */}
               {post.mediaUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-zinc-950 group-hover:border-[#E31837]/30 transition-colors shadow-2xl">
                    {post.mediaType === 'video' ? (
                      <div className="relative aspect-video flex items-center justify-center bg-black">
                        <video 
                          src={post.mediaUrl} 
                          className="w-full h-full object-contain"
                          controls
                          playsInline
                        />
                        <div className="absolute top-4 right-4 z-20">
                           <button 
                            onClick={() => window.open(post.mediaUrl, '_blank')}
                            className="bg-black/80 p-2 rounded-full border border-white/10 text-white hover:bg-[#E31837] transition-colors"
                           >
                             <ExternalLink className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group/img">
                        <img src={post.mediaUrl} className="w-full max-h-[600px] object-cover" alt="Post content" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-6">
                           <button 
                            onClick={() => window.open(post.mediaUrl, '_blank')}
                            className="text-white text-xs font-bold uppercase underline underline-offset-4 decoration-[#E31837]"
                           >
                             View Full Intensity
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
               )}

              <div className="mt-6 flex items-center gap-8 border-t border-white/5 pt-6 relative">
                 <button 
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-2.5 text-zinc-500 hover:text-[#E31837] transition-all group/stat relative px-2 py-1 rounded hover:bg-[#E31837]/5"
                 >
                   <Heart className={`w-5 h-5 ${post.likesCount > 0 ? 'fill-[#E31837] text-[#E31837]' : ''} group-hover/stat:scale-110 transition-transform`} />
                   <span className="text-xs font-black tracking-tighter uppercase">{post.likesCount || ''} ENFORCEMENTS</span>
                 </button>
                  <button 
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2.5 text-zinc-500 hover:text-white transition-all group/stat px-2 py-1 rounded hover:bg-white/5"
                  >
                    <MessageSquare className="w-5 h-5 group-hover/stat:scale-110 transition-transform" />
                    <span className="text-xs font-black tracking-tighter uppercase">COMMENTS</span>
                  </button>
                 <div className="relative">
                    <button 
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-2.5 text-zinc-500 hover:text-[#E31837] transition-all group/stat px-4 py-2 bg-zinc-900/50 border border-white/5 rounded-lg active:scale-95"
                    >
                      <Share2 className="w-4 h-4 group-hover/stat:rotate-12 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">TRANSMIT</span>
                    </button>
                    
                    {isShareOpen === post.id && (
                      <div className="absolute bottom-full mb-4 right-0 w-64 bg-zinc-900 border border-white/10 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 animate-in fade-in zoom-in-95 duration-200">
                         <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Secure Share</span>
                           <button onClick={() => setIsShareOpen(null)} className="text-zinc-600 hover:text-white"><Share2 className="w-3 h-3 rotate-45" /></button>
                         </div>
                         <div className="space-y-3">
                           <button 
                             onClick={() => { copyToClipboard(`${window.location.origin}/app?post=${post.id}`); setIsShareOpen(null); }}
                             className="w-full py-2.5 bg-black hover:bg-zinc-800 border border-white/5 rounded-xl text-[10px] font-black uppercase text-white transition-all"
                           >
                             Copy Secure Link
                           </button>
                           <a 
                             href={`https://twitter.com/intent/tweet?text=Check out this fight highlight on FightNet!&url=${encodeURIComponent(`${window.location.origin}/app?post=${post.id}`)}`}
                             target="_blank" rel="noopener noreferrer"
                             className="block w-full py-2.5 bg-[#1DA1F2] hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase text-white transition-all text-center"
                           >
                             Post to X
                           </a>
                         </div>
                      </div>
                    )}
                 </div>
              </div>

              <AnimatePresence>
                {openComments.has(post.id) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <CommentSection postId={post.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {posts.length === 0 && (
            <div className="p-12 bg-zinc-950 border border-dashed border-white/10 rounded-2xl text-center">
              <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-lg font-black italic uppercase text-white tracking-tighter mb-1">Silence in the Cage.</p>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Be the first to leave a mark on the feed.</p>
            </div>
          )}
        </div>

        {/* Quick News Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-16 pb-8">
          <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Official Notice</p>
            <p className="text-sm font-black italic mt-2 text-white uppercase tracking-tight">Bellator Open Tryouts in Austin, TX - Aug 24</p>
          </div>
          <div className="p-5 bg-zinc-950 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-[#E31837] uppercase font-black tracking-widest">Fighter Move</p>
            <p className="text-sm font-black italic mt-2 text-white uppercase tracking-tight">Marcus 'Apex' Chen signs with Agent X Pro</p>
          </div>
        </div>
      </div>
    </div>
    )}
  </section>

      {/* Side Profile/Navigator - Desktop only */}
      <aside className="w-80 flex-col p-8 space-y-10 bg-[#0c0c0c] hidden lg:flex shrink-0 overflow-y-auto border-l border-white/5 scrollbar-hide">
        {userProfile && (
          <div className="relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-[#E31837] to-red-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
             <div className="relative bg-zinc-900 border border-white/10 p-6 rounded-2xl">
                <div className="flex items-center gap-5 mb-6">
                   <img 
                     src={userProfile.profileImageUrl || `https://ui-avatars.com/api/?name=${userProfile.displayName}&background=000&color=fff`} 
                     className="w-16 h-16 rounded-full border-2 border-[#E31837] object-cover shadow-xl shadow-red-900/20" 
                     alt="" 
                   />
                   <div className="overflow-hidden">
                      <h3 className="text-base font-black uppercase italic text-white truncate leading-tight tracking-tighter">{userProfile.displayName}</h3>
                      <p className="text-[10px] text-[#E31837] font-black uppercase tracking-widest mt-0.5">{userProfile.role}</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Record</p>
                      <p className="text-sm font-black text-white italic">{userProfile.record || '--'}</p>
                   </div>
                   <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Status</p>
                      <p className="text-xs font-black text-green-500 uppercase">Active</p>
                   </div>
                </div>

                <Link to="/app/career" className="block w-full py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest text-center rounded-xl hover:bg-zinc-200 transition-all shadow-xl">
                  Refine Persona
                </Link>
             </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-6 flex items-center gap-2">
            <span className="w-6 h-px bg-zinc-800"></span>
            Career Mastery
          </h3>
          <div className="space-y-6">
            {[
              { label: 'AMATEUR CIRCUIT', progress: 100, status: 'COMPLETED', color: 'bg-zinc-500' },
              { label: 'SEMI-PRO ROSTER', progress: 45, status: 'IN PROGRESS', color: 'bg-[#E31837]' },
              { label: 'PRO LEGACY', progress: 0, status: 'LOCKED', color: 'bg-zinc-800', locked: true }
            ].map((tier, i) => (
              <div key={i} className={`relative ${tier.locked ? 'opacity-20' : ''}`}>
                 <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-black italic text-white tracking-tighter uppercase">{tier.label}</span>
                    <span className={`text-[9px] font-black ${tier.status === 'COMPLETED' ? 'text-zinc-500' : 'text-[#E31837]'} uppercase tracking-widest`}>{tier.status}</span>
                 </div>
                 <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                    <div className={`h-full ${tier.color} transition-all duration-1000`} style={{ width: `${tier.progress}%` }}></div>
                 </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest mb-6 flex items-center gap-2">
             <span className="w-6 h-px bg-zinc-800"></span>
             Combat Map
          </h3>
          <div className="space-y-4">
             {[
               { event: 'UFC 305: Pantoja vs Erceg', loc: 'Perth, Australia', date: '05.04' },
               { event: 'PFL 4: Regular Season', loc: 'Uncasville, CT', date: '06.13' }
             ].map((evt, i) => (
               <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/30 border border-white/5 rounded-2xl hover:border-zinc-700 hover:bg-zinc-900/50 transition-all cursor-pointer group/item">
                  <div>
                    <p className="text-xs font-black text-white italic group-hover/item:text-[#E31837] transition-colors">{evt.event}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{evt.loc}</p>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 group-hover/item:text-white transition-colors">{evt.date}</span>
               </div>
             ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function CommentSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now())
      } as Comment));
      setComments(commentsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `posts/${postId}/comments`, auth);
    });
    return unsubscribe;
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userProfile || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        authorId: auth.currentUser.uid,
        authorName: userProfile.displayName,
        authorImage: userProfile.profileImageUrl || '',
        content: newComment,
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, `posts/${postId}/comments`, auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-white/5 pt-4 animate-in slide-in-from-top-2 duration-300">
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-3 items-start group/comment">
            <img src={comment.authorImage || `https://ui-avatars.com/api/?name=${comment.authorName}&background=000&color=fff`} className="w-8 h-8 rounded-full border border-white/10" alt="" />
            <div className="flex-1 bg-zinc-900/50 p-3 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black text-white uppercase italic">{comment.authorName}</span>
                <span className="text-[8px] text-zinc-600 font-bold uppercase">{formatDistanceToNow(comment.createdAt)} ago</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest text-center py-4">No analysis yet. Be the first.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 items-center">
        <input 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add your take..."
          className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:border-[#E31837] outline-none"
        />
        <button 
          disabled={!newComment.trim() || isSubmitting}
          className="bg-[#E31837] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase italic disabled:opacity-50"
        >
          {isSubmitting ? '...' : 'Post'}
        </button>
      </form>
    </div>
  );
}
