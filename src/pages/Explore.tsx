import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Chapter } from '../types';
import { Search, Filter, BookOpen, Lock, X, Sparkles, GraduationCap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (term: string = searchTerm) => {
    if (!term.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, 'chapters'), limit(30));
      const querySnapshot = await getDocs(q);
      const allChapters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
      const filtered = allChapters.filter(c => 
        c.title.toLowerCase().includes(term.toLowerCase()) ||
        c.subject.toLowerCase().includes(term.toLowerCase())
      );
      setResults(filtered);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'chapters');
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        handleSearch(searchTerm);
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const classes = [
    { id: '8', name: 'Class 8', color: 'from-blue-500/20 to-cyan-500/20', icon: '8️⃣', desc: 'Fundamentals' },
    { id: '9', name: 'Class 9', color: 'from-purple-500/20 to-pink-500/20', icon: '9️⃣', desc: 'Board Foundation' },
    { id: '10', name: 'Class 10', color: 'from-orange-500/20 to-red-500/20', icon: '🔟', desc: 'Board Exams' }
  ];

  return (
    <div className="p-6 space-y-8 pb-32">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-black bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent italic">
          Library
        </h1>
        <p className="text-gray-500 text-[10px] font-bold tracking-[0.2em] uppercase">Search across all subjects</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex gap-2"
      >
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-500 transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for questions or topics..."
            className="w-full bg-white/5 border border-white/10 rounded-3xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all focus:ring-4 focus:ring-purple-500/5"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </motion.div>

      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
             {[1, 2, 3, 4].map(i => (
               <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
             ))}
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-2">Search Results</h3>
            <AnimatePresence mode="popLayout">
              {results.map((chapter, idx) => (
                <motion.button
                  key={chapter.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/note/${chapter.id}`)}
                  className="w-full glass-card p-4 rounded-3xl flex items-center gap-4 text-left group hover:border-purple-500/30 transition-all active:scale-98"
                >
                  <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-6 h-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm tracking-tight">{chapter.title}</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                      {chapter.subject} <span className="mx-1 opacity-30">•</span> Class {chapter.class}
                    </p>
                  </div>
                  {chapter.isPremium ? (
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-yellow-500" />
                    </div>
                  ) : (
                    <ArrowRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : searchTerm && !loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10"
          >
            <Search size={40} className="text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400">No results found</h3>
            <p className="text-xs text-gray-600 mt-1 px-10">Try searching for subjects like "Science" or topics like "Trigonometry"</p>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Quick Access Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pl-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Quick Select</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {classes.map((c, idx) => (
                   <motion.button
                     key={c.id}
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     transition={{ delay: idx * 0.1 }}
                     whileTap={{ scale: 0.98 }}
                     onClick={() => navigate(`/class/${c.id}/all`)}
                     className={`p-6 rounded-[2rem] bg-gradient-to-br ${c.color} border border-white/5 text-left relative overflow-hidden group`}
                   >
                     <div className="relative z-10 flex items-center justify-between">
                       <div className="space-y-1">
                          <span className="text-3xl mb-2 block">{c.icon}</span>
                          <h4 className="font-black text-xl italic">{c.name}</h4>
                          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">{c.desc}</p>
                       </div>
                       <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                          <ArrowRight className="w-6 h-6 text-white/50 group-hover:text-white transition-colors" />
                       </div>
                     </div>
                     <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity" />
                   </motion.button>
                 ))}
              </div>
            </div>

            {/* Trending Tags */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pl-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Trending Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Trigonometry', 'Cell Structure', 'French Revolution', 'Grammar', 'Probability', 'Metals & Non-metals'].map((tag, idx) => (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 + 0.3 }}
                    key={tag}
                    onClick={() => { setSearchTerm(tag); handleSearch(tag); }}
                    className="px-5 py-3 glass-card rounded-2xl text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:border-purple-500/30 transition-all active:scale-95"
                  >
                    {tag}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
