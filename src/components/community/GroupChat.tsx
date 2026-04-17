import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Smile, Info, ChevronLeft, MapPin, Sparkles, Hash } from 'lucide-react';
import { UserProfile } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface GroupMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  timestamp: any;
}

export default function GroupChat({ 
  user, 
  group, 
  onBack 
}: { 
  user: UserProfile | null, 
  group: any,
  onBack: () => void 
}) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    if (!group?.id) return;
    
    // Performance Optimization: Fetch LATEST messages
    const q = query(
      collection(db, 'study_groups', group.id, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GroupMessage[];
      // Reverse to show oldest at top for natural chat flow
      setMessages([...msgs].reverse());
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => {
      console.error("Group chat listener error:", error);
    });

    return () => unsubscribe();
  }, [group?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || !group) return;

    const messageData = {
      groupId: group.id,
      userId: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL || '',
      text: newMessage.trim(),
      timestamp: serverTimestamp()
    };

    setNewMessage('');
    setShowEmoji(false);
    
    try {
      await addDoc(collection(db, 'study_groups', group.id, 'messages'), messageData);
    } catch (err) {
      console.error("Send message error:", err);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black relative">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Hash size={14} className="text-purple-500" />
              <h2 className="font-black text-sm uppercase tracking-tight italic">{group.name}</h2>
            </div>
            <div className="flex items-center gap-2 text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
              <span className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                Live Chat
              </span>
              <span>•</span>
              <span>{group.subject}</span>
            </div>
          </div>
        </div>
        <button className="p-2 text-gray-500 hover:text-white">
          <Info size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        <div className="text-center py-10 space-y-2 opacity-50">
          <Sparkles className="w-8 h-8 mx-auto text-purple-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Start of Study Circle #{group.name.replace(/\s+/g, '')}</p>
        </div>

        {messages.map((msg, idx) => {
          const isMe = msg.userId === user?.uid;
          const showInfo = idx === 0 || messages[idx-1].userId !== msg.userId;

          return (
            <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && showInfo && (
                <div className="w-7 h-7 rounded-xl overflow-hidden shrink-0 border border-white/10 mt-1">
                  <img src={msg.userPhoto || 'https://img.icons8.com/fluency/96/user.png'} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {!isMe && !showInfo && <div className="w-7 shrink-0" />}
              
              <div className={`max-w-[75%] space-y-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {showInfo && !isMe && (
                  <span className="text-[9px] font-bold text-gray-500 ml-1 uppercase">{msg.userName}</span>
                )}
                <div className={`p-3 px-4 rounded-2xl text-[13px] leading-relaxed break-words shadow-sm ${
                  isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/5 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
                {showInfo && isMe && (
                  <span className="text-[8px] text-gray-600 block text-right pr-1">
                    {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'just now'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black/50 border-t border-white/5 relative">
        {showEmoji && (
          <div className="absolute bottom-full left-0 right-0 z-30 mb-2">
             <div className="flex justify-end p-2 bg-black/80 backdrop-blur-sm border-t border-white/5">
                <button onClick={() => setShowEmoji(false)} className="text-[10px] font-bold uppercase tracking-widest text-red-500 p-2">Close Emojis</button>
             </div>
             <EmojiPicker 
               onEmojiClick={onEmojiClick} 
               theme={Theme.DARK} 
               width="100%" 
               height="350px"
               lazyLoadEmojis={true}
             />
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2 items-center">
          <button 
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            className={`p-3 rounded-xl transition-all ${showEmoji ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
          >
            <Smile size={20} />
          </button>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Help a friend or share a tip..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-purple-500 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="purple-gradient p-3.5 rounded-2xl text-white shadow-lg shadow-purple-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
