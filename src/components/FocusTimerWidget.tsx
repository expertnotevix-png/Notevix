import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Timer as TimerIcon, Brain } from 'lucide-react';

export function FocusTimerWidget() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (mode === 'focus') {
        setMode('break');
        setTimeLeft(5 * 60);
      } else {
        setMode('focus');
        setTimeLeft(25 * 60);
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-6 rounded-3xl border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            {mode === 'focus' ? <Brain className="w-5 h-5 text-indigo-400" /> : <TimerIcon className="w-5 h-5 text-indigo-400" />}
          </div>
          <div>
            <h4 className="font-bold text-sm">Focus Session</h4>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              {mode === 'focus' ? 'Time to Study' : 'Take a Break'}
            </p>
          </div>
        </div>
        <div className="text-2xl font-mono font-bold text-indigo-400">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTimer}
          className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isActive ? 'bg-white text-black' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
          }`}
        >
          {isActive ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          {isActive ? 'Pause' : 'Start Focus'}
        </button>
        <button
          onClick={resetTimer}
          className="p-3 glass-card rounded-xl text-gray-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${(timeLeft / (mode === 'focus' ? 25 * 60 : 5 * 60)) * 100}%` }}
          className="h-full bg-indigo-500"
        />
      </div>
    </div>
  );
}
