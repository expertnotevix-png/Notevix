export interface VerifiedPayment {
  id: string;
  user_id: string;
  email: string;
  phone_number?: string;
  transaction_id: string;
  amount: number;
  product_name: string;
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
  subject: string;
  class: string;
  description?: string;
  cover_image?: string;
  drive_link?: string;
  price: number;
  is_premium: boolean;
  pdf_password?: string;
  created_at: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  banner_image: string;
  redirect_link: string;
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
