import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  Send,
  Zap,
  User,
  GraduationCap,
  Mail,
  Phone,
  AtSign
} from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '../types';
import { dataBridge } from '../services/dataBridge';

interface StoryUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  resource: { id: string; subject: string; title: string, password?: string };
  onSuccess: () => void;
}

export const StoryUnlockModal: React.FC<StoryUnlockModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  resource, 
  onSuccess 
}) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: user.displayName || '',
    class: user.class_level || '10',
    email: user.email || '',
    phoneNumber: '',
    socialHandle: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormData({
        fullName: user.displayName || '',
        class: user.class_level || '10',
        email: user.email || '',
        phoneNumber: '',
        socialHandle: ''
      });
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.socialHandle) {
      toast.error("Please fill all fields");
      return;
    }

    setSubmitting(true);
    try {
      const result = await dataBridge.submitPdfRequest({
        ...formData,
        resourceId: resource.id,
        resourceName: `${resource.subject} Combo Pack`,
        userId: user.uid
      });

      if (result.success) {
        setStep(2);
        toast.success("Request submitted successfully!");
      } else {
        toast.error(result.error || "Failed to submit request");
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-indigo-500/10"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight uppercase italic leading-none">Free Unlock</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Manual Approval System</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 pb-10 max-h-[75vh] overflow-y-auto no-scrollbar">
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2 text-center">
                  <h4 className="text-2xl font-black text-white leading-tight uppercase italic">
                    Claim Your <span className="text-indigo-400">PDF Access</span>
                  </h4>
                  <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">
                    Fill in your details to request access to the <span className="text-white font-bold">{resource.subject}</span> combo pack.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter your name"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-600 outline-none focus:border-indigo-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Class Level */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Your Class</label>
                    <div className="relative group">
                      <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-indigo-400 transition-colors" />
                      <select 
                        name="class"
                        value={formData.class}
                        onChange={handleInputChange}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-indigo-500/50 appearance-none transition-all"
                      >
                        <option value="8" className="bg-[#0a0a0a]">Class 8</option>
                        <option value="9" className="bg-[#0a0a0a]">Class 9</option>
                        <option value="10" className="bg-[#0a0a0a]">Class 10</option>
                      </select>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-600 outline-none focus:border-indigo-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">WhatsApp Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="+91 00000 00000"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-600 outline-none focus:border-indigo-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Social Handle */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Instagram/Snapchat Handle</label>
                    <div className="relative group">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="text"
                        name="socialHandle"
                        value={formData.socialHandle}
                        onChange={handleInputChange}
                        placeholder="@username"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-600 outline-none focus:border-indigo-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={submitting}
                      className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Request <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest text-center">
                  Requests are manually verified within 24-48 hours.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-6"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="w-full h-full bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30"
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">Request Received!</h4>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
                    We've received your request for the <span className="text-white">{resource.subject}</span> combo pack.
                  </p>
                </div>

                <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-2">
                  <p className="text-[10px] text-emerald-500 font-extrabold uppercase tracking-widest">Wait for Approval</p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Our team will verify your details soon. You'll get access to the PDF in your dashboard once approved.
                  </p>
                </div>

                <button 
                  onClick={onClose}
                  className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group"
                >
                  Done <ChevronRight size={18} />
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
