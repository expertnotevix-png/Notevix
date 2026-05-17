import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical, Globe, Languages, Crown, ChevronRight, Zap, QrCode, Shield, Copy, Info } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PromoCarousel } from '../components/PromoCarousel';
import { useState, useEffect } from 'react';
import { dataBridge } from '../services/dataBridge';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

const CLASSES = ['8', '9', '10'];

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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      const data = await dataBridge.getResources(activeClass);
      setResources(data);
    };
    fetchResources();
  }, [activeClass]);

  const handleSubmitPayment = async () => {
    if (!phoneNumber || !transactionId || !amount) {
      toast.error('Please fill all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await dataBridge.saveVerifiedPayment({
        product_name: selectedPlan.subject ? `${selectedPlan.subject} Notes (Class ${selectedPlan.class})` : 'Master Pack',
        amount: parseFloat(amount),
        transaction_id: transactionId,
        phone_number: phoneNumber,
        status: 'pending',
        approved: false
      });

      if (!res.success) throw new Error(res.error || "Failed to submit");

      setPurchaseSuccess(true);
      toast.success("Details submitted! Admin will verify your payment.");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 font-sans">
      <header className="relative pt-16 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-indigo-600/5 blur-[120px] -z-10 rounded-full" />
        
        <nav className="max-w-7xl mx-auto flex items-center justify-between mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Logo className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">NoteVix</span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            Sign In
          </button>
        </nav>

        <div className="max-w-6xl mx-auto mb-16">
          <PromoCarousel />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none uppercase">
            Master Your Boards with <span className="text-indigo-500">Premium Notes</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
            Simplified one-page notes for Class 8-10. Get instant access to the most effective study material.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/30 hover:scale-105 transition-all uppercase tracking-widest"
            >
              Explore Library 📔
            </button>
          </div>
        </div>
      </header>

      <section id="library" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-16 space-y-8">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Choose Your <span className="text-indigo-500">Class</span></h2>
            <div className="p-1.5 rounded-3xl bg-white/5 border border-white/10 flex gap-2">
              {CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => setActiveClass(cls as any)}
                  className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
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
              return (
                <div key={res.id} className="group bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all hover:-translate-y-2">
                   <div className="aspect-[3/4] relative">
                      {res.cover_image ? (
                        <img src={res.cover_image} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-indigo-600/10 flex items-center justify-center">
                          <Icon size={40} className="text-indigo-500/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                      <div className="absolute top-6 right-6">
                         <div className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center font-black text-indigo-400 text-xs">₹{res.price || 39}</div>
                      </div>
                   </div>
                   <div className="p-8 space-y-4">
                      <h3 className="text-lg font-black uppercase tracking-tight">{res.subject}</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Class {res.class} • Topic Pack</p>
                      <button 
                        onClick={() => setSelectedPlan({ subject: res.subject, class: res.class, price: res.price || 39 })}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg active:scale-95"
                      >
                        Buy Now
                      </button>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Payment Modal */}
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
              
              {purchaseSuccess ? (
                <div className="space-y-8 text-center py-10">
                   <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                      <Zap className="text-emerald-500" size={32} />
                   </div>
                   <div className="space-y-4">
                      <h2 className="text-3xl font-black uppercase">Request Sent</h2>
                      <p className="text-gray-400 text-sm font-medium leading-relaxed">
                        Admin will verify your payment of ₹{amount} for the {selectedPlan.subject} notes. 
                        Once approved, your password will be available.
                      </p>
                   </div>
                   <button 
                    onClick={() => setSelectedPlan(null)}
                    className="w-full h-16 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl"
                   >
                     CLOSE
                   </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black uppercase">Unlock Notes</h2>
                    <button onClick={() => setSelectedPlan(null)} className="text-gray-500 hover:text-white transition-colors">
                      <ChevronRight size={28} className="rotate-90" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-8 pr-2 -mr-2 custom-scrollbar">
                    <div className="p-8 rounded-3xl bg-indigo-600/5 border border-indigo-600/10 flex flex-col items-center gap-6">
                       <div className="p-4 bg-white rounded-3xl shrink-0">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=9236489649@mbk&pn=NoteVix&am=${selectedPlan.price}&cu=INR`}
                            alt="UPI QR"
                            className="w-32 h-32"
                          />
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">UPI ID</p>
                          <code className="text-lg font-black text-white">9236489649@mbk</code>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <input 
                        type="text" 
                        placeholder="WhatsApp Number" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                       />
                       <div className="grid grid-cols-2 gap-4">
                          <input 
                            type="number" 
                            placeholder="Amount Paid (₹)" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                          />
                          <input 
                            type="text" 
                            placeholder="Transaction ID" 
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                          />
                       </div>
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                        <div className="flex items-start gap-3">
                           <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                             Submit details after paying. Admin will verify manually. 
                             Contact @9236489649 for help.
                           </p>
                        </div>
                    </div>
                  </div>

                  <div className="mt-8">
                     <button 
                      onClick={handleSubmitPayment}
                      disabled={isSubmitting}
                      className="w-full h-16 bg-white text-black rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                     >
                       {isSubmitting ? 'PROCESSING...' : 'SUBMIT DETAILS'}
                     </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-24 px-6 border-t border-white/5 text-center">
        <Logo className="w-12 h-12 mx-auto mb-8 opacity-20" />
        <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">
           © 2026 NoteVix Academy • Powering India's Students
        </p>
      </footer>
    </div>
  );
}
