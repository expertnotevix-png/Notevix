import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataBridge } from '../services/dataBridge';
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

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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

    const fetchPostData = async () => {
      try {
        setLoading(true);

        // Fetch Main Post
        const postData = await dataBridge.getPost(postId);
        if (postData) {
          setPost(postData);
        } else {
          navigate('/community');
          return;
        }

        // Fetch Replies
        const repliesData = await dataBridge.getReplies(postId);
        setReplies(repliesData);
      } catch (error: any) {
        console.error("Fetch post error:", error);
        setError("Something went wrong while loading the post.");
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
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

      const saved = await dataBridge.addReply(user.uid, postId!, newReply.trim());

      if (saved) {
        setReplies(prev => [...prev, {
          ...saved,
          userName: user.displayName,
          userPhoto: user.photoURL,
          userId: user.uid
        }]);
        setNewReply('');
        setPost((prev: any) => ({ ...prev, replyCount: (prev.replyCount || 0) + 1 }));
      }
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
      const success = await dataBridge.markBestReply(postId!, replyId);
      if (success) {
        setPost((prev: any) => ({ ...prev, isSolved: true, bestReplyId: replyId }));
        setReplies(prev => prev.map(r => ({
          ...r,
          isBest: r.id === replyId
        })));
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
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold">{reply.userName}</div>
                    {reply.userId === 'notevix-ai' && (
                      <span className="text-[8px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">
                        AI Assistant
                      </span>
                    )}
                  </div>
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

              <div className="text-gray-300 text-sm leading-relaxed mb-6">
                <div className="markdown-body">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {reply.content}
                  </ReactMarkdown>
                </div>
              </div>

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
