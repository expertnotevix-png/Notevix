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
   * Get subject resources exclusively from Supabase or Local Fallback.
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

    // Try to fetch from local resources.json as primary fallback
    try {
      const response = await fetch('/data/resources.json');
      const data = await response.json();
      const filtered = data.resources.filter((r: any) => r.class === classLevel);
      if (filtered.length > 0) {
        // Map subject names to match UI expected format
        return filtered.map((r: any) => ({
          ...r,
          id: r.id,
          subject: r.subject.charAt(0).toUpperCase() + r.subject.slice(1).toLowerCase(),
          description: `Premium study materials for Class ${classLevel} ${r.subject}.`,
          price: 39,
          isFree: false
        }));
      }
    } catch (e) {
      console.warn("Could not fetch local resources.json, using hardcoded fallback.");
    }

    // FINAL FALLBACK DATA: Hardcoded high-quality resources for when databases are unavailable/loading
    const fallbackResources = [
      {
        id: `math_${classLevel}`,
        subject: 'Mathematics',
        class: classLevel,
        price: 39,
        description: `Complete Master Guide for Class ${classLevel} Maths. includes formulas, theorems, and practice sets.`,
        isFree: false,
        features: ['Full Chapter Notes', 'PYQ Solutions', 'AI Analysis'],
        coverUrl: ''
      },
      {
        id: `science_${classLevel}`,
        subject: 'Science',
        class: classLevel,
        price: 39,
        description: `High-yield Science notes for Class ${classLevel}. Optimized for the 2024-25 syllabus.`,
        isFree: false,
        features: ['Diagram Sets', 'Lab Concepts', 'Exam Predictor'],
        coverUrl: ''
      },
      {
        id: `social_${classLevel}`,
        subject: 'Social Science',
        class: classLevel,
        price: 39,
        description: `History, Geography, and Civics simplified. Bullet-point revision for fast learning.`,
        isFree: false,
        features: ['Timeline Maps', 'Flashcard Deck', 'PYQ Collection'],
        coverUrl: ''
      },
      {
        id: `english_${classLevel}`,
        subject: 'English',
        class: classLevel,
        price: 39,
        description: `Literature and Grammar master guide. Includes summary and character sketches.`,
        isFree: false,
        features: ['Literature Summary', 'Grammar Rules', 'Writing Prep'],
        coverUrl: ''
      }
    ];

    return fallbackResources;
  },

  /**
   * Checks if a user has premium access by looking at both databases.
   */
  checkPremiumStatus: async (uid: string, email?: string | null): Promise<boolean> => {
    // ADMIN OVERRIDE
    if (email === 'expertraj8@gmail.com') return true;

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
