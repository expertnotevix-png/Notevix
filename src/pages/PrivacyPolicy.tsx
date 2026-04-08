import { motion } from 'motion/react';
import { ChevronLeft, Shield, Lock, Eye, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
      </div>

      <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Shield className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Introduction</h2>
          </div>
          <p>
            Welcome to NoteVix. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Lock className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Data Collection</h2>
          </div>
          <p>
            We collect minimal information required to provide our services:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Name and Email (via Google Authentication)</li>
            <li>Profile Picture</li>
            <li>Study preferences (Class selection, saved notes)</li>
            <li>Usage statistics (Focus timer minutes, daily streaks)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Eye className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">How We Use Your Data</h2>
          </div>
          <p>
            Your data is used to personalize your experience, track your study progress, and provide access to premium resources. We do not sell your personal information to third parties.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">Advertising</h2>
          </div>
          <p>
            We use Google AdSense to show advertisements. AdSense may use cookies to serve ads based on your visits to this and other websites. You can opt-out of personalized advertising by visiting Google's Ads Settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at expertnotevix@gmail.com.
          </p>
        </section>

        <div className="pt-8 text-center text-[10px] uppercase tracking-widest text-gray-600">
          Last Updated: April 2026
        </div>
      </div>
    </div>
  );
}
