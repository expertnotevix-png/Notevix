import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, query, where, limit, orderBy, onSnapshot, serverTimestamp, writeBatch, getCountFromServer } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, checkQuotaLock, clearQuotaLock } from '../components/firebase';
import { dataBridge } from '../services/dataBridge';
import { geminiService } from '../services/geminiService';
import { Chapter, Message, Notification, PurchaseRequest, UserProfile, ValidPayment, TransactionLedger, VerifiedPayment } from '../types';
import { 
  Plus, Trash2, Edit2, Save, X, ChevronLeft, Database, 
  MessageSquare, Bell, Send, CheckCircle2, Clock, ShieldCheck,
  Shield, RefreshCw, CreditCard, Check, XCircle, Users, 
  Instagram, LayoutDashboard, BarChart3, Settings, Menu, LogOut, Search, TrendingUp, DollarSign, UserCheck,
  BookOpen, Zap, AlertCircle, AlertTriangle, Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ModerationTab from '../components/community/ModerationTab';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

import { supabase } from '../lib/supabase';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'chapters' | 'messages' | 'notifications' | 'moderation' | 'payments' | 'users' | 'registry' | 'resources' | 'valid_payments' | 'verified_payments' | 'settings' | 'banners' | 'free_notes' | 'story_unlocks' | 'story_logs'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [subjectResources, setSubjectResources] = useState<any[]>([]);
  const [freeResources, setFreeResources] = useState<any[]>([]);
  const [validPayments, setValidPayments] = useState<ValidPayment[]>([]);
  const [verifiedPayments, setVerifiedPayments] = useState<VerifiedPayment[]>([]);
  const [transactionLedger, setTransactionLedger] = useState<TransactionLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [resourceCoverPreview, setResourceCoverPreview] = useState<string | null>(null);
  const [isAddingManualPayment, setIsAddingManualPayment] = useState(false);
  const [manualPaymentData, setManualPaymentData] = useState({
    transactionId: '',
    phoneNumber: '',
    amount: '39',
    subject: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewResourceMode, setViewResourceMode] = useState<'premium' | 'free'>('premium');
  const [banners, setBanners] = useState<any[]>([]);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [bannerFormData, setBannerFormData] = useState({ imageUrl: '', link: '', location: 'home' });
  const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
  const [storyTemplates, setStoryTemplates] = useState<any[]>([]);
  const [storyLogs, setStoryLogs] = useState<any[]>([]);
  const [isAddingStoryTemplate, setIsAddingStoryTemplate] = useState(false);
  const [storyTemplateForm, setStoryTemplateForm] = useState({ title: '', description: '', link: '', imageUrl: '' });
  const [storyTemplateImagePreview, setStoryTemplateImagePreview] = useState<string | null>(null);
  const [storyStats, setStoryStats] = useState({ totalUnlocks: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const lastAdminAiAttemptRef = useRef<number>(0);
  
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const freeNoteInputRef = useRef<HTMLInputElement>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Red Team Audit Status State
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    salesCount: 0,
    totalUsers: 0,
    premiumUsers: 0,
    newUsersToday: 0,
    activeToday: 0,
    dailyRevenue: [] as any[],
    planDistribution: [] as any[],
    burnedIds: 0,
  });

  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'info' as const });

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'chapters') fetchChapters();
    if (activeTab === 'messages') fetchMessages();
    if (activeTab === 'notifications') fetchNotifications();
    if (activeTab === 'payments') {
      fetchPurchaseRequests();
      fetchRegistry();
    }
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'registry') fetchRegistry();
    if (activeTab === 'resources') fetchSubjectResources();
    if (activeTab === 'banners') fetchBanners();
    if (activeTab === 'free_notes') fetchFreeResources();
    if (activeTab === 'valid_payments') {
      fetchValidPayments();
      fetchTransactionLedger();
    }
    if (activeTab === 'verified_payments') {
      fetchVerifiedPayments();
    }
    if (activeTab === 'story_unlocks') {
      fetchStoryTemplates();
      fetchStoryStats();
    }
    if (activeTab === 'story_logs') {
      fetchStoryLogs();
    }
  }, [activeTab]);

  const fetchStoryLogs = async () => {
    setLoading(true);
    try {
      const data = await dataBridge.getStoryLogs(100);
      setStoryLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoryTemplates = async () => {
    setLoading(true);
    try {
      const data = await dataBridge.getStoryTemplates(false);
      setStoryTemplates(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load story templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchStoryStats = async () => {
    try {
      const count = await dataBridge.getStoryUnlocksCount();
      setStoryStats({ totalUnlocks: count });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStoryTemplateImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image too large (Max 2MB)');
        return;
      }

      setIsUploading(true);
      const loadingToast = toast.loading("Uploading template to Supabase...");

      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1280;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
            }
            
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (blob) {
              const uploadRes = await dataBridge.uploadImage(new File([blob], file.name, { type: 'image/jpeg' }), 'story-templates');
              if (uploadRes.success && uploadRes.url) {
                setStoryTemplateImagePreview(uploadRes.url);
                toast.success("Template uploaded!", { id: loadingToast });
              } else {
                toast.error(`Upload failed: ${uploadRes.error}`, { id: loadingToast });
              }
            }
            setIsUploading(false);
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Template upload error:", err);
        toast.error("Process failed", { id: loadingToast });
        setIsUploading(false);
      }
    }
  };

  const handleAddStoryTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTemplateForm.title || !storyTemplateImagePreview || !storyTemplateForm.link) {
      toast.error("Title, Image and Link are required");
      return;
    }
    setLoading(true);
    try {
      const res = await dataBridge.addStoryTemplate({
        title: storyTemplateForm.title,
        description: storyTemplateForm.description,
        link: storyTemplateForm.link,
        imageUrl: storyTemplateImagePreview,
        isActive: true
      });
      if (res.success) {
        toast.success("Story Template Added!");
        setIsAddingStoryTemplate(false);
        setStoryTemplateForm({ title: '', description: '', link: '', imageUrl: '' });
        setStoryTemplateImagePreview(null);
        fetchStoryTemplates();
      } else {
        toast.error(res.error || "Failed to add template");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving story template");
    } finally {
      setLoading(false);
    }
  };

  const fetchVerifiedPayments = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase.from('verified_payments').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          setVerifiedPayments(data.map(d => ({
            id: d.id,
            transactionId: d.transaction_id,
            userId: d.user_id || 'GUEST',
            phoneNumber: d.phone_number,
            amount: d.amount,
            subject: d.subject,
            verified: d.verified ?? true,
            createdAt: d.created_at
          })));
          return;
        }
      }
      // Fallback
      const q = query(collection(db, 'verified_payments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setVerifiedPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VerifiedPayment)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPaymentData.transactionId || !manualPaymentData.phoneNumber || !manualPaymentData.subject) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await dataBridge.saveVerifiedPayment({
        transactionId: manualPaymentData.transactionId.trim(),
        phoneNumber: manualPaymentData.phoneNumber.trim(),
        amount: Number(manualPaymentData.amount),
        subject: manualPaymentData.subject.trim(),
        userId: 'ADMIN_MANUAL',
        verified: true
      });
      if (res.success) {
        toast.success("Manual Payment Recorded!");
        setIsAddingManualPayment(false);
        setManualPaymentData({ transactionId: '', phoneNumber: '', amount: '39', subject: '' });
        fetchVerifiedPayments();
        fetchAnalytics();
      } else {
        toast.error(res.error || "Failed to record payment");
      }
    } catch (err) {
      toast.error("Error recording payment");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionLedger = async () => {
    try {
      const q = query(collection(db, 'transaction_ledger'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setTransactionLedger(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionLedger)));
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'transaction_ledger');
      console.error(e);
    }
  };

  const fetchValidPayments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'valid_payments'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setValidPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ValidPayment)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'valid_payments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addValidPayment = async () => {
    const txId = window.prompt("Enter Transaction ID (UTR):");
    const whatsapp = window.prompt("Enter WhatsApp Code/Phone:");
    const amount = window.prompt("Amount paid?");
    
    if (txId && whatsapp) {
      try {
        // Sync to Supabase if available
        if (supabase) {
          const { error } = await supabase.from('valid_payments').insert([{
            transaction_id: txId.trim(),
            whatsapp: whatsapp.trim(),
            amount: Number(amount) || 0,
            is_used: false,
            created_at: new Date().toISOString()
          }]);
          if (error) console.warn("Supabase whitelist sync failed:", error);
        }

        await addDoc(collection(db, 'valid_payments'), {
          transactionId: txId.trim(),
          whatsapp: whatsapp.trim(),
          amount: Number(amount) || 0,
          isUsed: false,
          createdAt: new Date().toISOString()
        });
        toast.success("Payment Whitelisted!");
        fetchValidPayments();
      } catch (e) {
        toast.error("Failed to add.");
      }
    }
  };

  const handleResourceCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image too large (Max 2MB)');
        return;
      }

      setIsUploading(true);
      const loadingToast = toast.loading("Uploading image to Supabase...");

      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const img = new Image();
          img.onload = async () => {
            // Compress image to manageable size for Storage (HD Quality)
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1280; // Reduced resolution as per request
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
            }
            
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (blob) {
              const uploadRes = await dataBridge.uploadImage(new File([blob], file.name, { type: 'image/jpeg' }), 'resource-covers');
              if (uploadRes.success && uploadRes.url) {
                setResourceCoverPreview(uploadRes.url);
                toast.success("Image uploaded successfully!", { id: loadingToast });
              } else {
                toast.error(`Upload failed: ${uploadRes.error || 'Check Supabase bucket'}`, { id: loadingToast });
              }
            }
            setIsUploading(false);
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Upload process error:", err);
        toast.error("Process failed", { id: loadingToast });
        setIsUploading(false);
      }
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceFormData.subject || !resourceFormData.class) {
      toast.error("Please fill required fields.");
      return;
    }

    setLoading(true);
    try {
      const resourceData = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        subject: resourceFormData.subject,
        class: resourceFormData.class,
        price: Number(resourceFormData.price) || 0,
        description: resourceFormData.description || 'Premium curated digital resources for board prep.',
        coverUrl: resourceCoverPreview || '',
        driveLink: resourceFormData.driveLink || '',
        features: ['Chapter-wise Notes', 'PYQs Included', 'AI Doubt Support'],
        isFree: Number(resourceFormData.price) === 0,
        createdAt: new Date().toISOString()
      };

      // STRICT Supabase for Resources (Primary)
      if (supabase) {
        // Construct clean DB record
        const dbRecord: any = {
          subject: resourceData.subject,
          class: resourceData.class,
          price: resourceData.price,
          description: resourceData.description,
          cover_url: resourceData.coverUrl,
          drive_link: resourceData.driveLink,
          is_free: resourceData.isFree,
          features: JSON.stringify(resourceData.features),
          created_at: resourceData.createdAt
        };

        // Only include ID if updating
        if (resourceData.id) {
          dbRecord.id = resourceData.id;
          const { error } = await supabase.from('subject_resources').upsert([dbRecord]);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('subject_resources').insert([dbRecord]);
          if (error) throw error;
        }
        
        toast.success(resourceData.id ? "Resource Updated!" : "Resource Created Successfully!");
      } else {
        // Fallback to Firestore
        try {
          await addDoc(collection(db, 'subject_resources'), resourceData);
          toast.success("Resource Created!");
        } catch (e) {
          throw e;
        }
      }
      setIsAddingResource(false);
      setResourceCoverPreview(null);
      setResourceFormData({
        subject: '',
        class: '10',
        price: '',
        description: '',
        driveLink: ''
      });
      fetchSubjectResources();
    } catch (error: any) {
      console.error("Resource Creation Error:", error);
      // Extra error parsing for Supabase schema issues
      const msg = error.message || "Failed to create book.";
      toast.error(`Database Error: ${msg}`, { duration: 6000 });
      if (msg.includes('relation "subject_resources" does not exist')) {
        toast.info("FIX: Go to Supabase SQL Editor and run the table creation SQL I just provided.", { duration: 10000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFreeResources = async () => {
    setLoading(true);
    try {
      const data = await dataBridge.getFreeResources();
      setFreeResources(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load free notes");
    } finally {
      setLoading(false);
    }
  };

  const [freeResourceFormData, setFreeResourceFormData] = useState({
    subject: '',
    class_level: '10',
    description: '',
    drive_link: '',
    password: 'notevixfreenotes',
    cover_url: ''
  });

  const handleFreeResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeResourceFormData.subject || !freeResourceFormData.drive_link) {
      toast.error("Subject and Link are required");
      return;
    }
    setLoading(true);
    try {
      const res = await dataBridge.saveFreeResource({
        ...freeResourceFormData,
        id: editingResource?.id
      });
      if (res.success) {
        toast.success(editingResource ? "Free Note Updated!" : "Free Note Added!");
        setIsAddingResource(false);
        setEditingResource(null);
        setResourceCoverPreview(null);
        setFreeResourceFormData({ subject: '', class_level: '10', description: '', drive_link: '', password: 'notevixfreenotes', cover_url: '' });
        fetchFreeResources();
      } else {
        toast.error(res.error || "Operation failed");
      }
    } catch (err) {
      toast.error("Error saving free resource");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFreeResource = async (id: string) => {
    if (!window.confirm("Delete this free resource?")) return;
    try {
      const res = await dataBridge.deleteFreeResource(id);
      if (res) {
        toast.success("Deleted successfully");
        fetchFreeResources();
      }
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('promo_banners')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          setBanners(data.map(b => ({
            id: b.id,
            imageUrl: b.image_url || b.imageUrl,
            link: b.link,
            location: b.location,
            createdAt: b.created_at || b.createdAt
          })));
          return;
        }
      }
      
      // Fallback
      const q = query(collection(db, 'promo_banners'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image too large (Max 2MB)');
        return;
      }

      setIsUploading(true);
      const loadingToast = toast.loading("Uploading banner to Supabase...");

      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1280; // Reduced resolution
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
            }
            
            const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (blob) {
              const uploadRes = await dataBridge.uploadImage(new File([blob], file.name, { type: 'image/jpeg' }), 'banners');
              if (uploadRes.success && uploadRes.url) {
                setBannerImagePreview(uploadRes.url);
                toast.success("Banner uploaded!", { id: loadingToast });
              } else {
                toast.error(`Upload failed: ${uploadRes.error || 'Check Supabase bucket'}`, { id: loadingToast });
              }
            }
            setIsUploading(false);
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Banner upload error:", err);
        toast.error("Process failed", { id: loadingToast });
        setIsUploading(false);
      }
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerFormData.imageUrl && !bannerImagePreview) {
      toast.error("Please provide an image URL or upload from gallery");
      return;
    }
    setLoading(true);
    try {
      const finalImageUrl = bannerImagePreview || bannerFormData.imageUrl;
      
      if (supabase) {
        const { error } = await supabase.from('promo_banners').insert([{
          image_url: finalImageUrl,
          link: bannerFormData.link,
          location: bannerFormData.location,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
      } else {
        await addDoc(collection(db, 'promo_banners'), {
          ...bannerFormData,
          imageUrl: finalImageUrl,
          createdAt: new Date().toISOString()
        });
      }
      
      // Invalidate cache
      localStorage.removeItem('cached_promo_banners_home');
      localStorage.removeItem('cached_promo_banners_landing');
      
      toast.success("Banner added!");
      setIsAddingBanner(false);
      setBannerFormData({ imageUrl: '', link: '', location: 'home' });
      setBannerImagePreview(null);
      fetchBanners();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add banner");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      if (supabase && typeof id === 'string' && id.includes('-')) {
        await supabase.from('promo_banners').delete().eq('id', id);
      } else {
        await deleteDoc(doc(db, 'promo_banners', id));
      }
      toast.success("Banner deleted");
      fetchBanners();
    } catch (e) {
      toast.error("Failed to delete banner");
    }
  };

  const fetchSubjectResources = async () => {
    setLoading(true);
    try {
      let data = [];
      // STRICT Supabase (Primary)
      if (supabase) {
        try {
          const { data: sbData, error } = await supabase.from('subject_resources').select('*').order('subject', { ascending: true });
          if (error) throw error;
          data = (sbData || []).map((d: any) => dataBridge.mapResource(d));
        } catch (err) {
          console.warn("Supabase resource fetch failed, trying Firestore...");
        }
      }
      
      // Firestore Fallback (if Supabase is missing or failed)
      if (data.length === 0) {
        try {
          const q = query(collection(db, 'subject_resources'), orderBy('subject', 'asc'));
          const snap = await getDocs(q);
          data = snap.docs.map(doc => dataBridge.mapResource({ id: doc.id, ...doc.data() }));
        } catch (e) {
          console.warn("Firestore resource fetch failed");
        }
      }
      
      setSubjectResources(data);
    } catch (error) {
      console.error("Resource fetch failed:", error);
      toast.error("Could not fetch resources from Supabase.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      // 1. Fetch Students Stats from Profiles (Supabase)
      const { count: totalStudents } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const { count: newToday } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('created_at', today.toISOString());
      
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: active24h } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('updated_at', dayAgo);

      // 2. Fetch All Verified Payments
      const { data: vPayments, error: vError } = await supabase
        .from('verified_payments')
        .select('*')
        .order('created_at', { ascending: true });

      if (vError) throw vError;

      // 3. Simple Count of Burned IDs (Registry)
      const { count: burnedCount } = await supabase.from('transaction_id_registry').select('*', { count: 'exact', head: true });

      // 4. Process Payment Analytics
      let totalRev = 0;
      const dailyMap: Record<string, number> = {};
      const planMap: Record<string, number> = { 'Single Subject (₹39)': 0, 'All Subjects (₹99)': 0 };
      const uniquePhones = new Set();

      vPayments?.forEach((p: any) => {
        const amt = Number(p.amount) || 0;
        totalRev += amt;
        uniquePhones.add(p.phone_number);
        
        // Growth Chart
        const date = new Date(p.created_at).toLocaleDateString();
        dailyMap[date] = (dailyMap[date] || 0) + amt;
        
        // Plan Distribution
        if (amt === 39) planMap['Single Subject (₹39)']++;
        else if (amt === 99) planMap['All Subjects (₹99)']++;
        else {
          const label = `Other (₹${amt})`;
          planMap[label] = (planMap[label] || 0) + 1;
        }
      });

      // Format Charts
      const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount })).slice(-7);
      const planDistribution = Object.entries(planMap).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));

      setAnalyticsData({
        totalRevenue: totalRev,
        salesCount: vPayments?.length || 0,
        totalUsers: totalStudents || 0,
        premiumUsers: uniquePhones.size,
        newUsersToday: newToday || 0,
        activeToday: active24h || 0,
        dailyRevenue,
        planDistribution,
        burnedIds: burnedCount || 0
      });

    } catch (error) {
      console.error("Analytics fetch failed:", error);
      toast.error("Failed to load real-time analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleResetAnalytics = async () => {
    if (!window.confirm("CRITICAL: This will archive all current approved sales and reset Revenue/Sales to 0 for the dashboard display. The users will NOT lose access, but the stats will clear. Continue?")) return;
    
    const loadingToast = toast.loading("Resetting analytics...");
    try {
      // Optimistic Reset: Fetching in chunks to prevent quota spikes
      const q = query(
        collection(db, 'purchase_requests'), 
        where('status', '==', 'approved'),
        limit(200)
      );
      
      let processedCount = 0;
      let hasMore = true;

      while (hasMore) {
        const snap = await getDocs(q);
        if (snap.empty) {
          hasMore = false;
          break;
        }

        const batch = writeBatch(db);
        snap.docs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'archived',
            archivedAt: new Date().toISOString()
          });
        });

        await batch.commit();
        processedCount += snap.size;
        
        // If we got exactly 200, there's likely more, but let's pause a bit to stay under rate limits
        if (snap.size < 200) {
          hasMore = false;
        } else {
          await new Promise(r => setTimeout(r, 500)); // Small cooldown
        }
      }
      
      toast.dismiss(loadingToast);
      if (processedCount === 0) {
        toast.info("No approved sales to reset.");
      } else {
        toast.success(`Reset complete! Archived ${processedCount} records.`);
      }
      fetchAnalytics();
    } catch (error) {
      console.error("Reset analytics error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'purchase_requests/reset');
      toast.dismiss(loadingToast);
      toast.error("Failed to reset analytics. Check console for details.");
    }
  };

  const handleEmergencyReset = () => {
    if (!window.confirm("This will refresh the page to resolve minor issues. Proceed?")) return;
    window.location.reload();
  };

  const fetchRegistry = async () => {
    setLoading(true);
    try {
      if (false) return;
      const q = query(collection(db, 'transaction_id_registry'), orderBy('usedAt', 'desc'), limit(100));
      const snap = await getDocs(q);
      setRegistry(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'transaction_id_registry');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Try Supabase first
      const sbUsers = await dataBridge.getProfiles(100);
      if (sbUsers && sbUsers.length > 0) {
        setAllUsers(sbUsers as any);
        setLoading(false);
        return;
      }

      // 2. Fallback to Firestore
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState<Partial<Chapter>>({
    class: '10',
    subject: 'maths',
    title: '',
    summary: '',
    keyPoints: [],
    formulas: [],
    importantQuestions: [],
    isPremium: false,
  });

  const [resourceFormData, setResourceFormData] = useState({
    subject: '',
    class: '10',
    price: '',
    description: '',
    driveLink: ''
  });

  useEffect(() => {
    fetchChapters();
  }, []);

  const [activeUsers, setActiveUsers] = useState(0);
  const [aiStatus, setAiStatus] = useState<{ status: 'checking' | 'ok' | 'error', message?: string }>({ status: 'checking' });

  useEffect(() => {
    // Check for active users (One-time fetch to save quota)
    const checkActiveUsers = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const q = query(
          collection(db, 'users'),
          where('lastActive', '>=', fiveMinutesAgo)
        );
        const snapshot = await getCountFromServer(q);
        setActiveUsers(snapshot.data().count);
      } catch (error) {
        console.warn("Active users check error:", error);
      }
    };

    checkActiveUsers();
    // Re-check every 5 minutes if tab is active
    const interval = setInterval(checkActiveUsers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initial check: just verify key presence without calling API to save quota
    const apiKey = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      setAiStatus({ status: 'error', message: 'API Key Missing' });
    } else {
      setAiStatus({ status: 'ok', message: 'Key Configured' });
    }
  }, []);

  const testAI = async () => {
    setAiStatus({ status: 'checking', message: 'Testing...' });
    try {
      // Test with a tiny prompt
      await geminiService.chatWithBot("hi", []);
      setAiStatus({ status: 'ok', message: 'AI Online' });
    } catch (err: any) {
      setAiStatus({ status: 'error', message: err.message || 'AI Offline' });
    }
  };

  const fetchChapters = async () => {
    try {
      if (false) return;
      const querySnapshot = await getDocs(collection(db, 'chapters'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
      setChapters(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'chapters'), formData);
      setIsAdding(false);
      setFormData({
        class: '10',
        subject: 'maths',
        title: '',
        summary: '',
        keyPoints: [],
        formulas: [],
        importantQuestions: [],
        isPremium: false,
      });
      fetchChapters();
    } catch (error) {
      console.error("Error adding chapter:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this chapter?")) {
      await deleteDoc(doc(db, 'chapters', id));
      fetchChapters();
    }
  };

  const addSampleData = async () => {
    const chapterSamples = [
      {
        class: '9',
        subject: 'maths',
        title: 'Number Systems',
        summary: 'Introduction to real numbers.',
        keyPoints: ['Rational numbers', 'Irrational numbers', 'Real numbers'],
        formulas: [],
        importantQuestions: [{ question: 'Is zero a rational number?', answer: 'Yes.' }],
        isPremium: false
      }
    ];

    for (const sample of chapterSamples) {
      const q = query(collection(db, 'chapters'), where('title', '==', sample.title), where('class', '==', sample.class));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'chapters'), sample);
      }
    }

    toast.success("Chapter samples synchronized!");
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(data);
    } catch (error: any) {
      console.warn("Firestore messages fetch failed (likely quota)");
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
    } catch (error: any) {
      console.warn("Firestore notifications fetch failed (likely quota)");
    } finally {
      setLoading(false);
    }
  };

  const handleAIVerify = async (req: PurchaseRequest) => {
    if (!req.screenshotUrl) {
      toast.error("No screenshot provided for this request.");
      return;
    }
    
    // Admin Quota Protection
    const now = Date.now();
    if (now - lastAdminAiAttemptRef.current < 4000) {
      toast.error("AI is cooling down. Please wait 4 seconds.");
      return;
    }
    lastAdminAiAttemptRef.current = now;
    
    setLoading(true);
    const toastId = toast.loading("Verifying payment...");
    try {
      const result = await geminiService.verifyPaymentScreenshot(req.screenshotUrl, req.amount, req.planName, "ADMIN_AUDIT");
      
      if (result.verified) {
        toast.dismiss(toastId);
        
        // Anti-fraud: check if already used
        const isRedeemed = await dataBridge.isTransactionRedeemed(result.transactionId || "");
        if (isRedeemed) {
           toast.error("AI Alert: This Transaction ID has already been redeemed in another request!", { duration: 8000 });
           return;
        }

        toast.success(`AI Verified: ₹${result.amount} Match! Transaction: ${result.transactionId}`, { duration: 6000 });
        
        // Show a confirm dialog to auto-approve
        if (window.confirm(`AI recommends APPROVING this. \n\nAmount Found: ₹${result.amount}\nID Found: ${result.transactionId}\nRequest ID: ${req.transactionId}\n\nProceed with Auto-Approval?`)) {
          await handleApprovePurchase(req);
        }
      } else {
        toast.dismiss(toastId);
        toast.error(`AI Rejection: ${result.reason || "Receipt looks invalid or incomplete."}`, { duration: 8000 });
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error("AI Audit failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseRequests = async () => {
    setLoading(true);
    try {
      let data: any[] = [];

      // 1. Fetch from Supabase (Primary - No Quota issues)
      if (supabase) {
        try {
          const { data: sbData, error } = await supabase
            .from('purchase_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
          
          if (!error && sbData) {
            data = sbData.map(d => ({ 
              ...d, 
              source: 'supabase',
              timestamp: d.created_at || d.timestamp,
              transactionId: d.transactionId || d.transaction_id
            } as any));
          }
        } catch (e) {
          console.warn("Supabase purchase fetch failed:", e);
        }
      }

      // 2. Fetch from Firestore (Fallback - only if Supabase returned nothing)
      if (data.length === 0) {
        try {
          const q = query(collection(db, 'purchase_requests'), orderBy('timestamp', 'desc'), limit(50));
          const snapshot = await getDocs(q);
          data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, source: 'firebase' } as any));
        } catch (e) {
          console.warn("Firestore purchase fetch skipped");
        }
      }

      // Sort final list
      const sorted = data.sort((a, b) => {
        const dateA = new Date(a.created_at || a.timestamp || 0).getTime();
        const dateB = new Date(b.created_at || b.timestamp || 0).getTime();
        return dateB - dateA;
      });

      setPurchaseRequests(sorted);
    } catch (error: any) {
      console.error("Error fetching purchase requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time listener for purchase requests, verified payments and profiles
  useEffect(() => {
    if (activeTab !== 'payments' && activeTab !== 'users' && activeTab !== 'verified_payments' && activeTab !== 'analytics') return;
    
    const channels: any[] = [];
    const setupAdminRealtime = async () => {
      const { supabase } = await import('../lib/supabase');
      if (supabase) {
        // Purchase Requests (Tab: payments)
        if (activeTab === 'payments') {
          const payChannel = supabase
            .channel(`admin_payments_${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_requests' }, () => {
              fetchPurchaseRequests();
              fetchAnalytics();
            })
            .subscribe();
          channels.push(payChannel);
        }

        // AI Verified Payments (Tab: verified_payments)
        const verifiedChannel = supabase
          .channel(`admin_verified_${Math.random().toString(36).substring(7)}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'verified_payments' }, () => {
            if (activeTab === 'verified_payments') fetchVerifiedPayments();
            fetchAnalytics();
          })
          .subscribe();
        channels.push(verifiedChannel);

        // Profiles / Users (Tab: users or payments for analytics)
        const userChannel = supabase
          .channel(`admin_users_${Math.random().toString(36).substring(7)}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            if (activeTab === 'users') fetchUsers();
            
            // Analytics update (Live Active Users badge)
            const checkActiveUsers = async () => {
              const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
              try {
                const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('updated_at', fiveMinutesAgo);
                setActiveUsers(count || 0);
              } catch (e) {
                console.warn("Active users count fetch failed", e);
              }
            };
            checkActiveUsers();
          })
          .subscribe();
        channels.push(userChannel);
      }
    };
    setupAdminRealtime();

    return () => {
      channels.forEach(ch => ch.unsubscribe());
    };
  }, [activeTab]);

  const handleApprovePurchase = async (req: any) => {
    try {
      // 1. Update request status in the correct database
      if (req.source === 'supabase' && supabase) {
        await supabase.from('purchase_requests').update({ status: 'approved' }).eq('id', req.id);
        
        // Also save to verified_payments for unified AI Analytics
        await dataBridge.saveVerifiedPayment({
          transactionId: req.transactionId,
          phoneNumber: req.whatsapp || req.whatsappNumber || 'ADMIN_SYSTEM',
          amount: req.amount,
          subject: req.planName || 'Manual Approval',
          userId: req.userId,
          verified: true,
          productName: req.planName
        });
      } else {
        try {
          await updateDoc(doc(db, 'purchase_requests', req.id), { status: 'approved' });
        } catch (e) {
          console.error("Firestore status update failed:", e);
        }
      }

      if (req.isGuest || req.userId === 'GUEST') {
        toast.success("Guest purchase approved!");
        fetchPurchaseRequests();
        return;
      }

      // 2. Grant access to user in Firestore (Profile management stays in Firebase as requested)
      const userRef = doc(db, 'users', req.userId);
      const userSnap = await getDoc(userRef);
      
      let finalUserRef = userRef;
      let userData = userSnap.data();

      if (!userSnap.exists()) {
        const userQuery = query(collection(db, 'users'), where('uid', '==', req.userId));
        const qSnap = await getDocs(userQuery);
        if (qSnap.empty) {
          toast.error("Could not find user record.");
          return;
        }
        finalUserRef = doc(db, 'users', qSnap.docs[0].id);
        userData = qSnap.docs[0].data();
      }

      if (req.planType === 'subscription') {
        const updateData = { 
          isPremium: true,
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        await updateDoc(finalUserRef, updateData);
        // Supabase Sync
        if (supabase) {
          await supabase.from('profiles').update({ is_premium: true, updated_at: new Date().toISOString() }).eq('id', req.userId);
        }
      } else if (req.planId?.startsWith('res_') || req.resourceId) {
        const resId = req.resourceId || req.planId.replace('res_', '');
        const currentUnlocked = (userData?.unlockedResources || []) as string[];
        if (!currentUnlocked.includes(resId)) {
          const newResources = Array.from(new Set([...currentUnlocked, resId]));
          await updateDoc(finalUserRef, { 
            unlockedResources: newResources
          });
          
          if (supabase) {
             // Sync to Supabase profile
             const { data: profile } = await supabase.from('profiles').select('unlocked_resources').eq('id', req.userId).maybeSingle();
             const sbResources = Array.from(new Set([...(profile?.unlocked_resources || []), resId]));
             await supabase.from('profiles').update({ 
               unlocked_resources: sbResources,
               updated_at: new Date().toISOString()
             }).eq('id', req.userId);
          }
        }
      } else if (req.targetClass || req.planId?.includes('_one_time')) {
        const targetCls = req.targetClass || (req.planId?.match(/class_(\d+)_/)?.[1]);
        const currentClasses = (userData?.unlockedClasses || []) as string[];
        
        if (targetCls && !currentClasses.includes(targetCls)) {
          const newClasses = Array.from(new Set([...currentClasses, targetCls]));
          await updateDoc(finalUserRef, { 
            unlockedClasses: newClasses
          });
          
          if (supabase) {
             const { data: profile } = await supabase.from('profiles').select('unlocked_classes').eq('id', req.userId).maybeSingle();
             const sbClasses = Array.from(new Set([...(profile?.unlocked_classes || []), targetCls]));
             await supabase.from('profiles').update({ 
               unlocked_classes: sbClasses,
               updated_at: new Date().toISOString()
             }).eq('id', req.userId);
          }
        }
      } else {
        await updateDoc(finalUserRef, { isPremium: true });
        if (supabase) {
          await supabase.from('profiles').update({ is_premium: true, updated_at: new Date().toISOString() }).eq('id', req.userId);
        }
      }
      
      // 3. Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: req.userId,
        title: 'Premium Activated! 👑',
        message: `Your payment for ${req.planName} has been verified. Enjoy your premium access!`,
        type: 'rank',
        read: false,
        timestamp: new Date().toISOString()
      });

      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'payments') fetchPurchaseRequests();

      toast.success("Purchase approved and student upgraded!");
    } catch (error) {
      console.error(error);
      toast.error("Verification failed");
    }
  };

  const handleRejectPurchase = async (req: any) => {
    const reason = window.prompt("Reason for rejection?");
    if (reason === null) return;

    try {
      if (req.source === 'supabase' && supabase) {
        await supabase.from('purchase_requests').update({ status: 'rejected' }).eq('id', req.id);
      } else {
        await updateDoc(doc(db, 'purchase_requests', req.id), { status: 'rejected' });
      }
      
      if (req.userId && req.userId !== 'GUEST') {
        await addDoc(collection(db, 'notifications'), {
          userId: req.userId,
          title: 'Payment Rejected',
          message: `Your payment verification failed. Reason: ${reason}. Please contact support with Transaction ID.`,
          type: 'info',
          read: false,
          timestamp: new Date().toISOString()
        });
      }

      toast.success("Purchase rejected.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleReply = async (messageId: string, userId: string) => {
    const text = replyText[messageId];
    if (!text?.trim()) return;

    try {
      // Update message status
      await updateDoc(doc(db, 'messages', messageId), { status: 'replied' });
      
      // Send notification to user
      await addDoc(collection(db, 'notifications'), {
        userId,
        title: 'New Reply from Admin',
        message: text,
        type: 'info',
        read: false,
        timestamp: new Date().toISOString()
      });

      setReplyText({ ...replyText, [messageId]: '' });
      toast.success("Reply sent!");
    } catch (error) {
      console.error("Error replying:", error);
    }
  };

  const sendGlobalNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifData.title || !notifData.message) return;

    setLoading(true);
    try {
      let userIds: string[] = [];
      
      // Try Supabase first (cheaper/faster for bulk IDs)
      if (supabase) {
        const { data } = await supabase.from('profiles').select('id');
        if (data) userIds = data.map(u => u.id);
      }
      
      // Fallback only if Supabase returned nothing
      if (userIds.length === 0) {
        const usersSnap = await getDocs(collection(db, 'users'));
        userIds = usersSnap.docs.map(u => u.id);
      }

      if (userIds.length === 0) {
        toast.error("No users found to notify.");
        return;
      }
      
      // Batch writes in Firestore for notifications
      const batchSize = 500;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const chunk = userIds.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach(uid => {
          const newNotifRef = doc(collection(db, 'notifications'));
          batch.set(newNotifRef, {
            userId: uid,
            ...notifData,
            read: false,
            timestamp: new Date().toISOString()
          });
        });
        await batch.commit();
      }

      setNotifData({ title: '', message: '', type: 'info' });
      toast.success(`Broadcast sent to ${userIds.length} users! 📢`);
    } catch (error) {
      console.error("Error sending global notification:", error);
      toast.error("Broadcast failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualLeaderboardReset = async () => {
    if (!window.confirm("Are you sure? This will set EVERYONE'S points to 0. This cannot be undone!")) return;
    
    const loadingToast = toast.loading("Resetting leaderboard...");
    try {
      // Try server-side reset first (it's faster and handles large amounts of users)
      const response = await fetch('/api/admin/reset-leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.dismiss(loadingToast);
        toast.success("Leaderboard has been reset to zero via server!");
        if (activeTab === 'users') fetchUsers();
        return;
      }

      // Fallback to client-side if API fails (e.g. during local dev without server or if endpoint is broken)
      console.warn("Server reset failed, falling back to client-side batch reset");
      
      const resetCollection = async (collName: string) => {
        const snap = await getDocs(collection(db, collName));
        if (snap.empty) return;

        let batch = writeBatch(db);
        let count = 0;

        for (const doc of snap.docs) {
          batch.update(doc.ref, {
            totalPoints: 0,
            totalFocusMinutes: 0,
            ...(collName === 'users' ? { 'streak.currentCount': 1 } : {})
          });
          count++;

          // Firestore batch limit is 500
          if (count === 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }

        if (count > 0) {
          await batch.commit();
        }
      };

      await resetCollection('users');
      await resetCollection('leaderboard');

      toast.dismiss(loadingToast);
      toast.success("Leaderboard has been reset to zero!");
      if (activeTab === 'users') fetchUsers();
    } catch (error) {
      console.error("Leaderboard reset error:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to reset leaderboard. Check console for details.");
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return allUsers;
    const q = searchQuery.toLowerCase();
    return allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(q) || 
      u.email?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q)
    );
  }, [allUsers, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery) return purchaseRequests;
    const q = searchQuery.toLowerCase();
    return purchaseRequests.filter(p => 
      p.userName?.toLowerCase().includes(q) || 
      p.userEmail?.toLowerCase().includes(q) ||
      p.transactionId?.toLowerCase().includes(q)
    );
  }, [purchaseRequests, searchQuery]);

  const menuItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'banners', label: 'Promotion Banners', icon: LayoutDashboard },
    { id: 'story_unlocks', label: 'Story Templates', icon: Instagram },
    { id: 'story_logs', label: 'Story Unlocks', icon: Search },
    { id: 'resources', label: 'Digital Library', icon: BookOpen },
    { id: 'free_notes', label: 'Free Notes', icon: Zap },
    { id: 'valid_payments', label: 'Verify Keys', icon: ShieldCheck },
    { id: 'verified_payments', label: 'AI Verified', icon: CheckCircle2 },
    { id: 'chapters', label: 'Flashcards', icon: Database },
    { id: 'messages', label: 'Support', icon: MessageSquare },
    { id: 'payments', label: 'Revenue', icon: CreditCard },
    { id: 'registry', label: 'Registry', icon: Database },
    { id: 'users', label: 'Students', icon: Users },
    { id: 'notifications', label: 'Broadcast', icon: Bell },
    { id: 'settings', label: 'Danger Zone', icon: Settings },
    { id: 'moderation', label: 'Moderation', icon: Shield },
  ];

  const handleToggleStoryTemplate = async (id: string, current: boolean) => {
    try {
      const res = await dataBridge.updateStoryTemplate(id, { isActive: !current });
      if (res) {
        toast.success("Template status updated");
        fetchStoryTemplates();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDeleteStoryTemplate = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      const res = await dataBridge.deleteStoryTemplate(id);
      if (res) {
        toast.success("Deleted successfully");
        fetchStoryTemplates();
      }
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'story_unlocks':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-[2rem] bg-white/5 flex flex-col gap-2">
                <div className="bg-indigo-500/10 w-10 h-10 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Unlocks</p>
                  <p className="text-2xl font-black tabular-nums">{storyStats.totalUnlocks}</p>
                </div>
              </div>
              <div className="glass-card p-6 rounded-[2rem] bg-white/5 flex flex-col gap-2">
                <div className="bg-emerald-500/10 w-10 h-10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Templates</p>
                  <p className="text-2xl font-black tabular-nums">{storyTemplates.filter(t => t.is_active).length}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <div>
                <h3 className="text-xl font-black">Story Templates</h3>
                <p className="text-xs text-gray-400">Manage promotional templates for social media sharing</p>
              </div>
              <button 
                onClick={() => setIsAddingStoryTemplate(true)}
                className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Template
              </button>
            </div>

            {isAddingStoryTemplate && (
              <div className="glass-card p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-6 animate-in slide-in-from-top duration-500">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-indigo-400">New Story Template</h4>
                  <button onClick={() => setIsAddingStoryTemplate(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleAddStoryTemplate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                    onClick={() => templateInputRef.current?.click()}>
                    {storyTemplateImagePreview ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10">
                        <img src={storyTemplateImagePreview} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setStoryTemplateImagePreview(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <Instagram className="w-10 h-10 text-indigo-500 group-hover:scale-110 transition-transform duration-500" />
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Upload Template Image</p>
                          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">Max 2MB (Portrait/Story Ratio)</p>
                        </div>
                      </div>
                    )}
                    <input 
                      type="file"
                      ref={templateInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleStoryTemplateImageChange}
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 mb-2 block">Template Title</label>
                      <input 
                        required
                        value={storyTemplateForm.title}
                        onChange={(e) => setStoryTemplateForm({...storyTemplateForm, title: e.target.value})}
                        placeholder="e.g., Free Class 10 Notes Challenge"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 mb-2 block">Website Link to Include</label>
                      <input 
                        required
                        value={storyTemplateForm.link}
                        onChange={(e) => setStoryTemplateForm({...storyTemplateForm, link: e.target.value})}
                        placeholder="e.g., bit.ly/notevix-free"
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2 mb-2 block">Short Description</label>
                      <textarea 
                        value={storyTemplateForm.description}
                        onChange={(e) => setStoryTemplateForm({...storyTemplateForm, description: e.target.value})}
                        placeholder="Instructions for the user..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm h-24 outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading || isUploading}
                      className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? 'Creating...' : <><Save className="w-5 h-5" /> Deploy Template</>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {storyTemplates.map((template) => (
                <div key={template.id} className="glass-card overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col group">
                  <div className="aspect-[9/16] relative">
                    <img src={template.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={template.title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button 
                        onClick={() => handleToggleStoryTemplate(template.id, template.isActive)}
                        className={`p-3 rounded-2xl backdrop-blur-md transition-all shadow-xl ${
                          template.isActive ? 'bg-emerald-500/80 text-white shadow-emerald-500/20' : 'bg-gray-500/80 text-white'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteStoryTemplate(template.id)}
                        className="p-3 bg-red-500/80 backdrop-blur-md text-white rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <h4 className="font-bold text-white text-lg line-clamp-1">{template.title}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{template.link}</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                        template.isActive ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-gray-500/30 text-gray-500 bg-gray-500/5'
                      }`}>
                        {template.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">{new Date(template.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 italic">"{template.description}"</p>
                  </div>
                </div>
              ))}
              {storyTemplates.length === 0 && !loading && (
                <div className="md:col-span-2 lg:col-span-3 py-20 text-center glass-card rounded-[2.5rem] bg-white/5 border border-dashed border-white/10">
                   <Instagram className="w-12 h-12 text-gray-700 mx-auto opacity-20 mb-4" />
                   <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest italic">No templates deployed yet.</p>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'story_logs':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-[2rem] bg-white/5 flex flex-col gap-2">
                <div className="bg-emerald-500/10 w-10 h-10 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Approved Stories</p>
                  <p className="text-2xl font-black tabular-nums">{storyLogs.length}</p>
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden rounded-[2.5rem] bg-white/5 border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Username</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Platform</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Resource Unlocked</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Time</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {storyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-6 font-bold text-white tracking-tight">{log.username}</td>
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-2">
                             {log.platform === 'instagram' ? (
                               <div className="flex items-center gap-2 text-rose-400">
                                 <Instagram size={14} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Insta</span>
                               </div>
                             ) : (
                               <div className="flex items-center gap-2 text-yellow-500">
                                 <Smartphone size={14} />
                                 <span className="text-[10px] font-black uppercase tracking-widest">Snap</span>
                               </div>
                             )}
                           </div>
                        </td>
                        <td className="px-8 py-6 text-xs text-gray-400 max-w-[200px] truncate">{log.pdf_name}</td>
                        <td className="px-8 py-6 text-[10px] text-gray-500 font-bold">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-green-500/30 text-green-400 bg-green-500/5">
                            VERIFIED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {storyLogs.length === 0 && !loading && (
                <div className="py-20 text-center">
                   <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">No story logs recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'banners':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <div>
                <h3 className="text-xl font-black">Promotion Banners</h3>
                <p className="text-xs text-gray-400">Manage 16:9 carousel banners for Home page</p>
              </div>
              <button 
                onClick={() => setIsAddingBanner(true)}
                className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Banner
              </button>
            </div>

            {isAddingBanner && (
              <div className="glass-card p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-6 animate-in slide-in-from-top duration-500">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-indigo-400">New Banner Configuration</h4>
                  <button onClick={() => setIsAddingBanner(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleAddBanner} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                    onClick={() => bannerInputRef.current?.click()}>
                    {bannerImagePreview ? (
                      <div className="relative aspect-video w-full max-w-md rounded-2xl overflow-hidden border border-white/10">
                        <img src={bannerImagePreview} className="w-full h-full object-cover" />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setBannerImagePreview(null);
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <img 
                          src="https://img.icons8.com/isometric/100/shared-9.png" 
                          className="w-16 h-16 group-hover:scale-110 transition-transform duration-500" 
                          alt="upload"
                        />
                        <div className="text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-indigo-400">Upload from Gallery</p>
                          <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">16:9 Youtube Size Recommended</p>
                        </div>
                      </div>
                    )}
                    <input 
                      type="file"
                      ref={bannerInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleBannerImageChange}
                    />
                  </div>

                  {!bannerImagePreview && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Or paste Banner Image URL</label>
                      <input 
                        type="url" 
                        placeholder="https://example.com/banner.jpg"
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 focus:border-indigo-500 transition-colors"
                        value={bannerFormData.imageUrl}
                        onChange={e => setBannerFormData({ ...bannerFormData, imageUrl: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Display Location</label>
                    <select 
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 focus:border-indigo-500 transition-colors uppercase font-black text-[10px] tracking-widest"
                      value={bannerFormData.location}
                      onChange={e => setBannerFormData({ ...bannerFormData, location: e.target.value })}
                    >
                      <option value="home">Home Page (Post-Login)</option>
                      <option value="landing">Landing Page (Pre-Login)</option>
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Redirect Link (Optional - Defaults to /premium-notes)</label>
                    <input 
                      type="text" 
                      placeholder="/premium-notes"
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 focus:border-indigo-500 transition-colors"
                      value={bannerFormData.link}
                      onChange={e => setBannerFormData({ ...bannerFormData, link: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-500 transition-all">
                      {loading ? 'Processing...' : 'Save Promotion Banner'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {banners.map((banner) => (
                <div key={banner.id} className={`glass-card p-4 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col gap-4 group transition-all ${banner.location === 'landing' ? 'hover:border-emerald-500/30' : 'hover:border-indigo-500/30'}`}>
                  <div className="aspect-video w-full rounded-[2rem] overflow-hidden border border-white/10 relative">
                    <img src={banner.imageUrl} className="w-full h-full object-cover" />
                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10 ${banner.location === 'landing' ? 'bg-emerald-500 text-black' : 'bg-indigo-600 text-white'}`}>
                      {banner.location || 'home'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-500 truncate">{banner.link || 'No Link'}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="p-10 rounded-[3.5rem] border border-red-500/20 bg-red-500/5 space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[2rem] bg-red-500/20 text-red-500 flex items-center justify-center shadow-2xl shadow-red-500/20">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-red-500 tracking-tighter">Danger Zone</h3>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">System-wide reset for fresh production launch</p>
                </div>
              </div>
              
              <div className="max-w-2xl">
                <button 
                  onClick={async () => {
                    if(!window.confirm("CRITICAL: RESET ALL USERS TO FREE? This will remove premium access from EVERY student account. This cannot be undone.")) return;
                    setLoading(true);
                    try {
                      const snap = await getDocs(collection(db, 'users'));
                      const batch = writeBatch(db);
                      let count = 0;
                      snap.docs.forEach(u => {
                        batch.update(doc(db, 'users', u.id), {
                          isPremium: false,
                          planType: null,
                          unlockedClasses: [],
                          unlockedResources: []
                        });
                        count++;
                      });
                      await batch.commit();
                      toast.success(`Reset ${count} users to Free status`);
                      fetchUsers();
                    } catch (e) {
                      toast.error("Process failed.");
                    } finally { setLoading(false); }
                  }}
                  className="w-full p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-left hover:bg-red-500 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                    <Users className="w-12 h-12" />
                  </div>
                  <h5 className="font-black text-xs uppercase tracking-[0.3em] text-red-500 group-hover:text-white">Reset All User Access</h5>
                  <p className="text-xs text-gray-500 mt-2 group-hover:text-white/80 leading-relaxed font-bold">
                    Instantly downgrades every registered account to a free user. Useful for clearing trial accounts.
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-red-500 group-hover:text-white font-black text-[10px] uppercase tracking-widest">
                    <span>Execute Reset</span>
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </div>
                </button>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-[2rem] flex items-start gap-4">
                 <AlertCircle className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                 <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest leading-relaxed">
                   Warning: These actions are irreversible and directly modify the production database. Use only when preparing for a fresh launch.
                 </p>
              </div>
            </div>
          </div>
        );
      case 'valid_payments':
        return (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <div>
                <h3 className="text-xl font-black">AI Auto-Audit Ledger</h3>
                <p className="text-xs text-gray-400">Live feed of payments verified by Gemini AI</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={fetchTransactionLedger}
                  className="bg-white/5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <button 
                  onClick={addValidPayment}
                  className="bg-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" /> Manual Entry
                </button>
              </div>
            </div>

            {/* AI AUTO LOGS */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] ml-2">Recent AI Verifications</h5>
              <div className="grid grid-cols-1 gap-4">
                {transactionLedger.map((tx) => (
                  <div key={tx.id} className="glass-card p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                           <h4 className="font-black text-white uppercase tracking-wider">{tx.transactionId}</h4>
                           <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black rounded uppercase">AI Verified</span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                          WhatsApp: {tx.whatsapp} • Amt: ₹{tx.amount} • User: {tx.userId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MANUAL WHITELIST (FOR EMERGENCY) */}
            <div className="space-y-4 border-t border-white/5 pt-10">
              <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] ml-2">Legacy Manual Whitelist</h5>
              <div className="grid grid-cols-1 gap-4">
                {validPayments.map((pay) => (
                  <div key={pay.id} className="glass-card p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pay.isUsed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'}`}>
                        {pay.isUsed ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                           <h4 className="font-black text-white uppercase tracking-wider">{pay.transactionId}</h4>
                           {pay.isUsed && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-black rounded uppercase">Used</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest">
                          WhatsApp: {pay.whatsapp} • Amount: ₹{pay.amount}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        if(window.confirm("Remove this entry?")) {
                          await deleteDoc(doc(db, 'valid_payments', pay.id));
                          fetchValidPayments();
                        }
                      }}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'verified_payments':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight">AI Verified Payments</h3>
                <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-widest">Master Ledger of all confirmed transactions</p>
              </div>
              <button 
                onClick={() => setIsAddingManualPayment(true)}
                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Manual Entry
              </button>
            </div>

            {isAddingManualPayment && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg space-y-6 relative shadow-2xl">
                  <button 
                    onClick={() => setIsAddingManualPayment(false)}
                    className="absolute right-6 top-6 text-gray-500 hover:text-white transition-colors"
                   >
                    <X className="w-6 h-6" />
                  </button>
                  
                  <div className="space-y-2">
                    <h4 className="text-xl font-black uppercase tracking-tight">Manual Payment Entry</h4>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Use this to fix missing or failed AI verifications</p>
                  </div>

                  <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">Transaction ID (UTR)</label>
                      <input 
                        type="text"
                        placeholder="Ex: 412345678901"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none"
                        value={manualPaymentData.transactionId}
                        onChange={(e) => setManualPaymentData({...manualPaymentData, transactionId: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">Phone Number</label>
                      <input 
                        type="text"
                        placeholder="Customer WhatsApp"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none"
                        value={manualPaymentData.phoneNumber}
                        onChange={(e) => setManualPaymentData({...manualPaymentData, phoneNumber: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">Amount</label>
                        <select 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none appearance-none"
                          value={manualPaymentData.amount}
                          onChange={(e) => setManualPaymentData({...manualPaymentData, amount: e.target.value})}
                        >
                          <option value="39">₹39 (Single)</option>
                          <option value="99">₹99 (Combo)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-2">Subject</label>
                        <input 
                          type="text"
                          placeholder="Ex: Maths / Combo"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:border-indigo-500 outline-none"
                          value={manualPaymentData.subject}
                          onChange={(e) => setManualPaymentData({...manualPaymentData, subject: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {loading ? "Recording..." : "Save Transaction"}
                    </button>
                  </form>
                </div>
              </div>
            )}

            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text"
                placeholder="Search by TxID or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verifiedPayments.filter(p => p.transactionId.toUpperCase().includes(searchQuery.toUpperCase()) || p.phoneNumber.includes(searchQuery)).map((p) => (
                <div key={p.id} className="glass-card p-6 rounded-[2rem] bg-white/5 border border-emerald-500/10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">
                      Verified
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold">{new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Phone Number</p>
                    <p className="text-lg font-black">{p.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Transaction ID</p>
                    <p className="text-xs font-mono text-emerald-400 break-all">{p.transactionId}</p>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-white/5">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Subject</p>
                      <p className="text-xs font-bold text-white uppercase">{p.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Amount</p>
                      <p className="text-xl font-black text-emerald-500">₹{p.amount}</p>
                    </div>
                  </div>
                </div>
              ))}
              {verifiedPayments.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 uppercase tracking-widest text-xs font-bold">
                  No verified payments yet.
                </div>
              )}
            </div>
          </div>
        );
      case 'resources':
        const currentResources = subjectResources.filter(r => 
          viewResourceMode === 'free' ? r.isFree === true : r.isFree !== true
        );

        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 p-6 rounded-[2rem] border border-white/10 gap-6">
              <div>
                <h3 className="text-xl font-black">Digital Library Management</h3>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => setViewResourceMode('premium')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewResourceMode === 'premium' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                  >
                    Premium Resources
                  </button>
                  <button 
                    onClick={() => setViewResourceMode('free')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewResourceMode === 'free' ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
                  >
                    Free Resources
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={async () => {
                    const typeLabel = viewResourceMode === 'free' ? 'FREE' : 'PREMIUM';
                    if(!window.confirm(`Delete ALL ${typeLabel} resources from BOTH databases? This cannot be undone.`)) return;
                    setLoading(true);
                    try {
                      // 1. Supabase Delete
                      if (supabase) {
                        const { error } = await supabase.from('subject_resources').delete().eq('is_free', viewResourceMode === 'free');
                        if (error) throw error;
                      }

                      // 2. Firestore Sync
                      if (true) {
                        try {
                          const q = query(collection(db, 'subject_resources'), where('isFree', '==', viewResourceMode === 'free'));
                          const snap = await getDocs(q);
                          const deletes = snap.docs.map(d => deleteDoc(doc(db, 'subject_resources', d.id)));
                          await Promise.all(deletes);
                        } catch (e) {
                          console.warn("Firestore reset ignored (quota)");
                        }
                      }
                      
                      toast.success(`${typeLabel} Library Reset.`);
                      fetchSubjectResources();
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                >
                  <Trash2 className="w-4 h-4" /> Reset {viewResourceMode === 'free' ? 'Free' : 'Premium'}
                </button>
                <button 
                  onClick={async () => {
                    const allResources = [
                      // Class 8
                      { class: '8', subject: 'science', onePageNotesUrl: 'https://drive.google.com/file/d/1ka-QeoholdXB3xaX7jX2QNXO-kP2n-ES/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1wCuBo0YApmkqef-UnT29CtRd1tOcrb9v/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1UB0-QptnzsAOEU5lKwA60HtVfFo5_P_g/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1F5OA8aK6ncJLD0iVYTIR_etSDjBqKheB/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '8', subject: 'sst', onePageNotesUrl: 'https://drive.google.com/file/d/1mV5bcLIz8j3IEE61Ijwdo2RDrq-j05yG/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1USJWh6tDlRH7ATYRrsHC_HgESYHAzb8D/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1TCAEGb4e9s1bd6ttGmHiDVYsimaH3_Pd/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1cVOUmI7StT61OlrZC16oE0mE1pV8YnNk/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '8', subject: 'maths', onePageNotesUrl: 'https://drive.google.com/file/d/1GcVbFswV7OB3dutymQjdHbOXheuK9Ysn/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1K64QsZT9lNwS_12r5HioULIHVXFDm_oB/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1d1-V1u8oWALR49tKMKBWe1Dtnz3nnOBH/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1z-cvLUQQAT02csfWiM03_b8dcPFObtE0/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '8', subject: 'english', onePageNotesUrl: 'https://drive.google.com/file/d/1CCK6uzH1ma5I0E5sWWW57_BbUo9PrlHX/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1IXSc8wcjttmkOVpVY7ocKZkTuRVI0iTZ/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1Cr_fvccNKi-PBWTRb6CF6DB27qz73r3z/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nuGRofcxb9LKD7d0-7ngBU1mmrhCSjgX/view?usp=drivesdk', isFree: true, price: 0 },
                      // Class 9
                      { class: '9', subject: 'science', onePageNotesUrl: 'https://drive.google.com/file/d/16J3l5x2tiNwhtG1YUH6Xpc1VyhlbEhaU/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/19KV_y1pdj4TN9mSg1pnymrjF7RVpghGH/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1_Nr1VeZX7a3g9HM3j6nhzZ5xe9XXA-3_/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1IGo5ErM6jnmJ1KrM60o-XjAt1XgEj5sc/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '9', subject: 'sst', onePageNotesUrl: 'https://drive.google.com/file/d/1Nhof272xWczHbg7hX_ageR4NvXPJNrJP/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1Ig18ncXDHEQ0Mxu-sM7akb_01Ab3H02j/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1rig4ZYP8nk22Kfr35OR9VLxv7WQy7n9a/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1lDAxdI-_b7JcYkWPdt6uegR4LdQuxQ3h/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '9', subject: 'maths', onePageNotesUrl: 'https://drive.google.com/file/d/1aIa3PGgzZu8K1p9NY5yejDcgzMPHZ2ZP/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1iW1BUO46koPSud20WlGPAf1VMNlXUNyI/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1DJEF8yHKGWDnsJt7tGGTkH0DgGbn9yRp/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '9', subject: 'english', onePageNotesUrl: 'https://drive.google.com/file/d/1k_7qp8KYIyIvYME5sfO1Oq-nt7LjxyOL/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1B81cuGvF5-jJnhUA1n-Yy6nAk-H9W-B3/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/10X16DY-AxnxyXrIDwbNqJSt_Y8NRZyv7/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1n4_HnHrShSzIMkfiVQYDtuJSWPnkqqO2/view?usp=drivesdk', isFree: true, price: 0 },
                      // Class 10
                      { class: '10', subject: 'science', onePageNotesUrl: 'https://drive.google.com/file/d/1vVRXXenGoaFzn1R2cEs_es5gDzzEzO9J/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1Rer-yq5_lUAx79ziwtXDR0AXgaoB10Eh/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/17gHE4BBgTcFbq6Z1jUMEaooPuDhSxrFR/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1lGG-l-89veqwwbEIltxRtXql1Xhb1uVT/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '10', subject: 'sst', onePageNotesUrl: 'https://drive.google.com/file/d/1C5HNfr4u_8vQ9eArzdZRSUhE_Owy4h8c/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1hUk1u-XnJb47lAFvU3qvWUK_kTMHwVc6/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1B_s9nxd9df3uR2Zas-sna9S5sthtt-1w/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1Bo5ON7oLLp_uhra5dOx5vVk82x07WGCJ/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '10', subject: 'maths', onePageNotesUrl: 'https://drive.google.com/file/d/1oa2WBPNO4ChJrAp-aP7uyvVCn2SPI6w1/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/1wNNhEXC06_qpsom2lzfAoOAjxZtfzc2f/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1jUpfYzuNwiE6b6CTYTE--Gk8ttqZ5b26/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1nWLsptC9vEV7egT8rbapiRi_gBm7SeTW/view?usp=drivesdk', isFree: true, price: 0 },
                      { class: '10', subject: 'english', onePageNotesUrl: 'https://drive.google.com/file/d/161HIkuYtIOD5esDsmjwnI5lq6PPltOZG/view?usp=drivesdk', fullNotesUrl: 'https://drive.google.com/file/d/158isO5zrYWgdKafIiRdzOXLHJaYEeu35/view?usp=drivesdk', importantQuestionsUrl: 'https://drive.google.com/file/d/1ELq7c3bOUDaVFAsu2OcDtuwYiOikTm74/view?usp=drivesdk', examOrientedQuestionsUrl: 'https://drive.google.com/file/d/1DcvYECk1QfqhAu2isR3PHnolvcMtx4n5/view?usp=drivesdk', isFree: true, price: 0 }
                    ];

                    setLoading(true);
                    try {
                      for (const res of allResources) {
                        const q = query(
                          collection(db, 'subject_resources'), 
                          where('subject', '==', res.subject), 
                          where('class', '==', res.class)
                        );
                        const snap = await getDocs(q);
                        if (snap.empty) {
                          await addDoc(collection(db, 'subject_resources'), {
                            ...res,
                            createdAt: new Date().toISOString()
                          });
                        } else {
                          await updateDoc(doc(db, 'subject_resources', snap.docs[0].id), {
                            ...res,
                            updatedAt: new Date().toISOString()
                          });
                        }
                      }
                      toast.success("All Resources Restored!");
                      fetchSubjectResources();
                    } catch (e) {
                      toast.error("Restoration failed.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" /> Restore Library
                </button>
                <button 
                  onClick={() => setIsAddingResource(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Create New Book
                </button>
              </div>
            </div>

            {(isAddingResource || editingResource) && (
              <div className="glass-card p-10 rounded-[3rem] bg-indigo-500/5 border border-indigo-500/20 animate-in slide-in-from-top duration-500">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black">{editingResource ? 'Refine Digital Resource' : 'Design New Digital Resource'}</h3>
                  <button onClick={() => { setIsAddingResource(false); setEditingResource(null); setResourceCoverPreview(null); }} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={editingResource ? async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  try {
                    const sbUpdateData = {
                      subject: resourceFormData.subject,
                      class: resourceFormData.class,
                      price: Number(resourceFormData.price) || 0,
                      description: resourceFormData.description,
                      cover_url: resourceCoverPreview || editingResource.coverUrl,
                      drive_link: resourceFormData.driveLink,
                      is_free: Number(resourceFormData.price) === 0,
                      updated_at: new Date().toISOString()
                    };

                    // 1. Update Supabase
                    if (supabase) {
                      const { error } = await supabase.from('subject_resources').update(sbUpdateData).eq('id', editingResource.id);
                      if (error) throw error;
                    }

                    // 2. Sync to Firestore if not locked
                    if (true) {
                      try {
                        const fsUpdateData = {
                          ...resourceFormData,
                          price: Number(resourceFormData.price) || 0,
                          isFree: Number(resourceFormData.price) === 0,
                          coverUrl: resourceCoverPreview || editingResource.coverUrl,
                          updatedAt: new Date().toISOString()
                        };
                        await updateDoc(doc(db, 'subject_resources', editingResource.id), fsUpdateData);
                      } catch (e) {
                        console.warn("Firestore edit sync failed (quota)");
                      }
                    }

                    toast.success("Book Updated!");
                    setEditingResource(null);
                    setResourceCoverPreview(null);
                    fetchSubjectResources();
                  } catch (e) { toast.error("Update failed."); }
                  finally { setLoading(false); }
                } : handleAddResource} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div 
                      onClick={() => coverInputRef.current?.click()}
                      className="aspect-square w-full rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 hover:border-indigo-500 group cursor-pointer overflow-hidden relative shadow-inner"
                    >
                      <input type="file" ref={coverInputRef} onChange={handleResourceCoverChange} accept="image/*" className="hidden" />
                      {isUploading && (
                        <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
                          <div className="flex flex-col items-center gap-3">
                            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Processing...</span>
                          </div>
                        </div>
                      )}
                      {resourceCoverPreview ? (
                        <>
                          <img src={resourceCoverPreview} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                             <RefreshCw className="w-8 h-8 text-white mb-2" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Change Cover</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <Database className="w-10 h-10 text-gray-700 group-hover:text-indigo-500 transition-colors" />
                          <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-indigo-400">Upload Cover Art</p>
                            <p className="text-[8px] text-gray-600 font-bold uppercase mt-1">1:1 Ratio Recommended</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Subject & Class</label>
                       <div className="grid grid-cols-2 gap-4">
                          <input 
                            required
                            placeholder="e.g. Science"
                            value={resourceFormData.subject}
                            onChange={(e) => setResourceFormData({...resourceFormData, subject: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none"
                          />
                          <select 
                            value={resourceFormData.class}
                            onChange={(e) => setResourceFormData({...resourceFormData, class: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none"
                          >
                            <option value="8">Class 8</option>
                            <option value="9">Class 9</option>
                            <option value="10">Class 10</option>
                            <option value="11">Class 11</option>
                            <option value="12">Class 12</option>
                          </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Pricing (INR)</label>
                       <input 
                         type="number"
                         placeholder="e.g. 49"
                         value={resourceFormData.price}
                         onChange={(e) => setResourceFormData({...resourceFormData, price: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Description</label>
                       <textarea 
                         placeholder="Short catchy description..."
                         value={resourceFormData.description}
                         onChange={(e) => setResourceFormData({...resourceFormData, description: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none h-24 resize-none"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">PDF Drive Link</label>
                       <input 
                         placeholder="Google Drive PDF URL"
                         value={resourceFormData.driveLink}
                         onChange={(e) => setResourceFormData({...resourceFormData, driveLink: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-indigo-500 outline-none"
                       />
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                      {loading ? "Processing..." : (editingResource ? "Save Changes" : "Launch This Resource")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentResources.map((res) => (
                <div key={res.id} className={`glass-card p-6 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col gap-5 transition-all group ${res.isFree ? 'hover:border-emerald-500/30' : 'hover:border-indigo-500/30'}`}>
                  <div className="aspect-[1/1] w-full bg-white/5 rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl">
                    {res.coverUrl ? (
                      <img src={res.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 bg-gradient-to-br from-white/5 to-white/[0.02]">
                        <BookOpen className="w-12 h-12 mb-2 opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No Cover Art</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 px-4 py-2 bg-black/80 backdrop-blur-md rounded-2xl text-[10px] font-black uppercase border border-white/10 shadow-xl">
                      ₹{res.price || 0}
                    </div>
                    <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-600/80 backdrop-blur-sm rounded-full text-[8px] font-black uppercase border border-white/10">
                      Class {res.class}
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h4 className="font-black text-xl uppercase tracking-tight text-white">{res.subject}</h4>
                    <p className="text-[10px] font-medium text-gray-500 leading-relaxed line-clamp-2 italic">“{res.description || 'Premium notes for topper-level preparation.'}”</p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      {(res.features || ['Digital PDF', 'Instant Access']).slice(0, 3).map((f: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-bold text-gray-400 border border-white/5">{f}</span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingResource(res);
                        setResourceFormData({
                          subject: res.subject || '',
                          class: res.class || '10',
                          price: (res.price !== undefined && res.price !== null) ? res.price.toString() : '0',
                          description: res.description || '',
                          driveLink: res.driveLink || ''
                        });
                        setResourceCoverPreview(res.coverUrl || null);
                        setIsAddingResource(true);
                        // Using a more reliable scroll for nested containers
                        const container = document.querySelector('.overflow-y-auto');
                        if (container) {
                          container.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest border border-white/5"
                    >
                      Edit Book
                    </button>
                    <button 
                      onClick={async () => {
                        if(window.confirm("Delete this book?")) {
                          setLoading(true);
                          try {
                            // 1. Supabase Delete (Primary)
                            if (supabase) {
                              const { error: sbError } = await supabase.from('subject_resources').delete().eq('id', res.id);
                              if (sbError) {
                                console.error("Supabase Delete Error:", sbError);
                                throw new Error(`Supabase Error: ${sbError.message}`);
                              }
                            }
                            // 2. Firestore Sync
                            try {
                              await deleteDoc(doc(db, 'subject_resources', res.id));
                            } catch (fsErr) {
                              console.warn("Firestore delete sync skipped or failed");
                            }
                            
                            toast.success("Book Deleted Permanently!");
                            fetchSubjectResources();
                          } catch (err: any) {
                            console.error("Delete failure:", err);
                            toast.error(`Delete failed: ${err.message || "Unknown error"}`);
                          } finally {
                            setLoading(false);
                          }
                        }
                      }}
                      className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'free_notes':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/10">
              <div>
                <h3 className="text-xl font-black italic uppercase">Free Resources Management</h3>
                <p className="text-xs text-gray-400">Add notes that are visible to everyone without payment</p>
              </div>
              <button 
                onClick={() => {
                  setEditingResource(null);
                  setFreeResourceFormData({ subject: '', class_level: '10', description: '', drive_link: '', password: 'notevixfreenotes', cover_url: '' });
                  setIsAddingResource(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Free Note
              </button>
            </div>

            {isAddingResource && (
              <div className="glass-card p-10 rounded-[3rem] bg-emerald-500/5 border border-emerald-500/20 animate-in slide-in-from-top duration-500">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black italic uppercase">{editingResource ? 'Edit Free Note' : 'Add New Free Note'}</h3>
                  <button onClick={() => { setIsAddingResource(false); setEditingResource(null); }} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleFreeResourceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Subject & Class</label>
                       <div className="grid grid-cols-2 gap-4">
                          <input 
                            required
                            placeholder="e.g. Physics"
                            value={freeResourceFormData.subject}
                            onChange={(e) => setFreeResourceFormData({...freeResourceFormData, subject: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-emerald-500 outline-none"
                          />
                          <select 
                            value={freeResourceFormData.class_level}
                            onChange={(e) => setFreeResourceFormData({...freeResourceFormData, class_level: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-emerald-500 outline-none"
                          >
                            {[8, 9, 10, 11, 12].map(c => <option key={c} value={c}>Class {c}</option>)}
                          </select>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Description</label>
                       <textarea 
                         placeholder="What's inside these notes?"
                         value={freeResourceFormData.description}
                         onChange={(e) => setFreeResourceFormData({...freeResourceFormData, description: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-emerald-500 outline-none h-24 resize-none"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">PDF Drive Link</label>
                       <input 
                         required
                         placeholder="Google Drive PDF URL"
                         value={freeResourceFormData.drive_link}
                         onChange={(e) => setFreeResourceFormData({...freeResourceFormData, drive_link: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-emerald-500 outline-none"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">PDF Password</label>
                       <input 
                         required
                         placeholder="e.g. notevixfreenotes"
                         value={freeResourceFormData.password}
                         onChange={(e) => setFreeResourceFormData({...freeResourceFormData, password: e.target.value})}
                         className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:border-emerald-500 outline-none"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Cover Image</label>
                       <div 
                         onClick={() => freeNoteInputRef.current?.click()}
                         className="w-full aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-all group relative overflow-hidden"
                       >
                         <input 
                           type="file" 
                           ref={freeNoteInputRef} 
                           onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               setIsUploading(true);
                               const loadingToast = toast.loading("Compressing & Uploading...");
                               
                               try {
                                 const reader = new FileReader();
                                 reader.onloadend = async () => {
                                   const img = new Image();
                                   img.onload = async () => {
                                     const canvas = document.createElement('canvas');
                                     const MAX_SIZE = 1024; // Standard resolution for thumbnails
                                     let width = img.width;
                                     let height = img.height;

                                     if (width > height) {
                                       if (width > MAX_SIZE) {
                                         height *= MAX_SIZE / width;
                                         width = MAX_SIZE;
                                       }
                                     } else {
                                       if (height > MAX_SIZE) {
                                         width *= MAX_SIZE / height;
                                         height = MAX_SIZE;
                                       }
                                     }

                                     canvas.width = width;
                                     canvas.height = height;
                                     const ctx = canvas.getContext('2d');
                                     if (ctx) {
                                       ctx.imageSmoothingEnabled = true;
                                       ctx.imageSmoothingQuality = 'high';
                                       ctx.drawImage(img, 0, 0, width, height);
                                     }

                                     const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
                                     if (blob) {
                                       const uploadRes = await dataBridge.uploadImage(new File([blob], file.name, { type: 'image/jpeg' }), 'free-resources');
                                       if (uploadRes.success && uploadRes.url) {
                                         setFreeResourceFormData({...freeResourceFormData, cover_url: uploadRes.url});
                                         toast.success("Image uploaded!", { id: loadingToast });
                                       } else {
                                         toast.error(`Upload failed: ${uploadRes.error || 'Check Supabase bucket'}`, { id: loadingToast });
                                       }
                                     }
                                     setIsUploading(false);
                                   };
                                   img.src = reader.result as string;
                                 };
                                 reader.readAsDataURL(file);
                               } catch (err) {
                                 console.error("Upload error:", err);
                                 toast.error("Process failed", { id: loadingToast });
                                 setIsUploading(false);
                               }
                             }
                           }} 
                           accept="image/*" 
                           className="hidden" 
                         />
                         {isUploading && (
                            <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                            </div>
                         )}
                         {freeResourceFormData.cover_url ? (
                           <>
                             <img src={freeResourceFormData.cover_url} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                               <RefreshCw className="w-6 h-6 text-white" />
                             </div>
                           </>
                         ) : (
                           <div className="flex flex-col items-center gap-2">
                             <Plus className="w-6 h-6 text-gray-500 group-hover:text-emerald-500 transition-colors" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Upload Cover</span>
                           </div>
                         )}
                       </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                      {loading ? "Saving..." : "Publish Free Resource"}
                    </button>
                  </div>

                  <div className="hidden md:flex flex-col items-center justify-center border-l border-white/5 pl-8">
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-6">Live Preview</p>
                     <div className="glass-card w-full max-w-[240px] aspect-[1/1.2] rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 overflow-hidden flex flex-col group">
                        <div className="h-2/3 bg-white/5 relative overflow-hidden">
                           {freeResourceFormData.cover_url ? (
                             <img src={freeResourceFormData.cover_url} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500/20">
                               <BookOpen className="w-12 h-12" />
                             </div>
                           )}
                           <div className="absolute top-3 left-3 px-2 py-1 bg-emerald-500 text-black text-[8px] font-black rounded-md uppercase tracking-widest">FREE</div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                           <h4 className="font-black text-sm uppercase tracking-tight text-white line-clamp-1 italic">{freeResourceFormData.subject || 'Subject Name'}</h4>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Class {freeResourceFormData.class_level}</p>
                        </div>
                     </div>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {freeResources.map((res) => (
                <div key={res.id} className="glass-card p-6 rounded-[2.5rem] bg-white/5 border border-white/10 flex flex-col gap-4 group hover:border-emerald-500/30 transition-all">
                  <div className="aspect-[1/1] w-full bg-white/5 rounded-3xl overflow-hidden border border-white/10 relative">
                    {res.cover_url ? (
                      <img src={res.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-emerald-500/10">
                        <BookOpen className="w-12 h-12 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No Cover</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-emerald-500 text-black text-[8px] font-black rounded uppercase tracking-widest">FREE</div>
                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-[8px] font-black uppercase border border-white/10">Class {res.class_level}</div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-lg uppercase tracking-tight text-white line-clamp-1 italic">{res.subject}</h4>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{res.description}</p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingResource(res);
                        setFreeResourceFormData({ ...res });
                        setIsAddingResource(true);
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteFreeResource(res.id)}
                      className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight uppercase tracking-widest text-indigo-500">Live Analytics</h2>
              <button 
                onClick={handleResetAnalytics}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Stats
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Revenue', value: `₹${analyticsData.totalRevenue}`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
                { label: 'Total Students', value: analyticsData.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Total Sales', value: analyticsData.salesCount, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Premium Users', value: analyticsData.premiumUsers, icon: ShieldCheck, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                { label: 'New Today', value: analyticsData.newUsersToday, icon: Zap, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                { label: 'Active (24h)', value: analyticsData.activeToday, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'Active Now', value: activeUsers, icon: Clock, color: 'text-pink-500', bg: 'bg-pink-500/10' },
                { label: 'Burned IDs', value: analyticsData.burnedIds, icon: Database, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              ].map((stat, i) => (
                <div key={i} className="glass-card p-6 rounded-[2rem] bg-white/5 flex flex-col gap-4">
                  <div className={`${stat.bg} w-10 h-10 rounded-2xl flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
                    <p className="text-2xl font-black tabular-nums">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Revenue Growth</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Last 7 Days</p>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.dailyRevenue}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '1rem', fontSize: '12px' }}
                        itemStyle={{ color: '#A855F7' }}
                      />
                      <Area type="monotone" dataKey="amount" stroke="#A855F7" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                <h3 className="text-lg font-bold">Plan Distribution</h3>
                <div className="h-[300px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.planDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {analyticsData.planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[ '#A855F7', '#3B82F6', '#10B981'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '1rem', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {analyticsData.planDistribution.map((plan, i) => (
                     <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${[ 'bg-purple-500', 'bg-blue-500', 'bg-green-500'][i % 3]}`} />
                         <span className="text-xs text-gray-400">{plan.name}</span>
                       </div>
                       <span className="text-xs font-bold">{plan.value}</span>
                     </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Search students by name, email or UID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={handleManualLeaderboardReset}
                className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 rounded-2xl text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Leaderboard
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((u) => (
                <div key={u.uid} className="glass-card p-6 rounded-[2rem] bg-white/5 flex flex-col gap-4 group">
                  <div className="flex items-center justify-between">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-purple-500/20 group-hover:border-purple-500 transition-all">
                      <img src={u.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {u.isPremium ? (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[8px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase">PRO</span>
                      ) : (
                        <span className="bg-white/5 text-gray-500 text-[8px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase">FREE</span>
                      )}
                      <span className="text-[8px] text-gray-500 font-mono">{u.uid.slice(-6)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg truncate">{u.displayName}</h4>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                     <span className="text-[10px] font-bold text-purple-400">Class {u.class || '?'}</span>
                     <div className="w-1 h-1 rounded-full bg-white/10" />
                     <span className="text-[10px] font-bold text-blue-400">Pts: {u.totalPoints || 0}</span>
                     <button 
                       onClick={async () => {
                         if(window.confirm(`Delete student ${u.displayName}?`)) {
                           const q = query(collection(db, 'users'), where('uid', '==', u.uid));
                           const snap = await getDocs(q);
                           if (!snap.empty) {
                             await deleteDoc(doc(db, 'users', snap.docs[0].id));
                             fetchUsers();
                           }
                         }
                       }}
                       className="ml-auto p-2 text-gray-600 hover:text-red-500 transition-colors"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'payments':
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Search payments by name, email or TxID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-4">
                {filteredPayments.map((req) => (
                  <div key={req.id} className="glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-xl font-black">
                          {req.userName?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{req.userName || req.email || 'Guest Student'}</h4>
                          <div className="flex gap-2">
                            <p className="text-xs text-gray-500">{req.userEmail || req.email}</p>
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
                              req.source === 'supabase' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5'
                            } uppercase tracking-tighter`}>
                              {req.source || 'Firebase'}
                            </span>
                          </div>
                          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mt-1">WA: {req.whatsappNumber || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          req.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                          req.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {req.status === 'approved' ? 'AI VERIFIED' : req.status}
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold">{new Date(req.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Plan Details</p>
                          <h5 className="font-bold text-xl">{req.planName}</h5>
                          <p className="text-2xl font-black text-green-500 tracking-tighter">₹{req.amount}</p>
                        </div>
                        {req.screenshotUrl && (
                          <div className="space-y-2">
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Payment Screenshot</p>
                             <div className="relative group aspect-[9/16] max-h-[300px] w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
                                <img src={req.screenshotUrl} className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                   <button 
                                     onClick={() => window.open(req.screenshotUrl, '_blank')}
                                     className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                   >
                                     View Full Size
                                   </button>
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Transaction Snapshot</p>
                          <div className="bg-white/5 p-4 rounded-2xl border border-white/5 font-mono text-sm text-purple-400 break-all relative group">
                            {req.transactionId}
                            {/* Check if UTR is in registry */}
                            {registry?.find(r => r.id === req.transactionId) && (
                              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                DUPLICATE UTR
                              </div>
                            )}
                          </div>
                        </div>
                        {req.status === 'pending' && req.screenshotUrl && (
                          <button
                            onClick={() => handleAIVerify(req)}
                            className="w-full flex items-center justify-center gap-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
                          >
                            <Zap className="w-4 h-4" />
                            AI Audit Shortcut
                          </button>
                        )}
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-4 pt-4">
                        <button
                          onClick={() => handleApprovePurchase(req)}
                          className="flex-1 bg-green-500 text-black py-4 rounded-[1.5rem] font-bold text-sm shadow-xl shadow-green-500/10 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Approve Payment
                        </button>
                        <button
                          onClick={() => handleRejectPurchase(req)}
                          className="px-8 border border-red-500/20 text-red-500 py-4 rounded-[1.5rem] font-bold text-sm hover:bg-red-500/5 transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
          </div>
        );

      case 'chapters':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <button onClick={() => setIsAdding(true)} className="glass-card p-8 rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 hover:border-purple-500 transition-all flex flex-col items-center justify-center gap-4 text-gray-500 hover:text-purple-400 min-h-[160px]">
                 <Plus className="w-8 h-8" />
                 <span className="font-bold uppercase tracking-widest text-xs">Create New Chapter</span>
               </button>
               <button onClick={addSampleData} className="glass-card p-8 rounded-[2.5rem] bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between min-h-[160px]">
                  <Database className="w-6 h-6 text-purple-400" />
                  <span className="w-full bg-purple-500 text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-widest text-center">Sync All Resources</span>
               </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {chapters.map((chapter) => (
                  <div key={chapter.id} className="glass-card p-6 rounded-[2rem] bg-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all">
                        {chapter.subject.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm truncate max-w-[150px]">{chapter.title}</h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Class {chapter.class} • {chapter.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(chapter.id)} className="p-2.5 text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
             {messages.map((msg) => (
               <div key={msg.id} className="glass-card p-8 rounded-[2.5rem] bg-white/5 space-y-6">
                 <div className="flex items-start justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center font-black">
                        {msg.userName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold">{msg.userName}</h4>
                        <p className="text-xs text-gray-500">{msg.userEmail}</p>
                      </div>
                   </div>
                   <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${msg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                      {msg.status}
                   </span>
                 </div>
                 <p className="text-sm text-gray-300 leading-relaxed bg-white/5 p-5 rounded-2xl">{msg.message}</p>
                 <div className="pt-4 space-y-4">
                    <textarea
                      value={replyText[msg.id || ''] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [msg.id || '']: e.target.value })}
                      placeholder="Type your reply..."
                      className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-6 text-sm focus:border-purple-500 outline-none h-32 resize-none transition-all"
                    />
                    <button
                      onClick={() => handleReply(msg.id!, msg.userId)}
                      className="w-full purple-gradient py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/10 flex items-center justify-center gap-3"
                    >
                      <Send className="w-5 h-5" />
                      Transmit Reply
                    </button>
                 </div>
               </div>
             ))}
          </div>
        );

      case 'notifications':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
             <form onSubmit={sendGlobalNotification} className="glass-card p-10 rounded-[3rem] bg-purple-500/5 border border-purple-500/20 space-y-8">
                <h3 className="text-2xl font-black tracking-tight">STUDENT BROADCAST</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    required
                    value={notifData.title}
                    onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                    placeholder="Campaign Title"
                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-4 text-sm focus:border-purple-500 outline-none"
                  />
                  <textarea
                    required
                    value={notifData.message}
                    onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                    placeholder="Broadcast Message..."
                    className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-4 text-sm h-32 outline-none focus:border-purple-500 resize-none"
                  />
                  <button type="submit" className="w-full purple-gradient py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl shadow-purple-500/30 flex items-center justify-center gap-3">
                    <Send className="w-5 h-5" />
                    Deploy Broadcast
                  </button>
                </div>
             </form>
             <div className="space-y-4">
                <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Recent Activity</h3>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="glass-card p-6 rounded-[2rem] bg-white/5 flex items-center gap-6">
                    <Bell className="w-5 h-5 text-purple-400" />
                    <div>
                      <h4 className="font-bold text-sm">{n.title}</h4>
                      <p className="text-[10px] text-gray-500">{n.message}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        );

      case 'moderation':
        return <ModerationTab />;

      case 'registry':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {registry.map((tx) => (
              <div key={tx.id} className="glass-card p-6 rounded-[2rem] bg-white/5 space-y-4 border border-white/5">
                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-400/10 px-2 py-0.5 rounded-md w-fit block">BURNED ID</span>
                <div className="font-mono text-sm font-bold text-white break-all leading-tight">
                  {tx.id}
                </div>
                <p className="text-xs text-gray-400 truncate">{tx.userEmail || 'Unknown'}</p>
              </div>
            ))}
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="glass-card p-8 rounded-[2.5rem] bg-white/5 border border-white/5 space-y-6">
                <h3 className="text-xl font-black uppercase tracking-widest text-red-500">Dangerous Actions</h3>
                <p className="text-sm text-gray-500">These actions are irreversible. Use with extreme caution.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 space-y-4">
                    <h4 className="font-bold text-lg">Reset Analytics</h4>
                    <p className="text-xs text-gray-500">Archive all approved purchases. This resets Revenue and Sales counters to zero.</p>
                    <button 
                      onClick={handleResetAnalytics}
                      className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                      Reset Sales Stats
                    </button>
                  </div>

                  <div className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10 space-y-4">
                    <h4 className="font-bold text-lg">Reset Leaderboard</h4>
                    <p className="text-xs text-gray-500">Set all students points and focus minutes to zero. Start a new season.</p>
                    <button 
                      onClick={handleManualLeaderboardReset}
                      className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                      Reset All Points
                    </button>
                  </div>

                  <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                    <h4 className="font-bold text-lg">System Health</h4>
                    <p className="text-xs text-gray-500">Fix 'Internal Assertion' or 'Unexpected State' errors by clearing cache.</p>
                    <button 
                      onClick={handleEmergencyReset}
                      className="w-full bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                      Emergency Fix App
                    </button>
                  </div>

                  <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-lg">Supabase Schema Fix</h4>
                      <button 
                        onClick={() => {
                          const sql = `
-- COMPLETE SUPABASE FIX FOR FIREBASE AUTH
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 0. Helper for timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Profiles Table (Fix IDs for Firebase UIDs)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Firebase UID
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  class_level TEXT DEFAULT '10',
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  plan_type TEXT,
  unlocked_resources TEXT[] DEFAULT '{}',
  unlocked_classes TEXT[] DEFAULT '{}',
  saved_notes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS class_level TEXT DEFAULT '10';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_resources TEXT[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unlocked_classes TEXT[] DEFAULT '{}';
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id TEXT PRIMARY KEY, -- Firebase UID
  total_points INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_visit_date BIGINT, 
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Promo Banners
CREATE TABLE IF NOT EXISTS public.promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  link TEXT,
  location TEXT DEFAULT 'home',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Free Resources (Home Page Combo Packs)
CREATE TABLE IF NOT EXISTS public.free_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  class_level TEXT NOT NULL,
  description TEXT,
  drive_link TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Subject Resources (Premium Notes)
CREATE TABLE IF NOT EXISTS public.subject_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  class TEXT NOT NULL,
  title TEXT,
  description TEXT,
  price NUMERIC DEFAULT 0,
  drive_link TEXT,
  cover_url TEXT,
  features JSONB DEFAULT '[]',
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Story Unlock System
CREATE TABLE IF NOT EXISTS public.story_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.story_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  template_id UUID REFERENCES public.story_templates(id),
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  confidence_score NUMERIC,
  raw_ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.1 Free PDF Story Logs
CREATE TABLE IF NOT EXISTS public.free_pdf_story_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  platform TEXT NOT NULL,
  pdf_name TEXT NOT NULL,
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ensure ID Defaults (Fix for existing tables)
ALTER TABLE public.free_resources ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.subject_resources ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.promo_banners ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 7. RPC Functions
CREATE OR REPLACE FUNCTION increment_xp(user_id text, amount int)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET xp = COALESCE(xp, 0) + amount,
      updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_focus_minutes(user_id text, amount int)
RETURNS void AS $$
BEGIN
  UPDATE public.user_points
  SET total_minutes = COALESCE(total_minutes, 0) + amount,
      last_updated = NOW()
  WHERE user_id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Policies (Idempotent)
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Banners" ON public.promo_banners;
CREATE POLICY "Public Read Banners" ON public.promo_banners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin All Banners" ON public.promo_banners;
CREATE POLICY "Admin All Banners" ON public.promo_banners FOR ALL USING (true);

ALTER TABLE public.free_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Free" ON public.free_resources;
CREATE POLICY "Public Read Free" ON public.free_resources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin All Free" ON public.free_resources;
CREATE POLICY "Admin All Free" ON public.free_resources FOR ALL USING (true);

ALTER TABLE public.subject_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Resources" ON public.subject_resources;
CREATE POLICY "Public Read Resources" ON public.subject_resources FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin All Resources" ON public.subject_resources;
CREATE POLICY "Admin All Resources" ON public.subject_resources FOR ALL USING (true);

ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Templates" ON public.story_templates;
CREATE POLICY "Public Read Templates" ON public.story_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin All Templates" ON public.story_templates;
CREATE POLICY "Admin All Templates" ON public.story_templates FOR ALL USING (true);

ALTER TABLE public.story_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner Read Unlocks" ON public.story_unlocks;
CREATE POLICY "Owner Read Unlocks" ON public.story_unlocks FOR SELECT USING (auth.uid()::text = user_id);
DROP POLICY IF EXISTS "Admin All Unlocks" ON public.story_unlocks;
CREATE POLICY "Admin All Unlocks" ON public.story_unlocks FOR ALL USING (true);

-- 9. Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true),
       ('resource-covers', 'resource-covers', true),
       ('free-resources', 'free-resources', true),
       ('story-templates', 'story-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Public Access to these buckets
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id IN ('banners', 'resource-covers', 'free-resources', 'story-templates') );
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id IN ('banners', 'resource-covers', 'free-resources', 'story-templates') );
                          `;
                          navigator.clipboard.writeText(sql.trim());
                          toast.success("SQL Copied! Paste this in Supabase SQL Editor to fix all database errors.");
                        }}
                        className="bg-emerald-500 text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                      >
                        Copy SQL Fix
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">If your Added Banners or Premium Access aren't showing up, your Supabase tables might be missing columns. Click 'Copy SQL Fix', go to Supabase Dashboard → SQL Editor, paste and run it.</p>
                  </div>
                </div>
             </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden relative">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="flex flex-col h-full font-sans">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter">NOTEVIX<span className="text-indigo-500">ADMIN</span></span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar py-4">
            <p className="px-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-4">Dashboard</p>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative group ${
                  activeTab === item.id 
                    ? 'bg-indigo-600/10 text-indigo-400' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 mt-auto border-t border-white/5">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Exit Master Panel
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#050505] overflow-hidden">
        <header className="h-20 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-400">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black tracking-tight text-white capitalize">{activeTab} Interface</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div 
              onClick={() => {
                if (!supabase) {
                  toast.info(
                    "Prod Sync Required: Since you're using GitHub/Firebase, ensure VITE_SUPABASE_URL is added to your GitHub Secrets and exposed in your build workflow. Vite bakes these into the app at build-time.", 
                    { duration: 8000 }
                  );
                } else {
                  toast.success("Supabase is live! Notes will sync to your external database.");
                }
              }}
              className="flex flex-col items-end pr-3 sm:pr-6 border-r border-white/10 cursor-pointer active:scale-95 transition-transform"
            >
               <div className="flex items-center gap-2 text-emerald-400 font-medium">
                 <div className={`w-2 h-2 rounded-full ${supabase ? 'bg-green-500 animate-pulse' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                 <span className={`text-[9px] sm:text-[10px] uppercase font-black tracking-widest ${supabase ? 'text-green-500' : 'text-amber-500 animate-pulse'}`}>
                   {supabase ? 'Supabase Sync ON' : 'Supabase Sync OFF'}
                 </span>
               </div>
               <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none mt-1">
                 {supabase ? 'Production DB Active' : 'Tap to See Fix'}
               </span>
            </div>
            <div className="hidden sm:flex flex-col items-end pr-6 border-r border-white/10">
               <div className="flex items-center gap-2 text-emerald-400">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-xl font-black tabular-nums">{activeUsers}</span>
               </div>
               <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Global Active</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black shadow-lg shadow-indigo-600/20">A</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-32">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
