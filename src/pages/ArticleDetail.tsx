import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Share2, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { articles } from './Articles';
import { AdBanner } from '../components/AdBanner';

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const article = articles.find(a => a.id === id);

  if (!article) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold">Article not found</h2>
        <button onClick={() => navigate('/articles')} className="mt-4 text-purple-400 font-bold">Back to Articles</button>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.excerpt,
        url: window.location.href
      });
    }
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      <div className="relative h-72 md:h-96">
        <img 
          src={article.image} 
          alt={article.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 glass-card rounded-2xl active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={handleShare}
            className="p-3 glass-card rounded-2xl active:scale-95 transition-transform"
          >
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute bottom-10 left-6 right-6 space-y-4">
          <div className="px-3 py-1 bg-purple-500 rounded-full text-[10px] font-bold uppercase tracking-widest inline-block leading-none">
            {article.category}
          </div>
          <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">{article.title}</h1>
          <div className="flex items-center gap-6 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {article.date}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {article.readTime} read
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 max-w-3xl mx-auto py-12">
        <div className="prose prose-invert max-w-none prose-p:text-gray-400 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-black prose-a:text-purple-400">
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10">
          <AdBanner slot="article_footer" />
        </div>

        <div className="mt-12 p-8 glass-card rounded-[40px] border-purple-500/30 bg-purple-500/5 space-y-6">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-purple-500" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Ready to excel in your studies?</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Join NoteVix today and get access to premium one-page notes and resources for Class 8, 9, and 10 CBSE exams.
            </p>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="w-full purple-gradient py-4 rounded-2xl font-black text-sm shadow-xl shadow-purple-500/20 active:scale-95 transition-transform"
          >
            Join 10,000+ Students
          </button>
        </div>
      </div>
    </div>
  );
}
