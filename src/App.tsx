import { useState, useEffect, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { auth } from './components/firebase';
import { UserProfile } from './types';
import { dataBridge } from './services/dataBridge';
import { Toaster } from 'sonner';

// Lazy loaded pages
const Home = lazy(() => import('./pages/Home'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));
const Landing = lazy(() => import('./pages/Landing'));
const PremiumNotes = lazy(() => import('./pages/PremiumNotes'));
const ChapterList = lazy(() => import('./pages/ChapterList'));
const NoteView = lazy(() => import('./pages/NoteView'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Contact = lazy(() => import('./pages/Contact'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));

import BottomNav from './components/BottomNav';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center text-white">Something went wrong. Please reload.</div>;
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const isAdmin = ['expertraj8@gmail.com', 'expertnotevix@gmail.com'].includes(firebaseUser.email || '');
      const basicProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Student',
        photoURL: firebaseUser.photoURL || '',
        role: isAdmin ? 'admin' : 'student',
        isPremium: isAdmin,
        savedNotes: [],
        unlockedResources: [],
        createdAt: new Date().toISOString()
      };

      try {
        const supabaseProfile = await dataBridge.getProfile(firebaseUser.uid);
        if (supabaseProfile) {
          setUser({ ...basicProfile, ...supabaseProfile });
        } else {
          setUser(basicProfile);
        }
      } catch (err) {
        setUser(basicProfile);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white italic">Loading NoteVix...</div>;
  }

  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen bg-black text-white pb-20">
          <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-gray-500 uppercase tracking-widest text-[10px]">Loading...</div>}>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/" element={user ? <Home user={user} /> : <Landing />} />
              <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} />
              <Route path="/class/:classId/:subjectId" element={<ChapterList />} />
              <Route path="/note/:noteId" element={<NoteView user={user} setUser={setUser} />} />
              <Route path="/premium-notes" element={<PremiumNotes user={user} />} />
              <Route path="/admin" element={user?.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
              
              {/* Informational Pages */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/about" element={<AboutUs />} />
              <Route path="/contact" element={<Contact user={user} />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
          <BottomNav user={user} />
          <Toaster position="top-center" richColors theme="dark" />
        </div>
      </ErrorBoundary>
    </Router>
  );
}
