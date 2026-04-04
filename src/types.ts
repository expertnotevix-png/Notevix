export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  class?: string;
  role: 'student' | 'admin';
  savedNotes: string[];
  createdAt: string;
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
