import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter, UserProfile } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Bookmark, Download, Share2, Info, HelpCircle, CheckCircle2, Lock, Share2 as ShareIcon, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NoteViewProps {
  user: UserProfile | null;
}

export default function NoteView({ user }: NoteViewProps) {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(user?.savedNotes.includes(noteId || '') || false);

  useEffect(() => {
    const fetchChapter = async () => {
      if (!noteId) return;
      try {
        const docRef = doc(db, 'chapters', noteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setChapter({ id: docSnap.id, ...docSnap.data() } as Chapter);
        }
      } catch (error) {
        console.error("Error fetching chapter:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChapter();
  }, [noteId]);

  const toggleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!noteId) return;
    
    // Optimistic Update
    const newIsSaved = !isSaved;
    setIsSaved(newIsSaved);

    try {
      const userRef = doc(db, 'users', user.uid);
      if (isSaved) {
        await updateDoc(userRef, { savedNotes: arrayRemove(noteId) });
      } else {
        await updateDoc(userRef, { savedNotes: arrayUnion(noteId) });
      }
    } catch (error) {
      console.error("Failed to save:", error);
      setIsSaved(!newIsSaved); // Rollback
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col p-6 space-y-6">
        <div className="flex gap-4 items-center">
          <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-3">
             <div className="h-4 w-3/4 bg-white/5 rounded-full animate-pulse" />
             <div className="h-2 w-1/4 bg-white/5 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
           <div className="h-40 w-full bg-white/5 rounded-3xl animate-pulse" />
           <div className="h-60 w-full bg-white/5 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-3xl">❓</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Note not found</h1>
          <p className="text-gray-500">This resource might have been moved or deleted.</p>
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="px-8 py-3 bg-purple-600 rounded-xl font-bold active:scale-95 transition-transform"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isPremiumLocked = chapter.isPremium && (
    !user || 
    (!user.isPremium && !user.unlockedClasses?.includes(chapter.class) && user.role !== 'admin')
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white text-gray-900 pb-32"
    >
      {/* Header */}
      <div className="bg-black text-white p-6 sticky top-0 z-40 shadow-xl shadow-black/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-xl active:scale-95 transition-transform">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="max-w-[200px]">
              <h1 className="text-lg font-bold leading-tight truncate">{chapter.title}</h1>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{chapter.subject} • Class {chapter.class}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleSave} className={`p-2 rounded-xl transition-all active:scale-95 ${isSaved ? 'bg-purple-600 shadow-lg shadow-purple-600/20' : 'bg-white/10 hover:bg-white/20'}`}>
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-white' : ''}`} />
            </button>
            <button className="p-2 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-transform">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* One-Page Note Content */}
      <div className={`p-6 space-y-10 topper-note relative ${isPremiumLocked ? 'max-h-[60vh] overflow-hidden' : ''}`}>
        {isPremiumLocked && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-end pb-20 px-6 backdrop-blur-[2px]">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 glass-card p-8 rounded-[2.5rem] border-yellow-500/20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-center space-y-6 max-w-sm border"
            >
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce-subtle">
                <Lock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Topper Note Locked</h3>
                <p className="text-sm text-gray-500">Only premium members can access this Class {chapter.class} resource.</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100/50">
                <p className="text-xs font-bold text-yellow-700 uppercase tracking-[0.2em] mb-1.5">Elite Access</p>
                <p className="text-sm text-gray-700 font-medium">Get the <span className="text-yellow-700 underline underline-offset-2 decoration-2">Full Chapter Pack</span></p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => navigate('/premium-notes')}
                  className="flex-1 bg-yellow-500 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/30 active:scale-95 transition-transform text-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  UNLOCK NOW
                </button>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Summary Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 text-purple-600">
            <Sparkles className="w-5 h-5" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] m-0 border-none italic">The Gist</h2>
          </div>
          <div className="bg-purple-50 p-6 rounded-[2rem] border border-purple-100">
            <p className="text-gray-800 leading-relaxed text-lg font-medium italic">
              "{chapter.summary}"
            </p>
          </div>
        </motion.section>

        {/* Key Points */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-black uppercase tracking-[0.2em] italic border-b-2 border-black/5 pb-2">Top Insights</h2>
          <ul className="space-y-4">
            {chapter.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-4 group">
                <div className="w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg group-hover:scale-110 transition-transform">
                  <span className="text-xs font-black">{i + 1}</span>
                </div>
                <span className="text-gray-800 flex-1 leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Highlight Box / Formulas */}
        {chapter.formulas && chapter.formulas.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-600 rounded-[2.5rem] p-8 text-white space-y-6 relative overflow-hidden"
          >
            <div className="relative z-10">
              <h3 className="font-black text-lg mb-4 flex items-center gap-3 uppercase tracking-widest italic">
                <CheckCircle2 className="w-6 h-6 text-blue-300" /> Must Remember
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {chapter.formulas.map((formula, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 font-mono text-sm leading-relaxed">
                    {formula}
                  </div>
                ))}
              </div>
            </div>
            <Sparkles className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          </motion.section>
        )}

        {/* Important Questions */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8 pt-8 border-t-2 border-dashed border-gray-200"
        >
          <div className="flex items-center gap-2 text-red-600">
            <HelpCircle className="w-6 h-6" />
            <h2 className="text-lg font-black uppercase tracking-[0.2em] m-0 border-none italic">Exam Killers</h2>
          </div>
          <div className="space-y-10">
            {chapter.importantQuestions.map((item, i) => (
              <div key={i} className="space-y-4">
                <div className="flex gap-4">
                   <span className="text-2xl font-black text-gray-200">{i + 1}</span>
                   <h4 className="font-bold text-lg text-gray-900 leading-tight">
                     {item.question}
                   </h4>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 text-gray-700 leading-relaxed shadow-inner">
                  <span className="font-black text-red-600 text-[10px] uppercase tracking-widest block mb-2">Model Answer</span>
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Floating Action Bar */}
      {!isPremiumLocked && (
        <div className="fixed bottom-24 left-6 right-6 flex gap-4 z-50">
          <motion.button 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 bg-black text-white font-black py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 text-sm tracking-widest active:bg-gray-900 uppercase"
          >
            <Download className="w-5 h-5 text-purple-400" />
            Download Guide
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
