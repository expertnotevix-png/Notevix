import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export function useModeration(user: UserProfile | null) {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsBanned(false);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'user_moderation', user.uid), (docSnap) => {
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
      setLoading(false);
    }, (error) => {
      console.error("Moderation listener error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { isBanned, banReason, loading };
}
