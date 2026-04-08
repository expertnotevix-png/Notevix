import { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { motion } from 'motion/react';
import { LogIn, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function Login() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (useRedirect = false) => {
    setLoading(true);
    try {
      if (useRedirect) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      setLoading(false);
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("The login popup was blocked by your browser. Please allow popups or try the 'Redirect' method below.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("This domain is not authorized for Google Sign-in. Please add this URL to your Firebase Console 'Authorized Domains'.");
      } else {
        alert("Login failed. Please check your internet connection or try the 'Redirect' method.");
      }
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

        <div className="space-y-4">
          <button
            onClick={() => handleLogin(false)}
            disabled={loading}
            className="w-full purple-gradient text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-purple-500/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Continue with Google
          </button>

          <button
            onClick={() => handleLogin(true)}
            disabled={loading}
            className="w-full bg-white/5 text-gray-300 font-medium py-3 px-6 rounded-2xl flex items-center justify-center gap-3 border border-white/10 active:scale-95 transition-transform disabled:opacity-50"
          >
            Trouble? Use Redirect Method
          </button>
          
          <p className="text-xs text-gray-500 px-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
          
          <div className="pt-4 text-[10px] text-gray-600 space-y-1">
            <p>Having trouble? Ensure popups are enabled and third-party cookies are allowed for Firebase.</p>
            <p className="break-all">Add <span className="font-mono text-purple-400">notevix.pages.dev</span> and <span className="font-mono text-purple-400">{window.location.origin}</span> to Firebase Authorized Domains.</p>
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
      </motion.div>
    </div>
  );
}
