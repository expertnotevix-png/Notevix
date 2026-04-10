import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Plus, Trash2, CheckCircle2, Circle, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, ScheduleTask } from '../types';

interface ScheduleProps {
  user: UserProfile;
}

export default function Schedule({ user }: ScheduleProps) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('');
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const q = query(
      collection(db, 'schedule'),
      where('userId', '==', user.uid),
      where('date', '==', today)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleTask));
      setTasks(taskList.sort((a, b) => a.time.localeCompare(b.time)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'schedule');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid, today]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      await addDoc(collection(db, 'schedule'), {
        userId: user.uid,
        task: newTask,
        time: newTime || 'No time',
        completed: false,
        date: today,
        timestamp: serverTimestamp()
      });
      setNewTask('');
      setNewTime('');
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'schedule', taskId), {
        completed: !currentStatus
      });
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'schedule', taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Daily Planner</h1>
          <p className="text-xs text-gray-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="glass-card p-4 rounded-3xl space-y-3">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="What's your goal for today?"
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          <button 
            type="submit"
            className="px-6 purple-gradient rounded-2xl shadow-lg shadow-purple-500/20 active:scale-95 transition-transform"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : tasks.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`glass-card p-4 rounded-2xl flex items-center gap-4 transition-all ${task.completed ? 'opacity-50' : ''}`}
              >
                <button 
                  onClick={() => toggleTask(task.id, task.completed)}
                  className="text-purple-500 active:scale-90 transition-transform"
                >
                  {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                <div className="flex-1">
                  <h4 className={`font-bold text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>{task.task}</h4>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.time}
                  </p>
                </div>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="p-2 hover:bg-red-500/10 rounded-xl text-gray-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">No tasks scheduled for today.</p>
          </div>
        )}
      </div>
    </div>
  );
}
