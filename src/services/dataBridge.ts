import { supabase } from '../lib/supabase';
import { SubjectResource, VerifiedPayment, PdfRequest, PromoBanner, AppSetting } from '../types';

export const dataBridge = {
  /**
   * Resources (subject_resources)
   */
  async getResources(classLevel?: string, isPremium?: boolean) {
    if (!supabase) return [];
    try {
      let query = supabase.from('subject_resources').select('*').order('created_at', { ascending: false });
      if (classLevel) query = query.eq('class_level', classLevel);
      if (isPremium !== undefined) query = query.eq('is_premium', isPremium);
      const { data } = await query;
      return (data || []) as SubjectResource[];
    } catch (err) {
      return [];
    }
  },

  async addResource(res: Partial<SubjectResource>) {
    if (!supabase) return { success: false };
    try {
      const { data, error } = await supabase.from('subject_resources').insert(res).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateResource(id: string, res: Partial<SubjectResource>) {
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
      return (data || []) as PromoBanner[];
    } catch (err) {
      return [];
    }
  },

  async addBanner(banner: Partial<PromoBanner>) {
    if (!supabase) return { success: false };
    try {
      const { data, error } = await supabase.from('promotional_banners').insert(banner).select().single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateBanner(id: string, banner: Partial<PromoBanner>) {
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
      return (data || []) as VerifiedPayment[];
    } catch (err) {
      return [];
    }
  },

  async saveVerifiedPayment(payment: Partial<VerifiedPayment>) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('verified_payments').insert(payment);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async approvePurchase(id: string, unlockPassword: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('verified_payments').update({
        approved: true,
        status: 'approved',
        unlock_password: unlockPassword
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
        rejection_reason: reason
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
      let query = supabase.from('pdf_requests').select('*').order('created_at', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);
      const { data } = await query;
      return (data || []) as PdfRequest[];
    } catch (err) {
      return [];
    }
  },

  async approvePdfRequest(id: string) {
    if (!supabase) return { success: false };
    try {
      const { error } = await supabase.from('pdf_requests').update({
        status: 'approved',
        approved: true
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
        approved: false
      }).eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * User Specific
   */
  async getUserPayments(phone: string) {
    if (!supabase || !phone) return [];
    try {
      const { data } = await supabase.from('verified_payments')
        .select('*')
        .eq('phone_number', phone)
        .order('created_at', { ascending: false });
      return (data || []) as VerifiedPayment[];
    } catch (err) {
      return [];
    }
  },

  /**
   * App Settings
   */
  async getSettings() {
    if (!supabase) return [];
    try {
      const { data } = await supabase.from('app_settings').select('*');
      return (data || []) as AppSetting[];
    } catch (err) {
      return [];
    }
  },

  /**
   * Storage
   */
  async uploadImage(file: File, bucket: 'Cover' | 'banners') {
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
   * Analytics (Basic)
   */
  async getAdminStats() {
    const stats: any = { totalRevenue: 0, premiumSales: 0, pendingRequests: 0 };
    if (!supabase) return stats;
    try {
        const { data: payments } = await supabase.from('verified_payments').select('amount, status, approved');
        if (payments) {
            stats.totalRevenue = payments.filter(p => p.approved).reduce((sum, p) => sum + (p.amount || 0), 0);
            stats.premiumSales = payments.filter(p => p.approved).length;
        }
        const { count } = await supabase.from('pdf_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        stats.pendingRequests = count || 0;
        return stats;
    } catch (err) {
      return stats;
    }
  }
};
