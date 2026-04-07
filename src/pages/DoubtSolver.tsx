import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, ChevronLeft, Trash2 } from 'lucide-react';
import { UserProfile, Doubt } from '../types';
import { collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';

interface DoubtSolverProps {
  user: UserProfile;
}

export default function DoubtSolver({ user }: DoubtSolverProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          systemInstruction: "You are NoteVix AI, a helpful tutor for CBSE students (Class 6-10). Provide clear, concise, and exam-focused answers. Use simple language and examples where possible. If the question is not related to studies, politely redirect the student to focus on their exams."
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const botResponse = data.text || "I'm sorry, I couldn't process that. Please try again.";
      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);

      // Save to Firestore
      await addDoc(collection(db, 'doubts'), {
        userId: user.uid,
        query: userMessage,
        response: botResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Oops! Something went wrong. Check your connection." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-black">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center gap-4 bg-black/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="w-10 h-10 purple-gradient rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg">Ask Doubt</h1>
          <p className="text-xs text-purple-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> NoteVix AI Assistant
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-6">
            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto">
              <Bot className="w-10 h-10 text-purple-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-xl">How can I help you today?</h3>
              <p className="text-gray-500 text-sm max-w-[200px] mx-auto">
                Ask me any question from Maths, Science, SST or English.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 max-w-xs mx-auto">
              {[
                "Explain Newton's Second Law",
                "How to solve quadratic equations?",
                "Summary of French Revolution",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="glass-card p-3 rounded-xl text-sm text-gray-400 hover:text-white hover:border-purple-500/50 transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-purple-600' : 'bg-white/10'
              }`}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-purple-600 text-white rounded-tr-none' 
                  : 'glass-card text-gray-200 rounded-tl-none'
              }`}>
                <div className="markdown-body prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="glass-card p-4 rounded-2xl rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-black/50 backdrop-blur-lg border-t border-white/10">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your doubt here..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-12 h-12 purple-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
