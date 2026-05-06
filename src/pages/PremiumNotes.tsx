import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, Check, ShieldCheck, Copy, ExternalLink, X, 
  CreditCard, Loader2, Zap, BookOpen, Lock, 
  ChevronRight, FileText, Upload, Image as ImageIcon,
  SearchCheck, FilePlus, AlertCircle
} from 'lucide-react';
import { UserProfile, SubjectResource, ValidPayment } from '../types';
import { db, handleFirestoreError, OperationType } from '../components/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc, setDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";
import { useRef } from 'react';
import { geminiService } from '../services/geminiService';

import { dataBridge } from '../services/dataBridge';

interface PremiumNotesProps {
  user: UserProfile | null;
}

const CLASSES = ['8', '9', '10'];

const PREMIUM_PLANS = [
  {
    id: 'individual_subject',
    name: 'Single PDF Notes',
    price: 39,
    features: ['Instant Download', 'Topic Coverage', 'One-time Payment'],
    color: 'from-gray-600 to-gray-800',
    type: 'one-time'
  },
  {
    id: 'class_8_one_time',
    name: 'Class 8 Master Pack',
    class: '8',
    price: 99,
    features: ['All Class 8 Subjects', 'Lifetime Access', 'Bonus PDFs'],
    color: 'from-blue-600 to-cyan-600',
    type: 'one-time'
  },
  {
    id: 'class_9_one_time',
    name: 'Class 9 Master Pack',
    class: '9',
    price: 99,
    features: ['All Class 9 Subjects', 'Lifetime Access', 'Bonus PDFs'],
    color: 'from-emerald-600 to-teal-600',
    type: 'one-time'
  },
  {
    id: 'class_10_one_time',
    name: 'Class 10 Master Pack',
    class: '10',
    price: 99,
    features: ['All Class 10 Subjects', 'Lifetime Access', 'Bonus PDFs'],
    color: 'from-orange-600 to-pink-600',
    type: 'one-time'
  },
  {
    id: 'plus_sub',
    name: 'NoteVix Plus',
    price: 199,
    description: 'Billed monthly',
    features: ['Classes 8-12 Full Access', 'Unlimited AI Doubt Solver', 'Exclusive Exam Packs', 'Priority Chat Support'],
    color: 'from-indigo-600 to-purple-600',
    type: 'subscription'
  }
];

