import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs, addDoc, increment, orderBy, limit } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { auth, db, handleFirestoreError, OperationType, analytics } from './lib/firebase';
import { UserProfile } from './types';

// Pages
import Home from './pages/Home';
import Explore from './pages/Explore';
import Saved from './pages/Saved';
import Profile from './pages/Profile';
import Login from './pages/Login';
import ChapterList from './pages/ChapterList';
import NoteView from './pages/NoteView';
import FocusTimer from './pages/FocusTimer';
import Admin from './pages/Admin';
import Leaderboard from './pages/Leaderboard';
import Schedule from './pages/Schedule';
import Notifications from './pages/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import AboutUs from './pages/AboutUs';
import Contact from './pages/Contact';
import TermsOfService from './pages/TermsOfService';
import Landing from './pages/Landing';
import AIDoubtSolver from './pages/AIDoubtSolver';
import QuizGenerator from './pages/QuizGenerator';
import Summarizer from './pages/Summarizer';
import Community from './pages/Community';
import PostDetail from './pages/PostDetail';

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
      try {
        // 1. Ensure persistence is set first
        await setPersistence(auth, browserLocalPersistence);
        console.log("App: Persistence active");

        // 2. Handle redirect result
        console.log("App: Checking redirect result...");
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("App: Redirect login success:", result.user.email);
        }
      } catch (error: any) {
        console.error("App: Auth init error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          setLoadingError(`Domain Not Authorized: Please add "${window.location.hostname}" to Firebase.`);
        }
      }

      // 3. Listen for auth state
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        console.log("App: Auth state changed:", firebaseUser ? "User present" : "No user");
        
        try {
          if (firebaseUser) {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              setUser(userData);
              console.log("App: User profile loaded");
            } else {
              console.log("App: Creating new user document...");
              const referredBy = localStorage.getItem('referredBy');
              const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

              const newUser: UserProfile = {
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

              await setDoc(userRef, newUser);
              setUser(newUser);
            }

            if (unsubscribeUser) unsubscribeUser();
            unsubscribeUser = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                setUser(docSnap.data() as UserProfile);
              }
            });

          } else {
            setUser(null);
            if (unsubscribeUser) unsubscribeUser();
          }
        } catch (err: any) {
          console.error("App: Auth processing error:", err);
        } finally {
          setIsAuthReady(true);
          setLoading(false);
        }
      });

      return unsubscribeAuth;
    };

    const authPromise = initAuth();

    return () => {
      isMounted = false;
      authPromise.then(unsub => unsub && unsub());
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Real-time Community Notifications
  useEffect(() => {
    if (!user || user.notificationsEnabled === false) return;

    // Listen for new chat messages
    const chatQuery = query(
      collection(db, 'community_chat'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    let initialChatLoad = true;
    const unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
      if (initialChatLoad) {
        initialChatLoad = false;
        return;
      }
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          if (msg.userId !== user.uid) {
            toast.message('New Group Message', {
              description: `${msg.userName}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`,
              action: {
                label: 'View',
                onClick: () => window.location.href = '/community'
              },
            });
          }
        }
      });
    }, (error) => {
      console.warn("App chat notification listener error:", error);
    });

    // Listen for new questions
    const postsQuery = query(
      collection(db, 'posts'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    let initialPostsLoad = true;
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      if (initialPostsLoad) {
        initialPostsLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const post = change.doc.data();
          if (post.userId !== user.uid) {
            toast.message('New Question Asked', {
              description: `${post.title}`,
              action: {
                label: 'Help',
                onClick: () => window.location.href = `/community/post/${change.doc.id}`
              },
            });
          }
        }
      });
    }, (error) => {
      console.warn("App posts notification listener error:", error);
    });

    return () => {
      unsubscribeChat();
      unsubscribePosts();
    };
  }, [user?.uid, user?.notificationsEnabled]);

  // Global Time Tracking (1 min = 10 points) + Activity Tracking
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

    const interval = setInterval(() => {
      const userRef = doc(db, 'users', user.uid);
      const updates: any = {
        lastActive: new Date().toISOString()
      };

      if (user.role !== 'admin') {
        updates.totalFocusMinutes = increment(1);
        updates.totalPoints = increment(10);
      }

      updateDoc(userRef, updates).catch(err => console.error("Global tracking failed:", err));
    }, 60000); // Every minute

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
        
        <div className="mt-12 pt-12 border-t border-white/5">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4">Taking too long?</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="text-purple-500 text-xs font-bold hover:underline"
          >
            Go to Login Page
          </button>
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
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest py-1 text-center sticky top-0 z-[100]"
            >
              You are offline. Some features may not work.
            </motion.div>
          )}
        </AnimatePresence>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          
          <Route path="/" element={user ? <Home user={user} /> : <Landing />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/leaderboard" element={<Leaderboard user={user} />} />
          <Route path="/schedule" element={user ? <Schedule user={user} /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={user ? <Notifications user={user} /> : <Navigate to="/login" />} />
          <Route path="/saved" element={user ? <Saved user={user} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
          
          <Route path="/class/:classId/:subjectId" element={user ? <ChapterList /> : <Navigate to="/login" />} />
          <Route path="/note/:noteId" element={user ? <NoteView user={user} /> : <Navigate to="/login" />} />
          <Route path="/focus" element={user ? <FocusTimer user={user} /> : <Navigate to="/login" />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<Contact user={user} />} />
          <Route path="/terms" element={<TermsOfService />} />
          
          <Route path="/ai-doubts" element={user ? <AIDoubtSolver /> : <Navigate to="/login" />} />
          <Route path="/ai-quiz" element={user ? <QuizGenerator /> : <Navigate to="/login" />} />
          <Route path="/ai-summarizer" element={user ? <Summarizer /> : <Navigate to="/login" />} />
          
          <Route path="/community" element={<Community user={user} />} />
          <Route path="/community/post/:postId" element={<PostDetail user={user} />} />
          
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
        </Routes>
        
        <BottomNav user={user} />
        <FloatingChatbot />
        <Toaster position="top-center" expand={true} richColors theme="dark" />
      </div>
    </Router>
  );
}
