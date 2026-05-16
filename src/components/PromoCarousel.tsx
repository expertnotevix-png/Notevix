import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PromoBanner } from '../types';
import { useNavigate } from 'react-router-dom';
import { dataBridge } from '../services/dataBridge';

export function PromoCarousel({ location = 'home' }: { location?: 'home' | 'landing' }) {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const data = await dataBridge.getBanners();
        if (data && data.length > 0) {
          setBanners(data);
          return;
        }
      } catch (error) {
        console.warn("Carousel fetch failed, using fallbacks", error);
      }
      
      if (location === 'home') {
        const fallbacks: PromoBanner[] = [
          {
            id: 'fallback_1',
            title: 'Premium Notes Available',
            banner_image: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2070&auto=format&fit=crop',
            redirect_link: '/premium-notes',
            location: 'home',
            is_active: true,
            created_at: new Date().toISOString()
          }
        ];
        setBanners(fallbacks);
      }
    };

    fetchBanners();
  }, [location]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/10 shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[currentIndex].id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full cursor-pointer"
          onClick={() => {
            if (banners[currentIndex].redirect_link) {
              if (banners[currentIndex].redirect_link.startsWith('http')) {
                window.open(banners[currentIndex].redirect_link, '_blank');
              } else {
                navigate(banners[currentIndex].redirect_link);
              }
              return;
            }
            if (location === 'landing') {
              navigate('/login');
              return;
            }
            navigate('/premium-notes');
          }}
        >
          <img
            src={banners[currentIndex].banner_image}
            alt={banners[currentIndex].title || "Promotion"}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {banners.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-6 bg-purple-500' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
