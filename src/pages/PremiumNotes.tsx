import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Crown, Check, ShieldCheck, Copy, X, 
  CreditCard, Loader2, Zap, Download,
  FileText, SearchCheck, Info, Clock, XCircle, BookOpen
} from 'lucide-react';
import { AppUser, SubjectResource } from '../types';
import { toast } from 'sonner';
import { dataBridge } from '../services/dataBridge';
import { supabase } from '../lib/supabase';

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchResources();
    if (user) fetchUserHistory();
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
    const data = await dataBridge.getUserPayments(user.phone || '');
    setPurchaseHistory(data);
  };

  const handlePurchase = async () => {
    if (!phoneNumber || !amount || !transactionId) {
      toast.error('Please fill all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dataBridge.saveVerifiedPayment({
        product_name: selectedPlan.subject ? `${selectedPlan.subject} Notes (Class ${selectedPlan.classLevel})` : selectedPlan.name,
        amount: parseFloat(amount),
        transaction_id: transactionId,
        phone_number: phoneNumber,
        user_id: user?.uid || 'GUEST',
        status: 'pending',
        approved: false
      });

      if (!res.success) throw new Error(res.error || "Failed to submit");

      toast.success("Details submitted! Admin will verify and grant access.");
      setSelectedPlan(null);
      setTransactionId('');
      setAmount('');
      fetchUserHistory();
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
            const history = purchaseHistory.find(h => h.product_name.includes(res.subject));
            const unlocked = !res.is_premium || history?.status === 'approved' || user?.role === 'admin';
            const isPending = history?.status === 'pending';

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
                    <h3 className="text-sm font-black uppercase truncate">{res.title || res.subject}</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Class {res.class_level}</p>
                  </div>

                  {unlocked ? (
                    <div className="space-y-2">
                       <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-center">
                          <span className="text-[7px] text-emerald-500 font-bold block">PASSWORD</span>
                          <code className="text-xs font-black text-white">{history?.unlock_password || res.unlock_password || 'APPROVED'}</code>
                       </div>
                       <a 
                        href={getDirectDownloadLink(res.pdf_link || '')} 
                        target="_blank" 
                        className="w-full py-3 bg-white text-black rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase shadow-lg shadow-white/10"
                       >
                         <Download size={14} /> Download PDF
                       </a>
                    </div>
                  ) : isPending ? (
                    <div className="w-full py-3 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl text-center font-black text-[10px] uppercase">
                       <Clock className="w-3.5 h-3.5 inline mr-1 animate-pulse" /> Pending
                    </div>
                  ) : (
                    <button 
                      onClick={() => setSelectedPlan({ ...PREMIUM_PLANS[0], subject: res.subject, classLevel: res.class_level, price: res.price })}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                      <Crown size={14} className="inline mr-1" /> Buy Now
                    </button>
                  )}
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
              className="relative w-full max-w-lg bg-[#0A0A0B] border border-white/10 rounded-[40px] p-10 space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black uppercase">{selectedPlan.subject || selectedPlan.name}</h2>
                <button onClick={() => setSelectedPlan(null)}><X size={24} className="text-gray-500 hover:text-white" /></button>
              </div>

              <div className="bg-indigo-600/5 p-8 rounded-3xl border border-indigo-600/20 flex flex-col items-center gap-6">
                 <div className="p-4 bg-white rounded-2xl">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=9236489649@mbk&pn=NoteVix&am=${selectedPlan.price}&cu=INR`} className="w-32 h-32" />
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Pay ₹{selectedPlan.price} via UPI</p>
                    <code className="text-lg font-black text-white">9236489649@mbk</code>
                 </div>
              </div>

              <div className="space-y-4">
                 <input 
                  type="text" placeholder="WhatsApp Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none focus:border-indigo-500"
                 />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Amount Paid" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none" />
                    <input type="text" placeholder="Transaction ID" value={transactionId} onChange={e => setTransactionId(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none font-mono" />
                 </div>
              </div>

              <button 
                onClick={handlePurchase} disabled={isSubmitting}
                className="w-full h-16 bg-white text-black rounded-3xl font-black text-sm uppercase shadow-xl disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
