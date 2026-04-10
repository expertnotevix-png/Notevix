import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter, UserProfile } from '../types';
import { Bookmark, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdBanner } from '../components/AdBanner';

interface SavedProps {
  user: UserProfile;
}

export default function Saved({ user }: SavedProps) {
  const [savedChapters, setSavedChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSaved = async () => {
      if (user.savedNotes.length === 0) {
        setSavedChapters([]);
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'chapters'), where(documentId(), 'in', user.savedNotes));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
      setSavedChapters(data);
      setLoading(false);
    };

    fetchSaved();
  }, [user.savedNotes]);

  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Saved Notes</h1>
        <p className="text-gray-500 text-sm">Your personal study collection.</p>
      </div>

      <AdBanner slot="saved_banner" />

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : savedChapters.length > 0 ? (
          savedChapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => navigate(`/note/${chapter.id}`)}
              className="w-full glass-card p-5 rounded-3xl flex items-center gap-4 text-left group"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-lg">{chapter.title}</h4>
                <p className="text-sm text-gray-500">{chapter.subject} • Class {chapter.class}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
            </button>
          ))
        ) : (
          <div className="text-center py-20 space-y-6">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Bookmark className="w-10 h-10 text-gray-700" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-xl">No saved notes</h3>
              <p className="text-gray-500 text-sm max-w-[200px] mx-auto">
                Bookmark chapters to access them quickly later.
              </p>
            </div>
            <button
              onClick={() => navigate('/explore')}
              className="purple-gradient px-8 py-3 rounded-2xl font-bold shadow-lg shadow-purple-500/20"
            >
              Browse Chapters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
