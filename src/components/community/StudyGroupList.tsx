import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, MessageSquare, Trash2, ArrowRight, ShieldCheck, Hash } from 'lucide-react';
import { UserProfile } from '../../types';
import { toast } from 'sonner';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  memberCount: number;
  class: string;
  subject: string;
  isPublic: boolean;
  createdAt: any;
}

export default function StudyGroupList({ user, onSelectGroup }: { user: UserProfile | null, onSelectGroup: (group: StudyGroup) => void }) {
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('General');

  useEffect(() => {
    const q = query(collection(db, 'study_groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const g = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StudyGroup[];
      setGroups(g);
      setLoading(false);
    }, (error) => {
      console.error("Groups listener error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    try {
      const groupData = {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        creatorId: user.uid,
        creatorName: user.displayName,
        memberCount: 1,
        class: user.class || 'All',
        subject: newGroupSubject,
        isPublic: true,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'study_groups'), groupData);
      setNewGroupName('');
      setNewGroupDesc('');
      setIsCreating(false);
      toast.success("Study group created successfully!");
      onSelectGroup({ id: docRef.id, ...groupData } as any);
    } catch (err) {
      console.error("Failed to create group:", err);
      toast.error("Failed to create group. Check permissions.");
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, id: string, creatorId: string) => {
    e.stopPropagation();
    if (!user || (user.uid !== creatorId && user.role !== 'admin')) return;
    
    if (window.confirm("Delete this group and all its messages?")) {
      try {
        await deleteDoc(doc(db, 'study_groups', id));
        toast.success("Group deleted.");
      } catch (err) {
        toast.error("Failed to delete.");
      }
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <Users className="w-10 h-10 text-gray-700 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Study Circles...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-black italic tracking-tight">Active Circles</h2>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-all active:scale-95 flex items-center gap-2 text-xs font-bold"
        >
          <Plus size={16} />
          Create New
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.form 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleCreateGroup}
            className="glass-card p-6 rounded-3xl border-purple-500/30 bg-purple-500/5 space-y-4 shadow-xl"
          >
            <div className="space-y-4">
              <input 
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group Name (e.g. Science Squad)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                required
              />
              <textarea 
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                placeholder="What is this group for? (Optional)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select 
                  value={newGroupSubject}
                  onChange={(e) => setNewGroupSubject(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase"
                >
                  <option value="General">General</option>
                  <option value="Maths">Maths</option>
                  <option value="Science">Science</option>
                  <option value="SST">SST</option>
                </select>
                <button 
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-2 bg-white/5 rounded-xl text-[10px] font-bold uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-purple-600 rounded-xl text-[10px] font-bold uppercase"
                >
                  Confirm
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {groups.map((group) => (
          <motion.div
            key={group.id}
            onClick={() => onSelectGroup(group)}
            className="glass-card p-6 rounded-3xl border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98]"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                    <Hash className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg group-hover:text-purple-400 transition-colors uppercase tracking-tight italic">
                      {group.name}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users size={12} className="text-purple-500" />
                        {group.memberCount || 1}
                      </span>
                      <span>•</span>
                      <span>{group.subject}</span>
                    </div>
                  </div>
                </div>
                {group.description && (
                  <p className="text-xs text-gray-400 line-clamp-2 pl-12">
                    {group.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {(user?.uid === group.creatorId || user?.role === 'admin') && (
                  <button 
                    onClick={(e) => handleDeleteGroup(e, group.id, group.creatorId)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="p-2 bg-purple-500/5 rounded-lg group-hover:bg-purple-500/20 transition-all">
                  <ArrowRight size={16} className="text-purple-400" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {groups.length === 0 && !isCreating && (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-20">
            <Users size={32} />
          </div>
          <p className="text-gray-500 text-sm font-medium">No public study circles yet.<br/>Be the first to create one!</p>
        </div>
      )}
    </div>
  );
}
