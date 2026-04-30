import { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, query, where, limit, orderBy, onSnapshot, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, checkQuotaLock } from '../lib/firebase';
import { geminiService } from '../services/geminiService';
import { Chapter, Message, Notification, PurchaseRequest, UserProfile, ValidPayment, TransactionLedger } from '../types';
import { 
  Plus, Trash2, Edit2, Save, X, ChevronLeft, Database, 
  MessageSquare, Bell, Send, CheckCircle2, Clock, ShieldCheck,
  Shield, RefreshCw, CreditCard, Check, XCircle, Users, 
  Instagram, LayoutDashboard, BarChart3, Settings, Menu, LogOut, Search, TrendingUp, DollarSign, UserCheck,
  BookOpen, Zap, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ModerationTab from '../components/community/ModerationTab';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'chapters' | 'messages' | 'notifications' | 'moderation' | 'payments' | 'users' | 'registry' | 'resources' | 'valid_payments' | 'settings'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [subjectResources, setSubjectResources] = useState<any[]>([]);
  const [validPayments, setValidPayments] = useState<ValidPayment[]>([]);
  const [transactionLedger, setTransactionLedger] = useState<TransactionLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    salesCount: 0,
    dailyRevenue: [] as any[],
    planDistribution: [] as any[],
  });

  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'info' as const });

  useEffect(() => {
    if (checkQuotaLock()) {
      console.warn("Admin: Quota lockout active. Skipping data fetch.");
      setLoading(false);
      return;
    }
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'chapters') fetchChapters();
    if (activeTab === 'messages') fetchMessages();
    if (activeTab === 'notifications') fetchNotifications();
    if (activeTab === 'payments') fetchPurchaseRequests();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'registry') fetchRegistry();
    if (activeTab === 'resources') fetchSubjectResources();
    if (activeTab === 'valid_payments') {
      fetchValidPayments();
      fetchTransactionLedger();
    }
  }, [activeTab]);

  const fetchTransactionLedger = async () => {
    try {
      const q = query(collection(db, 'transaction_ledger'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setTransactionLedger(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionLedger)));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchValidPayments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'valid_payments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setValidPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ValidPayment)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addValidPayment = async () => {
    const txId = window.prompt("Enter Transaction ID (UTR):");
    const whatsapp = window.prompt("Enter WhatsApp Code/Phone:");
    const amount = window.prompt("Amount paid?");
    
    if (txId && whatsapp) {
      try {
        await addDoc(collection(db, 'valid_payments'), {
          transactionId: txId.trim(),
          whatsapp: whatsapp.trim(),
          amount: Number(amount) || 0,
          isUsed: false,
          createdAt: new Date().toISOString()
        });
        toast.success("Payment Whitelisted!");
        fetchValidPayments();
      } catch (e) {
        toast.error("Failed to add.");
      }
    }
  };

  const fetchSubjectResources = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'subject_resources'));
      setSubjectResources(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchase_requests'), where('status', '==', 'approved'), orderBy('timestamp', 'desc'), limit(500));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => d.data());
      
      let total = 0;
      const dailyMap: Record<string, number> = {};
      const planMap: Record<string, number> = {};

      docs.forEach((d: any) => {
        const amt = Number(d.amount) || 0;
        total += amt;
        
        const date = d.timestamp?.toDate ? d.timestamp.toDate().toLocaleDateString() : new Date(d.timestamp).toLocaleDateString();
        dailyMap[date] = (dailyMap[date] || 0) + amt;
        
        const plan = d.planName || 'Unknown';
        planMap[plan] = (planMap[plan] || 0) + 1;
      });

      const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).reverse().slice(-7);
      const planDistribution = Object.entries(planMap).map(([name, value]) => ({ name, value }));

      setAnalyticsData({
        totalRevenue: total,
        salesCount: docs.length,
        dailyRevenue,
        planDistribution
      });
    } catch (error) {
      console.error("Analytics fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistry = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'transaction_id_registry'), orderBy('usedAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setRegistry(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState<Partial<Chapter>>({
    class: '10',
    subject: 'maths',
    title: '',
    summary: '',
    keyPoints: [],
    formulas: [],
    importantQuestions: [],
    isPremium: false,
  });

  useEffect(() => {
    fetchChapters();
    autoSeedResources();
  }, []);

  const autoSeedResources = async () => {
    try {
      const q = query(collection(db, 'subject_resources'), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log("Auto-seeding subject resources...");
        await addSampleData();
      }
    } catch (err) {
      console.warn("Admin: Auto-seeding check failed (likely quota):", err);
    }
  };

  const [activeUsers, setActiveUsers] = useState(0);
  const [aiStatus, setAiStatus] = useState<{ status: 'checking' | 'ok' | 'error', message?: string }>({ status: 'checking' });

  useEffect(() => {
    // Check for active users (One-time fetch to save quota)
    const checkActiveUsers = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const q = query(
          collection(db, 'users'),
          where('lastActive', '>=', fiveMinutesAgo)
        );
        const snapshot = await getCountFromServer(q);
        setActiveUsers(snapshot.data().count);
      } catch (error) {
        console.warn("Active users check error:", error);
      }
    };

    checkActiveUsers();
    // Re-check every 5 minutes if tab is active
    const interval = setInterval(checkActiveUsers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initial check: just verify key presence without calling API to save quota
    const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      setAiStatus({ status: 'error', message: 'API Key Missing' });
    } else {
      setAiStatus({ status: 'ok', message: 'Key Configured' });
    }
  }, []);

  const testAI = async () => {
    setAiStatus({ status: 'checking', message: 'Testing...' });
    try {
      // Test with a tiny prompt
      await geminiService.chatWithBot("hi", []);
      setAiStatus({ status: 'ok', message: 'AI Online' });
    } catch (err: any) {
      setAiStatus({ status: 'error', message: err.message || 'AI Offline' });
    }
  };

  const fetchChapters = async () => {
    const querySnapshot = await getDocs(collection(db, 'chapters'));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
    setChapters(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'chapters'), formData);
      setIsAdding(false);
      setFormData({
        class: '10',
        subject: 'maths',
        title: '',
        summary: '',
        keyPoints: [],
        formulas: [],
        importantQuestions: [],
        isPremium: false,
      });
      fetchChapters();
    } catch (error) {
      console.error("Error adding chapter:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this chapter?")) {
      await deleteDoc(doc(db, 'chapters', id));
      fetchChapters();
    }
  };

  const addSampleData = async () => {
    const chapterSamples = [
      {
        class: '9',
        subject: 'maths',
        title: 'Number Systems',
        summary: 'Introduction to real numbers.',
        keyPoints: ['Rational numbers', 'Irrational numbers', 'Real numbers'],
        formulas: [],
        importantQuestions: [{ question: 'Is zero a rational number?', answer: 'Yes.' }],
        isPremium: false
      }
    ];

    for (const sample of chapterSamples) {
      const q = query(collection(db, 'chapters'), where('title', '==', sample.title), where('class', '==', sample.class));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'chapters'), sample);
      }
    }

    toast.success("Chapter samples synchronized!");
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(data);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseRequests = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'purchase_requests'), orderBy('timestamp', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRequest));
      setPurchaseRequests(data);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.LIST, 'purchase_requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePurchase = async (req: PurchaseRequest) => {
    try {
      // 1. Reference the user document directly by UID (as used in App.tsx)
      const userRef = doc(db, 'users', req.userId);
      const userSnap = await getDoc(userRef);
      
      let finalUserRef = userRef;
      let userData = userSnap.data();

      if (!userSnap.exists()) {
        console.warn("User document not found at UID: " + req.userId + ". Attempting fallback query...");
        const userQuery = query(collection(db, 'users'), where('uid', '==', req.userId));
        const qSnap = await getDocs(userQuery);
        if (qSnap.empty) {
          toast.error("Could not find user record. They might have deleted their account.");
          return;
        }
        // Fallback to the found document
        finalUserRef = doc(db, 'users', qSnap.docs[0].id);
        userData = qSnap.docs[0].data();
      }

      // 2. Grant access to user
      if (req.planType === 'subscription') {
        await updateDoc(finalUserRef, { 
          isPremium: true,
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      } else if (req.planType === 'one-time' && req.targetClass) {
        const currentUnlocked = (userData?.unlockedClasses || []) as string[];
        if (!currentUnlocked.includes(req.targetClass)) {
          await updateDoc(finalUserRef, { 
            unlockedClasses: [...currentUnlocked, req.targetClass]
          });
        }
      } else {
        await updateDoc(finalUserRef, { isPremium: true });
      }

      // 3. Update request status (and clear any other pending for this user to avoid stale UI)
      await updateDoc(doc(db, 'purchase_requests', req.id), { status: 'approved' });
      
      // Optional: Cleanup other pending requests for the same user to avoid "Pending" stuck UI
      const otherRequestsQuery = query(
        collection(db, 'purchase_requests'), 
        where('userId', '==', req.userId),
        where('status', '==', 'pending')
      );
      const otherSnap = await getDocs(otherRequestsQuery);
      const cleanupPromises = otherSnap.docs.map(d => updateDoc(d.ref, { status: 'processed' }));
      await Promise.all(cleanupPromises);
      
      // 4. Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        title: 'Premium Activated! 👑',
        message: `Your payment for ${req.planName} has been verified. Enjoy your premium access!`,
        type: 'rank',
        read: false,
        timestamp: new Date().toISOString()
      });

      // 5. Refresh Admin View
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'payments') fetchPurchaseRequests();

      toast.success("Purchase approved and student upgraded!");
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.UPDATE, `purchase_requests/${req.id}`);
      toast.error("Verification failed");
    }
  };

  const handleRejectPurchase = async (req: PurchaseRequest) => {
    const reason = window.prompt("Reason for rejection?");
    if (reason === null) return;

    try {
      await updateDoc(doc(db, 'purchase_requests', req.id), { status: 'rejected' });
      
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        title: 'Payment Rejected',
        message: `Your payment verification failed. Reason: ${reason}. Please contact support with Transaction ID.`,
        type: 'info',
        read: false,
        timestamp: new Date().toISOString()
      });

      toast.success("Purchase rejected.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleReply = async (messageId: string, userId: string) => {
    const text = replyText[messageId];
    if (!text?.trim()) return;

    try {
      // Update message status
      await updateDoc(doc(db, 'messages', messageId), { status: 'replied' });
      
      // Send notification to user
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'New Reply from Admin',
        message: text,
        type: 'info',
        read: false,
        timestamp: new Date().toISOString()
      });

      setReplyText({ ...replyText, [messageId]: '' });
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Error replying:", error);
    }
  };

  const sendGlobalNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifData.title || !notifData.message) return;

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batch = usersSnap.docs.map(userDoc => 
        addDoc(collection(db, 'notifications'), {
          userId: userDoc.id,
          ...notifData,
          read: false,
          timestamp: new Date().toISOString()
        })
      );
      await Promise.all(batch);
      setNotifData({ title: '', message: '', type: 'info' });
      toast.success("Notification sent to all users!");
    } catch (error) {
      console.error("Error sending global notification:", error);
    }
  };

  const handleManualLeaderboardReset = async () => {
    if (!window.confirm("Are you sure? This will set EVERYONE'S points to 0. This cannot be undone!")) return;
    
    const loadingToast = toast.loading("Resetting leaderboard...");
    try {
      // Try server-side reset first (it's faster and handles large amounts of users)
      const response = await fetch('/api/admin/reset-leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success("Leaderboard has been reset to zero via server!");
        if (activeTab === 'users') fetchUsers();
        return;
      }

      // Fallback to client-side if API fails (e.g. during local dev without server or if endpoint is broken)
      console.warn("Server reset failed, falling back to client-side batch reset");
      
      const resetCollection = async (collName: string) => {
        const snap = await getDocs(collection(db, collName));
        if (snap.empty) return;

        let batch = writeBatch(db);
        let count = 0;

        for (const doc of snap.docs) {
          batch.update(doc.ref, {
            totalPoints: 0,
            totalFocusMinutes: 0,
            ...(collName === 'users' ? { 'streak.currentCount': 1 } : {})
          });
          count++;

          // Firestore batch limit is 500
          if (count === 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }

        if (count > 0) {
          await batch.commit();
        }
      };

      await resetCollection('users');
      await resetCollection('leaderboard');

      toast.dismiss(loadingToast);
      toast.success("Leaderboard has been reset to zero!");
      if (activeTab === 'users') fetchUsers();
    } catch (error) {
      console.error("Leaderboard reset error:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to reset leaderboard. Check console for details.");
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    const q = searchQuery.toLowerCase();
    return allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q)
    );
  }, [allUsers, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery) return purchaseRequests;
    const q = searchQuery.toLowerCase();
    return purchaseRequests.filter(p => 
      p.userName?.toLowerCase().includes(q) || 
      p.userEmail?.toLowerCase().includes(q) ||
      p.transactionId?.toLowerCase().includes(q)
    );
  }, [purchaseRequests, searchQuery]);

  const menuItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'resources', label: 'Digital Library', icon: BookOpen },
    { id: 'valid_payments', label: 'Verify Keys', icon: ShieldCheck },
    { id: 'chapters', label: 'Flashcards', icon: Database },
    { id: 'messages', label: 'Support', icon: MessageSquare },
    { id: 'payments', label: 'Revenue', icon: CreditCard },
    { id: 'registry', label: 'Registry', icon: Database },
    { id: 'users', label: 'Students', icon: Users },
    { id: 'notifications', label: 'Broadcast', icon: Bell },
    { id: 'settings', label: 'Danger Zone', icon: Settings },
    { id: 'moderation', label: 'Moderation', icon: Shield },
  ];

  const renderTabContent = () => {
    if (checkQuotaLock()) {
      return (
        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-3xl flex items-center gap-4 animate-pulse">
          <Database className="w-6 h-6 text-red-500" />
          <div>
            <h4 className="text-sm font-bold text-red-500">QUOTA LOCK ACTIVATED</h4>
            <p className="text-xs text-gray-500">Dashboard is in restricted mode to preserve student access.</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'settings':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="p-10 rounded-[3.5rem] border border-red-500/20 bg-red-500/5 space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[2rem] bg-red-500/20 text-red-500 flex items-center justify-center shadow-2xl shadow-red-500/20">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-red-500 tracking-tighter">Danger Zone</h3>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">System-wide reset for fresh production launch</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={async () => {
                    if(!window.confirm("CRITICAL: RESET ALL USERS TO FREE? This will remove premium access from EVERY student account. This cannot be undone.")) return;
                    setLoading(true);
                    try {
                      const snap = await getDocs(collection(db, 'users'));
                      const batch = writeBatch(db);
                      let count = 0;
                      snap.docs.forEach(u => {
                        batch.update(doc(db, 'users', u.id), {
                          isPremium: false,
                          planType: null,
                          unlockedClasses: [],
                          unlockedResources: []
                        });
                        count++;
                      });
                      await batch.commit();
                      toast.success(`Reset ${count} users to Free status`);
                      fetchUsers();
                    } catch (e) {
                      toast.error("Process failed.");
                    } finally { setLoading(false); }
                  }}
                  className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-left hover:bg-red-500 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                    <Users className="w-12 h-12" />
                  </div>
                  <h5 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 group-hover:text-white">Reset All User Access</h5>
                  <p className="text-xs text-gray-500 mt-2 group-hover:text-white/80 leading-relaxed font-bold">
                    Instantly downgrades every registered account to a free user. Useful for clearing trial accounts.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-red-500 group-hover:text-white font-black text-[10px] uppercase tracking-widest">
                    <span>Execute Reset</span>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    if(!window.confirm("CRITICAL: NUKE TRANSACTION LEDGER? This clears all AI verification records and whitelists. Users could theoretically re-use old IDs if not cleared!")) return;
                    setLoading(true);
                    try {
                      const ledgerSnap = await getDocs(collection(db, 'transaction_ledger'));
                      const whiteSnap = await getDocs(collection(db, 'valid_payments'));
                      
                      const p1 = ledgerSnap.docs.map(d => deleteDoc(doc(db, 'transaction_ledger', d.id)));
                      const p2 = whiteSnap.docs.map(d => deleteDoc(doc(db, 'valid_payments', d.id)));
                      
                      await Promise.all([...p1, ...p2]);
                      toast.success("Transaction Ledger & Whitelists Purged");
                      fetchTransactionLedger();
                      fetchValidPayments();
                    } catch (e) {
                      toast.error("Wipe failed.");
                    } finally { setLoading(false); }
                  }}
                  className="p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-left hover:bg-red-500 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                    <Database className="w-12 h-12" />
                  </div>
                  <h5 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 group-hover:text-white">Wipe All Records</h5>
                  <p className="text-xs text-gray-500 mt-2 group-hover:text-white/80 leading-relaxed font-bold">
                    Clears all historical transaction data, AI logs, and whitelisted IDs for a clean start.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-red-500 group-hover:text-white font-black text-[10px] uppercase tracking-widest">
                    <span>Purge Database</span>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </div>
                </button>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-[2rem] flex items-start gap-4">
                 <AlertCircle className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                 <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest leading-relaxed">
                   Warning: These actions are irreversible and directly modify the production database. Use only when preparing for a fresh launch.
                 </p>
              </div>
            </div>
          </div>
        );
      case 'valid_payments':
        return (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <div>
                <h3 className="text-xl font-black">AI Auto-Audit Ledger</h3>
                <p className="text-xs text-gray-400">Live feed of payments verified by Gemini AI</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={fetchTransactionLedger}
                  className="bg-white/5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <button 
                  onClick={addValidPayment}
                  className="bg-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Manual Entry
                </button>
              </div>
            </div>

            {/* AI AUTO LOGS */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] ml-2">Recent AI Verifications</h5>
              <div className="grid grid-cols-1 gap-4">
                {transactionLedger.map((tx) => (
                  <div key={tx.id} className="glass-card p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                           <h4 className="font-black text-white uppercase tracking-wider">{tx.transactionId}</h4>
                           <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black rounded uppercase">AI Verified</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                          WhatsApp: {tx.whatsapp} • Amt: ₹{tx.amount} • User: {tx.userId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MANUAL WHITELIST (FOR EMERGENCY) */}
            <div className="space-y-4 border-t border-white/5 pt-10">
              <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] ml-2">Legacy Manual Whitelist</h5>
              <div className="grid grid-cols-1 gap-4">
                {validPayments.map((pay) => (
                  <div key={pay.id} className="glass-card p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pay.isUsed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                        {pay.isUsed ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                           <h4 className="font-black text-white uppercase tracking-wider">{pay.transactionId}</h4>
                           {pay.isUsed && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase">Used</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">
                          WhatsApp: {pay.whatsapp} • Amount: ₹{pay.amount}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        if(window.confirm("Remove this entry?")) {
                          await deleteDoc(doc(db, 'valid_payments', pay.id));
                          fetchValidPayments();
                        }
                      }}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <div>
                <h3 className="text-xl font-black">Digital Library Management</h3>
                <p className="text-xs text-gray-400">Manage premium book covers and drive links</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={async () => {
                    if(!window.confirm("Delete ALL premium books? This cannot be undone.")) return;
                    setLoading(true);
                    try {
                      const snap = await getDocs(collection(db, 'subject_resources'));
                      const deletes = snap.docs.map(d => deleteDoc(doc(db, 'subject_resources', d.id)));
                      await Promise.all(deletes);
                      toast.success("Library Reset.");
                      fetchSubjectResources();
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                >
                  <Trash2 className="w-4 h-4" /> Reset Library
                </button>
                <button 
                  onClick={() => {
                  const sub = window.prompt("Subject Name? (e.g. SST, Science)");
                  const cls = window.prompt("Class (8/9/10)?");
                  const price = window.prompt("Price? (e.g. 49)");
                  const desc = window.prompt("Short Description? (e.g. Digital E-Book Library)");
                  const cover = window.prompt("Cover URL (1:1 Ratio)?");
                  const drive = window.prompt("Drive Link?");
                  if (sub && cls) {
                    addDoc(collection(db, 'subject_resources'), {
                      subject: sub, 
                      class: cls, 
                      price: Number(price) || 0,
                      description: desc || 'Premium curated digital resources for board prep.',
                      coverUrl: cover || '',
                      driveLink: drive || '',
                      features: ['Chapter-wise Notes', 'PYQs Included', 'AI Doubt Support'],
                      createdAt: new Date().toISOString()
                    }).then(() => {
                      toast.success("Book Created!");
                      fetchSubjectResources();
                    });
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Create New Book
              </button>
            </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {subjectResources.map((res) => (
                <div key={res.id} className="glass-card p-6 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col gap-5 hover:border-indigo-500/30 transition-all group">
                  <div className="aspect-[1/1] w-full bg-white/5 rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl">
                    {res.coverUrl ? (
                      <img src={res.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 bg-gradient-to-br from-white/5 to-white/[0.02]">
                        <BookOpen className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No Cover Art</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 px-4 py-2 bg-black/80 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase border border-white/10 shadow-xl">
                      ₹{res.price || 0}
                    </div>
                    <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600/80 backdrop-blur-sm rounded-full text-[8px] font-black uppercase border border-white/10">
                      Class {res.class}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h4 className="font-black text-xl uppercase tracking-tight text-white">{res.subject}</h4>
                    <p className="text-[10px] font-medium text-gray-500 leading-relaxed line-clamp-2 italic">“{res.description || 'Premium notes for topper-level preparation.'}”</p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      {(res.features || ['Digital PDF', 'Instant Access']).slice(0, 3).map((f: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-bold text-gray-400 border border-white/5">{f}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const newPrice = window.prompt("New Price?", res.price);
                        const newDesc = window.prompt("New Description?", res.description);
                        const newCover = window.prompt("New Cover URL?", res.coverUrl);
                        const newDrive = window.prompt("New Drive Link?", res.driveLink);
                        updateDoc(doc(db, 'subject_resources', res.id), {
                          price: Number(newPrice) || 0,
                          description: newDesc || res.description,
                          coverUrl: newCover || res.coverUrl,
                          driveLink: newDrive || res.driveLink
                        }).then(() => {
                           toast.success("Book Updated!");
                           fetchSubjectResources();
                        });
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest border border-white/5"
                    >
                      Edit Book
                    </button>
                    <button 
                      onClick={() => {
                        if(window.confirm("Delete this book?")) {
                          deleteDoc(doc(db, 'subject_resources', res.id)).then(() => {
                            toast.success("Deleted");
                            fetchSubjectResources();
                          });
                        }
                      }}
                      className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Revenue', value: `₹${analyticsData.totalRevenue}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
                { label: 'Active Students', value: activeUsers, icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Total Sales', value: analyticsData.salesCount, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Burned IDs', value: registry.length, icon: Database, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-6 rounded-[2rem] bg-white/5 flex flex-col gap-4">
                  <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-black tabular-nums">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Revenue Growth</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Last 7 Days</p>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.dailyRevenue}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '1rem', fontSize: '12px' }}
                        itemStyle={{ color: '#A855F7' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#A855F7" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                <h3 className="text-lg font-bold">Plan Distribution</h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.planDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[ '#A855F7', '#3B82F6', '#10B981'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '1rem', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {analyticsData.planDistribution.map((plan, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${[ 'bg-purple-500', 'bg-blue-500', 'bg-green-500'][i % 3]}`} />
                         <span className="text-xs text-gray-400">{plan.name}</span>
                       </div>
                       <span className="text-xs font-bold">{plan.value}</span>
                     </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Search students by name, email or UID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={handleManualLeaderboardReset}
                className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 rounded-2xl text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Leaderboard
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="glass-card p-6 rounded-[2rem] bg-white/5 flex flex-col gap-4 group">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-purple-500/20 group-hover:border-purple-500 transition-all">
                      <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {u.isPremium ? (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[8px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase">PRO</span>
                      ) : (
                        <span className="bg-white/5 text-gray-500 text-[8px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase">FREE</span>
                      )}
                      <span className="text-[8px] text-gray-500 font-mono">{u.uid.slice(-6)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg truncate">{u.displayName}</h4>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                     <span className="text-[10px] font-bold text-purple-400">Class {u.class || '?'}</span>
                     <div className="w-1 h-1 rounded-full bg-white/10" />
                     <span className="text-[10px] font-bold text-blue-400">Pts: {u.totalPoints || 0}</span>
                     <button 
                       onClick={async () => {
                         if(window.confirm(`Delete student ${u.displayName}?`)) {
                           const q = query(collection(db, 'users'), where('uid', '==', u.uid));
                           const snap = await getDocs(q);
                           if (!snap.empty) {
                             await deleteDoc(doc(db, 'users', snap.docs[0].id));
                             fetchUsers();
                           }
                         }
                       }}
                       className="ml-auto p-2 text-gray-600 hover:text-red-500 transition-colors"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Search payments by name, email or TxID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-4">
                {filteredPayments.map((req) => (
                  <div key={req.id} className="glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-xl font-black">
                          {req.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{req.userName}</h4>
                          <p className="text-xs text-gray-500">{req.userEmail}</p>
                          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">WA: {req.whatsappNumber || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          req.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {req.status}
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold">{new Date(req.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Plan Details</p>
                        <h5 className="font-bold text-xl">{req.planName}</h5>
                        <p className="text-2xl font-black text-green-500 tracking-tighter">₹{req.amount}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Transaction Snapshot</p>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5 font-mono text-sm text-purple-400 break-all">
                          {req.transactionId}
                        </div>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => handleApprovePurchase(req)}
                          className="flex-1 bg-green-500 text-black py-4 rounded-[1.5rem] font-bold text-sm shadow-xl shadow-green-500/10 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Approve Payment
                        </button>
                        <button
                          onClick={() => handleRejectPurchase(req)}
                          className="px-8 border border-red-500/20 text-red-500 py-4 rounded-[1.5rem] font-bold text-sm hover:bg-red-500/5 transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
          </div>
        );

      case 'chapters':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <button onClick={() => setIsAdding(true)} className="glass-card p-8 rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 hover:border-purple-500 transition-all flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-purple-400 min-h-[160px]">
                 <Plus className="w-8 h-8" />
                 <span className="font-bold uppercase tracking-widest text-xs">Create New Chapter</span>
               </button>
               <button onClick={addSampleData} className="glass-card p-8 rounded-[2.5rem] bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between min-h-[160px]">
                  <Database className="w-6 h-6 text-purple-400" />
                  <span className="w-full bg-purple-500 text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-center">Sync All Resources</span>
               </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="glass-card p-6 rounded-[2rem] bg-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all">
                        {chapter.subject.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm truncate max-w-[150px]">{chapter.title}</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Class {chapter.class} • {chapter.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(chapter.id)} className="p-2.5 text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
             {messages.map((msg) => (
               <div key={msg.id} className="glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center font-black">
                        {msg.userName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold">{msg.userName}</h4>
                        <p className="text-xs text-gray-500">{msg.userEmail}</p>
                      </div>
                   </div>
                   <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${msg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                      {msg.status}
                   </span>
                 </div>
                 <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-5 rounded-2xl">{msg.message}</p>
                 <div className="pt-4 space-y-4">
                    <textarea
                      value={replyText[msg.id || ''] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [msg.id || '']: e.target.value })}
                      placeholder="Type your reply..."
                      className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm focus:border-purple-500 outline-none h-32 resize-none transition-all"
                    />
                    <button
                      onClick={() => handleReply(msg.id!, msg.userId)}
                      className="w-full purple-gradient py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/10 flex items-center justify-center gap-3"
                    >
                      <Send className="w-5 h-5" />
                      Transmit Reply
                    </button>
                 </div>
               </div>
             ))}
          </div>
        );

      case 'notifications':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
             <form onSubmit={sendGlobalNotification} className="glass-card p-10 rounded-[3rem] bg-purple-500/5 border border-purple-500/20 space-y-8">
                <h3 className="text-2xl font-black tracking-tight">STUDENT BROADCAST</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    value={notifData.title}
                    onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                    placeholder="Campaign Title"
                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-4 text-sm focus:border-purple-500 outline-none"
                  />
                  <textarea
                    required
                    value={notifData.message}
                    onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                    placeholder="Broadcast Message..."
                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-4 text-sm h-32 outline-none focus:border-purple-500 resize-none"
                  />
                  <button type="submit" className="w-full purple-gradient py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-500/30 flex items-center justify-center gap-3">
                    <Send className="w-5 h-5" />
                    Deploy Broadcast
                  </button>
                </div>
             </form>
             <div className="space-y-4">
                <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Recent Activity</h3>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="glass-card p-6 rounded-[2rem] bg-white/5 flex items-center gap-6">
                    <Bell className="w-5 h-5 text-purple-400" />
                    <div>
                      <h4 className="font-bold text-sm">{n.title}</h4>
                      <p className="text-[10px] text-gray-500">{n.message}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        );

      case 'moderation':
        return <ModerationTab />;

      case 'registry':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {registry.map((tx) => (
              <div key={tx.id} className="glass-card p-6 rounded-[2rem] bg-white/5 space-y-4 border border-white/5">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-400/10 px-2 py-0.5 rounded-md w-fit block">BURNED ID</span>
                <div className="font-mono text-sm font-bold text-white break-all leading-tight">
                  {tx.id}
                </div>
                <p className="text-xs text-gray-400 truncate">{tx.userEmail || 'Unknown'}</p>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex flex-col h-full font-sans">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter">NOTEVIX<span className="text-indigo-500">ADMIN</span></span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar py-4">
            <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Dashboard</p>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group ${
                  activeTab === item.id 
                    ? 'bg-indigo-600/10 text-indigo-400' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-white/5">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Exit Master Panel
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#050505] overflow-hidden">
        <header className="h-20 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black tracking-tight text-white capitalize">{activeTab} Interface</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end pr-6 border-r border-white/10">
               <div className="flex items-center gap-2 text-emerald-400">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-xl font-black tabular-nums">{activeUsers}</span>
               </div>
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Global Active</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black shadow-lg shadow-indigo-600/20">A</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-32">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
