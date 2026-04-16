import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { BookOpen, FlaskConical, Globe, Languages, Crown, ChevronRight, Trophy, Bell, Calendar, Sparkles, MessageSquare, BrainCircuit, FileText, Users, Instagram } from 'lucide-react';
import { collection, query, where, getDocs, limit, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
import { AdBanner } from '../components/AdBanner';
import { Onboarding } from '../components/Onboarding';
import { FocusTimerWidget } from '../components/FocusTimerWidget';

const classes = ['8', '9', '10'];

export default function Home({ user }: HomeProps) {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState<string | null>(user.class || null);
  const [showOnboarding, setShowOnboarding] = useState(!user.onboardingCompleted);

  useEffect(() => {
    if (user.role === 'admin') {
      autoSeedData();
    }
  }, [user]);

  const handleClassSelect = async (cls: string) => {
    setSelectedClass(cls);
    try {
      await updateDoc(doc(db, 'users', user.uid), { class: cls });
    } catch (error) {
      console.error("Error updating class:", error);
    }
  };

  const autoSeedData = async () => {
    const q = query(collection(db, 'subject_resources'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("Auto-seeding data...");
      
      // Community Stats
      await setDoc(doc(db, 'community_stats', 'global'), {
        totalQuestions: 0,
        totalAnswers: 0,
        totalStudents: 1,
        solvedToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      }, { merge: true });

      // Subject Resources
      const subjectResources = [
        {
          class: '8', subject: 'science',
          onePageNotesUrl: 'https://drive.google.com/file/d/1ka-QeoholdXB3xaX7jX2QNXO-kP2n-ES/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1wCuBo0YApmkqef-UnT29CtRd1tOcrb9v/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1UB0-QptnzsAOEU5lKwA60HtVfFo5_P_g/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1F5OA8aK6ncJLD0iVYTIR_etSDjBqKheB/view?usp=drivesdk'
        },
        {
          class: '8', subject: 'sst',
          onePageNotesUrl: 'https://drive.google.com/file/d/1mV5bcLIz8j3IEE61Ijwdo2RDrq-j05yG/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1USJWh6tDlRH7ATYRrsHC_HgESYHAzb8D/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1TCAEGb4e9s1bd6ttGmHiDVYsimaH3_Pd/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1cVOUmI7StT61OlrZC16oE0mE1pV8YnNk/view?usp=drivesdk'
        },
        {
          class: '8', subject: 'maths',
          onePageNotesUrl: 'https://drive.google.com/file/d/1GcVbFswV7OB3dutymQjdHbOXheuK9Ysn/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1K64QsZT9lNwS_12r5HioULIHVXFDm_oB/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1d1-V1u8oWALR49tKMKBWe1Dtnz3nnOBH/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1z-cvLUQQAT02csfWiM03_b8dcPFObtE0/view?usp=drivesdk'
        },
        {
          class: '8', subject: 'english',
          onePageNotesUrl: 'https://drive.google.com/file/d/1CCK6uzH1ma5I0E5sWWW57_BbUo9PrlHX/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1IXSc8wcjttmkOVpVY7ocKZkTuRVI0iTZ/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1Cr_fvccNKi-PBWTRb6CF6DB27qz73r3z/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nuGRofcxb9LKD7d0-7ngBU1mmrhCSjgX/view?usp=drivesdk'
        },
        {
          class: '9', subject: 'science',
          onePageNotesUrl: 'https://drive.google.com/file/d/16J3l5x2tiNwhtG1YUH6Xpc1VyhlbEhaU/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/19KV_y1pdj4TN9mSg1pnymrjF7RVpghGH/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1_Nr1VeZX7a3g9HM3j6nhzZ5xe9XXA-3_/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1IGo5ErM6jnmJ1KrM60o-XjAt1XgEj5sc/view?usp=drivesdk'
        },
        {
          class: '9', subject: 'sst',
          onePageNotesUrl: 'https://drive.google.com/file/d/1Nhof272xWczHbg7hX_ageR4NvXPJNrJP/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1Ig18ncXDHEQ0Mxu-sM7akb_01Ab3H02j/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1rig4ZYP8nk22Kfr35OR9VLxv7WQy7n9a/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1lDAxdI-_b7JcYkWPdt6uegR4LdQuxQ3h/view?usp=drivesdk'
        },
        {
          class: '9', subject: 'maths',
          onePageNotesUrl: 'https://drive.google.com/file/d/1aIa3PGgzZu8K1p9NY5yejDcgzMPHZ2ZP/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1iW1BUO46koPSud20WlGPAf1VMNlXUNyI/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1DJEF8yHKGWDnsJt7tGGTkH0DgGbn9yRp/view?usp=drivesdk'
        },
        {
          class: '9', subject: 'english',
          onePageNotesUrl: 'https://drive.google.com/file/d/1k_7qp8KYIyIvYME5sfO1Oq-nt7LjxyOL/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1B81cuGvF5-jJnhUA1n-Yy6nAk-H9W-B3/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/10X16DY-AxnxyXrIDwbNqJSt_Y8NRZyv7/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1n4_HnHrShSzIMkfiVQYDtuJSWPnkqqO2/view?usp=drivesdk'
        },
        {
          class: '10', subject: 'science',
          onePageNotesUrl: 'https://drive.google.com/file/d/1vVRXXenGoaFzn1R2cEs_es5gDzzEzO9J/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1Rer-yq5_lUAx79ziwtXDR0AXgaoB10Eh/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/17gHE4BBgTcFbq6Z1jUMEaooPuDhSxrFR/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1lGG-l-89veqwwbEIltxRtXql1Xhb1uVT/view?usp=drivesdk'
        },
        {
          class: '10', subject: 'sst',
          onePageNotesUrl: 'https://drive.google.com/file/d/1C5HNfr4u_8vQ9eArzdZRSUhE_Owy4h8c/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1hUk1u-XnJb47lAFvU3qvWUK_kTMHwVc6/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1B_s9nxd9df3uR2Zas-sna9S5sthtt-1w/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1Bo5ON7oLLp_uhra5dOx5vVk82x07WGCJ/view?usp=drivesdk'
        },
        {
          class: '10', subject: 'maths',
          onePageNotesUrl: 'https://drive.google.com/file/d/1oa2WBPNO4ChJrAp-aP7uyvVCn2SPI6w1/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/1wNNhEXC06_qpsom2lzfAoOAjxZtfzc2f/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1jUpfYzuNwiE6b6CTYTE--Gk8ttqZ5b26/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nWLsptC9vEV7egT8rbapiRi_gBm7SeTW/view?usp=drivesdk'
        },
        {
          class: '10', subject: 'english',
          onePageNotesUrl: 'https://drive.google.com/file/d/161HIkuYtIOD5esDsmjwnI5lq6PPltOZG/view?usp=drivesdk',
          fullNotesUrl: 'https://drive.google.com/file/d/158isO5zrYWgdKafIiRdzOXLHJaYEeu35/view?usp=drivesdk',
          importantQuestionsUrl: 'https://drive.google.com/file/d/1ELq7c3bOUDaVFAsu2OcDtuwYiOikTm74/view?usp=drivesdk',
          examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1DcvYECk1QfqhAu2isR3PHnolvcMtx4n5/view?usp=drivesdk'
        }
      ];

      for (const res of subjectResources) {
        await addDoc(collection(db, 'subject_resources'), res);
      }

      // Sample Chapters for Class 8
      const chapterSamples = [
        {
          class: '8', subject: 'maths', title: 'Rational Numbers',
          summary: 'Numbers that can be expressed in p/q form.',
          keyPoints: ['Closure property', 'Commutativity', 'Associativity'],
          formulas: ['p/q + r/s = (ps + rq)/qs'],
          importantQuestions: [{ question: 'What is additive inverse?', answer: 'Negative of the number.' }],
          isPremium: false
        },
        {
          class: '8', subject: 'maths', title: 'Linear Equations',
          summary: 'Equations with degree 1.',
          keyPoints: ['Variable', 'Constant', 'LHS = RHS'],
          formulas: ['ax + b = c'],
          importantQuestions: [{ question: 'Solve 2x + 3 = 7', answer: 'x = 2' }],
          isPremium: false
        },
        {
          class: '8', subject: 'science', title: 'Crop Production',
          summary: 'Management of crops for food production.',
          keyPoints: ['Sowing', 'Irrigation', 'Harvesting'],
          formulas: [],
          importantQuestions: [{ question: 'What is Kharif crop?', answer: 'Sown in rainy season.' }],
          isPremium: false
        },
        {
          class: '8', subject: 'science', title: 'Microorganisms',
          summary: 'Tiny organisms visible only under microscope.',
          keyPoints: ['Bacteria', 'Fungi', 'Protozoa', 'Algae'],
          formulas: [],
          importantQuestions: [{ question: 'What is fermentation?', answer: 'Conversion of sugar into alcohol.' }],
          isPremium: false
        },
        {
          class: '8', subject: 'sst', title: 'How, When and Where',
          summary: 'Introduction to modern Indian history.',
          keyPoints: ['Periodisation', 'Colonialism', 'Official records'],
          formulas: [],
          importantQuestions: [{ question: 'Who was James Mill?', answer: 'Scottish economist and political philosopher.' }],
          isPremium: false
        },
        {
          class: '8', subject: 'english', title: 'The Best Christmas Present',
          summary: 'A story about a letter from a soldier.',
          keyPoints: ['Jim Macpherson', 'Connie', 'Christmas truce'],
          formulas: [],
          importantQuestions: [{ question: 'Who was Connie?', answer: 'Jim Macpherson\'s wife.' }],
          isPremium: false
        },
        {
          class: '9', subject: 'maths', title: 'Number Systems',
          summary: 'Introduction to real numbers.',
          keyPoints: ['Rational numbers', 'Irrational numbers', 'Real numbers'],
          formulas: [],
          importantQuestions: [{ question: 'Is zero a rational number?', answer: 'Yes.' }],
          isPremium: false
        }
      ];

      for (const chapter of chapterSamples) {
        await addDoc(collection(db, 'chapters'), chapter);
      }
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
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-500">
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>

      {/* Streak & Focus Dashboard */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
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

      <MotivationalCarousel />
      
      {/* AI Study Tools */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-lg">AI Study Tools</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <motion.button
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
                  <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} className="w-6 h-6 rounded-full border-2 border-black" alt="" />
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

      <FocusTimerWidget />

      {/* Class Selector */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Select Your Class</h3>
        <div className="grid grid-cols-3 gap-3">
          {classes.map((cls) => (
            <button
              key={cls}
              onClick={() => handleClassSelect(cls)}
              className={`py-4 rounded-2xl font-bold transition-all ${
                selectedClass === cls
                  ? 'purple-gradient text-white shadow-lg shadow-purple-500/30'
                  : 'glass-card text-gray-400'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Grid - Only show if class is selected */}
      {selectedClass && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="font-bold text-lg">Select Subject</h3>
          <div className="grid grid-cols-1 gap-3">
            {subjects.map((subject) => (
              <motion.button
                key={subject.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/class/${selectedClass}/${subject.id}`)}
                className="glass-card p-5 rounded-2xl flex items-center justify-between group hover:border-purple-500/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`${subject.color} p-3 rounded-xl shadow-lg`}>
                    <subject.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-bold text-lg">{subject.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-purple-500 transition-colors" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

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
    </div>
  );
}
