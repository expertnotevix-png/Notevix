import { useEffect, useRef, useState } from 'react';
import { dataBridge } from '../services/dataBridge';
import { UserProfile } from '../types';
import { toast } from 'sonner';

interface PointsTrackerProps {
  user: UserProfile | null;
}

export default function PointsTracker({ user }: PointsTrackerProps) {
  const [activeSeconds, setActiveSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    // Only track for logged in users
    if (!user || user.uid === 'GUEST') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Timer logic: Tick every second
    timerRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        setActiveSeconds(prev => {
          const newSeconds = prev + 1;
          
          // Every 60 seconds (1 minute), sync to database
          if (newSeconds % 60 === 0 && newSeconds > 0) {
            syncPoints();
          }
          
          return newSeconds;
        });
      }
    }, 1000);

    const syncPoints = async () => {
        try {
            await dataBridge.updateUserPoints(user.uid);
            console.log("Activity points synchronized");
            // Optional: Show a subtle feedback sometimes? 
            // toast.success("+10 Points for studying!", { icon: '⭐', duration: 2000 });
        } catch (err) {
            console.error("Points sync failed:", err);
        }
    };

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  // This component doesn't render anything visible
  return null;
}
