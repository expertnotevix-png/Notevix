import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, Check, ShieldCheck, Copy, ExternalLink, X, 
  CreditCard, Loader2, Zap, BookOpen, Lock, Download,
  ChevronRight, FileText, Upload, Image as ImageIcon,
  SearchCheck, FilePlus, AlertCircle, Key, Info
} from 'lucide-react';
import { UserProfile, SubjectResource, ValidPayment } from '../types';
import { db, handleFirestoreError, OperationType } from '../components/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc, setDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";
import { useRef } from 'react';
import { geminiService } from '../services/geminiService';
import { SUBJECT_PASSWORDS, PAYMENT_GUIDELINES } from '../constants';

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
  const [activeClass, setActiveClass] = useState<'8' | '9' | '10'>('10');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [resources, setResources] = useState<SubjectResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ password: string; subject: string } | null>(null);
  const lastAttemptRef = useRef<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upiId = (import.meta as any).env?.VITE_UPI_ID || '9236489649@mbk';

  // Real-time listener removed to avoid Firestore quota, using Bridge (Supabase)
  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (loading && isMounted) {
        setLoadingError("Connection timed out. Please check your internet or try refreshing.");
        setLoading(false);
      }
    }, 10000);

    const fetchResources = async () => {
      if (!isMounted) return;
      setLoading(true);
      setLoadingError(null);
      try {
        console.log("PremiumNotes: Fetching resources for class:", activeClass);
        // 1. Fetch Premium Resources
        const premiumData = await dataBridge.getResources(activeClass);
        
        // 2. Fetch Free Resources from new table
        const freeData = await dataBridge.getFreeResources(activeClass);

        if (!isMounted) return;
        
        // Transform free resources to match SubjectResource type
        const transformedFree = (freeData || []).map((f: any) => ({
          id: f.id,
          class: f.class_level,
          subject: f.subject,
          description: f.description,
          driveLink: f.drive_link,
          password: f.password,
          coverUrl: f.cover_url,
          isFree: true,
          price: 0
        }));

        const transformedPremium = (premiumData || []).map((p: any) => ({
          ...p,
          isFree: false // Ensure we mark them specifically
        }));

        // Combine both - actually user wants to remove free resources from here
        // Change: only use transformedPremium
        setResources(transformedPremium);
      } catch (err) {
        console.error("PremiumNotes: Fetch error:", err);
        if (isMounted) setLoadingError("Failed to synchronize library. Please try again.");
        setResources([]);
      } finally {
        if (isMounted) {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    };

    // Small delay to ensure component is fully mounted and route transition finished
    const startFetch = setTimeout(fetchResources, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      clearTimeout(startFetch);
    };
  }, [activeClass]);

  const getDirectDownloadLink = (link: string) => {
    if (!link) return '';
    if (link.includes('drive.google.com')) {
      const match = link.match(/[-\w]{25,}/);
      if (match) {
        return `https://drive.google.com/uc?export=download&id=${match[0]}`;
      }
    }
    return link;
  };

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
    if (user.isPremium && (user.planType === 'monthly_sub' || user.planType === 'plus_sub')) {
      return true;
    }
    
    // 3. Class-wide Master Pack Check
    const unlockedClasses = user.unlockedClasses || [];
    const resClass = String(res.class);
    if (unlockedClasses.some(c => String(c) === resClass)) return true;
    
    // 4. Individual Resource Check
    const unlockedResources = user.unlockedResources || [];
    const resId = String(res.id);
    if (unlockedResources.some(id => String(id) === resId)) return true;
    
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
      const targetSubject = (selectedPlan?.name || '').toLowerCase().split(' ')[0] || '';
      let targetPassword = '';
      const paidAmountForPlan = selectedPlan?.price || 39;

      if (paidAmountForPlan >= 99) {
          targetPassword = Object.entries(SUBJECT_PASSWORDS)
            .map(([subj, pass]) => `${subj.toUpperCase()}: ${pass}`)
            .join('\n');
      } else {
          targetPassword = SUBJECT_PASSWORDS[targetSubject] || "CONTACT_ADMIN";
      }

      const result = await geminiService.verifyPaymentScreenshot(
        screenshotPreview, 
        paidAmountForPlan, 
        selectedPlan?.name || 'Premium Notes',
        targetPassword
      );
      setAiVerifying(false);
      
      if (!result.verified) {
        throw new Error(result.reason || "AI could not verify this receipt. Please ensure UTR/Ref ID is visible.");
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
        amount: result.amount || paidAmountForPlan,
        planId: selectedPlan?.id,
        planName: selectedPlan?.name,
        class: selectedPlan?.class || activeClass,
        resourceId: selectedPlan?.resourceId || null,
        paymentApp: result.paymentApp || 'Detected App',
        passwordUnlocked: result.password || targetPassword,
        productName: selectedPlan?.name,
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
          // If it was an individual subject purchase, show password immediately
          if (selectedPlan?.resourceId || selectedPlan?.id.startsWith('res_')) {
             setPurchaseSuccess({ 
               password: result.password || targetPassword, 
               subject: selectedPlan.name.replace(' Premium', '') 
             });
          } else {
             // Master pack or sub
             toast.success("AI Verified Successfully! Master Pack Unlocked. Refreshing...", {
               duration: 8000,
               icon: '✅'
             });
             setTimeout(() => window.location.reload(), 2000);
          }
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
          if (selectedPlan?.resourceId || selectedPlan?.id.startsWith('res_')) {
            setPurchaseSuccess({ 
              password: result.password || targetPassword, 
              subject: selectedPlan.name.replace(' Premium', '') 
            });
          } else {
            toast.success("Payment verified! Access will be linked to your email shortly. Please keep your receipt safe.");
            setSelectedPlan(null);
          }
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

      <div className="space-y-12 mb-20">
        {/* Recommended Section Heading */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Recommended For You</h2>
          <div className="h-px flex-1 bg-white/5 mx-6 hidden sm:block" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hidden sm:block">BASED ON YOUR CLASS</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Main Content: The Library Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="aspect-[3/4] bg-white/5 animate-pulse rounded-3xl" />
                ))}
              </div>
            ) : loadingError ? (
              <div className="flex flex-col items-center justify-center py-32 text-center bg-white/5 rounded-[4rem] border border-white/5 p-10">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Sync Failed</h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest max-w-xs mb-8">
                  {loadingError}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/40 active:scale-95 transition-transform"
                >
                  Retry Synchronization
                </button>
              </div>
            ) : resources.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                {resources.map((res, idx) => {
                  const unlocked = isUnlocked(res);
                  const originalPrice = Math.round((res.price || 49) * 1.5);
                  const discount = Math.round(((originalPrice - (res.price || 49)) / originalPrice) * 100);
                  const rating = (4.7 + Math.random() * 0.3).toFixed(1);
                  const isBestSeller = idx === 0 || idx === 2;

                  return (
                    <motion.div
                      key={res.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex flex-col h-full"
                    >
                      {/* Product Card Container */}
                      <div className="relative bg-[#0c0c0c] border border-white/5 hover:border-indigo-500/30 rounded-[2rem] overflow-hidden transition-all duration-500 flex flex-col h-full shadow-lg group-hover:shadow-indigo-500/10">
                        {/* Top Labels */}
                        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                          {isBestSeller && (
                            <div className="px-2 py-1 bg-yellow-400 text-black text-[7px] font-black uppercase tracking-tighter rounded-md shadow-lg">
                              Best Seller
                            </div>
                          )}
                          {res.isFree ? (
                            <div className="px-2 py-1 bg-emerald-500 text-black text-[7px] font-black uppercase tracking-tighter rounded-md">
                              Free
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-indigo-600 text-white text-[7px] font-black uppercase tracking-tighter rounded-md">
                              Premium
                            </div>
                          )}
                        </div>

                        {/* Image Container */}
                        <div 
                          className="relative aspect-[3/4] bg-black/40 overflow-hidden cursor-pointer"
                          onClick={() => {
                            if (unlocked) {
                              window.open(getDirectDownloadLink(res.driveLink || res.fullNotesUrl || ''), '_blank');
                            } else {
                              setSelectedPlan({
                                id: `res_${res.id}`,
                                name: `${res.subject} Premium`,
                                price: res.price || 49,
                                resourceId: res.id,
                                type: 'one-time'
                              });
                            }
                          }}
                        >
                          {res.coverUrl ? (
                            <img 
                              src={res.coverUrl} 
                              alt={res.subject} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-black flex items-center justify-center p-6 text-center">
                              <FileText className="w-12 h-12 text-white/10 group-hover:scale-110 transition-transform" />
                              <span className="absolute bottom-4 left-4 right-4 text-[10px] font-black uppercase text-white/40 tracking-widest">{res.subject}</span>
                            </div>
                          )}
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform">
                              <SearchCheck className="w-6 h-6" />
                            </div>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <div className="flex items-center text-yellow-400">
                                <span className="text-[10px] font-bold">★</span>
                                <span className="text-[10px] font-black ml-0.5">{rating}</span>
                              </div>
                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">(1.2k+ Sold)</span>
                            </div>
                            <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">
                              {res.subject} {unlocked ? '(UNLOCKED)' : ''}
                            </h3>
                          </div>

                          <div className="pt-2 border-t border-white/5 space-y-3">
                            <div className="flex items-baseline gap-2">
                              {res.isFree ? (
                                <span className="text-lg font-black text-emerald-400 uppercase tracking-tighter">GRATIS</span>
                              ) : (
                                <>
                                  <span className="text-lg font-black text-white">₹{res.price || 49}</span>
                                  <span className="text-[10px] text-gray-500 line-through font-bold">₹{originalPrice}</span>
                                  <span className="text-[9px] text-emerald-500 font-black uppercase">-{discount}% OFF</span>
                                </>
                              )}
                            </div>

                            {unlocked && !res.isFree ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/10">
                                  <div className="overflow-hidden">
                                    <span className="text-[7px] font-black uppercase text-emerald-400 block mb-0.5">PASSWORD</span>
                                    <code className="text-[8px] font-black text-white tracking-widest break-all block">
                                      {res.password || SUBJECT_PASSWORDS[res.subject.toLowerCase()] || "SEE_ADMIN"}
                                    </code>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(res.password || SUBJECT_PASSWORDS[res.subject.toLowerCase()] || "");
                                      toast.success("Copied!");
                                    }}
                                    className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors text-emerald-400"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                                <a 
                                  href={getDirectDownloadLink(res.driveLink || res.fullNotesUrl || '')} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full h-10 bg-white text-black rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  SAVE NOW
                                </a>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Drive Link Button (Always available for preview/direct access) */}
                                <a 
                                  href={getDirectDownloadLink(res.driveLink || res.fullNotesUrl || '')} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="w-full h-10 bg-white/5 text-gray-400 border border-white/10 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all shadow-xl"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  DRIVE LINK
                                </a>

                                <button 
                                  onClick={() => {
                                    if (unlocked) {
                                      window.open(getDirectDownloadLink(res.driveLink || res.fullNotesUrl || ''), '_blank');
                                    } else {
                                      setSelectedPlan({
                                        id: `res_${res.id}`,
                                        name: `${res.subject} Premium`,
                                        price: res.price || 49,
                                        resourceId: res.id,
                                        type: 'one-time'
                                      });
                                    }
                                  }}
                                  className={`w-full h-10 rounded-xl flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all shadow-xl ${
                                    unlocked 
                                      ? 'bg-white text-black hover:bg-gray-100' 
                                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                  }`}
                                >
                                  {unlocked ? (
                                    <><Download className="w-3.5 h-3.5" /> DOWNLOAD</>
                                  ) : (
                                    <><Crown className="w-3.5 h-3.5" /> BUY NOW</>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
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
    </div>

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
                           <code className="text-sm sm:text-xl font-black text-white tracking-[0.15em] break-all px-4 block bg-white/5 py-4 rounded-2xl border border-white/10 select-all">
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
                       Password must be entered exactly in <span className="text-white">CAPITAL LETTERS</span> to open the PDF.
                     </p>
                   </div>
                   
                   <button 
                    onClick={() => {
                      setPurchaseSuccess(null);
                      setSelectedPlan(null);
                      window.location.reload();
                    }}
                    className="w-full h-16 bg-white text-black rounded-3xl font-black text-sm uppercase tracking-[0.3em] active:scale-95 transition-all shadow-2xl"
                   >
                     GO TO LIBRARY
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

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

                    <div className="p-5 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 space-y-4">
                      <div className="flex items-start gap-3">
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
