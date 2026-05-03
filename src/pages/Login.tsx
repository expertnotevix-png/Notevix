import { useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider, analytics } from '../components/firebase';
import { logEvent } from 'firebase/analytics';
import { motion } from 'motion/react';
import { LogIn, Loader2, Check, ExternalLink, Copy, Info } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Link, useSearchParams } from 'react-router-dom';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(() => localStorage.getItem('login_agreed') !== 'false'); // Default to true if not explicitly false
  const [copied, setCopied] = useState(false);
  const [showAgreedError, setShowAgreedError] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    localStorage.setItem('login_agreed', agreed.toString());
  }, [agreed]);

  // Detect In-App Browsers (Instagram, FB, etc.)
  const isInAppBrowser = /Instagram|FBAN|FBAV|Twitter|Telegram/i.test(navigator.userAgent);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoading(false);
        setError("Login is taking too long. If you are on Instagram/Telegram, please use the 'Copy Link' button below to open in Chrome/Safari.");
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

  useEffect(() => {
    // If Android + In-App Browser, try to auto-trigger Chrome intent once
    if (isInAppBrowser && navigator.userAgent.includes('Android')) {
      const timer = setTimeout(() => {
        window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInAppBrowser]);

  const handleLogin = async (useRedirect = false) => {
    if (!agreed) {
      setShowAgreedError(true);
      setTimeout(() => setShowAgreedError(false), 3000);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Root Fix: Ensure persistence is set before any auth action
      await setPersistence(auth, browserLocalPersistence);

      // Change: Default to Popup even on mobile. 
      // Redirect often fails with "missing initial state" on mobile browsers that block 3rd party cookies.
      if (useRedirect) {
        console.log("Triggering Redirect Login...");
        await signInWithRedirect(auth, googleProvider);
      } else {
        console.log("Triggering Popup Login...");
        await signInWithPopup(auth, googleProvider);
        // If popup succeeds, the App.tsx listener will handle the rest
      }
    } catch (error: any) {
      setLoading(false);
      console.error("Login execution error:", error);
      
      if (error.code === 'auth/popup-closed-by-user') return;
      if (error.code === 'auth/cancelled-by-user') return;
      
      if (error.code === 'auth/unauthorized-domain') {
        setError(`Domain Not Authorized: Please add "${window.location.hostname}" to Authorized Domains in Firebase Console.`);
      } else if (error.code === 'auth/internal-error' || error.code === 'auth/network-request-failed') {
        setError("Connection Error: Your browser or network blocked the login. Try switching from Wi-Fi to Mobile Data.");
      } else if (error.message?.includes('missing initial state') || error.code === 'auth/web-storage-unsupported') {
        setError("Browser Error: 'Missing Initial State'. This happens when third-party cookies are blocked. Please use the 'Continue' button (Popup method) instead of Redirect.");
      } else if (error.message?.includes('third-party cookies')) {
        setError("Cookie Error: Your browser is blocking third-party cookies. Please enable them in Chrome Settings > Privacy > Cookies.");
      } else {
        setError(error.message || "Login failed. Please try again or use the Redirect Method.");
      }
    }
  };

  const checkStatus = () => {
    setLoading(true);
    setTimeout(() => {
      if (auth.currentUser) {
        window.location.href = '/';
      } else {
        setLoading(false);
        setError("You are not logged in yet. Please complete the Google sign-in process.");
      }
    }, 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-[10px] text-left space-y-2"
                >
                  <p className="font-bold flex items-center gap-2 uppercase tracking-widest"><Info size={12}/> Connection Failed</p>
                  <p>{error}</p>
                </motion.div>
              )}

              {isInAppBrowser && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl text-indigo-400 text-[10px] text-left space-y-3">
                  <p className="font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                    <ExternalLink size={14} /> Instagram Browser detected
                  </p>
                  <p>Google blocks sign-ins inside Instagram for your safety. To continue, click the button below to open NoteVix in your main browser.</p>
                  
                  <div className="flex flex-col gap-2">
                    {navigator.userAgent.includes('Android') ? (
                      <a 
                        href={`intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 text-[10px]"
                      >
                        Open in Chrome
                      </a>
                    ) : (
                      <button 
                        onClick={copyLink}
                        className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all border border-white/10 text-[10px]"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Link Copied!' : 'Copy Link for Safari'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div 
                  onClick={() => setAgreed(!agreed)}
                  className="flex items-start gap-3 cursor-pointer group p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    agreed ? 'bg-indigo-600 border-indigo-600' : 'border-white/20 group-hover:border-indigo-500/50'
                  }`}>
                    {agreed && <Check size={14} className="text-white" />}
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed text-left">
                    I agree to the <Link to="/terms" className="text-indigo-400 hover:underline" onClick={e => e.stopPropagation()}>Terms</Link> & <Link to="/privacy" className="text-indigo-400 hover:underline" onClick={e => e.stopPropagation()}>Privacy Policy</Link>
                  </p>
                </div>

                <button
                  onClick={() => handleLogin(isInAppBrowser)} // Auto-use redirect in in-app browser
                  disabled={loading}
                  className={`w-full font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all text-sm uppercase tracking-widest disabled:opacity-50 ${
                    agreed 
                      ? 'blue-purple-gradient text-white shadow-indigo-500/40 active:scale-95' 
                      : 'bg-white/10 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
                  Sign In with Google
                </button>
                
                {showAgreedError && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-[9px] font-black uppercase tracking-widest text-center"
                  >
                    Please agree to the terms first
                  </motion.p>
                )}
              </div>

              <div className="relative pt-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[9px] uppercase tracking-[0.2em] text-gray-600"><span className="bg-[#050505] px-4">Other Methods</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleLogin(true)}
                  disabled={loading}
                  className="flex-1 bg-white/5 text-gray-400 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/5 active:scale-95 transition-transform hover:bg-white/10 text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Redirect
                </button>
                <button
                  onClick={checkStatus}
                  disabled={loading}
                  className="flex-1 bg-white/5 text-gray-400 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/5 active:scale-95 transition-transform hover:bg-white/10 text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  Status
                </button>
              </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8">
          {[
            { label: 'CBSE', sub: 'Focused' },
            { label: '1 Page', sub: 'Notes' },
            { label: 'AI', sub: 'Doubts' },
          ].map((item) => (
            <div key={item.label} className="glass-card p-3 rounded-xl border border-white/5">
              <div className="text-indigo-400 font-bold">{item.label}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="pt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] uppercase tracking-widest text-gray-500">
          <Link to="/about" className="hover:text-indigo-400 transition-colors">About</Link>
          <Link to="/contact" className="hover:text-indigo-400 transition-colors">Support</Link>
          <Link to="/privacy" className="hover:text-indigo-400 transition-colors">Privacy</Link>
          <Link to="/terms" className="hover:text-indigo-400 transition-colors">Terms</Link>
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
