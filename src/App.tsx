import { useState, useEffect, lazy, Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { auth } from './components/firebase';
import { AppUser } from './types';
import { dataBridge } from './services/dataBridge';
import { Toaster, toast } from 'sonner';

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

function PaymentNotifier({ user }: { user: AppUser }) {
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    const checkPayments = async () => {
      const savedUserId = localStorage.getItem('last_payment_user_id') || user.uid;
      if (!savedUserId && !user.email) return;

      const payments = await dataBridge.getUserPayments(savedUserId, user.email);
      const approvedPayments = payments.filter(p => p.approved && p.unlock_password);

      const notified = JSON.parse(localStorage.getItem('notified_payments') || '[]');
      let newNotified = false;
      
      approvedPayments.forEach(p => {
        if (!notified.includes(p.id)) {
          toast.success(`Payment Approved!`, {
            description: `Your PDF password for ${p.product_name} is: ${p.unlock_password}`,
            duration: 15000,
          });
          notified.push(p.id);
          newNotified = true;
        }
      });

      if (newNotified) {
        localStorage.setItem('notified_payments', JSON.stringify(notified));
      }
    };

    const firstCheck = setTimeout(checkPayments, 2000);
    const interval = setInterval(checkPayments, 30000);
    return () => {
      clearTimeout(firstCheck);
      clearInterval(interval);
    };
  }, [user]);

  return null;
}

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

import { useLocation } from 'react-router-dom';

function AppLayout({ user, setUser, children }: { user: any, setUser: any, children: ReactNode }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className={`min-h-screen bg-black text-white ${isAdmin ? '' : 'pb-20'}`}>
      {user && <PaymentNotifier user={user} />}
      <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-gray-500 uppercase tracking-widest text-[10px]">Loading...</div>}>
        {children}
      </Suspense>
      {!isAdmin && <BottomNav user={user} />}
      <Toaster position="top-center" richColors theme="dark" />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence);
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const isAdminEmail = ['expertraj8@gmail.com', 'expertnotevix@gmail.com'].includes(firebaseUser.email || '');
      const currentUser: AppUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Student',
        photoURL: firebaseUser.photoURL || '',
        role: isAdminEmail ? 'admin' : 'student',
        phone: firebaseUser.phoneNumber || undefined,
      };
      
      setUser(currentUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white italic">Loading NoteVix...</div>;
  }

  return (
    <Router>
      <ErrorBoundary>
        <AppLayout user={user} setUser={setUser}>
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
        </AppLayout>
      </ErrorBoundary>
    </Router>
  );
}
