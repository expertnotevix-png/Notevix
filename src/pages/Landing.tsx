import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical, Globe, Languages, Crown, ChevronRight, Zap, QrCode, Shield, Copy, Info, FileText, CheckCircle2, Instagram, Youtube, Send, Users, Sparkles, Smartphone, ShieldCheck, Flame, Star, Clock, Heart } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PromoCarousel } from '../components/PromoCarousel';
import { useState, useEffect } from 'react';
import { dataBridge } from '../services/dataBridge';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { AppUser } from '../types';
import { ProductCarousel } from '../components/ProductCarousel';
import { 
  TrustBar, WhyChooseUs, Testimonials, SocialProof, 
  FounderSection, AboutSection, FaqSection, ProductDetailsModal 
} from '../components/PremiumSections';

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
  const [viewingDetailsProduct, setViewingDetailsProduct] = useState<any | null>(null);
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'refund' | 'terms' | 'disclaimer' | null>(null);
  
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

  // Payment Options States
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'paypal' | null>(null);
  const [submittedAmount, setSubmittedAmount] = useState('');
  const [submittedSubject, setSubmittedSubject] = useState('');

  const getPaypalPrice = (plan: any) => {
    if (!plan) return '1.99';
    if (plan.description) {
      const match = plan.description.match(/\[USD:([\d.]+)\]/);
      if (match) {
        return match[1];
      }
    }
    const rupeePrice = parseFloat(plan.price);
    if (rupeePrice === 39) return '1.99';
    if (rupeePrice === 99) return '2.99';
    if (rupeePrice > 0) {
      return (Math.round((rupeePrice / 40) * 100) / 100).toFixed(2);
    }
    return '1.99';
  };

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
      setPaymentMethod(null); // Reset payment method selection on new plan open
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

    const cleanedAmount = amount.toString().replace(/[^0-9.]/g, '');
    const finalAmountText = paymentMethod === 'paypal' ? `$${cleanedAmount}` : `₹${cleanedAmount}`;
    const cleanTxId = transactionId.trim();
    const cleanEmail = buyerEmail.trim();

    setIsSubmitting(true);
    try {
      const finalUid = user?.uid || 'guest';
      const subjectTitle = selectedPlan.subject ? `${selectedPlan.subject} Notes (Class ${selectedPlan.class})` : selectedPlan.name;

      const res = await dataBridge.saveVerifiedPayment({
        user_id: finalUid,
        email: cleanEmail,
        product_name: subjectTitle,
        amount: parseFloat(cleanedAmount) || 0,
        transaction_id: cleanTxId,
        phone_number: `${buyerName.trim()} (${buyerPhone.trim()})`, // Save combined Name & Phone
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
      setSubmittedTxId(cleanTxId);
      setSubmittedEmail(cleanEmail);
      setSubmittedName(buyerName.trim());
      setSubmittedAmount(finalAmountText);
      setSubmittedSubject(subjectTitle);
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
      <header className="relative pt-16 pb-20 px-6 overflow-hidden">
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

        <div className="max-w-4xl mx-auto text-center space-y-8 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} className="animate-pulse" /> Verified CBSE Class 10 Topper Study Partner
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none uppercase">
            Master Your Boards with <span className="text-indigo-500">Premium Notes</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
            Simplified, high-retention study resources for Class 8-10 CBSE students. Handcrafted to turn bulky textbooks into concise 15-minute revision maps.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button 
              onClick={() => document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/30 hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-widest cursor-pointer"
            >
              Explore Library 📔
            </button>
          </div>
        </div>

        <TrustBar />
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
                <div key={res.id} className="group bg-[#09090c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500/20 hover:shadow-[0_0_50px_rgba(99,102,241,0.08)] flex flex-col justify-between">
                   <div className="aspect-[3/4] relative overflow-hidden">
                      <ProductCarousel 
                        coverImage={res.cover_image} 
                        previewImages={res.preview_images} 
                        subject={res.subject} 
                      />
                      
                      {/* Premium Badges */}
                      <div className="absolute top-5 left-5 z-20 flex flex-col gap-1.5">
                        <span className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-400/20 shadow-md">
                          Updated 2026
                        </span>
                        <span className="bg-black/45 backdrop-blur-md text-indigo-400 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/5 shadow-md">
                          Premium Notes
                        </span>
                      </div>

                      <div className="absolute top-5 right-5 z-20">
                         <div className="w-12 h-12 bg-black/60 backdrop-blur-md rounded-full border border-white/15 flex items-center justify-center font-black text-indigo-400 text-xs shadow-lg group-hover:scale-110 transition-transform">
                           ₹{res.price || 39}
                         </div>
                      </div>
                   </div>

                   <div className="p-8 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-black uppercase tracking-tight text-white">{res.subject}</h3>
                          <Icon size={18} className="text-indigo-400 mt-1" />
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Class {res.class} • Full Syllabus Pack</p>
                        
                        <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase mt-1">
                          <Clock size={11} className="text-indigo-500/80" />
                          <span>Last Updated: July 2026</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4">
                        <button 
                          onClick={() => setViewingDetailsProduct(res)}
                          className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <Info size={13} className="text-gray-400" /> What's Included?
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <a 
                            href={res.drive_link || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="py-3.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white rounded-xl flex items-center justify-center gap-1.5 font-black text-[9px] uppercase tracking-wider transition-all"
                          >
                            <FileText size={12} className="text-gray-400" /> Preview
                          </a>
                          <button 
                            onClick={() => setSelectedPlan({ ...res, subject: res.subject, class: res.class, price: res.price || 39 })}
                            className="py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/10 active:scale-95 cursor-pointer"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Premium Trust, Proof and Story Overlays */}
      <WhyChooseUs />
      <Testimonials />
      <SocialProof />
      <FounderSection />
      <AboutSection />
      <FaqSection />

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
                       href={`https://wa.me/919236489649?text=${encodeURIComponent(`Hi, My name is ${submittedName}. I paid ${submittedAmount} for ${submittedSubject}. My Transaction ID is ${submittedTxId}. My Email is ${submittedEmail}. Please send me the PDF password.`)}`}
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
                         setPaymentMethod(null);
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
                    <div className="flex items-center gap-3">
                      {paymentMethod && (
                        <button
                          onClick={() => setPaymentMethod(null)}
                          className="mr-2 text-xs font-black uppercase tracking-wider text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          ← Select Method
                        </button>
                      )}
                      <h2 className="text-xl font-black uppercase tracking-tight">
                        {paymentMethod === 'paypal' ? 'PayPal Checkout' : paymentMethod === 'upi' ? 'UPI Checkout' : 'Unlock Notes'}
                      </h2>
                    </div>
                    <button onClick={() => {
                      setSelectedPlan(null);
                      setPaymentMethod(null);
                      setPurchaseSuccess(false);
                    }} className="text-gray-500 hover:text-white transition-colors">
                      <ChevronRight size={28} className="rotate-90" />
                    </button>
                  </div>

                  {paymentMethod === null ? (
                    <div className="flex-1 flex flex-col justify-center py-6 space-y-6">
                      <div className="text-center space-y-1 mb-2">
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-widest">Select Location / Method</p>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Choose your preferred option</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <button
                          onClick={() => {
                            setPaymentMethod('upi');
                            setAmount(selectedPlan.price ? selectedPlan.price.toString() : '39');
                          }}
                          className="p-6 rounded-[30px] border border-white/10 bg-white/[0.01] hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">🇮🇳</span>
                              <span className="text-sm font-black uppercase text-white group-hover:text-indigo-400 transition-colors">Pay via UPI (for India)</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Instant via GPay, PhonePe, Paytm, etc.</p>
                          </div>
                          <ChevronRight size={18} className="text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                        </button>

                        <button
                          onClick={() => {
                            setPaymentMethod('paypal');
                            setAmount(getPaypalPrice(selectedPlan));
                          }}
                          className="p-6 rounded-[30px] border border-white/10 bg-white/[0.01] hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left flex items-center justify-between group active:scale-[0.98] cursor-pointer"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">🌍</span>
                              <span className="text-sm font-black uppercase text-white group-hover:text-indigo-400 transition-colors">Pay via PayPal (for International)</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Secure checkout in USD/PayPal</p>
                          </div>
                          <ChevronRight size={18} className="text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-8 pr-2 -mr-2 custom-scrollbar">
                      {paymentMethod === 'upi' ? (
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
                      ) : (
                        <div className="p-8 rounded-3xl bg-indigo-600/5 border border-indigo-600/10 flex flex-col items-center gap-6">
                           <div className="p-4 bg-white rounded-3xl shrink-0">
                              <img 
                                src="/paypal_qr.png"
                                alt="PayPal QR"
                                className="w-32 h-32 object-contain"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://www.paypal.com/paypalme/expertraj8/${getPaypalPrice(selectedPlan)}`;
                                }}
                              />
                           </div>

                           {/* Prominent Price Highlight */}
                           <div className="w-full text-center bg-emerald-500/10 border border-emerald-500/25 px-6 py-4 rounded-3xl">
                             <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block mb-1">Amount to Pay</span>
                             <span className="text-4xl font-black text-emerald-400 tracking-tight block">${getPaypalPrice(selectedPlan)}</span>
                           </div>

                           <div className="text-center space-y-1">
                              <div>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">PayPal Account</p>
                                <div className="text-lg font-black text-white">Abhishek Kumar</div>
                              </div>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                Scan with any camera to pay via PayPal
                              </p>
                           </div>
                        </div>
                      )}

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
                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm outline-none focus:border-indigo-500 text-white animate-none"
                           />
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-1">
                                {paymentMethod === 'paypal' ? 'Amount Paid ($)' : 'Amount Paid (₹)'}
                              </label>
                              <input 
                                type="text" 
                                placeholder="Amount Paid" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors text-white animate-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-gray-400 font-black uppercase tracking-widest block mb-1">
                                {paymentMethod === 'paypal' ? 'PayPal Transaction ID' : 'Transaction ID (UTR)'}
                              </label>
                              <input 
                                type="text" 
                                placeholder={paymentMethod === 'paypal' ? 'PayPal ID' : 'UTR Number'} 
                                value={transactionId}
                                onChange={(e) => setTransactionId(e.target.value)}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors font-mono text-white animate-none"
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
                  )}

                  {paymentMethod !== null && (
                    <div className="mt-8">
                       <button 
                        onClick={handleSubmitPayment}
                        disabled={isSubmitting}
                        className="w-full h-16 bg-white text-black rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
                       >
                         {isSubmitting ? 'PROCESSING...' : 'SUBMIT DETAILS'}
                       </button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Details Modal Overlay */}
      <AnimatePresence>
        {viewingDetailsProduct && (
          <ProductDetailsModal 
            product={viewingDetailsProduct} 
            onClose={() => setViewingDetailsProduct(null)} 
            onBuy={() => {
              setSelectedPlan({ 
                ...viewingDetailsProduct, 
                subject: viewingDetailsProduct.subject, 
                class: viewingDetailsProduct.class, 
                price: viewingDetailsProduct.price || 39 
              });
            }} 
          />
        )}
      </AnimatePresence>

      {/* Policy Modals */}
      <AnimatePresence>
        {activePolicyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-[#09090c] border border-white/10 rounded-[3rem] p-8 md:p-12 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600" />
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {activePolicyModal === 'privacy' && "Privacy Policy"}
                  {activePolicyModal === 'refund' && "Refund Policy"}
                  {activePolicyModal === 'terms' && "Terms of Service"}
                  {activePolicyModal === 'disclaimer' && "Curriculum Disclaimer"}
                </h3>
                <button 
                  onClick={() => setActivePolicyModal(null)}
                  className="text-gray-500 hover:text-white font-black text-lg p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 -mr-2 text-xs text-gray-400 leading-relaxed space-y-4 font-medium text-justify custom-scrollbar">
                {activePolicyModal === 'privacy' && (
                  <>
                    <p className="font-bold text-white text-sm">Your Data Security is Our Utmost Priority.</p>
                    <p>NoteVix Academy is dedicated to safeguarding your personal privacy. We never rent or sell your user profiles or transaction records to third-party databases.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">1. Data We Collect</p>
                    <p>We receive minimal parameters from your Google sign-in credentials (such as display photo, name, and email ID) to identify your legal access privileges to our secure resources.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">2. Verification Processes</p>
                    <p>For manual transaction verification, you submit your name, phone number, and transaction receipts. This information is preserved inside secure databases and is only audited for purchase confirmation.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">3. Cookies & Session Storage</p>
                    <p>We leverage native security tokens and functional local caches to ensure your login active sessions persist safely across page refreshes.</p>
                  </>
                )}

                {activePolicyModal === 'refund' && (
                  <>
                    <p className="font-bold text-white text-sm">Sincere Refund & Access Commitment.</p>
                    <p>Because NoteVix Academy deals purely with direct downloadable digital intellectual properties (vector PDF files), all sales are final once download links are accessed.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">1. When is a Refund Possible?</p>
                    <p>If you made a duplicate payment for the same syllabus package by mistake (double payment), or if you did not receive your access password within 24 hours of filing receipt details, contact us on +91 9236489649 for a 100% immediate cashback refund.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">2. Processing Timeline</p>
                    <p>Approved refunds are dispatched within 2 business days to your original UPI account or PayPal address with complete transaction logs.</p>
                  </>
                )}

                {activePolicyModal === 'terms' && (
                  <>
                    <p className="font-bold text-white text-sm">Agreement of Intended Study Use.</p>
                    <p>By purchasing, opening, and reading NoteVix Academy premium study packs, you agree to comply with our academic guidelines.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">1. Intellectual Ownership</p>
                    <p>All notes, custom diagrams, memory anchors, formulas, and visual maps are intellectual properties of NoteVix Academy. Sharing, distributing, or reselling our locked PDFs is strictly forbidden.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">2. Single-User Access</p>
                    <p>Each purchase grants a single-user personal academic license. Sharing passwords across secondary forums will result in immediate license revocation.</p>
                  </>
                )}

                {activePolicyModal === 'disclaimer' && (
                  <>
                    <p className="font-bold text-white text-sm">NCERT and CBSE Official Curriculum Disclaimer.</p>
                    <p>NoteVix is a fully independent educational brand operated by premium educators. We are not officially partnered, associated, or endorsed by the Central Board of Secondary Education (CBSE) or NCERT.</p>
                    <p className="font-bold text-white uppercase tracking-wider text-[10px] pt-2">1. Educational Intent</p>
                    <p>Our study guides are designed purely as complementary aids for revision purposes. While our team maintains maximum accuracy, students should crosscheck primary sources against official textbooks for final verification before board exams.</p>
                  </>
                )}
              </div>

              <div className="border-t border-white/5 pt-6 mt-6 flex justify-end">
                <button 
                  onClick={() => setActivePolicyModal(null)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Close Legals
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Section */}
      <footer className="pt-24 pb-16 px-6 border-t border-white/5 bg-[#050508] relative">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Logo className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight uppercase">NoteVix</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              NoteVix Academy is a leading premium EdTech resource hub for CBSE Class 8, 9, and 10 board aspirants. We design high-retention revision notes so students can excel in their exams.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-widest mb-6">Subject Resources</h4>
            <ul className="space-y-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              <li><button onClick={() => { setActiveClass('10'); document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-indigo-400 transition-colors cursor-pointer text-left">Class 10 CBSE Packs</button></li>
              <li><button onClick={() => { setActiveClass('9'); document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-indigo-400 transition-colors cursor-pointer text-left">Class 9 CBSE Packs</button></li>
              <li><button onClick={() => { setActiveClass('8'); document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-indigo-400 transition-colors cursor-pointer text-left">Class 8 CBSE Packs</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-widest mb-6">Policies & Legals</h4>
            <ul className="space-y-3 text-xs font-bold uppercase tracking-wider text-gray-500">
              <li><button onClick={() => setActivePolicyModal('privacy')} className="hover:text-indigo-400 transition-colors cursor-pointer text-left">Privacy Policy</button></li>
              <li><button onClick={() => setActivePolicyModal('refund')} className="hover:text-indigo-400 transition-colors cursor-pointer text-left">Refund Policy</button></li>
              <li><button onClick={() => setActivePolicyModal('terms')} className="hover:text-indigo-400 transition-colors cursor-pointer text-left">Terms of Service</button></li>
              <li><button onClick={() => setActivePolicyModal('disclaimer')} className="hover:text-indigo-400 transition-colors cursor-pointer text-left">Disclaimer</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-widest mb-6">Get Support</h4>
            <ul className="space-y-3 text-xs text-gray-500 font-medium leading-relaxed">
              <li className="flex items-center gap-2">
                <span className="font-extrabold uppercase text-[10px] tracking-wider text-gray-400">Email:</span>
                <a href="mailto:expertnotevix@gmail.com" className="hover:text-indigo-400 transition-colors">expertnotevix@gmail.com</a>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-extrabold uppercase text-[10px] tracking-wider text-gray-400">Helpline:</span>
                <a href="https://wa.me/919236489649" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">+91 9236489649</a>
              </li>
              <li className="pt-2 flex gap-3 text-gray-400">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Instagram size={16} /></a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Youtube size={16} /></a>
                <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Send size={16} /></a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest text-center md:text-left">
             © 2026 NoteVix Academy Ltd. • Made with love for CBSE Board Toppers
          </p>
          <div className="flex gap-4 text-gray-600 text-[9px] font-black uppercase tracking-wider">
            <span>Secure SSL Encryption</span>
            <span>•</span>
            <span>Instant Download Access</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
