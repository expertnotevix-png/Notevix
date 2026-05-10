import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { BookOpen, FlaskConical, Globe, Languages, Crown, ChevronRight, Trophy, Bell, Calendar, Sparkles, MessageSquare, BrainCircuit, FileText, Users, Instagram, Gift, Award, Zap, Clock } from 'lucide-react';
import { collection, query, where, getDocs, limit, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, checkQuotaLock } from '../components/firebase';

interface HomeProps {
  user: UserProfile;
}

const subjects = [
  { id: 'maths', name: 'Mathematics', icon: BookOpen, color: 'bg-blue-500' },
  { id: 'science', name: 'Science', icon: FlaskConical, color: 'bg-green-500' },
  { id: 'sst', name: 'Social Science', icon: Globe, color: 'bg-orange-500' },
  { id: 'english', name: 'English', icon: Languages, color: 'bg-pink-500' },
];

import { Logo } from '../components/Logo';
import { MotivationalCarousel } from '../components/MotivationalCarousel';
import { Onboarding } from '../components/Onboarding';
import { FocusTimerWidget } from '../components/FocusTimerWidget';
import { PromoCarousel } from '../components/PromoCarousel';

const classes = ['8', '9', '10'];

import { dataBridge } from '../services/dataBridge';
import { StoryUnlockModal } from '../components/StoryUnlockModal';

