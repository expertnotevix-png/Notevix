import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronUp, 
  ChevronDown, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Share2,
  MoreVertical,
  Flag,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: any;
  currentUser: UserProfile | null;
}

export default function PostCard({ post, currentUser }: PostCardProps) {
  const navigate = useNavigate();
  const [isVoting, setIsVoting] = useState(false);

  const hasUpvoted = currentUser && post.upvotes?.includes(currentUser.uid);
  const hasDownvoted = currentUser && post.downvotes?.includes(currentUser.uid);

  const handleVote = async (type: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || isVoting) return;

    setIsVoting(true);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (type === 'up') {
        if (hasUpvoted) {
          await updateDoc(postRef, {
            upvotes: arrayRemove(currentUser.uid),
            upvotesCount: increment(-1)
          });
        } else {
          await updateDoc(postRef, {
            upvotes: arrayUnion(currentUser.uid),
            downvotes: arrayRemove(currentUser.uid),
            upvotesCount: increment(hasDownvoted ? 2 : 1)
          });
        }
      } else {
        if (hasDownvoted) {
          await updateDoc(postRef, {
            downvotes: arrayRemove(currentUser.uid),
            upvotesCount: increment(1)
          });
        } else {
          await updateDoc(postRef, {
            downvotes: arrayUnion(currentUser.uid),
            upvotes: arrayRemove(currentUser.uid),
            upvotesCount: increment(hasUpvoted ? -2 : -1)
          });
        }
      }
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const subjectColors: any = {
    Science: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Maths: 'bg-green-500/10 text-green-400 border-green-500/20',
    SST: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    English: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    Hindi: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Other: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/community/post/${post.id}`)}
      className="bg-[#121212] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all cursor-pointer group active:scale-[0.99]"
    >
      <div className="flex gap-4">
        {/* Vote Sidebar */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={(e) => handleVote('up', e)}
            className={`p-1.5 rounded-lg transition-colors ${hasUpvoted ? 'bg-purple-500/20 text-purple-500' : 'hover:bg-white/5 text-gray-500'}`}
          >
            <ChevronUp size={24} />
          </button>
          <span className={`text-sm font-bold ${hasUpvoted ? 'text-purple-500' : hasDownvoted ? 'text-red-500' : 'text-gray-400'}`}>
            {post.upvotesCount || 0}
          </span>
          <button
            onClick={(e) => handleVote('down', e)}
            className={`p-1.5 rounded-lg transition-colors ${hasDownvoted ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/5 text-gray-500'}`}
          >
            <ChevronDown size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <img 
                src={post.userPhoto || `https://ui-avatars.com/api/?name=${post.userName}&background=random`} 
                alt={post.userName}
                className="w-6 h-6 rounded-full border border-white/10"
              />
              <span className="text-xs font-medium text-gray-300">{post.userName}</span>
              <span className="text-[10px] text-gray-500">•</span>
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <Clock size={10} />
                {formatDistanceToNow(new Date(post.createdAt))} ago
              </span>
            </div>
            {post.isSolved && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                <CheckCircle2 size={10} />
                Solved
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
            {post.title}
          </h3>
          
          <p className="text-gray-400 text-sm line-clamp-3 mb-4">
            {post.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${subjectColors[post.subject] || subjectColors.Other}`}>
                {post.subject}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-white/5 text-gray-400 border border-white/10">
                {post.class}
              </span>
            </div>

            <div className="flex items-center gap-4 text-gray-500">
              <div className="flex items-center gap-1.5 text-xs">
                <MessageSquare size={14} />
                {post.replyCount || 0}
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Share logic
                }}
                className="hover:text-white transition-colors"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
