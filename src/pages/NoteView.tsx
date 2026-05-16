import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppUser, SubjectResource } from '../types';
import { dataBridge } from '../services/dataBridge';
import { ChevronLeft, Lock, Download, Crown, Info } from 'lucide-react';
import { toast } from 'sonner';

interface NoteViewProps {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
}

export default function NoteView({ user }: NoteViewProps) {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState<SubjectResource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (noteId) {
      dataBridge.getResources().then(res => {
        const item = res.find(r => r.id === noteId);
        setResource(item || null);
        setLoading(false);
      });
    }
  }, [noteId]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-500 uppercase text-[10px] tracking-widest">Loading PDF...</div>;
  if (!resource) return <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center"><h1 className="text-2xl font-black mb-4">Note not found</h1><button onClick={() => navigate('/')} className="bg-white text-black px-6 py-2 rounded-xl">Back Home</button></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="fixed top-0 inset-x-0 h-16 bg-[#0a0a0a]/50 backdrop-blur-md border-b border-white/5 z-50 flex items-center px-4 justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><ChevronLeft /></button>
        <h2 className="text-sm font-black uppercase tracking-tight truncate max-w-[200px]">{resource.subject} Notes</h2>
        <div className="w-10"></div>
      </header>

      <main className="pt-24 pb-20 px-6 max-w-lg mx-auto space-y-12 text-center">
        <div className="aspect-[3/4] bg-white/5 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center p-10 space-y-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-1 bg-indigo-600" />
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40">
             <Lock className="text-white" size={32} />
          </div>
          <div className="space-y-4">
            <h1 className="text-2xl font-black uppercase">{resource.subject} PREMIUM</h1>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
              This PDF is protected. You need a verified password to open this file for legal and security reasons.
            </p>
          </div>
          <button 
            onClick={() => navigate('/premium-notes')}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
          >
            <Crown size={14} className="inline mr-2" /> Purchase Password
          </button>
        </div>

        <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4 text-left">
           <div className="flex items-start gap-4">
              <Info className="w-5 h-5 text-indigo-400 shrink-0" />
              <div className="space-y-2">
                 <p className="text-[11px] font-black uppercase tracking-widest">How to use password</p>
                 <p className="text-[9px] text-gray-500 font-bold uppercase leading-relaxed">
                   After purchase, your password will appear in your profile. Download the PDF and enter the password when prompted by your phone converter.
                 </p>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
