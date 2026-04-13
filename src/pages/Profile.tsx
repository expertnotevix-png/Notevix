import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { UserProfile } from '../types';
import { LogOut, Settings, Shield, CreditCard, Bell, ChevronRight, Award, Instagram, Send, BookOpen, Moon, Bookmark, Share2, Copy, Check, Download, QrCode, MessageSquare, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';

interface ProfileProps {
  user: UserProfile;
}

export default function Profile({ user }: ProfileProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [userPostsCount, setUserPostsCount] = useState(0);

  useEffect(() => {
    const fetchUserStats = async () => {
      const q = query(collection(db, 'posts'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setUserPostsCount(snap.size);
    };
    fetchUserStats();
  }, [user.uid]);

  const handleLogout = () => {
    signOut(auth);
  };

  const toggleNotifications = async () => {
    const userRef = doc(db, 'users', user.uid);
    const newState = !user.notificationsEnabled;
    await updateDoc(userRef, { notificationsEnabled: newState });
    toast.success(newState ? 'Notifications Enabled' : 'Notifications Disabled');
  };

  const toggleStudyMode = async () => {
    const userRef = doc(db, 'users', user.uid);
    const newState = !user.studyModeEnabled;
    await updateDoc(userRef, { studyModeEnabled: newState });
    toast.success(newState ? 'Study Mode On' : 'Study Mode Off');
  };

  const updateClass = async (cls: string) => {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { class: cls });
  };

  const menuItems = [
    { icon: CreditCard, label: 'Subscription', sub: 'Manage your plan', color: 'text-yellow-500', action: () => {} },
    { icon: Bell, label: 'Notifications', sub: user.notificationsEnabled ? 'Enabled' : 'Disabled', color: user.notificationsEnabled ? 'text-green-500' : 'text-blue-500', action: toggleNotifications },
    { icon: Moon, label: 'Study Mode', sub: user.studyModeEnabled ? 'Distraction-free on' : 'Standard mode', color: user.studyModeEnabled ? 'text-purple-500' : 'text-gray-400', action: toggleStudyMode },
    { icon: Settings, label: 'Settings', sub: 'App preferences', color: 'text-gray-400', action: () => {} },
  ];

  const socialLinks = [
    { icon: Instagram, label: 'Instagram', handle: '@_notevix', url: 'https://instagram.com/_notevix', color: 'text-pink-500' },
    { icon: Send, label: 'Telegram', handle: 'NoteVix Official', url: 'https://t.me/NoteVix', color: 'text-blue-400' },
  ];

  const referralLink = `${window.location.origin}/login?ref=${user.referralCode}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join NoteVix',
        text: 'Unlock premium CBSE notes by joining NoteVix using my link!',
        url: referralLink,
      });
    } else {
      copyReferral();
    }
  };

  const downloadQR = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = 'notevix-qr.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (user.role === 'admin') {
    menuItems.unshift({ icon: Shield, label: 'Admin Panel', sub: 'Manage content', color: 'text-purple-500', action: () => navigate('/admin') });
  }

  return (
    <div className="p-6 space-y-8">
      {/* Profile Header */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-500 mx-auto shadow-2xl shadow-purple-500/20">
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-purple-600 p-1.5 rounded-full border-4 border-black">
            <Award className="w-4 h-4 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.displayName}</h1>
          <p className="text-gray-500 text-sm">{user.email}</p>
        </div>
        <div className="flex justify-center gap-4">
          <div className="glass-card px-4 py-2 rounded-xl">
            <span className="text-xs text-gray-500 block">Streak</span>
            <span className="font-bold">🔥 {user.streak?.currentCount || 0}</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl">
            <span className="text-xs text-gray-500 block">Points</span>
            <span className="font-bold">⌛ {user.totalPoints || 0}</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl">
            <span className="text-xs text-gray-500 block">Saved</span>
            <span className="font-bold">🔖 {user.savedNotes.length}</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl">
            <span className="text-xs text-gray-500 block">Posts</span>
            <span className="font-bold">💬 {userPostsCount}</span>
          </div>
        </div>
      </div>

      {/* Community Activity */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Community Activity</h3>
        <button
          onClick={() => navigate('/community')}
          className="w-full glass-card p-4 rounded-3xl flex items-center justify-between border-blue-500/20 bg-blue-500/5 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div className="text-left">
              <h4 className="font-bold">My Discussions</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">View your questions & replies</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>

      {/* App Branding */}
      <div className="glass-card p-4 rounded-3xl flex items-center justify-between border-purple-500/20 bg-purple-500/5">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <div>
            <h4 className="font-bold text-sm">NoteVix {user.isPremium ? 'Premium' : 'Free'}</h4>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Education for Toppers</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.isPremium ? 'bg-yellow-500/20 text-yellow-500' : 'bg-purple-500/20 text-purple-400'}`}>
          {user.isPremium ? 'Pro' : 'Free'}
        </div>
      </div>

      {/* Referral System */}
      <div className="glass-card p-6 rounded-3xl space-y-4 border-yellow-500/20 bg-yellow-500/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Share2 className="w-5 h-5 text-yellow-500" />
              Refer & Earn Pro
            </h3>
            <p className="text-xs text-gray-400">Refer 3 friends to unlock Premium Notes!</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-yellow-500">{user.referralCount}</span>
            <span className="text-gray-500 text-xs">/3</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((user.referralCount / 3) * 100, 100)}%` }}
            className="h-full bg-yellow-500"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button 
            onClick={copyReferral}
            className="flex-1 glass-card py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-transform"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button 
            onClick={shareReferral}
            className="flex-1 bg-yellow-500 text-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-transform"
          >
            <Share2 className="w-4 h-4" />
            Share Now
          </button>
        </div>
      </div>

      {/* Class Selection */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Switch Class</h3>
        <div className="grid grid-cols-3 gap-3">
          {['8', '9', '10'].map((cls) => (
            <button
              key={cls}
              onClick={() => updateClass(cls)}
              className={`py-3 rounded-2xl font-bold transition-all ${
                user.class === cls ? 'purple-gradient text-white shadow-lg shadow-purple-500/20' : 'glass-card text-gray-400'
              }`}
            >
              Class {cls}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-3">
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="w-full glass-card p-4 rounded-2xl flex items-center gap-4 group"
          >
            <div className={`w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="font-bold text-sm">{item.label}</h4>
              <p className="text-[10px] text-gray-500">{item.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
          </button>
        ))}
      </div>

      {/* Legal & Support */}
      <div className="space-y-3">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Legal & Support</h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: 'Saved Notes', path: '/saved', icon: Bookmark },
            { label: 'About Us', path: '/about' },
            { label: 'Contact Us', path: '/contact' },
            { label: 'Privacy Policy', path: '/privacy' },
            { label: 'Terms of Service', path: '/terms' },
          ].map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.path)}
              className="w-full glass-card p-4 rounded-2xl flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                {link.icon && <link.icon className="w-4 h-4 text-purple-400" />}
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{link.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* QR Code Section */}
      <div className="glass-card p-6 rounded-3xl space-y-6 border-purple-500/20 bg-purple-500/5">
        <div className="text-center space-y-2">
          <h3 className="font-bold text-lg flex items-center justify-center gap-2">
            <QrCode className="w-5 h-5 text-purple-500" />
            Share Website
          </h3>
          <p className="text-xs text-gray-400">Scan this QR to open NoteVix on any device</p>
        </div>
        
        <div className="flex justify-center p-4 bg-white rounded-2xl w-fit mx-auto shadow-xl">
          <QRCodeCanvas 
            id="qr-code"
            value={window.location.origin} 
            size={160}
            level="H"
            includeMargin={false}
          />
        </div>

        <button 
          onClick={downloadQR}
          className="w-full purple-gradient py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-95 transition-transform shadow-lg shadow-purple-500/20"
        >
          <Download className="w-5 h-5" />
          Download QR Code
        </button>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full glass-card p-4 rounded-2xl flex items-center gap-4 text-red-500 mt-4"
        >
          <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-bold text-sm">Logout</span>
        </button>
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Connect with us</h3>
        <div className="grid grid-cols-2 gap-3">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-4 rounded-2xl flex flex-col items-center gap-2 text-center hover:border-purple-500/50 transition-colors"
            >
              <div className={`w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center ${social.color}`}>
                <social.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs">{social.label}</h4>
                <p className="text-[10px] text-gray-500">{social.handle}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="text-center pt-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">NoteVix v1.0.0</p>
      </div>
    </div>
  );
}
