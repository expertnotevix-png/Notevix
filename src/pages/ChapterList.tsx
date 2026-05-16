import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Crown, ChevronRight, Zap } from 'lucide-react';
import { dataBridge } from '../services/dataBridge';

export default function ChapterList() {
  const { classId, subjectId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<any[]>([]);

  useEffect(() => {
    dataBridge.getResources(classId).then(data => {
      setResources(data || []);
      setLoading(false);
    });
  }, [classId, subjectId]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="fixed top-0 inset-x-0 h-20 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 z-50 flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-colors"><ChevronLeft /></button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">{subjectId}</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Class {classId} Resources</p>
          </div>
        </div>
      </header>

      <main className="pt-28 pb-12 px-6 max-w-2xl mx-auto space-y-8">
        <div className="bg-indigo-600/5 border border-indigo-600/20 p-8 rounded-[2.5rem] flex items-center justify-between group overflow-hidden relative shadow-2xl">
           <div className="space-y-2 relative z-10">
              <h2 className="text-xl font-black uppercase text-white tracking-tight">Master Combo Pack</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Unlock All {subjectId} Chapters at once</p>
           </div>
           <button 
            onClick={() => navigate('/premium-notes')}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl relative z-10 active:scale-95 transition-all"
           >
             ₹99 ONLY
           </button>
           <Crown className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-600/10 group-hover:scale-110 transition-transform" />
        </div>

        <div className="space-y-4">
           {loading ? (
             [1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)
           ) : resources.length > 0 ? (
             resources.map((res, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/note/${res.id}`)}
                  className="w-full bg-[#0a0a0a] border border-white/5 p-6 rounded-[2rem] flex items-center justify-between hover:border-indigo-500/30 transition-all group shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <BookOpen size={20} />
                    </div>
                    <div className="text-left">
                       <h3 className="font-bold text-sm uppercase">{res.subject} Premium Notes</h3>
                       <p className="text-[10px] text-gray-500 font-bold">Comprehensive Study Material</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">₹39</span>
                     <ChevronRight size={18} className="text-gray-700" />
                  </div>
                </button>
             ))
           ) : (
             <div className="text-center py-20 text-gray-600 uppercase font-black text-xs tracking-widest">No chapters found</div>
           )}
        </div>
      </main>
    </div>
  );
}
