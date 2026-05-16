import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../components/firebase';
import { AppUser } from '../types';

export function useModeration(user: AppUser | null) {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsBanned(false);
      setLoading(false);
      return;
    }

    const checkModeration = async () => {
      try {
        setLoading(true);

        const docSnap = await getDoc(doc(db, 'user_moderation', user.uid));
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const now = new Date().toISOString();
          
          const isPerm = data.isPermanentlyBanned === true;
          const isTemp = data.banUntil && data.banUntil > now;
          
          setIsBanned(isPerm || isTemp);
          setBanReason(isPerm ? 'Permanent Ban' : isTemp ? `Temporary Ban until ${new Date(data.banUntil).toLocaleString()}` : null);
        } else {
          setIsBanned(false);
          setBanReason(null);
        }
      } catch (error) {
        console.error("Moderation fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkModeration();
  }, [user?.uid]); // Use uid for more stable dependency

  return { isBanned, banReason, loading };
}
