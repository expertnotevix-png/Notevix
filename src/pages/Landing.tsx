import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical, Globe, Languages, Crown, ChevronRight, Zap, QrCode, Shield, Copy, Info, FileText, CheckCircle2, Instagram, Youtube, Send, Users } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PromoCarousel } from '../components/PromoCarousel';
import { useState, useEffect } from 'react';
import { dataBridge } from '../services/dataBridge';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { AppUser } from '../types';

const CLASSES = ['8', '9', '10'];

const SUBJECT_ICONS: Record<string, any> = {
  science: FlaskConical,
  maths: Zap,
  sst: Globe,
  english: Languages
};

interface LandingProps {
  user: AppUser | null;
}

export default function Landing({ user }: LandingProps) {
  const navigate = useNavigate();
  const [activeClass, setActiveClass] = useState<'8' | '9' | '10'>('10');
  const [resources, setResources] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  
  // Purchase Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [sourceAccount, setSourceAccount] = useState('');

  // Success Step state
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
      setSourcePlatform('');
      setSourceAccount('');
    }
  }, [selectedPlan, user]);

  useEffect(() => {
    const fetchResources = async () => {
      const data = await dataBridge.getResources(activeClass);
      setResources(data);
    };
    fetchResources();
  }, [activeClass]);

  const handleSubmitPayment = async () => {
    if (!buyerName || !buyerEmail || !buyerPhone || !amount || !transactionId || !sourcePlatform || (sourcePlatform === 'Instagram' && !sourceAccount)) {
      toast.error('Please fill all fields, including where you heard about us');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalUid = user?.uid || 'guest';

      const res = await dataBridge.saveVerifiedPayment({
        user_id: finalUid,
        email: buyerEmail,
        product_name: selectedPlan.subject ? `${selectedPlan.subject} Notes (Class ${selectedPlan.class})` : selectedPlan.name,
        amount: parseFloat(amount),
        transaction_id: transactionId,
        phone_number: `${buyerName} (${buyerPhone})`, // Save combined Name & Phone
        status: 'pending',
        approved: false,
        source_platform: sourcePlatform,
        source_account: sourcePlatform === 'Instagram' ? sourceAccount : null,
        created_at: new Date().toISOString()
      });

      if (!res.success) throw new Error(res.error || "Failed to submit");

      if (user?.uid) {
        localStorage.setItem('last_payment_user_id', user.uid);
      }
      setSubmittedTxId(transactionId);
      setSubmittedEmail(buyerEmail);
      setSubmittedName(buyerName);
      setPurchaseSuccess(true);
      setTransactionId('');
      setAmount('');
      setBuyerName('');
      setBuyerEmail('');
      setBuyerPhone('');
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
                      <div className="space-y-2 pt-2">
                        <a 
                          href={res.drive_link || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase transition-all"
                        >
                          <FileText size={14} className="text-gray-400" /> Open PDF
                        </a>
                        <button 
                        onClick={() => setSelectedPlan({ subject: res.subject, class: res.class, price: res.price || 39 })}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg active:scale-95"
                      >
                        Buy Now
                      </button>
                    </div>
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
                <div className="space-y-6 text-center py-4 flex flex-col items-center overflow-y-auto">
                   <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                   </div>
                   <div className="space-y-4 bg-white/[0.02] border border-white/5 p-6 rounded-3xl w-full">
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
                   <div className="space-y-3 pt-2 w-full">
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
                         setPurchaseSuccess(false);
                       }}
                       className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-sm uppercase transition-all"
                     >
                       Close Window
                     </button>
                   </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black uppercase">Unlock Notes</h2>
                    <button onClick={() => {
                      setSelectedPlan(null);
                      setPurchaseSuccess(false);
                    }} className="text-gray-500 hover:text-white transition-colors">
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

                       {/* Prominent Price Highlight */}
                       <div className="w-full text-center bg-emerald-500/10 border border-emerald-500/25 px-6 py-4 rounded-3xl">
                         <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block mb-1">Amount to Pay</span>
                         <span className="text-4xl font-black text-emerald-400 tracking-tight block">₹{selectedPlan.price}</span>
                       </div>

                       <div className="text-center">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">UPI ID</p>
                          <code className="text-lg font-black text-white">9236489649@mbk</code>
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
                         <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Where did you hear about us?</label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {[
                            { value: 'Instagram', label: 'Instagram', icon: Instagram, iconColor: 'text-pink-500' },
                            { value: 'Telegram', label: 'Telegram', icon: Send, iconColor: 'text-sky-400' },
                            { value: 'Snapchat', label: 'Snapchat' },
                            { value: 'YouTube', label: 'YouTube', icon: Youtube, iconColor: 'text-red-500' },
                            { value: "Friend's Referral", label: "Friend's Referral", icon: Users, iconColor: 'text-emerald-400', fullWidth: true },
                          ].map((plat) => {
                            const isSelected = sourcePlatform === plat.value;
                            const IconComponent = plat.icon;
                            return (
                              <button
                                key={plat.value}
                                type="button"
                                onClick={() => {
                                  setSourcePlatform(plat.value);
                                  if (plat.value !== 'Instagram') {
                                    setSourceAccount('');
                                  }
                                }}
                                className={`h-12 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all px-4 border flex items-center justify-center gap-2 text-center cursor-pointer ${
                                  plat.fullWidth ? 'col-span-2' : ''
                                } ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 scale-[1.01]'
                                    : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/15 hover:bg-white/[0.04] hover:text-white active:scale-95'
                                }`}
                              >
                                {IconComponent && <IconComponent className={`w-3.5 h-3.5 ${plat.iconColor}`} />}
                                {plat.value === 'Snapchat' && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                )}
                                {plat.label}
                              </button>
                            );
                          })}
                        </div>

                          {sourcePlatform === 'Instagram' && (
                            <div className="mb-4">
                              <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-2">Which account?</label>
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                {[
                                  { value: '@studyhacks100', label: '@studyhacks100' },
                                  { value: '@theexamtips', label: '@theexamtips' },
                                  { value: 'Other', label: 'Other/Ref' },
                                ].map((acc) => {
                                  const isSelected = sourceAccount === acc.value;
                                  return (
                                    <button
                                      key={acc.value}
                                      type="button"
                                      onClick={() => setSourceAccount(acc.value)}
                                      className={`h-11 rounded-lg text-[10px] font-extrabold transition-all px-2 border flex items-center justify-center text-center cursor-pointer ${
                                        isSelected
                                          ? 'bg-pink-500/15 border-pink-500 text-pink-300 shadow-md shadow-pink-500/5 scale-[1.01]'
                                          : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/15 hover:bg-white/[0.04] hover:text-white active:scale-95'
                                      }`}
                                    >
                                      {acc.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

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
                            <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-1">Amount Paid (₹)</label>
                            <input 
                              type="number" 
                              placeholder="Amount Paid" 
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors text-white animate-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-1">Transaction ID (UTR)</label>
                            <input 
                              type="text" 
                              placeholder="UTR Number" 
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors font-mono text-white"
                            />
                          </div>
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
