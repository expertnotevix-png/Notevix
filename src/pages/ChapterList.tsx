import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, Lock, PlayCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function ChapterList() {
  const { classId, subjectId } = useParams();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChapters = async () => {
      const q = query(
        collection(db, 'chapters'),
        where('class', '==', classId),
        where('subject', '==', subjectId)
      );
      const querySnapshot = await getDocs(q);
      const chapterData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
      setChapters(chapterData);
      setLoading(false);
    };

    fetchChapters();
  }, [classId, subjectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold capitalize">{subjectId}</h1>
          <p className="text-gray-500 text-sm">Class {classId} • {chapters.length} Chapters</p>
        </div>
      </div>

      {/* Chapter List */}
      <div className="space-y-4">
        {chapters.length > 0 ? (
          chapters.map((chapter, index) => (
            <motion.button
              key={chapter.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/note/${chapter.id}`)}
              className="w-full glass-card p-5 rounded-3xl flex items-center gap-4 text-left group hover:border-purple-500/50 transition-colors"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center font-bold text-purple-500">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg leading-tight">{chapter.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <FileText className="w-3 h-3" />
                    <span>Summary</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <PlayCircle className="w-3 h-3" />
                    <span>Q&A</span>
                  </div>
                </div>
              </div>
              {chapter.isPremium ? (
                <Lock className="w-5 h-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
            </motion.button>
          ))
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-500">No chapters found for this subject yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
