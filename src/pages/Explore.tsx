import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter } from '../types';
import { Search, Filter, BookOpen, Lock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdBanner } from '../components/AdBanner';

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
      const q = query(collection(db, 'chapters'));
      const querySnapshot = await getDocs(q);
      const allChapters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
      const filtered = allChapters.filter(c => 
        c.title.toLowerCase().includes(term.toLowerCase()) ||
        c.subject.toLowerCase().includes(term.toLowerCase())
      );
      setResults(filtered);
    } catch (error) {
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

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-gray-500 text-sm">Find notes by chapter or subject.</p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search chapters..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
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
        <button 
          onClick={() => handleSearch()}
          className="p-3 purple-gradient rounded-2xl shadow-lg shadow-purple-500/20 active:scale-95 transition-transform"
        >
          <Search className="w-6 h-6 text-white" />
        </button>
      </div>

      <AdBanner slot="explore_banner" />

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : results.length > 0 ? (
          results.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => navigate(`/note/${chapter.id}`)}
              className="w-full glass-card p-4 rounded-2xl flex items-center gap-4 text-left"
            >
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm">{chapter.title}</h4>
                <p className="text-xs text-gray-500">{chapter.subject} • Class {chapter.class}</p>
              </div>
              {chapter.isPremium && <Lock className="w-4 h-4 text-yellow-500" />}
            </button>
          ))
        ) : searchTerm && !loading ? (
          <div className="text-center py-20 text-gray-500">No results found.</div>
        ) : (
          <div className="space-y-6">
            <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Trending Topics</h3>
            <div className="flex flex-wrap gap-2">
              {['Trigonometry', 'Cell Structure', 'French Revolution', 'Grammar', 'Probability'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setSearchTerm(tag); handleSearch(); }}
                  className="px-4 py-2 glass-card rounded-full text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
