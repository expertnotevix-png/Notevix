import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Loader2, FileText, Sparkles, Copy, Check, Upload, FileUp, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { geminiService } from '../services/geminiService';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function Summarizer() {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<'text' | 'pdf' | 'link'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const extractTextFromPdf = async (file: File) => {
    setParsingPdf(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      const numPages = pdf.numPages;
      setPageCount(numPages);

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (pageText) {
            fullText += pageText + '\n\n';
          }
        } catch (pageErr) {
          console.warn(`Error on page ${i}:`, pageErr);
          continue;
        }
      }

      if (!fullText.trim()) {
        throw new Error("No readable text found in this PDF. It might be scanned or image-only.");
      }

      setText(fullText);
      setMode('text'); // Switch to text mode to show the content
    } catch (err) {
      console.error("PDF Parsing Error:", err);
      setError("Failed to read PDF. Make sure it's not password protected.");
    } finally {
      setParsingPdf(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      extractTextFromPdf(file);
    } else {
      setError("Please upload a valid PDF file.");
    }
  };

  const handleSummarize = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      let result;
      if (pageCount > 5) {
        result = await geminiService.summarizeLongText(text, pageCount);
      } else {
        result = await geminiService.summarizeChapter(text);
      }
      setSummary(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to summarize. Please try again.');
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
    <div className="min-h-screen bg-black text-white pb-24 font-sans">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center gap-4 bg-black/50 backdrop-blur-lg sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold">Deep AI Summarizer</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Supports PDFs up to 100 pages</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Smart AI Summary</h2>
          <p className="text-gray-400 text-sm">Upload a PDF or paste text to get a detailed structured summary.</p>
        </div>

        {/* Mode Toggles */}
        <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'text' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            Paste Text
          </button>
          <button
            onClick={() => {
              setMode('pdf');
              fileInputRef.current?.click();
            }}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'pdf' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            Upload PDF
          </button>
          <button
            onClick={() => setMode('link')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${mode === 'link' ? 'bg-purple-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            Drive Link
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf"
          className="hidden"
        />

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'text' || parsingPdf ? (
              <motion.div
                key="text"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative"
              >
                {parsingPdf && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl">
                    <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                    <p className="font-bold uppercase tracking-widest text-[10px]">Processing PDF ({pageCount} pages)...</p>
                  </div>
                )}
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setPageCount(0); // Reset page count if manual edit
                  }}
                  placeholder="Paste your chapter content here or select Upload PDF..."
                  className="w-full h-80 bg-white/5 border border-white/10 rounded-3xl p-6 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
                />
                <div className="absolute bottom-4 right-4 flex gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  {pageCount > 0 && <span>{pageCount} Pages</span>}
                  <span>{text.length} characters</span>
                </div>
              </motion.div>
            ) : mode === 'link' ? (
              <motion.div
                key="link"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-10 rounded-3xl text-center space-y-6"
              >
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto">
                  <LinkIcon className="w-8 h-8 text-purple-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold">Google Drive Support</h3>
                  <p className="text-gray-500 text-xs px-10">
                    To summarize a Drive file: Open the PDF, click Share, and ensure "Anyone with link" is enabled.
                  </p>
                </div>
                <input
                  type="url"
                  placeholder="Paste shared Drive URL here..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
                <p className="text-[10px] text-gray-600 font-bold uppercase italic">
                  Note: Drive links may require Google Cloud configuration to read directly.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-20 rounded-3xl border-dashed border-2 border-white/10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <FileUp className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="font-bold text-lg">Click to Upload PDF</h3>
                <p className="text-gray-500 text-sm mt-2 max-w-xs">Supported: NCERT Books, Question Papers, Sample Notes (Max 50MB)</p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleSummarize}
            disabled={loading || !text.trim() || parsingPdf}
            className="w-full py-5 purple-gradient rounded-2xl font-black text-lg shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Processing AI Summary...
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                Generate {pageCount >= 40 ? 'Long' : 'Standard'} Summary
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
                  <h3 className="font-bold uppercase text-xs tracking-widest">
                    AI Analysis {pageCount > 0 ? `(${pageCount} Pages)` : ''}
                  </h3>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="glass-card p-8 rounded-3xl border-purple-500/20 bg-purple-500/5 shadow-2xl">
                <div className="prose prose-invert max-w-none">
                  <div className="text-gray-200 leading-loose">
                    <div className="markdown-body">
                      <ReactMarkdown 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                      >
                        {summary}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Study Tip</p>
                <p className="text-xs text-gray-400">This summary was generated to cover the most important concepts for CBSE exams. Check the "Important Questions" section in NoteVix for more practice.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
