import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SubjectResource } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, FileText, Book, HelpCircle, Calculator, History, ChevronRight, RefreshCw } from 'lucide-react';
import { MotivationalCarousel } from '../components/MotivationalCarousel';

export default function ChapterList() {
  const { classId, subjectId } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState<SubjectResource | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qResources = query(
        collection(db, 'subject_resources'),
        where('class', '==', classId),
        where('subject', '==', subjectId)
      );
      const resourceSnapshot = await getDocs(qResources);
      if (!resourceSnapshot.empty) {
        setResource({ id: resourceSnapshot.docs[0].id, ...resourceSnapshot.docs[0].data() } as SubjectResource);
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    // Save to recently viewed
    if (classId && subjectId) {
      const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      const newItem = { classId, subjectId, timestamp: Date.now() };
      
      // Filter out duplicates and keep only last 3
      const updated = [newItem, ...recentlyViewed.filter((item: any) => 
        !(item.classId === classId && item.subjectId === subjectId)
      )].slice(0, 3);
      
      localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    }
  }, [classId, subjectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const resourceItems = [
    { label: 'One Page Notes', url: resource?.onePageNotesUrl, icon: FileText },
    { label: 'Full Notes', url: resource?.fullNotesUrl, icon: Book },
    { label: 'Important Questions', url: resource?.importantQuestionsUrl, icon: HelpCircle },
    { label: 'Exam Oriented Questions', url: resource?.examOrientedQuestionsUrl, icon: History },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Select Content Type</h1>
        </div>
        <button 
          onClick={fetchData} 
          className="p-2 glass-card rounded-xl active:scale-95 transition-transform"
          disabled={loading}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <MotivationalCarousel />

      <div className="w-full h-px bg-white/10" />

      {/* Content Type Cards */}
      <div className="space-y-4">
        {resourceItems.map((item, index) => (
          <motion.a
            key={item.label}
            href={item.url && item.url !== '#' ? item.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`w-full p-5 rounded-3xl flex items-center justify-between transition-all active:scale-[0.98] border border-white/5 shadow-xl ${
              item.url && item.url !== '#' 
                ? 'bg-[#1a1635] hover:border-purple-500/50' 
                : 'bg-white/5 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                <item.icon className="w-7 h-7 text-purple-400" />
              </div>
              <span className="text-lg font-bold text-white/90">{item.label}</span>
            </div>
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-purple-400" />
            </div>
          </motion.a>
        ))}
      </div>

      {!resource && !loading && (
        <div className="text-center py-10 space-y-4">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-10 h-10 text-gray-600" />
          </div>
          <p className="text-gray-500">No resources found for this subject yet.</p>
        </div>
      )}
    </div>
  );
}
