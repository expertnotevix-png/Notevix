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
  orderBy
} from 'firebase/firestore';
import { db, checkQuotaLock } from '../components/firebase';
import { supabase } from '../lib/supabase';
import { SubjectResource } from '../types';
import { resourcesData } from '../data/resources';

export const dataBridge = {
  /**
   * Syncs a Firebase user profile to Supabase
   * This bridges your Firebase login users into your Supabase database
   */
  async syncProfile(uid: string, profileData: any) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: uid,
          full_name: profileData.displayName || profileData.fullName || 'Student',
          email: profileData.email,
          avatar_url: profileData.photoURL || profileData.avatarUrl || '',
          class_level: profileData.class || profileData.classLevel || 'N/A',
          xp: profileData.totalPoints || profileData.xp || 0,
          streak: profileData.streak?.currentCount || profileData.streakCount || 0,
          is_premium: profileData.isPremium || false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      
      if (error) throw error;
    } catch (err) {
      console.error("Profile sync failed:", err);
    }
  },

  /**
   * Gets a user profile with Firebase fallback
   */
  async getProfile(uid: string) {
    // 1. Try Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();
        
        if (data) return data;
      } catch (err) {
        console.warn("Supabase profile fetch failed:", err);
      }
    }

    // 2. Try Firestore fallback
    if (true) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) return userDoc.data();
      } catch (err) {
        console.warn("Firestore profile fetch failed:", err);
      }
    }

    return null;
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
   * Get subject resources (Notes, etc)
   * Checks Supabase first, then local resources.json as a secondary safety.
   */
  async getResources(classLevel: string): Promise<SubjectResource[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subject_resources')
          .select('*')
          .eq('class', classLevel);
        
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            subject: d.subject,
            class: d.class,
            price: d.price,
            description: d.description,
            coverUrl: d.cover_url,
            driveLink: d.drive_link,
            isFree: d.is_free,
            features: d.features,
            createdAt: d.created_at
          })) as SubjectResource[];
        }
      } catch (err) {
        console.error("Supabase resource fetch failed:", err);
      }
    }

    // 2. Try Firestore fallback
    try {
      const q = query(collection(db, 'subject_resources'), where('class', '==', classLevel));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubjectResource));
      }
    } catch (err) {
      console.warn("Firestore resource fetch failed:", err);
    }

    // 3. Last Resort: Local JSON Fallback (always works)
    try {
      const response = await fetch('/data/resources.json');
      const jsonData = await response.json();
      const filtered = jsonData.resources.filter((r: any) => r.class === classLevel);
      return filtered.map((r: any) => ({
        ...r,
        subject: r.subject ? r.subject.charAt(0).toUpperCase() + r.subject.slice(1).toLowerCase() : 'Subject',
        price: r.price || 0,
        isFree: r.isFree !== undefined ? r.isFree : true,
        description: r.description || `Notes for Class ${classLevel} ${r.subject || ''}.`
      }));
    } catch (e) {
      console.warn("Fallback resources fetch failed:", e);
    }

    return [];
  },

  /**
   * Transaction Check
   */
  async isTransactionRedeemed(txId: string): Promise<boolean> {
    const finalTxId = txId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // 1. Check Supabase (Fastest)
    if (supabase) {
      try {
        const { data } = await supabase
          .from('purchase_requests')
          .select('id')
          .eq('transactionId', finalTxId)
          .maybeSingle();
        
        if (data) return true;
      } catch (err) {}
    }

    // 2. Check Firestore Registry (Global lock)
    try {
      const txDoc = await getDoc(doc(db, 'transaction_id_registry', finalTxId));
      if (txDoc.exists()) return true;
    } catch (err) {
      console.warn("Registry check failed:", err);
    }
    
    return false;
  },

  /**
   * Check if user is premium in Supabase (Truth source) or Firestore (Secondary)
   */
  async checkPremiumStatus(uid: string, email?: string): Promise<boolean> {
    // 1. Try Supabase First (Truth source, no limits)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', uid)
          .maybeSingle();
        
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

    // 2. Fallback to Firestore only if Supabase didn't confirm
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists() && userDoc.data()?.isPremium) return true;
      
      if (email) {
        const q = query(collection(db, 'purchase_requests'), where('email', '==', email), where('status', '==', 'approved'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) return true;
      }
    } catch (err) {
      console.warn("Firestore premium check failed:", err);
    }

    return false;
  },

  /**
   * Save a purchase request with transaction registry to prevent fraud
   */
  async savePurchaseRequest(requestData: any) {
    const txId = requestData.transactionId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // 1. Transaction Registry Lock (Firestore)
    // This prevents the same UTR from being used twice even if one database is down
    try {
      const txRef = doc(db, 'transaction_id_registry', txId);
      await setDoc(txRef, {
        userId: requestData.userId,
        email: requestData.email,
        amount: requestData.amount,
        createdAt: serverTimestamp(),
        planName: requestData.planName
      });
    } catch (err: any) {
      console.error("Registry Lock Failed:", err);
      if (err.message.includes("permission")) {
         return { success: false, error: "Transaction ID already used or access denied." };
      }
    }

    // 2. Save to Supabase (Truth source for admin)
    if (supabase) {
      try {
        const { error } = await supabase
          .from('purchase_requests')
          .insert([{
            user_id: requestData.userId,
            email: requestData.email,
            whatsapp: requestData.whatsapp,
            transactionId: txId,
            amount: requestData.amount,
            planId: requestData.planId,
            planName: requestData.planName,
            status: 'pending',
            created_at: new Date().toISOString()
          }]);
        
        if (!error) return { success: true, provider: 'supabase' };
      } catch (err) {
        console.warn("Supabase save failed:", err);
      }
    }

    // 3. Sync to Firestore purchase_requests
    try {
      await addDoc(collection(db, 'purchase_requests'), {
        ...requestData,
        transactionId: txId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      return { success: true, provider: 'firestore' };
    } catch (err: any) {
      console.error("Firestore Save Failed:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Resources
   */
  async getResourcesByClassAndSubject(classLevel: string, subjectId: string) {
    if (subjectId === 'all') {
      return resourcesData.resources.filter(r => r.class === classLevel);
    }
    return resourcesData.resources.filter(r => r.class === classLevel && r.subject === subjectId);
  },

  async getResourceById(noteId: string) {
    return resourcesData.resources.find(r => r.id === noteId) || null;
  },

  async searchResources(term: string) {
    const lowerTerm = term.toLowerCase();
    return resourcesData.resources.filter(r => 
      r.title?.toLowerCase().includes(lowerTerm) ||
      r.subject?.toLowerCase().includes(lowerTerm)
    ).slice(0, 30);
  },

  async getSavedNotes(noteIds: string[]) {
    if (!noteIds || noteIds.length === 0) return [];
    return resourcesData.resources.filter(r => noteIds.includes(r.id));
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
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, xp, streak, class_level')
          .order('xp', { ascending: false })
          .limit(limitCount);
        
        if (data) return data.map(d => ({
          uid: d.id,
          displayName: d.full_name || 'Student',
          photoURL: d.avatar_url || '',
          totalPoints: d.xp || 0,
          streak: d.streak || 0,
          class: d.class_level
        }));
      } catch (err) {
        console.error("Leaderboard fetch failed:", err);
      }
    }
    return [];
  },

  /**
   * Community Chat
   */
  async getChatMessages(limitCount = 50) {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('community_chat')
          .select(`
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limitCount);
        
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
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('community_chat')
          .insert([{
            user_id: uid,
            content: content,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        if (!error) return data;
      } catch (err) {}
    }
    return null;
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
    if (supabase) {
      try {
        await supabase.rpc('increment_xp', { user_id: uid, amount });
      } catch (err) {
        console.error("Supabase point award failed:", err);
      }
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
  }
};
