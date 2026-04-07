import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
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
import DoubtSolver from './pages/DoubtSolver';
import Admin from './pages/Admin';

// Components
import BottomNav from './components/BottomNav';
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
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Student',
            photoURL: firebaseUser.photoURL || '',
            role: firebaseUser.email === 'expertraj8@gmail.com' ? 'admin' : 'student',
            savedNotes: [],
            notificationsEnabled: true,
            studyModeEnabled: false,
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(userRef, newUser);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
          }
        }

        // Listen for real-time updates
        unsubscribeUser = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data() as UserProfile;
            // Auto-promote admin if needed
            if (firebaseUser.email === 'expertraj8@gmail.com' && userData.role !== 'admin') {
              updateDoc(userRef, { role: 'admin' }).catch(err => 
                handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`)
              );
            }
            setUser(userData);
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
          
          <Route path="/" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
          <Route path="/explore" element={user ? <Explore /> : <Navigate to="/login" />} />
          <Route path="/saved" element={user ? <Saved user={user} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
          
          <Route path="/class/:classId/:subjectId" element={user ? <ChapterList /> : <Navigate to="/login" />} />
          <Route path="/note/:noteId" element={user ? <NoteView user={user} /> : <Navigate to="/login" />} />
          <Route path="/doubt" element={user ? <DoubtSolver user={user} /> : <Navigate to="/login" />} />
          
          <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
        </Routes>
        
        {user && <BottomNav />}
      </div>
    </Router>
  );
}
