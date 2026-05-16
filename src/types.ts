export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  phoneNumber?: string;
  class?: string;
  class_level?: string;
  role: 'student' | 'admin';
  savedNotes: string[];
  isPremium: boolean;
  unlockedResources?: string[];
  createdAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  pdfUrl: string;
  isPremium: boolean;
}

export interface VerifiedPayment {
  id: string;
  transactionId: string;
  userId: string;
  phoneNumber: string;
  amount: number;
  productName: string;
  passwordUnlocked?: string;
  verified: boolean;
  status: string;
  createdAt: string;
}

export interface PdfRequest {
  id: string;
  full_name: string;
  class_level: string;
  email: string;
  phone_number: string;
  social_handle: string;
  resource_id: string;
  resource_name: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface PromoBanner {
  id: string;
  imageUrl: string;
  link?: string;
  location?: 'home' | 'landing';
  createdAt: string;
}

export interface SubjectResource {
  id: string;
  class: string;
  subject: string;
  onePageNotesUrl?: string;
  fullNotesUrl?: string;
  importantQuestionsUrl?: string;
  examOrientedQuestionsUrl?: string;
  coverUrl?: string;
  driveLink?: string;
  price?: number;
  description?: string;
  features?: string[];
  isFree?: boolean;
  password?: string;
  createdAt?: string;
}
