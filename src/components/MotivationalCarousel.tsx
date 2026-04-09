import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, Quote, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    type: 'thought',
    icon: Quote,
    title: 'Motivational Thought',
    content: '"The secret of getting ahead is getting started." - Mark Twain',
    color: 'bg-purple-500/10',
    textColor: 'text-purple-400'
  },
  {
    type: 'tip',
    icon: Lightbulb,
    title: 'Study Tip',
    content: 'Use the Pomodoro Technique: Study for 25 mins, then take a 5 min break to keep your mind fresh.',
    color: 'bg-blue-500/10',
    textColor: 'text-blue-400'
  },
  {
    type: 'timetable',
    icon: Calendar,
    title: 'Ideal Study Timetable',
    content: '5 AM: Wake up | 6-8 AM: Hard Subjects | 4-6 PM: Practice | 8-10 PM: Revision',
    color: 'bg-green-500/10',
    textColor: 'text-green-400'
  },
  {
    type: 'thought',
    icon: Quote,
    title: 'Daily Motivation',
    content: '"Don\'t let what you cannot do interfere with what you can do." - John Wooden',
    color: 'bg-pink-500/10',
    textColor: 'text-pink-400'
  },
  {
    type: 'tip',
    icon: Lightbulb,
    title: 'Exam Hack',
    content: 'Solve previous year papers in a timed environment to build speed and confidence.',
    color: 'bg-orange-500/10',
    textColor: 'text-orange-400'
  }
];

export function MotivationalCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const current = slides[currentIndex];

  return (
    <div className="w-full my-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Daily Inspiration</h3>
        <div className="flex gap-2">
          <button onClick={prev} className="p-1 hover:bg-white/5 rounded-full transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={next} className="p-1 hover:bg-white/5 rounded-full transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="relative h-32 overflow-hidden rounded-3xl glass-card border border-white/5 shadow-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 p-5 flex items-center gap-4"
          >
            <div className={`w-14 h-14 ${current.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <current.icon className={`w-7 h-7 ${current.textColor}`} />
            </div>
            <div className="space-y-1">
              <h4 className={`text-[10px] font-bold uppercase tracking-wider ${current.textColor}`}>
                {current.title}
              </h4>
              <p className="text-sm font-medium leading-relaxed text-white/90">
                {current.content}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-4 bg-purple-500' : 'w-1 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
