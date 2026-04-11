import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical, Globe, Languages, Shield, Zap, Trophy, Users, ChevronRight, Star } from 'lucide-react';
import { Logo } from '../components/Logo';

const features = [
  {
    icon: Zap,
    title: 'One-Page Notes',
    description: 'Master complex topics in minutes with our scientifically designed one-page summaries. Perfect for last-minute revision.'
  },
  {
    icon: Trophy,
    title: 'Exam Oriented',
    description: 'Our content is curated by toppers and experts, focusing on the most important questions that actually appear in exams.'
  },
  {
    icon: Shield,
    title: 'AI Doubt Solving',
    description: 'Stuck on a problem? Our AI-powered tutor is available 24/7 to explain concepts and solve your doubts instantly.'
  }
];

const subjects = [
  { name: 'Mathematics', icon: BookOpen, color: 'text-blue-500' },
  { name: 'Science', icon: FlaskConical, color: 'text-green-500' },
  { name: 'Social Science', icon: Globe, color: 'text-orange-500' },
  { name: 'English', icon: Languages, color: 'text-pink-500' }
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-16 pb-24 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-purple-600/10 blur-[120px] -z-10" />
        
        <nav className="max-w-7xl mx-auto flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <Logo className="w-10 h-10" />
            <span className="text-xl font-black tracking-tighter">NOTEVIX</span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 glass-card rounded-xl text-sm font-bold hover:bg-white/10 transition-all active:scale-95"
          >
            Login
          </button>
        </nav>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest"
          >
            <Star className="w-4 h-4 fill-purple-400" />
            Trusted by 10,000+ Students
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]"
          >
            Master Your Exams with <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">NoteVix</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          >
            The ultimate study companion for CBSE Class 8, 9, and 10. Get premium one-page notes, important questions, and AI-powered doubt solving.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-10 py-4 purple-gradient rounded-2xl font-black text-lg shadow-2xl shadow-purple-500/40 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Start Studying Now
              <ChevronRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/about')}
              className="w-full sm:w-auto px-10 py-4 glass-card rounded-2xl font-bold text-lg hover:bg-white/10 transition-all active:scale-95"
            >
              Learn More
            </button>
          </motion.div>
        </div>
      </header>

      {/* Subjects Section */}
      <section className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">Comprehensive Coverage</h2>
            <p className="text-gray-500 max-w-xl mx-auto">We provide high-quality resources for all major subjects following the latest CBSE curriculum.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {subjects.map((subject, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="glass-card p-8 rounded-3xl text-center space-y-4 border-white/5"
              >
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center ${subject.color}`}>
                  <subject.icon className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg">{subject.name}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">Why Choose NoteVix?</h2>
            <p className="text-gray-500 max-w-xl mx-auto">We combine traditional learning methods with modern technology to give you the best study experience.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="glass-card p-10 rounded-[40px] space-y-6 border-white/5 hover:border-purple-500/30 transition-colors">
                <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                  <feature.icon className="w-7 h-7 text-purple-500" />
                </div>
                <h3 className="text-2xl font-black">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">How It Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Three simple steps to academic excellence.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up with your Google account and select your class (8, 9, or 10).' },
              { step: '02', title: 'Access Resources', desc: 'Browse through our extensive library of one-page notes and important questions.' },
              { step: '03', title: 'Track Progress', desc: 'Use our focus timer and daily streaks to stay motivated and consistent.' }
            ].map((item, i) => (
              <div key={i} className="space-y-4">
                <div className="text-5xl font-black text-purple-500/20">{item.step}</div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 bg-purple-600/5 border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          <div className="space-y-2">
            <div className="text-4xl font-black text-purple-500">10k+</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Active Students</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-black text-purple-500">500+</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Premium Notes</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-black text-purple-500">98%</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Success Rate</div>
          </div>
          <div className="space-y-2">
            <div className="text-4xl font-black text-purple-500">24/7</div>
            <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">AI Support</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <Logo className="w-8 h-8" />
              <span className="text-lg font-black tracking-tighter">NOTEVIX</span>
            </div>
            <p className="text-gray-500 max-w-sm leading-relaxed">
              NoteVix is dedicated to making quality education accessible to every student. Our mission is to simplify learning through technology and expert-curated content.
            </p>
          </div>
          
          <div className="space-y-6">
            <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Legal</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><button onClick={() => navigate('/privacy')} className="hover:text-purple-400">Privacy Policy</button></li>
              <li><button onClick={() => navigate('/terms')} className="hover:text-purple-400">Terms of Service</button></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Support</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><button onClick={() => navigate('/about')} className="hover:text-purple-400">About Us</button></li>
              <li><button onClick={() => navigate('/contact')} className="hover:text-purple-400">Contact Us</button></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-white/5 flex flex-col md:row items-center justify-between gap-4 text-gray-600 text-xs">
          <p>© 2026 NoteVix. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="https://instagram.com/studyhacks100" target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
            <a href="https://studysparks100" target="_blank" rel="noreferrer" className="hover:text-white">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
