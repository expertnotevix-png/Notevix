import { motion } from 'motion/react';
import { ChevronLeft, FileText, CheckCircle, AlertCircle, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Terms of Service</h1>
      </div>

      <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Scale className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Agreement to Terms</h2>
          </div>
          <p>
            By accessing or using NoteVix, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the application.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <CheckCircle className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">User Responsibilities</h2>
          </div>
          <p>
            You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to use the application only for lawful purposes and in accordance with these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Intellectual Property</h2>
          </div>
          <p>
            The content, features, and functionality of NoteVix, including but not limited to notes, study materials, and logos, are the exclusive property of NoteVix and are protected by international copyright and trademark laws.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Limitation of Liability</h2>
          </div>
          <p>
            NoteVix shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white">Changes to Terms</h2>
          <p>
            We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes by posting the new Terms on this page.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white">Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at expertnotevix@gmail.com.
          </p>
        </section>

        <div className="pt-8 text-center text-[10px] uppercase tracking-widest text-gray-600">
          Last Updated: April 2026
        </div>
      </div>
    </div>
  );
}
