import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, Check, ShieldCheck, Copy, ExternalLink, X, 
  CreditCard, Loader2, Zap, BookOpen, Lock, 
  ChevronRight, FileText, Upload, Image as ImageIcon,
  SearchCheck, FilePlus, AlertCircle
} from 'lucide-react';
import { UserProfile, SubjectResource, ValidPayment } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";
import { useRef } from 'react';
import { geminiService } from '../services/geminiService';

interface PremiumNotesProps {
  user: UserProfile;
}

const CLASSES = ['8', '9', '10'];

const PREMIUM_PLANS = [
  {
    id: 'monthly_sub',
    name: 'NoteVix Plus',
    price: 199,
    description: 'Full Access (All Classes)',
    features: ['All Class 8-10 Notes', 'Unlimited AI Doubt Solver', 'Exclusive Exam PDFs', 'Priority Chat Support'],
    color: 'from-indigo-600 to-purple-600',
    type: 'subscription'
  },
  {
    id: 'class_8_one_time',
    name: 'Class 8 Master Pack',
    class: '8',
    price: 99,
    features: ['All Class 8 Notes', 'Chapter-wise AI Solver', 'Lifetime Access'],
    color: 'from-blue-600 to-cyan-600',
    type: 'one-time'
  },
  {
    id: 'class_9_one_time',
    name: 'Class 9 Master Pack',
    class: '9',
    price: 99,
    features: ['All Class 9 Notes', 'Chapter-wise AI Solver', 'Lifetime Access'],
    color: 'from-emerald-600 to-teal-600',
    type: 'one-time'
  },
  {
    id: 'class_10_one_time',
    name: 'Class 10 Master Pack',
    class: '10',
    price: 99,
    features: ['All Class 10 Notes', 'Chapter-wise AI Solver', 'Lifetime Access'],
    color: 'from-orange-600 to-pink-600',
    type: 'one-time'
  }
];

