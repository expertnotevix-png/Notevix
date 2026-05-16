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
  unlockPassword?: string;
  approved: boolean;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface PdfRequest {
  id: string;
  student_name: string;
  class_name: string;
  email: string;
  phone_number: string;
  instagram_username: string;
  requested_pdf: string;
  status: 'pending' | 'approved' | 'rejected';
  approved: boolean;
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
  title: string;
  subject: string;
  classLevel: string;
  price: number;
  description?: string;
  coverImage?: string;
  pdfLink?: string;
  unlockPassword?: string;
  isPremium: boolean;
  createdAt?: string;
}
