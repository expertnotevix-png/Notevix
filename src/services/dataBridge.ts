import { supabase } from '../lib/supabase';
import { SubjectResource, VerifiedPayment, PdfRequest, PromoBanner, AppSetting } from '../types';

export const dataBridge = {
  /**
   * Resources (subject_resources)
   */
  async getResources(classLevel?: string, isPremium?: boolean) {
    if (!supabase) return [];
    try {
      let query = supabase.from('subject_resources')
        .select('id, subject, class, description, drive_link, cover_image, price, pdf_password, is_premium, created_at')
        .order('created_at', { ascending: false });
      if (classLevel) query = query.eq('class', classLevel);
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
      // Explicitly pick only allowed columns for insertion
      const cleanData = {
        subject: res.subject,
        class: res.class,
        description: res.description,
        drive_link: res.drive_link,
        cover_image: res.cover_image,
        price: res.price,
        pdf_password: res.pdf_password,
        is_premium: res.is_premium,
        created_at: res.created_at || new Date().toISOString()
      };
      
      const { data, error } = await supabase.from('subject_resources')
        .insert(cleanData)
        .select('id, subject, class, description, drive_link, cover_image, price, pdf_password, is_premium, created_at')
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async updateResource(id: string, res: Partial<SubjectResource>) {
    if (!supabase) return { success: false };
    try {
      // Explicitly pick only allowed columns for updates
      const updateData: any = {};
      if (res.subject !== undefined) updateData.subject = res.subject;
      if (res.class !== undefined) updateData.class = res.class;
      if (res.description !== undefined) updateData.description = res.description;
      if (res.drive_link !== undefined) updateData.drive_link = res.drive_link;
      if (res.cover_image !== undefined) updateData.cover_image = res.cover_image;
      if (res.price !== undefined) updateData.price = res.price;
      if (res.pdf_password !== undefined) updateData.pdf_password = res.pdf_password;
      if (res.is_premium !== undefined) updateData.is_premium = res.is_premium;

      const { error } = await supabase.from('subject_resources')
        .update(updateData)
        .eq('id', id);
      
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

  async getPasswordByProductName(productName: string) {
    if (!supabase || !productName) return null;
    try {
      // product_name is usually "Subject Notes (Class Class)"
      // but it could also be a plan name like "Master Pack"
      // We try to extract the subject
      let subject = productName.split(' Notes')[0];
      
      // Fallback for custom plans if they match subject names
      const { data } = await supabase.from('subject_resources')
        .select('pdf_password')
        .eq('subject', subject)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data?.pdf_password || null;
    } catch (err) {
      return null;
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
  async getUserPayments(userId: string) {
    if (!supabase || !userId) return [];
    try {
      const { data } = await supabase.from('verified_payments')
        .select('*')
        .eq('user_id', userId)
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