export default function PremiumNotes({ user }: PremiumNotesProps) {
  const [activeClass, setActiveClass] = useState<'8' | '9' | '10'>(user?.class as any || '10');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [resources, setResources] = useState<SubjectResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const lastAttemptRef = useRef<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upiId = (import.meta as any).env?.VITE_UPI_ID || '9236489649@mbk';

  // Real-time listener removed to avoid Firestore quota, using Bridge (Supabase)
  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        console.log("PremiumNotes: Fetching resources for class:", activeClass);
        const data = await dataBridge.getResources(activeClass);
        console.log("PremiumNotes: Received data:", data?.length, "items");
        if (data && data.length > 0) {
          const premiumOnly = data.filter((res: any) => res.isFree !== true);
          setResources(premiumOnly);
        } else {
          setResources([]);
        }
      } catch (err) {
        console.error("PremiumNotes: Fetch error:", err);
        setResources([]);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [activeClass]);

  const isUnlocked = (res: SubjectResource) => {
    // 0. Free resources are always unlocked
    // Use strict check: must be explicitly true
    if (res.isFree === true) return true;

    if (!user) return false;
    
    // 1. Admin Overrides - Use absolute email check as backup
    const adminEmails = ['expertraj8@gmail.com', 'expertnotevix@gmail.com'];
    const userEmail = user.email?.toLowerCase();
    const isAdmin = adminEmails.includes(userEmail);
    if (user.role === 'admin' || isAdmin) return true;
    
    // 2. Subscription Check (Master access)
    // Only grant blanket access if the user is premium AND has a recurring plan type (not just a single purchase)
    if (user.isPremium && (user.planType === 'monthly_sub' || user.planType === 'plus_sub' || user.role === 'admin')) {
      return true;
    }
    
    // 3. Class-wide Master Pack Check
    const unlockedClasses = user.unlockedClasses || [];
    const resClass = String(res.class);
    if (unlockedClasses.some(c => String(c) === resClass)) return true;
    
    // 4. Individual Resource Check
    const unlockedResources = user.unlockedResources || [];
    if (unlockedResources.includes(res.id)) return true;
    
    return false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('Screenshot too large (Max 8MB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1024; // HD processing
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }
          setScreenshotPreview(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePurchase = async () => {
    if (isSubmitting || aiVerifying || !whatsapp || (!user && !email) || !screenshotPreview) {
      toast.error('Please provide WhatsApp and Payment Screenshot.');
      return;
    }

    // RATE LIMITING PROTECTION
    const now = Date.now();
    if (now - lastAttemptRef.current < 5000) {
       toast.error("Please wait a few seconds before retrying.");
       return;
    }
    lastAttemptRef.current = now;

    setIsSubmitting(true);
    setAiVerifying(true);

    try {
      const result = await geminiService.verifyPaymentScreenshot(screenshotPreview);
      setAiVerifying(false);
      
      if (!result.isValid) {
        throw new Error(result.error || "AI could not verify this receipt. Please ensure UTR/Ref ID is visible.");
      }

      if (result.amount !== (selectedPlan?.price || 0)) {
         throw new Error(`Amount mismatch! AI detected ₹${result.amount} but this plan costs ₹${selectedPlan?.price}. Please pay the correct amount.`);
      }

      const finalTxId = result.transactionId?.toUpperCase().replace(/[^A-Z0-9]/g, '') || '';
      
      if (!finalTxId || finalTxId.length < 6) {
        throw new Error("Could not find a valid Transaction ID. Please ensure the UTR/Reference number is clearly visible.");
      }

      // DOUBLE-SPEND PROTECTION using bridge
      const isRedeemed = await dataBridge.isTransactionRedeemed(finalTxId);
      if (isRedeemed) {
        throw new Error(`Transaction ID ${finalTxId} has already been used to unlock resources.`);
      }
      
      const purchaseData = {
        whatsapp,
        transactionId: finalTxId,
        amount: result.amount || selectedPlan?.price || 0,
        planId: selectedPlan?.id,
        planName: selectedPlan?.name,
        class: selectedPlan?.class || activeClass,
        resourceId: selectedPlan?.resourceId || null,
        isGuest: !user,
        status: 'approved' // AI Verified = Approved
      };

      let saveResult;
      if (user) {
        // Logged-in user: Save to bridge
        saveResult = await dataBridge.savePurchaseRequest({
          ...purchaseData,
          userId: user.uid,
          email: user.email
        });

        if (saveResult.success) {
          // Attempt instant local access grant
          toast.success("AI Verified Successfully! Instant access granted. Refreshing...", {
            duration: 8000,
            icon: '✅'
          });
          
          // Force a small delay then reload
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return;
        }
      } else {
        // Guest user flow
        saveResult = await dataBridge.savePurchaseRequest({
          ...purchaseData,
          email: email,
          userId: 'GUEST'
        });

        if (saveResult.success) {
          toast.success("Payment verified! Access will be linked to your email shortly. Please keep your receipt safe.");
          setSelectedPlan(null);
          return;
        }
      }

      // If we reach here, it means saveResult.success was false
      // Handle failure with WhatsApp fallback
      const waNumber = "919236489649"; // Admin WhatsApp
      const waMessage = `Hi Admin, I just paid ₹${purchaseData.amount} for ${purchaseData.planName} (Tx: ${purchaseData.transactionId}). My email is ${user?.email || email}. Please verify my access!`;
      const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

      toast.error(saveResult?.error || "Database sync failed. Payment was verified but we couldn't link it to your account.", {
        duration: 10000,
        action: {
          label: "Fix via WhatsApp",
          onClick: () => window.open(waLink, '_blank')
        }
      });
      
      // Even if save failed, if it's the admin, just give access
      if (user?.role === 'admin') {
         toast.success("Admin detected: Granting session-access anyway.");
         setTimeout(() => window.location.reload(), 2000);
      }
      
    } catch (error: any) {
      console.error("Verification Error:", error);
      toast.error(error.message || "Verification failed. Try again.");
    } finally {
      setIsSubmitting(false);
      setAiVerifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-white/5 pb-12"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-indigo-500/20">Premium Section</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white uppercase flex flex-col">
            Digital 
            <span className="text-indigo-500">Library</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium max-w-md leading-relaxed uppercase tracking-widest">
            High-yield chapter notes, previous year questions, and AI-powered study guides.
          </p>
        </div>

        {/* Class Selector Tabs */}
        <div className="flex bg-white/5 p-2 rounded-[2rem] border border-white/5 backdrop-blur-xl shadow-2xl">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setActiveClass(cls as any)}
              className={`px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                activeClass === cls 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 scale-105' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Main Content: The Library Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-[500px] bg-white/5 animate-pulse rounded-[3rem]" />
              ))}
            </div>
          ) : resources.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {resources.map((res, idx) => {
                const unlocked = isUnlocked(res);
                return (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 hover:border-indigo-500/30 rounded-[3rem] overflow-hidden transition-all duration-700 flex flex-col relative"
                  >
                    {/* Status Badge */}
                    <div className="absolute top-6 left-6 z-10">
                      {unlocked ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 backdrop-blur-md">
                          <Check className="w-3 h-3" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Unlocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 backdrop-blur-md">
                          <Crown className="w-3 h-3" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Premium</span>
                        </div>
                      )}
                    </div>

                    {/* Book Cover Container */}
                    <div className="relative aspect-[1/1] overflow-hidden bg-black/40 p-10 flex items-center justify-center">
                      <div className="relative w-full h-full shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3 group-hover:translate-y-[-10px]">
                        {res.coverUrl ? (
                          <img src={res.coverUrl} alt={res.subject} className="w-full h-full object-cover rounded-2xl border border-white/10" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${unlocked ? 'from-indigo-600 to-purple-800' : 'from-gray-800 to-black'} rounded-2xl flex flex-col items-center justify-center p-10 text-center text-white border border-white/10 relative`}>
                            <FileText className="w-20 h-20 mb-6 opacity-20 group-hover:scale-125 transition-transform" />
                            <h3 className="text-3xl font-black leading-none uppercase tracking-tighter mb-2">{res.subject}</h3>
                            <p className="text-[11px] font-bold opacity-40 uppercase tracking-[0.3em]">Master Guide</p>
                            <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-white/5 border border-white/10" />
                          </div>
                        )}
                        {/* Realistic Book Shine */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                      </div>

                      {!unlocked && (
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center justify-end pb-10 space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-500">
                          <Lock className="w-8 h-8 text-white/50 mb-2" />
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/80">Restricted Access</span>
                        </div>
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="p-10 flex-1 flex flex-col justify-between space-y-10">
                      <div className="space-y-4">
                        <div className="space-y-2">
                           <h4 className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-none">{res.subject}</h4>
                           <p className="text-xs text-gray-400 font-medium leading-relaxed italic">“{res.description || 'Step-by-step notes curated specifically for the latest board exams.'}”</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {(res.features || ['Digital E-Library', 'PYQ Collection', 'AI Mentor']).map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/5">
                        {unlocked ? (
                          <a 
                            href={res.driveLink || res.fullNotesUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full h-16 bg-white text-black rounded-3xl flex items-center justify-center gap-4 font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all shadow-2xl shadow-white/5 hover:bg-gray-200"
                          >
                            <ExternalLink className="w-5 h-5" />
                            Open Library
                          </a>
                        ) : (
                          <button 
                            onClick={() => {
                              setSelectedPlan({
                                id: `res_${res.id}`,
                                name: `${res.subject} Premium`,
                                price: res.price || 49,
                                resourceId: res.id,
                                type: 'one-time'
                              });
                            }}
                            className="w-full h-16 bg-indigo-600 text-white rounded-3xl flex items-center justify-center gap-4 font-black text-xs uppercase tracking-[0.3em] active:scale-95 transition-all hover:bg-indigo-500 shadow-2xl shadow-indigo-600/30 group/btn"
                          >
                            <div className="flex items-center gap-2 group-hover/btn:translate-x-1 transition-transform">
                              Get Access ₹{res.price || 49}
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-40 glass-card rounded-[4rem] bg-white/5 flex flex-col items-center justify-center space-y-8 border border-white/5">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 relative">
                <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping" />
                <BookOpen className="w-10 h-10 text-gray-700" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Curating Resources</h3>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-[0.3em]">Class {activeClass} Premium Hub arriving shortly.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Plans & Subscriptions */}
        <div className="space-y-10">
           <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-10 glass-card rounded-[3.5rem] border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent space-y-8 shadow-2xl relative overflow-hidden group"
           >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/40 transition-all" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h5 className="font-black text-lg text-white uppercase tracking-tighter">NoteVix <span className="text-indigo-400">Plus</span></h5>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">The Master Access</p>
                </div>
              </div>
              
              <div className="space-y-6 relative z-10">
                <p className="text-xs text-gray-400 leading-relaxed font-medium uppercase tracking-widest">Everything unlocked. All classes (8-10), all ebooks, and priority AI help. One pass to rule them all.</p>
                <button 
                  onClick={() => setSelectedPlan(PREMIUM_PLANS[0])}
                  className="w-full py-5 bg-white text-black rounded-3xl font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl active:scale-[0.98] transition-all hover:bg-gray-100"
                >
                  Join NoteVix+
                </button>
              </div>
           </motion.div>

           <div className="p-10 glass-card rounded-[3.5rem] bg-white/5 border border-white/5 space-y-8 shadow-xl">
              <h5 className="font-black text-[10px] text-gray-500 uppercase tracking-[0.4em]">Student Trust</h5>
              <div className="space-y-8">
                {[
                  { label: 'One-time Payment', icon: CreditCard, detail: 'Lifetime access to notes' },
                  { label: 'AI Doubt Solver', icon: Zap, detail: '24/7 smart assistant' },
                  { label: 'Safe & Secure', icon: ShieldCheck, detail: 'Verified by AI instant' }
                ].map((perk, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-indigo-600/10 group-hover:text-indigo-400 transition-all border border-white/5">
                      <perk.icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white block">{perk.label}</span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block opacity-60">{perk.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden"
              >
                {aiVerifying && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-[200] rounded-[3rem] border border-white/10">
                    <div className="w-16 h-16 relative">
                      <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <div className="absolute inset-4 bg-indigo-500/10 rounded-full animate-pulse" />
                    </div>
                    <div className="mt-8 text-center px-6">
                      <p className="text-white font-black text-xs uppercase tracking-[0.2em] mb-2 animate-pulse">Running Forensic Scan</p>
                      <p className="text-white/40 text-[7px] font-bold uppercase tracking-widest leading-relaxed">
                        AI is verifying payment authenticity... <br /> This takes about 5-10 seconds.
                      </p>
                    </div>
                  </div>
                )}
                <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar pb-10">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight">{selectedPlan.name}</h2>
                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Verify ₹{selectedPlan.price} Payment</p>
                  </div>
                  <button onClick={() => setSelectedPlan(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-indigo-600/5 border border-indigo-600/20 rounded-[2rem] flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-3xl">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}&pn=Poonam%20Devi&am=${selectedPlan.price}&cu=INR`}
                        alt="QR"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="text-center space-y-2">
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                         Pay to: <span className="text-white">Poonam Devi</span> <br />
                         ID: <span className="text-white">{upiId}</span>
                       </p>
                       <button 
                        onClick={() => {
                          navigator.clipboard.writeText(upiId);
                          toast.success('UPI ID Copied!');
                        }}
                        className="px-6 py-2 bg-white/5 rounded-xl border border-white/10 text-sm font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
                       >
                         {upiId}
                         <Copy className="w-3 h-3 text-indigo-400" />
                       </button>
                    </div>
                  </div>

                  <div className="space-y-4 pb-10">
                    <input 
                      type="tel" 
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="WhatsApp Number"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-medium focus:border-indigo-500 focus:outline-none transition-all"
                    />

                    {!user && (
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email (for delivery)"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-medium focus:border-indigo-500 focus:outline-none transition-all"
                      />
                    )}

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[2/1] rounded-3xl border-2 border-dashed border-indigo-500/20 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 cursor-pointer overflow-hidden relative group bg-indigo-500/[0.02]"
                    >
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                       {screenshotPreview ? (
                         <>
                           <img src={screenshotPreview} className="w-full h-full object-contain" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <span className="text-[10px] font-black uppercase text-white tracking-widest">Change Screenshot</span>
                           </div>
                         </>
                       ) : (
                         <>
                           <ImageIcon className="w-8 h-8 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                           <div className="text-center px-4">
                             <p className="text-[10px] font-black uppercase text-white tracking-widest mb-1">Upload Receipt Screenshot</p>
                             <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">AI Forensic Verification Active</p>
                           </div>
                         </>
                       )}
                    </div>

                    <div className="p-5 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-indigo-400 mt-0.5" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                          AI will automatically extract your <span className="text-white">Transaction ID</span> from the screenshot. Please ensure it is clear.
                        </p>
                      </div>
                      <div className="pt-3 border-t border-indigo-500/10 text-center space-y-1">
                         <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                           Payment Issues / Stuck? Contact Admin
                         </p>
                         <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest leading-relaxed">
                           WhatsApp: 9236489649 <br/> Gmail: expertnotevix@gmail.com
                         </p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              <div className="p-8 pt-0 flex-shrink-0">
                <button
                  onClick={handlePurchase}
                  disabled={isSubmitting || aiVerifying}
                  className="w-full h-16 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  {aiVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  {aiVerifying ? 'Verifying...' : 'Verify Payment & Unlock'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
