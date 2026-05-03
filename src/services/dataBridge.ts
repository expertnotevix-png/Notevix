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
   * Saves a purchase request strictly to Supabase.
   */
  async savePurchaseRequest(data: any): Promise<{ success: boolean; provider: 'firebase' | 'supabase' | 'none'; error?: string }> {
    const txId = data.transactionId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
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
        return { success: true, provider: 'supabase' };
      } catch (err: any) {
        console.error("Supabase payment save failed:", err);
        return { success: false, provider: 'none', error: err.message };
      }
    }

    return { success: false, provider: 'none', error: "Supabase not configured" };
  },

  /**
   * Get subject resources exclusively from Supabase.
   */
  async getResources(classLevel: string) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from('subject_resources')
          .select('*')
          .eq('class', classLevel);
        
        if (data && data.length > 0) return data;
      } catch (err) {
        console.error("Supabase resource fetch failed:", err);
      }
    }

    return [];
  },

  /**
   * Checks if a user has premium access by looking at both databases.
   */
  checkPremiumStatus: async (uid: string): Promise<boolean> => {
    // 1. Try Supabase FIRST (since Firestore is over quota)
    if (supabase) {
      try {
        const { data } = await supabase
          .from('purchase_requests')
          .select('status')
          .eq('userId', uid)
          .eq('status', 'approved')
          .limit(1);
        
        if (data && data.length > 0) {
          return true;
        }
      } catch (e) {
        console.warn("Supabase premium check failed:", e);
      }
    }

    // 2. Fallback to Firestore
    if (!checkQuotaLock()) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists() && userDoc.data()?.isPremium) {
          return true;
        }
      } catch (e) {
        // Silent fail for quota
        console.warn("Firestore premium check failed (likely quota):", e);
      }
    }

    return false;
  }
};
