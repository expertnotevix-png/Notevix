import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { LogOut, Settings, Shield, CreditCard, Bell, ChevronRight, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileProps {
  user: UserProfile;
}

export default function Profile({ user }: ProfileProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    signOut(auth);
  };

  const updateClass = async (cls: string) => {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, { class: cls });
  };

  const menuItems = [
    { icon: CreditCard, label: 'Subscription', sub: 'Manage your plan', color: 'text-yellow-500' },
    { icon: Bell, label: 'Notifications', sub: 'Study reminders', color: 'text-blue-500' },
    { icon: Settings, label: 'Settings', sub: 'App preferences', color: 'text-gray-400' },
  ];

  if (user.role === 'admin') {
    menuItems.unshift({ icon: Shield, label: 'Admin Panel', sub: 'Manage content', color: 'text-purple-500' });
  }

  return (
    <div className="p-6 space-y-8">
      {/* Profile Header */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-500 mx-auto shadow-2xl shadow-purple-500/20">
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
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
            <span className="text-xs text-gray-500 block">Class</span>
            <span className="font-bold">{user.class || 'N/A'}</span>
          </div>
          <div className="glass-card px-4 py-2 rounded-xl">
            <span className="text-xs text-gray-500 block">Saved</span>
            <span className="font-bold">{user.savedNotes.length}</span>
          </div>
        </div>
      </div>

      {/* Class Selection */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Switch Class</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['6', '7', '8', '9', '10'].map((cls) => (
            <button
              key={cls}
              onClick={() => updateClass(cls)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                user.class === cls ? 'purple-gradient text-white' : 'glass-card text-gray-400'
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
            onClick={() => item.label === 'Admin Panel' && navigate('/admin')}
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

      <div className="text-center pt-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">NoteVix v1.0.0</p>
      </div>
    </div>
  );
}
