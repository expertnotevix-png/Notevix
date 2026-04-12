import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit, doc, getDoc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
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
  Award
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

export default function Community({ user }: { user: UserProfile | null }) {
  const { isBanned, banReason } = useModeration(user);
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

  useEffect(() => {
    // Fetch Stats
    const statsUnsub = onSnapshot(doc(db, 'community_stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as CommunityStats);
      }
    });

    // Fetch Posts
    let postsQuery = query(collection(db, 'posts'), where('status', '==', 'approved'));

    if (filterSubject !== 'All') {
      postsQuery = query(postsQuery, where('subject', '==', filterSubject));
    }
    if (filterClass !== 'All') {
      postsQuery = query(postsQuery, where('class', '==', filterClass));
    }

    if (sortBy === 'latest') {
      postsQuery = query(postsQuery, orderBy('createdAt', 'desc'));
    } else if (sortBy === 'upvoted') {
      postsQuery = query(postsQuery, orderBy('upvotesCount', 'desc'));
    } else if (sortBy === 'unanswered') {
      postsQuery = query(postsQuery, where('replyCount', '==', 0), orderBy('createdAt', 'desc'));
    }

    const postsUnsub = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      setLoading(false);
    });

    return () => {
      statsUnsub();
      postsUnsub();
    };
  }, [sortBy, filterSubject, filterClass]);

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-purple-900/20 to-black border-b border-white/10 pt-8 pb-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Student Community
              </h1>
              <p className="text-gray-400 text-sm mt-1">Discuss, Learn, and Grow together 🎯</p>
            </div>
            {user && (
              <button
                onClick={() => !isBanned && setIsCreateModalOpen(true)}
                disabled={isBanned}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg ${
                  isBanned 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20 active:scale-95'
                }`}
              >
                {isBanned ? <Shield size={20} /> : <Plus size={20} />}
                {isBanned ? 'Account Banned' : 'Ask Question'}
              </button>
            )}
          </div>

          {isBanned && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-400 text-sm mb-6">
              <Shield size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Access Restricted</p>
                <p className="opacity-80">{banReason}. You cannot create posts or reply until the ban is lifted.</p>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard icon={<HelpCircle size={18} />} label="Questions" value={stats.totalQuestions} color="blue" />
            <StatCard icon={<MessageSquare size={18} />} label="Answers" value={stats.totalAnswers} color="green" />
            <StatCard icon={<Users size={18} />} label="Students" value={stats.totalStudents} color="purple" />
            <StatCard icon={<Award size={18} />} label="Solved Today" value={stats.solvedToday} color="orange" />
          </div>

          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              <Filter size={18} className="text-gray-500 shrink-0" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="latest">Latest</option>
                <option value="upvoted">Most Upvoted</option>
                <option value="unanswered">Unanswered</option>
              </select>

              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="All">All Subjects</option>
                <option value="Science">Science</option>
                <option value="Maths">Maths</option>
                <option value="SST">SST</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              >
                <option value="All">All Classes</option>
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map(post => (
              <PostCard key={post.id} post={post} currentUser={user} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={40} className="text-gray-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">Pehla sawaal poochho! 🎯</h3>
            <p className="text-gray-500 mt-2">Be the first one to start a discussion in the community.</p>
            {user && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-6 py-2 rounded-xl border border-purple-500/30 transition-all"
              >
                Start Discussion
              </button>
            )}
          </div>
        )}
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

function StatCard({ icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  const colors: any = {
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-green-400 bg-green-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    orange: 'text-orange-400 bg-orange-400/10'
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold leading-none">{value.toLocaleString()}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{label}</div>
      </div>
    </div>
  );
}
