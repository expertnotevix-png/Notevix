import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion } from 'motion/react';
import { Trash2, Shield, ShieldAlert, ShieldCheck, UserX, UserCheck, MessageSquare, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ModerationTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("Delete this post?")) {
      await deleteDoc(doc(db, 'posts', postId));
    }
  };

  const handleBanUser = async (userId: string, duration: '24h' | 'permanent') => {
    if (window.confirm(`Ban user for ${duration}?`)) {
      const modRef = doc(db, 'user_moderation', userId);
      const modSnap = await getDoc(modRef);
      
      const banUntil = duration === '24h' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

      if (modSnap.exists()) {
        await updateDoc(modRef, {
          banUntil,
          isPermanentlyBanned: duration === 'permanent',
          strikes: (modSnap.data().strikes || 0) + 1
        });
      } else {
        await setDoc(modRef, {
          userId,
          strikes: 1,
          banUntil,
          isPermanentlyBanned: duration === 'permanent'
        });
      }

      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'Account Warning/Ban',
        message: `Your account has been ${duration === 'permanent' ? 'permanently banned' : 'banned for 24 hours'} due to community guideline violations.`,
        type: 'warning',
        read: false,
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Community Moderation</h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <Shield size={12} />
          Admin Mode Active
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img src={post.userPhoto} className="w-8 h-8 rounded-full" alt="" />
                  <div>
                    <h4 className="text-sm font-bold">{post.userName}</h4>
                    <p className="text-[10px] text-gray-500">{formatDistanceToNow(new Date(post.createdAt))} ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleBanUser(post.userId, '24h')}
                    className="p-2 hover:bg-yellow-500/10 text-yellow-500 rounded-lg transition-colors"
                    title="24h Ban"
                  >
                    <ShieldAlert size={18} />
                  </button>
                  <button 
                    onClick={() => handleBanUser(post.userId, 'permanent')}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                    title="Permanent Ban"
                  >
                    <UserX size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {post.subject}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-gray-500 border border-white/10">
                    {post.class}
                  </span>
                </div>
                <h5 className="font-bold text-sm">{post.title}</h5>
                <p className="text-xs text-gray-400 line-clamp-2">{post.description}</p>
              </div>

              <div className="pt-2 flex items-center gap-4 text-[10px] text-gray-500 border-t border-white/5">
                <div className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  {post.replyCount || 0} Replies
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Status: {post.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">No posts to moderate.</div>
      )}
    </div>
  );
}
