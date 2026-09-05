import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Zap, Smartphone, ShieldCheck, Crown, Flame, 
  BookOpen, FileText, Award, Target, Folder, CheckCircle2, 
  Printer, Star, Users, ArrowUpRight, ChevronDown, Check, 
  Mail, MessageSquare, Heart, Bookmark, Eye, HelpCircle, Shield, Info, SmartphoneIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ==========================================
// 1. HERO TRUST BAR
// ==========================================
export function TrustBar() {
  const trustItems = [
    { icon: Sparkles, title: "Latest CBSE syllabus", desc: "100% NCERT aligned" },
    { icon: Zap, title: "Instant Access", desc: "Download password in minutes" },
    { icon: Smartphone, title: "Mobile Optimized", desc: "Perfect for fast reading" },
    { icon: ShieldCheck, title: "Secure Checkout", desc: "Safe UPI & PayPal" },
    { icon: Crown, title: "Premium Design", desc: "Created by former CBSE toppers" },
    { icon: Flame, title: "Fast Revision", desc: "Master chapters in 15 mins" }
  ];

  return (
    <div className="w-full py-12 px-2 border-y border-white/5 bg-gradient-to-b from-transparent to-[#0a0a0c]/20">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-indigo-400 font-black mb-8">
          The NoteVix Standard • Premium EdTech Trust
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ y: -3, borderColor: 'rgba(139, 92, 246, 0.2)' }}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex flex-col items-center text-center space-y-2 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/5 flex items-center justify-center border border-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Icon size={18} className="text-indigo-400 group-hover:text-white transition-colors" />
                </div>
                <h4 className="text-[11px] font-extrabold uppercase text-white tracking-wide">{item.title}</h4>
                <p className="text-[9px] text-gray-500 font-bold uppercase">{item.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. WHY CHOOSE NOTEVIX
// ==========================================
export function WhyChooseUs() {
  const features = [
    { icon: BookOpen, title: "One Page Revision", desc: "Meticulously summarized formulas, timelines & core diagrams on a single screen." },
    { icon: FileText, title: "Full Revision Notes", desc: "Comprehensive chapter reviews that skip textbook clutter to save your precious hours." },
    { icon: Award, title: "200 Repeated Questions", desc: "Master high-yield questions most frequently asked in previous board exams." },
    { icon: Target, title: "Exam Focused", desc: "Specifically designed around current exam structures, blueprints & scoring strategies." },
    { icon: Folder, title: "Chapter-wise PDFs", desc: "Keep your studies highly modular. Jump straight to the weak topics instantly." },
    { icon: CheckCircle2, title: "Latest CBSE Pattern", desc: "Includes brand new Competency-Based & Case Study Questions for 2026 boards." },
    { icon: Smartphone, title: "Mobile Friendly", desc: "Formatted in high-contrast card styling optimized for screens of any size." },
    { icon: Printer, title: "Printable PDFs", desc: "High-resolution, vector-crisp layouts that print beautifully at home or local shops." },
    { icon: Zap, title: "Easy Last Minute Revision", desc: "Your perfect companion for the high-pressure final night before boards." }
  ];

  return (
    <section className="py-24 px-6 border-t border-white/5 bg-[#07070a] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 blur-[150px] -z-10 rounded-full" />
      
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-[10px] text-indigo-400 font-black tracking-[0.2em] uppercase bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/15">
            A Better Way To Learn
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
            Why Thousands of Students <br/>
            <span className="text-indigo-500">Choose NoteVix</span>
          </h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest max-w-xl mx-auto">
            Traditional textbooks are filled with wordy explanations. NoteVix synthesizes knowledge into memory-friendly active recall loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                whileHover={{ y: -5, borderColor: 'rgba(139, 92, 246, 0.2)', backgroundColor: 'rgba(255,255,255,0.025)' }}
                className="p-8 rounded-[2rem] bg-white/[0.015] border border-white/5 transition-all shadow-xl"
              >
                <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6">
                  <Icon size={22} />
                </div>
                <h3 className="text-base font-black uppercase tracking-tight text-white mb-3">{feat.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 3. STUDENT REVIEWS
// ==========================================
export interface Testimonial {
  name: string;
  class_level: string;
  rating: number;
  review: string;
  avatar_url?: string;
  is_verified?: boolean;
}

const DEFAULT_REVIEWS: Testimonial[] = [
  {
    name: "Ananya Sharma",
    class_level: "Class 10 CBSE • 98.4%",
    rating: 5,
    review: "NoteVix Science cards were an absolute lifesaver. I literally revised the entire chemical reactions chapter in 10 minutes flat right before entering the exam hall! Got 98 in Science.",
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    is_verified: true
  },
  {
    name: "Rohan Verma",
    class_level: "Class 10 CBSE • 97.2%",
    rating: 5,
    review: "The SST notes saved me so much pain. History had so many dates, but the visual timeline pages made remembering them incredibly easy. Highly recommend the Class Master Pack!",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    is_verified: true
  },
  {
    name: "Sneha Patel",
    class_level: "Class 10 CBSE • 96.8%",
    rating: 5,
    review: "I printed all science chapters and taped them to my study desk. These notes are highly structured and look so professional compared to random scribbles from school notebooks.",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    is_verified: true
  },
  {
    name: "Aditya Goel",
    class_level: "Class 10 CBSE • 95.5%",
    rating: 5,
    review: "Perfect for last-minute revisions. I was struggling to recall math identities, but NoteVix laid out all the formulas on a single screen with illustrative solved examples. Pure gold.",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    is_verified: true
  }
];

export function Testimonials() {
  const [reviews, setReviews] = useState<Testimonial[]>(DEFAULT_REVIEWS);

  useEffect(() => {
    async function fetchReviews() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          setReviews([...data, ...DEFAULT_REVIEWS]); // prioritize new dynamic reviews
        }
      } catch (err) {
        // fallback to defaults gracefully
      }
    }
    fetchReviews();
  }, []);

  return (
    <section className="py-24 px-6 border-t border-white/5 bg-gradient-to-b from-[#050505] to-[#0a0a0c]">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-[10px] text-indigo-400 font-black tracking-[0.25em] uppercase">
            STUDENT SUCCESS STORIES
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
            Loved By <span className="text-indigo-500">Thousands</span> of Board Toppers
          </h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            Real student experiences with NoteVix. Zero simulated hype.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((rev, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -4, borderColor: 'rgba(139, 92, 246, 0.15)' }}
              className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex flex-col justify-between space-y-6 shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex gap-1 text-yellow-500">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} size={14} className="fill-current" />
                  ))}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-medium italic">
                  "{rev.review}"
                </p>
              </div>

              <div className="flex items-center gap-3 border-t border-white/5 pt-4">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 shrink-0 border border-white/10">
                  <img 
                    src={rev.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} 
                    alt={rev.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white flex items-center gap-1.5">
                    {rev.name}
                    {rev.is_verified && (
                      <span className="text-[8px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded-full font-bold">✓</span>
                    )}
                  </h4>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{rev.class_level}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 4. SOCIAL PROOF
// ==========================================
export function SocialProof() {
  const [followerStats, setFollowerStats] = useState({
    instagram: "45.8K+",
    telegram: "18.2K+",
    youtube: "32.4K+"
  });

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('app_settings').select('*');
        if (!error && data) {
          const stats: any = {};
          const insta = data.find((s: any) => s.key === 'instagram_followers');
          const tele = data.find((s: any) => s.key === 'telegram_followers');
          const yt = data.find((s: any) => s.key === 'youtube_followers');
          if (insta) stats.instagram = insta.value;
          if (tele) stats.telegram = tele.value;
          if (yt) stats.youtube = yt.value;
          setFollowerStats(prev => ({ ...prev, ...stats }));
        }
      } catch (err) {
        // use fallback values
      }
    }
    fetchStats();
  }, []);

  const channels = [
    {
      platform: "Instagram",
      handle: "@notevix.academy",
      followers: followerStats.instagram,
      accent: "from-pink-500/10 to-purple-500/10",
      border: "hover:border-pink-500/20",
      textAccent: "text-pink-400",
      link: "https://instagram.com"
    },
    {
      platform: "Telegram",
      handle: "NoteVix CBSE Boards",
      followers: followerStats.telegram,
      accent: "from-sky-500/10 to-indigo-500/10",
      border: "hover:border-sky-500/20",
      textAccent: "text-sky-400",
      link: "https://t.me"
    },
    {
      platform: "YouTube",
      handle: "NoteVix Lessons",
      followers: followerStats.youtube,
      accent: "from-red-500/10 to-orange-500/10",
      border: "hover:border-red-500/20",
      textAccent: "text-red-400",
      link: "https://youtube.com"
    }
  ];

  return (
    <section className="py-24 px-6 border-t border-white/5 bg-[#050508]">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-[10px] text-indigo-400 font-black tracking-[0.25em] uppercase">
            STAY CONNECTED
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
            Join Our Growing <span className="text-indigo-500">Community</span>
          </h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest max-w-xl mx-auto">
            Get daily tips, micro-lessons, board updates, and free notes by subscribing to our handles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {channels.map((chan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`p-8 rounded-[2.5rem] bg-gradient-to-br ${chan.accent} border border-white/5 ${chan.border} transition-all flex flex-col justify-between h-[250px] shadow-xl group`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black uppercase text-gray-500 tracking-wider">{chan.platform}</span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white">
                    <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight text-white">{chan.followers}</h3>
                  <p className="text-[11px] font-bold text-gray-400 mt-1">{chan.handle}</p>
                </div>
              </div>

              <a 
                href={chan.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-center font-black text-[10px] uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2`}
              >
                Follow on {chan.platform}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 5. FOUNDER STORY
// ==========================================
export function FounderSection() {
  return (
    <section className="py-24 px-6 border-t border-white/5 bg-[#08080c] relative">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        {/* Founder Bio */}
        <div className="md:col-span-7 space-y-8">
          <div className="space-y-3">
            <span className="text-[10px] text-indigo-400 font-black tracking-[0.25em] uppercase">
              BEHIND THE BRAND
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
              Meet The <span className="text-indigo-500">Founder</span>
            </h2>
          </div>

          <div className="space-y-4 text-xs text-gray-400 leading-relaxed font-medium text-justify">
            <p className="border-l-2 border-indigo-500 pl-4 italic text-white text-sm font-bold">
              "We noticed CBSE students spending 80% of their exam prep hours reading long chapters and only 20% practicing. We created NoteVix to flip that ratio."
            </p>
            <p>
              Hi, I’m <strong className="text-white">NITESH YADAV</strong>, Founder of NoteVix. Over years of guiding Class 10 board aspirants, I realized that bulkier material doesn't equal higher scores. In fact, standard heavy textbooks often dilute focus, making revision incredibly stressful and exhausting.
            </p>
            <p>
              NoteVix was born out of a mission to provide <strong>highly condensed, toppers-grade summaries</strong>. Our design principles draw inspiration from premium technology platforms like Apple and Notion: minimal cognitive clutter, gorgeous visual anchors, and extreme portability.
            </p>
            <p>
              Every page on NoteVix is refined down to the core scoring concepts. We focus 100% on fast recall, and we guarantee that our material will give you the utmost clarity in less than 15 minutes.
            </p>
          </div>

          <div className="flex gap-4 items-center">
            <div className="space-y-0.5">
              <h4 className="text-sm font-black uppercase text-white">NITESH YADAV</h4>
              <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Founder & Chief Educator</p>
            </div>
          </div>
        </div>

        {/* Image Placeholder */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative w-full max-w-sm aspect-[4/5] rounded-[3rem] bg-gradient-to-br from-indigo-900/10 to-purple-900/10 border border-white/5 overflow-hidden flex items-center justify-center p-8 group shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
            <div className="text-center space-y-4 relative z-10">
              <div className="w-24 h-24 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 text-3xl font-black shadow-lg">
                NY
              </div>
              <div>
                <h4 className="text-base font-black uppercase tracking-wide text-white">NITESH YADAV</h4>
                <p className="text-[10px] text-gray-500 font-extrabold uppercase mt-1 tracking-widest">Educator • Tech Alchemist</p>
              </div>
              <p className="text-[10px] text-indigo-300 font-bold leading-relaxed">
                Empowering 100,000+ Students <br/> Across CBSE Schools
              </p>
            </div>
            {/* Ambient border flash on hover */}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 6. ABOUT NOTEVIX
// ==========================================
export function AboutSection() {
  return (
    <section className="py-24 px-6 border-t border-white/5 bg-[#050505]">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-[10px] text-indigo-400 font-black tracking-[0.25em] uppercase">
            WHO WE ARE
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
            Designed for <span className="text-indigo-500">Accelerated Learning</span>
          </h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            Fusing professional pedagogy with high-fidelity UI design.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                <Target size={20} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Our Vision</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium text-justify">
                To transform traditional, exhausting exam preparations into a clean, structured, and friction-free process. We envision an education model where learning is dense, visually stunning, and highly portable—enabling students to bypass burnout.
              </p>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-indigo-500/20 to-transparent w-2/3 mt-4" />
          </div>

          <div className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-indigo-600/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                <Heart size={20} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white">Why NoteVix Exists</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium text-justify">
                Many students perform average simply because they get bogged down by textbook weight and unorganized notes. NoteVix exists to eliminate textbook intimidation. We design beautiful study companions so you can recall every diagram and chemical equation with complete ease.
              </p>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-indigo-500/20 to-transparent w-2/3 mt-4" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 7. ACCORDION FAQ SECTION
// ==========================================
interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div className="border-b border-white/5 py-5">
      <button 
        onClick={onClick}
        className="w-full flex justify-between items-center text-left py-2 font-black text-xs md:text-sm uppercase tracking-wide text-white hover:text-indigo-400 transition-colors focus:outline-none"
      >
        <span>{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-500"
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-gray-400 leading-relaxed py-4 font-medium max-w-3xl">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How do I receive the password after purchase?",
      answer: "Instant Delivery! Once you submit your UPI or PayPal transaction proof on our checkout modal, you'll reach the WhatsApp verification link. Simply send your Transaction ID to +91 9236489649. Our administrators verify receipts immediately (within 2-10 minutes) and send you the unique PDF unlock password!"
    },
    {
      question: "Can I print these notes?",
      answer: "Yes, fully printable! Every single NoteVix PDF is generated in high-resolution vector layout. There is zero blur, and you can print them cleanly at home or xerox print outlets."
    },
    {
      question: "Will I get free updates if the CBSE pattern changes?",
      answer: "Absolutely! NoteVix is dedicated to keeping materials updated. If CBSE makes any adjustments or releases new sample papers during the academic session, your purchased subject folder gets updated automatically without any extra charges."
    },
    {
      question: "Is there a download limit?",
      answer: "No, unlimited downloads! Once your payment is approved, your access remains valid for life. You can download the notes on your Mobile, Tablet, and Desktop as many times as you like."
    },
    {
      question: "How can I contact NoteVix support?",
      answer: "We are available almost 24/7. You can reach our dedicated WhatsApp Helpline directly at +91 9236489649 or email our admin desk at expertnotevix@gmail.com. Most queries are resolved in under 10 minutes!"
    }
  ];

  return (
    <section className="py-24 px-6 border-t border-white/5 bg-[#07070a]">
      <div className="max-w-4xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <span className="text-[10px] text-indigo-400 font-black tracking-[0.25em] uppercase">
            HAVE QUESTIONS?
          </span>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">
            Frequently Asked <span className="text-indigo-500">Questions</span>
          </h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            Everything you need to know about NoteVix packs.
          </p>
        </div>

        <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-1">
          {faqs.map((faq, i) => (
            <FAQItem 
              key={i} 
              question={faq.question} 
              answer={faq.answer} 
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================
// 8. PRODUCT DETAILS EXPANSION MODAL
// ==========================================
interface ProductDetailsModalProps {
  product: any;
  onClose: () => void;
  onBuy: () => void;
}

export function ProductDetailsModal({ product, onClose, onBuy }: ProductDetailsModalProps) {
  if (!product) return null;

  const highlights = [
    "Cognitive single-page layout structure",
    "Compiled using the latest 2026 CBSE Blueprint",
    "200 High-Yield Repeated Questions & PYQs included",
    "Optimized visual memory anchors for fast recall",
    "High-definition printable vector files"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="relative w-full max-w-4xl bg-[#09090c] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden my-8"
      >
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600" />
        
        {/* Header bar */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-white/5 bg-[#0c0c10]">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-full font-black uppercase tracking-wider border border-indigo-500/15">
              Topper Pack
            </span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Class {product.class} CBSE
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Cover Column */}
          <div className="md:col-span-5 space-y-6">
            <div className="aspect-[3/4] rounded-2xl bg-white/5 border border-white/5 overflow-hidden shadow-2xl relative group">
              <img 
                src={product.cover_image || "/fallback_cover.png"} 
                alt={product.subject} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400";
                }}
              />
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/5">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pricing Model</p>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-xl font-black text-white">₹{product.price || 39}</span>
                  <span className="text-[8px] text-indigo-400 font-black uppercase tracking-widest">One-time payment</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-[10px] text-indigo-300 font-bold flex items-center gap-3">
              <ShieldCheck size={20} className="text-indigo-400 shrink-0" />
              <span>Full verified buyer security & direct WhatsApp access included.</span>
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 space-y-8 text-left">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">{product.subject} Premium Notes</h1>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">CBSE Class {product.class} Complete syllabus revision pack</p>
            </div>

            {/* About this PDF */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">About This PDF</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                {product.description || `Meticulously compiled by board toppers and curriculum experts, this revision pack streamlines the entire Class ${product.class} CBSE syllabus. We strip away standard textbook fillers to emphasize exact formulas, chemical reactions, historical timelines, and structural diagrams that carry major marks.`}
              </p>
            </div>

            {/* Features & Benefits */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">What's Included in PDF Pack</h3>
              <div className="grid grid-cols-1 gap-2.5">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} className="text-indigo-400 font-bold" />
                    </div>
                    <span className="text-xs text-gray-300 font-medium">{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Who is this for */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Who Is This For?</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                Designed primarily for CBSE students aiming for 95%+ who want an efficient alternative to heavy textbooks, especially during last-minute preparations or mock revisions.
              </p>
            </div>

            {/* Related FAQs */}
            <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
              <h4 className="text-[11px] font-black uppercase text-white flex items-center gap-1.5">
                <HelpCircle size={14} className="text-indigo-400" />
                Will I get free updates?
              </h4>
              <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed">
                Yes! If CBSE makes any syllabus adjustments during the academic cycle, your download files will receive the latest revisions for free.
              </p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-8 py-6 border-t border-white/5 bg-[#0c0c10] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left shrink-0">
            <p className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider">TOTAL PACK PRICE</p>
            <p className="text-2xl font-black text-white">₹{product.price || 39}</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-wider transition-colors border border-white/5 cursor-pointer text-center"
            >
              Back to Library
            </button>
            <button 
              onClick={() => {
                onClose();
                onBuy();
              }}
              className="flex-1 sm:flex-none px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 text-center cursor-pointer"
            >
              Unlock Instantly ⚡
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
