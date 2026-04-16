export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  class?: string;
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
  unlockedClasses?: string[];
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
  keyPoints: string[];
  formulas: string[];
  diagrams: string[];
  importantQuestions: {
    question: string;
    answer: string;
  }[];
  pdfUrl?: string;
  isPremium: boolean;
}

export interface Doubt {
  id: string;
  userId: string;
  query: string;
  response: string;
  timestamp: string;
}

export interface SubjectResource {
  id: string;
  class: string;
  subject: string;
  onePageNotesUrl?: string;
  fullNotesUrl?: string;
  importantQuestionsUrl?: string;
  examOrientedQuestionsUrl?: string;
}

export interface PurchaseRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  amount: number;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  whatsappNumber?: string;
  planType?: 'subscription' | 'one-time';
  targetClass?: string;
  instagramUsername?: string;
}
