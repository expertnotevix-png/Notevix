import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, Check, ShieldCheck, Copy, X, 
  CreditCard, Loader2, Zap, Download,
  FileText, SearchCheck, Info, Clock, XCircle, BookOpen, CheckCircle2
} from 'lucide-react';
import { AppUser, SubjectResource } from '../types';
import { toast } from 'sonner';
import { dataBridge } from '../services/dataBridge';
import { supabase } from '../lib/supabase';
import { auth } from '../components/firebase';

interface PremiumNotesProps {
  user: AppUser | null;
}

const CLASSES = ['8', '9', '10'];

const PREMIUM_PLANS = [
  {
    id: 'individual_subject',
    name: 'Individual Subject',
    price: 39,
    features: ['Chapter-wise One Page Notes', 'Important Questions PDF'],
    type: 'one-time'
  },
  {
    id: 'master_pack',
    name: 'Class Master Pack',
    price: 99,
    features: ['All Subjects All Chapters', 'Full Notes & PYQs'],
    type: 'one-time'
  }
];

export default function PremiumNotes({ user }: PremiumNotesProps) {
  const [activeClass, setActiveClass] = useState<'8' | '9' | '10'>('10');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [resources, setResources] = useState<SubjectResource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Purchase Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  // Success Step state
  const [isSuccessStep, setIsSuccessStep] = useState(false);
  const [submittedTxId, setSubmittedTxId] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedName, setSubmittedName] = useState('');

  useEffect(() => {
    if (selectedPlan) {
      if (user) {
        setBuyerName(user.displayName || '');
        setBuyerEmail(user.email || '');
      } else {
        setBuyerName('');
        setBuyerEmail('');
      }
      setBuyerPhone('');
      setAmount(selectedPlan.price ? selectedPlan.price.toString() : '39');
    }
  }, [selectedPlan, user]);

  useEffect(() => {
    fetchResources();
    if (user) {
      fetchUserHistory();
    }
  }, [activeClass, user]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = await dataBridge.getResources(activeClass);
      setResources(data || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserHistory = async () => {
    if (!user) return;
    const data = await dataBridge.getUserPayments(user.uid, user.email);
    setPurchaseHistory(data);
  };

  const handlePurchase = async () => {
    if (!buyerName || !buyerEmail || !buyerPhone || !amount || !transactionId) {
      toast.error('Please fill all fields');
      return;
    }

    const firebaseUser = auth.currentUser;
    const finalUid = user?.uid || firebaseUser?.uid || 'guest';

    setIsSubmitting(true);
    try {
      const res = await dataBridge.saveVerifiedPayment({
        user_id: finalUid,
        email: buyerEmail,
        product_name: selectedPlan.subject ? `${selectedPlan.subject} Notes (Class ${selectedPlan.class})` : selectedPlan.name,
        amount: parseFloat(amount),
        transaction_id: transactionId,
        phone_number: `${buyerName} (${buyerPhone})`, // Save combined Name & Phone
        status: 'pending',
        approved: false,
        created_at: new Date().toISOString()
      });

      if (!res.success) throw new Error(res.error || "Failed to submit");

      if (user?.uid) {
        localStorage.setItem('last_payment_user_id', user.uid);
      }
      setSubmittedTxId(transactionId);
      setSubmittedEmail(buyerEmail);
      setSubmittedName(buyerName);
      setIsSuccessStep(true);
      setTransactionId('');
      setAmount('');
      setBuyerName('');
      setBuyerEmail('');
      setBuyerPhone('');
      if (user) {
        fetchUserHistory();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDirectDownloadLink = (link: string) => {
    if (!link) return '';
    if (link.includes('drive.google.com')) {
      const match = link.match(/[-\w]{25,}/);
      if (match) return `https://drive.google.com/uc?export=download&id=${match[0]}`;
    }
    return link;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 pb-32 space-y-12">
      <header className="space-y-4">
        <h1 className="text-5xl font-black tracking-tighter uppercase">Digital <span className="text-indigo-500">Library</span></h1>
        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Premium one-page notes for Class 8-10.</p>
        
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 w-fit">
          {CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setActiveClass(cls as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeClass === cls ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="h-64 bg-white/5 rounded-[40px] flex items-center justify-center animate-pulse" />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {resources.map((res) => {
            return (
              <div key={res.id} className="bg-[#0c0c0c] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col group">
                <div className="aspect-[3/4] relative overflow-hidden">
                  {res.cover_image ? (
                    <img src={res.cover_image} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-indigo-600/10 flex items-center justify-center">
                      <BookOpen size={40} className="text-indigo-500/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black text-white">₹{res.price}</div>
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase truncate">{res.subject}</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Class {res.class}</p>
                  </div>

                  <div className="space-y-2">
                    <a 
                      href={res.drive_link || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase transition-all"
                    >
                      <FileText size={14} className="text-gray-400" /> Open PDF
                    </a>
                    
                    <button 
                      onClick={() => {
                        setIsSuccessStep(false);
                        setSubmittedTxId('');
                        setSelectedPlan({ ...PREMIUM_PLANS[0], subject: res.subject, class: res.class, price: res.price });
                      }}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Crown size={14} /> Buy Now
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-[#0A0A0B] border border-white/10 rounded-[40px] p-10 space-y-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase text-white">{selectedPlan.subject || selectedPlan.name}</h2>
                <button onClick={() => {
                  setSelectedPlan(null);
                  setIsSuccessStep(false);
                }}><X size={24} className="text-gray-500 hover:text-white" /></button>
              </div>

              {!isSuccessStep ? (
                <>
                  <div className="bg-indigo-600/5 p-8 rounded-3xl border border-indigo-600/20 flex flex-col items-center gap-6">
                     <div className="p-4 bg-white rounded-2xl">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=9236489649@mbk&pn=NoteVix&am=${selectedPlan.price}&cu=INR`} className="w-32 h-32" alt="UPI QR Code" />
                     </div>
                     <div className="text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Pay ₹{selectedPlan.price} via UPI</p>
                        <code className="text-lg font-black text-white select-all">9236489649@mbk</code>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                         <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Full Name</label>
                         <input 
                          type="text" 
                          placeholder="Your Name" 
                          value={buyerName} 
                          onChange={e => setBuyerName(e.target.value)}
                          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none focus:border-indigo-500 text-white"
                         />
                       </div>
                       <div>
                         <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Email Address</label>
                         <input 
                          type="email" 
                          placeholder="Your Email" 
                          value={buyerEmail} 
                          onChange={e => setBuyerEmail(e.target.value)}
                          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none focus:border-indigo-500 text-white"
                         />
                       </div>
                     </div>

                     <div>
                       <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Phone Number (WhatsApp)</label>
                       <input 
                        type="text" 
                        placeholder="WhatsApp Number" 
                        value={buyerPhone} 
                        onChange={e => setBuyerPhone(e.target.value)}
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none focus:border-indigo-500 text-white"
                       />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Amount Paid (₹)</label>
                          <input type="number" placeholder="Enter Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none text-white animate-none" />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Transaction ID (UTR)</label>
                          <input type="text" placeholder="UTR Number" value={transactionId} onChange={e => setTransactionId(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none font-mono text-white" />
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={handlePurchase} disabled={isSubmitting}
                    className="w-full h-16 bg-white text-black rounded-3xl font-black text-sm uppercase shadow-xl disabled:opacity-50 transition-all hover:bg-neutral-200"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </>
              ) : (
                <div className="space-y-6 text-center py-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-4 bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
                    <p className="text-emerald-400 text-sm font-black leading-relaxed">
                      Payment submitted successfully! ✅
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      To receive your PDF password, contact us on WhatsApp: <strong className="text-white">9236489649</strong>. Send your Transaction ID and we will send you the password within a few minutes!
                    </p>
                    <div className="pt-2">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Submitted ID</p>
                      <code className="text-xs bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-indigo-400 font-black inline-block mt-1 font-mono">{submittedTxId}</code>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <a 
                      href={`https://wa.me/919236489649?text=${encodeURIComponent(`Hi, My name is ${submittedName}. I paid for NoteVix. My Transaction ID is ${submittedTxId}. My Email is ${submittedEmail}. Please send me the PDF password.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black text-sm uppercase shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-2 transition-all"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.18 1.449 4.825 1.451 5.436 0 9.86-4.37 9.863-9.73.001-2.595-1.013-5.035-2.855-6.882C16.636 2.146 14.197.94 11.599.94c-5.45 0-9.88 4.372-9.883 9.73-.001 1.93.51 3.801 1.48 5.476l-.974 3.565 3.655-.958zm12.385-6.619c-.29-.144-1.713-.837-1.979-.933-.266-.096-.459-.144-.652.144-.193.288-.748.933-.917 1.125-.169.191-.338.216-.628.072-.29-.144-1.226-.447-2.336-1.427-.864-.763-1.448-1.706-1.617-1.994-.169-.288-.018-.444.127-.587.13-.13.29-.336.435-.504.145-.168.193-.288.29-.48.096-.192.048-.36-.024-.504-.072-.144-.652-1.554-.892-2.13-.233-.566-.47-.489-.652-.498-.169-.008-.362-.01-.556-.01-.193 0-.507.072-.772.36-.266.288-1.014.981-1.014 2.394 0 1.413 1.039 2.78 1.184 2.972.145.19 2.044 3.09 4.949 4.329.693.295 1.233.473 1.654.606.697.219 1.332.188 1.833.114.558-.083 1.713-.692 1.954-1.36.242-.667.242-1.241.169-1.36-.073-.119-.266-.216-.556-.36z"/>
                      </svg>
                      Open WhatsApp Chat
                    </a>
                    <button 
                      onClick={() => {
                        setSelectedPlan(null);
                        setIsSuccessStep(false);
                      }}
                      className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-sm uppercase transition-all"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
