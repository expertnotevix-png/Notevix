import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Search, Clock, Calendar, ChevronRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const articles = [
  {
    id: 'how-to-study-class-10-science',
    title: 'How to Master Class 10 Science: Study Tips from Toppers',
    excerpt: 'Class 10 Science can be daunting with its vast syllabus. Learn how to divide your time between Physics, Chemistry, and Biology to score 95+.',
    date: 'April 15, 2026',
    readTime: '6 min',
    category: 'Study Tips',
    image: 'https://picsum.photos/seed/science/800/600',
    content: `Class 10 Science is one of the most critical subjects for students aiming for a career in Engineering or Medicine. The subject is divided into three distinct sections: Physics, Chemistry, and Biology, each requiring a different study approach.

### 1. Physics: Concept Clarity is Key
Focus on understanding the derivations and numericals. Don't just memorize formulas; understand how they are derived. Topics like Electricity and Light are high-weightage and require consistent practice of ray diagrams and circuit problems.

### 2. Chemistry: Reactions and Valency
Chemistry is all about equations. Make a chart of all chemical reactions and their conditions. Master the Periodic Table and chemical bonding early on. Carbon and its Compounds is a chapter that often carries significant weightage in board exams.

### 3. Biology: Diagrams and Terminology
Biology requires excellent memorization of terms and processes. Practice neat and labeled diagrams for topics like the Human Alimentary Canal, Heart, and Brain. These diagrams can fetch full marks even if the theory is slightly brief.

### One-Page Notes: The Secret Weapon
Using our one-page notes can help you revise these massive chapters quickly. Instead of flipping through 50 pages of the NCERT textbook, a single sheet can give you all the definitions, formulas, and diagrams you need for last-minute revision.`
  },
  {
    id: 'managing-board-exam-stress',
    title: '5 Effective Ways to Manage Board Exam Stress',
    excerpt: 'Exam stress is common but manageable. Discover the techniques used by experts to stay calm and focused during the high-pressure board season.',
    date: 'April 12, 2026',
    readTime: '4 min',
    category: 'Student Life',
    image: 'https://picsum.photos/seed/stress/800/600',
    content: `Board exams are often treated as the most significant event in a student's life, leading to immense pressure. However, with the right mindset and techniques, you can overcome this anxiety.

1. **Plan Your Schedule**: Unpredictability leads to stress. A well-structured timetable gives you a sense of control over your preparation.
2. **Take Regular Breaks**: Use the Pomodoro technique—25 minutes of study followed by a 5-minute break. This prevents cognitive fatigue.
3. **Stay Active**: Physical exercise releases endorphins, which help in reducing stress. A 20-minute walk can clear your mind.
4. **Sleep is Non-Negotiable**: Many students sacrifice sleep for study, but a tired brain cannot retain information. Aim for 7-8 hours of sleep.
5. **Focus on the Process, Not the Result**: Stop worrying about the marks. Focus on completing the daily goals you have set for yourself.`
  },
  {
    id: 'ncert-vs-reference-books',
    title: 'NCERT vs Reference Books: What Should You Follow?',
    excerpt: 'The eternal dilemma for CBSE students. We break down when to stick to NCERT and when it is time to pick up a reference book.',
    date: 'April 10, 2026',
    readTime: '5 min',
    category: 'Resources',
    image: 'https://picsum.photos/seed/books/800/600',
    content: `For CBSE exams, **NCERT is the Bible**. The board exam question papers are strictly based on the NCERT syllabus. However, in some cases, you might need extra support.

**When to use NCERT:**
- To understand the core concepts.
- For solving textbook exercises (most board questions are similar to these).
- For understanding the definitions asked in the exam.

**When to use Reference Books:**
- When you need extra practice for numericals in Maths or Physics.
- To see a variety of complex questions that might appear in the "Competency Based" section.
- For more detailed explanations of abstract concepts.

**The NoteVix Approach:**
We combine the strengths of both. Our notes are based on NCERT but include the most important extra questions from popular reference books like RD Sharma and RS Aggarwal, giving you the best of both worlds.`
  }
];

export default function Articles() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Study Insights</h1>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      <div className="space-y-6">
        {filteredArticles.map((article, i) => (
          <motion.div
            key={article.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(`/article/${article.id}`)}
            className="glass-card overflow-hidden rounded-3xl group cursor-pointer border-white/5 hover:border-purple-500/30 transition-all"
          >
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={article.image} 
                alt={article.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4 px-3 py-1 bg-purple-500 rounded-full text-[10px] font-bold uppercase tracking-widest leading-none">
                {article.category}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {article.date}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {article.readTime}
                </div>
              </div>
              <h2 className="text-xl font-bold group-hover:text-purple-400 transition-colors">{article.title}</h2>
              <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                {article.excerpt}
              </p>
              <div className="flex items-center gap-2 text-purple-400 text-sm font-bold">
                Read Article
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>No articles found for your search.</p>
        </div>
      )}
    </div>
  );
}
