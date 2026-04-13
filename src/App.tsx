import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
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
    // Root Fix: Handle redirect result immediately on mount
    const handleRedirect = async () => {
      try {
        if (!auth) {
          console.warn("Auth not yet initialized for redirect check");
          return;
        }
        console.log("Checking for redirect result...");
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Redirect login successful for:", result.user.email);
          // Analytics is non-blocking
          analytics.then(a => {
            if (a) logEvent(a, 'login', { method: 'Google_Redirect' });
          }).catch(() => {});
        }
      } catch (error: any) {
        console.error("Redirect login failed:", error);
        if (error.code === 'auth/unauthorized-domain') {
          setLoadingError(`Domain Not Authorized: Please add "${window.location.hostname}" to Authorized Domains in Firebase Console.`);
        } else if (error.code !== 'auth/popup-closed-by-user') {
          // Don't show error for user cancellation, but log others
          console.warn("Auth redirect error handled:", error.message);
        }
      } finally {
        // Always ensure loading is cleared if we were waiting for a redirect
        if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
          setLoading(false);
        }
      }
    };

    handleRedirect();

    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log("Auth state: User logged in", firebaseUser.email);
          const userRef = doc(db, 'users', firebaseUser.uid);
          
          // Use a promise to wait for the first valid snapshot
          const waitForUser = new Promise<void>((resolve) => {
            unsubscribeUser = onSnapshot(userRef, async (docSnap) => {
              if (docSnap.exists()) {
                const userData = docSnap.data() as UserProfile;
                
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
                  
                  updateDoc(userRef, {
                    'streak.currentCount': newCount,
                    'streak.lastUpdateDate': today
                  }).catch(err => console.warn("Streak update failed:", err));
                }

                // Admin promotion
                if (firebaseUser.email === 'expertraj8@gmail.com' && userData.role !== 'admin') {
                  updateDoc(userRef, { role: 'admin' }).catch(() => {});
                }

                setUser(userData);

                // Initialize Community Stats if missing
                const statsRef = doc(db, 'community_stats', 'global');
                getDoc(statsRef).then(sSnap => {
                  if (!sSnap.exists()) {
                    setDoc(statsRef, {
                      totalQuestions: 0,
                      totalAnswers: 0,
                      totalStudents: 1,
                      solvedToday: 0,
                      lastResetDate: new Date().toISOString().split('T')[0]
                    });
                  }
                }).catch(() => {});

                // Client-side notification trigger
                const lastNotifDate = localStorage.getItem('last_daily_notif');
                if (lastNotifDate !== today) {
                  const checkDailyNotifs = async () => {
                    if (userData.streak?.currentCount > 0) {
                      await addDoc(collection(db, 'notifications'), {
                        userId: userData.uid,
                        title: 'Daily Streak Update',
                        message: `You are on a ${userData.streak.currentCount} day streak! Keep it up!`,
                        type: 'streak',
                        read: false,
                        timestamp: new Date().toISOString()
                      });
                    }
                    localStorage.setItem('last_daily_notif', today);
                  };
                  checkDailyNotifs().catch(() => {});
                }

                // Sync to leaderboard
                const leaderboardRef = doc(db, 'leaderboard', userData.uid);
                setDoc(leaderboardRef, {
                  uid: userData.uid,
                  displayName: userData.displayName,
                  photoURL: userData.photoURL,
                  totalFocusMinutes: userData.totalFocusMinutes || 0,
                  totalPoints: userData.totalPoints || 0,
                  class: userData.class || '?'
                }, { merge: true }).catch(() => {});

                resolve();
              } else {
                // Document doesn't exist yet, we'll handle creation below
                console.log("User document does not exist, creating...");
                resolve(); 
              }
            }, (error) => {
              console.error("User snapshot error:", error);
              resolve();
            });
          });

          // Check if we need to create the user
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
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
              streak: {
                currentCount: 1,
                lastUpdateDate: new Date().toISOString().split('T')[0],
              },
              totalFocusMinutes: 0,
              totalPoints: 0,
              referralCode,
              referredBy: referredBy || undefined,
              referralCount: 0,
              isPremium: false,
              createdAt: new Date().toISOString(),
            };

            try {
              await setDoc(userRef, newUser);
              console.log("New user document created successfully");
              
              // Non-blocking stats update
              setDoc(doc(db, 'community_stats', 'global'), {
                totalStudents: increment(1)
              }, { merge: true }).catch(() => {});

              if (referredBy) {
                const qReferrer = query(collection(db, 'users'), where('referralCode', '==', referredBy));
                getDocs(qReferrer).then(snap => {
                  if (!snap.empty) {
                    const refDoc = snap.docs[0];
                    const newCount = (refDoc.data().referralCount || 0) + 1;
                    updateDoc(doc(db, 'users', refDoc.id), {
                      referralCount: newCount,
                      isPremium: newCount >= 3
                    }).catch(() => {});
                  }
                }).catch(() => {});
                localStorage.removeItem('referredBy');
              }
            } catch (error) {
              console.error("Critical: Failed to create user document:", error);
              setLoadingError("We couldn't set up your profile. Please check your internet and try again.");
            }
          }

          await waitForUser;
        } else {
          setUser(null);
          if (unsubscribeUser) unsubscribeUser();
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
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
    });

    return () => {
      unsubscribeChat();
      unsubscribePosts();
    };
  }, [user?.uid, user?.notificationsEnabled]);

  // Global Time Tracking (1 min = 10 points)
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    const interval = setInterval(() => {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, {
        totalFocusMinutes: increment(1),
        totalPoints: increment(10)
      }).catch(err => console.error("Global time tracking failed:", err));
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mb-6"
        />
        <h2 className="text-lg font-bold text-white/90">Loading NoteVix...</h2>
        <p className="text-gray-500 text-sm mt-2 max-w-xs">Preparing your study session</p>
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
