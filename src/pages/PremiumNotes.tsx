import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Crown, Check, ShieldCheck, QrCode, Copy, ExternalLink, X, Send, CreditCard } from 'lucide-react';
import { UserProfile, PurchaseRequest } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

interface PremiumNotesProps {
  user: UserProfile;
}

const PREMIUM_PLANS = [
  {
    id: 'monthly_sub',
    name: 'NoteVix Plus',
    price: 49,
    description: 'Monthly Subscription',
    features: ['All Class 8-10 Notes', 'Unlimited AI Doubt Solver', 'Exclusive Exam PDFs', 'Priority Chat Support'],
    color: 'from-purple-500 to-indigo-600',
    popular: true,
    type: 'subscription'
  },
  {
    id: 'class_8_one_time',
    name: 'Class 8 Pack',
    class: '8',
    price: 99,
    description: 'Lifetime for Class 8',
    features: ['All Class 8 Notes', 'Chapter-wise AI Solver', 'Standard PDFs'],
    color: 'from-blue-500 to-cyan-600',
    type: 'one-time'
  },
  {
    id: 'class_9_one_time',
    name: 'Class 9 Pack',
    class: '9',
    price: 99,
    description: 'Lifetime for Class 9',
    features: ['All Class 9 Notes', 'Chapter-wise AI Solver', 'Standard PDFs'],
    color: 'from-emerald-500 to-teal-600',
    type: 'one-time'
  },
  {
    id: 'class_10_one_time',
    name: 'Class 10 Pack',
    class: '10',
    price: 99,
    description: 'Lifetime for Class 10',
    features: ['All Class 10 Notes', 'Chapter-wise AI Solver', 'Standard PDFs'],
    color: 'from-orange-500 to-pink-600',
    type: 'one-time'
  }
];

export default function PremiumNotes({ user }: PremiumNotesProps) {
  const [selectedPlan, setSelectedPlan] = useState<typeof PREMIUM_PLANS[0] | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  const upiId = (import.meta as any).env?.VITE_UPI_ID || '9236489649@mbk';

  useEffect(() => {
    // 1. Check for pending requests in real-time
    const q = query(
      collection(db, 'purchase_requests'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setHasPendingRequest(!snap.empty);
    }, (error) => {
      console.error("Error monitoring purchase requests:", error);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handlePurchase = async () => {
    if (!transactionId || !whatsapp) {
      toast.error('Please enter Transaction ID and WhatsApp number');
      return;
    }

    setIsSubmitting(true);
    try {
      const request: Omit<PurchaseRequest, 'id'> = {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        planId: selectedPlan!.id,
        planName: selectedPlan!.name,
        amount: selectedPlan!.price,
        transactionId: transactionId,
        whatsappNumber: whatsapp,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      // Add plan specific meta
      const finalRequest = {
        ...request,
        targetClass: (selectedPlan as any).class || null,
        planType: (selectedPlan as any).type,
        instagramUsername: user.instagramUsername || null
      };

      await addDoc(collection(db, 'purchase_requests'), finalRequest);
      toast.success('Payment submitted! Admin will verify and activate your premium access.');
      setSelectedPlan(null);
      setHasPendingRequest(true);
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'purchase_requests');
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUPI = () => {
    navigator.clipboard.writeText(upiId);
    toast.success('UPI ID copied!');
  };

  return (
    <div className="p-6 space-y-12 min-h-screen pb-32">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
          <Crown className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-500 text-xs font-black uppercase tracking-widest">Premium Store</span>
        </div>
        <h1 className="text-4xl font-black italic tracking-tight underline decoration-purple-500/50 underline-offset-8">Go Premium</h1>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          One-time class packs for ₹99 or get everything with a monthly subscription.
        </p>
      </div>

      {!user.isPremium && hasPendingRequest && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-yellow-500">Wait for verification</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-normal">
              Your previous request is being verified. Premium will be active shortly.
            </p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-6">
        {PREMIUM_PLANS.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ scale: 1.02 }}
            className={`relative p-8 rounded-[2.5rem] border border-white/10 overflow-hidden bg-gradient-to-br ${plan.color} bg-opacity-10`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 px-6 py-2 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-bl-3xl">
                Most Popular
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-2xl font-black">{plan.name}</h3>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{(plan as any).description}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black text-white">₹{plan.price}</span>
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    {plan.type === 'subscription' ? '/ month' : 'one-time'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm text-white/90 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedPlan(plan)}
                disabled={user.isPremium || (plan.type === 'one-time' && user.unlockedClasses?.includes((plan as any).class)) || hasPendingRequest}
                className="w-full py-4 bg-white text-black rounded-2xl font-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                {user.isPremium ? 'Full Access Active' : 
                 (plan.type === 'one-time' && user.unlockedClasses?.includes((plan as any).class)) ? 'Class Unlocked' : 
                 hasPendingRequest ? 'Pending' : 'Get Started Now'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlan(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tight">{selectedPlan.name}</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Complete Payment</p>
                  </div>
                  <button 
                    onClick={() => setSelectedPlan(null)}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* UPI Box */}
                  <div className="glass-card p-6 rounded-[2rem] border-purple-500/20 bg-purple-500/5 space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-white rounded-3xl">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${upiId}&pn=NoteVix&am=${selectedPlan.price}&cu=INR`}
                          alt="Payment QR"
                          className="w-32 h-32"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">UPI ID</p>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 group cursor-pointer" onClick={copyUPI}>
                          <span className="text-sm font-bold">{upiId}</span>
                          <Copy className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-[10px] text-yellow-500 font-bold uppercase tracking-widest text-center leading-normal">
                      Pay ₹{selectedPlan.price} and copy the Transaction ID / Ref No.
                    </div>
                  </div>

                  {/* Submission Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">Transaction ID / Ref No.</label>
                      <input 
                        type="text" 
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Enter 12-digit number"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-medium focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-1">WhatsApp Number</label>
                      <input 
                        type="tel" 
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="+91 XXXXX XXXXX"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-sm font-medium focus:outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <button
                      onClick={handlePurchase}
                      disabled={isSubmitting}
                      className="w-full py-5 purple-gradient rounded-3xl font-black text-lg shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Submit Payment
                        </>
                      )}
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
