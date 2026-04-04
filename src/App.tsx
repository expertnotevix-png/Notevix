import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Student',
            photoURL: firebaseUser.photoURL || '',
            role: 'student',
            savedNotes: [],
            createdAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
