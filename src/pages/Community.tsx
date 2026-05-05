import { useState, useEffect, useRef } from 'react';
import { dataBridge } from '../services/dataBridge';
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
  Info,
  Smile,
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';
import { useModeration } from '../hooks/useModeration';
import CreatePostModal from '../components/community/CreatePostModal';
import PostCard from '../components/community/PostCard';
import StudyGroupList from '../components/community/StudyGroupList';
import GroupChat from '../components/community/GroupChat';
import EmojiPicker, { Theme } from 'emoji-picker-react';

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

const CACHED_STATS_KEY = 'notevix_community_stats';
const CACHED_POSTS_KEY = 'notevix_community_posts';

export default function Community({ user }: { user: UserProfile | null }) {
  const navigate = useNavigate();
  const { isBanned, banReason } = useModeration(user);
  const [activeTab, setActiveTab] = useState<'chat' | 'discussions' | 'groups'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
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
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [isLiveChat, setIsLiveChat] = useState(true); 

  // Helpers for Smart Scroll
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior });
    }
  };

  const isNearBottom = () => {
    if (!listRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    return scrollHeight - scrollTop - clientHeight < 150;
  };

  // 1. Fetch Stats - Only once on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsData = await dataBridge.getCommunityStats();
        if (statsData) {
          setStats(statsData);
          localStorage.setItem(CACHED_STATS_KEY, JSON.stringify(statsData));
        }
      } catch (error) {
        console.error("Fetch stats error:", error);
        const cached = localStorage.getItem(CACHED_STATS_KEY);
        if (cached) setStats(JSON.parse(cached));
      }
    };
    fetchStats();
  }, []);

  // 2. Fetch Global Chat Messages
  const fetchMessagesManual = async () => {
    try {
      const msgs = await dataBridge.getChatMessages(50);
      setMessages(msgs);
      setTimeout(() => scrollToBottom('auto'), 50);
    } catch (error) {
      console.error("Fetch chat error:", error);
    }
  };

  useEffect(() => {
    if (activeTab !== 'chat') return;
    fetchMessagesManual();

    // Set up real-time subscription for chat
    let channel: any = null;
    if (isLiveChat) {
      import('../lib/supabase').then(({ supabase }) => {
        if (!supabase) return;
        channel = supabase
          .channel('public:community_chat')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_chat' }, (payload) => {
             // Handle new message
             const newMsg = payload.new;
             // Need profile data for the new message
             fetchMessagesManual(); // Simplest way to get the joined data
          })
          .subscribe();
      });
    }

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [activeTab, isLiveChat]);

  // 3. Fetch Posts - Handle filters
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const postsData = await dataBridge.getPosts(50, filterSubject, filterClass, sortBy);
        setPosts(postsData);
        localStorage.setItem(CACHED_POSTS_KEY, JSON.stringify(postsData));
      } catch (error: any) {
        console.error("Supabase migration: Failed to fetch posts:", error);
        const cached = localStorage.getItem(CACHED_POSTS_KEY);
        if (cached) setPosts(JSON.parse(cached));
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();

    // Real-time for posts
    let postChannel: any = null;
    import('../lib/supabase').then(({ supabase }) => {
      if (!supabase) return;
      postChannel = supabase
        .channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          fetchPosts(); 
        })
        .subscribe();
    });

    return () => {
      if (postChannel) postChannel.unsubscribe();
    };

  }, [sortBy, filterSubject, filterClass]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || isBanned) return;

    const tempId = 'temp-' + Date.now();
    const messageContent = newMessage.trim();
    
    const optimisticMessage = {
      id: tempId,
      userId: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL,
      content: messageContent,
      timestamp: null,
      status: 'sending'
    };

    setPendingMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setShowEmoji(false);
    
    // Always scroll to bottom when user sends a message
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const saved = await dataBridge.sendChatMessage(user.uid, messageContent);
      if (saved) {
        // Success handled by pulling latest? 
        // In this simple manual mode, we just fetch again or add locally
        setMessages(prev => [...prev, {
          ...saved,
          id: saved.id,
          userId: user.uid,
          userName: user.displayName,
          userPhoto: user.photoURL,
          content: messageContent,
          timestamp: saved.created_at
        }]);
        setPendingMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Mark as error in local state
      setPendingMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'error' } : m));
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col h-screen overflow-hidden">
      {/* Header */}
      {!selectedGroup && (
        <div className="bg-gradient-to-b from-purple-900/20 to-black border-b border-white/10 pt-6 pb-2 px-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent italic">
                  NoteVix Connect
                </h1>
                <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase tracking-widest font-bold mt-1">
                  <Users size={12} className="text-purple-500" />
                  <span>{stats.totalStudents} Peers Learning</span>
                </div>
              </div>
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-[60%]">
                <button
                  onClick={() => setActiveTab('groups')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'groups' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Study Circles
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'chat' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Global
                </button>
                <button
                  onClick={() => setActiveTab('discussions')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'discussions' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Q&A
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
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        <AnimatePresence mode="wait">
          {selectedGroup ? (
            <motion.div
              key="group-chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full"
            >
              <GroupChat 
                user={user} 
                group={selectedGroup} 
                onBack={() => setSelectedGroup(null)} 
              />
            </motion.div>
          ) : (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto h-full flex flex-col w-full relative"
            >
              {activeTab === 'groups' && (
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <StudyGroupList user={user} onSelectGroup={setSelectedGroup} />
                </div>
              )}
              
              {activeTab === 'chat' && (
                <div 
                  ref={listRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
                >
                  <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-3xl space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest italic">Study Stream</h3>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                           onClick={() => fetchMessagesManual()}
                           className="p-1 px-2 hover:bg-white/5 rounded text-[8px] font-bold uppercase tracking-widest text-gray-500"
                         >
                           Refresh
                         </button>
                         <div className="flex items-center gap-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            <span className="text-[8px] font-bold text-gray-500">LIVE</span>
                            <button 
                              onClick={() => setIsLiveChat(!isLiveChat)}
                              className={`w-6 h-3 rounded-full relative transition-colors ${isLiveChat ? 'bg-purple-600' : 'bg-gray-700'}`}
                            >
                               <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${isLiveChat ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                         </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 leading-tight">Public beam for quick questions. {isLiveChat ? 'Stream is live!' : 'Refresh to see latest.'}</p>
                  </div>

                  <AnimatePresence initial={false}>
                    {[...messages, ...pendingMessages].map((msg, idx, arr) => {
                      const isMe = msg.userId === user?.uid;
                      const showAvatar = idx === 0 || arr[idx - 1].userId !== msg.userId;

                      return (
                        <motion.div 
                          key={msg.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} ${!showAvatar ? 'mt-[-12px]' : 'mt-4'}`}
                        >
                          <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10 bg-white/5 ${!showAvatar ? 'opacity-0' : ''}`}>
                            <img 
                              src={msg.userPhoto || 'https://img.icons8.com/fluency/96/user.png'} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          </div>
                          <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : ''}`}>
                            {showAvatar && (
                              <div className={`flex items-center gap-2 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[9px] font-bold text-gray-500">{msg.userName}</span>
                                <span className="text-[7px] text-gray-600 uppercase">
                                  {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : msg.status === 'sending' ? 'sending...' : 'just now'}
                                </span>
                              </div>
                            )}
                            <div className={`p-3 rounded-2xl text-sm leading-relaxed relative ${
                              isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 rounded-tl-none'
                            } ${msg.status === 'sending' ? 'opacity-70 animate-pulse' : ''} ${msg.status === 'error' ? 'border-red-500/50 text-red-200' : ''}`}>
                              {msg.content}
                              {msg.status === 'error' && (
                                <button 
                                  onClick={() => handleSendMessage({ preventDefault: () => {} } as any)}
                                  className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-red-500 hover:scale-110 transition-transform"
                                >
                                  <Clock size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={scrollRef} className="h-4" />
                </div>
              )}

              {activeTab === 'discussions' && (
                <div className="p-4 space-y-6">
                  {/* Search & Filters for Discussions */}
                  <div className="space-y-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input
                        type="text"
                        placeholder="Search questions asked by peers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                        <button onClick={() => setSortBy('latest')} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${sortBy === 'latest' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>Latest</button>
                        <button onClick={() => setSortBy('upvoted')} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${sortBy === 'upvoted' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}>Trending</button>
                      </div>
                      <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[9px] font-bold uppercase tracking-widest focus:outline-none">
                        <option value="All">All Subjects</option>
                        <option value="Science">Science</option>
                        <option value="Maths">Maths</option>
                        <option value="SST">SST</option>
                      </select>
                    </div>
                  </div>

                  {/* Posts List */}
                  {loading ? (
                    <div className="grid grid-cols-1 gap-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
                            <div className="space-y-2">
                              <div className="h-2 w-24 bg-white/10 rounded animate-pulse" />
                              <div className="h-2 w-16 bg-white/10 rounded animate-pulse" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                            <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredPosts.length > 0 ? (
                    <div className="space-y-4">
                      {filteredPosts.map(post => <PostCard key={post.id} post={post} currentUser={user} />)}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                      <MessageSquare size={40} className="text-gray-700 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-400">No discussions yet</h3>
                      <p className="text-xs text-gray-600 mt-1">Be the study leader and ask the first question!</p>
                      <button onClick={() => setIsCreateModalOpen(true)} className="mt-6 px-8 py-3 bg-purple-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-purple-700 transition-all active:scale-95">Start Discussion</button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Input Area */}
      {!selectedGroup && (
        <div className="bg-black/80 backdrop-blur-xl border-t border-white/5 p-4 shrink-0 pb-24 md:pb-6 z-20 overflow-visible">
          <div className="max-w-4xl mx-auto relative h-full">
            {!user ? (
               <div className="bg-purple-600/10 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                 <div className="space-y-1">
                   <h4 className="font-bold text-sm">Join the Conversation</h4>
                   <p className="text-[10px] text-gray-500">Sign in to ask questions, chat with peers, and join groups.</p>
                 </div>
                 <button 
                   onClick={() => navigate('/login')}
                   className="purple-gradient px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20"
                 >
                   Sign In
                 </button>
               </div>
            ) : activeTab === 'chat' ? (
              <div className="relative">
                {showEmoji && (
                  <div className="absolute bottom-full left-0 right-0 z-30 mb-2">
                    <div className="flex justify-end p-2 bg-black/90 border-t border-white/10 rounded-t-3xl">
                       <button onClick={() => setShowEmoji(false)} className="text-[10px] font-bold uppercase text-red-500 p-2">Close</button>
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
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                  <button 
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={`p-3 rounded-xl transition-all ${showEmoji ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                  >
                    <Smile size={20} />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isBanned ? "Chat disabled" : "Type something..."}
                    disabled={isBanned || !user}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-purple-500 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isBanned || !user}
                    className="purple-gradient p-4 rounded-2xl text-white shadow-xl shadow-purple-500/30 active:scale-95 transition-transform disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </form>
              </div>
            ) : activeTab === 'discussions' ? (
              <button
                onClick={() => !isBanned && setIsCreateModalOpen(true)}
                disabled={isBanned || !user}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-purple-500/30 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Plus size={24} />
                Ask Question
              </button>
            ) : (
              <div className="py-2 text-center">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">Select a circle to start chatting</p>
              </div>
            )}
          </div>
        </div>
      )}

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

