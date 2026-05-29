import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AppUser } from '../types';
import { BookOpen, Crown, Bell, Zap, ExternalLink, ChevronRight } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PromoCarousel } from '../components/PromoCarousel';
import { dataBridge } from '../services/dataBridge';
import { ProductCarousel } from '../components/ProductCarousel';

interface HomeProps {
  user: AppUser;
}

const CLASSES = ['8', '9', '10'];

export default function Home({ user }: HomeProps) {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState<string>('10');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchResources(selectedClass);
  }, [selectedClass]);

  const fetchResources = async (cls: string) => {
    setLoading(true);
    try {
      const data = await dataBridge.getResources(cls);
      setResources(data || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <div className="space-y-0.5">
            <h2 className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">Welcome back,</h2>
            <h1 className="text-xl font-bold">{user.displayName} 👋</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'admin' && (
            <button 
              onClick={() => navigate('/admin')}
              className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20 active:scale-95 transition-transform"
            >
              Admin
            </button>
          )}
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500 bg-white/5">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      <PromoCarousel />

      {/* Class Selector */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h3 className="font-black text-lg italic uppercase">Select Your Class</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`py-4 rounded-2xl font-bold transition-all ${
                selectedClass === cls
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-white/5 text-gray-500 border border-white/5'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-black italic uppercase text-lg">Class {selectedClass} <span className="text-indigo-400">Notes Library</span></h3>
        </div>

        {loading ? (
          <div className="h-64 bg-white/5 rounded-[2.5rem] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {resources.map((res) => (
              <motion.div 
                key={res.id}
                whileHover={{ y: -5 }}
                className="bg-[#0f0f0f] border border-white/5 rounded-[3rem] overflow-hidden group shadow-2xl relative"
              >
                  <div className="absolute top-6 left-6 z-20">
                    <div className={`${res.is_premium ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-black'} px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20`}>
                      {res.is_premium ? 'PREMIUM' : 'FREE'}
                    </div>
                  </div>

                  <div className="aspect-[4/5] relative overflow-hidden">
                    <ProductCarousel 
                      coverImage={res.cover_image} 
                      previewImages={res.preview_images} 
                      subject={res.subject} 
                    />
                  </div>

                  <div className="p-8 pt-6 space-y-4">
                    <h4 className="text-xl font-black uppercase text-white truncate">{res.subject}</h4>
                    
                    <button 
                      onClick={() => navigate('/premium-notes')}
                      className="flex items-center justify-center gap-3 w-full py-5 rounded-[2rem] bg-indigo-600 text-white font-black text-[12px] uppercase tracking-widest shadow-2xl transition-all active:scale-95"
                    >
                      {res.is_premium ? (
                        <>
                          <Crown className="w-4 h-4" /> GET ACCESS NOW
                        </>
                      ) : (
                        <>
                          <BookOpen className="w-4 h-4" /> OPEN NOTES
                        </>
                      )}
                    </button>
                    
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] text-center italic">
                      Chapter-wise PDFs • Important Questions
                    </p>
                  </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 bg-white/5 rounded-[2.5rem] text-center text-gray-600 text-sm font-bold uppercase tracking-widest">
            No resources found for Class {selectedClass}
          </div>
        )}
      </div>
    </div>
  );
}
