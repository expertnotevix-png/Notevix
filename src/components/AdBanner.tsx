import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle';
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdBanner({ slot, format = 'auto', style }: AdBannerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React 18 Strict Mode
    if (initialized.current) return;

    const timeout = setTimeout(() => {
      try {
        if (window.adsbygoogle) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          initialized.current = true;
        }
      } catch (e: any) {
        // Only log errors that aren't the common "already have ads" SPA warning
        if (e?.message && !e.message.includes('already have ads')) {
          console.error('AdSense error:', e);
        }
      }
    }, 100); // Small delay to ensure the <ins> tag is in the DOM

    return () => clearTimeout(timeout);
  }, [slot]); // Re-run if slot changes

  return (
    <div className="w-full overflow-hidden my-4 flex flex-col items-center">
      <p className="text-[8px] text-gray-600 uppercase tracking-widest mb-1">Advertisement</p>
      <div className="glass-card rounded-2xl overflow-hidden w-full min-h-[100px] flex items-center justify-center bg-white/5 border border-white/5">
        {/* Real AdSense Ins Tag */}
        <ins
          className="adsbygoogle"
          style={style || { display: 'block', width: '100%' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your Publisher ID
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
        
        {/* Placeholder for development */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <span className="text-xs font-bold uppercase tracking-widest">Ad Space</span>
        </div>
      </div>
    </div>
  );
}
