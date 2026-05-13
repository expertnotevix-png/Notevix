import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical, Globe, Languages, Shield, Zap, Trophy, ChevronRight, Crown, Upload, QrCode, ShieldCheck, Copy, AlertCircle, Info } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PromoCarousel } from '../components/PromoCarousel';
import { useState, useEffect, useRef } from 'react';
import { db } from '../components/firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { geminiService } from '../services/geminiService';
import { SUBJECT_PASSWORDS, PAYMENT_GUIDELINES } from '../constants';

import { dataBridge } from '../services/dataBridge';

const CLASSES = ['8', '9', '10'];

const PREMIUM_PLANS = [
  {
    id: 'individual_subject',
    name: 'Individual Subject',
    price: 39,
    description: 'Single Subject PDF Note',
    features: ['Chapter-wise One Page Notes', 'Important Questions PDF', 'Topic-wise AI Solver'],
    color: 'from-blue-600 to-indigo-600',
    type: 'one-time'
  },
  {
    id: 'class_8_master',
    name: 'Class 8 Master Pack',
    class: '8',
    price: 99,
    features: ['All Class 8 Subjects', 'Full Notes & PYQs', '24/7 AI Tutor Access'],
    color: 'from-cyan-600 to-blue-600',
    type: 'one-time'
  },
  {
    id: 'class_9_master',
    name: 'Class 9 Master Pack',
    class: '9',
    price: 99,
    features: ['All Class 9 Subjects', 'Full Notes & PYQs', '24/7 AI Tutor Access'],
    color: 'from-emerald-600 to-teal-600',
    type: 'one-time'
  },
  {
    id: 'class_10_master',
    name: 'Class 10 Master Pack',
    class: '10',
    price: 99,
    features: ['All Class 10 Subjects', 'Full Notes & PYQs', '24/7 AI Tutor Access'],
    color: 'from-orange-600 to-pink-600',
    type: 'one-time'
  }
];

const SUBJECT_COLORS: Record<string, string> = {
  science: 'bg-emerald-500',
  maths: 'bg-blue-500',
  sst: 'bg-orange-500',
  english: 'bg-purple-500'
};

const SUBJECT_ICONS: Record<string, any> = {
  science: FlaskConical,
  maths: Zap,
  sst: Globe,
  english: Languages
};

