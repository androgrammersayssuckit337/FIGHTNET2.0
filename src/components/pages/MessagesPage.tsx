import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, Send, ShieldAlert, Paperclip, X, FileVideo, FileImage, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth, storage } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: number;
  mediaUrl?: string;
  mediaType?: string;
}

interface ChatRoom {
  id: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageAt?: number;
  otherUser?: {
    displayName: string;
    profileImageUrl: string;
    id: string;
  };
}

export function MessagesPage() {
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, displayName: string, profileImageUrl?: string, role: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, previewUrl]);

  // Listen for Chat Rooms
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chatRooms'), 
      where('participantIds', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageAt: doc.data().lastMessageAt?.toMillis ? doc.data().lastMessageAt.toMillis() : doc.data().lastMessageAt
      } as ChatRoom));

      // Hydrate other user info
      const hydratedRooms = await Promise.all(roomsData.map(async (room) => {
        const otherUserId = room.participantIds.find(id => id !== currentUser.uid);
        if (otherUserId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...room,
                otherUser: {
                  id: otherUserId,
                  displayName: userData.displayName,
                  profileImageUrl: userData.profileImageUrl
                }
              };
            }
          } catch (e) {
            console.error("Failed to fetch participant info", e);
          }
        }
        return room;
      }));

      setRooms(hydratedRooms);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chatRooms', auth);
    });

    return unsubscribe;
  }, [currentUser]);

  // Listen for Messages in selected room
  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatRooms', selectedRoomId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis ? doc.data().createdAt.toMillis() : (doc.data().createdAt || Date.now())
      } as Message));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chatRooms/${selectedRoomId}/messages`, auth);
    });

    return unsubscribe;
  }, [selectedRoomId]);

  // Handle user search
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchUsers = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          where('displayName', '>=', searchQuery),
          where('displayName', '<=', searchQuery + '\uf8ff')
        );
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string, displayName: string, profileImageUrl?: string, role: string }));
        // Filter out current user
        setSearchResults(users.filter(u => u.id !== currentUser?.uid));
      } catch (error) {
        console.error("Error searching users", error);
      } finally {
        setIsSearching(false);
      }
    };
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUser]);

  const handleStartChat = async (userId: string) => {
    // Check if a room already exists with this user
    const existingRoom = rooms.find(r => r.participantIds.includes(userId));
    if (existingRoom) {
      setSelectedRoomId(existingRoom.id);
    } else {
      // Create new room
      if (!currentUser) return;
      try {
        const newRoomRef = await addDoc(collection(db, 'chatRooms'), {
          participantIds: [currentUser.uid, userId],
          updatedAt: serverTimestamp()
        });
        setSelectedRoomId(newRoomRef.id);
      } catch (error) {
        console.error("Error creating chat room", error);
        handleFirestoreError(error, OperationType.CREATE, 'chatRooms', auth);
      }
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileError(null);

      // 50MB Limit
      const MAX_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setFileError('Payload exceeds 50MB security threshold');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      setSelectedFile(file);
      
      const fileReader = new FileReader();
      fileReader.onload = (event) => {
        if (event.target?.result) {
          setPreviewUrl(event.target.result as string);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error("No user");
    
    // Explicit size check
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      throw new Error('FILE_TOO_LARGE');
    }

    return new Promise((resolve, reject) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `chatMedia/${currentUser.uid}/${selectedRoomId}/${Date.now()}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      
      const metadata = {
        contentType: file.type,
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload failed", error);
          alert(`Upload failed: ${error.message}`);
          reject(error);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedRoomId || !currentUser || isSubmitting || fileError) return;

    setIsSubmitting(true);
    const content = newMessage.trim();
    const currentSelectedFile = selectedFile;
    
    try {
      let mediaUrl = '';
      if (currentSelectedFile) {
        mediaUrl = await handleFileUpload(currentSelectedFile);
      }

      const mediaType = currentSelectedFile ? (currentSelectedFile.type.startsWith('video') ? 'video' : 'image') : '';

      // Reset UI state after successful upload (or if no file)
      setNewMessage('');
      removeFile();
      setUploadProgress(0);

      // Add message
      await addDoc(collection(db, 'chatRooms', selectedRoomId, 'messages'), {
        senderId: currentUser.uid,
        content,
        ...(mediaUrl && { mediaUrl, mediaType }),
        createdAt: serverTimestamp()
      });

      // Update room metadata
      await updateDoc(doc(db, 'chatRooms', selectedRoomId), {
        lastMessage: content || (mediaType === 'video' ? 'Sent a video' : 'Sent an image'),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error: unknown) {
      if ((error as Error).message === 'FILE_TOO_LARGE') {
        alert('Transmission failed: File exceeds 50MB limit.');
      } else {
        handleFirestoreError(error, OperationType.CREATE, `chatRooms/${selectedRoomId}/messages`, auth);
      }
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  return (
    <div className="flex bg-[#0c0c0c] border border-zinc-800 rounded-lg h-[calc(100vh-120px)] md:h-[calc(100vh-64px)] overflow-hidden m-4 md:m-6">
      {/* Chat List */}
      <div className={`w-full md:w-80 border-r border-[#222] flex flex-col flex-shrink-0 bg-[#0a0a0a] ${selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h2 className="text-lg font-black uppercase text-white tracking-tighter italic">Secure Comms</h2>
          <button className="text-zinc-500 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
        </div>
        <div className="p-3 border-b border-[#222] bg-zinc-900/40 relative">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-zinc-800 p-2 pl-8 pr-8 text-xs text-white focus:outline-none focus:border-[#E31837] rounded transition-all"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {searchQuery ? (
            <div className="p-2">
              {isSearching ? (
                <div className="text-center p-4 text-zinc-500 text-xs text-bold uppercase tracking-widest">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(user => (
                  <div 
                    key={user.id}
                    onClick={() => handleStartChat(user.id)}
                    className="p-3 mb-1 border border-transparent hover:border-zinc-800 rounded-lg cursor-pointer flex items-center gap-3 group transition-colors"
                  >
                    <img 
                      src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.displayName || 'Unknown'}&background=222&color=fff`} 
                      alt="" 
                      className="w-8 h-8 rounded-full border border-zinc-700" 
                    />
                    <div>
                      <h3 className="font-bold text-sm text-white tracking-tight">{user.displayName}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{user.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-4 text-zinc-500 text-xs">No users found for "{searchQuery}"</div>
              )}
            </div>
          ) : loading ? (
             <div className="p-8 text-center animate-pulse">
               <div className="w-8 h-8 bg-zinc-800 rounded-full mx-auto mb-2"></div>
               <div className="h-2 w-20 bg-zinc-800 mx-auto rounded"></div>
             </div>
          ) : rooms.map(room => (
            <div 
              key={room.id} 
              onClick={() => setSelectedRoomId(room.id)}
              className={`p-4 border-b border-[#222] hover:bg-zinc-900/50 cursor-pointer flex items-center gap-3 group transition-colors ${selectedRoomId === room.id ? 'bg-zinc-900 shadow-[inset_4px_0_0_#E31837]' : ''}`}
            >
              <img 
                src={room.otherUser?.profileImageUrl || `https://ui-avatars.com/api/?name=${room.otherUser?.displayName || 'Unknown'}&background=222&color=fff`} 
                alt="" 
                className="w-10 h-10 rounded-full border border-zinc-700 grayscale group-hover:grayscale-0 transition-all duration-300" 
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`font-bold text-sm tracking-tight truncate ${selectedRoomId === room.id ? 'text-white' : 'text-zinc-400'}`}>
                    {room.otherUser?.displayName || 'Unknown Participant'}
                  </h3>
                  <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                    {room.lastMessageAt ? formatDistanceToNow(room.lastMessageAt, { addSuffix: false }) : ''}
                  </span>
                </div>
                <p className={`text-xs truncate ${selectedRoomId === room.id ? 'text-zinc-300 font-medium' : 'text-zinc-600'}`}>
                  {room.lastMessage || 'No messages yet'}
                </p>
              </div>
            </div>
          ))}
          {!loading && !searchQuery && rooms.length === 0 && (
            <div className="p-8 text-center text-zinc-600">
               <p className="text-xs uppercase font-bold tracking-widest opacity-50">No comms found</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Chat Area */}
      <div className={`flex-1 flex flex-col bg-[#050505] ${!selectedRoomId ? 'hidden md:flex' : 'flex'}`}>
        {selectedRoomId && selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#0a0a0a]">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedRoomId(null)} 
                  className="md:hidden text-zinc-400 hover:text-white mr-2"
                >
                  &larr;
                </button>
                <img 
                  src={selectedRoom.otherUser?.profileImageUrl || `https://ui-avatars.com/api/?name=${selectedRoom.otherUser?.displayName || 'Unknown'}&background=222&color=fff`} 
                  alt="" 
                  className="w-8 h-8 rounded-full border border-zinc-800" 
                />
                <div>
                  <h3 className="text-sm font-black uppercase italic text-white tracking-tighter">
                    {selectedRoom.otherUser?.displayName}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Secure Channel</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
                    <ShieldAlert className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
              {messages.map((msg, i) => {
                const isMine = msg.senderId === currentUser?.uid;
                const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={`flex items-end gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && (
                      <div className="w-6 h-6 flex-shrink-0">
                        {showAvatar && (
                          <img 
                            src={selectedRoom.otherUser?.profileImageUrl || `https://ui-avatars.com/api/?name=${selectedRoom.otherUser?.displayName || 'User'}&background=222&color=fff`} 
                            alt="" 
                            className="w-6 h-6 rounded-full border border-zinc-800 grayscale" 
                          />
                        )}
                      </div>
                    )}
                    <div className={`max-w-[75%] md:max-w-[60%]`}>
                       <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                         isMine 
                          ? 'bg-[#E31837] text-white rounded-br-none shadow-[0_4px_15px_rgba(227,24,55,0.2)]' 
                          : 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-white/5 shadow-xl'
                       }`}>
                         {msg.mediaUrl && (
                           <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-sm">
                             {msg.mediaType === 'video' ? (
                               <video src={msg.mediaUrl} controls playsInline preload="metadata" className="w-full rounded-lg" />
                             ) : (
                               <img src={msg.mediaUrl} alt="" className="w-full object-cover" />
                             )}
                           </div>
                         )}
                         {msg.content}
                       </div>
                       <div className={`mt-1 text-[9px] font-bold uppercase tracking-widest text-zinc-600 ${isMine ? 'text-right' : 'text-left'}`}>
                          {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
                       </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#222] bg-[#0a0a0a]">
              {fileError && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-red-950/20 border border-red-900/30 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-400">{fileError}</p>
                  <button type="button" onClick={removeFile} className="ml-auto text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {previewUrl && !fileError && (
                 <div className="mb-4 relative max-w-sm rounded-2xl border border-white/5 bg-[#050505] overflow-hidden animate-in zoom-in-95 duration-200">
                   <div className="relative group">
                     {selectedFile?.type.startsWith('video') ? (
                       <div className="aspect-video bg-black flex items-center justify-center">
                         <video src={previewUrl} className="max-h-48 w-full" controls playsInline muted preload="metadata" />
                       </div>
                     ) : (
                       <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-contain bg-black" />
                     )}
                     <button 
                       type="button" 
                       onClick={removeFile}
                       className="absolute top-3 right-3 bg-black shadow-2xl rounded-full p-1.5 border border-white/10 text-white hover:text-[#E31837] hover:border-[#E31837]/50 transition-all z-10"
                     >
                       <X className="w-4 h-4"/>
                     </button>
                   </div>
                   
                   <div className="p-3 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       {selectedFile?.type.startsWith('video') ? <FileVideo className="w-4 h-4 text-[#E31837]" /> : <FileImage className="w-4 h-4 text-[#E31837]" />}
                       <div className="min-w-0">
                         <p className="text-[10px] text-white font-black uppercase truncate tracking-tight">{selectedFile?.name}</p>
                         <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.1em]">
                           {(selectedFile!.size / (1024 * 1024)).toFixed(2)} MB / 50 MB Security Limit
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-1 text-[8px] font-black uppercase text-green-500 tracking-widest bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                     </div>
                   </div>

                   {uploadProgress > 0 && uploadProgress < 100 && (
                     <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-900 overflow-hidden">
                       <div 
                        className="h-full bg-gradient-to-r from-[#E31837] to-[#ff4d67] shadow-[0_0_10px_#E31837] transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                       ></div>
                     </div>
                   )}
                 </div>
              )}
              <div className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute left-2 p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect}
                  className="hidden" 
                  accept="image/*,video/*"
                />
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedFile ? "Add a caption..." : "Transmit message..."} 
                  className="w-full bg-[#050505] border border-zinc-800 p-3 pl-12 pr-12 text-sm text-white focus:outline-none focus:border-[#E31837] rounded-xl transition-all disabled:opacity-50"
                  disabled={isSubmitting}
                />
                <button 
                  type="submit"
                  disabled={((!newMessage.trim() && !selectedFile) || isSubmitting || !!fileError)}
                  className="absolute right-2 p-2 text-[#E31837] hover:text-white disabled:text-zinc-700 transition-colors"
                >
                   {isSubmitting ? (
                     <div className="w-5 h-5 border-2 border-[#E31837] border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <Send className="w-5 h-5" />
                   )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 select-none p-10 text-center">
            <div className="text-6xl mb-4 font-black italic tracking-tighter opacity-5 text-[#E31837]">FIGHTNET SECURE COMMS</div>
            <p className="text-xs uppercase tracking-[0.25em] font-black italic text-zinc-600 mb-2">Initialize Communication Sequence</p>
            <p className="max-w-xs text-[10px] uppercase font-bold text-zinc-800 font-mono">End-to-end encrypted channel for athletes, coaches, and agents.</p>
          </div>
        )}
      </div>
    </div>
  );
}
