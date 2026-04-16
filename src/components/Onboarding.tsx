import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, MessageSquare, Trophy, ChevronRight, X, Instagram } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

interface OnboardingProps {
  userId: string;
  onComplete: () => void;
}

const steps = [
  {
    title: 'Welcome to NoteVix!',
    description: 'The ultimate study companion for CBSE students. Let\'s quickly show you around.',
    icon: Sparkles,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10'
  },
  {
    title: 'Premium Notes',
    description: 'Access scientifically designed one-page notes and important questions for all subjects.',
    icon: BookOpen,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10'
  },
  {
    title: 'AI Doubt Solver',
    description: 'Stuck on a problem? Ask our AI Tutor anytime, anywhere. It\'s like having a personal teacher 24/7.',
    icon: MessageSquare,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10'
  },
  {
    title: 'Global Leaderboard',
    description: 'Compete with students across India. Top 3 students get tagged on our Instagram every Sunday!',
    icon: Trophy,
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10'
  },
  {
    title: 'Connect on Instagram',
    description: 'Share your Instagram handle so we can tag you when you top the leaderboard! (Optional)',
    icon: Instagram,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    isInput: true
  }
];

export function Onboarding({ userId, onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [instagram, setInstagram] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      try {
        await updateDoc(doc(db, 'users', userId), {
          onboardingCompleted: true,
          instagramUsername: instagram.trim() || null
        });
        onComplete();
      } catch (error) {
        console.error("Error completing onboarding:", error);
        toast.error("Failed to save. Try again!");
        onComplete(); // Still complete locally if DB fails
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 rounded-[40px] border-purple-500/30 relative overflow-hidden"
      >
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 blur-[80px] -z-10" />
        
        <button 
          onClick={handleNext}
          className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="space-y-8 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className={`w-20 h-20 mx-auto rounded-3xl ${step.bgColor} flex items-center justify-center`}>
                <step.icon className={`w-10 h-10 ${step.color}`} />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-black tracking-tight">{step.title}</h2>
                <p className="text-gray-400 leading-relaxed">{step.description}</p>
              </div>

              {(step as any).isInput && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pt-2"
                >
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-purple-500 font-bold">@</div>
                    <input 
                      type="text" 
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="username"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:outline-none focus:border-purple-500 transition-all outline-none"
                      autoFocus
                    />
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-center gap-2">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-8 bg-purple-500' : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="w-full py-4 purple-gradient rounded-2xl font-black text-lg shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
