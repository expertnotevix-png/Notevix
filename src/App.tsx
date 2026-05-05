import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs, addDoc, increment, orderBy, limit } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { auth, db, handleFirestoreError, OperationType, analytics, checkQuotaLock, listenToQuotaLock, setQuotaLock } from './components/firebase';
import { UserProfile } from './types';
import { dataBridge } from './services/dataBridge';
import { Zap } from 'lucide-react';

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
        const isAdmin = firebaseUser.email === 'expertraj8@gmail.com';
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
          referralCode: 'SYNCING',
          referralCount: 0,
          isPremium: isAdmin, // Admin is always premium
          createdAt: new Date().toISOString(),
          streak: { currentCount: 0, lastUpdateDate: '' }
        };

        setUser(basicProfile);
        setIsAuthReady(true); // Allow components to render immediately
        setLoading(false);

        // SYNC TO SUPABASE
        dataBridge.syncProfile(firebaseUser.uid, basicProfile).catch(e => console.warn("Supabase initial sync deferred", e));

        try {
          // Check Supabase profile first
          const supabaseProfile = await dataBridge.getProfile(firebaseUser.uid);
          if (supabaseProfile && isMounted) {
            const mergedProfile = { ...basicProfile, ...supabaseProfile };
            setUser(mergedProfile);
            localStorage.setItem(CACHED_USER_KEY, JSON.stringify(mergedProfile));
            localStorage.setItem(CACHED_USER_KEY + '_time', Date.now().toString());
          }

          if (false) {
            console.log("App: Profile update skipped (quota locked)");
            return;
          }

          const userRef = doc(db, 'users', firebaseUser.uid);
          let userData: UserProfile | null = null;
          
          // Task 2: Cache-first profile loading (10 min expiry)
          const cached = localStorage.getItem(CACHED_USER_KEY);
          const cachedTime = localStorage.getItem(CACHED_USER_KEY + '_time');
          const isCacheValid = cached && cachedTime && (Date.now() - parseInt(cachedTime) < 10 * 60 * 1000);

          if (isCacheValid) {
            userData = JSON.parse(cached);
            setUser(userData);
            setIsAuthReady(true);
            setLoading(false);
          }
          
          try {
            // ALWAYS check Supabase first if available (immediate truth for payments)
            const isPremiumSupabase = await dataBridge.checkPremiumStatus(firebaseUser.uid, firebaseUser.email);
            const isPremium = isPremiumSupabase || isAdmin;

            if (quotaLockRef.current) {
              if (userData) {
                userData.isPremium = isPremium || userData.isPremium;
                setUser(userData);
              } else {
                setUser({ uid: firebaseUser.uid, email: firebaseUser.email, isPremium, role: isAdmin ? 'admin' : 'student' } as any);
              }
              setIsAuthReady(true);
              setLoading(false);
              return;
            }

            // If cache invalid or not present, fetch from server (Firestore)
            if (!isCacheValid) {
              const userDoc = await getDoc(userRef);
              
              if (userDoc.exists()) {
                userData = userDoc.data() as UserProfile;
                
                // Sync premium status from Supabase truth to Firestore profile if needed
                if (!userData.isPremium && isPremium) {
                  userData.isPremium = true;
                  if (!quotaLockRef.current) updateDoc(userRef, { isPremium: true }).catch(() => {});
                }
                
                // Ensure isAdmin is set
                if (isAdmin) userData.isPremium = true;

                localStorage.setItem(CACHED_USER_KEY, JSON.stringify(userData));
                localStorage.setItem(CACHED_USER_KEY + '_time', Date.now().toString());
                
                // Streak Logic (Crucial so we only do this once a day)
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
                  
                  // Sync to Supabase
                  dataBridge.updateStreak(firebaseUser.uid, newCount);
                  
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
                localStorage.setItem(CACHED_USER_KEY + '_time', Date.now().toString());
              }
            }
          } catch (docError: any) {
            const isQuotaError = docError.message?.toLowerCase().includes('quota') || 
                                docError.message?.toLowerCase().includes('lockout active');
                                
            if (!isQuotaError) {
              console.error("App: Firestore error fetching profile:", docError);
            }
            
            const cached = localStorage.getItem(CACHED_USER_KEY);
            if (cached) {
              userData = JSON.parse(cached);
            } else {
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
          } else if (firebaseUser) {
            // Task 3: Emergency fallback Profile if Firestore is Down & No Cache
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Student',
              photoURL: firebaseUser.photoURL || '',
              role: firebaseUser.email === 'expertraj8@gmail.com' ? 'admin' : 'student',
              savedNotes: [],
              notificationsEnabled: true,
              totalFocusMinutes: 0,
              totalPoints: 0,
              referralCode: 'OFFLINE',
              referralCount: 0,
              isPremium: false,
              createdAt: new Date().toISOString(),
              streak: { currentCount: 0, lastUpdateDate: '' }
            };
            setUser(fallbackProfile);
            if (quotaLockRef.current) {
              // Removed toast to avoid annoying users during quota periods
            }
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
                window.localStorage.clear();
                window.sessionStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
            >
              Emergency Fix (Clear Cache)
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
            <Route path="/leaderboard" element={<Leaderboard user={user} />} />
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
    </Router>
  );
}
