import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FlaskConical, Globe, Languages, Shield, Zap, Trophy, ChevronRight, Crown, Upload, QrCode } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { geminiService } from '../services/geminiService';

const CLASSES = ['8', '9', '10'];

const PREMIUM_PLANS = [
  {
    id: 'individual_subject',
    name: 'Individual Subject',
    price: 39,
    description: 'Single Subject PDF Note',
    features: ['Chapter-wise One Page Notes', 'Important Questions PDF', 'Topic-wise AI Solver'],
    color: 'from-blue-600 to-indigo-600',
    type: 'one-time'
  },
  {
    id: 'class_8_master',
    name: 'Class 8 Master Pack',
    class: '8',
    price: 99,
    features: ['All Class 8 Subjects', 'Full Notes & PYQs', '24/7 AI Tutor Access'],
    color: 'from-cyan-600 to-blue-600',
    type: 'one-time'
  },
  {
    id: 'class_9_master',
    name: 'Class 9 Master Pack',
    class: '9',
    price: 99,
    features: ['All Class 9 Subjects', 'Full Notes & PYQs', '24/7 AI Tutor Access'],
    color: 'from-emerald-600 to-teal-600',
    type: 'one-time'
  },
  {
    id: 'class_10_master',
    name: 'Class 10 Master Pack',
    class: '10',
    price: 99,
    features: ['All Class 10 Subjects', 'Full Notes & PYQs', '24/7 AI Tutor Access'],
    color: 'from-orange-600 to-pink-600',
    type: 'one-time'
  }
];

