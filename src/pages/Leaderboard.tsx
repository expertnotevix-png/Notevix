import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Trophy, Medal, Crown, Timer, TrendingUp, Instagram, Star } from 'lucide-react';

interface LeaderboardProps {
  user: UserProfile | null;
}

export default function Leaderboard({ user }: LeaderboardProps) {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('totalPoints', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as any);
      setTopUsers(users);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leaderboard');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 1: return <Medal className="w-6 h-6 text-gray-300" />;
      case 2: return <Medal className="w-6 h-6 text-orange-400" />;
      default: return <span className="text-gray-500 font-bold w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-2xl">
              <Trophy className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Leaderboard</h1>
              <p className="text-gray-400 text-sm">Top students by study time</p>
            </div>
          </div>
        </div>

        {/* Instagram Links & Notice */}
        <div className="glass-card p-4 rounded-2xl border-purple-500/30 bg-purple-500/5 space-y-3">
          <div className="flex items-center gap-2 text-purple-400">
            <Star className="w-4 h-4 fill-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Weekly Rewards</span>
          </div>
          <p className="text-sm text-gray-300">
            The <span className="text-yellow-400 font-bold">Top 3 students</span> of the week will be tagged on our Instagram accounts!
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <a 
              href="https://instagram.com/studyhacks100" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              @studyhacks100
            </a>
            <a 
              href="https://instagram.com/studysparks100" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl text-xs font-medium hover:bg-white/10 transition-colors"
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              @studysparks100
            </a>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="relative flex items-end justify-center gap-4 pt-12 pb-4">
        {/* Background Glow for Top 3 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-xs h-full bg-purple-500/10 blur-[80px] -z-10" />
        
        {/* Rank 2 */}
        {topUsers[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-2 relative"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-gray-400 shadow-lg shadow-gray-400/20">
                <img src={topUsers[1].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gray-400 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black border-2 border-black">
                2
              </div>
            </div>
            <span className="text-xs font-bold truncate w-20 text-center">{topUsers[1].displayName}</span>
            <div className="h-20 w-16 bg-gray-400/20 rounded-t-xl flex flex-col items-center justify-end pb-2 border-x border-t border-gray-400/30">
              <span className="text-[10px] font-bold">{topUsers[1].totalPoints} pts</span>
            </div>
          </motion.div>
        )}

        {/* Rank 1 */}
        {topUsers[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-2 relative z-10"
          >
            <div className="relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              </div>
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-400 shadow-2xl shadow-yellow-400/40">
                <img src={topUsers[0].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-black">
                1
              </div>
            </div>
            <span className="text-sm font-extrabold truncate w-24 text-center text-yellow-400">{topUsers[0].displayName}</span>
            <div className="h-32 w-24 bg-yellow-400/20 rounded-t-2xl flex flex-col items-center justify-end pb-3 border-x border-t border-yellow-400/40 shadow-[0_-10px_30px_rgba(250,204,21,0.1)]">
              <span className="text-sm font-black text-yellow-400">{topUsers[0].totalPoints}</span>
              <span className="text-[8px] uppercase tracking-widest font-bold text-yellow-400/60">Points</span>
            </div>
          </motion.div>
        )}

        {/* Rank 3 */}
        {topUsers[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-2 relative"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-orange-400 shadow-lg shadow-orange-400/20">
                <img src={topUsers[2].photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-orange-400 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-black border-2 border-black">
                3
              </div>
            </div>
            <span className="text-xs font-bold truncate w-20 text-center">{topUsers[2].displayName}</span>
            <div className="h-16 w-16 bg-orange-400/20 rounded-t-xl flex flex-col items-center justify-end pb-2 border-x border-t border-orange-400/30">
              <span className="text-[10px] font-bold">{topUsers[2].totalPoints} pts</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* List */}
      <div className="space-y-3">
        {topUsers.slice(3).map((u, index) => (
          <motion.div
            key={u.uid}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`glass-card p-4 rounded-2xl flex items-center gap-4 ${u.uid === user?.uid ? 'border-purple-500/50 bg-purple-500/5' : ''}`}
          >
            <div className="w-8 flex justify-center">
              <span className="text-gray-500 font-bold">{index + 4}</span>
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
              <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{u.displayName}</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Class {u.class || '?'}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold">{u.totalPoints} pts</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* User's Current Rank (if not in top 30 and logged in) */}
      {user && !topUsers.find(u => u.uid === user.uid) && (
        <div className="pt-4">
          <div className="glass-card p-4 rounded-2xl flex items-center gap-4 border-purple-500/50 bg-purple-500/5">
            <div className="w-8 flex justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{user.displayName} (You)</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Keep studying to rank up!</p>
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold">{user.totalPoints} pts</span>
            </div>
          </div>
        </div>
      )}
      {/* Guest Call to Action */}
      {!user && (
        <div className="pt-4">
          <div className="glass-card p-6 rounded-3xl text-center space-y-4 border-purple-500/30 bg-purple-500/5">
            <h3 className="font-bold">Want to see your rank?</h3>
            <p className="text-sm text-gray-400">Sign in to track your study time and compete with students globally!</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full purple-gradient py-3 rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20"
            >
              Sign In Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
