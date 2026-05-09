import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { dataBridge } from '../services/dataBridge';
import { UserProfile } from '../types';
import { 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Gift, 
  Lock, 
  ExternalLink,
  Twitter,
  MessageCircle,
  Instagram,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

interface ReferralsProps {
  user: UserProfile | null;
}

import { FileText } from 'lucide-react';

export default function Referrals({ user }: ReferralsProps) {
  const [stats, setStats] = useState({ count: 0, verifiedCount: 0 });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralLink = `${window.location.origin}?ref=${user?.uid || 'guest'}`;

  useEffect(() => {
    if (user && user.uid !== 'GUEST') {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    const s = await dataBridge.getReferralStats(user.uid);
    setStats(s);
    setLoading(false);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = `Hey! Check out NoteVix for premium study resources. Sign up using my link and we both get benefits: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const text = `Get the best premium notes and study resources on NoteVix! Use my link to sign up: ${referralLink} #Education #NoteVix`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaInstagram = () => {
    copyLink();
    toast.info("Link copied! You can now paste it in your Instagram Bio or Stories.");
  };

  const currentProgress = Math.min(stats.verifiedCount, 3);
  const progressPercent = (currentProgress / 3) * 100;
  const isUnlocked = stats.verifiedCount >= 3;

  // Ebook link (Master drive link as per request pattern)
  const EBOOK_DRIVE_LINK = "https://drive.google.com/file/d/1_EBOOK_ACCESS_LINK/view?usp=sharing";

  if (!user || user.uid === 'GUEST') {
    return (
      <div className="min-h-screen pt-24 pb-32 px-6 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-[2rem] flex items-center justify-center mb-4">
          <Lock className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Login Required</h2>
        <p className="text-gray-400 max-w-xs uppercase text-[10px] font-bold tracking-widest leading-relaxed">
          Please login to unlock your unique referral link and earn free premium ebooks.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32 px-6 space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Gift className="text-white w-5 h-5" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">Referral <span className="text-indigo-400">Program</span></h1>
        </div>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] ml-1">Invite 3 friends to NoteVix and get a Premium Ebook for FREE</p>
      </div>

      {/* Referral Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 -scale-x-100">
            <Award className="w-32 h-32" />
        </div>

        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Your Referral Link</p>
            <TrendingUp className="w-4 h-4 text-emerald-400 opacity-50" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-mono text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
              {referralLink}
            </div>
            <button 
              onClick={copyLink}
              className="bg-white text-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sharing Options */}
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={shareViaWhatsApp}
            className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl group hover:bg-emerald-500/20 transition-all"
          >
            <MessageCircle className="w-6 h-6 text-emerald-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400/80">WhatsApp</span>
          </button>
          <button 
            onClick={shareViaInstagram}
            className="flex flex-col items-center gap-2 p-4 bg-pink-500/10 border border-pink-500/20 rounded-2xl hover:bg-pink-500/20 transition-all"
          >
            <Instagram className="w-6 h-6 text-pink-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-pink-400/80">Instagram</span>
          </button>
          <button 
            onClick={shareViaTwitter}
            className="flex flex-col items-center gap-2 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all"
          >
            <Twitter className="w-6 h-6 text-indigo-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400/80">Twitter</span>
          </button>
        </div>
      </motion.div>

      {/* Progress Card */}
      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
             <h4 className="text-xl font-black uppercase tracking-tight">Reward Progress</h4>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stats.verifiedCount}/3 Verified Referrals</p>
           </div>
           {isUnlocked ? (
             <div className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <Award className="w-3 h-3" /> UNLOCKED
             </div>
           ) : (
             <div className="bg-amber-500/20 text-amber-500 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
               <Lock className="w-3 h-3" /> LOCKED
             </div>
           )}
        </div>

        <div className="space-y-3">
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
            />
          </div>
          <div className="flex justify-between px-1">
            <span className="text-[10px] font-bold text-gray-600">START</span>
            <span className="text-[10px] font-black text-indigo-400">FINISH</span>
          </div>
        </div>

        {isUnlocked ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-indigo-500 rounded-3xl space-y-4 shadow-2xl shadow-indigo-500/20"
          >
            <div className="flex items-start justify-between">
               <div className="bg-white/20 p-3 rounded-2xl">
                 <FileText className="w-6 h-6 text-white" />
               </div>
               <Award className="w-5 h-5 text-white/50" />
            </div>
            <div className="space-y-1">
              <h5 className="text-lg font-black uppercase tracking-tight text-white italic">Master Ebook Unlocked!</h5>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest">You successfully invited {stats.verifiedCount} students.</p>
            </div>
            <a 
              href={EBOOK_DRIVE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95"
            >
              Get My Ebook <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        ) : (
          <div className="p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 group">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-300 uppercase italic">Free Master Ebook</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Unlock after 3 verified invites</p>
            </div>
          </div>
        )}
      </div>

      {/* Rules Notice */}
      <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex gap-4">
        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Anti-Fraud Protection</h5>
          <p className="text-[9px] text-gray-500 font-bold leading-relaxed uppercase tracking-widest">
            Referrals are verified by AI. Multiple accounts from same user or spam signups will be flagged and rewards revoked. One device/phone per referral allowed.
          </p>
        </div>
      </div>
    </div>
  );
}
