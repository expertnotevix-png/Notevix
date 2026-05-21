import { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { LogOut, Shield, ChevronRight, BookOpen, Crown, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../components/firebase';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { dataBridge } from '../services/dataBridge';

interface ProfileProps {
  user: AppUser;
  setUser: (user: AppUser | null) => void;
}

export default function Profile({ user, setUser }: ProfileProps) {
  const navigate = useNavigate();
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    const data = await dataBridge.getUserPayments(user.uid, user.email);
    setPurchaseHistory(data);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      navigate('/');
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 pb-32 space-y-12">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-2 border-indigo-500 p-1 bg-black shadow-2xl">
          <img src={user.photoURL} className="w-full h-full object-cover rounded-[1.8rem]" referrerPolicy="no-referrer" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black">{user.displayName}</h1>
            {user.role === 'admin' && <Shield className="w-5 h-5 text-indigo-500 fill-indigo-500/10" />}
          </div>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{user.email}</p>
        </div>
        {user.role === 'admin' ? (
          <div className="bg-indigo-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Crown size={12} /> PRO STUDENT
          </div>
        ) : (
          <div className="bg-white/5 text-gray-500 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
            FREE STUDENT
          </div>
        )}
      </div>

      {/* Grid Menu */}
      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => navigate('/premium-notes')}
          className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <Crown size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold">Premium Notes</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Unlock Subject Passwords</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-700" />
        </button>

        {user.role === 'admin' && (
          <button 
            onClick={() => navigate('/admin')}
            className="bg-indigo-600/10 border border-indigo-600/20 p-6 rounded-3xl flex items-center justify-between group hover:bg-indigo-600 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <Shield size={24} />
              </div>
              <div className="text-left text-white">
                <p className="font-bold">Admin Panel</p>
                <p className="text-[10px] text-indigo-300 font-bold uppercase">Management Console</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-indigo-400 group-hover:text-white" />
          </button>
        )}
      </div>

      {/* Purchase History */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center gap-2">
           <BookOpen className="w-5 h-5 text-indigo-400" />
           <h2 className="text-lg font-black uppercase tracking-tight">Recent Purchases</h2>
        </div>
        
        <div className="space-y-2">
          {purchaseHistory.length > 0 ? (
            purchaseHistory.map((p) => (
              <div key={p.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase">{p.product_name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{p.transaction_id.slice(0, 12)}... • ₹{p.amount}</p>
                  {p.approved && p.unlock_password && (
                    <div className="mt-2 p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Password: {p.unlock_password}</p>
                    </div>
                  )}
                </div>
                <div className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  p.approved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {p.approved ? 'APPROVED' : 'PENDING'}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 bg-white/5 rounded-3xl text-center text-[10px] text-gray-600 font-black uppercase tracking-widest">
              No recent purchases found
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="w-full py-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-black text-xs uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all active:scale-95"
      >
        Sign Out Account
      </button>

      <div className="text-center space-y-4 pt-12 opacity-30">
         <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest">App Version 2.0.4 • Stabilized Core</p>
      </div>
    </div>
  );
}