export default function Landing() {
  const navigate = useNavigate();
  const [activeClass, setActiveClass] = useState<'8' | '9' | '10'>('10');
  const [resources, setResources] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  
  // Purchase Form State
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ password: string; subject: string } | null>(null);
  const lastAttemptRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchResources = async () => {
      const data = await dataBridge.getResources(activeClass);
      setResources(data);
    };
    fetchResources();
    
    // Real-time for resources from Supabase
    let channel: any = null;
    let unsubscribeFirestore: (() => void) | null = null;

    const setupRealtime = async () => {
      const { supabase } = await import('../lib/supabase');
      
      if (supabase) {
        channel = supabase
          .channel(`resources_landing_${activeClass}_${Math.random().toString(36).substring(7)}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'subject_resources',
            filter: `class=eq.${activeClass}`
          }, () => {
            fetchResources();
          })
          .subscribe();
      } else {
        // Fallback to Firestore listener
        const q = query(collection(db, 'subject_resources'), where('class', '==', activeClass));
        unsubscribeFirestore = onSnapshot(q, (snap) => {
          const data = snap.docs.map(doc => dataBridge.mapResource({ id: doc.id, ...doc.data() }));
          setResources(data);
        }, (err) => {
          console.warn("Firestore landing listener failed:", err);
        });
      }
    };

    setupRealtime();
    return () => {
      if (channel) channel.unsubscribe();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [activeClass]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGuestPurchase = async () => {
    if (isSubmitting || aiVerifying || !whatsapp || !email || !screenshotPreview) {
      toast.error('Please provide Email, WhatsApp, and Payment Screenshot.');
      return;
    }

    // RATE LIMITING PROTECTION
    const now = Date.now();
    if (now - lastAttemptRef.current < 5000) {
      toast.error("Please wait a few seconds before retrying.");
      return;
    }
    lastAttemptRef.current = now;

    try {
      setIsSubmitting(true);
      setAiVerifying(true);
      setAiError(null);
      
      const targetSubject = (selectedPlan?.subject || selectedPlan?.name || '').toLowerCase().split(' ')[0] || '';
      let targetPassword = '';
      const paidAmountForPlan = selectedPlan?.price || 39;

      if (paidAmountForPlan >= 99) {
          targetPassword = Object.entries(SUBJECT_PASSWORDS)
            .map(([subj, pass]) => `${subj.toUpperCase()}: ${pass}`)
            .join('\n');
      } else {
          targetPassword = SUBJECT_PASSWORDS[targetSubject] || "CONTACT_ADMIN";
      }

      // PER USER REQUEST: No screenshot storage. Gemini processes the base64 directly.
      const result = await geminiService.verifyPaymentScreenshot(
        screenshotPreview, 
        paidAmountForPlan, 
        selectedPlan?.name || 'Premium Notes',
        targetPassword
      );
      setAiVerifying(false);
      
      if (!result.verified) {
        setAiError(result.reason || "Invalid or unclear payment screenshot.");
        throw new Error(result.reason || "Invalid or unclear payment screenshot.");
      }

      const finalTxId = result.transactionId?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
      
      if (!finalTxId || finalTxId.length < 6) {
        setAiError("Transaction ID not detected.");
        throw new Error("Transaction ID not detected. Please ensure your UTR/Reference number is clearly visible.");
      }

      // Check anti-fraud in Supabase: Reject if transaction_id already exists
      const isRedeemed = await dataBridge.isTransactionRedeemed(finalTxId);
      if (isRedeemed) {
        setAiError("Transaction ID already used.");
        throw new Error("Transaction ID already used. Duplicate payments are not allowed.");
      }
      
      // Save Transactional Log (Save ONLY requested fields + necessary purchase metadata)
      const saveResult = await dataBridge.savePurchaseRequest({
        transactionId: finalTxId,
        amount: result.amount || paidAmountForPlan,
        userId: email || 'GUEST', // Using email as guest user_id per common practice if GUEST
        status: 'approved',
        verified: result.verified,
        // Carry forward info needed for UI
        whatsapp: whatsapp,
        email: email,
        planName: selectedPlan?.name || 'Premium Notes',
        productName: selectedPlan?.name || 'Premium Notes',
        paymentApp: result.paymentApp || 'Detected App',
        passwordUnlocked: result.password || targetPassword,
        isGuest: true
      });

      if (!saveResult.success) {
        throw new Error(saveResult.error || "Failed to save verified payment. Please contact support.");
      }

      setPurchaseSuccess({ 
        password: result.password || targetPassword, 
        subject: selectedPlan?.name?.replace(' Premium', '') || 'Subject' 
      });

      setScreenshotPreview(null);
      setWhatsapp('');
      setEmail('');
    } catch (error: any) {
      toast.error(error.message || "Failed");
    } finally {
      setIsSubmitting(false);
      setAiVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 font-sans">
      {/* Hero Header */}
      <header className="relative pt-16 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-indigo-600/5 blur-[120px] -z-10 rounded-full" />
        
        <nav className="max-w-7xl mx-auto flex items-center justify-between mb-24">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Logo className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">NOTEVIX</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/premium-notes')}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-2"
            >
              <Crown size={14} /> PREMIUM
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Login
            </button>
          </div>
        </nav>

        {/* Promo Banner Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <PromoCarousel location="landing" />
        </div>

        <div className="max-w-5xl mx-auto text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            🔥 Trusted by 10k+ CBSE Students
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase"
          >
            Digital <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              Library
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium"
          >
            Access high-yield one-page notes and master packs for Class 8-10. No signup required for premium notes.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => document.getElementById('digital-library')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-600/40 hover:scale-105 transition-all"
            >
              Get Premium Notes 📔
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-12 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Sign Up Free
            </button>
          </motion.div>
        </div>
      </header>

      {/* Digital Library Section */}
      <section id="digital-library" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-8 uppercase tracking-tighter">
              CHOOSE YOUR <span className="text-indigo-500">CLASS</span>
            </h2>
            
            <div className="p-1.5 rounded-3xl bg-white/5 border border-white/10 flex gap-2">
              {CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => setActiveClass(cls as any)}
                  className={`px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                    activeClass === cls ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  Class {cls}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {resources.map((res: any) => {
              const Icon = SUBJECT_ICONS[res.subject.toLowerCase()] || BookOpen;
              const masterPlan = PREMIUM_PLANS.find(p => p.class === res.class);
              const subjectPlan = PREMIUM_PLANS.find(p => p.id === 'individual_subject');
              
              return (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group relative"
                >
                  {/* Book Design Card */}
                  <div className="aspect-[3/4.5] rounded-[32px] overflow-hidden relative shadow-2xl transition-all duration-500 group-hover:-translate-y-4 border border-white/10 bg-[#0A0A0B]">
                    {res.coverUrl ? (
                      <img src={res.coverUrl} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className={`absolute inset-0 ${SUBJECT_COLORS[res.subject.toLowerCase()] || 'bg-indigo-600'}`} />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                    
                    {/* Book Spine Detail */}
                    <div className="absolute inset-y-0 left-0 w-4 bg-black/30 backdrop-blur-md border-r border-white/5 shadow-2xl" />
                    
                    <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                      <Crown size={20} className="text-indigo-400" />
                    </div>

                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                             <Icon size={14} className="text-white" />
                           </div>
                           <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                            {res.subject}
                          </span>
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-black text-white leading-none tracking-tighter uppercase mb-1">
                            {res.subject === 'maths' ? 'MATHS' : res.subject.toUpperCase()} NOTES
                          </h3>
                          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                            Class {res.class} • Topic Pack
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 pt-4">
                          <button 
                            onClick={() => toast.info("PDF is locked. Please purchase the password to open.")}
                            className="w-full py-3.5 rounded-xl bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                          >
                            OPEN PDF (LOCKED)
                          </button>
                          <button 
                            onClick={() => setSelectedPlan({ ...subjectPlan, subject: res.subject, class: res.class, resourceId: res.id })}
                            className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
                          >
                            GET PASSWORD ₹39
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Guest Modal */}
      <AnimatePresence>
        {purchaseSuccess && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 30 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               className="w-full max-w-md bg-[#0a0a0a] border border-emerald-500/30 rounded-[3rem] p-10 text-center space-y-8 relative overflow-hidden"
             >
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px]" />
                
                <div className="flex flex-col items-center gap-6">
                   <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                     <ShieldCheck className="w-10 h-10 text-emerald-400" />
                   </div>
                   <div className="space-y-2">
                     <h2 className="text-3xl font-black text-white uppercase tracking-tighter">AI VERIFIED</h2>
                     <p className="text-emerald-400 text-xs font-black uppercase tracking-widest leading-none">{purchaseSuccess.subject} UNLOCKED</p>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex flex-col gap-1 text-center">
                     <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
                       ⚠️ Critical Warning
                     </span>
                     <p className="text-[9px] text-rose-400 font-bold uppercase tracking-wider px-4">
                       Remember the password without this you cant able to open the {purchaseSuccess.subject} PDF notes.
                     </p>
                   </div>

                   <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">YOUR PDF PASSWORD</p>
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-full py-2 text-center">
                           <code className="text-[10px] sm:text-xs font-black text-white tracking-[0.1em] text-left inline-block bg-white/5 p-6 rounded-2xl border border-white/10 select-all whitespace-pre-line leading-relaxed">
                             {purchaseSuccess.password}
                           </code>
                         </div>
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(purchaseSuccess.password);
                             toast.success("Password Copied!");
                           }}
                           className="flex items-center gap-2 px-6 py-3 bg-indigo-500/10 rounded-2xl hover:bg-indigo-500/20 transition-all border border-indigo-500/20 text-indigo-400 group"
                         >
                           <Copy className="w-4 h-4" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Copy Password</span>
                         </button>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl text-left">
                     <AlertCircle className="w-4 h-4 text-emerald-400 mt-1 flex-shrink-0" />
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                       This password works for the PDF link we have provided. Ensure all letters are <span className="text-white">CAPITAL</span>.
                     </p>
                   </div>
                   
                   <button 
                    onClick={() => {
                      setPurchaseSuccess(null);
                      setSelectedPlan(null);
                    }}
                    className="w-full h-16 bg-white text-black rounded-3xl font-black text-sm uppercase tracking-[0.3em] active:scale-95 transition-all shadow-2xl"
                   >
                     CLOSE
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-[#0A0A0B] border border-white/10 rounded-[40px] shadow-2xl p-8 sm:p-12 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600" />
              
              {aiVerifying && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-[200] rounded-[40px] border border-white/10">
                  <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-4 bg-indigo-500/10 rounded-full animate-pulse" />
                  </div>
                  <div className="mt-8 text-center px-6">
                    <p className="text-white font-black text-xs uppercase tracking-[0.2em] mb-2 animate-pulse">Verifying payment...</p>
                    <p className="text-white/40 text-[7px] font-bold uppercase tracking-widest leading-relaxed">
                      AI is scanning your screenshot for authenticity... <br /> This can take up to 60 seconds if the server is busy.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black">{selectedPlan.name}</h2>
                  {selectedPlan.subject && (
                    <p className="text-xs font-bold text-indigo-400 capitalize tracking-wider">
                      Subject: {selectedPlan.subject} (Class {selectedPlan.class})
                    </p>
                  )}
                </div>
                <button onClick={() => setSelectedPlan(null)} className="text-gray-500 hover:text-white transition-colors">
                  <ChevronRight size={28} className="rotate-90" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-8 pb-4">
                <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col items-center gap-6">
                  <div className="w-full flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30">
                      <QrCode className="text-white" size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Pay with UPI</p>
                      <p className="text-lg font-black text-white">9236489649@mbk</p>
                      <p className="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-wider">Pay ₹39 for this subject OR ₹99 for all subjects</p>
                    </div>
                    <div className="ml-auto text-2xl font-black text-white">₹{selectedPlan.price}</div>
                  </div>
                  
                  <div className="p-4 bg-white rounded-3xl">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=9236489649@mbk&pn=NoteVix&am=${selectedPlan.price}&cu=INR`}
                      alt="Scan to Pay"
                      className="w-32 h-32"
                    />
                  </div>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Scan or Pay to the ID above</p>
                </div>

                <div className="space-y-4">
                  <input 
                    type="email" 
                    placeholder="Delivery Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                  />
                  <input 
                    type="text" 
                    placeholder="WhatsApp Number"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center gap-3 bg-indigo-500/[0.02] hover:border-indigo-500/50 cursor-pointer overflow-hidden relative"
                  >
                    {screenshotPreview ? (
                      <>
                        <img src={screenshotPreview} className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-black uppercase text-white tracking-[0.3em]">Change Receipt</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload size={24} className="text-indigo-400/50" />
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest text-center px-6">Upload Payment Screenshot<br/><span className="text-[8px] text-indigo-400 group-hover:text-white transition-colors">AI Forensic Scan Enabled</span></span>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                  
                  <div className="p-5 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 space-y-4">
                    <div className="flex items-start gap-3 text-left">
                      <Info className="w-5 h-5 text-indigo-400 mt-0.5" />
                      <div className="space-y-2 flex-1">
                        <p className="text-[11px] font-black text-white uppercase tracking-widest">How it works</p>
                        <div className="space-y-1.5">
                          {PAYMENT_GUIDELINES.map((guide, i) => (
                            <div key={i} className="flex gap-2 text-[8px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                              <span>•</span>
                              <span>{guide}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-indigo-500/10 text-center space-y-1">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                        Payment Stuck? Contact Admin
                      </p>
                      <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest leading-relaxed">
                        WhatsApp: 9236489649 <br/> Gmail: expertnotevix@gmail.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-white/5 flex-shrink-0">
                {aiError && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex gap-3 items-start mb-4"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 leading-none">AI Rejection Reason</p>
                      <p className="text-xs text-secondary leading-relaxed font-medium">
                        {aiError}
                      </p>
                    </div>
                  </motion.div>
                )}
                <button
                  disabled={isSubmitting || aiVerifying}
                  onClick={handleGuestPurchase}
                  className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95 shadow-xl shadow-indigo-600/20"
                >
                  {aiVerifying ? 'Verifying payment...' : isSubmitting ? 'Processing...' : 'Complete Purchase'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Features */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          {[
            { icon: Zap, title: "One Page Notes", desc: "Scientific summaries that cover 100% of the syllabus." },
            { icon: Trophy, title: "Exam Tested", desc: "Used by thousands of toppers to score 95%+" },
            { icon: Shield, title: "AI Tutor", desc: "Instant doubt solving with local exam context." }
          ].map((f, i) => (
            <div key={i} className="p-10 rounded-[40px] bg-white/[0.02] border border-white/5 space-y-6">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                <f.icon className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
          © 2026 NoteVix Academy • All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
