import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs, addDoc, increment, orderBy, limit } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { auth, db, handleFirestoreError, OperationType, analytics, checkQuotaLock, setQuotaLock } from './lib/firebase';
import { UserProfile } from './types';

const CACHED_USER_KEY = 'notevix_user_profile_v1';

// Pages - Lazy loaded for performance
const Articles = lazy(() => import('./pages/Articles'));
const ArticleDetail = lazy(() => import('./pages/ArticleDetail'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));

const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Saved = lazy(() => import('./pages/Saved'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const ChapterList = lazy(() => import('./pages/ChapterList'));
const NoteView = lazy(() => import('./pages/NoteView'));
const Admin = lazy(() => import('./pages/Admin'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Notifications = lazy(() => import('./pages/Notifications'));
const PremiumNotes = lazy(() => import('./pages/PremiumNotes'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Contact = lazy(() => import('./pages/Contact'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Landing = lazy(() => import('./pages/Landing'));
const AIDoubtSolver = lazy(() => import('./pages/AIDoubtSolver'));
const QuizGenerator = lazy(() => import('./pages/QuizGenerator'));
const Summarizer = lazy(() => import('./pages/Summarizer'));
const Community = lazy(() => import('./pages/Community'));
const PostDetail = lazy(() => import('./pages/PostDetail'));

// Components
import BottomNav from './components/BottomNav';
import { FloatingChatbot } from './components/FloatingChatbot';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const quotaLockRef = useRef<boolean>(false);

  useEffect(() => {
    // Check for existing quota lockout on mount
    if (checkQuotaLock()) {
      quotaLockRef.current = true;
      console.warn("App: Quota lockout active. Using cache only.");
    }
  }, []);

  useEffect(() => {
    // Safety timeout for loading state
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("App loading timed out after 12s");
        setLoading(false);
        setLoadingError("The app is taking longer than usual to load. Please check your connection or refresh.");
      }
    }, 12000);

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

        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          let userData: UserProfile | null = null;
          
          try {
            if (quotaLockRef.current) {
              throw new Error("Quota exceeded lockout active");
            }
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              userData = userDoc.data() as UserProfile;
              // Cache for quota protection
              localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData));
              
              // Streak Logic
              const today = new Date().toISOString().split('T')[0];
              const lastUpdate = userData.streak?.lastUpdateDate;
              
              if (lastUpdate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                let newCount = userData.streak?.currentCount || 0;
                if (lastUpdate === yesterdayStr) {
                  newCount += 1;
                } else {
                  newCount = 1; 
                }
                
                await updateDoc(userRef, {
                  'streak.currentCount': newCount,
                  'streak.lastUpdateDate': today
                }).catch(e => console.warn("Streak update failed:", e));
                userData.streak = { currentCount: newCount, lastUpdateDate: today };
                toast.success(`Welcome back! Your streak is now ${newCount} days! 🔥`);
                localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData));
              }
            } else {
              console.log("App: Creating new user document...");
              const referredBy = localStorage.getItem('referredBy');
              const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

              userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'Student',
                photoURL: firebaseUser.photoURL || '',
                role: firebaseUser.email === 'expertraj8@gmail.com' ? 'admin' : 'student',
                savedNotes: [],
                notificationsEnabled: true,
                studyModeEnabled: false,
                streak: { currentCount: 1, lastUpdateDate: new Date().toISOString().split('T')[0] },
                totalFocusMinutes: 0,
                totalPoints: 0,
                referralCode,
                referralCount: 0,
                isPremium: false,
                createdAt: new Date().toISOString(),
                ...(referredBy ? { referredBy } : {}),
              };

              await setDoc(userRef, userData);
              localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData));
            }
          } catch (docError: any) {
            const isQuotaError = docError.message?.toLowerCase().includes('quota') || 
                                docError.message?.toLowerCase().includes('lockout active');
            
            if (!isQuotaError) {
              console.error("App: Firestore error fetching profile:", docError);
            } else if (!quotaLockRef.current) {
              quotaLockRef.current = true;
            }

            const cached = localStorage.getItem(CACHED_USER_KEY);
            if (cached) {
              userData = JSON.parse(cached);
              if (isMounted) {
                toast.info("Using cached profile (Cloud limits reached)");
              }
            } else {
              if (isQuotaError) {
                toast.error("Cloud Quota Met: Accessing degraded mode.", {
                  duration: 6000,
                  id: 'quota-error'
                });
              }
              
              userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'Student',
                photoURL: firebaseUser.photoURL || '',
                role: firebaseUser.email === 'expertraj8@gmail.com' ? 'admin' : 'student',
                savedNotes: [],
                notificationsEnabled: true,
                totalFocusMinutes: 0,
                totalPoints: 0,
                referralCode: 'TEMP',
                referralCount: 0,
                isPremium: false,
                createdAt: new Date().toISOString(),
                streak: { currentCount: 0, lastUpdateDate: '' }
              };
            }
          }

          if (userData) {
            setUser(userData);
          }

        } catch (err: any) {
          console.error("App: Auth processing error:", err);
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

  // Global Time Tracking (5 min = 50 points) + Activity Tracking
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

      if (checkQuotaLock()) {
        console.warn("App: Quota lockout active. Skipping activity tracking sync.");
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      const updates: any = {
        lastActive: new Date().toISOString()
      };

      if (currentUser.role !== 'admin') {
        const pointGain = 10;
        const minuteGain = 1;

        const newFocusMinutes = (currentUser.totalFocusMinutes || 0) + minuteGain;
        const newPoints = (currentUser.totalPoints || 0) + pointGain;
        
        updates.totalFocusMinutes = increment(minuteGain);
        updates.totalPoints = increment(pointGain);

        // Update local state immediately
        setUser(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            totalFocusMinutes: newFocusMinutes,
            totalPoints: newPoints
          };
        });

        // Sync with Leaderboard - Use increment here too for multi-tab safety
        const leaderboardRef = doc(db, 'leaderboard', currentUser.uid);
        setDoc(leaderboardRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          totalPoints: increment(pointGain),
          totalFocusMinutes: increment(minuteGain),
          class: currentUser.class || '',
          streakCount: currentUser.streak?.currentCount || 0
        }, { merge: true }).catch(err => console.error("Leaderboard periodic sync failed:", err));
      }

      try {
        await updateDoc(userRef, updates);
      } catch (err) {
        console.error("Global tracking failed:", err);
      }
    }, 60000); // Now every 1 minute for better feedback (10 pts/min)

    return () => clearInterval(interval);
  }, [user?.uid]);

  if (loading || !isAuthReady) {
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
              Force Logout & Refresh
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
      <div className="min-h-screen bg-black text-white pb-20">
        <AnimatePresence mode="wait">
          {isOffline && (
            <motion.div
              key="offline-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest py-1 text-center sticky top-0 z-[100]"
            >
              You are offline. Some features may not work.
            </motion.div>
          )}
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
            <Route path="/leaderboard" element={<Leaderboard user={user} />} />
            <Route path="/schedule" element={user ? <Schedule user={user} /> : <Navigate to="/login" />} />
            <Route path="/notifications" element={user ? <Notifications user={user} /> : <Navigate to="/login" />} />
            <Route path="/saved" element={user ? <Saved user={user} /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
            
            <Route path="/class/:classId/:subjectId" element={<ChapterList />} />
            <Route path="/note/:noteId" element={<NoteView user={user} />} />
            <Route path="/premium-notes" element={user ? <PremiumNotes user={user} /> : <Navigate to="/login" />} />
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
    </Router>
  );
}
