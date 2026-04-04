import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter, UserProfile } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Bookmark, Download, Share2, Info, HelpCircle, CheckCircle2 } from 'lucide-react';

interface NoteViewProps {
  user: UserProfile;
}

export default function NoteView({ user }: NoteViewProps) {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(user.savedNotes.includes(noteId || ''));

  useEffect(() => {
    const fetchChapter = async () => {
      if (!noteId) return;
      const docRef = doc(db, 'chapters', noteId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setChapter({ id: docSnap.id, ...docSnap.data() } as Chapter);
      }
      setLoading(false);
    };

    fetchChapter();
  }, [noteId]);

  const toggleSave = async () => {
    if (!noteId) return;
    const userRef = doc(db, 'users', user.uid);
    if (isSaved) {
      await updateDoc(userRef, { savedNotes: arrayRemove(noteId) });
      setIsSaved(false);
    } else {
      await updateDoc(userRef, { savedNotes: arrayUnion(noteId) });
      setIsSaved(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">Note not found</h1>
        <button onClick={() => navigate(-1)} className="text-purple-500 font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-24">
      {/* Header */}
      <div className="bg-black text-white p-6 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-xl">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-lg font-bold leading-tight">{chapter.title}</h1>
              <p className="text-gray-400 text-xs">{chapter.subject} • Class {chapter.class}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleSave} className={`p-2 rounded-xl ${isSaved ? 'bg-purple-600' : 'bg-white/10'}`}>
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-white' : ''}`} />
            </button>
            <button className="p-2 bg-white/10 rounded-xl">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* One-Page Note Content */}
      <div className="p-6 space-y-8 topper-note">
        {/* Summary Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Info className="w-5 h-5" />
            <h2 className="text-xl font-bold uppercase tracking-wider m-0 border-none">Chapter Summary</h2>
          </div>
          <p className="text-gray-700 leading-relaxed text-lg italic">
            {chapter.summary}
          </p>
        </section>

        {/* Key Points */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold uppercase tracking-wider">Key Concepts & Points</h2>
          <ul className="space-y-3">
            {chapter.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">{i + 1}</span>
                </div>
                <span className="text-gray-800">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Highlight Box / Formulas */}
        {chapter.formulas.length > 0 && (
          <section className="highlight-box">
            <h3 className="text-blue-700 font-bold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Important Formulas
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {chapter.formulas.map((formula, i) => (
                <code key={i} className="block bg-white p-3 rounded-lg border border-blue-200 font-mono text-blue-800">
                  {formula}
                </code>
              ))}
            </div>
          </section>
        )}

        {/* Important Questions */}
        <section className="space-y-6 pt-4 border-t-2 border-dashed border-gray-200">
          <div className="flex items-center gap-2 text-blue-600">
            <HelpCircle className="w-5 h-5" />
            <h2 className="text-xl font-bold uppercase tracking-wider m-0 border-none">Exam-Focused Questions</h2>
          </div>
          <div className="space-y-6">
            {chapter.importantQuestions.map((item, i) => (
              <div key={i} className="space-y-2">
                <h4 className="font-bold text-gray-900 flex gap-2">
                  <span className="text-blue-600">Q{i + 1}.</span> {item.question}
                </h4>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-gray-700">
                  <span className="font-bold text-blue-600 text-xs uppercase block mb-1">Answer:</span>
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-24 left-6 right-6 flex gap-4 z-50">
        <button className="flex-1 purple-gradient text-white font-bold py-4 rounded-2xl shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2">
          <Download className="w-5 h-5" />
          Download PDF
        </button>
      </div>
    </div>
  );
}
