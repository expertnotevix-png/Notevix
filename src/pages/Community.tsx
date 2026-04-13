import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit, doc, getDoc, updateDoc, increment, addDoc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Filter, 
  TrendingUp, 
  Clock, 
  HelpCircle,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  MoreVertical,
  Flag,
  Trash2,
  Shield,
  Users,
  Award,
  Send,
  Hash,
  Info
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile } from '../types';
import { useModeration } from '../hooks/useModeration';
import CreatePostModal from '../components/community/CreatePostModal';
import PostCard from '../components/community/PostCard';

interface CommunityStats {
  totalQuestions: number;
  totalAnswers: number;
  totalStudents: number;
  solvedToday: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  timestamp: any;
}

export default function Community({ user }: { user: UserProfile | null }) {
  const { isBanned, banReason } = useModeration(user);
  const [activeTab, setActiveTab] = useState<'chat' | 'discussions'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState<CommunityStats>({
    totalQuestions: 0,
    totalAnswers: 0,
    totalStudents: 0,
    solvedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'upvoted' | 'unanswered'>('latest');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterClass, setFilterClass] = useState<string>('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch Stats
    const statsUnsub = onSnapshot(doc(db, 'community_stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as CommunityStats);
      }
    });

    // Fetch Chat Messages
    const chatQuery = query(
      collection(db, 'community_chat'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
    const chatUnsub = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
      setMessages(msgs);
      if (activeTab === 'chat') {
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });

    // Fetch Posts
    let postsQuery = query(collection(db, 'posts'), where('status', '==', 'approved'));
    if (filterSubject !== 'All') postsQuery = query(postsQuery, where('subject', '==', filterSubject));
    if (filterClass !== 'All') postsQuery = query(postsQuery, where('class', '==', filterClass));
    if (sortBy === 'latest') postsQuery = query(postsQuery, orderBy('createdAt', 'desc'));
    else if (sortBy === 'upvoted') postsQuery = query(postsQuery, orderBy('upvotesCount', 'desc'));

    const postsUnsub = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPosts(postsData);
      setLoading(false);
    });

    return () => {
      statsUnsub();
      chatUnsub();
      postsUnsub();
    };
  }, [sortBy, filterSubject, filterClass, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || isBanned) return;

    const messageData = {
      userId: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      content: newMessage.trim(),
      timestamp: serverTimestamp()
    };

    setNewMessage('');
    try {
      await addDoc(collection(db, 'community_chat'), messageData);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/20 to-black border-b border-white/10 pt-6 pb-2 px-4 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                NoteVix Community
              </h1>
              <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase tracking-widest font-bold mt-1">
                <Users size={12} />
                <span>{stats.totalStudents} Students Online</span>
              </div>
            </div>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'chat' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                Group Chat
              </button>
              <button
                onClick={() => setActiveTab('discussions')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'discussions' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
              >
                Discussions
              </button>
            </div>
          </div>

          {isBanned && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-3 text-red-400 text-[10px] mb-2">
              <Shield size={14} className="shrink-0" />
              <p><b>Banned:</b> {banReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col p-4 space-y-4">
              <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-2xl text-center space-y-2 mb-4">
                <Info size={20} className="mx-auto text-purple-400" />
                <h3 className="text-sm font-bold">Welcome to Global Chat!</h3>
                <p className="text-xs text-gray-400">Discuss study problems, share tips, and help each other. Keep it respectful or you'll be banned! 🚫</p>
              </div>

              {messages.map((msg, idx) => (
                <div key={msg.id} className={`flex gap-3 ${msg.userId === user?.uid ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <img src={msg.userPhoto || 'https://img.icons8.com/fluency/96/user.png'} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className={`max-w-[80%] space-y-1 ${msg.userId === user?.uid ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold text-gray-400">{msg.userName}</span>
                      <span className="text-[8px] text-gray-600">
                        {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl text-sm ${msg.userId === user?.uid ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 rounded-tl-none'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Search & Filters for Discussions */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                  <select value={sortBy} onChange={(e: any) => setSortBy(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider focus:outline-none">
                    <option value="latest">Latest</option>
                    <option value="upvoted">Upvoted</option>
                  </select>
                  <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider focus:outline-none">
                    <option value="All">All Subjects</option>
                    <option value="Science">Science</option>
                    <option value="Maths">Maths</option>
                    <option value="SST">SST</option>
                  </select>
                </div>
              </div>

              {/* Posts List */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />)}
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="space-y-4">
                  {filteredPosts.map(post => <PostCard key={post.id} post={post} currentUser={user} />)}
                </div>
              ) : (
                <div className="text-center py-20">
                  <MessageSquare size={40} className="text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-400">No discussions found</h3>
                  <button onClick={() => setIsCreateModalOpen(true)} className="mt-4 text-purple-400 text-sm font-bold hover:underline">Start a new one</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Input Area */}
      <div className="bg-black border-t border-white/10 p-4 shrink-0 pb-24 md:pb-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'chat' ? (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isBanned ? "You are banned from chatting" : "Type a message..."}
                disabled={isBanned || !user}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isBanned || !user}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-500/20"
              >
                <Send size={20} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => !isBanned && setIsCreateModalOpen(true)}
              disabled={isBanned || !user}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Ask a Question
            </button>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreatePostModal 
            isOpen={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
            user={user!} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

