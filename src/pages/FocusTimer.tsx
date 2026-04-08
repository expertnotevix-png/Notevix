import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Coffee, Brain, Award, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FocusTimerProps {
  user: UserProfile;
}

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const MODES = {
  focus: { label: 'Focus', minutes: 25, color: 'bg-purple-600', icon: Brain },
  shortBreak: { label: 'Short Break', minutes: 5, color: 'bg-blue-500', icon: Coffee },
  longBreak: { label: 'Long Break', minutes: 15, color: 'bg-indigo-600', icon: TimerIcon },
};

export default function FocusTimer({ user }: FocusTimerProps) {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mode === 'focus') {
      setSessionsCompleted(prev => prev + 1);
      // Update total focus minutes in Firestore
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          totalFocusMinutes: increment(MODES.focus.minutes)
        });
      } catch (error) {
        console.error("Error updating focus minutes:", error);
      }
      
      // Suggest break
      setMode('shortBreak');
      setTimeLeft(MODES.shortBreak.minutes * 60);
    } else {
      setMode('focus');
      setTimeLeft(MODES.focus.minutes * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(MODES[mode].minutes * 60);
  };

  const switchMode = (newMode: TimerMode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].minutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (timeLeft / (MODES[mode].minutes * 60)) * 100;

  return (
    <div className="p-6 space-y-8 min-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 purple-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
          <TimerIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl">Focus Timer</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Boost your productivity</p>
        </div>
      </div>

      {/* Timer Display */}
      <div className="relative aspect-square max-w-[300px] mx-auto flex items-center justify-center">
        {/* Progress Ring */}
        <svg className="w-full h-full -rotate-90 transform">
          <circle
            cx="150"
            cy="150"
            r="140"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-white/5"
          />
          <motion.circle
            cx="150"
            cy="150"
            r="140"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={880}
            initial={{ strokeDashoffset: 880 }}
            animate={{ strokeDashoffset: 880 - (880 * (100 - progress)) / 100 }}
            className={`${MODES[mode].color.replace('bg-', 'text-')} transition-all duration-1000`}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2">
          <motion.span 
            key={timeLeft}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-mono font-bold"
          >
            {formatTime(timeLeft)}
          </motion.span>
          <span className="text-sm font-medium text-gray-400 uppercase tracking-widest">
            {MODES[mode].label}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-6">
        <button 
          onClick={resetTimer}
          className="w-12 h-12 glass-card rounded-2xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
        
        <button 
          onClick={toggleTimer}
          className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl transition-all active:scale-90 ${
            isActive ? 'bg-white text-black' : 'purple-gradient text-white shadow-purple-500/30'
          }`}
        >
          {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
        </button>

        <div className="w-12 h-12" /> {/* Spacer */}
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(MODES) as TimerMode[]).map((m) => {
          const ModeIcon = MODES[m].icon;
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${
                mode === m 
                  ? `${MODES[m].color} text-white shadow-lg` 
                  : 'glass-card text-gray-500'
              }`}
            >
              <ModeIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{MODES[m].label}</span>
            </button>
          );
        })}
      </div>

      {/* Stats Card */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Today's Progress</h4>
              <p className="text-xs text-gray-500">{sessionsCompleted} sessions completed</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </div>
        
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((sessionsCompleted / 4) * 100, 100)}%` }}
            className="h-full bg-yellow-500"
          />
        </div>
        <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest">
          {sessionsCompleted < 4 ? `${4 - sessionsCompleted} more to reach daily goal` : 'Daily goal achieved!'}
        </p>
      </div>
    </div>
  );
}
