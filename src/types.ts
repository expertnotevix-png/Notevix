export interface VerifiedPayment {
  id: string;
  phone_number: string;
  transaction_id: string;
  amount: number;
  product_name: string;
  user_id?: string;
  status: string;
  unlock_password?: string;
  rejection_reason?: string;
  approved: boolean;
  created_at: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'student';
  class?: string;
  phone?: string;
}

export interface PdfRequest {
  id: string;
  student_name: string;
  class_name: string;
  email: string;
  phone_number: string;
  instagram_username: string;
  requested_pdf: string;
  status: string;
  approved: boolean;
  created_at: string;
}

export interface SubjectResource {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  description?: string;
  cover_image?: string;
  pdf_link?: string;
  price: number;
  is_premium: boolean;
  unlock_password?: string;
  created_at: string;
}

export interface PromoBanner {
  id: string;
  banner_image: string;
  location: string;
  is_active: boolean;
  created_at: string;
}

export interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
}
