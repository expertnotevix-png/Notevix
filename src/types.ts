export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  class?: string;
  class_level?: string;
  role: 'student' | 'admin';
  savedNotes: string[];
  notificationsEnabled?: boolean;
  studyModeEnabled?: boolean;
  streak: {
    currentCount: number;
    lastUpdateDate: string; // ISO date string
  };
  totalFocusMinutes: number;
  totalPoints: number;
  streakCount?: number;
  lastActive?: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  isPremium: boolean;
  planType?: string;
  unlockedClasses?: string[];
  unlockedResources?: string[];
  subscriptionExpiry?: string;
  instagramUsername?: string;
  createdAt: string;
  onboardingCompleted?: boolean;
}

export interface Message {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  message: string;
  status: 'pending' | 'replied';
  reply?: string;
  timestamp: string;
}

export interface ScheduleTask {
  id: string;
  userId: string;
  task: string;
  time: string;
  completed: boolean;
  date: string; // YYYY-MM-DD
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'streak' | 'rank' | 'system';
  read: boolean;
  timestamp: string;
}

export interface Chapter {
  id: string;
  class: string;
  subject: string;
  title: string;
  summary: string;
  keyPoints?: string[];
  formulas?: string[];
  diagrams?: string[];
  importantQuestions?: {
    question: string;
    answer: string;
  }[];
  pdfUrl?: string;
  coverUrl?: string;
  driveLink?: string;
  onePageNotesUrl?: string;
  fullNotesUrl?: string;
  importantQuestionsUrl?: string;
  examOrientedQuestionsUrl?: string;
  isPremium: boolean;
}

export interface Doubt {
  id: string;
  userId: string;
  query: string;
  response: string;
  timestamp: string;
}

export interface VerifiedPayment {
  id: string;
  transactionId: string;
  phoneNumber: string;
  amount: number;
  subject: string;
  createdAt: string;
}

export interface ValidPayment {
  id: string;
  transactionId: string;
  whatsapp: string;
  amount: number;
  isUsed: boolean;
  usedBy?: string;
  createdAt: string;
  usedAt?: string;
}

export interface TransactionLedger {
  id: string;
  transactionId: string;
  userId: string;
  whatsapp: string;
  amount: number;
  planId: string;
  timestamp: string;
  screenshotUrl?: string;
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
  createdAt?: string;
}

export interface PurchaseRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  email?: string; // For guests
  whatsapp?: string; // For guests
  planId: string;
  planName: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  timestamp: string;
  whatsappNumber?: string;
  planType?: 'subscription' | 'one-time';
  targetClass?: string;
  instagramUsername?: string;
  screenshotUrl?: string;
  isGuest?: boolean;
  source?: 'firebase' | 'supabase';
}
