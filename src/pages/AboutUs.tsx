import { motion } from 'motion/react';
import { ChevronLeft, Target, Users, BookOpen, Award, Shield } from 'lucide-react';
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
            NoteVix was founded with a single mission: to revolutionize how CBSE Class 8, 9, and 10 students approach their studies. We believe that the current traditional education system often prioritizes quantity over quality, leading to burnout and stress. Our goal is to provide students with the highest quality, most concise study materials that emphasize understanding and retention over rote memorization.
          </p>
          <p>
            Our core philosophy is "Smart Revision." We understand that as exams approach, a student's most valuable resource is time. That's why our "One Page Notes" are meticulously designed to help students master entire chapters in under 15 minutes. We don't just summarize; we synthesize information into a format that the human brain can process and recall with ease during high-pressure exam situations.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Award className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Our Pedagogy: The 3-Step Success Cycle</h2>
          </div>
          <p>
            At the heart of NoteVix is a research-backed educational framework designed specifically for the Indian CBSE curriculum. Our methodology consists of three distinct phases:
          </p>
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="font-bold text-purple-400 mb-1">1. Cognitive Synthesis</h4>
              <p className="text-xs">We strip away the academic jargon found in bulky textbooks and present the core "AHA!" moments of each chapter. This reduced cognitive load allows the brain to focus on the truly important concepts that examiners love to test.</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="font-bold text-purple-400 mb-1">2. Visual Mapping</h4>
              <p className="text-xs">Our notes are not just text. They are blueprints. We use strategic typography, color-coding, and spatial organization to mirror how memory works. When you see a NoteVix page, your brain creates a visual anchor for the information.</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="font-bold text-purple-400 mb-1">3. AI-Accelerated Problem Solving</h4>
              <p className="text-xs">Learning doesn't stop at reading. Our integrated AI Doubt Solver and Quiz Generator provide immediate feedback, closing the "learning gap" that often occurs when a student gets stuck on a specific numerical or concept at home.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Bridging the Technology Gap</h2>
          </div>
          <p>
            The 2025-26 academic year has brought significant changes to the CBSE exam pattern, with a heightened focus on "Competency-Based Questions." NoteVix is the first platform to fully integrate generative AI specifically tuned for these new formats. We provide students with the tools of the future, today.
          </p>
          <p>
            From our smart AI Summarizer that can digest complex question banks to our Focus Timer that utilizes the Pomodoro technique to maintain mental health, every feature on NoteVix is built with a student-first mindset. We are not just a website; we are a digital study partner that stays awake when you do.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Users className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Who We Are</h2>
          </div>
          <p>
            We are a team of educators, technology enthusiasts, and former CBSE toppers dedicated to making quality education accessible. Our resources are curated by subject matter experts to ensure accuracy and relevance to the latest NCERT and CBSE curriculum.
          </p>
          <p>
            Our team understands the pressure of board exams and school assessments. That's why we don't just provide notes; we provide a complete study ecosystem including AI-powered doubt solving and productivity tools.
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
