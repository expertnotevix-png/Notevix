import { motion } from 'motion/react';
import { ChevronLeft, Target, Users, BookOpen, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function AboutUs() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">About Us</h1>
      </div>

      <div className="text-center space-y-4 py-6">
        <Logo className="w-20 h-20 mx-auto" />
        <div>
          <h2 className="text-2xl font-bold purple-gradient bg-clip-text text-transparent inline-block">NoteVix</h2>
          <p className="text-gray-500 text-sm">Education for Toppers</p>
        </div>
      </div>

      <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Target className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Our Mission</h2>
          </div>
          <p>
            NoteVix was founded with a single mission: to provide CBSE Class 8, 9, and 10 students with the highest quality, most concise study materials. We believe that smart work is better than hard work, and our "One Page Notes" are designed to help students revise entire chapters in minutes.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Who We Are</h2>
          </div>
          <p>
            We are a team of educators and technology enthusiasts dedicated to making quality education accessible. Our resources are curated by subject matter experts and toppers to ensure accuracy and relevance to the latest CBSE curriculum.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="glass-card p-4 rounded-2xl text-center space-y-2">
            <BookOpen className="w-6 h-6 text-purple-400 mx-auto" />
            <h4 className="font-bold text-white">1000+</h4>
            <p className="text-[10px] uppercase tracking-wider">Resources</p>
          </div>
          <div className="glass-card p-4 rounded-2xl text-center space-y-2">
            <Award className="w-6 h-6 text-purple-400 mx-auto" />
            <h4 className="font-bold text-white">50k+</h4>
            <p className="text-[10px] uppercase tracking-wider">Happy Students</p>
          </div>
        </div>

        <section className="space-y-3 pt-4">
          <h2 className="font-bold text-white">Why Choose NoteVix?</h2>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              </div>
              <span>Concise One-Page Notes for quick revision.</span>
            </li>
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              </div>
              <span>Exam-oriented important questions.</span>
            </li>
            <li className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              </div>
              <span>Focus tools to boost productivity.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
