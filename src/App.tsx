import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, query, collection, where, getDocs, addDoc, increment } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
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

// Components
import BottomNav from './components/BottomNav';
import { FloatingChatbot } from './components/FloatingChatbot';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result (for mobile/fallback)
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect login failed:", error);
    });

    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Initial fetch and setup
        const userRef = doc(db, 'users', firebaseUser.uid);
        let userDoc;
        try {
          userDoc = await getDoc(userRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          return;
        }
        
        if (!userDoc.exists()) {
          // Check for referral code in localStorage
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
            
            // If referred by someone, increment their count
            if (referredBy) {
              const qReferrer = query(collection(db, 'users'), where('referralCode', '==', referredBy));
              const referrerSnap = await getDocs(qReferrer);
              if (!referrerSnap.empty) {
                const referrerDoc = referrerSnap.docs[0];
                const newCount = (referrerDoc.data().referralCount || 0) + 1;
                await updateDoc(doc(db, 'users', referrerDoc.id), {
                  referralCount: newCount,
                  isPremium: newCount >= 3
                });
              }
              localStorage.removeItem('referredBy');
            }
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
          }
        }

        // Listen for real-time updates
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
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
              }).catch(err => console.error("Streak update failed:", err));
            }

            // Auto-promote admin if needed
            if (firebaseUser.email === 'expertraj8@gmail.com' && userData.role !== 'admin') {
              updateDoc(userRef, { role: 'admin' }).catch(err => 
                handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`)
              );
            }
            setUser(userData);

            // Client-side notification trigger (Demo/Prototype)
            const lastNotifDate = localStorage.getItem('last_daily_notif');
            if (lastNotifDate !== today) {
              const checkDailyNotifs = async () => {
                // Streak notification
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
                
                // Rank notification (simplified)
                await addDoc(collection(db, 'notifications'), {
                  userId: userData.uid,
                  title: 'Rank Maintenance',
                  message: 'Check the leaderboard to see your current rank and keep studying to stay on top!',
                  type: 'rank',
                  read: false,
                  timestamp: new Date().toISOString()
                });
                
                localStorage.setItem('last_daily_notif', today);
              };
              checkDailyNotifs().catch(err => console.error("Daily notif trigger failed:", err));
            }

            // Sync to leaderboard (public data)
            const leaderboardRef = doc(db, 'leaderboard', userData.uid);
            setDoc(leaderboardRef, {
              uid: userData.uid,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              totalFocusMinutes: userData.totalFocusMinutes || 0,
              totalPoints: userData.totalPoints || 0,
              class: userData.class || '?'
            }, { merge: true }).catch(err => console.error("Leaderboard sync failed:", err));
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });

      } else {
        setUser(null);
        if (unsubscribeUser) unsubscribeUser();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Global Time Tracking (1 min = 10 points)
  useEffect(() => {
    if (!user) return;

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-black text-white pb-20">
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
          
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
        </Routes>
        
        <BottomNav user={user} />
        <FloatingChatbot />
      </div>
    </Router>
  );
}
