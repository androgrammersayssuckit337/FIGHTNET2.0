import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, Send, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../firebase';
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
  updateDoc
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../utils/error';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: number;
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoomId || !currentUser) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      // Add message
      await addDoc(collection(db, 'chatRooms', selectedRoomId, 'messages'), {
        senderId: currentUser.uid,
        content,
        createdAt: serverTimestamp()
      });

      // Update room metadata
      await updateDoc(doc(db, 'chatRooms', selectedRoomId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chatRooms/${selectedRoomId}/messages`, auth);
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
        <div className="p-3 border-b border-[#222] bg-zinc-900/40">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full bg-[#0a0a0a] border border-zinc-800 p-2 pl-8 text-xs text-white focus:outline-none focus:border-[#E31837] rounded transition-all"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
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
          {!loading && rooms.length === 0 && (
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
              <div className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Transmit message..." 
                  className="w-full bg-[#050505] border border-zinc-800 p-3 pr-12 text-sm text-white focus:outline-none focus:border-[#E31837] rounded-xl transition-all"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#E31837] hover:text-white disabled:text-zinc-700 transition-colors"
                >
                  <Send className="w-5 h-5" />
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
