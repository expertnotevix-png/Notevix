import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { BookOpen, FlaskConical, Globe, Languages, Crown } from 'lucide-react';

interface HomeProps {
  user: UserProfile;
}

const subjects = [
  { id: 'maths', name: 'Mathematics', icon: BookOpen, color: 'bg-blue-500' },
  { id: 'science', name: 'Science', icon: FlaskConical, color: 'bg-green-500' },
  { id: 'sst', name: 'Social Science', icon: Globe, color: 'bg-orange-500' },
  { id: 'english', name: 'English', icon: Languages, color: 'bg-pink-500' },
];

const classes = ['6', '7', '8', '9', '10'];

export default function Home({ user }: HomeProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-gray-400 text-sm">Welcome back,</h2>
          <h1 className="text-2xl font-bold">{user.displayName} 👋</h1>
        </div>
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500">
          <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Premium Banner */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="purple-gradient p-6 rounded-3xl relative overflow-hidden shadow-xl shadow-purple-500/20"
      >
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            <span className="font-bold text-lg">Unlock NoteVix Pro</span>
          </div>
          <p className="text-white/80 text-sm max-w-[200px]">
            Get access to all premium notes and important questions.
          </p>
          <button className="bg-white text-purple-600 px-4 py-2 rounded-xl text-sm font-bold mt-2">
            Upgrade Now
          </button>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-20">
          <Crown className="w-32 h-32" />
        </div>
      </motion.div>

      {/* Class Selector */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Select Your Class</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {classes.map((cls) => (
            <button
              key={cls}
              className={`px-6 py-3 rounded-2xl font-bold transition-all min-w-[80px] ${
                user.class === cls
                  ? 'purple-gradient text-white shadow-lg shadow-purple-500/30'
                  : 'glass-card text-gray-400'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Your Subjects</h3>
        <div className="grid grid-cols-2 gap-4">
          {subjects.map((subject) => (
            <motion.button
              key={subject.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/class/${user.class || '10'}/${subject.id}`)}
              className="glass-card p-5 rounded-3xl flex flex-col items-start gap-4 text-left group hover:border-purple-500/50 transition-colors"
            >
              <div className={`${subject.color} p-3 rounded-2xl shadow-lg`}>
                <subject.icon className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <span className="font-bold block">{subject.name}</span>
                <span className="text-xs text-gray-500">12 Chapters</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recently Viewed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Recently Viewed</h3>
          <button className="text-purple-400 text-sm font-medium">See All</button>
        </div>
        <div className="glass-card p-4 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm">Polynomials</h4>
            <p className="text-xs text-gray-500">Mathematics • Class 10</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
