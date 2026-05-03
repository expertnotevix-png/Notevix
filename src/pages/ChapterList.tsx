import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../components/firebase';
import { SubjectResource } from '../types';
import { motion } from 'motion/react';
import { ChevronLeft, FileText, Book, HelpCircle, Calculator, History, ChevronRight, RefreshCw } from 'lucide-react';
import { MotivationalCarousel } from '../components/MotivationalCarousel';

export default function ChapterList() {
  const { classId, subjectId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState<SubjectResource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch from static JSON to save Firestore reads
      const response = await fetch('/data/resources.json');
      const json = await response.json();
      const allResources: SubjectResource[] = json.resources;

      let filtered;
      if (subjectId === 'all') {
        filtered = allResources.filter(r => r.class === classId);
      } else {
        filtered = allResources.filter(r => r.class === classId && r.subject === subjectId);
      }

      setResources(filtered);
      localStorage.setItem(`notevix_resources_${classId}_${subjectId}`, JSON.stringify(filtered));
    } catch (error) {
      console.error("Error fetching static resources:", error);
      const cached = localStorage.getItem(`notevix_resources_${classId}_${subjectId}`);
      if (cached) setResources(JSON.parse(cached));
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

      {/* Content */}
      <div className="space-y-8">
        {resources.length > 0 ? (
          resources.map((res) => (
            <div key={res.id} className="space-y-4">
              {resources.length > 1 && (
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">{res.subject}</span>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
              )}
              <div className="space-y-3">
                {[
                  { label: 'One Page Notes', url: res.onePageNotesUrl, icon: FileText },
                  { label: 'Full Notes', url: res.fullNotesUrl, icon: Book },
                  { label: 'Important Questions', url: res.importantQuestionsUrl, icon: HelpCircle },
                  { label: 'Exam Oriented Questions', url: res.examOrientedQuestionsUrl, icon: History },
                ].map((item, index) => (
                  <motion.button
                    key={item.label + res.id}
                    onClick={() => {
                      if (item.url && item.url !== '#') {
                        window.open(item.url, '_blank');
                      }
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] border border-white/5 shadow-xl ${
                      item.url && item.url !== '#' 
                        ? 'bg-[#1a1635] hover:border-purple-500/50' 
                        : 'bg-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-sm font-bold text-white/90">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400/50" />
                  </motion.button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-gray-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-bold">No High-Yield PDFs yet</h3>
              <p className="text-gray-500 text-xs">Our team is uploading resources for Class {classId}. Check back soon!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
