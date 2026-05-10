import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Copy, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Instagram, 
  Smartphone, 
  Gift, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { StoryTemplate, UserProfile } from '../types';
import { dataBridge } from '../services/dataBridge';
import { geminiService } from '../services/geminiService';

interface StoryUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  resource: { id: string; subject: string; title: string };
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
  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean, error?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setStep(1);
      setVerificationResult(null);
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoading(true);
    const data = await dataBridge.getStoryTemplates();
    setTemplates(data);
    if (data.length > 0) setSelectedTemplate(data[0]);
    setLoading(false);
  };

  const handleDownloadTemplate = () => {
    if (!selectedTemplate) return;
    const link = document.createElement('a');
    link.href = selectedTemplate.imageUrl;
    link.download = `NoteVix-${selectedTemplate.title}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template downloaded! Post this on your Story.");
  };

  const handleCopyLink = () => {
    if (!selectedTemplate) return;
    navigator.clipboard.writeText(selectedTemplate.link);
    toast.success("Link copied! Add this to your Story.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplate) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (screenshot).");
      return;
    }

    setUploading(true);
    setVerificationResult(null);

    // Convert to base64 for processing (no permanent storage)
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setUploading(false);
      await verifyScreenshot(base64);
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const verifyScreenshot = async (imageData: string) => {
    if (!selectedTemplate) return;
    setVerifying(true);
    try {
      const result = await geminiService.verifyStoryScreenshot(imageData, selectedTemplate);
      
      if (result.isValid) {
        // Record the unlock in DB
        const dbResult = await dataBridge.recordStoryUnlock(
          user.uid, 
          resource.id, 
          selectedTemplate.id, 
          { confidence: result.confidence, raw: result.raw }
        );
        
        if (dbResult.success) {
          setVerificationResult({ isValid: true });
          setStep(4);
          toast.success("Verified! PDF Unlocked.", { icon: '🎁' });
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 3000);
        } else {
          setVerificationResult({ isValid: false, error: "Database error recording unlock." });
        }
      } else {
        setVerificationResult({ 
          isValid: false, 
          error: "Verification failed. Ensure the NoteVix branding and link are clearly visible in the Story screenshot." 
        });
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      setVerificationResult({ isValid: false, error: err.message || "AI engine error. Please try again." });
    } finally {
      setVerifying(false);
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
                <h3 className="font-black text-lg tracking-tight uppercase italic leading-none">Flash Unlock</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Story Verification System</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-8 pb-10 max-h-[70vh] overflow-y-auto no-scrollbar">
            {step === 1 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-white leading-tight uppercase italic">
                    Unlock <span className="text-indigo-400">Permanently</span>
                  </h4>
                  <p className="text-sm text-gray-400 font-medium">To unlock the <span className="text-white font-bold">{resource.subject}</span> PDF for free, simply share our promotional story on your Instagram or Snapchat.</p>
                </div>

                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">3-Step Process</span>
                  </div>
                  <div className="space-y-3">
                     {[
                       'Download the promotional template',
                       'Post as Story with our website link',
                       'Upload screenshot for Instant AI verification'
                     ].map((item, idx) => (
                       <div key={idx} className="flex items-center gap-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                         <span className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-indigo-400 border border-white/5">{idx + 1}</span>
                         {item}
                       </div>
                     ))}
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 group"
                >
                  Start Unlock <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Step 01 / 02</span>
                  <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Prepare Your Story</h4>
                </div>

                {loading ? (
                  <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/5 rounded-3xl animate-pulse">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Loading Template...</span>
                  </div>
                ) : selectedTemplate ? (
                  <div className="space-y-6">
                    <div className="relative group rounded-3xl overflow-hidden border border-white/10 aspect-[9/16] h-64 mx-auto">
                      <img 
                        src={selectedTemplate.imageUrl} 
                        alt="Template" 
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest drop-shadow-md">Active Template</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={handleDownloadTemplate}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all group"
                      >
                        <Download className="w-6 h-6 text-indigo-400 group-hover:-translate-y-1 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Download Template</span>
                      </button>
                      <button 
                        onClick={handleCopyLink}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2 hover:bg-white/10 transition-all group"
                      >
                        <Copy className="w-6 h-6 text-indigo-400 group-hover:-translate-y-1 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Copy Story Link</span>
                      </button>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex gap-4">
                       <Smartphone className="w-6 h-6 text-emerald-400 shrink-0" />
                       <div className="space-y-1">
                         <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Post Instructions</p>
                         <p className="text-[11px] text-gray-400">Post this image on Instagram or Snapchat story. Use the 'Link' sticker to add: <span className="text-white font-mono bg-white/5 px-1 rounded">{selectedTemplate.link}</span></p>
                       </div>
                    </div>

                    <button 
                      onClick={() => setStep(3)}
                      className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                      I've Posted! Next <ChevronRight size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-red-500">No active templates available.</p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Step 02 / 02</span>
                  <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Verify via AI</h4>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 border border-dashed border-white/20 rounded-[2.5rem] p-10 text-center relative group overflow-hidden">
                    {verifying ? (
                      <div className="space-y-4">
                        <div className="relative w-16 h-16 mx-auto">
                          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin absolute inset-0" />
                          <div className="absolute inset-0 flex items-center justify-center">
                             <Zap className="w-6 h-6 text-indigo-400 animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Running Gemini Vision AI</p>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Scanning NoteVix Branding...</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                          disabled={uploading}
                        />
                        <div className="space-y-4 relative z-0">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto border border-white/10 group-hover:scale-110 transition-transform">
                            <Upload className="w-8 h-8 text-gray-500" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-black text-white uppercase tracking-tight">Upload Screenshot</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Proof of your Story post</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {verificationResult && !verificationResult.isValid && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-bold text-red-500 leading-relaxed uppercase tracking-tight">{verificationResult.error}</p>
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em] text-center">Privacy Guarantee</p>
                    <div className="p-4 bg-white/5 rounded-2xl flex items-center gap-4 border border-white/5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest leading-normal">Screenshots are processed in real-time and <span className="text-white">NOT</span> permanently stored.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-6"
              >
                <div className="relative w-32 h-32 mx-auto">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    className="w-full h-full bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30"
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-emerald-500/20 rounded-full"
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-3xl font-black text-white italic uppercase tracking-tighter">PDF Unlocked!</h4>
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-[0.2em]">Resource added to your library</p>
                </div>

                <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full border border-white/10">
                  <Gift className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Enjoy your notes</span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const Lock = ({ ...props }) => (
  <svg 
    {...props} 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
