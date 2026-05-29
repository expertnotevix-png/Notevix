import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface ProductCarouselProps {
  coverImage?: string;
  previewImages?: string[];
  subject: string;
}

export function ProductCarousel({ coverImage, previewImages = [], subject }: ProductCarouselProps) {
  // Combine coverImage with previewImages
  const images = [
    ...(coverImage ? [coverImage] : []),
    ...(previewImages || [])
  ].filter(url => typeof url === 'string' && url.trim() !== '');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }
  };

  const nextImage = () => {
    if (images.length <= 1) return;
    setDirection('right');
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length <= 1) return;
    setDirection('left');
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-indigo-600/10 flex items-center justify-center">
        <BookOpen size={40} className="text-indigo-500/20" />
      </div>
    );
  }

  // Slide/Fade variants
  const variants = {
    initial: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? 80 : -80
    }),
    animate: {
      opacity: 1,
      x: 0
    },
    exit: (dir: 'left' | 'right') => ({
      opacity: 0,
      x: dir === 'right' ? -80 : 80
    })
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden select-none bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.img
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          src={images[currentIndex]}
          alt={`${subject} Preview ${currentIndex + 1}`}
          className="w-full h-full object-cover pointer-events-none"
        />
      </AnimatePresence>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

      {images.length > 1 && (
        <>
          {/* Arrow Buttons - Desktop only */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              prevImage();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/90 active:scale-90 transition-all z-10 hidden md:flex cursor-pointer"
            aria-label="Previous image"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              nextImage();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/90 active:scale-90 transition-all z-10 hidden md:flex cursor-pointer"
            aria-label="Next image"
          >
            <ChevronRight size={16} />
          </button>

          {/* Dot Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDirection(i > currentIndex ? 'right' : 'left');
                  setCurrentIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentIndex ? 'w-5 bg-indigo-500' : 'w-1.5 bg-white/30'
                }`}
                aria-label={`Go to preview ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
