import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Loader2, CheckCircle2, XCircle, Trophy, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { geminiService } from '../services/geminiService';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export default function QuizGenerator() {
  const [step, setStep] = useState<'setup' | 'quiz' | 'result'>('setup');
  const [selectedClass, setSelectedClass] = useState('10');
  const [selectedSubject, setSelectedSubject] = useState('Science');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const navigate = useNavigate();

  const startQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await geminiService.generateQuiz(selectedSubject, selectedClass);
      setQuestions(data);
      setStep('quiz');
      setCurrentQuestionIndex(0);
      setScore(0);
      setSelectedOption(null);
      setShowExplanation(false);
    } catch (err) {
      console.error(err);
      setError('Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return;
    setSelectedOption(option);
    if (option === questions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setStep('result');
    }
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
            <h1 className="text-lg font-bold">Auto Quiz Generator</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">AI Powered MCQs</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {step === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Ready for a challenge?</h2>
                <p className="text-gray-400">Select your class and subject to generate a custom quiz.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Class</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['8', '9', '10'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedClass(c)}
                        className={`py-4 rounded-2xl font-bold transition-all ${
                          selectedClass === c 
                            ? 'purple-gradient text-white shadow-lg shadow-purple-500/20' 
                            : 'bg-white/5 border border-white/10 text-gray-400'
                        }`}
                      >
                        Class {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Select Subject</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Science', 'Maths', 'SST', 'English'].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSubject(s)}
                        className={`py-4 rounded-2xl font-bold transition-all ${
                          selectedSubject === s 
                            ? 'purple-gradient text-white shadow-lg shadow-purple-500/20' 
                            : 'bg-white/5 border border-white/10 text-gray-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  onClick={startQuiz}
                  disabled={loading}
                  className="w-full py-5 purple-gradient rounded-2xl font-black text-lg shadow-xl shadow-purple-500/30 flex items-center justify-center gap-3 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    'Generate Quiz'
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'quiz' && questions.length > 0 && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500" 
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <h3 className="text-xl font-bold leading-relaxed">
                {questions[currentQuestionIndex].question}
              </h3>

              <div className="space-y-3">
                {questions[currentQuestionIndex].options.map((option, i) => {
                  const isCorrect = option === questions[currentQuestionIndex].correctAnswer;
                  const isSelected = option === selectedOption;
                  
                  let stateStyle = 'bg-white/5 border-white/10 text-gray-300';
                  if (selectedOption) {
                    if (isCorrect) stateStyle = 'bg-green-500/20 border-green-500 text-green-400';
                    else if (isSelected) stateStyle = 'bg-red-500/20 border-red-500 text-red-400';
                    else stateStyle = 'bg-white/5 border-white/10 opacity-50';
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleOptionSelect(option)}
                      disabled={!!selectedOption}
                      className={`w-full p-5 rounded-2xl border text-left font-medium transition-all flex items-center justify-between ${stateStyle}`}
                    >
                      <span>{option}</span>
                      {selectedOption && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {selectedOption && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                    </button>
                  );
                })}
              </div>

              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-2"
                >
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-widest">Explanation</p>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {questions[currentQuestionIndex].explanation}
                  </p>
                </motion.div>
              )}

              {selectedOption && (
                <button
                  onClick={nextQuestion}
                  className="w-full py-4 bg-white text-black rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  {currentQuestionIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </button>
              )}
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-12"
            >
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
                <Trophy className="w-24 h-24 text-yellow-500 relative mx-auto" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black">Quiz Completed!</h2>
                <p className="text-gray-400">Great job on finishing the {selectedSubject} quiz.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-6 rounded-3xl">
                  <div className="text-3xl font-black text-purple-500">{score}/{questions.length}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Score</div>
                </div>
                <div className="glass-card p-6 rounded-3xl">
                  <div className="text-3xl font-black text-purple-500">{Math.round((score / questions.length) * 100)}%</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Accuracy</div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setStep('setup')}
                  className="w-full py-4 purple-gradient rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Try Another Quiz
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-bold"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
