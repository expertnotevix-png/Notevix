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
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        setError("Login is taking too long. Please try the 'Redirect Method' below or check your internet.");
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      localStorage.setItem('referredBy', ref);
    }
  }, [searchParams]);

  const handleLogin = async (useRedirect = false) => {
    setLoading(true);
    setError(null);
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
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        setError(`This domain (${window.location.hostname}) is not authorized in Firebase. Please add it to "Authorized Domains" in Firebase Console.`);
      } else {
        setError(error.message || "Login failed. Please try the Redirect Method.");
      }
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
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-[10px] text-left">
                  <p className="font-bold mb-1">Login Error:</p>
                  <p>{error}</p>
                </div>
              )}
              <button
                onClick={() => handleLogin(false)}
                disabled={loading || !agreed}
                className="w-full purple-gradient text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-purple-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-gray-500"><span className="bg-black px-2">Having Trouble?</span></div>
              </div>

              <button
                onClick={() => handleLogin(true)}
                disabled={loading || !agreed}
                className="w-full bg-white/5 text-gray-400 font-medium py-3 px-6 rounded-2xl flex items-center justify-center gap-3 border border-white/10 active:scale-95 transition-transform hover:bg-white/10 disabled:opacity-50"
              >
                Try Redirect Method
              </button>
              <p className="text-[10px] text-gray-500">Use this if the popup doesn't open on your browser.</p>
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

        {window.location.hostname !== 'localhost' && !window.location.hostname.endsWith('.run.app') && (
          <div className="pt-4 text-[8px] text-gray-600 max-w-[200px] mx-auto">
            Using a custom domain? Ensure <b>{window.location.hostname}</b> is added to "Authorized Domains" in your Firebase Console.
          </div>
        )}
      </motion.div>
    </div>
  );
}
