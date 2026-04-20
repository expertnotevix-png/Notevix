import { ChevronLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Disclaimer() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 glass-card rounded-xl active:scale-95 transition-transform">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Disclaimer</h1>
      </div>

      <div className="space-y-6 text-gray-400 text-sm leading-relaxed">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            <h2 className="font-bold">General Information</h2>
          </div>
          <p>
            The information provided by NoteVix ("we," "us," or "our") on this application is for general educational and informational purposes only. All information on the application is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white uppercase text-xs tracking-widest">Educational Content</h2>
          <p>
            While our notes and summaries are curated by subject experts and former toppers, they are intended to supplement, not replace, official NCERT textbooks and teacher instructions. Students are encouraged to always cross-reference information with the official CBSE/NCERT sources.
          </p>
          <p>
            NoteVix does not guarantee specific results or marks in exams. The success of a student depends on various factors including their individual effort, understanding of concepts, and consistency in study.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white uppercase text-xs tracking-widest">External Links</h2>
          <p>
            The application may contain (or you may be sent through the application) links to other websites or content belonging to or originating from third parties. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us.
          </p>
          <p>
            We do not warrant, endorse, guarantee, or assume responsibility for the accuracy or reliability of any information offered by third-party websites linked through the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white uppercase text-xs tracking-widest">Professional Disclaimer</h2>
          <p>
            The application cannot and does not contain legal, financial, or professional advice. The educational information is provided for general informational and educational purposes only and is not a substitute for professional advice.
          </p>
          <p>
            Accordingly, before taking any actions based upon such information, we encourage you to consult with the appropriate professionals. The use or reliance of any information contained on our application is solely at your own risk.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white uppercase text-xs tracking-widest">Fair Use Notice</h2>
          <p>
            This application contains copyrighted material, the use of which has not always been specifically authorized by the copyright owner. We are making such material available for the purpose of education and commentary, which constitutes "fair use" of any such copyrighted material as provided for in section 107 of the US Copyright Law and similar laws in India.
          </p>
        </section>

        <div className="pt-8 text-center text-[10px] uppercase tracking-widest text-gray-600">
          Last Updated: April 2026
        </div>
      </div>
    </div>
  );
}
