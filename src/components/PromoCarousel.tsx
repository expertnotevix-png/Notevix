import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, getCachedData, setCachedData, checkQuotaLock } from './firebase';
import { PromoBanner } from '../types';
import { useNavigate } from 'react-router-dom';
import { dataBridge } from '../services/dataBridge';

export function PromoCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBanners = async () => {
      const cacheKey = 'promo_banners';
      const cached = getCachedData<PromoBanner[]>(cacheKey);
      
      if (cached) {
        setBanners(cached);
        return;
      }

      try {
        const data = await dataBridge.getPromoBanners(5);
        
        if (data && data.length > 0) {
          setBanners(data);
          setCachedData(cacheKey, data, 60); // Cache for 60 mins
          return;
        }
      } catch (error) {
        console.warn("Carousel fetch failed, using fallbacks", error);
      }
      
      const fallbacks: PromoBanner[] = [
        {
          id: 'fallback_1',
          imageUrl: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2070&auto=format&fit=crop',
          link: '/premium-notes',
          createdAt: new Date().toISOString()
        }
      ];
      setBanners(fallbacks);
    };

    fetchBanners();
  }, []);

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
            const destination = banners[currentIndex].link || '/premium-notes';
            if (destination.startsWith('http')) {
              window.open(destination, '_blank');
            } else {
              navigate(destination);
            }
          }}
        >
          <img
            src={banners[currentIndex].imageUrl}
            alt="Promotion"
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
