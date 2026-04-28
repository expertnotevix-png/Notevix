import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Crown, Check, ShieldCheck, QrCode, Copy, 
  ExternalLink, X, Send, CreditCard, Upload, 
  Image as ImageIcon, Loader2, Zap, BookOpen, 
  Lock, ChevronRight, FileText, Download 
} from 'lucide-react';
import { UserProfile, SubjectResource } from '../types';
import { db, handleFirestoreError, OperationType, checkQuotaLock } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { GoogleGenerativeAI } from "@google/generative-ai";

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
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Screenshot must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const parseAIJson = (text: string) => {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        return JSON.parse(text.substring(start, end + 1));
      }
      return JSON.parse(text);
    } catch (e) {
      console.error("Parse error:", text);
      return { verified: false };
    }
  };

  const normalizeId = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

  const handlePurchase = async () => {
    if (isSubmitting || aiVerifying || !whatsapp || !screenshotPreview) {
      toast.error('Details missing');
      return;
    }

    setIsSubmitting(true);
    setAiVerifying(true);

    try {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Extract UPI details. Recipient: 9236489649@mbk, Amount: ₹${selectedPlan?.price}. JSON ONLY: {verified: boolean, transactionId: string}`;
      
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: screenshotPreview.split(',')[1] } }] }]
      });

      const result = parseAIJson(response.response.text());
      const txId = normalizeId(result.transactionId || '');

      if (!result.verified || !txId) {
        throw new Error("AI could not verify payment. Reason: " + (result as any).reason || "Details unclear");
      }

      const txRef = doc(db, 'transaction_id_registry', txId);
      const txSnap = await getDoc(txRef);
      if (txSnap.exists()) throw new Error("Duplicate transaction!");

      await setDoc(txRef, { userId: user.uid, usedAt: new Date().toISOString(), amount: selectedPlan?.price });
      
      const updateData: any = { isPremium: true, planType: selectedPlan?.id || 'individual_resource' };
      
      if (selectedPlan?.class && selectedPlan.type === 'one-time') {
        updateData.unlockedClasses = [...(user.unlockedClasses || []), selectedPlan.class];
      }
      
      if (selectedPlan?.resourceId) {
        updateData.unlockedResources = [...(user.unlockedResources || []), selectedPlan.resourceId];
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      toast.success("Payment Verified! " + (selectedPlan?.resourceId ? "Book" : "Class") + " Unlocked.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
      setAiVerifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32">
      {/* Search & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-500" />
            Digital Library
          </h1>
          <p className="text-gray-500 text-sm font-medium">Premium chapter-wise notes & exam guides</p>
        </div>

        {/* Class Selector Tabs */}
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setActiveClass(cls as any)}
              className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeClass === cls 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Main Content: The Library Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[400px] bg-white/5 animate-pulse rounded-[2rem]" />
              ))}
            </div>
          ) : resources.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {resources.map((res) => {
                const unlocked = isUnlocked(res);
                return (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-[#0a0a0a] border border-white/5 hover:border-white/20 rounded-[2.5rem] overflow-hidden transition-all duration-500 flex flex-col"
                  >
                    {/* Book Cover Container */}
                    <div className="relative aspect-[1/1] overflow-hidden bg-gradient-to-br from-indigo-900/40 to-black p-6 flex items-center justify-center">
                      <div className="relative w-full h-full shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-2">
                        {res.coverUrl ? (
                          <img src={res.coverUrl} alt={res.subject} className="w-full h-full object-cover rounded-md" />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${unlocked ? 'from-indigo-600 to-purple-600' : 'from-gray-700 to-gray-900'} rounded-md flex flex-col items-center justify-center p-8 text-center text-white relative`}>
                            <FileText className="w-16 h-16 mb-4 opacity-30" />
                            <h3 className="text-2xl font-black leading-tight uppercase tracking-tighter">{res.subject}</h3>
                            <p className="text-[10px] font-bold mt-4 opacity-60 uppercase tracking-widest leading-loose">Comprehensive Notes & Questions</p>
                            <div className="absolute top-2 left-2 px-3 py-1 bg-white/10 rounded-full text-[8px] font-black tracking-widest uppercase">NoteVix Premium</div>
                          </div>
                        )}
                      </div>

                      {!unlocked && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center space-y-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                            <Lock className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-widest text-white">Unlock Content</span>
                        </div>
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-indigo-400/10 text-indigo-400 text-[8px] font-black rounded-full uppercase tracking-widest">
                            Class {res.class}
                          </span>
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded-full uppercase tracking-widest">
                            Premium Edition
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{res.subject}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Exclusive Drive Library & AI Access</p>
                      </div>

                      {unlocked ? (
                        <div className="space-y-3">
                          <a 
                            href={res.driveLink || res.fullNotesUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full h-12 bg-white text-black rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-white/5"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Access Drive
                          </a>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedPlan({
                              id: `res_${res.id}`,
                              name: `${res.subject} (Class ${res.class})`,
                              price: res.price || 49,
                              resourceId: res.id,
                              type: 'one-time'
                            });
                          }}
                          className="w-full h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-indigo-500 shadow-xl shadow-indigo-600/20"
                        >
                          <Zap className="w-4 h-4" />
                          Get it Now (₹{res.price || 49})
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-32 glass-card rounded-[3rem] bg-white/5 flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                <BookOpen className="w-10 h-10 text-gray-700" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Library Restocking</h3>
                <p className="text-gray-500 text-sm">Notes for Class {activeClass} {resources.length === 0 ? 'are arriving soon.' : ''}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Plans & Subscriptions */}
        <div className="space-y-8">
           <div className="p-8 glass-card rounded-[2.5rem] border-indigo-500/20 bg-indigo-500/5 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h5 className="font-black text-sm text-white uppercase tracking-tighter">NoteVix Plus</h5>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Master Library Pass</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed font-medium">Unlock all classes, books, and AI features globally with our master subscription.</p>
                <button 
                  onClick={() => setSelectedPlan(PREMIUM_PLANS[0])}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all"
                >
                  Join the Club
                </button>
              </div>
           </div>

           <div className="p-8 glass-card rounded-[2.5rem] bg-white/5 border border-white/5 space-y-6">
              <h5 className="font-bold text-[10px] text-gray-500 uppercase tracking-[0.3em]">Quick Perks</h5>
              <div className="space-y-5">
                {[
                  { label: 'One-time Payment', icon: CreditCard },
                  { label: 'AI Doubt Solver', icon: Zap },
                  { label: 'Secure Payment', icon: ShieldCheck }
                ].map((perk, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-indigo-400 transition-colors">
                      <perk.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{perk.label}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden"
            >
              <div className="p-8 space-y-8">
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
                      placeholder="WhatsApp Number for Delivery"
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-medium focus:border-indigo-500 focus:outline-none transition-all"
                    />
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-video rounded-3xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 cursor-pointer overflow-hidden relative group"
                    >
                       <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                       {screenshotPreview ? (
                         <>
                           <img src={screenshotPreview} className="w-full h-full object-contain" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <span className="text-[10px] font-black uppercase text-white tracking-widest">Change Image</span>
                           </div>
                         </>
                       ) : (
                         <>
                           <Upload className="w-6 h-6 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                           <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-indigo-400">Upload Transfer Receipt</span>
                         </>
                       )}
                    </div>

                    <button
                      onClick={handlePurchase}
                      disabled={isSubmitting}
                      className="w-full h-16 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
                    >
                      {aiVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                      {aiVerifying ? 'Verifying with AI...' : 'Verify & Unlock Now'}
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
