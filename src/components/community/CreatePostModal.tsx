import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, AlertCircle, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { geminiService } from '../../services/geminiService';
import { UserProfile } from '../../types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

export default function CreatePostModal({ isOpen, onClose, user }: CreatePostModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('Science');
  const [className, setClassName] = useState('Class 10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // AI Moderation
      const moderationResult = await geminiService.moderateContent(`${title} ${description}`);
      
      if (!moderationResult.approved) {
        setError(`Post rejected: ${moderationResult.reason || 'Inappropriate content detected.'}`);
        setLoading(false);
        return;
      }

      // Create Post
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        title: title.trim(),
        description: description.trim(),
        subject,
        class: className,
        upvotes: [],
        downvotes: [],
        upvotesCount: 0,
        replyCount: 0,
        isSolved: false,
        status: 'approved',
        createdAt: new Date().toISOString()
      });

      // Update Stats
      await updateDoc(doc(db, 'community_stats', 'global'), {
        totalQuestions: increment(1)
      });

      onClose();
    } catch (err: any) {
      console.error("Create post error:", err);
      setError("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-transparent">
          <h2 className="text-xl font-bold">Ask a Question</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-3 text-red-400 text-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="Science">Science</option>
                <option value="Maths">Maths</option>
                <option value="SST">SST</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Class</label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Question Title</label>
            <input
              type="text"
              placeholder="e.g. How to solve quadratic equations?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Description</label>
            <textarea
              placeholder="Explain your doubt in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !description.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Scanning Content...
              </>
            ) : (
              <>
                <Send size={20} />
                Post Question
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