export default function PremiumNotes({ user }: PremiumNotesProps) {
  const [activeClass, setActiveClass] = useState<'8' | '9' | '10'>(user.class as any || '10');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [resources, setResources] = useState<SubjectResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upiId = (import.meta as any).env?.VITE_UPI_ID || '9236489649@mbk';

  useEffect(() => {
    fetchResources();
  }, [activeClass]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'subject_resources'), where('class', '==', activeClass));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SubjectResource));
      setResources(data);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (res: SubjectResource) => {
    if (user.isPremium && user.planType === 'monthly_sub') return true;
    if (user.unlockedClasses?.includes(res.class)) return true;
    return user.unlockedResources?.includes(res.id);
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

  const parseAIJson = (text: string) => {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return JSON.parse(text);
    } catch (e) { return { verified: false }; }
  };

  const handlePurchase = async () => {
    if (isSubmitting || aiVerifying || !whatsapp || (!transactionId && !screenshotPreview)) {
      toast.error('Please enter Transaction ID or upload screenshot');
      return;
    }

    setIsSubmitting(true);
    setAiVerifying(true);

    try {
      let finalTxId = transactionId.trim().toUpperCase();
      let aiDetectedAmount = 0;

      // --- 1. AI EXTRACTION & VERIFICATION (NVIDIA PRIORITY) ---
      if (screenshotPreview) {
        setAiVerifying(true);
        const prompt = `You are the NoteVix Secure Auditor. 
        Verify this payment receipt screenshot.
        
        STRICT CHECKLIST:
        1. Recipient MUST be: "${upiId}"
        2. Amount MUST be at least: ₹${selectedPlan?.price}
        
        Task: Extract the 12-digit Transaction ID / UTR number.
        Output ONLY valid JSON:
        {
          "transactionId": "string",
          "amount": number,
          "isVerified": boolean,
          "reason": "explanation"
        }`;

        const system = "You are a professional payment forensics expert. Analyze receipt screenshots with 100% accuracy. Return JSON only.";
        
        let aiResultRaw: string;
        try {
          // Attempt NVIDIA Multimodal
          aiResultRaw = await geminiService.callNvidiaAPI(
            prompt, 
            system, 
            true, 
            "nvidia/llama-3.2-11b-vision-instruct", 
            60000, 
            screenshotPreview
          );
        } catch (nvidiaErr) {
          console.warn("NVIDIA Vision failed, falling back to Gemini...", nvidiaErr);
          // Fallback to Gemini 3 Flash
          const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (process as any).env.GEMINI_API_KEY;
          if (!apiKey) throw new Error("Verification service busy. Please try again.");
          
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: screenshotPreview.split(',')[1] } }
            ],
            config: { responseMimeType: "application/json" }
          });
          aiResultRaw = response.text;
        }

        const aiData = parseAIJson(aiResultRaw);
        
        if (!aiData.isVerified) {
          throw new Error(aiData.reason || "Payment details do not match NoteVix requirements.");
        }

        if (aiData.transactionId) {
          finalTxId = aiData.transactionId.toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
        aiDetectedAmount = aiData.amount || 0;
      }

      if (!finalTxId || finalTxId.length < 6) {
        throw new Error("Could not extract a valid Transaction ID. Please type it manually.");
      }

      // --- 2. DOUBLE-SPEND PROTECTION ---
      const registryDoc = doc(db, 'transaction_id_registry', finalTxId);
      const registrySnap = await getDoc(registryDoc);
      if (registrySnap.exists()) {
        throw new Error("This Transaction ID has already been redeemed.");
      }
      
      // --- 3. AUTO-UNLOCK ---
      // Mark TX ID as used by creating the document with the TX ID as document name
      try {
        await setDoc(doc(db, 'transaction_id_registry', finalTxId), { 
          userId: user.uid,
          redeemedAt: new Date().toISOString(),
          planId: selectedPlan?.id,
          amount: aiDetectedAmount || selectedPlan?.price || 0
        });
      } catch (e: any) {
        if (e.message?.includes('permission-denied')) {
          throw new Error("Transaction verification error. This ID might be pending review.");
        }
        throw e;
      }
      
      // Log for Admin Audit
      await addDoc(collection(db, 'transaction_ledger'), {
        transactionId: finalTxId,
        userId: user.uid,
        whatsapp: whatsapp,
        amount: aiDetectedAmount || selectedPlan?.price || 0,
        planId: selectedPlan?.id,
        timestamp: new Date().toISOString()
      });

      const updateData: any = { isPremium: true, planType: selectedPlan?.id || 'individual_resource' };
      
      if (selectedPlan?.class && selectedPlan.type === 'one-time') {
        const currentUnlocked = user.unlockedClasses || [];
        if (!currentUnlocked.includes(selectedPlan.class)) {
          updateData.unlockedClasses = [...currentUnlocked, selectedPlan.class];
        }
      }
      
      if (selectedPlan?.resourceId) {
        const currentRes = user.unlockedResources || [];
        if (!currentRes.includes(selectedPlan.resourceId)) {
          updateData.unlockedResources = [...currentRes, selectedPlan.resourceId];
        }
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      toast.success("AI Verified Successfully! Access Granted.");
      setTimeout(() => window.location.reload(), 2000);
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
              <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar pb-16">
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
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}&pn=NoteVix&am=${selectedPlan.price}&cu=INR`}
                        alt="QR"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="text-center space-y-2">
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tap to copy UPI ID</p>
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

                  <div className="space-y-4">
                    <input 
                      type="tel" 
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="WhatsApp Number (for delivery)"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-medium focus:border-indigo-500 focus:outline-none transition-all"
                    />

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 cursor-pointer overflow-hidden relative group bg-white/[0.02]"
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
                           <ImageIcon className="w-8 h-8 text-gray-700 group-hover:text-indigo-500 transition-colors" />
                           <span className="text-[10px] font-black uppercase text-gray-600 group-hover:text-indigo-400 tracking-widest text-center px-4">Upload Payment Screenshot for AI Scan</span>
                         </>
                       )}
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <FilePlus className="w-4 h-4 text-gray-600" />
                      </div>
                      <input 
                        type="text" 
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Or Type Transaction ID (UTR)"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 text-sm font-medium focus:border-indigo-500 focus:outline-none transition-all placeholder:text-gray-600"
                      />
                    </div>

                    <div className="p-5 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-indigo-400 mt-0.5" />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                          Verification takes <span className="text-white">minimum 2 minutes</span>. Please be patient while AI scans and verifies with our backend.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handlePurchase}
                      disabled={isSubmitting || aiVerifying}
                      className="w-full h-16 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {aiVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      {aiVerifying ? 'AI Verification in Progress...' : 'Verify & Unlock Now'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
