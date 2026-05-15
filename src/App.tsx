import { useState, useEffect, useRef, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs, addDoc, increment, orderBy, limit } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { auth, db, handleFirestoreError, OperationType, analytics, checkQuotaLock, listenToQuotaLock, setQuotaLock } from './components/firebase';
import { UserProfile } from './types';
import { dataBridge } from './services/dataBridge';
import { supabase } from './lib/supabase';
import { Zap } from 'lucide-react';

const CACHED_USER_KEY = 'notevix_user_profile_v1';

const lazyWithRetry = (componentImport: () => Promise<any>, retriesLeft = 2) => 
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      if (retriesLeft > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return (lazyWithRetry(componentImport, retriesLeft - 1) as any)._result;
      }
      console.error("Lazy load failed after retries:", error);
      throw error;
    }
  });

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error at ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "";
      const isChunkError = errorMsg.includes("Failed to fetch dynamically imported module") || 
                           errorMsg.includes("Loading chunk");

      return this.props.fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-black overflow-y-auto">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tighter">Something went wrong</h2>
          <p className="text-gray-400 text-sm mt-2 mb-8 max-w-xs leading-relaxed">
            {isChunkError 
              ? "We couldn't load some parts of the app. This usually happens after an update."
              : "An unexpected error occurred in NoteVix."}
          </p>
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-purple-600/20 active:scale-95 transition-all"
            >
              Reload Page
            </button>
            
            <button 
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-white/5 transition-all"
            >
              Emergency Fix (Refresh)
            </button>
          </div>

          <div className="mt-12 p-4 bg-white/5 rounded-xl border border-white/5 w-full max-w-sm">
            <p className="text-[9px] text-gray-600 font-mono text-left break-all">
              Error: {this.state.error?.message || "Unknown"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Pages - Lazy loaded for performance
import PremiumNotes from './pages/PremiumNotes';
const Articles = lazyWithRetry(() => import('./pages/Articles'));
const ArticleDetail = lazyWithRetry(() => import('./pages/ArticleDetail'));
const Disclaimer = lazyWithRetry(() => import('./pages/Disclaimer'));

const Home = lazyWithRetry(() => import('./pages/Home'));
const Explore = lazyWithRetry(() => import('./pages/Explore'));
const Saved = lazyWithRetry(() => import('./pages/Saved'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const ChapterList = lazyWithRetry(() => import('./pages/ChapterList'));
const NoteView = lazyWithRetry(() => import('./pages/NoteView'));
const Admin = lazyWithRetry(() => import('./pages/Admin'));
const Schedule = lazyWithRetry(() => import('./pages/Schedule'));
const Notifications = lazyWithRetry(() => import('./pages/Notifications'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const AboutUs = lazyWithRetry(() => import('./pages/AboutUs'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const Landing = lazyWithRetry(() => import('./pages/Landing'));
const AIDoubtSolver = lazyWithRetry(() => import('./pages/AIDoubtSolver'));
const QuizGenerator = lazyWithRetry(() => import('./pages/QuizGenerator'));
const Summarizer = lazyWithRetry(() => import('./pages/Summarizer'));
const Community = lazyWithRetry(() => import('./pages/Community'));
const PostDetail = lazyWithRetry(() => import('./pages/PostDetail'));

// Components
import BottomNav from './components/BottomNav';
import { FloatingChatbot } from './components/FloatingChatbot';
import PointsTracker from './components/PointsTracker';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isQuotaLocked, setIsQuotaLocked] = useState(false);
  const [isSupabaseMissing, setIsSupabaseMissing] = useState(!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY);
  const quotaLockRef = useRef<boolean>(false);

  useEffect(() => {
    // Clear legacy quota locks
    if (typeof window !== 'undefined') {
      localStorage.removeItem('firestore_quota_lockout');
    }
  }, []);

  useEffect(() => {
    // Safety timeout for loading state
    const timeout = setTimeout(() => {
      if (loading || !isAuthReady) {
        console.warn("App loading timed out - forcing load");
        setLoading(false);
        setIsAuthReady(true);
        // Don't set error here, just let it try to render what it can
      }
    }, 8000); // reduced to 8s for snappier fallback

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeUser: (() => void) | undefined;

    const initAuth = async () => {
      // Setup listener immediately to capture existing sessions
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        console.log("App: Auth state changed:", firebaseUser ? "User present" : "No user");
        
        if (!firebaseUser) {
          setUser(null);
          if (unsubscribeUser) unsubscribeUser();
          setIsAuthReady(true);
          setLoading(false);
          return;
        }

        // INSTANT ENTRY: Set basic user info immediately from Google account
        const isAdmin = ['expertraj8@gmail.com', 'expertnotevix@gmail.com'].includes(firebaseUser.email || '');
        const basicProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Student',
          photoURL: firebaseUser.photoURL || '',
          role: isAdmin ? 'admin' : 'student',
          savedNotes: [],
          notificationsEnabled: true,
          totalFocusMinutes: 0,
          totalPoints: 0,
          isPremium: isAdmin, // Admin is always premium
          unlockedResources: [],
          unlockedClasses: [],
          createdAt: new Date().toISOString(),
          streak: { currentCount: 0, lastUpdateDate: '' }
        };

        setUser(basicProfile);
        setIsAuthReady(true); // Allow components to render immediately
        setLoading(false);

        // 1. Load from Cache immediately for zero-latency startup
        const cached = localStorage.getItem(CACHED_USER_KEY);
        const cachedTime = localStorage.getItem(CACHED_USER_KEY + '_time');
        const isCacheValid = cached && cachedTime && (Date.now() - parseInt(cachedTime) < 10 * 60 * 1000);

        if (isCacheValid && isMounted) {
          try {
            const cachedData = JSON.parse(cached);
            setUser({ ...basicProfile, ...cachedData });
          } catch (e) {}
        }

        try {
          // Check Supabase profile (True source for payments)
          const supabaseProfile = await dataBridge.getProfile(firebaseUser.uid);
          if (supabaseProfile && isMounted) {
            const mergedProfile = { ...basicProfile, ...supabaseProfile };
            
            // FORCE ADMIN CHECK
            const isAdminSync = ['expertraj8@gmail.com', 'expertnotevix@gmail.com'].includes(firebaseUser.email || '');
            if (isAdminSync) {
              mergedProfile.role = 'admin';
              mergedProfile.isPremium = true;
            }

            setUser(mergedProfile);
            localStorage.setItem(CACHED_USER_KEY, JSON.stringify(mergedProfile));
            localStorage.setItem(CACHED_USER_KEY + '_time', Date.now().toString());

            // Cleanup legacy referral tracking
            localStorage.removeItem('referredBy');
            localStorage.removeItem('pendingReferralCode');

            // SYNC BACK TO SUPABASE (Ensure Supabase has the latest merged data from Firestore fallback)
            dataBridge.syncProfile(firebaseUser.uid, mergedProfile).catch(e => console.warn("Update sync failed:", e));
          }

          // Legacy / Fallback checks for premium status
          const isPremiumSupabase = await dataBridge.checkPremiumStatus(firebaseUser.uid, firebaseUser.email);
          const isPremium = isPremiumSupabase || isAdmin;

          if (isPremium && !basicProfile.isPremium) {
            setUser(current => current ? ({ ...current, isPremium: true }) : null);
          }
        } catch (err) {
          console.error("App: Auth sync error:", err);
        } finally {
          setIsAuthReady(true);
          setLoading(false);
        }
      });

      // Background tasks
      try {
        await setPersistence(auth, browserLocalPersistence);
        await getRedirectResult(auth).catch(e => console.warn("App: Redirect result check failed (common on mobile):", e));
      } catch (error: any) {
        console.error("App: Auth peripheral tasks error:", error);
      }

      return unsubscribeAuth;
    };

    const authPromise = initAuth();

    return () => {
      isMounted = false;
      authPromise.then(unsub => unsub && unsub());
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Real-time Community Notifications (Disabled to save quota)
  useEffect(() => {
    // We removed global listeners for chat/posts to minimize read units.
    // Students can check for updates by visiting the Community tab.
    return () => {};
  }, [user?.uid]);

  // Keep user ref up to date for interval
  const userRefForInterval = useRef(user);
  useEffect(() => {
    userRefForInterval.current = user;
  }, [user]);

  // Global Activity Tracking (Every 10 mins to save writes)
  useEffect(() => {
    if (!user) return;

    const updateActivity = () => {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        lastActive: new Date().toISOString()
      }).catch(() => {});
    };

    // Initial update
    updateActivity();

    const interval = setInterval(async () => {
      const currentUser = userRefForInterval.current;
      if (!currentUser) return;

      if (false) return;

      const userRef = doc(db, 'users', currentUser.uid);
      
      // Only sync lastActive periodically to save writes/reads
      try {
        await updateDoc(userRef, {
          lastActive: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Activity sync failed:", err);
      }
    }, 10 * 60 * 1000); // 10 minutes session tracking (was 1 min)

    return () => clearInterval(interval);
  }, [user?.uid]);

  if (loading && !isAuthReady && !loadingError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-6"
        />
        <h2 className="text-lg font-bold text-white/90">Loading NoteVix...</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-xs">Preparing your study session</p>
        
        <div className="mt-12 pt-12 border-t border-white/5 space-y-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">Taking too long?</p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                setLoading(false);
                setIsAuthReady(true);
              }}
              className="px-6 py-3 blue-purple-gradient rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 active:scale-95 transition-transform"
            >
              Skip Loading (Enter Now)
            </button>
            <button 
              onClick={() => {
                window.location.reload();
              }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
            >
              Force Refresh
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              className="text-purple-500 text-xs font-bold hover:underline"
            >
              Go to Login Page
            </button>
            <button 
              onClick={() => {
                auth.signOut();
                window.location.reload();
              }}
              className="text-gray-500 text-[10px] hover:text-white transition-colors"
            >
              Force Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-white">Connection Issue</h2>
        <p className="text-gray-400 text-sm mt-2 mb-8 max-w-xs">{loadingError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 purple-gradient rounded-xl font-bold active:scale-95 transition-transform"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white pb-20">
          <AnimatePresence mode="wait">
          </AnimatePresence>

          <Suspense fallback={
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-black">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Synchronizing...</p>
              </motion.div>
            </div>
          }>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              
              <Route path="/" element={user ? <Home user={user} /> : <Landing />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/schedule" element={user ? <Schedule user={user} /> : <Navigate to="/login" />} />
              <Route path="/notifications" element={user ? <Notifications user={user} /> : <Navigate to="/login" />} />
              <Route path="/saved" element={user ? <Saved user={user} /> : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} />
              
              <Route path="/class/:classId/:subjectId" element={<ChapterList />} />
              <Route path="/note/:noteId" element={<NoteView user={user} setUser={setUser} />} />
              <Route path="/premium-notes" element={<PremiumNotes user={user} />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<Contact user={user} />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/article/:id" element={<ArticleDetail />} />
              
              <Route path="/ai-doubts" element={user ? <AIDoubtSolver user={user} setUser={setUser} /> : <Navigate to="/login" />} />
              <Route path="/ai-quiz" element={user ? <QuizGenerator /> : <Navigate to="/login" />} />
              <Route path="/ai-summarizer" element={user ? <Summarizer /> : <Navigate to="/login" />} />
              
              <Route path="/community" element={<Community user={user} />} />
              <Route path="/community/post/:postId" element={<PostDetail user={user} />} />
              
              <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
            </Routes>
          </Suspense>
          
          <BottomNav user={user} />
          <FloatingChatbot />
          <Toaster position="top-center" expand={true} richColors theme="dark" />
        </div>
      </ErrorBoundary>
    </Router>
  );
}
