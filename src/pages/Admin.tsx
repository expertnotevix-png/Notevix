import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter } from '../types';
import { Plus, Trash2, Edit2, Save, X, ChevronLeft, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Admin() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Partial<Chapter>>({
    class: '10',
    subject: 'maths',
    title: '',
    summary: '',
    keyPoints: [],
    formulas: [],
    importantQuestions: [],
    isPremium: false,
  });

  useEffect(() => {
    fetchChapters();
  }, []);

  const fetchChapters = async () => {
    const querySnapshot = await getDocs(collection(db, 'chapters'));
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
    setChapters(data);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'chapters'), formData);
      setIsAdding(false);
      setFormData({
        class: '10',
        subject: 'maths',
        title: '',
        summary: '',
        keyPoints: [],
        formulas: [],
        importantQuestions: [],
        isPremium: false,
      });
      fetchChapters();
    } catch (error) {
      console.error("Error adding chapter:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this chapter?")) {
      await deleteDoc(doc(db, 'chapters', id));
      fetchChapters();
    }
  };

  const addSampleData = async () => {
    const samples = [
      {
        class: '10',
        subject: 'maths',
        title: 'Polynomials',
        summary: 'A polynomial is an expression consisting of variables and coefficients, involving only the operations of addition, subtraction, multiplication, and non-negative integer exponents.',
        keyPoints: [
          'Degree of a polynomial is the highest power of x.',
          'Linear polynomial has degree 1.',
          'Quadratic polynomial has degree 2.',
          'Relationship between zeros and coefficients: Sum = -b/a, Product = c/a.',
        ],
        formulas: [
          'p(x) = ax² + bx + c',
          'α + β = -b/a',
          'αβ = c/a',
        ],
        importantQuestions: [
          { question: 'Find the zeros of x² - 2x - 8.', answer: 'The zeros are 4 and -2.' },
          { question: 'What is the degree of a constant polynomial?', answer: 'The degree of a non-zero constant polynomial is 0.' },
        ],
        isPremium: false,
      },
      {
        class: '10',
        subject: 'science',
        title: 'Chemical Reactions',
        summary: 'A chemical reaction is a process in which one or more substances, the reactants, are converted to one or more different substances, the products.',
        keyPoints: [
          'Combination Reaction: Two or more reactants form a single product.',
          'Decomposition Reaction: A single reactant breaks down into two or more products.',
          'Displacement Reaction: A more reactive element displaces a less reactive element.',
          'Redox Reaction: Both oxidation and reduction occur simultaneously.',
        ],
        formulas: [
          '2H₂ + O₂ → 2H₂O',
          'CaCO₃ → CaO + CO₂',
        ],
        importantQuestions: [
          { question: 'Why should a magnesium ribbon be cleaned before burning in air?', answer: 'To remove the protective layer of basic magnesium carbonate from its surface.' },
          { question: 'What is a balanced chemical equation?', answer: 'An equation where the number of atoms of each element is the same on both sides.' },
        ],
        isPremium: true,
      }
    ];

    for (const sample of samples) {
      await addDoc(collection(db, 'chapters'), sample);
    }
    fetchChapters();
    alert("Sample data added!");
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="purple-gradient p-3 rounded-xl shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={addSampleData}
          className="flex-1 glass-card p-4 rounded-2xl flex items-center justify-center gap-2 text-purple-400 font-bold"
        >
          <Database className="w-5 h-5" />
          Add Sample Data
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-lg p-6 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Add New Chapter</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase">Class</label>
                  <select
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
                  >
                    {['6', '7', '8', '9', '10'].map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 uppercase">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
                  >
                    {['maths', 'science', 'sst', 'english'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase">Summary</label>
                <textarea
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm h-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="premium"
                  checked={formData.isPremium}
                  onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                  className="w-4 h-4 accent-purple-500"
                />
                <label htmlFor="premium" className="text-sm">Premium Content</label>
              </div>

              <button type="submit" className="w-full purple-gradient py-3 rounded-xl font-bold">
                Save Chapter
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">Manage Content</h3>
        {loading ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          chapters.map((chapter) => (
            <div key={chapter.id} className="glass-card p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">{chapter.title}</h4>
                <p className="text-[10px] text-gray-500 uppercase">{chapter.subject} • Class {chapter.class}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/5 rounded-lg text-blue-400">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(chapter.id)} className="p-2 hover:bg-white/5 rounded-lg text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
