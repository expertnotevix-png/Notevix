import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  updateDoc as firestoreUpdateDoc,
  limit,
  orderBy,
  increment
} from 'firebase/firestore';
import { db, checkQuotaLock } from '../components/firebase';
import { supabase } from '../lib/supabase';
import { SubjectResource, StoryTemplate, StoryUnlock, VerificationLog, UserProfile } from '../types';

const withTimeout = async <T>(promiseOrThenable: any, timeoutMs: number = 8000, context: string = 'Operation'): Promise<T> => {
  return Promise.race([
    Promise.resolve(promiseOrThenable),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`${context} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const dataBridge = {
  /**
   * Syncs a Firebase user profile to Supabase
   * This bridges your Firebase login users into your Supabase database
   */
  async syncProfile(uid: string, profileData: any) {
    if (!supabase || !uid || uid === 'GUEST' || uid === 'undefined' || uid === 'null') return;
    try {
      await withTimeout(
        supabase
          .from('profiles')
          .upsert({
            id: uid,
            full_name: profileData.displayName || profileData.fullName || 'Student',
            email: profileData.email,
            avatar_url: profileData.photoURL || profileData.avatarUrl || '',
            class_level: profileData.class || profileData.classLevel || '10',
            xp: profileData.totalPoints || profileData.xp || 0,
            streak: profileData.streak?.currentCount || profileData.streakCount || 0,
            is_premium: profileData.isPremium || false,
            unlocked_resources: profileData.unlockedResources || [],
            unlocked_classes: profileData.unlockedClasses || [],
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' }),
        15000,
        'Profile Sync'
      );
    } catch (err) {
      console.warn("Profile sync was slow but continuing:", err);
    }
  },

  /**
   * Gets a user profile with Firebase fallback
   */
  async getProfile(uid: string) {
    let result: any = null;

    // 1. Try Supabase
    if (supabase) {
      try {
        const response: any = await withTimeout(
          supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .maybeSingle(),
          15000,
          'Profile Fetch'
        );
        
        const { data, error } = response;
        
        if (data && !error) {
           const isAdmin = ['expertraj8@gmail.com', 'expertnotevix@gmail.com'].includes(data.email?.toLowerCase());
           result = {
             ...data,
             uid: data.id,
             displayName: data.full_name,
             photoURL: data.avatar_url,
             class: data.class_level,
             totalPoints: data.xp,
             isPremium: !!data.is_premium || isAdmin,
             planType: data.plan_type,
             unlockedResources: data.unlocked_resources || [],
             unlockedClasses: data.unlocked_classes || [],
             streak: { currentCount: data.streak || 0 }
           };

           // MERGE: Search for any approved individual purchases linked by email
           if (result.email) {
             const purchaseRes: any = await withTimeout(
               supabase.from('purchase_requests').select('resource_id, plan_id').eq('email', result.email).eq('status', 'approved'),
               5000,
               'Purchase Sync'
             ).catch(() => ({ data: [] }));
             
             const emailPurchases = purchaseRes?.data || [];
             
             if (emailPurchases && emailPurchases.length > 0) {
               const emailRes = emailPurchases.filter((p: any) => !!p.resource_id).map((p: any) => p.resource_id);
               result.unlockedResources = Array.from(new Set([...result.unlockedResources, ...emailRes]));
               
               // If any purchase is for a master pack or premium sub
               if (emailPurchases.some((p: any) => p.plan_id === 'plus_sub' || p.plan_id === 'monthly_sub')) {
                 result.isPremium = true;
               }
             }
           }
        }
      } catch (err) {
        console.warn("Supabase profile fetch failed or timed out:", err);
      }
    }

    // 2. Try Firestore and MERGE with strict timeout and quiet failure
    try {
      const userDoc = await withTimeout(
        getDoc(doc(db, 'users', uid)),
        4000,
        'Firestore Profile Fetch'
      ) as any;

      if (userDoc && userDoc.exists()) {
        const userData = userDoc.data();
        if (!result) {
          result = {
            ...userData,
            uid: uid,
            isPremium: !!userData.isPremium
          };
        } else {
          // Merge logic: Take premium status and unlocked resources from Firestore too
          result.isPremium = result.isPremium || !!userData.isPremium;
          if (!result.planType && userData.planType) result.planType = userData.planType;
          
          const fsResources = userData.unlockedResources || [];
          result.unlockedResources = Array.from(new Set([...(result.unlockedResources || []), ...fsResources]));
          
          const fsClasses = userData.unlockedClasses || [];
          result.unlockedClasses = Array.from(new Set([...(result.unlockedClasses || []), ...fsClasses]));

          // Sync other fields if missing in Supabase
          if (!result.displayName && userData.displayName) result.displayName = userData.displayName;
          if (!result.savedNotes?.length && userData.savedNotes?.length) result.savedNotes = userData.savedNotes;
        }
      }
    } catch (err) {
      // Quietly log Firestore failure so it doesn't break the app flow
      console.warn("Firestore profile sync skipped (offline or slow):", err);
    }

    return result;
  },

  /**
   * Community Posts - List from Supabase
   */
  /**
   * Community Fetching
   */
  async getPost(postId: string) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:author_id (
              display_name,
              photo_url
            )
          `)
          .eq('id', postId)
          .single();
        
        if (data && !error) {
          return {
            ...data,
            userName: data.profiles?.display_name || 'Student',
            userPhoto: data.profiles?.photo_url || '',
            userId: data.author_id
          };
        }
      } catch (err) {
        console.error("Supabase getPost failed:", err);
      }
    }
    return null;
  },

  async getPosts(limitCount = 20, subject = 'All', classLevel = 'All', sortBy = 'latest') {
    if (supabase) {
      try {
        let queryBuilder = supabase
          .from('posts')
          .select(`
            *,
            profiles:author_id (full_name, avatar_url, class_level)
          `)
          .eq('status', 'approved');
        
        if (subject !== 'All') queryBuilder = queryBuilder.eq('subject', subject);
        if (classLevel !== 'All') queryBuilder = queryBuilder.eq('class_level', classLevel);
        
        if (sortBy === 'latest') queryBuilder = queryBuilder.order('created_at', { ascending: false });
        else if (sortBy === 'upvoted') queryBuilder = queryBuilder.order('upvotes_count', { ascending: false });
        
        const { data, error } = await queryBuilder.limit(limitCount);
        if (error) throw error;
        
        return (data || []).map(p => ({
          ...p,
          userName: p.profiles?.full_name || 'Student',
          userPhoto: p.profiles?.avatar_url || '',
          userRole: p.profiles?.class_level || 'N/A',
          class: p.class_level,
          upvotesCount: p.upvotes_count || 0,
          replyCount: p.reply_count || 0,
          createdAt: p.created_at
        }));
      } catch (err) {
        console.warn("Supabase posts fetch failed, trying Firestore...");
      }
    }

    // Firestore Fallback
    try {
      let q = query(collection(db, 'posts'), where('status', '==', 'approved'), limit(limitCount));
      if (subject !== 'All') q = query(q, where('subject', '==', subject));
      if (classLevel !== 'All') q = query(q, where('class', '==', classLevel));
      
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (err) {
      console.warn("Firestore posts fetch failed:", err);
    }
    return [];
  },

  /**
   * Create a Post with AI Moderation result and award points
   */
  async createPost(uid: string, postData: any, aiResult?: any) {
    if (supabase) {
      try {
        // 1. Create the Post
        const { data: post, error } = await supabase
          .from('posts')
          .insert([{
            author_id: uid,
            title: postData.title,
            description: postData.description,
            image_url: postData.imageUrl,
            subject: postData.subject,
            class_level: postData.class,
            tags: postData.tags || [],
            status: 'approved',
            reply_count: aiResult?.aiAnswer ? 1 : 0,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;

        // 2. Add AI Reply if exists
        if (aiResult?.aiAnswer && post) {
          await supabase
            .from('replies')
            .insert([{
              post_id: post.id,
              author_id: '00000000-0000-0000-0000-000000000000', // AI Bot ID
              content: aiResult.aiAnswer,
              is_ai: true,
              created_at: new Date().toISOString()
            }]);
        }

        // 3. Award Points (Sync to Profiles)
        await supabase.rpc('increment_xp', { user_id: uid, amount: 50 });

        return post;
      } catch (err) {
        console.warn("Supabase post creation failed, falling back to Firestore:", err);
      }
    }

    // Firestore Fallback
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        author_id: uid,
        ...postData,
        status: 'approved',
        createdAt: serverTimestamp()
      });
      return { id: docRef.id };
    } catch (err) {
      console.error("Firestore post creation failed:", err);
      throw err;
    }
  },

  /**
   * Vote on a post
   */
  async votePost(uid: string, postId: string, voteType: 'up' | 'down') {
    if (supabase) {
      try {
        const { error } = await supabase.rpc('vote_post', {
          user_id: uid,
          post_id: postId,
          vote_type: voteType
        });
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Vote failed:", err);
      }
    }
    return false;
  },

  /**
   * Get subject resources (Notes, etc) from Supabase primarily
   */
  async getResources(classLevel: string): Promise<SubjectResource[]> {
    // 1. Try Supabase (Absolute Truth)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subject_resources')
          .select('*')
          .eq('class', classLevel);
        
        if (!error && data && data.length > 0) {
          return data.map((d: any) => this.mapResource(d)) as SubjectResource[];
        }
      } catch (err) {
        console.warn("Supabase resource fetch failed:", err);
      }
    }

    // 2. Try Firestore fallback only if Supabase is down
    try {
      const q = query(collection(db, 'subject_resources'), where('class', '==', classLevel));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectResource));
      }
    } catch (err) {
      console.warn("Firestore resource fetch failed:", err);
    }

    return [];
  },

  /**
   * Transaction Check (Fraud Protection)
   */
  async isTransactionRedeemed(txId: string): Promise<boolean> {
    const finalTxId = txId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Check Supabase (Primary Truth)
    if (supabase) {
      try {
        const { data: prData } = await supabase
          .from('purchase_requests')
          .select('id')
          .eq('transaction_id', finalTxId)
          .maybeSingle();
        
        if (prData) return true;

        const { data: vpData } = await supabase
          .from('verified_payments')
          .select('id')
          .eq('transaction_id', finalTxId)
          .maybeSingle();

        if (vpData) return true;
      } catch (err) {
        console.warn("Supabase UTR check failed:", err);
      }
    }

    // Check Firestore (Legacy Fallback)
    try {
      const txDoc = await getDoc(doc(db, 'transaction_id_registry', finalTxId));
      if (txDoc.exists()) return true;
    } catch (err) {}
    
    return false;
  },

  /**
   * Check if user is premium in Supabase (Truth source) or Firestore (Secondary)
   */
  async checkPremiumStatus(uid: string, email?: string): Promise<boolean> {
    // 1. Try Supabase First (Truth source, no limits)
    if (supabase) {
      try {
        const { data } = await withTimeout(
          supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', uid)
            .maybeSingle(),
          5000,
          'Supabase Premium Check'
        ) as any;
        
        if (data?.is_premium) return true;

        if (email) {
          const { data: purchase } = await supabase
            .from('purchase_requests')
            .select('id')
            .eq('email', email)
            .eq('status', 'approved')
            .maybeSingle();
          if (purchase) return true;
        }
      } catch (err) {
        console.warn("Supabase premium check failed:", err);
      }
    }

    // 2. Fallback to Firestore with shorter timeout
    try {
      const userDoc = await withTimeout(
        getDoc(doc(db, 'users', uid)),
        3000,
        'Firestore Premium Check'
      ) as any;
      if (userDoc?.exists() && userDoc.data()?.isPremium) return true;
      
      if (email) {
        const q = query(collection(db, 'purchase_requests'), where('email', '==', email), where('status', '==', 'approved'), limit(1));
        const snap = await withTimeout(getDocs(q), 3000, 'Firestore Purchase Check') as any;
        if (snap && !snap.empty) return true;
      }
    } catch (err) {
      console.warn("Firestore premium check skipped:", err);
    }

    return false;
  },

  async saveVerifiedPayment(paymentData: { 
    transactionId: string, 
    phoneNumber: string, 
    amount: number, 
    subject: string, 
    userId?: string, 
    verified?: boolean,
    paymentApp?: string,
    passwordUnlocked?: string,
    productName?: string
  }) {
    if (supabase) {
      try {
        const { error } = await supabase.from('verified_payments').insert([{
          transaction_id: paymentData.transactionId.toUpperCase().replace(/[^A-Z0-9]/g, ''),
          user_id: paymentData.userId || 'GUEST',
          phone_number: paymentData.phoneNumber,
          amount: paymentData.amount,
          subject: paymentData.subject,
          product_name: paymentData.productName || paymentData.subject,
          payment_app: paymentData.paymentApp || 'Unknown',
          password_unlocked: paymentData.passwordUnlocked || '',
          verified: paymentData.verified ?? true,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
        return { success: true };
      } catch (err: any) {
        console.error("Save verified payment failed:", err);
        return { success: false, error: err.message };
      }
    }
    // Firestore Fallback
    try {
      await addDoc(collection(db, 'verified_payments'), {
        ...paymentData,
        userId: paymentData.userId || 'GUEST',
        verified: paymentData.verified ?? true,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Save a purchase request (Supabase Primary) with Instant Approval helper
   */
  async savePurchaseRequest(requestData: any) {
    const txId = requestData.transactionId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const status = requestData.status || 'pending';
    
    // Attempt to resolve real userId if 'GUEST' but email exists
    let activeUserId = requestData.userId;
    if (activeUserId === 'GUEST' && requestData.email && supabase) {
      try {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', requestData.email).maybeSingle();
        if (profile) activeUserId = profile.id;
      } catch (err) {}
    }

    // 1. Try Supabase First (Truth source)
    if (supabase) {
      try {
        const { error } = await supabase
          .from('purchase_requests')
          .insert([{
            user_id: activeUserId,
            email: requestData.email,
            whatsapp: requestData.whatsapp,
            transaction_id: txId,
            amount: requestData.amount,
            plan_id: requestData.planId,
            plan_name: requestData.planName,
            resource_id: requestData.resourceId || null,
            payment_app: requestData.paymentApp || 'Unknown',
            password_unlocked: requestData.passwordUnlocked || '',
            product_name: requestData.productName || requestData.planName,
            status: status,
            verified: status === 'approved',
            created_at: new Date().toISOString()
          }]);
        
        if (error) {
          if (error.code === '23505') {
            return { success: false, error: `Transaction ID ${txId} already verified/used.` };
          }
          throw error;
        }

        // IF INSTANTLY APPROVED (AI Verified), UPDATE USER PROFILE IMMEDIATELY
        if (status === 'approved' && activeUserId && activeUserId !== 'GUEST') {
             try {
                // Fetch current profile to get existing unlocked items
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', activeUserId).maybeSingle();
                
                const updates: any = {};
                
                // Handle Premium Subscription
                if (requestData.planId === 'plus_sub' || requestData.planId === 'monthly_sub') {
                  updates.is_premium = true;
                  updates.plan_type = requestData.planId;
                }
                
                const currentResources = profile?.unlocked_resources || [];
                const currentClasses = profile?.unlocked_classes || [];

                // Handle Master Pack Purchase (class_<cls>_one_time)
                if (requestData.planId?.includes('_one_time')) {
                   const classMatch = requestData.planId.match(/class_(\d+)_/);
                   if (classMatch) {
                      const cls = classMatch[1];
                      if (!currentClasses.includes(cls)) {
                        updates.unlocked_classes = Array.from(new Set([...currentClasses, cls]));
                      }
                   }
                }
                
                // Handle Individual Resource Purchase
                const targetResId = requestData.resourceId || (requestData.planId?.startsWith('res_') ? requestData.planId.replace('res_', '') : null);
                if (targetResId) {
                   if (!currentResources.includes(targetResId)) {
                     updates.unlocked_resources = Array.from(new Set([...currentResources, targetResId]));
                   }
                }
                
                // Update the profile in Supabase
                if (Object.keys(updates).length > 0) {
                  await supabase.from('profiles').update({
                    ...updates,
                    updated_at: new Date().toISOString()
                  }).eq('id', activeUserId);
                }

                // IMPORTANT: ALSO UPDATE FIRESTORE PROFILE FOR INSTANT ACCESS SYNC
                try {
                   const firestoreUpdates: any = {};
                   if (updates.is_premium) firestoreUpdates.isPremium = true;
                   if (updates.unlocked_resources) firestoreUpdates.unlockedResources = updates.unlocked_resources;
                   if (updates.unlocked_classes) firestoreUpdates.unlockedClasses = updates.unlocked_classes;
                   
                   if (Object.keys(firestoreUpdates).length > 0) {
                      await firestoreUpdateDoc(doc(db, 'users', activeUserId), firestoreUpdates);
                   }
                } catch (fsErr) {
                   console.error("Firestore instant sync failed:", fsErr);
                }
             } catch (updateErr) {
                console.error("Instant access grant failed:", updateErr);
             }
          }
          
          // ALSO MARK TRANSACTION AS USED IN FIRESTORE REGISTRY
          try {
             await setDoc(doc(db, 'transaction_id_registry', txId), {
               email: requestData.email,
               usedAt: serverTimestamp()
             });
          } catch(e) {}

          return { success: true, provider: 'supabase' };
      } catch (err: any) {
        console.warn("Supabase save failed:", err);
      }
    }

    // 2. Sync to Firestore (Backup only - silent)
    try {
      await addDoc(collection(db, 'purchase_requests'), {
        ...requestData,
        transactionId: txId,
        status: status,
        verified: status === 'approved',
        createdAt: serverTimestamp()
      });
      return { success: true, provider: 'fallback' };
    } catch (err: any) {
      console.error("Database Save Failed:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Promo Banners - List from Supabase primarily
   */
  async getPromoBanners(limitCount = 5, location = 'home') {
    if (supabase) {
      try {
        let queryBuilder = supabase
          .from('promo_banners')
          .select('*')
          .eq('location', location)
          .order('created_at', { ascending: false })
          .limit(limitCount);
        
        const { data, error } = await queryBuilder;
        
        if (!error && data) {
           return data.map(b => ({
             id: b.id,
             imageUrl: b.image_url || b.imageUrl,
             link: b.link,
             location: b.location,
             createdAt: b.created_at || b.createdAt
           }));
        }
      } catch (err) {
        console.warn("Supabase banners failed:", err);
      }
    }

    // Firestore fallback
    try {
      let q = query(collection(db, 'promo_banners'), where('location', '==', location), orderBy('createdAt', 'desc'), limit(limitCount));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (err) {}

    return [];
  },

  /**
   * Resources - Exclusively from Database
   */
  async getResourcesByClassAndSubject(classLevel: string, subjectId: string) {
    if (supabase) {
      try {
        let q = supabase.from('subject_resources').select('*').eq('class', classLevel);
        if (subjectId !== 'all') q = q.eq('subject', subjectId);
        const { data } = await q;
        if (data) return data.map((d: any) => this.mapResource(d));
      } catch (err) {}
    }
    return [];
  },

  async getResourceById(noteId: string) {
    if (supabase) {
      try {
        const { data } = await supabase.from('subject_resources').select('*').eq('id', noteId).maybeSingle();
        if (data) return this.mapResource(data);
      } catch (err) {}
    }
    return null;
  },

  async searchResources(term: string) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from('subject_resources')
          .select('*')
          .or(`title.ilike.%${term}%,subject.ilike.%${term}%`)
          .limit(20);
        if (data) return data.map((d: any) => this.mapResource(d));
      } catch (err) {}
    }
    return [];
  },

  async getSavedNotes(noteIds: string[]) {
    if (!noteIds || noteIds.length === 0) return [];
    if (supabase) {
      try {
        const { data } = await supabase.from('subject_resources').select('*').in('id', noteIds);
        if (data) return data.map((d: any) => this.mapResource(d));
      } catch (err) {}
    }
    return [];
  },

  // Helper for consistent mapping
  mapResource(d: any): SubjectResource {
    return {
      id: d.id,
      subject: d.subject,
      class: d.class,
      price: d.price || 39,
      description: d.description,
      coverUrl: d.cover_url,
      driveLink: d.drive_link,
      password: d.password,
      onePageNotesUrl: d.one_page_notes_url,
      fullNotesUrl: d.full_notes_url,
      importantQuestionsUrl: d.important_questions_url,
      examOrientedQuestionsUrl: d.exam_oriented_questions_url,
      isFree: d.is_free === true || d.isFree === true || false,
      features: (() => {
        try {
          if (Array.isArray(d.features)) return d.features;
          if (typeof d.features === 'string') {
            const parsed = JSON.parse(d.features);
            return Array.isArray(parsed) ? parsed : [d.features];
          }
          return [];
        } catch (e) {
          console.error("Failed to parse features:", e);
          return [];
        }
      })(),
      createdAt: d.created_at
    };
  },

  async toggleSavedNote(uid: string, currentSavedNotes: string[], noteId: string) {
    let newSavedNotes: string[];
    if (currentSavedNotes.includes(noteId)) {
      newSavedNotes = currentSavedNotes.filter(id => id !== noteId);
    } else {
      newSavedNotes = [...currentSavedNotes, noteId];
    }

    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            saved_notes: newSavedNotes,
            updated_at: new Date().toISOString()
          })
          .eq('id', uid);
        return newSavedNotes;
      } catch (err) {
        console.error("Supabase toggle saved note failed:", err);
      }
    }
    return null;
  },

  /**
   * Leaderboard
   */
  async getLeaderboard(limitCount = 30) {
    if (!supabase) return [];
    
    try {
      // 1. Try user_points table first (new logic)
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select(`
          user_id,
          total_points,
          streak_days,
          profiles:user_id (full_name, avatar_url, class_level)
        `)
        .order('total_points', { ascending: false })
        .limit(limitCount);

        return (pointsData || []).map((d: any) => ({
          uid: d.user_id,
          displayName: d.profiles?.full_name || 'Student',
          photoURL: d.profiles?.avatar_url || '',
          totalPoints: d.total_points || 0,
          streak: d.streak_days || 0,
          class: d.profiles?.class_level
        }));

      // 2. Fallback to profiles (old logic)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, xp, streak, class_level')
        .order('xp', { ascending: false })
        .limit(limitCount);
      
      if (error) throw error;
      
      return (data || []).map(d => ({
        uid: d.id,
        displayName: d.full_name || 'Student',
        photoURL: d.avatar_url || '',
        totalPoints: d.xp || 0,
        streak: d.streak || 0,
        class: d.class_level
      }));
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
      return [];
    }
  },

  /**
   * Update User Points based on study time
   * Every 1 minute = +10 points
   */
  async updateUserPoints(uid: string) {
    if (!supabase || !uid || uid === 'GUEST') return;

    try {
      // 1. Get current stats
      const { data: current, error: fetchError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (fetchError) throw fetchError;

      if (!current) {
        // First time initialization
        await supabase.from('user_points').insert([{
          user_id: uid,
          total_points: 10,
          total_minutes: 1,
          last_updated: now.toISOString(),
          streak_days: 1,
          last_visit_date: today
        }]);
      } else {
        // Calculate Streak
        let streakDays = current.streak_days || 1;
        const lastVisit = current.last_visit_date ? Number(current.last_visit_date) : 0;
        
        const diffDays = (today - lastVisit) / (1000 * 60 * 60 * 24);
        
        if (diffDays >= 1 && diffDays < 2) {
          // Visited yesterday, increment streak
          streakDays += 1;
        } else if (diffDays >= 2) {
          // Missed a day, reset streak
          streakDays = 1;
        }

        // Update Record
        await supabase
          .from('user_points')
          .update({
            total_points: (current.total_points || 0) + 10,
            total_minutes: (current.total_minutes || 0) + 1,
            last_updated: now.toISOString(),
            streak_days: streakDays,
            last_visit_date: today
          })
          .eq('user_id', uid);
        
        // Also sync XP back to main profile for compatibility
        await supabase.rpc('increment_xp', { user_id: uid, amount: 10 });
      }
    } catch (err) {
      console.error("Failed to update user points:", err);
    }
  },

  /**
   * Admin: Get all profiles
   */
  async getProfiles(limitCount = 100) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(limitCount);
        
        if (data && !error) {
           return data.map(d => ({
             ...d,
             uid: d.id,
             displayName: d.full_name,
             photoURL: d.avatar_url,
             class: d.class_level,
             totalPoints: d.xp,
             isPremium: d.is_premium,
             createdAt: d.created_at,
             source: 'supabase'
           }));
        }
      } catch (err) {
        console.warn("Supabase profiles bulk fetch failed:", err);
      }
    }
    return [];
  },

  /**
   * Admin: Get Stats Summary
   */
  async getAdminStats() {
    const stats = {
      totalUsers: 0,
      premiumUsers: 0,
      newUsersToday: 0,
      activeToday: 0
    };

    if (supabase) {
      try {
        // Total Users
        const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        stats.totalUsers = total || 0;

        // Premium Users
        const { count: premium } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);
        stats.premiumUsers = premium || 0;

        // New Users Today
        const today = new Date();
        today.setHours(0,0,0,0);
        const { count: newToday } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('created_at', today.toISOString());
        stats.newUsersToday = newToday || 0;

        // Active Today (Last 24h)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: active } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('updated_at', dayAgo);
        stats.activeToday = active || 0;

        return stats;
      } catch (err) {
        console.warn("Supabase stats fetch failed:", err);
      }
    }
    return stats;
  },

  /**
   * Community Chat
   */
  async getChatMessages(limitCount = 50) {
    if (supabase) {
      try {
        const response: any = await withTimeout(
          supabase
            .from('community_chat')
            .select(`
              *,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .order('created_at', { ascending: false })
            .limit(limitCount),
          7000,
          'Chat Fetch'
        );
        
        const { data, error } = response;
        
        if (data) {
          return data.reverse().map((d: any) => ({
            id: d.id,
            userId: d.user_id,
            userName: d.profiles?.full_name || 'Student',
            userPhoto: d.profiles?.avatar_url || '',
            content: d.content,
            timestamp: d.created_at
          }));
        }
      } catch (err) {
        console.error("Chat fetch failed:", err);
      }
    }
    return [];
  },

  async sendChatMessage(uid: string, content: string) {
    if (!supabase) throw new Error("Connection lost. Please try again.");
    
    // Add a 10-second timeout to prevent infinite "sending" state
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out. Please try again.")), 10000)
    );

    try {
      const sendPromise = (async () => {
        const { data, error } = await supabase
          .from('community_chat')
          .insert([{
            user_id: uid,
            content: content,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      })();

      return await Promise.race([sendPromise, timeoutPromise]);
    } catch (err: any) {
      console.error("Chat send error:", err);
      throw err;
    }
  },

  /**
   * Community Stats
   */
  async getCommunityStats() {
    if (supabase) {
      try {
        const { data } = await supabase
          .from('community_stats')
          .select('*')
          .eq('key', 'global')
          .single();
        if (data) return data.value;
      } catch (err) {}
    }
    return {
      totalQuestions: 1540,
      totalAnswers: 4200,
      totalStudents: 5200,
      solvedToday: 42
    };
  },

  /**
   * Award points to user
   */
  async awardPoints(uid: string, amount: number) {
    // 1. Supabase update (Secondary Truth for now)
    if (supabase) {
      try {
        const { error } = await supabase.rpc('increment_xp', { user_id: uid, amount: amount });
        if (error) {
           // Fallback: manually update profile if RPC fails
           const { data: profile } = await supabase.from('profiles').select('xp').eq('id', uid).maybeSingle();
           if (profile) {
              await supabase.from('profiles').update({ 
                xp: (profile.xp || 0) + amount,
                updated_at: new Date().toISOString()
              }).eq('id', uid);
           }
        }
      } catch (err) {
        console.error("Supabase point award failed:", err);
      }
    }
    // 2. Firestore update (Primary Truth for many features)
    try {
      const userRef = doc(db, 'users', uid);
      await firestoreUpdateDoc(userRef, {
        totalPoints: increment(amount)
      });
    } catch (e) {
      console.warn("Firestore point award failed:", e);
    }
  },

  /**
   * Update streak info
   */
  async updateStreak(uid: string, count: number) {
    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ 
            streak: count, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', uid);
      } catch (err) {}
    }
  },

  /**
   * Add focus minutes
   */
  async addFocusMinutes(uid: string, minutes: number) {
    if (supabase) {
      try {
        await supabase.rpc('increment_focus_minutes', { user_id: uid, amount: minutes });
        return true;
      } catch (err) {}
    }
    return false;
  },

  /**
   * Update profile fields specifically
   */
  async updateProfile(uid: string, data: any) {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', uid);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error("Supabase profile update failed:", err);
      }
    }
    return false;
  },

  /**
   * Get user post count
   */
  async getUserPostCount(uid: string) {
    if (supabase) {
      try {
        const { count, error } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', uid);
        if (!error) return count || 0;
      } catch (err) {}
    }
    return 0;
  },

  /**
   * Replies
   */
  async getReplies(postId: string) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('replies')
          .select(`
            *,
            profiles:author_id (
              display_name,
              photo_url
            )
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: true });
        
        if (data && !error) {
          return data.map((d: any) => ({
            ...d,
            userName: d.profiles?.display_name || 'Student',
            userPhoto: d.profiles?.photo_url || '',
            userId: d.author_id
          }));
        }
      } catch (err) {}
    }
    return [];
  },

  async addReply(uid: string, postId: string, content: string) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('replies')
          .insert([{
            post_id: postId,
            author_id: uid,
            content: content,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (!error) {
          // Increment reply count on post
          await supabase.rpc('increment_reply_count', { post_id: postId });
          return data;
        }
      } catch (err) {}
    }
    return null;
  },

  async markBestReply(postId: string, replyId: string) {
    if (supabase) {
      try {
        // 1. Unmark previous best if any
        await supabase
          .from('replies')
          .update({ is_best: false })
          .eq('post_id', postId);
        
        // 2. Mark new best
        await supabase
          .from('replies')
          .update({ is_best: true })
          .eq('id', replyId);
        
        // 3. Mark post as solved
        await supabase
          .from('posts')
          .update({ is_solved: true, best_reply_id: replyId })
          .eq('id', postId);
        
        return true;
      } catch (err) {}
    }
    return false;
  },

  /**
   * Schedules (Study Plans)
   */
  async getSchedules(uid: string) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from('schedules')
          .select('*')
          .eq('user_id', uid)
          .order('date', { ascending: true });
        if (data) return data;
      } catch (err) {}
    }
    return [];
  },

  async saveSchedule(uid: string, schedule: any) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('schedules')
          .upsert({
            id: schedule.id || undefined,
            user_id: uid,
            title: schedule.title,
            subject: schedule.subject,
            date: schedule.date,
            time: schedule.time,
            type: schedule.type,
            completed: schedule.completed || false,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        if (!error) return data;
      } catch (err) {}
    }
    return null;
  },

  async deleteSchedule(id: string) {
    if (supabase) {
      try {
        await supabase.from('schedules').delete().eq('id', id);
        return true;
      } catch (err) {}
    }
    return false;
  },

  /**
   * Free Resources Management
   */
  async getFreeResources(classLevel?: string) {
    if (!supabase) return [];
    try {
      let queryBuilder = supabase.from('free_resources').select('*').order('created_at', { ascending: false });
      if (classLevel && classLevel !== 'All') {
        queryBuilder = queryBuilder.eq('class_level', classLevel);
      }
      const { data, error } = await queryBuilder;
      if (error) {
        if (error.code === 'PGRST205') console.warn("Free Resources table not yet created.");
        throw error;
      }
      return data || [];
    } catch (err) {
      console.error("Fetch free resources failed:", err);
      return [];
    }
  },

  async saveFreeResource(resource: any) {
    if (!supabase) return { success: false, error: 'No connection' };
    try {
      // Build clean payload without id for new resources to allow DB to auto-generate UUID
      const payload: any = {
        subject: resource.subject,
        class_level: resource.class_level,
        description: resource.description,
        drive_link: resource.drive_link,
        password: resource.password,
        cover_url: resource.cover_url
      };
      
      // Only include ID if we are UPDATING an existing record
      if (resource.id && resource.id !== 'undefined' && resource.id !== 'null') {
        payload.id = resource.id;
      }

      const { data, error } = await supabase
        .from('free_resources')
        .upsert([payload])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("Save free resource failed:", err);
      return { success: false, error: err.message };
    }
  },

  async deleteFreeResource(id: string) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('free_resources').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Delete free resource failed:", err);
      return false;
    }
  },

  /**
   * Supabase Storage Upload
   */
  async uploadImage(file: File, bucket: string = 'assets') {
    if (!supabase) return { success: false, error: 'Supabase not initialized' };
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        // If bucket doesn't exist, this might fail. We should ideally check or ensure it.
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl };
    } catch (err: any) {
      console.error("Upload failed:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Story Unlock System
   */
  async getStoryTemplates(onlyActive: boolean = true) {
    if (!supabase) return [];
    try {
      let query = supabase
        .from('story_templates')
        .select('*');
      
      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        imageUrl: t.image_url,
        link: t.link,
        isActive: t.is_active,
        createdAt: t.created_at
      } as StoryTemplate));
    } catch (err) {
      console.error("Fetch templates failed:", err);
      return [];
    }
  },

  async isResourceUnlocked(uid: string, resourceId: string) {
    if (!supabase || !uid || uid === 'GUEST') return false;
    try {
      const { data, error } = await supabase
        .from('story_unlocks')
        .select('id')
        .eq('user_id', uid)
        .eq('resource_id', resourceId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error("Check unlock failed:", err);
      return false;
    }
  },

  async recordStoryUnlock(uid: string, resourceId: string, templateId: string, aiMetadata: any) {
    if (!uid || uid === 'GUEST' || uid === 'undefined' || uid === 'null') {
      console.error("Record unlock failed: Invalid user ID", { uid });
      return { success: false, error: "Invalid user session" };
    }

    const errors: string[] = [];
    let success = false;

    // 1. Try Supabase (Primary)
    if (supabase) {
      try {
        // A. Record the unlock
        const { error: unlockError } = await supabase
          .from('story_unlocks')
          .insert([{
            user_id: uid,
            resource_id: resourceId,
            template_id: templateId,
            status: 'approved',
            verified: true,
            created_at: new Date().toISOString()
          }]);

        if (unlockError) {
          console.warn("Supabase story_unlocks insert failed:", unlockError);
          errors.push(unlockError.message);
        } else {
          success = true;
        }

        // B. Record verification log (Optional, don't crash if fails)
        try {
          await supabase.from('verification_logs').insert([{
            user_id: uid,
            resource_id: resourceId,
            confidence_score: aiMetadata.confidence || 0,
            raw_ai_response: typeof aiMetadata.raw === 'string' ? aiMetadata.raw : JSON.stringify(aiMetadata.raw || {}),
            created_at: new Date().toISOString()
          }]);
        } catch (logErr) {
          console.warn("Optional verification log failed:", logErr);
        }

        // C. Update profile in Supabase
        try {
          const { data: profile } = await supabase.from('profiles').select('unlocked_resources').eq('id', uid).maybeSingle();
          const currentUnlocked = profile?.unlocked_resources || [];
          if (!currentUnlocked.includes(resourceId)) {
            await supabase.from('profiles').update({
              unlocked_resources: Array.from(new Set([...currentUnlocked, resourceId])),
              updated_at: new Date().toISOString()
            }).eq('id', uid);
          }
        } catch (profileErr) {
          console.warn("Supabase profile update failed during story unlock:", profileErr);
        }
      } catch (err: any) {
        console.error("Supabase recordStoryUnlock operation failed:", err);
        errors.push(err.message);
      }
    }

    // 2. Sync to Firestore (Backup/Fallback)
    try {
      // A. Record unlock in Firestore
      await addDoc(collection(db, 'story_unlocks'), {
        user_id: uid,
        resource_id: resourceId,
        template_id: templateId,
        verified: true,
        confidence: aiMetadata.confidence || 0,
        createdAt: serverTimestamp()
      });
      success = true; // If Firestore succeeds, we consider it a success

      // B. Update Firestore user doc
      try {
        const userRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const unlocked = userData.unlockedResources || [];
          if (!unlocked.includes(resourceId)) {
            await firestoreUpdateDoc(userRef, {
              unlockedResources: Array.from(new Set([...unlocked, resourceId])),
              updatedAt: serverTimestamp()
            });
          }
        } else {
          // Create minimal doc if missing
          await setDoc(userRef, {
            unlockedResources: [resourceId],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } catch (fsProfileErr) {
        console.warn("Firestore profile update failed during story unlock:", fsProfileErr);
      }
    } catch (fsErr: any) {
      console.error("Firestore recordStoryUnlock failed:", fsErr);
      errors.push(fsErr.message);
    }

    if (!success) {
      console.error("All database sync methods failed for recordStoryUnlock:", errors);
    }

    return { 
      success: success, 
      error: !success ? "Failed to record unlock in any database. Please check your connection." : undefined 
    };
  },

  // Admin Methods for Templates
  async addStoryTemplate(template: Partial<StoryTemplate>) {
    if (!supabase) return { success: false };
    try {
      const { data, error } = await supabase
        .from('story_templates')
        .insert([{
          title: template.title,
          description: template.description,
          image_url: template.imageUrl,
          link: template.link,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("Add template failed:", err);
      return { success: false, error: err.message };
    }
  },

  async updateStoryTemplate(id: string, updates: Partial<StoryTemplate>) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase
        .from('story_templates')
        .update({
          title: updates.title,
          description: updates.description,
          image_url: updates.imageUrl,
          link: updates.link,
          is_active: updates.isActive
        })
        .eq('id', id);
      
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("Update template failed:", err);
      return { success: false, error: err.message };
    }
  },

  async deleteStoryTemplate(id: string) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('story_templates').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Delete template failed:", err);
      return false;
    }
  },

  async getStoryUnlocksCount() {
    if (!supabase) return 0;
    try {
      const { count } = await supabase.from('story_unlocks').select('*', { count: 'exact', head: true });
      return count || 0;
    } catch (err) {
       return 0;
    }
  }
};