export default function Home({ user }: HomeProps) {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState<string | null>(user.class_level || user.class || null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [freeResources, setFreeResources] = useState<any[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [activeUnlockResource, setActiveUnlockResource] = useState<{ id: string, subject: string, title: string } | null>(null);

  useEffect(() => {
    if (selectedClass) {
      fetchClassResources(selectedClass);
    }
  }, [selectedClass, user]);

  const fetchClassResources = async (cls: string) => {
    setLoadingResources(true);
    const resources = await dataBridge.getFreeResources(cls);
    setFreeResources(resources || []);
    
    if (user.uid !== 'GUEST') {
      // Actually check against provided profile unlockedResources first for speed
      setUnlockedIds(user.unlockedResources || []);
    }
    setLoadingResources(false);
  };

  const handleDownloadClick = async (resource: any) => {
    if (user.uid === 'GUEST') {
      navigate('/login');
      return;
    }

    const isUnlocked = unlockedIds.includes(resource.id);
    
    if (isUnlocked) {
      window.open(resource.drive_link, '_blank');
    } else {
      setActiveUnlockResource({
        id: resource.id,
        subject: resource.subject,
        title: `${resource.subject} Combo Pack`
      });
      setShowUnlockModal(true);
    }
  };

  const handleUnlockSuccess = () => {
    if (activeUnlockResource) {
      setUnlockedIds(prev => [...prev, activeUnlockResource.id]);
    }
  };

  const handleClassSelect = async (cls: string) => {
    setSelectedClass(cls);
    try {
      await dataBridge.updateProfile(user.uid, { class_level: cls });
    } catch (error) {
      console.error("Error updating class:", error);
    }
  };

  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    setRecentlyViewed(saved);
  }, []);

  const getSubjectData = (id: string) => {
    return subjects.find(s => s.id === id) || subjects[0];
  };

  return (
    <div className="p-6 space-y-8">
      {showOnboarding && (
        <Onboarding 
          userId={user.uid} 
          onComplete={() => setShowOnboarding(false)} 
        />
      )}
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
          <button 
            onClick={() => navigate('/notifications')}
            className="p-2 glass-card rounded-xl relative active:scale-95 transition-transform"
          >
            <Bell className="w-6 h-6 text-gray-400" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-black" />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500 bg-white/5">
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      <PromoCarousel />

      {/* Streak & Focus Dashboard */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          className="purple-gradient p-5 rounded-3xl relative overflow-hidden shadow-xl shadow-purple-500/20"
        >
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              <span className="font-bold text-lg">{user.streak?.currentCount || 0} Days</span>
            </div>
            <p className="text-white/80 text-[10px] uppercase tracking-wider font-bold">Daily Streak</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Crown className="w-20 h-20" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.02 }}
          className="bg-[#1a1635] p-5 rounded-3xl relative overflow-hidden border border-white/5 shadow-xl"
        >
          <div className="relative z-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⌛</span>
              <span className="font-bold text-lg">{user.totalFocusMinutes || 0}m</span>
            </div>
            <p className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">Focus Time</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5">
            <BookOpen className="w-20 h-20" />
          </div>
        </motion.div>
      </div>

      {/* Focus Session */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-lg italic uppercase">Focus Session</h3>
        </div>
        <FocusTimerWidget />
      </div>

      {/* Class Selector */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-lg italic uppercase">Select Your Class</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {classes.map((cls) => (
            <button
              key={cls}
              onClick={() => handleClassSelect(cls)}
              className={`py-4 rounded-2xl font-bold transition-all ${
                selectedClass === cls
                  ? 'purple-gradient text-white shadow-lg shadow-purple-500/30 font-black'
                  : 'glass-card text-gray-400 font-bold'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Combo Pack Section - Only show if class is selected */}
      {selectedClass && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-black italic uppercase text-lg">Class {selectedClass} <span className="text-indigo-400">Combo Packs</span></h3>
            <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border border-emerald-500/20">
               FREE RESOURCES
            </div>
          </div>

          {loadingResources ? (
            <div className="h-64 glass-card rounded-[2.5rem] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : freeResources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {freeResources.map((resource, idx) => (
                <motion.div 
                  key={resource.id || idx}
                  whileHover={{ y: -5 }}
                  className="bg-[#0f0f0f] border border-white/5 rounded-[3rem] overflow-hidden group shadow-2xl relative"
                >
                  {/* Free Badge */}
                  <div className="absolute top-6 left-6 z-20">
                    <div className="bg-emerald-500 text-black px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center gap-2 text-[10px]">
                      <Zap className="w-3 h-3 fill-current" /> FREE
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div className="aspect-[4/5] relative">
                    {resource.cover_url ? (
                      <img 
                        src={resource.cover_url} 
                        alt={resource.subject} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                      />
                    ) : (
                      <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center">
                        <BookOpen className="w-16 h-16 text-indigo-500/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />
                  </div>

                  <div className="p-10 pt-8 space-y-8">
                    <button 
                      onClick={() => handleDownloadClick(resource)}
                      className={`flex items-center justify-center gap-3 w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 border-b-4 ${
                        unlockedIds.includes(resource.id) 
                          ? 'bg-emerald-500 text-black shadow-emerald-500/30 hover:bg-emerald-400 border-emerald-700' 
                          : 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-500 border-indigo-800'
                      }`}
                    >
                      {unlockedIds.includes(resource.id) ? (
                        <><Gift className="w-5 h-5" /> Download Free PDF</>
                      ) : (
                        <><Zap className="w-5 h-5" /> Unlock with Story</>
                      )}
                    </button>

                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] text-center italic">
                      Includes Previous Year Questions • Notes • Solutions
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-10 glass-card rounded-[2.5rem] text-center space-y-3 bg-red-500/5 border-red-500/10">
              <BookOpen className="w-10 h-10 text-gray-700 mx-auto opacity-20" />
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">No combo pack available for Class {selectedClass}</p>
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Check back later or explore other classes</p>
            </div>
          )}
        </motion.div>
      )}

      <MotivationalCarousel />
      
      {/* AI Study Tools */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-lg">AI Study Tools</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/ai-doubts')}
            className="glass-card p-5 rounded-3xl border-purple-500/30 bg-purple-500/5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-left">
                <h4 className="font-bold">AI Doubt Solver</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Class 8-10 Doubts</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-500 transition-colors" />
          </motion.button>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/ai-quiz')}
              className="glass-card p-5 rounded-3xl border-blue-500/30 bg-blue-500/5 flex flex-col gap-3 group"
            >
              <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm">Auto Quiz</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">MCQ Generator</p>
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/ai-summarizer')}
              className="glass-card p-5 rounded-3xl border-pink-500/30 bg-pink-500/5 flex flex-col gap-3 group"
            >
              <div className="w-10 h-10 bg-pink-500/20 rounded-2xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-pink-500" />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-sm">Summarizer</h4>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Chapter Summary</p>
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Community Teaser */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/community')}
        className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 rounded-3xl p-6 relative overflow-hidden group cursor-pointer"
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-lg">Student Community</h3>
            </div>
            <p className="text-gray-400 text-xs">Join 5,000+ students discussing doubts!</p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <img 
                    key={i} 
                    src={`https://i.pravatar.cc/100?img=${i + 10}`} 
                    className="w-6 h-6 rounded-full border-2 border-black bg-white/5" 
                    alt="" 
                    loading="lazy"
                  />
                ))}
              </div>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Join Now</span>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors" />
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <MessageSquare className="w-24 h-24" />
        </div>
      </motion.div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/leaderboard')}
          className="glass-card p-4 rounded-3xl border-purple-500/30 bg-purple-500/5 flex flex-col gap-3 group cursor-pointer"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-2xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Ranks</h4>
            <p className="text-[10px] text-gray-500">Global Leaderboard</p>
            <div className="mt-1 flex items-center gap-1">
              <Instagram className="w-2.5 h-2.5 text-pink-500" />
              <span className="text-[8px] text-purple-400 font-bold">Top 3 get tagged!</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/schedule')}
          className="glass-card p-4 rounded-3xl border-blue-500/30 bg-blue-500/5 flex flex-col gap-3 group cursor-pointer"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Planner</h4>
            <p className="text-[10px] text-gray-500">Daily Schedule</p>
          </div>
        </motion.div>
      </div>

      {/* Study Insights Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-lg">Study Insights</h3>
          </div>
          <button 
            onClick={() => navigate('/articles')}
            className="text-purple-400 text-xs font-bold hover:underline"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/article/how-to-study-class-10-science')}
            className="glass-card overflow-hidden rounded-3xl group cursor-pointer border-white/5 active:border-purple-500/30 transition-all"
          >
            <div className="aspect-[21/9] relative scale-105">
              <img 
                src="https://picsum.photos/seed/science/800/400" 
                alt="Study Tips" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="font-bold text-white text-sm line-clamp-1">How to Master Class 10 Science: Study Tips from Toppers</h4>
                <p className="text-[10px] text-gray-300 mt-1">Read expert advice for boards</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Recently Viewed - Only show if items exist */}
      {recentlyViewed.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Recently Viewed</h3>
            <button 
              onClick={() => {
                localStorage.removeItem('recentlyViewed');
                setRecentlyViewed([]);
              }}
              className="text-purple-400 text-sm font-medium"
            >
              Clear
            </button>
          </div>
          <div className="space-y-3">
            {recentlyViewed.map((item, i) => {
              const subjectData = getSubjectData(item.subjectId);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => navigate(`/class/${item.classId}/${item.subjectId}`)}
                  className="glass-card p-4 rounded-3xl flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className={`w-12 h-12 ${subjectData.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <subjectData.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm capitalize">{item.subjectId} Resources</h4>
                    <p className="text-xs text-gray-500">Subject • Class {item.classId}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {activeUnlockResource && (
        <StoryUnlockModal
          isOpen={showUnlockModal}
          onClose={() => setShowUnlockModal(false)}
          user={user}
          resource={activeUnlockResource}
          onSuccess={handleUnlockSuccess}
        />
      )}
    </div>
  );
}
