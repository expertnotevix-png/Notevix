import { useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider, analytics } from '../lib/firebase';
import { logEvent } from 'firebase/analytics';
import { motion } from 'motion/react';
import { LogIn, Loader2, Check, ExternalLink, Copy, Info } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Link, useSearchParams } from 'react-router-dom';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(() => localStorage.getItem('login_agreed') === 'true');
  const [copied, setCopied] = useState(false);
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

  const handleLogin = async (useRedirect = false) => {
    if (!agreed) return;
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
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-[11px] text-left space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <Info size={14} />
                    <span>Login Issue Detected</span>
                  </div>
                  <p>{error}</p>
                  
                  <div className="pt-2 border-t border-red-500/10 space-y-2">
                    <p className="font-bold text-white/90">Common Fixes:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-80">
                      <li>Enable "Third-party cookies" in Chrome settings</li>
                      <li>Open in Chrome/Safari (not Instagram/Telegram)</li>
                      <li>Try the "Redirect Method" below</li>
                    </ul>
                  </div>

                  <button 
                    onClick={checkStatus}
                    className="w-full bg-purple-500/20 text-purple-400 py-2 rounded-xl font-bold hover:bg-purple-500/30 transition-all"
                  >
                    Already signed in? Check Status
                  </button>
                </div>
              )}

              {isInAppBrowser && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-blue-400 text-[11px] text-left space-y-3">
                  <p className="font-bold">Instagram/Telegram detected! 📱</p>
                  <p>These apps often block login. For a smooth experience, please open NoteVix in your real browser (Chrome/Safari).</p>
                  <button 
                    onClick={copyLink}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border border-blue-500/30"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Link Copied!' : 'Copy Link to Open in Chrome'}
                  </button>
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
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-gray-500"><span className="bg-black px-2">Troubleshooting</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleLogin(true)}
                  disabled={loading || !agreed}
                  className="flex-1 bg-white/5 text-gray-400 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform hover:bg-white/10 text-[11px] disabled:opacity-50"
                >
                  Redirect Method
                </button>
                <button
                  onClick={checkStatus}
                  disabled={loading}
                  className="flex-1 bg-white/5 text-gray-400 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-transform hover:bg-white/10 text-[11px] disabled:opacity-50"
                >
                  Check Status
                </button>
              </div>
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
