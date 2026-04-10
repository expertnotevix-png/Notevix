import { useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider, analytics } from '../lib/firebase';
import { logEvent } from 'firebase/analytics';
import { motion } from 'motion/react';
import { LogIn, Loader2, Check } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Link, useSearchParams } from 'react-router-dom';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referredBy', ref);
    }
  }, [searchParams]);

  const handleLogin = async (useRedirect = false) => {
    setLoading(true);
    try {
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        // Log login event
        analytics.then(a => {
          if (a) logEvent(a, 'login', { method: 'Google' });
        });
      }
    } catch (error: any) {
      setLoading(false);
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 max-w-sm w-full"
      >
        <div className="space-y-4">
          <Logo className="w-24 h-24 mx-auto shadow-2xl shadow-purple-500/20" />
          <h1 className="text-4xl font-bold tracking-tight">NoteVix</h1>
          <p className="text-gray-400">Premium one-page notes for Class 8-10 toppers.</p>
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-3 text-left px-2">
            <button 
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 w-5 h-5 rounded-md border transition-all flex items-center justify-center flex-shrink-0 ${
                agreed ? 'bg-purple-600 border-purple-600' : 'border-white/20 bg-white/5'
              }`}
            >
              {agreed && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            <p className="text-xs text-gray-400 leading-relaxed">
              I agree to the <Link to="/terms" className="text-purple-400 hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-purple-400 hover:underline">Privacy Policy</Link>.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => handleLogin(false)}
              disabled={loading || !agreed}
              className="w-full purple-gradient text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-purple-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Continue with Google
            </button>

            <button
              onClick={() => handleLogin(true)}
              disabled={loading || !agreed}
              className="w-full bg-white/5 text-gray-300 font-medium py-3 px-6 rounded-2xl flex items-center justify-center gap-3 border border-white/10 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trouble? Use Redirect Method
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8">
          {[
            { label: 'CBSE', sub: 'Focused' },
            { label: '1 Page', sub: 'Notes' },
            { label: 'AI', sub: 'Doubts' },
          ].map((item) => (
            <div key={item.label} className="glass-card p-3 rounded-xl">
              <div className="text-purple-400 font-bold">{item.label}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-widest text-gray-500">
          <Link to="/about" className="hover:text-purple-400 transition-colors">About Us</Link>
          <Link to="/contact" className="hover:text-purple-400 transition-colors">Contact Us</Link>
          <Link to="/privacy" className="hover:text-purple-400 transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-purple-400 transition-colors">Terms</Link>
        </div>
      </motion.div>
    </div>
  );
}
