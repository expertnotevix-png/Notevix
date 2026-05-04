import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, checkQuotaLock } from '../components/firebase';
import { supabase } from '../lib/supabase';

export const dataBridge = {
  /**
   * Checks if a transaction ID has already been redeemed.
   * Only checks Supabase as it's the primary source for payments.
   */
  async isTransactionRedeemed(txId: string): Promise<boolean> {
    const finalTxId = txId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Use Supabase exclusively for new payments
    if (supabase) {
      try {
        const { data } = await supabase
          .from('purchase_requests')
          .select('id')
          .eq('transactionId', finalTxId)
          .maybeSingle();
        
        if (data) return true;
      } catch (err) {
        console.error("Supabase check failed:", err);
      }
    }

    // Keep Firestore check ONLY for legacy data migration if needed, 
    // but skip if quota is locked
    if (!checkQuotaLock()) {
      try {
        const q = query(collection(db, 'purchase_requests'), where('transactionId', '==', finalTxId));
        const snap = await getDocs(q);
        if (!snap.empty) return true;
      } catch (err) {
        console.warn("Legacy Firestore check skipped (quota)");
      }
    }

    return false;
  },

  /**
   * Saves a purchase request strictly to Supabase or Firestore fallback.
   */
  async savePurchaseRequest(data: any): Promise<{ success: boolean; provider: 'firebase' | 'supabase' | 'none'; error?: string }> {
    const txId = data.transactionId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // 1. Try Supabase FIRST
    if (supabase) {
      try {
        const { error } = await supabase
          .from('purchase_requests')
          .insert([{
            ...data,
            transactionId: txId,
            timestamp: new Date().toISOString(),
            provider: 'supabase'
          }]);

        if (error) throw error;

        // INSTANT UPGRADE in Supabase Profiles if userId exists
        if (data.userId && data.userId !== 'GUEST') {
          await supabase
            .from('profiles')
            .upsert({ 
              id: data.userId, 
              is_premium: true, 
              last_updated: new Date().toISOString() 
            }, { onConflict: 'id' });
        }

        return { success: true, provider: 'supabase' };
      } catch (err: any) {
        console.error("Supabase payment save failed:", err);
        // Continue to Firestore fallback if Supabase fails
      }
    }

    // 2. Try Firestore SECOND
    try {
      if (checkQuotaLock()) throw new Error("Firestore quota reached");
      
      await addDoc(collection(db, 'purchase_requests'), {
        ...data,
        transactionId: txId,
        timestamp: serverTimestamp(),
        provider: 'firebase',
        status: 'pending'
      });
      return { success: true, provider: 'firebase' };
    } catch (err: any) {
      console.error("Firestore payment save failed:", err);
      
      // If both fail, we return a specific error that can trigger a WhatsApp fallback in the UI
      return { 
        success: false, 
        provider: 'none', 
        error: supabase 
          ? "Database error. Please try WhatsApp support if this persists."
          : "Supabase connection missing. Please add VITE_SUPABASE_URL or use WhatsApp fallback." 
      };
    }
  },

  /**
   * Get subject resources exclusively from Supabase.
   */
  async getResources(classLevel: string) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subject_resources')
          .select('*')
          .eq('class', classLevel);
        
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.error("Supabase resource fetch failed:", err);
      }
    }

    // No fallback - user will add manually to Supabase
    return [];
  },

  /**
   * Checks if a user has premium access by looking at both databases.
   */
  checkPremiumStatus: async (uid: string, email?: string | null): Promise<boolean> => {
    // ADMIN OVERRIDE
    if (email === 'expertraj8@gmail.com') return true;

    // 1. Try Supabase FIRST
    if (supabase) {
      try {
        // Check purchase requests for approved status
        const { data: purchases } = await supabase
          .from('purchase_requests')
          .select('status')
          .eq('userId', uid)
          .eq('status', 'approved')
          .limit(1);
        
        if (purchases && purchases.length > 0) return true;

        // Also check a personal profile table for is_premium flag
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', uid)
          .maybeSingle();
        
        if (profile?.is_premium) return true;
      } catch (e) {
        console.warn("Supabase premium check failed:", e);
      }
    }

    // 2. Fallback to Firestore (if not quota locked)
    if (!checkQuotaLock()) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists() && userDoc.data()?.isPremium) {
          return true;
        }
      } catch (e) {
        console.warn("Firestore premium check failed (likely quota):", e);
      }
    }

    return false;
  }
};
