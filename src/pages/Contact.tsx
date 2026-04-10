import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Mail, Send, MessageCircle, MapPin, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

interface ContactProps {
  user: UserProfile;
}

export default function Contact({ user }: ContactProps) {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        subject,
        message,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Contact Us</h1>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <h2 className="font-bold text-lg">Get in Touch</h2>
          <p className="text-gray-400 text-sm">Have any questions or feedback? We'd love to hear from you.</p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Email</p>
                <p className="font-medium">expertnotevix@gmail.com</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Telegram</p>
                <p className="font-medium">@NoteVixSupport</p>
              </div>
            </div>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Subject</label>
              <input 
                required
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this about?"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Message</label>
              <textarea 
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full purple-gradient py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-purple-500/20 active:scale-95 transition-transform disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-10 rounded-3xl text-center space-y-4"
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold">Message Sent!</h3>
            <p className="text-gray-400 text-sm">Thank you for reaching out. We'll get back to you as soon as possible.</p>
            <button 
              onClick={() => setSubmitted(false)}
              className="text-purple-400 text-sm font-bold pt-2"
            >
              Send another message
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
