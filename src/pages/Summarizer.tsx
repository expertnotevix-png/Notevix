import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Loader2, FileText, Sparkles, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { geminiService } from '../services/geminiService';

export default function Summarizer() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleSummarize = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const result = await geminiService.summarizeChapter(text);
      setSummary(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to summarize text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center gap-4 bg-black/50 backdrop-blur-lg sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold">Chapter Summarizer</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Powered Summaries</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Quick Revision?</h2>
          <p className="text-gray-400">Paste your chapter text below and get a 5-point Hinglish summary instantly.</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste chapter text here (e.g., from NCERT)..."
              className="w-full h-64 bg-white/5 border border-white/10 rounded-3xl p-6 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
            />
            <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              {text.length} characters
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleSummarize}
            disabled={loading || !text.trim()}
            className="w-full py-5 purple-gradient rounded-2xl font-black text-lg shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Summarizing...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Summarize Now
              </>
            )}
          </button>
        </div>

        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-purple-400">
                  <FileText className="w-5 h-5" />
                  <h3 className="font-bold uppercase text-xs tracking-widest">AI Summary</h3>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Summary'}
                </button>
              </div>

              <div className="glass-card p-8 rounded-3xl border-purple-500/20 bg-purple-500/5">
                <div className="prose prose-invert max-w-none">
                  <div className="text-gray-200 leading-loose whitespace-pre-wrap">
                    {summary}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
