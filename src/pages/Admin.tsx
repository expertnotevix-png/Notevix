import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, limit, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { geminiService } from '../services/geminiService';
import { Chapter, Message, Notification } from '../types';
import { Plus, Trash2, Edit2, Save, X, ChevronLeft, Database, MessageSquare, Bell, Send, CheckCircle2, Clock, Shield, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModerationTab from '../components/community/ModerationTab';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'chapters' | 'messages' | 'notifications' | 'moderation'>('chapters');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'info' as const });

  useEffect(() => {
    if (activeTab === 'chapters') fetchChapters();
    if (activeTab === 'messages') fetchMessages();
    if (activeTab === 'notifications') fetchNotifications();
  }, [activeTab]);

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
    const q = query(collection(db, 'subject_resources'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      console.log("Auto-seeding subject resources...");
      await addSampleData();
    }
  };

  const [activeUsers, setActiveUsers] = useState(0);
  const [aiStatus, setAiStatus] = useState<{ status: 'checking' | 'ok' | 'error', message?: string }>({ status: 'checking' });

  useEffect(() => {
    // Real-time Active Users (Active in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const q = query(
      collection(db, 'users'),
      where('lastActive', '>=', fiveMinutesAgo)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setActiveUsers(snapshot.size);
    });

    return () => unsubscribe();
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
        class: '10',
        subject: 'maths',
        title: 'Polynomials',
        summary: 'A polynomial is an expression consisting of variables and coefficients, involving only the operations of addition, subtraction, multiplication, and non-negative integer exponents.',
        keyPoints: [
          'Degree of a polynomial is the highest power of x.',
          'Linear polynomial has degree 1.',
          'Quadratic polynomial has degree 2.',
          'Relationship between zeros and coefficients: Sum = -b/a, Product = c/a.',
        ],
        formulas: [
          'p(x) = ax² + bx + c',
          'α + β = -b/a',
          'αβ = c/a',
        ],
        importantQuestions: [
          { question: 'Find the zeros of x² - 2x - 8.', answer: 'The zeros are 4 and -2.' },
          { question: 'What is the degree of a constant polynomial?', answer: 'The degree of a non-zero constant polynomial is 0.' },
        ],
        isPremium: false,
      },
      {
        class: '10',
        subject: 'science',
        title: 'Chemical Reactions',
        summary: 'A chemical reaction is a process in which one or more substances, the reactants, are converted to one or more different substances, the products.',
        keyPoints: [
          'Combination Reaction: Two or more reactants form a single product.',
          'Decomposition Reaction: A single reactant breaks down into two or more products.',
          'Displacement Reaction: A more reactive element displaces a less reactive element.',
          'Redox Reaction: Both oxidation and reduction occur simultaneously.',
        ],
        formulas: [
          '2H₂ + O₂ → 2H₂O',
          'CaCO₃ → CaO + CO₂',
        ],
        importantQuestions: [
          { question: 'Why should a magnesium ribbon be cleaned before burning in air?', answer: 'To remove the protective layer of basic magnesium carbonate from its surface.' },
          { question: 'What is a balanced chemical equation?', answer: 'An equation where the number of atoms of each element is the same on both sides.' },
        ],
        isPremium: true,
      }
    ];

    for (const sample of chapterSamples) {
      const q = query(collection(db, 'chapters'), where('title', '==', sample.title), where('class', '==', sample.class));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'chapters'), sample);
      }
    }

    // Add Subject Resources from User Request
    const subjectResources = [
      {
        class: '8', subject: 'science',
        onePageNotesUrl: 'https://drive.google.com/file/d/1ka-QeoholdXB3xaX7jX2QNXO-kP2n-ES/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1wCuBo0YApmkqef-UnT29CtRd1tOcrb9v/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1UB0-QptnzsAOEU5lKwA60HtVfFo5_P_g/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1F5OA8aK6ncJLD0iVYTIR_etSDjBqKheB/view?usp=drivesdk'
      },
      {
        class: '8', subject: 'sst',
        onePageNotesUrl: 'https://drive.google.com/file/d/1mV5bcLIz8j3IEE61Ijwdo2RDrq-j05yG/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1USJWh6tDlRH7ATYRrsHC_HgESYHAzb8D/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1TCAEGb4e9s1bd6ttGmHiDVYsimaH3_Pd/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1cVOUmI7StT61OlrZC16oE0mE1pV8YnNk/view?usp=drivesdk'
      },
      {
        class: '8', subject: 'maths',
        onePageNotesUrl: 'https://drive.google.com/file/d/1GcVbFswV7OB3dutymQjdHbOXheuK9Ysn/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1K64QsZT9lNwS_12r5HioULIHVXFDm_oB/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1d1-V1u8oWALR49tKMKBWe1Dtnz3nnOBH/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1z-cvLUQQAT02csfWiM03_b8dcPFObtE0/view?usp=drivesdk'
      },
      {
        class: '8', subject: 'english',
        onePageNotesUrl: 'https://drive.google.com/file/d/1CCK6uzH1ma5I0E5sWWW57_BbUo9PrlHX/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1IXSc8wcjttmkOVpVY7ocKZkTuRVI0iTZ/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1Cr_fvccNKi-PBWTRb6CF6DB27qz73r3z/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nuGRofcxb9LKD7d0-7ngBU1mmrhCSjgX/view?usp=drivesdk'
      },
      {
        class: '9', subject: 'science',
        onePageNotesUrl: 'https://drive.google.com/file/d/16J3l5x2tiNwhtG1YUH6Xpc1VyhlbEhaU/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/19KV_y1pdj4TN9mSg1pnymrjF7RVpghGH/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1_Nr1VeZX7a3g9HM3j6nhzZ5xe9XXA-3_/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1IGo5ErM6jnmJ1KrM60o-XjAt1XgEj5sc/view?usp=drivesdk'
      },
      {
        class: '9', subject: 'sst',
        onePageNotesUrl: 'https://drive.google.com/file/d/1Nhof272xWczHbg7hX_ageR4NvXPJNrJP/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1Ig18ncXDHEQ0Mxu-sM7akb_01Ab3H02j/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1rig4ZYP8nk22Kfr35OR9VLxv7WQy7n9a/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1lDAxdI-_b7JcYkWPdt6uegR4LdQuxQ3h/view?usp=drivesdk'
      },
      {
        class: '9', subject: 'maths',
        onePageNotesUrl: 'https://drive.google.com/file/d/1aIa3PGgzZu8K1p9NY5yejDcgzMPHZ2ZP/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1iW1BUO46koPSud20WlGPAf1VMNlXUNyI/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1DJEF8yHKGWDnsJt7tGGTkH0DgGbn9yRp/view?usp=drivesdk'
      },
      {
        class: '9', subject: 'english',
        onePageNotesUrl: 'https://drive.google.com/file/d/1k_7qp8KYIyIvYME5sfO1Oq-nt7LjxyOL/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1B81cuGvF5-jJnhUA1n-Yy6nAk-H9W-B3/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/10X16DY-AxnxyXrIDwbNqJSt_Y8NRZyv7/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1n4_HnHrShSzIMkfiVQYDtuJSWPnkqqO2/view?usp=drivesdk'
      },
      {
        class: '10', subject: 'science',
        onePageNotesUrl: 'https://drive.google.com/file/d/1oa2WBPNO4ChJrAp-aP7uyvVCn2SPI6w1/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1wNNhEXC06_qpsom2lzfAoOAjxZtfzc2f/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1jUpfYzuNwiE6b6CTYTE--Gk8ttqZ5b26/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nWLsptC9vEV7egT8rbapiRi_gBm7SeTW/view?usp=drivesdk'
      },
      {
        class: '10', subject: 'sst',
        onePageNotesUrl: 'https://drive.google.com/file/d/1oa2WBPNO4ChJrAp-aP7uyvVCn2SPI6w1/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1wNNhEXC06_qpsom2lzfAoOAjxZtfzc2f/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1jUpfYzuNwiE6b6CTYTE--Gk8ttqZ5b26/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nWLsptC9vEV7egT8rbapiRi_gBm7SeTW/view?usp=drivesdk'
      },
      {
        class: '10', subject: 'maths',
        onePageNotesUrl: 'https://drive.google.com/file/d/1oa2WBPNO4ChJrAp-aP7uyvVCn2SPI6w1/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1wNNhEXC06_qpsom2lzfAoOAjxZtfzc2f/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1jUpfYzuNwiE6b6CTYTE--Gk8ttqZ5b26/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nWLsptC9vEV7egT8rbapiRi_gBm7SeTW/view?usp=drivesdk'
      },
      {
        class: '10', subject: 'english',
        onePageNotesUrl: 'https://drive.google.com/file/d/1oa2WBPNO4ChJrAp-aP7uyvVCn2SPI6w1/view?usp=drivesdk',
        fullNotesUrl: 'https://drive.google.com/file/d/1wNNhEXC06_qpsom2lzfAoOAjxZtfzc2f/view?usp=drivesdk',
        importantQuestionsUrl: 'https://drive.google.com/file/d/1jUpfYzuNwiE6b6CTYTE--Gk8ttqZ5b26/view?usp=drivesdk',
        examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nWLsptC9vEV7egT8rbapiRi_gBm7SeTW/view?usp=drivesdk'
      }
    ];

    for (const res of subjectResources) {
      // Check if already exists
      const q = query(collection(db, 'subject_resources'), where('class', '==', res.class), where('subject', '==', res.subject));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'subject_resources'), res);
      } else {
        // Update ALL matching records to ensure no duplicates with old links remain
        const updates = snap.docs.map(d => updateDoc(doc(db, 'subject_resources', d.id), res));
        await Promise.all(updates);
      }
    }

    fetchChapters();
    alert("All resources synced successfully with new links!");
  };

  const fetchMessages = async () => {
    setLoading(true);
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(data);
      setLoading(false);
    });
    return unsubscribe;
  };

  const fetchNotifications = async () => {
    setLoading(true);
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
      setLoading(false);
    });
    return unsubscribe;
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
      alert("Reply sent!");
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
      alert("Notification sent to all users!");
    } catch (error) {
      console.error("Error sending global notification:", error);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-2xl font-black tracking-tighter">{activeUsers}</span>
              </div>
              <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Active Now</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-end gap-1 mt-0.5">
              <div className={`flex items-center gap-1.5 ${
                aiStatus.status === 'ok' ? 'text-green-400' :
                aiStatus.status === 'error' ? 'text-red-400' :
                'text-gray-500'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  aiStatus.status === 'ok' ? 'bg-green-500 animate-pulse' :
                  aiStatus.status === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {aiStatus.message || 'Checking AI...'}
                </span>
                <button 
                  onClick={testAI}
                  disabled={aiStatus.status === 'checking'}
                  className="ml-2 p-1 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
                  title="Test AI Connection"
                >
                  <RefreshCw className={`w-3 h-3 ${aiStatus.status === 'checking' ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-[8px] text-gray-500 max-w-[200px] text-right leading-tight">
                Note: Gemini Free Tier has a limit of 15 requests per minute.
              </p>
            </div>
          </div>
        </div>
        {activeTab === 'chapters' && (
          <button
            onClick={() => setIsAdding(true)}
            className="purple-gradient p-3 rounded-xl shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl overflow-x-auto no-scrollbar">
        {[
          { id: 'chapters', label: 'Chapters', icon: Database },
          { id: 'messages', label: 'Messages', icon: MessageSquare },
          { id: 'notifications', label: 'Broadcast', icon: Bell },
          { id: 'moderation', label: 'Moderation', icon: Shield },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'chapters' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={addSampleData}
              className="glass-card p-4 rounded-2xl flex items-center justify-center gap-2 text-purple-400 font-bold"
            >
              <Database className="w-5 h-5" />
              Sync All Resources
            </button>
            <button
              onClick={async () => {
                if (!window.confirm("This will overwrite all Class 10 Science resources. Continue?")) return;
                const scienceRes = {
                  class: '10', subject: 'science',
                  onePageNotesUrl: 'https://drive.google.com/file/d/1oa2WBPNO4ChJrAp-aP7uyvVCn2SPI6w1/view?usp=drivesdk',
                  fullNotesUrl: 'https://drive.google.com/file/d/1wNNhEXC06_qpsom2lzfAoOAjxZtfzc2f/view?usp=drivesdk',
                  importantQuestionsUrl: 'https://drive.google.com/file/d/1jUpfYzuNwiE6b6CTYTE--Gk8ttqZ5b26/view?usp=drivesdk',
                  examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nWLsptC9vEV7egT8rbapiRi_gBm7SeTW/view?usp=drivesdk'
                };
                const q = query(collection(db, 'subject_resources'), where('class', '==', '10'), where('subject', '==', 'science'));
                const snap = await getDocs(q);
                if (snap.empty) {
                  await addDoc(collection(db, 'subject_resources'), scienceRes);
                } else {
                  for (const d of snap.docs) {
                    await updateDoc(doc(db, 'subject_resources', d.id), scienceRes);
                  }
                }
                alert("Class 10 Science resources updated!");
              }}
              className="glass-card p-4 rounded-2xl flex items-center justify-center gap-2 text-green-400 font-bold"
            >
              <RefreshCw className="w-5 h-5" />
              Fix Class 10 Science
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Manage Content</h3>
            {loading ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              chapters.map((chapter) => (
                <div key={chapter.id} className="glass-card p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{chapter.title}</h4>
                    <p className="text-[10px] text-gray-500 uppercase">{chapter.subject} • Class {chapter.class}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-white/5 rounded-lg text-blue-400">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(chapter.id)} className="p-2 hover:bg-white/5 rounded-lg text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">User Messages</h3>
          {loading ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="glass-card p-6 rounded-3xl space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{msg.userName}</h4>
                    <p className="text-[10px] text-gray-500">{msg.userEmail}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest ${msg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                    {msg.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-purple-400">{msg.subject}</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{msg.message}</p>
                </div>
                <div className="pt-2 space-y-3">
                  <textarea
                    value={replyText[msg.id || ''] || ''}
                    onChange={(e) => setReplyText({ ...replyText, [msg.id || '']: e.target.value })}
                    placeholder="Type your reply..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:outline-none focus:border-purple-500 transition-colors h-20"
                  />
                  <button
                    onClick={() => handleReply(msg.id!, msg.userId)}
                    className="w-full purple-gradient py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Reply
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 text-gray-500">No messages found.</div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-8">
          <form onSubmit={sendGlobalNotification} className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-lg">Broadcast Notification</h3>
            <div className="space-y-4">
              <input
                type="text"
                required
                value={notifData.title}
                onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                placeholder="Notification Title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm"
              />
              <textarea
                required
                value={notifData.message}
                onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                placeholder="Notification Message..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm h-24"
              />
              <div className="flex gap-2">
                {['info', 'streak', 'rank'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNotifData({ ...notifData, type: type as any })}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                      notifData.type === type ? 'bg-purple-500 border-purple-500 text-white' : 'border-white/10 text-gray-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <button type="submit" className="w-full purple-gradient py-4 rounded-2xl font-bold shadow-xl shadow-purple-500/20">
                Send to All Users
              </button>
            </div>
          </form>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Recent Broadcasts</h3>
            {notifications.slice(0, 10).map((n) => (
              <div key={n.id} className="glass-card p-4 rounded-2xl flex items-center gap-4 opacity-70">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm">{n.title}</h4>
                  <p className="text-[10px] text-gray-500 truncate">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'moderation' && <ModerationTab />}
    </div>
  );
}