const SUBJECT_COLORS: Record<string, string> = {
  science: 'bg-emerald-500',
  maths: 'bg-blue-500',
  sst: 'bg-orange-500',
  english: 'bg-purple-500'
};

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
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiVerifying, setAiVerifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/data/resources.json')
      .then(res => res.json())
      .then(data => {
        const filtered = data.resources.filter((r: any) => r.class === activeClass);
        setResources(filtered);
      })
      .catch(() => {});
  }, [activeClass]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setScreenshotPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGuestPurchase = async () => {
    if (isSubmitting || aiVerifying || !whatsapp || !email || (!transactionId && !screenshotPreview)) {
      toast.error('Please enter WhatsApp, Email and Transaction Details');
      return;
    }

    try {
      setIsSubmitting(true);
      
      let aiDetectedTxId = '';
      let aiDetectedAmount = 0;

      if (screenshotPreview) {
        setAiVerifying(true);
        const result = await geminiService.verifyPaymentScreenshot(screenshotPreview);
        setAiVerifying(false);
        
        if (result.isValid) {
          aiDetectedTxId = result.transactionId || '';
          aiDetectedAmount = result.amount || 0;
        } else {
          throw new Error(result.error || "AI could not verify screenshot. Enter ID manually.");
        }
      }

      const finalTxId = transactionId || aiDetectedTxId;
      if (!finalTxId) throw new Error("Transaction ID required");

      await addDoc(collection(db, 'purchase_requests'), {
        email,
        whatsapp,
        userId: 'GUEST',
        transactionId: finalTxId,
        planId: selectedPlan?.id,
        planName: selectedPlan?.name,
        amount: aiDetectedAmount || selectedPlan?.price || 0,
        status: 'pending',
        isGuest: true,
        timestamp: new Date().toISOString()
      });

      await setDoc(doc(db, 'transaction_id_registry', finalTxId), { 
        email,
        redeemedAt: new Date().toISOString(),
        planId: selectedPlan?.id,
        isGuest: true
      });

      toast.success("Payment Received! We will contact you with details soon.");
      setSelectedPlan(null);
      setScreenshotPreview(null);
      setTransactionId('');
    } catch (error: any) {
      toast.error(error.message || "Failed");
    } finally {
      setIsSubmitting(false);
      setAiVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 font-sans">
      {/* Hero Header */}
      <header className="relative pt-16 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-indigo-600/5 blur-[120px] -z-10 rounded-full" />
        
        <nav className="max-w-7xl mx-auto flex items-center justify-between mb-24">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Logo className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">NOTEVIX</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/premium-notes')}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all flex items-center gap-2"
            >
              <Crown size={14} /> PREMIUM
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Login
            </button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]"
          >
            🔥 Trusted by 10k+ CBSE Students
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] uppercase"
          >
            Digital <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              Library
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-medium"
          >
            Access high-yield one-page notes and master packs for Class 8-10. No signup required for premium notes.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => document.getElementById('digital-library')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-indigo-600/40 hover:scale-105 transition-all"
            >
              Get Premium Notes 📔
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-12 py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-colors"
            >
              Sign Up Free
            </button>
          </motion.div>
        </div>
      </header>

      {/* Digital Library Section */}
      <section id="digital-library" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-8 uppercase tracking-tighter">
              CHOOSE YOUR <span className="text-indigo-500">CLASS</span>
            </h2>
            
            <div className="p-1.5 rounded-3xl bg-white/5 border border-white/10 flex gap-2">
              {CLASSES.map(cls => (
                <button
                  key={cls}
                  onClick={() => setActiveClass(cls as any)}
                  className={`px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
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
              const masterPlan = PREMIUM_PLANS.find(p => p.class === res.class);
              const subjectPlan = PREMIUM_PLANS.find(p => p.id === 'individual_subject');
              
              return (
                <motion.div
                  key={res.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="group relative"
                >
                  {/* Book Design Card */}
                  <div className="aspect-[3/4.5] rounded-[32px] overflow-hidden relative shadow-2xl transition-all duration-500 group-hover:-translate-y-4 border border-white/10 bg-[#0A0A0B]">
                    {res.coverUrl ? (
                      <img src={res.coverUrl} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className={`absolute inset-0 ${SUBJECT_COLORS[res.subject.toLowerCase()] || 'bg-indigo-600'}`} />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                    
                    {/* Book Spine Detail */}
                    <div className="absolute inset-y-0 left-0 w-4 bg-black/30 backdrop-blur-md border-r border-white/5 shadow-2xl" />
                    
                    <div className="absolute top-8 right-8 w-12 h-12 rounded-full bg-black/20 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                      <Crown size={20} className="text-indigo-400" />
                    </div>

                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                             <Icon size={14} className="text-white" />
                           </div>
                           <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                            {res.subject}
                          </span>
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-black text-white leading-none tracking-tighter uppercase mb-1">
                            {res.subject === 'maths' ? 'MATHS' : res.subject.toUpperCase()} NOTES
                          </h3>
                          <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                            Class {res.class} • Topic Pack
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 pt-4">
                          <button 
                            onClick={() => setSelectedPlan({ ...subjectPlan, subject: res.subject, class: res.class, resourceId: res.id })}
                            className="w-full py-3.5 rounded-xl bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all shadow-xl active:scale-95"
                          >
                            Buy PDF ₹39
                          </button>
                          <button 
                            onClick={() => setSelectedPlan({ ...masterPlan, class: res.class })}
                            className="w-full py-3.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600/30 transition-all active:scale-95"
                          >
                            Get All Subjects ₹99
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Glossy Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Guest Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-lg bg-[#0A0A0B] border border-white/10 rounded-[40px] shadow-2xl p-8 sm:p-12 overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-indigo-600" />
              
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black">{selectedPlan.name}</h2>
                  {selectedPlan.subject && (
                    <p className="text-xs font-bold text-indigo-400 capitalize tracking-wider">
                      Subject: {selectedPlan.subject} (Class {selectedPlan.class})
                    </p>
                  )}
                </div>
                <button onClick={() => setSelectedPlan(null)} className="text-gray-500 hover:text-white transition-colors">
                  <ChevronRight size={28} className="rotate-90" />
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-5 mb-8">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30">
                  <QrCode className="text-white" size={28} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Pay with UPI</p>
                  <p className="text-lg font-black text-white">9236489649@mbk</p>
                </div>
                <div className="ml-auto text-2xl font-black text-white">₹{selectedPlan.price}</div>
              </div>

              <div className="space-y-3 mb-10">
                <input 
                  type="email" 
                  placeholder="Delivery Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                />
                <input 
                  type="text" 
                  placeholder="WhatsApp Number"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 bg-white/[0.02] hover:border-indigo-500/50 cursor-pointer overflow-hidden relative"
                >
                  {screenshotPreview ? (
                    <img src={screenshotPreview} className="w-full h-full object-cover opacity-50" />
                  ) : (
                    <>
                      <Upload size={24} className="text-gray-500" />
                      <span className="text-[10px] font-black uppercase text-gray-500">Upload Screenshot</span>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <input 
                  type="text" 
                  placeholder="Transaction ID (UTR)"
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  className="w-full h-15 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm focus:border-indigo-500 outline-none transition-colors"
                />
              </div>

              <button
                disabled={isSubmitting || aiVerifying}
                onClick={handleGuestPurchase}
                className="w-full h-16 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {aiVerifying ? 'AI Processing...' : isSubmitting ? 'Submitting...' : 'Complete Purchase'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Features */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          {[
            { icon: Zap, title: "One Page Notes", desc: "Scientific summaries that cover 100% of the syllabus." },
            { icon: Trophy, title: "Exam Tested", desc: "Used by thousands of toppers to score 95%+" },
            { icon: Shield, title: "AI Tutor", desc: "Instant doubt solving with local exam context." }
          ].map((f, i) => (
            <div key={i} className="p-10 rounded-[40px] bg-white/[0.02] border border-white/5 space-y-6">
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                <f.icon className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black">{f.title}</h3>
              <p className="text-gray-400 leading-relaxed font-medium">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">
          © 2026 NoteVix Academy • All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
