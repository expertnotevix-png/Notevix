import { supabase } from '../lib/supabase';
import { UserProfile, SubjectResource, VerifiedPayment } from '../types';

const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const cache: Record<string, { data: any, timestamp: number }> = {};

const getCached = (key: string) => {
  const item = cache[key];
  if (item && Date.now() - item.timestamp < CACHE_TIME) {
    return item.data;
  }
  return null;
};

const setCache = (key: string, data: any) => {
  cache[key] = { data, timestamp: Date.now() };
};

export const dataBridge = {
  /**
   * Profiles
   */
  async getProfile(uid: string) {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Fetch profile failed:", err);
      return null;
    }
  },

  async syncProfile(uid: string, profile: Partial<UserProfile>) {
    if (!supabase) return;
    try {
      await supabase.from('profiles').upsert({
        id: uid,
        full_name: profile.displayName,
        avatar_url: profile.photoURL,
        email: profile.email,
        role: profile.role,
        is_premium: profile.isPremium,
        unlocked_resources: profile.unlockedResources || [],
        updated_at: new Date().toISOString()
      });
    } catch (err) {}
  },

  async updateProfile(uid: string, data: any) {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('profiles').update({
        ...data,
        updated_at: new Date().toISOString()
      }).eq('id', uid);
      if (error) throw error;
      return true;
    } catch (err) {
      return false;
    }
  },

  async getProfiles(limit = 100) {
    if (!supabase) return [];
    try {
      const { data } = await supabase.from('profiles').select('*').limit(limit).order('updated_at', { ascending: false });
      return (data || []).map(d => ({
        ...d,
        uid: d.id,
        displayName: d.full_name,
        photoURL: d.avatar_url,
        class: d.class_level,
        isPremium: d.is_premium
      }));
    } catch (err) {
      return [];
    }
  },

  /**
   * Resources (subject_resources)
   */
  async getResources(classLevel?: string, isPremium?: boolean) {
    if (!supabase) return [];
    try {
      let query = supabase.from('subject_resources').select('*').order('created_at', { ascending: false });
      if (classLevel) query = query.eq('class', classLevel);
      if (isPremium !== undefined) query = query.eq('is_free', !isPremium);
      const { data } = await query;
      return (data || []).map(d => this.mapResource(d));
    } catch (err) {
      return [];
    }
  },

  async addResource(res: any) {
    if (!supabase) return { success: false };
    try {
      const { data, error } = await supabase.from('subject_resources').insert(res).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateResource(id: string, res: any) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('subject_resources').update(res).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteResource(id: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('subject_resources').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

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
      isFree: d.is_free,
      createdAt: d.created_at
    };
  },

  /**
   * Banners (promotional_banners)
   */
  async getBanners(location?: string, all = false) {
    if (!supabase) return [];
    try {
      let query = supabase.from('promotional_banners').select('*').order('created_at', { ascending: false });
      if (!all) query = query.eq('is_active', true);
      if (location) query = query.eq('location', location);
      const { data } = await query;
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async addBanner(banner: any) {
    if (!supabase) return { success: false };
    try {
      const { data, error } = await supabase.from('promotional_banners').insert(banner).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateBanner(id: string, banner: any) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('promotional_banners').update(banner).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async deleteBanner(id: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('promotional_banners').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Verified Payments
   */
  async getVerifiedPayments(limit = 100) {
    if (!supabase) return [];
    try {
      const { data } = await supabase.from('verified_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      return (data || []).map(d => ({
        id: d.id,
        transactionId: d.transaction_id,
        userId: d.user_id,
        phoneNumber: d.phone_number,
        amount: d.amount,
        productName: d.product_name,
        status: d.status,
        passwordUnlocked: d.password_unlocked,
        verified: d.verified,
        createdAt: d.created_at
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  async getUserPayments(phoneNumber: string) {
    if (!supabase) return [];
    try {
      const { data } = await supabase.from('verified_payments')
        .select('*')
        .eq('phone_number', phoneNumber)
        .order('created_at', { ascending: false });
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async saveVerifiedPayment(payment: any) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('verified_payments').insert(payment);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async approvePurchase(id: string, passwordUnlocked: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('verified_payments').update({
        verified: true,
        status: 'approved',
        password_unlocked: passwordUnlocked,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async rejectPurchase(id: string, reason?: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('verified_payments').update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * PDF Requests
   */
  async getPdfRequests(status: string = 'pending') {
    if (!supabase) return [];
    try {
      const query = supabase.from('pdf_requests').select('*').order('created_at', { ascending: false });
      if (status !== 'all') query.eq('status', status);
      const { data } = await query;
      return data || [];
    } catch (err) {
      return [];
    }
  },

  async approvePdfRequest(id: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('pdf_requests').update({
        status: 'approved',
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async rejectPdfRequest(id: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('pdf_requests').update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Storage
   */
  async uploadImage(file: File, bucket: string = 'resources') {
    if (!supabase) return { success: false, error: 'Supabase not connected' };
    try {
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { success: true, url: publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Analytics
   */
  async getAdminStats() {
    const stats: any = { totalUsers: 0, premiumUsers: 0, newUsersToday: 0 };
    if (!supabase) return stats;
    try {
      const { count: total } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      stats.totalUsers = total || 0;
      const { count: premium } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);
      stats.premiumUsers = premium || 0;
      return stats;
    } catch (err) {
      return stats;
    }
  }
};
