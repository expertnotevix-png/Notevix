import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, increment, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  Send, 
  MoreVertical,
  Trash2,
  Flag,
  AlertCircle,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserProfile } from '../types';
import { useModeration } from '../hooks/useModeration';
import { geminiService } from '../services/geminiService';

export default function PostDetail({ user }: { user: UserProfile | null }) {
  const { isBanned, banReason } = useModeration(user);
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    const postUnsub = onSnapshot(doc(db, 'posts', postId), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        navigate('/community');
      }
      setLoading(false);
    });

    const repliesQuery = query(
      collection(db, 'posts', postId, 'replies'),
      orderBy('isBest', 'desc'),
      orderBy('createdAt', 'asc')
    );

    const repliesUnsub = onSnapshot(repliesQuery, (snapshot) => {
      setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      postUnsub();
      repliesUnsub();
    };
  }, [postId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReply.trim() || replying) return;

    setReplying(true);
    setError(null);

    try {
      // AI Moderation
      const moderationResult = await geminiService.moderateContent(newReply);
      if (!moderationResult.approved) {
        setError(`Reply rejected: ${moderationResult.reason || 'Inappropriate content detected.'}`);
        setReplying(false);
        return;
      }

      const replyData = {
        postId,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        text: newReply.trim(),
        upvotes: [],
        downvotes: [],
        upvotesCount: 0,
        isBest: false,
        status: 'approved',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'posts', postId!, 'replies'), replyData);
      await updateDoc(doc(db, 'posts', postId!), {
        replyCount: increment(1)
      });
      await setDoc(doc(db, 'community_stats', 'global'), {
        totalAnswers: increment(1)
      }, { merge: true });

      // Add notification for post owner
      if (post.userId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: post.userId,
          title: 'New Reply',
          message: `${user.displayName} replied to your question: "${post.title}"`,
          type: 'reply',
          read: false,
          timestamp: new Date().toISOString()
        });
      }

      setNewReply('');
    } catch (err) {
      console.error("Reply error:", err);
      setError("Failed to post reply. Please try again.");
    } finally {
      setReplying(false);
    }
  };

  const handleMarkBest = async (replyId: string) => {
    if (!user || user.uid !== post.userId) return;

    try {
      const postRef = doc(db, 'posts', postId!);
      const replyRef = doc(db, 'posts', postId!, 'replies', replyId);

      // If there was a previous best reply, unmark it
      if (post.bestReplyId) {
        await updateDoc(doc(db, 'posts', postId!, 'replies', post.bestReplyId), {
          isBest: false
        });
      }

      await updateDoc(replyRef, { isBest: true });
      await updateDoc(postRef, {
        isSolved: true,
        bestReplyId: replyId
      });

      // Update stats
      await setDoc(doc(db, 'community_stats', 'global'), {
        solvedToday: increment(1)
      }, { merge: true });

      // Notify reply owner
      const reply = replies.find(r => r.id === replyId);
      if (reply && reply.userId !== user.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: reply.userId,
          title: 'Best Answer! 🏆',
          message: `Your reply was marked as the best answer for: "${post.title}"`,
          type: 'best_answer',
          read: false,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Mark best error:", err);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>;
  if (!post) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/community')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-lg font-bold truncate">Discussion</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Main Post */}
        <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src={post.userPhoto || `https://ui-avatars.com/api/?name=${post.userName}&background=random`} 
              alt={post.userName}
              className="w-10 h-10 rounded-full border border-white/10"
            />
            <div>
              <div className="font-bold">{post.userName}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={12} />
                {formatDistanceToNow(new Date(post.createdAt))} ago
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {post.subject}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 text-gray-400 border border-white/10">
                {post.class}
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 leading-tight">{post.title}</h2>
          <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-8">
            {post.description}
          </p>

          <div className="flex items-center gap-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-2 text-gray-400">
              <ChevronUp size={20} />
              <span className="font-bold">{post.upvotesCount || 0}</span>
              <ChevronDown size={20} />
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <MessageSquare size={20} />
              <span className="font-bold">{post.replyCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Reply Input */}
        {user ? (
          <div className="bg-[#121212] border border-white/10 rounded-3xl p-4 shadow-lg">
            {isBanned ? (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Account Banned</p>
                  <p className="opacity-80">{banReason}. You cannot reply to discussions.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReply} className="space-y-3">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 text-red-400 text-sm mb-2">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
                <textarea
                  placeholder="Write your answer..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={replying || !newReply.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                  >
                    {replying ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Post Answer
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">
            <p className="text-gray-400 mb-4">You must be logged in to reply.</p>
            <button onClick={() => navigate('/login')} className="bg-purple-600 text-white px-8 py-2 rounded-xl font-bold">
              Login to Reply
            </button>
          </div>
        )}

        {/* Replies List */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold px-2">Answers ({replies.length})</h3>
          {replies.map((reply) => (
            <motion.div
              layout
              key={reply.id}
              className={`bg-[#121212] border rounded-3xl p-5 shadow-md ${reply.isBest ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src={reply.userPhoto || `https://ui-avatars.com/api/?name=${reply.userName}&background=random`} 
                  alt={reply.userName}
                  className="w-8 h-8 rounded-full border border-white/10"
                />
                <div>
                  <div className="text-sm font-bold">{reply.userName}</div>
                  <div className="text-[10px] text-gray-500">
                    {formatDistanceToNow(new Date(reply.createdAt))} ago
                  </div>
                </div>
                {reply.isBest && (
                  <div className="ml-auto flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                    <CheckCircle2 size={12} />
                    Best Answer
                  </div>
                )}
              </div>

              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap mb-6">
                {reply.text}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-4 text-gray-500">
                  <div className="flex items-center gap-2">
                    <ChevronUp size={18} className="hover:text-purple-500 cursor-pointer" />
                    <span className="text-xs font-bold">{reply.upvotesCount || 0}</span>
                    <ChevronDown size={18} className="hover:text-red-500 cursor-pointer" />
                  </div>
                </div>

                {user?.uid === post.userId && !reply.isBest && (
                  <button
                    onClick={() => handleMarkBest(reply.id)}
                    className="text-[10px] font-bold text-green-500 uppercase tracking-widest hover:bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 transition-all"
                  >
                    Mark as Best
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
