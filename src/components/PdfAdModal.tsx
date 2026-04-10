import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { AdBanner } from './AdBanner';

interface PdfAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
}

export function PdfAdModal({ isOpen, onClose, pdfUrl }: PdfAdModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanSkip(true);
    }
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const handleOpenPdf = () => {
    window.open(pdfUrl, '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md bg-[#1a1635] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Opening Resource...</h3>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 min-h-[250px] flex items-center justify-center relative">
                <AdBanner slot="pdf_interstitial" />
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Advertisement
                </div>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleOpenPdf}
                  disabled={!canSkip}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    canSkip 
                      ? 'purple-gradient text-white shadow-xl shadow-purple-500/20' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {canSkip ? (
                    <>
                      <ExternalLink className="w-5 h-5" />
                      Open PDF Now
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Wait {countdown}s to open...
                    </>
                  )}
                </button>
                
                <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest">
                  Ads help us keep NoteVix free for everyone
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
